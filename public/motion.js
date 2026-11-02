// =====================================================================
// HIỆU ỨNG TRANG BÁO CÁO (chỉ là cách hiện số, không đổi số liệu)
// Mức 1 – chuyển động: số chạy đếm, cột mọc, thanh chạy, vòng vẽ dần, khối trượt vào khi cuộn tới;
//         vẽ lại do thao tác (đổi TĐ…) thì số chuyển mượt từ giá trị cũ sang giá trị mới, không chạy lại hiệu ứng xuất hiện
// Mức 2 – chiều sâu 3D: thẻ nghiêng theo con trỏ chuột (chỉ máy có chuột), thẻ TĐ đang chọn nổi lên
// Tự tắt khi máy bật "giảm chuyển động"; khi in hiện ngay số cuối
// =====================================================================
const MO_SO = ['.b-cash-i b', '.jr-ln', '.cf-tv', '.cf-dv', '.f-card.kx .f-val', '.map-hot .v'];
const MO_KHOI = ['.jr', '.cf-t', '.cf-c', '.dc', '.f-card.kx', '.map-w', '.th-tdp', '.cf-tb', '.pc-gal'];
const MO_TILT = '.cf-t, .jr-nd, .f-card.kx, .map-hot';
const moTat = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const moCu = new Map(); // khóa ô số -> giá trị lần vẽ trước (để chuyển mượt)
let moIO = null;
const moRun = new Set(); // các ô đang chạy đếm (để kết thúc ngay khi in)

// Tìm số đầu tiên trong ô (dạng 1.895,77 · −146,19 · 30,2)
const MO_RE = /([−-]?)(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d+))?/;
function moTextNode(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (MO_RE.test(n.nodeValue)) return n;
  return null;
}
function moDem(el, key, quiet) {
  const n = moTextNode(el); if (!n) return;
  const m = n.nodeValue.match(MO_RE), dec = m[3] ? m[3].length : 0, am = m[1];
  const to = Number(m[2].replace(/\./g, '') + (m[3] ? '.' + m[3] : '')) * (am ? -1 : 1);
  const from = moCu.has(key) ? moCu.get(key) : (quiet ? to : 0);
  moCu.set(key, to);
  if (from === to || !Number.isFinite(to)) return;
  const pre = n.nodeValue.slice(0, m.index), post = n.nodeValue.slice(m.index + m[0].length), sign = am || '−';
  const fmt = (x) => `${pre}${x < 0 ? sign : ''}${Math.abs(x).toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${post}`;
  const final = n.nodeValue, t0 = performance.now(), dur = quiet ? 450 : 900;
  const job = { end: () => { n.nodeValue = final; moRun.delete(job); } };
  moRun.add(job);
  const step = (t) => { if (!moRun.has(job)) return; const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
    if (k >= 1) return job.end(); n.nodeValue = fmt(from + (to - from) * e); requestAnimationFrame(step); };
  n.nodeValue = fmt(from); requestAnimationFrame(step);
}

function bMotion(quiet) {
  const box = document.getElementById('b-report'); if (!box) return;
  if (moTat()) { box.classList.add('mo-off'); return; }
  box.classList.remove('mo-off');
  box.classList.toggle('mo-quiet', Boolean(quiet)); // vẽ lại do thao tác: không chạy hiệu ứng xuất hiện / mọc cột
  moIO?.disconnect();
  // Khối nào đang chờ cuộn tới để hiện (mo-rv chưa mo-in) thì hiện ngay – không bao giờ để khối bị ẩn mãi
  // (lỗi cũ: bấm nút phía trên trước khi cuộn xuống -> ngắt theo dõi cuộn -> mục II, III, bản đồ trắng trơn)
  box.querySelectorAll('.mo-rv:not(.mo-in)').forEach((el) => el.classList.add('mo-in'));
  // Đếm số: chạy khi ô hiện trên màn hình (vẽ lại do thao tác: chạy ngay, từ giá trị cũ)
  const so = []; MO_SO.forEach((sel) => box.querySelectorAll(sel).forEach((el, i) => so.push([el, `${sel}#${i}`])));
  // Khối trượt vào + cột mọc khi cuộn tới
  const khoi = quiet ? [] : MO_KHOI.flatMap((sel) => [...box.querySelectorAll(sel)]);
  khoi.forEach((el) => el.classList.add('mo-rv'));
  if (quiet || !('IntersectionObserver' in window)) { so.forEach(([el, k]) => moDem(el, k, quiet)); khoi.forEach((el) => el.classList.add('mo-in')); }
  else {
    const map = new Map(so);
    moIO = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return;
      const el = e.target; moIO.unobserve(el); el.classList.add('mo-in'); if (map.has(el)) moDem(el, map.get(el), false); }), { threshold: 0.15 });
    so.forEach(([el]) => moIO.observe(el)); khoi.forEach((el) => moIO.observe(el));
    clearTimeout(bMotion.t); // lưới an toàn: sau 4 giây khối nào chưa hiện thì hiện luôn
    bMotion.t = setTimeout(() => box.querySelectorAll('.mo-rv:not(.mo-in)').forEach((el) => el.classList.add('mo-in')), 4000);
  }
}

// ---- Mức 2: thẻ nghiêng theo con trỏ (chỉ thiết bị có chuột) ----
if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
  let cur = null;
  document.addEventListener('pointermove', (e) => {
    if (moTat()) return;
    const el = e.target.closest?.(MO_TILT);
    if (cur && cur !== el) { cur.style.transform = ''; cur.classList.remove('mo-tilt'); cur = null; }
    if (!el || !el.closest('#b-report')) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    cur = el; el.classList.add('mo-tilt');
    el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(6px)`;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (cur) { cur.style.transform = ''; cur.classList.remove('mo-tilt'); cur = null; } });
}
// In / xuất PDF: kết thúc mọi số đang chạy, hiện ngay số cuối
window.addEventListener('beforeprint', () => { [...moRun].forEach((j) => j.end()); document.querySelectorAll('#b-report .mo-rv').forEach((el) => el.classList.add('mo-in')); });
