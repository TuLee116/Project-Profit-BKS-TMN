// Nhật ký hoạt động: tự ghi mọi thao tác thêm / sửa / xóa qua API (kèm giá trị trước -> sau),
// đăng nhập / đăng xuất / đăng nhập sai, xuất báo cáo. Quản trị xem tại tab Tài khoản.
// Không ghi mật khẩu, passcode hay nội dung nhạy cảm: thông tin mô tả lấy từ CSDL, không lấy từ dữ liệu gửi lên.
const store = require('./db');
const { NHOM_CHI_PHI } = require('./cost');
const { ROLES } = require('./validate');

const KEEP_DAYS = 365; // giữ nhật ký 1 năm
const money = (n) => (n === null || n === undefined || n === '' ? '—' : new Intl.NumberFormat('vi-VN').format(Number(n)) + ' đ');
const dmy = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—');
const LOAI_TIEN = { tam_ung: 'Tạm ứng', dot: 'Thanh toán', quyet_toan: 'Quyết toán' };
const nhomTen = (code, sub) => {
  const n = NHOM_CHI_PHI.find((x) => x.code === code);
  const s = n?.sub.find((x) => x.code === sub);
  return [n?.ten || code, s?.ten].filter(Boolean).join(' › ');
};

// Mô tả ngắn 1 bản ghi
function describe(kind, r) {
  if (!r) return '';
  switch (kind) {
    case 'du_an': return `${r.ma_du_an} – ${r.ten}`;
    case 'doanh_thu': return `${r.loai === 'hd' ? 'HĐ/PL' : 'HT/QT'} ${r.so_hieu} · ${money(r.gia_tri)} (VAT ${r.vat}%)`;
    case 'tien_ve': return `${LOAI_TIEN[r.loai] || r.loai}${r.dot ? ' đợt ' + r.dot : ''} · ${money(r.so_tien)}${r.hd ? ' · ' + r.hd : ''}`;
    case 'chi_phi': return `${nhomTen(r.nhom, r.nhom_con)} · ${r.noi_dung} · ${money(r.gia_tri)}`;
    case 'thau_phu': return `HĐTP ${r.so_ma}${r.doi_tac ? ' – ' + r.doi_tac : ''}`;
    case 'tp_hd_pl': return `HĐTP ${r.tp} · ${r.ma_loai} · ${money(r.gia_tri)}`;
    case 'tp_thanh_toan': return `HĐTP ${r.tp} · ${LOAI_TIEN[r.loai] || r.loai}${r.dot ? ' đợt ' + r.dot : ''} · ${money(r.so_tien)}`;
    case 'users': return `${r.username} (${r.full_name}, ${ROLES[r.role] || r.role}${r.active ? '' : ', đã khóa'})`;
    default: return '';
  }
}

// Các trường so sánh khi sửa: [trường, nhãn, cách hiển thị]
const FIELDS = {
  du_an: [['ten', 'Tên'], ['chu_dau_tu', 'CĐT'], ['trang_thai', 'Trạng thái'], ['tien_do', 'Tiến độ', (x) => x + '%']],
  doanh_thu: [['so_hieu', 'Số hiệu'], ['ngay', 'Ngày', dmy], ['gia_tri', 'Giá trị', money], ['vat', 'VAT', (x) => x + '%']],
  tien_ve: [['loai', 'Loại', (x) => LOAI_TIEN[x] || x], ['dot', 'Đợt'], ['so_tien', 'Số tiền', money], ['ngay', 'Ngày', dmy], ['hd', 'HĐ']],
  chi_phi: [['noi_dung', 'Nội dung'], ['doi_tac', 'Đối tác'], ['ngay', 'Ngày', dmy], ['gia_tri', 'Giá trị', money], ['vat', 'VAT', (x) => x + '%']],
  thau_phu: [['so_ma', 'Số HĐTP'], ['doi_tac', 'Nhà thầu']],
  tp_hd_pl: [['ngay', 'Ngày', dmy], ['gia_tri', 'Giá trị', money], ['vat', 'VAT', (x) => x + '%'], ['gia_tri_qt', 'HT/QT', money]],
  tp_thanh_toan: [['loai', 'Loại', (x) => LOAI_TIEN[x] || x], ['dot', 'Đợt'], ['so_tien', 'Số tiền', money], ['ngay', 'Ngày', dmy]],
  users: [['full_name', 'Họ tên'], ['role', 'Quyền', (x) => ROLES[x] || x], ['active', 'Trạng thái', (x) => (x ? 'Hoạt động' : 'Khóa')]],
};
function diff(kind, a, b) {
  if (!a || !b) return '';
  const out = [];
  for (const [k, label, fmt = (x) => x] of FIELDS[kind] || []) {
    const x = a[k] ?? null, y = b[k] ?? null;
    if (String(x) !== String(y)) out.push(`${label}: ${x === null || x === '' ? '—' : fmt(x)} → ${y === null || y === '' ? '—' : fmt(y)}`);
  }
  return out.join('; ');
}

// Bảng tuyến API ghi dữ liệu -> [phương thức, mẫu đường dẫn, đối tượng, loại bản ghi, id lấy từ: số (nhóm regex) | 'res' (id trả về)]
const ROUTES = [
  ['POST', /^\/du-an$/, 'Dự án', 'du_an', 'res'],
  ['PUT', /^\/du-an\/(\d+)$/, 'Dự án', 'du_an', 1],
  ['DELETE', /^\/du-an\/(\d+)$/, 'Dự án', 'du_an', 1],
  ['PUT', /^\/du-an\/(\d+)\/anh$/, 'Ảnh công trình', 'du_an', 1, 'Cập nhật ảnh'],
  ['DELETE', /^\/du-an\/(\d+)\/anh$/, 'Ảnh công trình', 'du_an', 1, 'Xóa ảnh'],
  ['POST', /^\/du-an\/\d+\/doanh-thu$/, 'Doanh thu', 'doanh_thu', 'res'],
  ['PUT', /^\/doanh-thu\/(\d+)$/, 'Doanh thu', 'doanh_thu', 1],
  ['DELETE', /^\/doanh-thu\/(\d+)$/, 'Doanh thu', 'doanh_thu', 1],
  ['POST', /^\/du-an\/\d+\/tien-ve$/, 'Tiền về', 'tien_ve', 'res'],
  ['PUT', /^\/tien-ve\/(\d+)$/, 'Tiền về', 'tien_ve', 1],
  ['DELETE', /^\/tien-ve\/(\d+)$/, 'Tiền về', 'tien_ve', 1],
  ['POST', /^\/du-an\/\d+\/chi-phi$/, 'Chi phí', 'chi_phi', 'res'],
  ['PUT', /^\/chi-phi\/(\d+)$/, 'Chi phí', 'chi_phi', 1],
  ['DELETE', /^\/chi-phi\/(\d+)$/, 'Chi phí', 'chi_phi', 1],
  ['POST', /^\/du-an\/\d+\/thau-phu$/, 'Thầu phụ', 'thau_phu', 'res'],
  ['PUT', /^\/thau-phu\/(\d+)$/, 'Thầu phụ', 'thau_phu', 1],
  ['DELETE', /^\/thau-phu\/(\d+)$/, 'Thầu phụ', 'thau_phu', 1],
  ['POST', /^\/thau-phu\/\d+\/hd-pl$/, 'Thầu phụ – HĐ/PL', 'tp_hd_pl', 'res'],
  ['PUT', /^\/tp-hd-pl\/(\d+)$/, 'Thầu phụ – HĐ/PL', 'tp_hd_pl', 1],
  ['DELETE', /^\/tp-hd-pl\/(\d+)$/, 'Thầu phụ – HĐ/PL', 'tp_hd_pl', 1],
  ['POST', /^\/thau-phu\/\d+\/thanh-toan$/, 'Thầu phụ – thanh toán', 'tp_thanh_toan', 'res'],
  ['PUT', /^\/tp-thanh-toan\/(\d+)$/, 'Thầu phụ – thanh toán', 'tp_thanh_toan', 1],
  ['DELETE', /^\/tp-thanh-toan\/(\d+)$/, 'Thầu phụ – thanh toán', 'tp_thanh_toan', 1],
  ['POST', /^\/users$/, 'Tài khoản', 'users', 'res'],
  ['PUT', /^\/users\/(\d+)$/, 'Tài khoản', 'users', 1],
  ['DELETE', /^\/users\/(\d+)$/, 'Tài khoản', 'users', 1],
  // Thao tác không gắn bản ghi
  ['PUT', /^\/settings$/, 'Cài đặt', null, null, 'Cập nhật thông tin đơn vị / hệ thống'],
  ['PUT', /^\/settings\/passcode$/, 'Cài đặt', null, null, 'Đổi Passcode xóa dữ liệu'],
  ['PUT', /^\/lien-he$/, 'Liên hệ', null, null, 'Cập nhật thông tin liên hệ'],
  ['PUT', /^\/muc-tieu$/, 'Mục tiêu năm', null, null, 'Cập nhật mục tiêu năm'],
  ['POST', /^\/demo$/, 'Dữ liệu mẫu', null, null, 'Tạo dữ liệu mẫu', 'Thêm'],
  ['DELETE', /^\/demo$/, 'Dữ liệu mẫu', null, null, 'Xóa dữ liệu mẫu'],
  ['POST', /^\/auth\/change-password$/, 'Cá nhân', null, null, 'Đổi mật khẩu của mình'],
];
const ACT = { POST: 'Thêm', PUT: 'Sửa', DELETE: 'Xóa' };

// Thiết bị / trình duyệt rút gọn từ User-Agent: "Chrome · Windows"
function device(ua = '') {
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /CocCoc|coc_coc/.test(ua) ? 'Cốc Cốc' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return [br, os].filter(Boolean).join(' · ') || 'Không rõ thiết bị';
}

function who(req) {
  const u = req.user || {};
  return { user_id: u.id || null, username: u.username || '', ho_ten: u.full_name || '', ip: req.ip || '' };
}
function write(e) {
  store.addLog(e).catch((err) => console.error('Lỗi ghi nhật ký:', err.message));
}
// Ghi 1 sự kiện bất kỳ (đăng nhập, xuất báo cáo...)
function log(req, hanh_dong, doi_tuong, noi_dung, extra = {}) {
  write({ ...who(req), hanh_dong, doi_tuong, noi_dung, ...extra });
}

// Middleware gắn sau đăng nhập: chụp trạng thái trước (sửa / xóa), ghi sau khi thành công
function middleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const r = ROUTES.find(([m, re]) => m === req.method && re.test(req.path));
  if (!r) return next();
  const [method, re, doi_tuong, kind, idFrom, fixed, act] = r;
  const m = req.path.match(re);
  const id = typeof idFrom === 'number' ? Number(m[idFrom]) : null;
  let resBody = null;
  const json = res.json.bind(res);
  res.json = (body) => { resBody = body; return json(body); };
  const pwChanged = kind === 'users' && method === 'PUT' && Boolean(req.body?.password); // không ghi mật khẩu, chỉ ghi là có đặt lại
  const go = async (before) => {
    res.on('finish', async () => {
      if (res.statusCode >= 400) return;
      try {
        const rid = id || (idFrom === 'res' ? Number(resBody?.id) : null);
        const after = kind && method !== 'DELETE' && rid ? await store.auditInfo(kind, rid) : null;
        const info = after || before;
        let noi_dung = fixed || describe(kind, info);
        if (method === 'PUT' && !fixed && kind) {
          const d = diff(kind, before, after);
          noi_dung = describe(kind, after || before) + (d ? ` | ${d}` : '');
        }
        if (pwChanged) noi_dung += ' | Đặt lại mật khẩu';
        if (kind === 'du_an' && fixed) noi_dung += ` · ${describe('du_an', info)}`;
        write({ ...who(req), hanh_dong: method === 'DELETE' ? 'Xóa' : act || (fixed ? 'Cập nhật' : ACT[method]), doi_tuong, du_an: info?.ma_du_an || '', noi_dung });
      } catch (err) { console.error('Lỗi ghi nhật ký:', err.message); }
    });
    next();
  };
  if (kind && id && method !== 'POST') store.auditInfo(kind, id).then(go, () => go(null));
  else go(null);
}

// Dọn nhật ký cũ hơn 1 năm (khi khởi động và mỗi ngày)
function startPrune() {
  const run = () => store.pruneLogs(KEEP_DAYS).then((n) => n && console.log(`[NHẬT KÝ] Đã dọn ${n} dòng nhật ký cũ hơn ${KEEP_DAYS} ngày`)).catch(() => {});
  run();
  setInterval(run, 24 * 3600e3).unref();
}

const HANH_DONG = ['Đăng nhập', 'Đăng xuất', 'Hết phiên', 'Đăng nhập sai', 'Thêm', 'Sửa', 'Xóa', 'Cập nhật', 'Xuất báo cáo'];
module.exports = { middleware, log, startPrune, device, HANH_DONG };
