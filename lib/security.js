// Lớp bảo vệ ứng dụng ("tường lửa" tầng web):
//  1. Header bảo mật: CSP chỉ cho chạy mã của chính web, chặn nhúng iframe, HSTS bắt buộc HTTPS, tắt camera/micro...
//  2. Giới hạn tần suất theo IP (chống spam / dò quét / tấn công từ chối dịch vụ), vượt ngưỡng -> chặn tạm thời
//  3. Chặn yêu cầu ghi dữ liệu từ web lạ (kiểm tra Origin)
//  4. Không cho trình duyệt / proxy lưu đệm dữ liệu tài chính (API)
// Không dùng thư viện ngoài; bộ đếm lưu trong bộ nhớ (1 máy chủ Railway).

const now = () => Date.now();
const log = (msg) => console.warn(`[BẢO MẬT] ${new Date().toISOString()} ${msg}`);

// ---------- 1. Header bảo mật ----------
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // giao diện dùng style="..." trong HTML động
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function headers(req, res, next) {
  res.set({
    'Content-Security-Policy': CSP + (req.secure ? '; upgrade-insecure-requests' : ''),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
}

// ---------- 2. Giới hạn tần suất + chặn IP tạm thời ----------
// Ngưỡng tính cho 1 IP; người dùng bình thường (kể cả nhiều người chung mạng công ty) dùng chưa tới 1/5 ngưỡng
const LIMITS = {
  all: { win: 60e3, max: 600 },     // mọi yêu cầu (trang, ảnh, API) / phút
  write: { win: 60e3, max: 120 },   // thêm / sửa / xóa / phút
};
const BAN_MS = 10 * 60e3;           // vượt ngưỡng -> chặn 10 phút
const hits = new Map();             // ip -> { all: [start, n], write: [start, n] }
const bans = new Map();             // ip -> hết hạn chặn (ms)

function count(rec, key, lim) {
  const t = now();
  const c = rec[key];
  if (!c || t - c[0] > lim.win) { rec[key] = [t, 1]; return 1; }
  return ++c[1];
}
function ban(ip, why, ms = BAN_MS) {
  bans.set(ip, now() + ms);
  log(`Chặn IP ${ip} trong ${Math.round(ms / 60e3)} phút: ${why}`);
}
const banLeft = (ip) => {
  const until = bans.get(ip);
  if (!until) return 0;
  if (until <= now()) { bans.delete(ip); return 0; }
  return until - now();
};

function rateLimit(req, res, next) {
  if (req.path === '/health') return next(); // kiểm tra sức khỏe của Railway
  const ip = req.ip || 'unknown';
  const left = banLeft(ip);
  if (left) return tooMany(req, res, left);
  const rec = hits.get(ip) || {};
  hits.set(ip, rec);
  if (count(rec, 'all', LIMITS.all) > LIMITS.all.max) { ban(ip, `quá ${LIMITS.all.max} yêu cầu/phút`); return tooMany(req, res, BAN_MS); }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && count(rec, 'write', LIMITS.write) > LIMITS.write.max) {
    ban(ip, `quá ${LIMITS.write.max} lượt ghi dữ liệu/phút`);
    return tooMany(req, res, BAN_MS);
  }
  next();
}
function tooMany(req, res, ms) {
  const min = Math.max(1, Math.ceil(ms / 60e3));
  res.set('Retry-After', String(Math.ceil(ms / 1000)));
  const msg = `Truy cập quá nhiều trong thời gian ngắn. Vui lòng thử lại sau ${min} phút.`;
  if (req.path.startsWith('/api/')) return res.status(429).json({ errors: [msg] });
  res.status(429).type('text').send(msg);
}

// Đăng nhập sai nhiều lần từ 1 IP trong 1 giờ -> chặn IP 1 giờ (bổ sung cho giới hạn 10 lần / 15 phút sẵn có)
const loginFails = new Map(); // ip -> [start, n]
function loginFailedIp(ip) {
  const t = now();
  const c = loginFails.get(ip);
  if (!c || t - c[0] > 3600e3) { loginFails.set(ip, [t, 1]); return; }
  if (++c[1] >= 30) { ban(ip, '30 lần đăng nhập sai trong 1 giờ', 3600e3); loginFails.delete(ip); }
}

// Dọn bộ đếm cũ mỗi 5 phút
setInterval(() => {
  const t = now();
  for (const [ip, r] of hits) if ((!r.all || t - r.all[0] > 120e3) && (!r.write || t - r.write[0] > 120e3)) hits.delete(ip);
  for (const [ip, c] of loginFails) if (t - c[0] > 3600e3) loginFails.delete(ip);
  for (const ip of bans.keys()) banLeft(ip);
}, 5 * 60e3).unref();

// ---------- 3. Chặn ghi dữ liệu từ web lạ ----------
// Trình duyệt luôn gửi Origin với yêu cầu ghi; khác tên miền của chính web -> từ chối
function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('Origin');
  if (origin && origin !== 'null') {
    let host = '';
    try { host = new URL(origin).host; } catch { /* sai định dạng */ }
    if (host !== req.get('Host')) {
      log(`Từ chối ${req.method} ${req.path} từ nguồn lạ ${origin} (IP ${req.ip})`);
      return res.status(403).json({ errors: ['Yêu cầu không hợp lệ (nguồn không được phép)'] });
    }
  }
  next();
}

module.exports = { headers, rateLimit, sameOrigin, loginFailedIp, log };
