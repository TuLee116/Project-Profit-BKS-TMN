// =====================================================================
// BÁO CÁO TỔNG QUAN – tổng quát + chi tiết, In/PDF, Excel, PowerPoint
// Số liệu: /api/bao-cao (cùng công thức Dashboard). Dùng chung tiện ích của app.js / common.js.
// =====================================================================
let BC = null;                                  // dữ liệu báo cáo
const BST = { project: '', vat: 'gt', ky: 'nam', tu: '', den: '', chi_tiet: false }; // phạm vi, cơ sở VAT, kỳ báo cáo
try { Object.assign(BST, JSON.parse(localStorage.getItem('bao_cao') || '{}')); } catch {}
BST.chi_tiet = false; // phần Phân tích chi tiết luôn ẩn khi mở báo cáo; chỉ mở khi người dùng bấm xem
const bSave = () => { try { localStorage.setItem('bao_cao', JSON.stringify({ ...BST, chi_tiet: false })); } catch {} };

// Bảng màu doanh nghiệp (đã kiểm tra phân biệt màu cho người mù màu): Doanh thu navy · Chi phí đồng · Lợi nhuận teal
const BCOL = { dt: '#2c5fa3', cp: '#c27a3e', dk: '#16968a', th: '#2c5fa3', thu: '#2c5fa3', chi: '#c27a3e', ts: '#7e5aa6' };
const bf = new Intl.NumberFormat('vi-VN');
const bn = (n) => bf.format(Math.round(n || 0));
const bm = (n) => `<span class="${n < 0 ? 'neg' : ''}">${bn(n)}</span>`;
const bpct = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace('.', ',') + '%' : '—');
const bTy = (n) => (n / 1e9).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // tỷ đồng
const MUC = { cao: 'Cao', tb: 'Trung bình', thap: 'Thấp' };

async function loadReport() {
  $('#b-report').innerHTML = '<div class="card muted">Đang tổng hợp số liệu...</div>';
  BC = await api('/api/bao-cao');
  renderReport();
}

// Mô tả phạm vi báo cáo để ghi nhật ký
function bLogScope() {
  const { one } = bScope();
  return `${one ? one.ma_du_an + ' – ' + one.ten_du_an : 'Tất cả dự án'} · ${bPeriod(BC.du_an).label} · ${BST.vat === 'gt' ? 'trước VAT' : 'sau VAT'}`;
}
function bScope() {
  const id = Number(BST.project);
  const list = id ? BC.du_an.filter((d) => d.id === id) : BC.du_an;
  return { list, one: id ? list[0] : null };
}

// Tổng hợp nhiều dự án
function bTotals(list) {
  const S = (f) => list.reduce((s, d) => s + f(d), 0);
  const L = (k) => ({
    dt: { gt: S((d) => d[k].doanh_thu.gt), sv: S((d) => d[k].doanh_thu.sv) },
    cp: { gt: S((d) => d[k].chi_phi.gt), sv: S((d) => d[k].chi_phi.sv) },
    con_lai: S((d) => d[k].con_lai),
  });
  return {
    so_da: list.length, so_hd: S((d) => d.so_hd), so_hd_qt: S((d) => d.so_hd_qt), so_tp: S((d) => d.so_tp), so_tp_qt: S((d) => d.so_tp_qt),
    dk: L('du_kien'), th: L('thuc_hien'), tien_ve: S((d) => d.tien_ve), tra_goc: S((d) => d.tra_goc.sv),
    tp_con_lai: S((d) => d.tp.con_lai), tp_da_tt: S((d) => d.tp.da_tt),
    canh_bao: S((d) => d.canh_bao.length),
  };
}

// Gộp số liệu theo tháng: lũy kế DT/CP thực hiện + dòng tiền thu/chi
function bMonths(list, v) {
  const m = {};
  for (const d of list) {
    for (const [k, t] of Object.entries(d.thuc_hien.thang)) { const o = (m[k] ||= { dt: 0, cp: 0, thu: 0, chi: 0 }); o.dt += t['dt_' + v]; o.cp += t['cp_' + v]; }
    for (const [k, t] of Object.entries(d.dong_tien)) { const o = (m[k] ||= { dt: 0, cp: 0, thu: 0, chi: 0 }); o.thu += t.thu; o.chi += t.chi; }
  }
  const keys = Object.keys(m).sort();
  if (!keys.length) return [];
  const out = [];
  let [y, mo] = keys[0].split('-').map(Number);
  const [ye, me] = keys[keys.length - 1].split('-').map(Number);
  let cDt = 0, cCp = 0;
  while (y < ye || (y === ye && mo <= me)) {
    const k = `${y}-${String(mo).padStart(2, '0')}`;
    const o = m[k] || { dt: 0, cp: 0, thu: 0, chi: 0 };
    cDt += o.dt; cCp += o.cp;
    out.push({ k, label: `${String(mo).padStart(2, '0')}/${String(y).slice(2)}`, ...o, luy_dt: cDt, luy_cp: cCp });
    if (++mo > 12) { mo = 1; y++; }
  }
  return out;
}

function bCostGroups(list, v) {
  const map = new Map();
  for (const d of list) for (const n of d.nhom) {
    const o = map.get(n.code) || { ten: n.ten, khoi: n.khoi, val: 0 };
    o.val += n[v];
    map.set(n.code, o);
  }
  return [...map.values()].filter((x) => x.val).sort((a, b) => b.val - a.val);
}

// ---------------------------------------------------------------------
// KỲ BÁO CÁO (theo tháng) – số liệu lớp Thực hiện theo ngày phát sinh
// ---------------------------------------------------------------------
const ymAdd = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${String(m).padStart(2, '0')}`; };
const ymDiff = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const ymTxt = (ym) => { const [y, m] = ym.split('-'); return `${m}/${y}`; };
const lastDay = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
const ROMAN_Q = ['I', 'II', 'III', 'IV'];
function bNowYm() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()).slice(0, 7); }
function bAllMonths(list) {
  const ks = new Set();
  for (const d of list) { Object.keys(d.thuc_hien.thang).forEach((k) => ks.add(k)); Object.keys(d.dong_tien).forEach((k) => ks.add(k)); }
  return [...ks].sort();
}
function bPeriod(list) {
  const now = bNowYm();
  const [y, m] = now.split('-').map(Number);
  const q = Math.floor((m - 1) / 3);
  let from, to, label;
  switch (BST.ky) {
    case 'thang': from = to = now; label = `Tháng ${ymTxt(now)}`; break;
    case 'quy': from = `${y}-${String(q * 3 + 1).padStart(2, '0')}`; to = ymAdd(from, 2); label = `Quý ${ROMAN_Q[q]}/${y}`; break;
    case '6t': to = now; from = ymAdd(now, -5); label = '6 tháng gần nhất'; break;
    case 'luyke': { const all = bAllMonths(list); from = all[0] && all[0] < now ? all[0] : now; to = now; label = `Lũy kế đến ${ymTxt(now)}`; break; }
    case 'all': { const all = bAllMonths(list); from = all[0] || now; to = all.length ? all[all.length - 1] : now; label = 'Toàn bộ thời gian'; break; }
    case 'tuychon': from = BST.tu || ymAdd(now, -2); to = BST.den || now; if (from > to) [from, to] = [to, from]; label = from === to ? `Tháng ${ymTxt(from)}` : `${ymTxt(from)} – ${ymTxt(to)}`; break;
    default: from = `${y}-01`; to = `${y}-12`; label = `Năm ${y}`;
  }
  const n = ymDiff(from, to) + 1;
  const prev = BST.ky === 'luyke' || BST.ky === 'all' ? null : { from: ymAdd(from, -n), to: ymAdd(from, -1) };
  const [fy, fm] = from.split('-'), [ty, tm] = to.split('-');
  return { from, to, n, prev, label, range: `01/${fm}/${fy} – ${lastDay(to)}/${tm}/${ty}` };
}
// Tổng trong khoảng tháng [a, b]
function bSumRange(list, v, a, b) {
  const o = { dt: 0, cp: 0, thu: 0, chi: 0 };
  const inR = (k) => k >= a && k <= b;
  for (const d of list) {
    for (const [k, t] of Object.entries(d.thuc_hien.thang)) if (inR(k)) { o.dt += t['dt_' + v]; o.cp += t['cp_' + v]; }
    for (const [k, t] of Object.entries(d.dong_tien)) if (inR(k)) { o.thu += t.thu; o.chi += t.chi; }
  }
  o.ln = o.dt - o.cp;
  o.dong_tien = o.thu - o.chi;
  return o;
}
function bBalance(list, b) { // số dư dòng tiền lũy kế đến hết tháng b
  let s = 0;
  for (const d of list) for (const [k, t] of Object.entries(d.dong_tien)) if (k <= b) s += t.thu - t.chi;
  return s;
}
// Chuỗi theo tháng (gộp theo quý nếu kỳ > 12 tháng)
function bSeries(list, v, P) {
  const byQ = P.n > 12;
  const out = [];
  for (let k = P.from; k <= P.to; k = ymAdd(k, byQ ? 3 : 1)) {
    let a = k, b = byQ ? ymAdd(k, 2) : k;
    if (b > P.to) b = P.to;
    const [yy, mm] = k.split('-').map(Number);
    const o = bSumRange(list, v, a, b);
    out.push({ k, label: byQ ? `Q${Math.floor((mm - 1) / 3) + 1}/${String(yy).slice(2)}` : `T${mm}/${String(yy).slice(2)}`, ...o });
    if (byQ && b === P.to) break;
  }
  // Bỏ các tháng/quý tương lai chưa có số liệu (vd: T11, T12 khi đang ở T10)
  const now = bNowYm();
  while (out.length > 1 && out[out.length - 1].k > now && ['dt', 'cp', 'thu', 'chi'].every((f) => !out[out.length - 1][f])) out.pop();
  return out;
}

// So với kỳ trước: good = tăng là tốt
function bDelta(cur, prev, good = true) {
  if (prev === null || prev === undefined) return '';
  if (!prev) return `<span class="f-delta">— <small>kỳ trước = 0</small></span>`;
  const p = (cur - prev) / Math.abs(prev);
  const up = p >= 0;
  const ok = up === good;
  return `<span class="f-delta ${ok ? 'ok' : 'bad'}">${up ? '▲' : '▼'} ${Math.abs(p * 100).toFixed(1).replace('.', ',')}% <small>so với kỳ trước</small></span>`;
}
const PROJ_COLORS = ['#2c5fa3', '#c27a3e', '#16968a', '#7e5aa6', '#9a8a2e', '#b04f5a', '#3f8fbf'];
const KHAC_COLOR = '#b5b3ab';
// Màu công trình theo thứ hạng doanh thu trong kỳ (khớp biểu đồ tròn): > 7 công trình -> 6 lớn nhất có màu riêng, còn lại xám "Khác"
function bPrjColors(list, v, P) {
  const rk = list.map((d) => ({ id: d.id, dt: bSumRange([d], v, P.from, P.to).dt })).sort((a, b) => b.dt - a.dt);
  const pos = rk.filter((x) => x.dt > 0).length;
  const m = new Map();
  rk.forEach((x, i) => m.set(x.id, x.dt > 0 && (pos <= 7 || i < 6) ? PROJ_COLORS[i] : KHAC_COLOR));
  return m;
}

// ---------------------------------------------------------------------
// THỰC THU – THỰC CHI – CÒN LẠI THỰC (tiền thật, sau VAT, lũy kế đến hết kỳ đang chọn)
//  Thực thu = tiền về · Thực chi = chi phí đã chi + trả thầu phụ (gồm tạm ứng) · Còn lại thực = thu − chi
//  Nhận tiền vay (tiền vào) và trả nợ gốc (tiền ra) không phải doanh thu / chi phí -> tách riêng; Sau vay & trả nợ = Còn lại thực + vay − gốc. Kế hoạch = theo HĐ (HĐ + PL; đã quyết toán theo QT)
// ---------------------------------------------------------------------
function bThuc(d, to) {
  const o = { thu: 0, cp: 0, tp: 0, goc: 0, vay: 0 };
  const T = d.tien_thuc || { thang: {}, chua_ngay: {} };
  for (const [m, t] of Object.entries(T.thang)) if (m <= to) for (const k in o) o[k] += t[k] || 0;
  if (to >= bNowYm()) for (const k in o) o[k] += T.chua_ngay[k] || 0; // dòng chưa nhập ngày: tính khi xem đến hiện tại
  o.chi = o.cp + o.tp; o.con = o.thu - o.chi; o.sau_goc = o.con + o.vay - o.goc; o.du_no = o.vay - o.goc;
  o.kh_thu = d.du_kien.doanh_thu.sv; o.kh_chi = d.du_kien.chi_phi.sv;
  o.phai_thu = o.kh_thu - o.thu; o.phai_chi = o.kh_chi - o.chi;
  return o;
}
function bThucHtml(list) {
  const P = bPeriod(list);
  const to = P.to < bNowYm() ? P.to : bNowYm();
  const rows = list.map((d) => ({ d, ...bThuc(d, to) }));
  const T = rows.reduce((a, x) => { for (const k of ['thu', 'cp', 'tp', 'goc', 'vay', 'sau_goc', 'du_no', 'chi', 'con', 'kh_thu', 'kh_chi', 'phai_thu', 'phai_chi']) a[k] = (a[k] || 0) + x[k]; return a; }, {});
  const ty = (x) => `<span class="${x < 0 ? 'neg' : ''}">${bTy(x)}</span>`;
  const meter = (a, b, color) => `<span class="f-meter"><i style="width:${b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0}%;background:${color}"></i></span>`;
  const card = (cls, key, title, val, lines) => `<div class="tt-k ${cls}"><div class="f-title">${title}</div>
    <button type="button" class="tt-link f-val ${val < 0 ? 'neg' : ''}" data-ttd="${key}" title="Bấm để xem cách tính và chi tiết">${bTy(val)} <small>tỷ</small></button>
    <div class="f-lines">${lines.map((x) => `<div>${x}</div>`).join('')}</div></div>`;
  const lk = (key, val, cls = '') => `<button type="button" class="tt-link tt-sm ${cls} ${val < 0 ? 'neg' : ''}" data-ttd="${key}" title="Bấm để xem chi tiết">${bTy(val)}</button>`;
  return `<section class="card b-sec tt-sec">
    <div class="f-head"><h2>Thực thu – Thực chi – Còn lại thực</h2>
      <span class="f-range">Lũy kế đến hết ${ymTxt(to)} · tiền thật, sau VAT</span></div>
    <p class="muted small tt-intro">Tiền <b>thực tế đã về tài khoản</b> và <b>thực tế đã chi ra</b> của ${list.length > 1 ? `${list.length} công trình` : 'công trình'}, đặt cạnh <b>kế hoạch theo hợp đồng</b> (HĐ + phụ lục; HĐ đã quyết toán lấy theo quyết toán).</p>
    <div class="tt-grid">
      ${card('tt-thu', 'thu', 'Thực thu (tiền về)', T.thu, [`${meter(T.thu, T.kh_thu, BCOL.thu)} <b>${bpct(T.thu, T.kh_thu)}</b> kế hoạch`, `Kế hoạch thu: ${lk('kh_thu', T.kh_thu)} tỷ`])}
      ${card('tt-chi', 'chi', 'Thực chi (tiền ra)', T.chi, [`${meter(T.chi, T.kh_chi, BCOL.chi)} <b>${bpct(T.chi, T.kh_chi)}</b> kế hoạch`, `Chi phí ${lk('cp', T.cp)} · Trả thầu phụ ${lk('tp', T.tp)} tỷ`])}
      ${card('tt-con', 'con', 'Còn lại thực (thu − chi)', T.con, [`Nhận tiền vay ${lk('vay', T.vay)} · Trả nợ gốc ${lk('goc', T.goc)} tỷ`, `Sau vay & trả nợ: ${lk('sau_goc', T.sau_goc)} tỷ · dư nợ ${lk('du_no', T.du_no)}`])}
      ${card('tt-kh', 'phai_thu', 'Còn phải thu', T.phai_thu, [`Còn phải chi: ${lk('phai_chi', T.phai_chi)} tỷ`, `Còn lại khi hoàn tất theo KH: ${lk('kh_con', T.kh_thu - T.kh_chi)} tỷ`])}
    </div>
    <div class="f-box tt-chart"><h3>Diễn biến tiền thật lũy kế <small class="muted">· thu, chi và còn lại theo tháng</small></h3><div id="tt-ch" class="chart"></div></div>
    <div class="table-wrap"><table class="b-table tt-table">
      <thead>
        <tr><th rowspan="2">Công trình</th><th colspan="4" class="grp">THU (tiền về)</th><th colspan="4" class="grp f-sep">CHI (tiền ra)</th><th rowspan="2" class="num f-sep">Còn lại thực<br><small>thu − chi</small></th></tr>
        <tr><th class="num">Kế hoạch</th><th class="num">Thực thu</th><th>% KH</th><th class="num">Còn phải thu</th>
          <th class="num f-sep">Kế hoạch</th><th class="num">Thực chi</th><th>% KH</th><th class="num">Còn phải chi</th></tr>
      </thead>
      <tbody>${rows.map((x) => `<tr><td title="${esc(x.d.ten_du_an)}"><b>${esc(x.d.ma_du_an)}</b> <span class="muted small">${esc(x.d.ten_du_an)}</span></td>
        <td class="num">${bTy(x.kh_thu)}</td><td class="num strong">${bTy(x.thu)}</td><td class="f-pct">${meter(x.thu, x.kh_thu, BCOL.thu)}${bpct(x.thu, x.kh_thu)}</td><td class="num">${ty(x.phai_thu)}</td>
        <td class="num f-sep">${bTy(x.kh_chi)}</td><td class="num strong">${bTy(x.chi)}</td><td class="f-pct">${meter(x.chi, x.kh_chi, BCOL.chi)}${bpct(x.chi, x.kh_chi)}</td><td class="num">${ty(x.phai_chi)}</td>
        <td class="num strong f-sep ${x.con < 0 ? 'neg' : 'pos'}">${bTy(x.con)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Tổng cộng</td><td class="num">${bTy(T.kh_thu)}</td><td class="num">${bTy(T.thu)}</td><td>${bpct(T.thu, T.kh_thu)}</td><td class="num">${ty(T.phai_thu)}</td>
        <td class="num f-sep">${bTy(T.kh_chi)}</td><td class="num">${bTy(T.chi)}</td><td>${bpct(T.chi, T.kh_chi)}</td><td class="num">${ty(T.phai_chi)}</td>
        <td class="num f-sep ${T.con < 0 ? 'neg' : ''}">${bTy(T.con)}</td></tr></tfoot>
    </table></div>
    <p class="muted small f-note">Tỷ đồng, sau VAT · Thực chi = chi phí đã chi + thanh toán thầu phụ (gồm tạm ứng); không gồm tiền vay nhận về (${bTy(T.vay)} tỷ) và trả nợ gốc vay (${bTy(T.goc)} tỷ) vì đó là vay – trả nợ, không phải doanh thu / chi phí · Còn lại âm = đang bỏ tiền ra nhiều hơn tiền thu về · Kế hoạch theo hợp đồng chỉ để so sánh, không phải tiền thật.</p>
  </section>`;
}
// Bấm vào số -> bảng chi tiết: công thức, số từng công trình, các dòng tiền liên quan, nút tới tab nhập liệu
const TTD = {
  thu: { t: 'Thực thu (tiền về)', f: 'Tổng tiền đã thực về tài khoản: tạm ứng + thanh toán đợt + quyết toán (sau VAT)', cols: [['thu', 'Thực thu']], go: 'revenue', lines: 'tv' },
  kh_thu: { t: 'Kế hoạch thu', f: 'Giá trị HĐ + phụ lục (sau VAT); HĐ đã quyết toán lấy theo giá trị quyết toán', cols: [['kh_thu', 'Kế hoạch thu']], go: 'revenue' },
  chi: { t: 'Thực chi (tiền ra)', f: 'Chi phí đã chi (không gồm trả nợ gốc vay) + tiền đã trả thầu phụ (gồm tạm ứng), sau VAT', cols: [['cp', 'Chi phí đã chi'], ['tp', 'Đã trả thầu phụ'], ['chi', 'Thực chi']], go: 'cost' },
  cp: { t: 'Chi phí đã chi', f: 'Tổng các dòng chi phí (sau VAT), không gồm trả nợ gốc vay', cols: [['cp', 'Chi phí đã chi']], go: 'cost' },
  tp: { t: 'Đã trả thầu phụ', f: 'Tổng thanh toán cho thầu phụ: tạm ứng + thanh toán đợt + quyết toán (sau VAT)', cols: [['tp', 'Đã trả thầu phụ']], go: 'cost' },
  con: { t: 'Còn lại thực', f: 'Còn lại thực = Thực thu − Thực chi', cols: [['thu', 'Thực thu'], ['chi', 'Thực chi'], ['con', 'Còn lại thực']], go: 'revenue' },
  vay: { t: 'Tiền vay nhận về', f: 'Các dòng "Vay và trả nợ ngân hàng › Nhận tiền vay – giải ngân" – là tiền vào tài khoản nhưng phải trả lại, không phải doanh thu', cols: [['vay', 'Nhận tiền vay']], go: 'cost', lines: 'vay' },
  goc: { t: 'Đã trả nợ gốc vay', f: 'Các dòng "Vay và trả nợ ngân hàng › Trả nợ gốc" – là tiền ra để trả nợ, không tính vào chi phí', cols: [['goc', 'Trả nợ gốc']], go: 'cost', lines: 'goc' },
  sau_goc: { t: 'Còn lại sau vay & trả nợ', f: 'Sau vay & trả nợ = Còn lại thực + Tiền vay nhận về − Đã trả nợ gốc vay (= tiền thật đang có của công trình)', cols: [['con', 'Còn lại thực'], ['vay', 'Nhận tiền vay'], ['goc', 'Trả nợ gốc'], ['sau_goc', 'Sau vay & trả nợ']], go: 'cost' },
  du_no: { t: 'Dư nợ vay', f: 'Dư nợ vay = Tiền vay nhận về − Đã trả nợ gốc (số gốc còn phải trả ngân hàng)', cols: [['vay', 'Nhận tiền vay'], ['goc', 'Trả nợ gốc'], ['du_no', 'Dư nợ vay']], go: 'cost' },
  phai_thu: { t: 'Còn phải thu', f: 'Còn phải thu = Kế hoạch thu (HĐ + PL; đã QT theo QT, sau VAT) − Thực thu', cols: [['kh_thu', 'Kế hoạch thu'], ['thu', 'Thực thu'], ['phai_thu', 'Còn phải thu']], go: 'revenue' },
  phai_chi: { t: 'Còn phải chi', f: 'Còn phải chi = Kế hoạch chi − Thực chi. Kế hoạch chi = chi phí đã ghi nhận + giá trị HT/QT thầu phụ (sau VAT), nên phần lớn là thầu phụ còn phải trả.', cols: [['kh_chi', 'Kế hoạch chi'], ['chi', 'Thực chi'], ['phai_chi', 'Còn phải chi']], go: 'cost' },
  kh_con: { t: 'Còn lại khi hoàn tất theo kế hoạch', f: 'Còn lại khi hoàn tất = Kế hoạch thu − Kế hoạch chi (nếu thu, chi đúng kế hoạch theo HĐ)', cols: [['kh_thu', 'Kế hoạch thu'], ['kh_chi', 'Kế hoạch chi'], ['kh_con', 'Còn lại khi hoàn tất']], go: 'revenue' },
};
function bThucDrill(key) {
  const cfg = TTD[key];
  if (!cfg) return;
  const { list } = bScope();
  const P = bPeriod(list);
  const to = P.to < bNowYm() ? P.to : bNowYm();
  const rows = list.map((d) => { const x = bThuc(d, to); return { d, ...x, kh_con: x.kh_thu - x.kh_chi }; });
  const main = cfg.cols[cfg.cols.length - 1][0];
  rows.sort((a, b) => Math.abs(b[main]) - Math.abs(a[main]));
  const tot = Object.fromEntries(cfg.cols.map(([k]) => [k, rows.reduce((s2, x) => s2 + x[k], 0)]));
  const cell = (v) => `<td class="num ${v < 0 ? 'neg' : ''}">${bn(v)}</td>`;
  const inRange = (ngay) => (!ngay ? to >= bNowYm() : String(ngay).slice(0, 7) <= to);
  let lines = '';
  if (cfg.lines) {
    const loai = cfg.lines === 'vay' ? 'Không (tiền vay nhận về)' : 'Không (trả nợ gốc)';
    const L = list.flatMap((d) => (cfg.lines !== 'tv' ? d.chi_tiet.chi_phi.filter((r) => r.tinh_cp === loai).map((r) => ({ d, ngay: r.ngay, a: r.doi_tac, b: r.noi_dung, v: r.sau_vat }))
      : d.chi_tiet.tien_ve.map((r) => ({ d, ngay: r.ngay, a: r.hd, b: r.loai, v: r.so_tien }))).filter((x) => inRange(x.ngay)))
      .sort((a, b) => String(b.ngay || '').localeCompare(String(a.ngay || '')));
    lines = `<h4>${{ goc: 'Các lần trả nợ gốc', vay: 'Các lần nhận tiền vay', tv: 'Các lần tiền về' }[cfg.lines]} (${L.length})</h4>
      <div class="table-wrap tt-dl"><table class="b-table"><thead><tr><th>Ngày</th><th>Công trình</th><th>${cfg.lines === 'tv' ? 'Hợp đồng' : 'Ngân hàng'}</th><th>Nội dung</th><th class="num">Số tiền</th></tr></thead>
      <tbody>${L.slice(0, 300).map((x) => `<tr><td>${dmy(x.ngay) || '<span class="muted">chưa có ngày</span>'}</td><td><b>${esc(x.d.ma_du_an)}</b></td><td>${esc(x.a || '')}</td><td>${esc(x.b || '')}</td><td class="num">${bn(x.v)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const dlg = document.createElement('dialog');
  dlg.className = 'pass-dlg tt-dlg';
  dlg.innerHTML = `<div class="stack">
    <div class="tt-dlg-h"><h3>${cfg.t}</h3><button type="button" class="pc-x" data-x title="Đóng">×</button></div>
    <div class="tt-formula">${cfg.f}</div>
    <p class="muted small">Lũy kế đến hết ${ymTxt(to)} · đồng, sau VAT · ${list.length} công trình · bấm <b>Mở</b> để tới tab ${cfg.go === 'cost' ? 'Chi phí' : 'Doanh thu'} của công trình</p>
    <div class="table-wrap"><table class="b-table"><thead><tr><th>Công trình</th>${cfg.cols.map(([, h]) => `<th class="num">${h}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td><b>${esc(x.d.ma_du_an)}</b> <span class="muted small">${esc(x.d.ten_du_an)}</span></td>${cfg.cols.map(([k]) => cell(x[k])).join('')}
        <td><button type="button" class="sm" data-tgo="${cfg.go}" data-id="${x.d.id}">Mở</button></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Tổng cộng</td>${cfg.cols.map(([k]) => cell(tot[k])).join('')}<td></td></tr></tfoot></table></div>
    ${lines}
  </div>`;
  document.body.appendChild(dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-x]')) return close();
    const g = e.target.closest('[data-tgo]');
    if (g) { close(); revProjectId = Number(g.dataset.id); showTab(g.dataset.tgo); }
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

function bThucDraw(list) {
  const el = $('#tt-ch');
  if (!el) return;
  const P = bPeriod(list);
  const to = P.to < bNowYm() ? P.to : bNowYm();
  const m = {};
  for (const d of list) for (const [k, t] of Object.entries(d.tien_thuc?.thang || {})) if (k <= to) { const o = (m[k] ||= { thu: 0, chi: 0 }); o.thu += t.thu; o.chi += t.cp + t.tp; }
  const keys = Object.keys(m).sort();
  if (!keys.length) return bEmpty(el, 'Chưa có tiền về / tiền chi có ngày');
  const pts = [];
  let thu = 0, chi = 0;
  for (let k = keys[0]; k <= to; k = ymAdd(k, 1)) {
    const o = m[k] || { thu: 0, chi: 0 };
    thu += o.thu; chi += o.chi;
    pts.push({ k, label: `${k.slice(5)}/${k.slice(2, 4)}`, thu, chi, con: thu - chi });
  }
  if (to >= bNowYm()) { // dòng chưa nhập ngày: cộng vào điểm cuối để khớp bảng
    const last = pts[pts.length - 1];
    for (const d of list) { const u = d.tien_thuc?.chua_ngay || {}; last.thu += u.thu || 0; last.chi += (u.cp || 0) + (u.tp || 0); }
    last.con = last.thu - last.chi;
  }
  bLineChart(el, pts, [{ key: 'thu', name: 'Thực thu lũy kế', color: BCOL.thu }, { key: 'chi', name: 'Thực chi lũy kế', color: BCOL.chi }, { key: 'con', name: 'Còn lại thực', color: BCOL.dk }]);
}

function bFinHtml(list, v) {
  const P = bPeriod(list);
  const cur = bSumRange(list, v, P.from, P.to);
  const prv = P.prev ? bSumRange(list, v, P.prev.from, P.prev.to) : null;
  const bal = bBalance(list, P.to);
  const year = P.to.slice(0, 4);
  const ytd = bSumRange(list, v, `${year}-01`, P.to);
  const tg = (BC.muc_tieu || {})[year] || {};
  const S = (f) => list.reduce((a, d) => a + f(d), 0);
  const K = { dt: S((d) => d.du_kien.doanh_thu[v]), cp: S((d) => d.du_kien.chi_phi[v]) }; K.ln = K.dt - K.cp;
  const LK = { dt: S((d) => d.thuc_hien.doanh_thu[v]), cp: S((d) => d.thuc_hien.chi_phi[v]) }; LK.ln = LK.dt - LK.cp;
  const traGoc = S((d) => d.tra_goc.sv);
  const tyS = (x) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
  const tyN = (x) => `${bTy(x)} tỷ`;
  const anyTarget = ['dt', 'cp', 'ln', 'ty_suat'].some((k) => tg[k] !== null && tg[k] !== undefined);
  const vt = v === 'gt' ? 'trước VAT' : 'sau VAT';

  // ① Thẻ kết quả trong kỳ: số chính + so với kỳ trước + 1–2 dòng giải thích
  const card = (k, title, val, delta, lines) => `<div class="f-card f-${k}" title="${bn(val)} đ">
      <div class="f-body">
        <div class="f-title">${title}</div>
        <div class="f-val ${val < 0 ? 'neg' : ''}">${bTy(val)} <small>tỷ</small></div>
        ${delta || '<span class="f-delta muted">&nbsp;</span>'}
        <div class="f-lines">${lines.filter(Boolean).map((x) => `<div>${x}</div>`).join('')}</div>
      </div></div>`;
  const prevTxt = (x) => (prv ? `Kỳ trước: <b class="${x < 0 ? 'neg' : ''}">${tyN(x)}</b>` : '');

  // ② Bảng tiến độ: % có thanh đo
  const pctCell = (a, b, color) => {
    if (!b || b < 0 || a === null || a === undefined) return '<td class="num muted">—</td>';
    const p = a / b;
    return `<td class="f-pct"><span class="f-meter"><i style="width:${Math.max(0, Math.min(100, p * 100))}%;background:${p < 0 ? '#d92d35' : color}"></i></span><b class="${p < 0 ? 'neg' : ''}">${p < 0 ? '<0%' : (p * 100).toFixed(1).replace('.', ',') + '%'}</b></td>`;
  };
  const money = (x) => (x === null || x === undefined ? '<span class="muted">—</span>' : `<span class="${x < 0 ? 'neg' : ''}">${bTy(x)}</span>`);
  const tsK = K.dt ? K.ln / K.dt : 0, tsL = LK.dt ? LK.ln / LK.dt : 0, tsY = ytd.dt ? ytd.ln / ytd.dt : 0;
  const tRow = (name, color, k, lk, pk, t, y, pt) => `<tr><td><span class="f-dot" style="background:${color}"></span><b>${name}</b></td>
      <td class="num">${k}</td><td class="num">${lk}</td>${pk}<td class="num f-sep">${t}</td><td class="num">${y}</td>${pt}</tr>`;

  const prjCol = bPrjColors(list, v, P);
  const prjRows = list.map((d) => ({ d, ...bSumRange([d], v, P.from, P.to) }));
  const tot = prjRows.reduce((a, x) => ({ dt: a.dt + x.dt, cp: a.cp + x.cp, ln: a.ln + x.ln }), { dt: 0, cp: 0, ln: 0 });
  const undated = list.reduce((a, d) => a + d.thuc_hien.chua_ngay.dt + d.thuc_hien.chua_ngay.cp, 0);

  return `
  <section class="card b-sec f-sec">
    <div class="f-head">
      <h2>Tổng quan tài chính · ${esc(P.label)}</h2>
      <button type="button" class="f-range f-range-btn" data-kypick title="Bấm để chọn kỳ báo cáo">📅 ${P.range}${P.prev ? ` <span class="muted">· so với ${ymTxt(P.prev.from)}${P.prev.from !== P.prev.to ? ' – ' + ymTxt(P.prev.to) : ''}</span>` : ''} <span class="f-caret">▾</span></button>
    </div>

    <div class="f-tier"><span>1</span>Kết quả trong kỳ <small>${esc(P.label)} · tỷ đồng, ${vt} (dòng tiền sau VAT)</small></div>
    <div class="f-grid">
      ${card('dt', 'Doanh thu', cur.dt, bDelta(cur.dt, prv?.dt, true), ['Giá trị nghiệm thu trong kỳ', prevTxt(prv?.dt)])}
      ${card('cp', 'Chi phí', cur.cp, bDelta(cur.cp, prv?.cp, false), [`Bằng <b>${bpct(cur.cp, cur.dt)}</b> doanh thu kỳ`, prevTxt(prv?.cp)])}
      ${card('ln', 'Lợi nhuận', cur.ln, bDelta(cur.ln, prv?.ln, true), [`Tỷ suất lợi nhuận: <b class="${cur.ln < 0 ? 'neg' : ''}">${bpct(cur.ln, cur.dt)}</b>`, prevTxt(prv?.ln)])}
      ${card('dong', 'Dòng tiền thực tế', cur.dong_tien, bDelta(cur.dong_tien, prv?.dong_tien, true), [`Thu <b>${bTy(cur.thu)}</b> · Chi <b>${bTy(cur.chi)}</b>`, `Số dư cuối kỳ: <b class="${bal < 0 ? 'neg' : ''}">${tyN(bal)}</b>`])}
    </div>

    <div class="f-tier"><span>2</span>Tiến độ so với hợp đồng &amp; mục tiêu năm ${year}
      <small>tỷ đồng, ${vt}</small>${BC.la_quan_tri ? `<button type="button" class="sm no-print f-tier-btn" id="f-set-target">${anyTarget ? 'Sửa mục tiêu' : '+ Đặt mục tiêu năm'}</button>` : ''}</div>
    <div class="table-wrap"><table class="b-table f-prog">
      <thead>
        <tr><th rowspan="2">Chỉ tiêu</th><th colspan="3" class="grp">So với hợp đồng (toàn bộ thời gian)</th><th colspan="3" class="grp f-sep">Mục tiêu năm ${year}</th></tr>
        <tr><th class="num">Dự kiến theo HĐ</th><th class="num">Thực hiện lũy kế</th><th>% đạt</th><th class="num f-sep">Mục tiêu</th><th class="num">Thực hiện 01–${ymTxt(P.to < bNowYm() ? P.to : bNowYm()).slice(0, 2)}/${year}</th><th>% mục tiêu</th></tr>
      </thead>
      <tbody>
        ${tRow('Doanh thu', BCOL.dt, money(K.dt), money(LK.dt), pctCell(LK.dt, K.dt, BCOL.dt), money(tg.dt), money(ytd.dt), pctCell(ytd.dt, tg.dt, BCOL.dt))}
        ${tRow('Chi phí', BCOL.cp, money(K.cp), money(LK.cp), pctCell(LK.cp, K.cp, BCOL.cp), money(tg.cp), money(ytd.cp), pctCell(ytd.cp, tg.cp, BCOL.cp))}
        ${tRow('Lợi nhuận', BCOL.dk, money(K.ln), money(LK.ln), pctCell(LK.ln, K.ln > 0 ? K.ln : 0, BCOL.dk), money(tg.ln), money(ytd.ln), pctCell(ytd.ln, tg.ln, BCOL.dk))}
        ${tRow('Tỷ suất lợi nhuận', BCOL.ts, tyS(tsK), `<span class="${tsL < 0 ? 'neg' : ''}">${tyS(tsL)}</span>`, '<td class="num muted">—</td>',
          tg.ty_suat === null || tg.ty_suat === undefined ? '<span class="muted">—</span>' : `${Number(tg.ty_suat).toFixed(1).replace('.', ',')}%`, `<span class="${tsY < 0 ? 'neg' : ''}">${tyS(tsY)}</span>`, '<td class="num muted">—</td>')}
      </tbody>
    </table></div>
    <p class="muted small f-foot-note">Thực hiện lũy kế gồm cả các dòng chưa nhập ngày · Trả nợ gốc vay ${tyN(traGoc)} không tính vào chi phí${anyTarget ? '' : ' · Chưa đặt mục tiêu năm'}.</p>

    <div class="f-tier"><span>3</span>Biểu đồ doanh thu – chi phí <small>doanh thu, chi phí (cột) · lợi nhuận (đường) · rê chuột để xem số</small></div>
    <div class="f-box f-big" id="fz-box"><div id="fz-bar" class="fz-bar"></div><div id="f-ch-col" class="chart"></div>
      <p class="muted small fz-hint">Bấm vào cột hoặc lăn chuột lên trên biểu đồ để xem chi tiết hơn (Năm → Quý → Tháng → Ngày) · lăn xuống để thu gọn.</p></div>

    <div class="f-tier"><span>4</span>Cơ cấu theo công trình <small>trong kỳ · tỷ đồng</small></div>
    <div class="f-row2">
      <div class="f-box"><h3>Tỷ trọng doanh thu</h3><div id="f-ch-donut" class="chart"></div></div>
      <div class="f-box"><h3>Hiệu quả từng công trình</h3>
        <div class="table-wrap"><table class="b-table f-eff">
          <thead><tr><th>Công trình</th><th class="num">Doanh thu</th><th class="num">Chi phí</th><th class="num">Lợi nhuận</th><th class="num">Tỷ suất</th></tr></thead>
          <tbody>${prjRows.map((x, k) => `<tr><td title="${esc(x.d.ten_du_an)}"><span class="f-dot" style="background:${prjCol.get(x.d.id)}"></span><b>${esc(x.d.ma_du_an)}</b> <span class="muted small">${esc(x.d.ten_du_an)}</span></td>
            <td class="num">${bTy(x.dt)}</td><td class="num">${bTy(x.cp)}</td><td class="num strong ${x.ln < 0 ? 'neg' : 'pos'}">${bTy(x.ln)}</td><td class="num">${x.dt ? tyS(x.ln / x.dt) : '—'}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Tổng cộng</td><td class="num">${bTy(tot.dt)}</td><td class="num">${bTy(tot.cp)}</td><td class="num ${tot.ln < 0 ? 'neg' : ''}">${bTy(tot.ln)}</td><td class="num">${tot.dt ? tyS(tot.ln / tot.dt) : '—'}</td></tr></tfoot>
        </table></div></div>
    </div>
    <p class="muted small f-note">Số theo kỳ tính theo ngày phát sinh: doanh thu theo ngày nghiệm thu, chi phí theo ngày chứng từ / thanh toán thầu phụ, dòng tiền = tiền về − tiền chi.${undated ? ` <b class="warn-text">${undated} dòng chưa nhập ngày</b> không thuộc kỳ nào (xem Cảnh báo).` : ''}</p>
  </section>`;
}

// Số liệu Tổng quan tài chính theo kỳ (dùng chung cho xuất Excel / PowerPoint)
function bFinData(list, v) {
  const P = bPeriod(list);
  const cur = bSumRange(list, v, P.from, P.to);
  const prv = P.prev ? bSumRange(list, v, P.prev.from, P.prev.to) : null;
  const year = P.to.slice(0, 4);
  const ytd = bSumRange(list, v, `${year}-01`, P.to);
  const tg = (BC.muc_tieu || {})[year] || {};
  const prjCol = bPrjColors(list, v, P);
  const rows = list.map((d) => ({ d, color: prjCol.get(d.id), ...bSumRange([d], v, P.from, P.to) }));
  return { P, cur, prv, year, ytd, tg, bal: bBalance(list, P.to), series: bSeries(list, v, P), rows };
}

function bFinDraw(list, v) {
  const P = bPeriod(list);
  bZoomDraw(list, v, P);
  const prjCol = bPrjColors(list, v, P);
  const items = list.map((d) => ({ label: d.ma_du_an, sub: d.ten_du_an, val: bSumRange([d], v, P.from, P.to).dt, color: prjCol.get(d.id) }));
  bDonut($('#f-ch-donut'), items);
}

// ---------------------------------------------------------------------
// Biểu đồ Doanh thu – Chi phí: xem theo Năm / Quý / Tháng / Ngày.
// Phóng to: bấm cột hoặc lăn chuột lên (vào đúng cột đang trỏ); thu nhỏ: lăn xuống hoặc bấm mốc phía trên.
// Số liệu lấy theo ngày phát sinh (thuc_hien.ngay) nên mọi cấp đều cộng khớp với tổng theo tháng.
// ---------------------------------------------------------------------
const ZLV = ['nam', 'quy', 'thang', 'ngay'];
const ZTXT = { nam: 'Năm', quy: 'Quý', thang: 'Tháng', ngay: 'Ngày' };
const ZNGAY_MAX = 186; // tối đa số ngày cho phép xem theo ngày (tránh cột quá mảnh)
let FZ = null;         // { key, lv, from, to, stack: [{ lv, from, to, label }], label }
const zD = (s) => new Date(s + 'T00:00:00Z');
const zS = (d) => d.toISOString().slice(0, 10);
const zDays = (a, b) => Math.round((zD(b) - zD(a)) / 864e5) + 1;
const zDmy = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
function zToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()); }
function zAuto(from, to) {
  const n = zDays(from, to);
  return n <= 62 ? 'ngay' : n <= 400 ? 'thang' : n <= 1500 ? 'quy' : 'nam';
}
// Khoảng [a, b] của nhóm chứa ngày s theo cấp lv
function zBucket(s, lv) {
  const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7));
  const yy = String(y).slice(2);
  if (lv === 'nam') return { k: `${y}`, a: `${y}-01-01`, b: `${y}-12-31`, label: `${y}`, title: `Năm ${y}` };
  if (lv === 'quy') {
    const q = Math.floor((m - 1) / 3), m1 = q * 3 + 1;
    const a = `${y}-${String(m1).padStart(2, '0')}-01`;
    const b = zS(new Date(Date.UTC(y, m1 + 2, 0)));
    return { k: `${y}-Q${q + 1}`, a, b, label: `Q${q + 1}/${yy}`, title: `Quý ${ROMAN_Q[q]}/${y}` };
  }
  if (lv === 'thang') {
    const ym = s.slice(0, 7);
    return { k: ym, a: `${ym}-01`, b: `${ym}-${String(lastDay(ym)).padStart(2, '0')}`, label: `T${m}/${yy}`, title: `Tháng ${ymTxt(ym)}` };
  }
  return { k: s, a: s, b: s, label: `${s.slice(8, 10)}/${s.slice(5, 7)}`, title: zDmy(s) };
}
function zSeries(list, v, lv, from, to) {
  const out = [], idx = {};
  for (let s = from; s <= to;) {
    const B = zBucket(s, lv);
    const it = { ...B, a: B.a < from ? from : B.a, b: B.b > to ? to : B.b, dt: 0, cp: 0 };
    idx[B.k] = it; out.push(it);
    const nx = zD(B.b); nx.setUTCDate(nx.getUTCDate() + 1); s = zS(nx);
  }
  for (const d of list) {
    for (const [k, t] of Object.entries(d.thuc_hien.ngay || {})) {
      if (k < from || k > to) continue;
      const it = idx[zBucket(k, lv).k];
      if (it) { it.dt += t['dt_' + v]; it.cp += t['cp_' + v]; }
    }
  }
  out.forEach((it) => { it.ln = it.dt - it.cp; });
  // Bỏ các mốc tương lai chưa có số liệu
  const today = zToday();
  while (out.length > 1 && out[out.length - 1].a > today && !out[out.length - 1].dt && !out[out.length - 1].cp) out.pop();
  return out;
}
function bZoomDraw(list, v, P) {
  const key = `${BST.project}|${BST.ky}|${BST.tu}|${BST.den}`;
  if (!FZ || FZ.key !== key) {
    const from = `${P.from}-01`, to = `${P.to}-${String(lastDay(P.to)).padStart(2, '0')}`;
    FZ = { key, lv: zAuto(from, to), from, to, stack: [], label: P.label };
  }
  const el = $('#f-ch-col'), bar = $('#fz-bar'), box = $('#fz-box');
  if (!el || !bar) return;
  const n = zDays(FZ.from, FZ.to);
  if (FZ.lv === 'ngay' && n > ZNGAY_MAX) FZ.lv = 'thang';
  const pts = zSeries(list, v, FZ.lv, FZ.from, FZ.to);
  const canIn = FZ.lv !== 'ngay';
  const crumbs = [...FZ.stack.map((s, i) => `<button type="button" class="link" data-zc="${i}">${esc(s.label)}</button><span class="fz-sep">›</span>`), `<b>${esc(FZ.label)}</b>`].join('');
  bar.innerHTML = `
    <div class="fz-crumb">${FZ.stack.length ? '<button type="button" class="fz-back" data-zb="1" title="Trở lại mức trước">‹ Trở lại</button>' : ''}${crumbs}
      <span class="muted small">· ${zDmy(FZ.from)} – ${zDmy(FZ.to)}</span></div>
    <div class="fz-ctl">
      <div class="seg" role="group" aria-label="Xem theo">${ZLV.map((l) => `<button type="button" data-zl="${l}" class="${FZ.lv === l ? 'on' : ''}" ${l === 'ngay' && n > ZNGAY_MAX ? `disabled title="Khoảng thời gian dài hơn ${ZNGAY_MAX} ngày – chọn một tháng/quý để xem theo ngày"` : ''}>${ZTXT[l]}</button>`).join('')}</div>
      <span class="fz-range"><input type="date" id="fz-tu" value="${FZ.from}" aria-label="Từ ngày"> – <input type="date" id="fz-den" value="${FZ.to}" aria-label="Đến ngày"></span>
    </div>`;
  bColChart(el, pts, [{ key: 'dt', name: 'Doanh thu', color: BCOL.dt }, { key: 'cp', name: 'Chi phí', color: BCOL.cp }],
    { line: { key: 'ln', name: 'Lợi nhuận', color: BCOL.dk }, tipExtra: (p) => `<tr class="sum"><td>Tỷ suất LN</td><td>${bpct(p.ln, p.dt)}</td></tr>${canIn ? `<tr><td colspan="2" class="muted">Bấm / lăn lên để xem theo ${ZTXT[ZLV[ZLV.indexOf(FZ.lv) + 1]].toLowerCase()}</td></tr>` : ''}`,
      height: 320, maxBar: 34, onPick: canIn ? (p) => zIn(p) : null });
  const redraw = () => bZoomDraw(list, v, P);
  const zIn = (p) => {
    if (FZ.lv === 'ngay') return false;
    FZ.stack.push({ lv: FZ.lv, from: FZ.from, to: FZ.to, label: FZ.label });
    Object.assign(FZ, { lv: ZLV[ZLV.indexOf(FZ.lv) + 1], from: p.a, to: p.b, label: p.title, custom: false });
    redraw(); return true;
  };
  const zOut = () => {
    if (FZ.stack.length) { Object.assign(FZ, FZ.stack.pop(), { custom: false }); redraw(); return true; }
    const i = ZLV.indexOf(FZ.lv);
    if (i > 0) { FZ.lv = ZLV[i - 1]; redraw(); return true; }
    return false;
  };
  let busy = 0;
  el.onwheel = (e) => {
    if (!e.deltaY) return;
    const p = e.target.__zp;
    const can = e.deltaY < 0 ? (FZ.lv !== 'ngay' && p) : (FZ.stack.length || FZ.lv !== 'nam');
    if (!can) return;            // không đổi được mức -> để trang cuộn bình thường
    e.preventDefault();
    if (Date.now() - busy < 400) return; // chống trượt nhiều nấc do touchpad
    busy = Date.now();
    hideTip();
    if (e.deltaY < 0) zIn(p); else zOut();
  };
  bar.onclick = (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.zb) return zOut();
    if (b.dataset.zc !== undefined) { const i = Number(b.dataset.zc); Object.assign(FZ, FZ.stack[i], { custom: false }); FZ.stack = FZ.stack.slice(0, i); return redraw(); }
    if (b.dataset.zl) { FZ.lv = b.dataset.zl; redraw(); }
  };
  bar.onchange = () => {
    let a = $('#fz-tu').value, b = $('#fz-den').value;
    if (!a || !b) return;
    if (a > b) [a, b] = [b, a];
    if (!FZ.custom) FZ.stack.push({ lv: FZ.lv, from: FZ.from, to: FZ.to, label: FZ.label }); // sửa tiếp khoảng tùy chọn -> không thêm mốc
    FZ.custom = true;
    Object.assign(FZ, { from: a, to: b, lv: zAuto(a, b), label: a === b ? zDmy(a) : 'Khoảng tùy chọn' });
    redraw();
  };
  if (box) box.classList.toggle('fz-can', canIn);
}

// Biểu đồ tròn (vành khuyên) – màu theo thứ tự công trình
function bDonut(el, all) {
  const pos = all.filter((x) => x.val > 0).sort((a, b) => b.val - a.val);
  if (!pos.length) return bEmpty(el, 'Chưa có doanh thu trong kỳ');
  let items = pos;
  if (pos.length > 7) { const rest = pos.slice(6); items = [...pos.slice(0, 6), { label: 'Khác', sub: `${rest.length} công trình`, val: rest.reduce((s, x) => s + x.val, 0), color: KHAC_COLOR }]; }
  const total = items.reduce((s, x) => s + x.val, 0);
  const S = 200, R = 92, r0 = 56, c = S / 2;
  el.innerHTML = '<div class="pie-wrap f-donut"></div>';
  const wrap = el.firstChild;
  const svg = svgEl('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S, role: 'img', 'aria-label': 'Cơ cấu doanh thu theo công trình' }, wrap);
  let a = 0;
  const pt = (ang, rr) => [c + rr * Math.sin(ang), c - rr * Math.cos(ang)];
  for (const x of items) {
    let a1 = a + (x.val / total) * Math.PI * 2;
    if (a1 - a >= Math.PI * 2 - 1e-9) a1 = a + Math.PI * 2 - 1e-4;
    const big = a1 - a > Math.PI ? 1 : 0;
    const [x0, y0] = pt(a, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r0), [x3, y3] = pt(a, r0);
    const path = svgEl('path', { d: `M${x0},${y0}A${R},${R} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${big} 0 ${x3},${y3}Z`, fill: x.color, stroke: '#fff', 'stroke-width': items.length > 1 ? 2 : 0 }, svg);
    path.addEventListener('mousemove', (e) => showTip(`<b>${esc(x.label)}</b> ${esc(x.sub || '')}<br>${bn(x.val)} đ · <b>${bpct(x.val, total)}</b>`, e.clientX, e.clientY));
    path.addEventListener('mouseleave', hideTip);
    const mid = (a + a1) / 2;
    if (x.val / total >= 0.06) { const [lx, ly] = pt(mid, (R + r0) / 2); svgEl('text', { x: lx, y: ly + 4, 'text-anchor': 'middle', class: 'f-donut-pct' }, svg).textContent = Math.round((x.val / total) * 100) + '%'; }
    a = a1;
  }
  svgEl('text', { x: c, y: c - 2, 'text-anchor': 'middle', class: 'pie-c1' }, svg).textContent = bTy(total).replace(/,00$/, '');
  svgEl('text', { x: c, y: c + 16, 'text-anchor': 'middle', class: 'pie-c2' }, svg).textContent = 'tỷ đồng';
  const ul = document.createElement('ul');
  ul.className = 'pie-legend';
  ul.innerHTML = items.map((x) => `<li><i style="background:${x.color}"></i><span class="nm" title="${esc(x.sub || '')}">${esc(x.label)}<br><small class="muted">${bTy(x.val)} tỷ</small></span><b>${bpct(x.val, total)}</b></li>`).join('');
  wrap.appendChild(ul);
}

// Hộp thoại đặt mục tiêu năm (Quản trị)
// Bảng chọn kỳ (bấm vào ô khoảng ngày): chọn nhanh hoặc từ tháng – đến tháng
function bKyPopover(btn) {
  $('.ky-pop')?.remove();
  const P = bPeriod(bScope().list);
  const pop = document.createElement('div');
  pop.className = 'ky-pop';
  pop.innerHTML = `<div class="ky-pop-h">Chọn kỳ báo cáo</div>
    <div class="ky-quick">${KY_OPTS.filter(([k]) => k !== 'tuychon').map(([k, t]) => `<button type="button" data-kq="${k}" class="${BST.ky === k ? 'on' : ''}">${t.replace(' (All time)', '')}</button>`).join('')}</div>
    <div class="ky-pop-h">Hoặc chọn khoảng tháng</div>
    <div class="ky-range"><label>Từ tháng<input type="month" data-kf="tu" value="${P.from}"></label><label>Đến tháng<input type="month" data-kf="den" value="${P.to}"></label></div>
    <div class="msg" role="alert"></div>
    <div class="ky-pop-a"><button type="button" data-kx>Đóng</button><button type="button" class="primary" data-ka>Áp dụng</button></div>
    <div class="muted small">Số liệu tổng hợp theo tháng: từ ngày 01 của tháng đầu đến ngày cuối của tháng cuối.</div>`;
  document.body.appendChild(pop);
  const r = btn.getBoundingClientRect();
  pop.style.top = `${window.scrollY + r.bottom + 6}px`;
  pop.style.left = `${Math.max(8, Math.min(window.scrollX + r.right - pop.offsetWidth, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8))}px`;
  const close = () => { pop.remove(); document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc_); };
  const outside = (e) => { if (!pop.contains(e.target) && !e.target.closest('[data-kypick]')) close(); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  setTimeout(() => { document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', esc_); });
  pop.addEventListener('click', (e) => {
    const q = e.target.closest('[data-kq]');
    if (q) { BST.ky = q.dataset.kq; bSave(); close(); return renderReport(); }
    if (e.target.closest('[data-kx]')) return close();
    if (e.target.closest('[data-ka]')) {
      const tu = $('[data-kf=tu]', pop).value, den = $('[data-kf=den]', pop).value;
      if (!tu || !den) return showMsg($('.msg', pop), 'Chọn đủ từ tháng và đến tháng', 'err');
      if (tu > den) return showMsg($('.msg', pop), 'Từ tháng phải trước hoặc bằng đến tháng', 'err');
      Object.assign(BST, { ky: 'tuychon', tu, den });
      bSave(); close(); renderReport();
    }
  });
}

function bTargetDialog() {
  const year = bPeriod(BC.du_an).to.slice(0, 4);
  const t = (BC.muc_tieu || {})[year] || {};
  const dlg = document.createElement('dialog');
  dlg.className = 'pass-dlg f-dlg';
  const mv = (x) => (x === null || x === undefined ? '' : bf.format(x));
  dlg.innerHTML = `<form method="dialog" class="stack">
    <h3>Mục tiêu năm</h3>
    <label>Năm<input name="nam" type="number" min="2000" max="2100" value="${year}" required></label>
    <label>Doanh thu (đồng)<input name="dt" class="money" value="${mv(t.dt)}" placeholder="Để trống = chưa đặt"></label>
    <label>Chi phí (đồng)<input name="cp" class="money" value="${mv(t.cp)}" placeholder="Để trống = chưa đặt"></label>
    <label>Lợi nhuận (đồng)<input name="ln" class="money" value="${mv(t.ln)}" placeholder="Để trống = chưa đặt"></label>
    <label>Tỷ suất lợi nhuận (%)<input name="ty_suat" inputmode="decimal" value="${t.ty_suat ?? ''}" placeholder="vd 24"></label>
    <p class="muted small">So sánh với số thực hiện lũy kế trong năm, cơ sở ${BST.vat === 'gt' ? 'trước VAT' : 'sau VAT'} như đang chọn. Để trống tất cả = xóa mục tiêu năm.</p>
    <div class="msg" role="alert"></div>
    <div class="actions"><button type="submit" class="primary" value="ok">Lưu</button><button type="button" data-x>Hủy</button></div>
  </form>`;
  document.body.appendChild(dlg);
  const f = $('form', dlg);
  $$('input.money', f).forEach(attachMoneyInput);
  f.elements.nam.addEventListener('change', () => {
    const t2 = (BC.muc_tieu || {})[f.elements.nam.value] || {};
    f.elements.dt.value = mv(t2.dt); f.elements.cp.value = mv(t2.cp); f.elements.ln.value = mv(t2.ln); f.elements.ty_suat.value = t2.ty_suat ?? '';
  });
  $('[data-x]', f).addEventListener('click', () => { dlg.close(); dlg.remove(); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      BC.muc_tieu = await api('/api/muc-tieu', { method: 'PUT', body: JSON.stringify({
        nam: f.elements.nam.value, dt: parseMoney(f.elements.dt.value), cp: parseMoney(f.elements.cp.value), ln: parseMoney(f.elements.ln.value), ty_suat: f.elements.ty_suat.value }) });
      dlg.close(); dlg.remove();
      renderReport();
    } catch (err) { showMsg($('.msg', f), err.message, 'err'); }
  });
  dlg.showModal();
}

// ---------------------------------------------------------------------
// Biểu đồ SVG dùng chung (tooltip: showTip/hideTip của app.js)
// ---------------------------------------------------------------------
function bAxis(min, max) { return niceTicks(Math.min(0, min), Math.max(0, max)); }
function bLegend(svg, items, x0) {
  let x = x0;
  items.forEach(([t, c, isLine]) => {
    if (isLine) { svgEl('line', { x1: x - 2, x2: x + 14, y1: 10, y2: 10, stroke: c, 'stroke-width': 2.5 }, svg); svgEl('circle', { cx: x + 6, cy: 10, r: 3.5, fill: c, stroke: '#fff', 'stroke-width': 1.5 }, svg); }
    else svgEl('rect', { x, y: 4, width: 12, height: 12, rx: 3, fill: c }, svg);
    svgEl('text', { x: x + 18, y: 14, class: 'ax-lbl strong' }, svg).textContent = t;
    x += 30 + t.length * 6.6;
  });
}
function bEmpty(el, text) { el.innerHTML = `<div class="chart-empty">${text}</div>`; }

// Đường lũy kế
function bLineChart(el, pts, series) {
  if (!pts.length) return bEmpty(el, 'Chưa có số liệu có ngày');
  el.innerHTML = '';
  const W = Math.max(320, el.clientWidth || 600), H = 260, pad = { l: 62, r: 70, t: 28, b: 30 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const ticks = bAxis(Math.min(...pts.flatMap((p) => series.map((s) => p[s.key]))), Math.max(...pts.flatMap((p) => series.map((s) => p[s.key]))));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = (i) => pad.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const Y = (v) => pad.t + ih - ((v - y0) / (y1 - y0)) * ih;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': series.map((s) => s.name).join(', ') }, el);
  bLegend(svg, series.map((s) => [s.name, s.color]), pad.l);
  for (const t of ticks) {
    svgEl('line', { x1: pad.l, x2: W - pad.r, y1: Y(t), y2: Y(t), class: t === 0 ? 'ax-base' : 'ax-grid' }, svg);
    svgEl('text', { x: pad.l - 8, y: Y(t) + 4, 'text-anchor': 'end', class: 'ax-lbl' }, svg).textContent = shortMoney(t);
  }
  const every = Math.ceil(pts.length / Math.max(1, Math.floor(iw / 56)));
  pts.forEach((p, i) => {
    const last = pts.length - 1;
    if (i !== last && (i % every || X(last) - X(i) < 50)) return;
    svgEl('text', { x: X(i), y: H - 10, 'text-anchor': 'middle', class: 'ax-lbl' }, svg).textContent = p.label;
  });
  const endY = [];
  for (const s of series) {
    svgEl('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[s.key]).toFixed(1)}`).join(''), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    let y = Y(pts[pts.length - 1][s.key]);
    for (const e of endY) if (Math.abs(e - y) < 13) y = e + (y >= e ? 13 : -13);
    endY.push(y);
    svgEl('text', { x: X(pts.length - 1) + 8, y: y + 4, class: 'ax-lbl strong' }, svg).textContent = shortMoney(pts[pts.length - 1][s.key]);
  }
  const cross = svgEl('line', { y1: pad.t, y2: pad.t + ih, class: 'ax-cross', visibility: 'hidden' }, svg);
  const hit = svgEl('rect', { x: pad.l - 8, y: pad.t, width: iw + 16, height: ih, fill: 'transparent' }, svg);
  hit.addEventListener('mousemove', (e) => {
    const r = svg.getBoundingClientRect();
    const sx = (e.clientX - r.left) * (W / r.width);
    const i = pts.length === 1 ? 0 : Math.max(0, Math.min(pts.length - 1, Math.round(((sx - pad.l) / iw) * (pts.length - 1))));
    cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
    showTip(`<b>Tháng ${pts[i].label}</b><table>${series.map((s) => `<tr><td><i style="background:${s.color}"></i>${s.name}</td><td>${bn(pts[i][s.key])}</td></tr>`).join('')}</table>`, e.clientX, e.clientY);
  });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('visibility', 'hidden'); hideTip(); });
}

// Cột đứng nhóm theo tháng (dòng tiền)
function bColChart(el, pts, series, opt = {}) {
  if (!pts.length) return bEmpty(el, 'Chưa có số liệu có ngày');
  if (pts.every((p) => series.every((s) => !p[s.key]))) return bEmpty(el, 'Không có số liệu trong kỳ');
  el.innerHTML = '';
  const W = Math.max(320, el.clientWidth || 600), H = opt.height || 260, pad = { l: 62, r: 16, t: 28, b: 30 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const all = opt.line ? [...series, opt.line] : series;
  const vals = pts.flatMap((p) => all.map((s) => p[s.key]));
  const ticks = bAxis(Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const Y = (v) => pad.t + ih - ((v - y0) / (y1 - y0)) * ih;
  const slot = iw / pts.length, bw = Math.max(2, Math.min(opt.maxBar || 18, (slot * 0.72) / series.length - 2));
  const showVal = opt.valueLabels === 'auto' ? bw >= 20 : opt.valueLabels;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': series.map((s) => s.name).join(', ') }, el);
  bLegend(svg, [...series.map((s) => [s.name, s.color]), ...(opt.line ? [[opt.line.name, opt.line.color, true]] : [])], pad.l);
  for (const t of ticks) {
    svgEl('line', { x1: pad.l, x2: W - pad.r, y1: Y(t), y2: Y(t), class: t === 0 ? 'ax-base' : 'ax-grid' }, svg);
    svgEl('text', { x: pad.l - 8, y: Y(t) + 4, 'text-anchor': 'end', class: 'ax-lbl' }, svg).textContent = shortMoney(t);
  }
  const every = Math.ceil(pts.length / Math.max(1, Math.floor(iw / 56)));
  const hits = [];
  pts.forEach((p, i) => {
    const cx = pad.l + slot * i + slot / 2;
    series.forEach((s, j) => {
      const v = p[s.key], x = cx - (series.length * (bw + 2)) / 2 + j * (bw + 2);
      const ya = Y(Math.max(0, v)), yb = Y(Math.min(0, v));
      svgEl('rect', { x, y: ya, width: bw, height: Math.max(v ? 1 : 0, yb - ya), rx: Math.min(3, bw / 2), fill: s.color }, svg);
      if (showVal && v) svgEl('text', { x: x + bw / 2, y: v >= 0 ? ya - 5 : yb + 12, 'text-anchor': 'middle', class: 'bar-val' }, svg).textContent = (v / 1e9).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    });
    if (!(i % every)) svgEl('text', { x: cx, y: H - 10, 'text-anchor': 'middle', class: 'ax-lbl' }, svg).textContent = p.label;
    hits.push([p, i]);
  });
  if (opt.line) {
    const L = opt.line, cx = (i) => pad.l + slot * i + slot / 2;
    svgEl('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${Y(p[L.key]).toFixed(1)}`).join(''), fill: 'none', stroke: L.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
    pts.forEach((p, i) => svgEl('circle', { cx: cx(i), cy: Y(p[L.key]), r: 4, fill: p[L.key] < 0 ? '#d92d35' : L.color, stroke: '#fff', 'stroke-width': 2 }, svg));
  }
  for (const [p, i] of hits) {
    const hit = svgEl('rect', { x: pad.l + slot * i, y: pad.t, width: slot, height: ih, fill: 'transparent' }, svg);
    hit.__zp = p;
    if (opt.onPick) { hit.style.cursor = 'zoom-in'; hit.addEventListener('click', () => { hideTip(); opt.onPick(p); }); }
    hit.addEventListener('mousemove', (e) => showTip(`<b>${p.title || p.label}</b><table>${all.map((s) => `<tr><td><i style="background:${s.color}"></i>${s.name}</td><td class="${p[s.key] < 0 ? 'neg' : ''}">${bn(p[s.key])}</td></tr>`).join('')}
      ${opt.tipExtra ? opt.tipExtra(p) : ''}</table>`, e.clientX, e.clientY));
    hit.addEventListener('mouseleave', hideTip);
  }
}

// Thanh ngang (1 hoặc nhiều chuỗi), hỗ trợ số âm
function bBarH(el, items, series, { pctOf } = {}) {
  if (!items.length) return bEmpty(el, 'Chưa có số liệu');
  el.innerHTML = '';
  const rowH = series.length > 1 ? 30 : 24;
  const W = Math.max(320, el.clientWidth || 600), labelW = Math.min(230, W * 0.36), pad = { t: series.length > 1 ? 26 : 6, r: 84 };
  const H = pad.t + items.length * rowH + 22;
  const vals = items.flatMap((it) => it.values);
  const ticks = bAxis(Math.min(...vals), Math.max(...vals));
  const x0 = ticks[0], x1 = ticks[ticks.length - 1], iw = W - labelW - pad.r;
  const X = (v) => labelW + ((v - x0) / (x1 - x0)) * iw;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img' }, el);
  if (series.length > 1) bLegend(svg, series.map((s) => [s.name, s.color]), labelW);
  for (const t of ticks) {
    svgEl('line', { x1: X(t), x2: X(t), y1: pad.t, y2: H - 20, class: t === 0 ? 'ax-base' : 'ax-grid' }, svg);
    svgEl('text', { x: X(t), y: H - 6, 'text-anchor': 'middle', class: 'ax-lbl' }, svg).textContent = shortMoney(t);
  }
  const bh = series.length > 1 ? 10 : 14;
  items.forEach((it, i) => {
    const y = pad.t + i * rowH;
    const lab = svgEl('text', { x: labelW - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'ax-lbl strong' }, svg);
    const maxCh = Math.max(8, Math.floor((labelW - 16) / 7.2));
    lab.textContent = it.label.length > maxCh ? it.label.slice(0, maxCh - 1) + '…' : it.label;
    it.values.forEach((v, j) => {
      const by = y + (rowH - series.length * (bh + 2)) / 2 + j * (bh + 2);
      const xa = X(Math.min(0, v)), xb = X(Math.max(0, v));
      svgEl('rect', { x: xa, y: by, width: Math.max(v ? 1 : 0, xb - xa), height: bh, rx: 3, fill: series[j].color }, svg);
      if (series.length === 1) svgEl('text', { x: xb + 6, y: by + bh - 2, class: 'ax-lbl' }, svg).textContent = shortMoney(v) + (pctOf ? ` · ${bpct(v, pctOf)}` : '');
    });
    const hit = svgEl('rect', { x: 0, y, width: W, height: rowH, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => showTip(`<b>${esc(it.label)}</b><table>${series.map((s, j) => `<tr><td><i style="background:${s.color}"></i>${s.name}</td><td class="${it.values[j] < 0 ? 'neg' : ''}">${bn(it.values[j])}</td>${pctOf ? `<td>${bpct(it.values[j], pctOf)}</td>` : ''}</tr>`).join('')}</table>`, e.clientX, e.clientY));
    hit.addEventListener('mouseleave', hideTip);
  });
}

// ---------------------------------------------------------------------
// Dựng báo cáo
// ---------------------------------------------------------------------
function renderReport() {
  const sel = $('#b-project');
  if (!BC.du_an.some((d) => d.id === Number(BST.project))) BST.project = '';
  sel.innerHTML = `<option value="">Tất cả dự án (${BC.du_an.length})</option>` + BC.du_an.map((d) => `<option value="${d.id}">${esc(d.ma_du_an)} – ${esc(d.ten_du_an)}</option>`).join('');
  sel.value = BST.project;
  $$('#b-vat button').forEach((b) => b.classList.toggle('on', b.dataset.v === BST.vat));
  $('#b-ky').value = BST.ky;
  $('#b-ky-custom').hidden = BST.ky !== 'tuychon';
  { const P0 = bPeriod(BC.du_an); $('#b-tu').value = P0.from; $('#b-den').value = P0.to; }

  const { list, one } = bScope();
  const v = BST.vat, vt = v === 'gt' ? 'trước VAT' : 'sau VAT';
  const T = bTotals(list);
  const lnDk = T.dk.dt[v] - T.dk.cp[v], lnTh = T.th.dt[v] - T.th.cp[v];
  const lap = new Date(BC.lap_luc);
  const scope = one ? `${one.ma_du_an} – ${one.ten_du_an}` : `Tất cả dự án (${list.length})`;
  const warnN = list.reduce((s2, d) => s2 + d.canh_bao.length, 0);

  const kpi = (label, val, sub, cls = '') => `<div class="b-kpi ${cls}"><div class="label">${label}</div><div class="value">${bm(val)}</div><div class="sub">${sub}</div></div>`;
  const projRows = (f) => list.map(f).join('');

  $('#b-report').innerHTML = `
  <div class="card b-head">
    <div class="b-brand"><img src="/img/logo-icon.png" alt=""><div>
      <div class="b-company">${esc(BC.ten_cong_ty || '')}</div>
      <h1>BÁO CÁO TỔNG QUAN TÀI CHÍNH DỰ ÁN</h1>
      <div class="b-tag">Theo dõi nhanh hiệu quả kinh doanh và tình hình tài chính</div>
      <div class="b-meta">Phạm vi: <b>${esc(scope)}</b> · Đơn vị: VNĐ (${vt} trừ khi ghi khác) · Lập lúc ${lap.toLocaleString('vi-VN')} · Người lập: ${esc(BC.nguoi_lap)} · ${esc(BC.phien_ban)}</div>
    </div></div>
  </div>

  ${bFinHtml(list, v)}

  ${bThucHtml(list)}

  ${bPcSection(list, v)}

  <div class="card b-detail-bar">
    <div><b>Phân tích chi tiết</b> <span class="muted small">(I → ${one ? 'IV' : 'V'}: tổng quan theo hợp đồng, biểu đồ, ${one ? '' : 'tổng hợp dự án, '}chi tiết từng dự án, cảnh báo${warnN ? ` – <b class="warn-text">${warnN} cảnh báo</b>` : ''})</span></div>
    <button type="button" class="${BST.chi_tiet ? '' : 'primary'}" id="b-detail-toggle">${BST.chi_tiet ? 'Ẩn chi tiết ▴' : 'Hiện chi tiết ▾'}</button>
  </div>
  <div id="b-detail" class="b-detail" ${BST.chi_tiet ? '' : 'hidden'}>
  <section class="card b-sec">
    <h2>I. Tổng quan theo hợp đồng</h2>
    <p class="b-count">${T.so_da} dự án · ${T.so_hd} HĐ chủ đầu tư (${T.so_hd_qt} đã quyết toán) · ${T.so_tp} HĐ thầu phụ (${T.so_tp_qt} đã quyết toán)</p>
    <div class="b-kpi-grid">
      <div class="b-rowlab">Dự kiến<small>theo hợp đồng</small></div>
      ${kpi('Doanh thu', T.dk.dt[v], `HĐ + PL; đã QT theo quyết toán`)}
      ${kpi('Chi phí', T.dk.cp[v], `${bpct(T.dk.cp[v], T.dk.dt[v])} doanh thu`)}
      ${kpi('Lợi nhuận', lnDk, `Tỷ suất ${bpct(lnDk, T.dk.dt[v])}`, lnDk < 0 ? 'bad' : 'good')}
      <div class="b-rowlab">Thực hiện<small>đến hiện tại</small></div>
      ${kpi('Doanh thu', T.th.dt[v], `Đã nghiệm thu · đạt ${bpct(T.th.dt[v], T.dk.dt[v])} dự kiến`)}
      ${kpi('Chi phí', T.th.cp[v], `${bpct(T.th.cp[v], T.th.dt[v])} doanh thu`)}
      ${kpi('Lợi nhuận', lnTh, `Tỷ suất ${bpct(lnTh, T.th.dt[v])}`, lnTh < 0 ? 'bad' : 'good')}
      <div class="b-rowlab">Dòng tiền & công nợ<small>sau VAT</small></div>
      ${kpi('Tiền về', T.tien_ve, `${bpct(T.tien_ve, T.dk.dt.sv)} giá trị HĐ`)}
      ${kpi('Còn phải thu', T.th.con_lai, T.th.con_lai < 0 ? 'Âm: CĐT ứng trước vượt nghiệm thu' : 'Theo khối lượng nghiệm thu')}
      ${kpi('Còn phải trả thầu phụ', T.tp_con_lai, `Đã trả ${bn(T.tp_da_tt)} · trả nợ gốc vay ${bn(T.tra_goc)}`)}
    </div>
  </section>

  <section class="card b-sec">
    <h2>II. Biểu đồ</h2>
    <div class="b-charts">
      <div><h3>Doanh thu – Chi phí thực hiện (lũy kế)</h3><div id="b-ch-line" class="chart"></div></div>
      <div><h3>Dòng tiền thực tế theo tháng (sau VAT)</h3><div id="b-ch-flow" class="chart"></div></div>
      <div><h3>Cơ cấu chi phí dự kiến theo nhóm</h3><div id="b-ch-cost" class="chart"></div></div>
      <div><h3>${one ? 'Lãi gộp dự kiến theo HĐ chủ đầu tư' : 'Lợi nhuận theo dự án'}</h3><div id="b-ch-ln" class="chart"></div></div>
    </div>
  </section>

  ${one ? '' : `<section class="card b-sec">
    <h2>III. Tổng hợp theo dự án</h2>
    <h3>1. Hiệu quả (${vt})</h3>
    <div class="table-wrap"><table class="b-table">
      <thead><tr><th rowspan="2">Dự án</th><th rowspan="2">Trạng thái</th><th rowspan="2" class="num">Tiến độ</th>
        <th colspan="4" class="grp">Dự kiến</th><th colspan="4" class="grp">Thực hiện</th></tr>
        <tr><th class="num">Doanh thu</th><th class="num">Chi phí</th><th class="num">Lợi nhuận</th><th class="num">%</th>
        <th class="num">Doanh thu</th><th class="num">Chi phí</th><th class="num">Lợi nhuận</th><th class="num">%</th></tr></thead>
      <tbody>${projRows((d) => {
        const a = d.du_kien.doanh_thu[v] - d.du_kien.chi_phi[v], b = d.thuc_hien.doanh_thu[v] - d.thuc_hien.chi_phi[v];
        return `<tr><td><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</td><td>${esc(d.trang_thai)}</td><td class="num">${d.tien_do}%</td>
          <td class="num">${bn(d.du_kien.doanh_thu[v])}</td><td class="num">${bn(d.du_kien.chi_phi[v])}</td><td class="num strong">${bm(a)}</td><td class="num">${bpct(a, d.du_kien.doanh_thu[v])}</td>
          <td class="num">${bn(d.thuc_hien.doanh_thu[v])}</td><td class="num">${bn(d.thuc_hien.chi_phi[v])}</td><td class="num strong">${bm(b)}</td><td class="num">${bpct(b, d.thuc_hien.doanh_thu[v])}</td></tr>`;
      })}</tbody>
      <tfoot><tr><td colspan="3">TỔNG CỘNG</td><td class="num">${bn(T.dk.dt[v])}</td><td class="num">${bn(T.dk.cp[v])}</td><td class="num">${bm(lnDk)}</td><td class="num">${bpct(lnDk, T.dk.dt[v])}</td>
        <td class="num">${bn(T.th.dt[v])}</td><td class="num">${bn(T.th.cp[v])}</td><td class="num">${bm(lnTh)}</td><td class="num">${bpct(lnTh, T.th.dt[v])}</td></tr></tfoot>
    </table></div>
    <h3>2. Dòng tiền & công nợ (sau VAT)</h3>
    <div class="table-wrap"><table class="b-table">
      <thead><tr><th>Dự án</th><th class="num">HĐ CĐT (đã QT)</th><th class="num">Giá trị HĐ dự kiến</th><th class="num">Tiền về</th><th class="num">% thu</th><th class="num">Còn phải thu</th>
        <th class="num">HĐ thầu phụ (đã QT)</th><th class="num">Đã trả thầu phụ</th><th class="num">Còn phải trả TP</th><th class="num">Trả nợ gốc vay</th><th class="num">Cảnh báo</th></tr></thead>
      <tbody>${projRows((d) => `<tr><td><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</td><td class="num">${d.so_hd} (${d.so_hd_qt})</td>
        <td class="num">${bn(d.du_kien.doanh_thu.sv)}</td><td class="num">${bn(d.tien_ve)}</td><td class="num">${bpct(d.tien_ve, d.du_kien.doanh_thu.sv)}</td><td class="num">${bm(d.thuc_hien.con_lai)}</td>
        <td class="num">${d.so_tp} (${d.so_tp_qt})</td><td class="num">${bn(d.tp.da_tt)}</td><td class="num">${bm(d.tp.con_lai)}</td><td class="num">${bn(d.tra_goc.sv)}</td>
        <td class="num">${d.canh_bao.length ? `<span class="st st-tam-tinh">${d.canh_bao.length}</span>` : '0'}</td></tr>`)}</tbody>
      <tfoot><tr><td>TỔNG CỘNG</td><td class="num">${T.so_hd} (${T.so_hd_qt})</td><td class="num">${bn(T.dk.dt.sv)}</td><td class="num">${bn(T.tien_ve)}</td><td class="num">${bpct(T.tien_ve, T.dk.dt.sv)}</td>
        <td class="num">${bm(T.th.con_lai)}</td><td class="num">${T.so_tp} (${T.so_tp_qt})</td><td class="num">${bn(T.tp_da_tt)}</td><td class="num">${bm(T.tp_con_lai)}</td><td class="num">${bn(T.tra_goc)}</td><td class="num">${T.canh_bao}</td></tr></tfoot>
    </table></div>
  </section>`}

  <section class="card b-sec">
    <h2>${one ? 'III' : 'IV'}. Chi tiết theo dự án</h2>
    <div class="no-print b-tools"><button type="button" class="sm" id="b-open-all">Mở tất cả</button><button type="button" class="sm" id="b-close-all">Thu gọn tất cả</button></div>
    ${list.map((d) => bProjectDetail(d, v, Boolean(one))).join('')}
  </section>

  <section class="card b-sec">
    <h2>${one ? 'IV' : 'V'}. Cảnh báo & lưu ý</h2>
    ${bWarnTable(list)}
  </section>

  </div>
  <div class="b-foot">Nguồn: ${esc(BC.ten_he_thong || 'PROJECT PROFIT')} · ${esc(BC.phien_ban)} · Số liệu lấy tự động từ các tab Doanh thu, Chi phí, Thầu phụ, Tiền về tại thời điểm lập báo cáo.</div>`;

  bDrawCharts(list, v, one);
}

function bProjectDetail(d, v, open) {
  const lnDk = d.du_kien.doanh_thu[v] - d.du_kien.chi_phi[v], lnTh = d.thuc_hien.doanh_thu[v] - d.thuc_hien.chi_phi[v];
  const h = d.hds;
  const S = (f) => h.reduce((s, x) => s + f(x), 0);
  const cg = d.tp.chua_gan;
  const tp = (x) => (v === 'gt' ? x.qt_gt : x.qt_sv);
  const nhom = d.nhom.filter((n) => n[v]);
  const tongCp = d.du_kien.chi_phi[v];
  return `<details class="b-proj" ${open ? 'open' : ''}>
    <summary><span class="b-proj-title"><b>${esc(d.ma_du_an)}</b> – ${esc(d.ten_du_an)}</span>
      <span class="b-proj-sum">LN dự kiến ${bm(lnDk)} (${bpct(lnDk, d.du_kien.doanh_thu[v])}) · LN thực hiện ${bm(lnTh)} (${bpct(lnTh, d.thuc_hien.doanh_thu[v])})</span></summary>
    <div class="b-proj-body">
      <p class="b-proj-info">Chủ đầu tư: <b>${esc(d.chu_dau_tu || '—')}</b> · Trạng thái: <b>${esc(d.trang_thai)}</b> · Tiến độ: <b>${d.tien_do}%</b>
        ${d.ngay_bat_dau ? ` · Thời gian: ${dmy(d.ngay_bat_dau)}${d.ngay_ket_thuc ? ' → ' + dmy(d.ngay_ket_thuc) : ''}` : ''}
        <span class="no-print"> · <a href="#" data-bgo="revenue" data-id="${d.id}">Mở Doanh thu</a> · <a href="#" data-bgo="cost" data-id="${d.id}">Mở Chi phí</a></span></p>
      <div class="b-mini">
        <div><span>DT dự kiến</span><b>${bn(d.du_kien.doanh_thu[v])}</b></div><div><span>CP dự kiến</span><b>${bn(d.du_kien.chi_phi[v])}</b></div>
        <div><span>DT thực hiện</span><b>${bn(d.thuc_hien.doanh_thu[v])}</b></div><div><span>CP thực hiện</span><b>${bn(d.thuc_hien.chi_phi[v])}</b></div>
        <div><span>Tiền về</span><b>${bn(d.tien_ve)}</b></div><div><span>Còn phải thu</span><b>${bm(d.thuc_hien.con_lai)}</b></div>
        <div><span>Còn phải trả TP</span><b>${bm(d.tp.con_lai)}</b></div><div><span>Trả nợ gốc vay</span><b>${bn(d.tra_goc.sv)}</b></div>
      </div>
      <h4>Hợp đồng chủ đầu tư & thầu phụ</h4>
      <div class="table-wrap"><table class="b-table">
        <thead><tr><th rowspan="2">HĐ chủ đầu tư</th><th colspan="3" class="grp">Doanh thu</th><th colspan="2" class="grp">Thu tiền (sau VAT)</th><th colspan="4" class="grp">Thầu phụ</th><th rowspan="2" class="num">Lãi gộp dự kiến</th></tr>
        <tr><th class="num">Giá trị HĐ + PL</th><th class="num">Nghiệm thu</th><th class="num">% HT</th><th class="num">Tiền về</th><th class="num">Còn phải thu</th>
          <th class="num">Số HĐTP</th><th class="num">Giá trị HT/QT</th><th class="num">Đã trả (sau VAT)</th><th class="num">Còn phải trả</th></tr></thead>
        <tbody>${h.length ? h.map((x) => `<tr><td><b>${esc(x.so_ma)}</b>${x.so_pl ? ` <span class="muted small">+${x.so_pl} PL</span>` : ''} ${x.da_qt ? '<span class="st st-hoan-thanh">Đã QT</span>' : ''}${x.tam_tinh ? ' <span class="st st-tam-tinh">Tạm tính</span>' : ''}</td>
          <td class="num">${bn(x.hd[v])}</td><td class="num">${bn(x.nt[v])}</td><td class="num">${(x.pct_ht * 100).toFixed(1).replace('.', ',')}%</td>
          <td class="num">${bn(x.tien_ve)}</td><td class="num">${bm(x.phai_thu)}</td>
          <td class="num">${x.tp.n}${x.tp.n ? ` (${x.tp.n_qt} QT)` : ''}</td><td class="num">${bn(tp(x.tp))}</td><td class="num">${bn(x.tp.da_tt)}</td><td class="num">${bm(x.tp.con_lai)}</td>
          <td class="num strong">${bm(x.dk[v] - tp(x.tp))}</td></tr>`).join('') : '<tr><td colspan="11" class="empty">Chưa có HĐ chủ đầu tư</td></tr>'}
          ${cg.n ? `<tr class="tv-sub-warn"><td>Thầu phụ chưa gắn HĐ CĐT</td><td colspan="5"></td><td class="num">${cg.n}</td><td class="num">${bn(tp(cg))}</td><td class="num">${bn(cg.da_tt)}</td><td class="num">${bm(cg.con_lai)}</td><td class="num">${bm(-tp(cg))}</td></tr>` : ''}</tbody>
        <tfoot><tr><td>TỔNG</td><td class="num">${bn(S((x) => x.hd[v]))}</td><td class="num">${bn(S((x) => x.nt[v]))}</td><td class="num">${bpct(S((x) => x.nt.sv), S((x) => x.hd.sv))}</td>
          <td class="num">${bn(d.tien_ve)}</td><td class="num">${bm(S((x) => x.phai_thu))}</td><td class="num">${d.tp.n}</td><td class="num">${bn(tp(d.tp))}</td><td class="num">${bn(d.tp.da_tt)}</td><td class="num">${bm(d.tp.con_lai)}</td>
          <td class="num">${bm(S((x) => x.dk[v]) - tp(d.tp))}</td></tr></tfoot>
      </table></div>
      <p class="muted small">Lãi gộp dự kiến = Doanh thu dự kiến của HĐ − Giá trị HT/QT thầu phụ thuộc HĐ (chưa trừ vật tư, nhân công, gián tiếp, tài chính).</p>
      <h4>Cơ cấu chi phí dự kiến (${v === 'gt' ? 'trước VAT' : 'sau VAT'})</h4>
      <div class="table-wrap"><table class="b-table b-cost">
        <thead><tr><th>Khối / Nhóm chi phí</th><th class="num">Giá trị</th><th class="num">Tỷ trọng</th><th class="num">% doanh thu dự kiến</th></tr></thead>
        <tbody>${d.khoi.map((k) => `<tr class="b-khoi"><td>${esc(k.ten)}</td><td class="num">${bn(k[v])}</td><td class="num">${bpct(k[v], tongCp)}</td><td class="num">${bpct(k[v], d.du_kien.doanh_thu[v])}</td></tr>` +
          nhom.filter((n) => n.khoi === k.code).map((n) => `<tr><td class="indent-1">${esc(n.ten)}</td><td class="num">${bn(n[v])}</td><td class="num">${bpct(n[v], tongCp)}</td><td class="num">${bpct(n[v], d.du_kien.doanh_thu[v])}</td></tr>`).join('')).join('')}</tbody>
        <tfoot><tr><td>TỔNG CHI PHÍ</td><td class="num">${bn(tongCp)}</td><td class="num">100%</td><td class="num">${bpct(tongCp, d.du_kien.doanh_thu[v])}</td></tr></tfoot>
      </table></div>
    </div>
  </details>`;
}

function bWarnTable(list) {
  const rank = { cao: 0, tb: 1, thap: 2 };
  const rows = list.flatMap((d) => d.canh_bao.map((w) => ({ ...w, da: d.ma_du_an, id: d.id }))).sort((a, b) => rank[a.muc] - rank[b.muc] || a.da.localeCompare(b.da));
  if (!rows.length) return '<p class="muted">Không có cảnh báo.</p>';
  return `<p class="muted small no-print">Bấm vào một dòng để mở đúng vị trí cần kiểm tra.</p>
    <div class="table-wrap"><table class="b-table b-warn-tbl"><thead><tr><th>#</th><th>Mức</th><th>Dự án</th><th>Nội dung</th><th class="no-print">Vị trí</th></tr></thead>
    <tbody>${rows.map((w, i) => `<tr ${bWarnAttr(w, w.id)}><td class="num">${i + 1}</td><td><span class="b-muc m-${w.muc}">${MUC[w.muc]}</span></td><td>${esc(w.da)}</td><td class="wrap">${esc(w.noi_dung)}</td>
      <td class="no-print b-where">${w.link ? `${bWarnPlace(w.link)} →` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- Cảnh báo có liên kết: bấm để tới đúng tab / dòng ----------
function bWarnAttr(w, id) {
  return w.link ? `class="b-wlink m-${w.muc}" data-wda="${id}" data-wlink='${JSON.stringify(w.link).replace(/'/g, '&#39;')}' tabindex="0" title="Mở vị trí cần kiểm tra"` : '';
}
function bWarnPlace(l) {
  if (l.go === 'card') return 'Thẻ công trình';
  if (l.tab === 'revenue') return l.qt ? 'Doanh thu › 2. HT/QT' : l.tv ? 'Doanh thu › 3. Tiền về' : 'Doanh thu › 1. HĐ/PL';
  if (l.tp) return 'Chi phí › Thầu phụ (chi tiết)';
  if (l.tpgrp !== undefined) return 'Chi phí › 1. Thầu phụ';
  return 'Chi phí › bảng chi phí';
}
function bFlash(sel) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  const row = el?.closest('tr') || el;
  if (!row) return false;
  $$('.hl-flash').forEach((x) => x.classList.remove('hl-flash'));
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  row.classList.remove('hl-flash'); void row.offsetWidth; row.classList.add('hl-flash');
  return true;
}
async function bGoWarn(daId, l) {
  if (l.go === 'card') return openProjectReport(daId);
  revProjectId = daId;
  if (l.tab === 'revenue') {
    if (l.qt) qtOpen.add(l.qt);
    if (l.tv) tvOpen.add(l.tv);
    if (l.rid) hdCollapsed.clear();
    await showTab('revenue');
    setTimeout(() => bFlash(l.rid ? `#tab-revenue [data-rid="${l.rid}"]` : l.qt ? `[data-qtgrp="${l.qt}"]` : `[data-tvgrp="${l.tv}"]`), 120);
    return;
  }
  costOpen.add('thau_phu');
  if (l.nhom) { costOpen.add(l.nhom); costOpen.add(`${l.nhom}:_`); if (l.sub) costOpen.add(`${l.nhom}:${l.sub}`); }
  if (l.tpgrp !== undefined) tpOpen.add(l.tpgrp);
  await showTab('cost');
  if (l.tp) {
    const c = costData?.thau_phu.find((x) => x.id === l.tp);
    if (c) { tpOpen.add(c.hd_cdt_id || 0); renderTpCard(); bFlash(`#tp-tbody [data-tpid="${l.tp}"]`); setTimeout(() => openTp(l.tp), 500); }
    return;
  }
  setTimeout(() => bFlash(l.cid ? `[data-cid="${l.cid}"]` : l.tpgrp !== undefined ? `#tp-tbody [data-tpgrp="${l.tpgrp}"]` : `[data-cgrp="${l.nhom}"]`), 120);
}
$('#b-report').addEventListener('click', (e) => {
  const w = e.target.closest('[data-wlink]');
  if (w) bGoWarn(Number(w.dataset.wda), JSON.parse(w.dataset.wlink)).catch((err) => alert(err.message));
});
$('#b-report').addEventListener('keydown', (e) => {
  const w = e.target.closest('[data-wlink]');
  if (w && e.key === 'Enter') bGoWarn(Number(w.dataset.wda), JSON.parse(w.dataset.wlink));
});

function bDrawCharts(list, v, one) {
  if ($('#f-ch-col')) bFinDraw(list, v);
  bThucDraw(list);
  $$('#b-report .pc-card').forEach(bPcDraw);
  if (!$('#b-ch-line')) return; // báo cáo đang tải lại
  if (pcScrollTo) { const el = $(`#pc-${pcScrollTo}`); pcScrollTo = null; if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }
  if (pcOpenId) { if ($('#pc-modal')) bPcOpen(pcOpenId); else bPcClose(); } // vẽ lại (đổi VAT, tải ảnh) -> giữ khung đang mở
  const pts = bMonths(list, v);
  bLineChart($('#b-ch-line'), pts, [{ key: 'luy_dt', name: 'Doanh thu', color: BCOL.dt }, { key: 'luy_cp', name: 'Chi phí', color: BCOL.cp }]);
  bColChart($('#b-ch-flow'), pts, [{ key: 'thu', name: 'Thu (tiền về + vay)', color: BCOL.thu }, { key: 'chi', name: 'Chi', color: BCOL.chi }],
    { tipExtra: (p) => `<tr class="sum"><td>Chênh lệch</td><td class="${p.thu - p.chi < 0 ? 'neg' : ''}">${bn(p.thu - p.chi)}</td></tr>` });
  const cg = bCostGroups(list, v);
  const tong = cg.reduce((s, x) => s + x.val, 0);
  bBarH($('#b-ch-cost'), cg.slice(0, 10).map((x) => ({ label: x.ten, values: [x.val] })), [{ name: 'Chi phí', color: BCOL.cp }], { pctOf: tong });
  if (one) {
    const tp = (x) => (v === 'gt' ? x.qt_gt : x.qt_sv);
    bBarH($('#b-ch-ln'), one.hds.map((x) => ({ label: x.so_ma, values: [x.dk[v] - tp(x.tp)] })), [{ name: 'Lãi gộp dự kiến', color: BCOL.dk }]);
  } else {
    bBarH($('#b-ch-ln'), list.map((d) => ({ label: `${d.ma_du_an} ${d.ten_du_an}`, values: [d.du_kien.doanh_thu[v] - d.du_kien.chi_phi[v], d.thuc_hien.doanh_thu[v] - d.thuc_hien.chi_phi[v]] })),
      [{ name: 'Dự kiến', color: BCOL.dk }, { name: 'Thực hiện', color: BCOL.th }]);
  }
}


// =====================================================================
// THẺ BÁO CÁO TỪNG CÔNG TRÌNH (ảnh, 6 tab: Tổng quan · Doanh thu · Chi phí · Lợi nhuận · Dòng tiền · Công nợ)
// =====================================================================
const PC_TABS = [['tong', 'Tổng quan'], ['dt', 'Doanh thu'], ['cp', 'Chi phí'], ['ln', 'Lợi nhuận'], ['dong', 'Dòng tiền'], ['cn', 'Công nợ']];
const pcTab = {};            // id dự án -> tab đang mở
const NHOM_NGAN = { thau_phu: 'Thầu phụ', vat_tu: 'Vật tư', nhan_cong: 'Nhân công', may_moc: 'Máy móc', to_chuc: 'Tổ chức TC', khac: 'Khác',
  gt_tien_ich: 'Tiện ích/phục vụ', gt_luong: 'Lương, thưởng', gt_ngoai_giao: 'Ngoại giao', tc_chi_phi: 'CP tài chính', tc_tra_no: 'Lãi vay', tc_phat: 'Phạt CĐT' };
let pcScrollTo = null;       // mở báo cáo từ tab Dự án -> cuộn tới thẻ
const BUILDING = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V5l8-3v19M13 8h6v13M8 7h2M8 11h2M8 15h2M16 12h1M16 16h1"/></svg>';
const canEditPc = () => ['admin', 'editor'].includes(ME.role);

function openProjectReport(id) {
  BST.project = String(id);
  bSave();
  pcScrollTo = id;
  showTab('report');
}

function bDeltaS(cur, prev, good = true) {
  if (prev === null || prev === undefined || !prev) return '';
  const p = (cur - prev) / Math.abs(prev);
  return `<span class="f-delta ${(p >= 0) === good ? 'ok' : 'bad'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p * 100).toFixed(0)}%</span>`;
}

const KY_OPTS = [['thang', 'Tháng này'], ['quy', 'Quý này'], ['nam', 'Năm nay'], ['6t', '6 tháng gần nhất'], ['luyke', 'Lũy kế đến nay'], ['all', 'Toàn bộ thời gian (All time)'], ['tuychon', 'Tùy chọn...']];
function bPcSection(list, v) {
  const P = bPeriod(list);
  const one = Boolean(Number(BST.project));
  return `<section class="card b-sec pc-sec" id="pc-sec">
    <div class="f-head">
      <div class="pc-sec-title">${one ? '<button type="button" class="sm no-print" id="pc-back" title="Quay lại tất cả công trình">← Về tổng quan</button>' : ''}<h2>Báo cáo theo công trình</h2></div>
      <div class="pc-ky no-print">
        <button type="button" class="f-range f-range-btn" data-kypick title="Bấm để chọn kỳ báo cáo">📅 ${P.range} <span class="f-caret">▾</span></button>
      </div>
      <div class="f-range print-only">Kỳ: ${esc(P.label)} · ${P.range}</div>
    </div>
    ${one
    ? `<div class="pc-grid one">${list.map((d) => bPcCard(d, BC.du_an.indexOf(d))).join('')}</div>`
    : `<p class="muted small pc-gal-hint no-print">Số trên ô: <b>tiền thật</b> (thực thu, thực chi, còn lại = thu − chi; tỷ đồng, sau VAT, lũy kế đến hết kỳ) · bấm vào công trình để xem tổng quan nhanh, trong đó bấm <b>Xem chi tiết công trình</b> để xem đầy đủ.</p>
       <div class="pc-gal">${list.map((d) => bPcTile(d, BC.du_an.indexOf(d), v, P)).join('')}</div>
       <div class="pc-modal" id="pc-modal" hidden></div>`}
  </section>`;
}

// Ô công trình (lưới): ảnh + tên + trạng thái + số chính trong kỳ; bấm -> khung tổng quan nhanh
function bPcTile(d, idx, v, P) {
  const color = PROJ_COLORS[idx % PROJ_COLORS.length];
  const t = bThuc(d, P.to < bNowYm() ? P.to : bNowYm()); // tiền thật, sau VAT, lũy kế đến hết kỳ
  const sub = [d.loai_cong_trinh, d.dia_diem].filter(Boolean).join(' – ') || d.chu_dau_tu || '';
  const img = d.co_anh
    ? `<img src="/api/du-an/${d.id}/anh?v=${d.anh_v}" alt="Ảnh ${esc(d.ten_du_an)}" loading="lazy">`
    : `<span class="pc-tile-noimg">${BUILDING}<small>Chưa có ảnh</small></span>`;
  return `<button type="button" class="pc-tile" data-pctile="${d.id}" style="--pc:${color}" title="Xem tổng quan ${esc(d.ma_du_an)}">
    <span class="pc-tile-img">${img}<span class="pc-tile-no">${idx + 1}</span><span class="st st-${slug(d.trang_thai)} pc-tile-st">${esc(d.trang_thai)}</span></span>
    <span class="pc-tile-body">
      <span class="pc-tile-ma">${esc(d.ma_du_an)}</span>
      <span class="pc-tile-ten">${esc(d.ten_du_an)}</span>
      <span class="pc-tile-sub">${esc(sub) || '&nbsp;'}</span>
      <span class="pc-tile-prog"><i><b style="width:${Math.min(100, d.tien_do)}%"></b></i>${d.tien_do}%</span>
      <span class="pc-tile-kpi" title="Tiền thật, sau VAT, lũy kế đến hết kỳ · Thực chi = chi phí đã chi + trả thầu phụ"><span>Thực thu<b>${bTy(t.thu)}</b></span><span>Thực chi<b>${bTy(t.chi)}</b></span><span>Còn lại<b class="${t.con < 0 ? 'neg' : 'pos'}">${bTy(t.con)}</b></span></span>
    </span>
  </button>`;
}

// Khung tổng quan nhanh 1 công trình (dùng lại thẻ báo cáo 6 tab)
let pcOpenId = null;
function bPcOpen(id) {
  const m = $('#pc-modal');
  const d = BC.du_an.find((x) => x.id === id);
  if (!m || !d) return;
  pcOpenId = id;
  m.innerHTML = `<div class="pc-modal-box" role="dialog" aria-modal="true" aria-label="Tổng quan ${esc(d.ma_du_an)}">
    <button type="button" class="pc-x" data-pcclose title="Đóng (Esc)">×</button>${bPcCard(d, BC.du_an.indexOf(d))}</div>`;
  m.hidden = false;
  document.body.classList.add('pc-modal-on');
  bPcDraw($('.pc-card', m));
  $('.pc-x', m).focus({ preventScroll: true });
}
function bPcClose() {
  pcOpenId = null;
  const m = $('#pc-modal');
  if (m) { m.hidden = true; m.innerHTML = ''; }
  document.body.classList.remove('pc-modal-on');
  hideTip();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pcOpenId) bPcClose(); });

// Ngày bắt đầu / kết thúc công trình: nhập tay (yêu cầu riêng) được ưu tiên; để trống thì tự lấy theo ngày ký HĐ / ngày quyết toán
function bPcDates(d) {
  const bd = d.ngay_bat_dau ? [d.ngay_bat_dau, 'tự điền'] : d.ngay_ky_hd ? [d.ngay_ky_hd, 'ngày ký HĐ'] : null;
  const kt = d.ngay_ket_thuc ? [d.ngay_ket_thuc, 'tự điền'] : d.ngay_qt ? [d.ngay_qt, 'ngày quyết toán'] : null;
  const val = (x, none) => (x ? `<b>${dmy(x[0])}</b> <small>(${x[1]})</small>` : `<b class="muted-b">${none}</b>`);
  // Quản trị / Nhập liệu: bấm vào ngày để sửa; Xem: chỉ đọc
  const one = (label, x, none) => (canEditPc()
    ? `<button type="button" class="pc-ngay" data-pcngay="${d.id}" title="Bấm để sửa ngày (để trống = tự lấy theo HĐ / quyết toán)"><em>${label}</em> ${val(x, none)} <span class="pc-ngay-pen">✎</span></button>`
    : `<span><em>${label}</em> ${val(x, none)}</span>`);
  return `${one('Bắt đầu', bd, 'Chưa có HĐ')}<i>→</i>${one('Kết thúc', kt, 'Chưa quyết toán')}`;
}
// Hộp sửa ngày bắt đầu / kết thúc: lưu vào hồ sơ dự án (cùng dữ liệu tab Dự án), xóa trống = dùng ngày tự động
function bNgayDialog(d) {
  const dlg = document.createElement('dialog');
  dlg.className = 'pass-dlg f-dlg';
  const auto = (x, none) => (x ? dmy(x) : none);
  dlg.innerHTML = `<form method="dialog" class="stack">
    <h3>Ngày bắt đầu – kết thúc · ${esc(d.ma_du_an)}</h3>
    <p class="muted small">Chỉ điền khi có yêu cầu riêng. Để trống thì hệ thống tự lấy: bắt đầu = ngày ký HĐ chủ đầu tư đầu tiên, kết thúc = ngày quyết toán (khi mọi HĐ đã quyết toán).</p>
    <label>Ngày bắt đầu<input name="bd" type="date" value="${d.ngay_bat_dau || ''}"></label>
    <div class="row-auto small muted">Tự động: <b>${auto(d.ngay_ky_hd, 'chưa có HĐ')}</b> (ngày ký HĐ) <button type="button" class="sm" data-auto="bd">Dùng tự động</button></div>
    <label>Ngày kết thúc<input name="kt" type="date" value="${d.ngay_ket_thuc || ''}"></label>
    <div class="row-auto small muted">Tự động: <b>${auto(d.ngay_qt, 'chưa quyết toán')}</b> (ngày quyết toán) <button type="button" class="sm" data-auto="kt">Dùng tự động</button></div>
    <div class="msg" role="alert"></div>
    <div class="actions"><button type="submit" class="primary">Lưu</button><button type="button" data-x>Hủy</button></div>
  </form>`;
  document.body.appendChild(dlg);
  const f = $('form', dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  $('[data-x]', f).addEventListener('click', close);
  $$('[data-auto]', f).forEach((b) => b.addEventListener('click', () => { f.elements[b.dataset.auto].value = ''; }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bd = f.elements.bd.value || null, kt = f.elements.kt.value || null;
    if (bd && kt && kt < bd) return showMsg($('.msg', f), 'Ngày kết thúc phải sau ngày bắt đầu', 'err');
    try {
      await api(`/api/du-an/${d.id}/ngay`, { method: 'PUT', body: JSON.stringify({ ngay_bat_dau: bd, ngay_ket_thuc: kt }) });
      close();
      await loadReport(); // tải lại toàn bộ báo cáo: mọi tab, bảng, file xuất dùng ngày mới; khung đang mở được giữ
    } catch (err) { showMsg($('.msg', f), err.message, 'err'); }
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
function bPcCard(d, idx) {
  const color = PROJ_COLORS[idx % PROJ_COLORS.length];
  const tab = PC_TABS.some(([k]) => k === pcTab[d.id]) ? pcTab[d.id] : 'tong';
  const sub = [d.loai_cong_trinh, d.dia_diem].filter(Boolean).join(' – ') || d.chu_dau_tu || '';
  const img = d.co_anh
    ? `<img src="/api/du-an/${d.id}/anh?v=${d.anh_v}" alt="Ảnh ${esc(d.ten_du_an)}" loading="lazy">`
    : `<span class="pc-noimg">${BUILDING}${canEditPc() ? '<small>Thêm ảnh</small>' : ''}</span>`;
  return `<article class="pc-card" id="pc-${d.id}" data-pc="${d.id}" style="--pc:${color}">
    <header class="pc-head">
      <span class="pc-no">${idx + 1}</span>
      <div class="pc-img ${canEditPc() ? 'editable' : ''}" ${canEditPc() ? `data-pcimg="${d.id}" title="Bấm để ${d.co_anh ? 'đổi' : 'thêm'} ảnh công trình"` : ''}>${img}
        ${canEditPc() && d.co_anh ? `<button type="button" class="pc-img-del no-print" data-pcimgdel="${d.id}" title="Xóa ảnh">×</button>` : ''}</div>
      <div class="pc-title">
        <h3>${esc(d.ma_du_an)} – ${esc(d.ten_du_an)}</h3>
        <div class="pc-sub">${esc(sub)}</div>
        <div class="pc-dates">${bPcDates(d)}</div>
        <div class="pc-meta"><span class="pc-st">${esc(d.trang_thai)}</span><span class="pc-prog">Tiến độ: <b>${d.tien_do}%</b><i><b style="width:${Math.min(100, d.tien_do)}%"></b></i></span></div>
      </div>
    </header>
    <nav class="pc-tabs no-print">${PC_TABS.map(([k, t]) => `<button type="button" data-pt="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('')}</nav>
    <div class="pc-body">${bPcBody(d, tab)}</div>
    <button type="button" class="pc-more no-print" data-pdetail="${d.id}">Xem chi tiết công trình ${esc(d.ma_du_an)} →</button>
  </article>`;
}

const PC_U = '<em class="pc-u">tỷ đ</em>'; // đơn vị hiển thị cạnh số tiền trong khung tổng quan
const bNat = (a, b) => String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' }); // a→z, 1→9
const bTyU = (n) => bTy(n) + PC_U;
// Số THỰC HIỆN (theo nghiệm thu / chi phí thực hiện) – chỉ hiện khi bấm, để không lẫn với số kế hoạch và tiền thật
function bPcThucHien(d, kind, cur, prv) {
  const v = BST.vat, H = d.thuc_hien;
  const on = Boolean(BST.th_on);
  const btn = `<button type="button" class="pc-tt-sw pc-th-sw ${on ? 'on' : ''}" data-pcth aria-pressed="${on}">${on ? '✓ ' : '+ '}Thực hiện đến hiện tại</button>`;
  if (!on) return `<div class="pc-td-bar no-print"><span>Kế hoạch theo hợp đồng · Thực = tiền thật (thực thu – thực chi)</span>${btn}</div>`;
  const P = bPeriod(bScope().list);
  const c = (label, val, sub) => `<div class="pc-tt-c"><span>${label}</span><b class="${typeof val === 'number' && val < 0 ? 'neg' : ''}">${typeof val === 'number' ? bTyU(val) : val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const dtH = H.doanh_thu[v], cpH = H.chi_phi[v], lnH = dtH - cpH;
  const cells = {
    dt: [c('DT thực hiện (nghiệm thu)', dtH, 'lũy kế'), c(`DT trong kỳ ${P.label}`, cur.dt), c('% hoàn thành', bpct(H.doanh_thu.sv, d.du_kien.doanh_thu.sv)), c('Kỳ trước', prv ? prv.dt : '—')],
    cp: [c('CP thực hiện', cpH, 'lũy kế'), c(`CP trong kỳ ${P.label}`, cur.cp), c('% CP / DT thực hiện', bpct(cpH, dtH)), c('Kỳ trước', prv ? prv.cp : '—')],
    ln: [c('LN thực hiện', lnH, `tỷ suất ${bpct(lnH, dtH)}`), c(`LN trong kỳ ${P.label}`, cur.ln), c('Tỷ suất kỳ', bpct(cur.ln, cur.dt)), c('Kỳ trước', prv ? prv.ln : '—')],
  }[kind];
  return `<div class="pc-td-bar no-print"><span>Kế hoạch theo hợp đồng · Thực = tiền thật (thực thu – thực chi)</span>${btn}</div>
    <div class="pc-td-tt pc-th-row"><div class="pc-tt-lab">Thực hiện<br><span>đến hiện tại · ${v === 'gt' ? 'trước VAT' : 'sau VAT'}</span></div>${cells.join('')}</div>`;
}
function bPcBody(d, tab) {
  const v = BST.vat;
  const P = bPeriod(bScope().list);
  const cur = bSumRange([d], v, P.from, P.to);
  const prv = P.prev ? bSumRange([d], v, P.prev.from, P.prev.to) : null;
  const K = d.du_kien, H = d.thuc_hien;
  const mini = (label, val, extra = '', cls = '') => `<div class="pc-k ${cls}"><span>${label}</span><b class="${val < 0 ? 'neg' : ''}">${typeof val === 'number' ? bTyU(val) : val}</b>${extra}</div>`;
  const row = (l, val, cls = '') => `<li><span>${l}</span><b class="${cls} ${val < 0 ? 'neg' : ''}">${typeof val === 'number' ? bTyU(val) : val}</b></li>`;
  const tpv = (x) => (v === 'gt' ? x.qt_gt : x.qt_sv);
  const kyNote = `<div class="pc-note">Kỳ ${esc(P.label)} · đơn vị tỷ đồng (${v === 'gt' ? 'trước VAT' : 'sau VAT'})</div>`;
  switch (tab) {
    // Doanh thu / Chi phí / Lợi nhuận: 2 lớp số – KẾ HOẠCH (theo HĐ) và THỰC (tiền thật); cùng tính sau VAT để so trực tiếp.
    // Số "thực hiện" (nghiệm thu, chi phí thực hiện) và "trong kỳ" chỉ hiện khi bấm "Thực hiện đến hiện tại".
    case 'dt': {
      const t = bThuc(d, bNowYm());
      const rows = [...d.hds].sort((a, b) => bNat(a.so_ma, b.so_ma));
      return `<div class="pc-kpis">${mini('DT kế hoạch', t.kh_thu, '<small>HĐ + PL (đã QT theo QT)</small>', 'k-kh')}${mini('DT thực thu', t.thu, '<small>tiền đã về</small>', 'k-thuc')}${mini('% đã thu', bpct(t.thu, t.kh_thu))}${mini('Còn phải thu', t.phai_thu)}</div>
      ${bPcThucHien(d, 'dt', cur, prv)}
      <table class="pc-tbl"><thead><tr><th>HĐ chủ đầu tư</th><th class="num">Kế hoạch (tỷ đ)</th><th class="num">Thực thu (tỷ đ)</th><th>% đã thu</th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td>${esc(x.so_ma)}${x.da_qt ? ' <span class="st st-hoan-thanh">QT</span>' : ''}</td><td class="num">${bTy(x.dk.sv)}</td><td class="num">${bTy(x.tien_ve)}</td>
        <td><span class="pc-bar"><i style="width:${x.dk.sv ? Math.min(100, (x.tien_ve / x.dk.sv) * 100) : 0}%"></i></span>${bpct(x.tien_ve, x.dk.sv)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Chưa có HĐ</td></tr>'}</tbody></table>
      <div class="pc-note">Đơn vị: tỷ đồng, sau VAT · Kế hoạch = giá trị HĐ + phụ lục (HĐ đã quyết toán lấy theo quyết toán) · Thực thu = tiền đã về tài khoản, lũy kế đến hiện tại</div>`;
    }
    case 'cp': {
      const t = bThuc(d, bNowYm());
      const tong = K.chi_phi.sv;
      const pct = (x) => (tong ? Math.max(0, (x / tong) * 100) : 0);
      const blocks = d.khoi.map((k) => {
        const ns = d.nhom.filter((n) => n.khoi === k.code && n.sv).sort((a, b) => b.sv - a.sv);
        return `<li class="pc-khoi"><span>${esc(k.ten)}</span><span class="pc-bar wide"><i style="width:${pct(k.sv)}%"></i></span><b>${bTyU(k.sv)} · ${bpct(k.sv, tong)}</b></li>` +
          ns.map((n) => `<li class="pc-nhom"><span>${esc(n.code === 'tc_tra_no' ? 'Lãi vay ngân hàng' : n.ten)}${n.code === 'thau_phu' ? ` <small class="muted">(${d.so_tp} HĐTP · ${d.so_tp_qt} QT)</small>` : ''}</span><span class="pc-bar wide"><i style="width:${pct(n.sv)}%"></i></span><b>${bTyU(n.sv)} · ${bpct(n.sv, tong)}</b></li>`).join('');
      }).join('');
      return `<div class="pc-kpis">${mini('CP kế hoạch', t.kh_chi, '<small>thầu phụ theo HĐ/QT + chi phí khác</small>', 'k-kh')}${mini('CP thực chi', t.chi, `<small>chi phí ${bTy(t.cp)} · trả thầu phụ ${bTy(t.tp)}</small>`, 'k-thuc')}${mini('% đã chi', bpct(t.chi, t.kh_chi))}${mini('Còn phải chi', t.phai_chi)}</div>
        ${bPcThucHien(d, 'cp', cur, prv)}
        <div class="pc-sub-h">Cơ cấu chi phí kế hoạch: khối → nhóm chi phí</div>
        <ul class="pc-list pc-cp">${blocks}</ul>
        <div class="pc-note">Đơn vị: tỷ đồng, sau VAT · Thực chi = chi phí đã chi + tiền đã trả thầu phụ (gồm tạm ứng), lũy kế đến hiện tại · nhận tiền vay ${bTy(d.vay_nhan?.sv || 0)} tỷ, trả nợ gốc ${bTy(d.tra_goc.sv)} tỷ không tính vào chi phí</div>`;
    }
    case 'ln': {
      const t = bThuc(d, bNowYm());
      const kh = t.kh_thu - t.kh_chi;
      const items = [...d.hds].sort((a, b) => bNat(a.so_ma, b.so_ma)).map((x) => ({ l: x.so_ma, kh: x.dk.sv - x.tp.qt_sv, th: x.tien_ve - x.tp.da_tt }));
      const mx = Math.max(1, ...items.flatMap((x) => [Math.abs(x.kh), Math.abs(x.th)]));
      const bar = (val, cls) => `<span class="pc-bar wide ${cls} ${val < 0 ? 'neg-bar' : ''}"><i style="width:${(Math.abs(val) / mx) * 100}%"></i></span>`;
      return `<div class="pc-kpis">${mini('LN kế hoạch', kh, '<small>DT kế hoạch − CP kế hoạch</small>', 'k-kh')}${mini('LN thực', t.con, '<small>thực thu − thực chi</small>', 'k-thuc')}${mini('Tỷ suất kế hoạch', bpct(kh, t.kh_thu))}${mini('Tỷ suất thực', bpct(t.con, t.thu))}</div>
        ${bPcThucHien(d, 'ln', cur, prv)}
        <div class="pc-sub-h">Lãi gộp theo HĐ chủ đầu tư (doanh thu − thầu phụ): kế hoạch / thực</div>
        <ul class="pc-list pc-ln2">${items.map((x) => `<li><span>${esc(x.l)}</span><div class="pc-2bar">${bar(x.kh, 'kh')}${bar(x.th, 'th')}</div>
          <b class="${x.kh < 0 ? 'neg' : ''}">${bTyU(x.kh)}</b><b class="pc-th ${x.th < 0 ? 'neg' : ''}">${bTyU(x.th)}</b></li>`).join('') || '<li class="muted">Chưa có HĐ</li>'}</ul>
        <div class="pc-note">Đơn vị: tỷ đồng, sau VAT · thanh xanh đậm = kế hoạch (DT HĐ − giá trị thầu phụ HT/QT); thanh xanh ngọc = thực (tiền về − đã trả thầu phụ) · HĐ xếp theo số hiệu</div>`;
    }
    case 'dong': return `<div class="pc-kpis">${mini('Thu (tiền về + vay)', cur.thu, bDeltaS(cur.thu, prv?.thu))}${mini('Chi', cur.chi, bDeltaS(cur.chi, prv?.chi, false))}${mini('Dòng tiền', cur.dong_tien)}${mini('Số dư cuối kỳ', bBalance([d], P.to))}</div>
      <div class="chart pc-chart" data-pcchart="dong"></div>${kyNote.replace('trước VAT', 'sau VAT')}`;
    case 'cn': {
      const thu = d.hds.filter((x) => x.phai_thu).sort((a, b) => bNat(a.so_ma, b.so_ma));
      const tra = [...d.hds.filter((x) => x.tp.con_lai).map((x) => ({ l: x.so_ma, val: x.tp.con_lai })), ...(d.tp.chua_gan.con_lai ? [{ l: 'Chưa gắn HĐ CĐT', val: d.tp.chua_gan.con_lai }] : [])];
      tra.sort((a, b) => (a.l === 'Chưa gắn HĐ CĐT') - (b.l === 'Chưa gắn HĐ CĐT') || bNat(a.l, b.l));
      return `<div class="pc-kpis">${mini('Phải thu', H.con_lai)}${mini('Phải trả TP', d.tp.con_lai)}${mini('Đã trả TP', d.tp.da_tt)}${mini('Dư nợ vay', (d.vay_nhan?.sv || 0) - d.tra_goc.sv, `<small>vay ${bTy(d.vay_nhan?.sv || 0)} · đã trả gốc ${bTy(d.tra_goc.sv)}</small>`)}</div>
        <div class="pc-2col"><div><div class="pc-sub-h">Phải thu theo HĐ</div><ul class="pc-list compact">${thu.map((x) => row(x.so_ma, x.phai_thu)).join('') || '<li class="muted">Không có</li>'}</ul></div>
        <div><div class="pc-sub-h">Phải trả thầu phụ theo HĐ CĐT</div><ul class="pc-list compact">${tra.map((x) => row(x.l, x.val)).join('') || '<li class="muted">Không có</li>'}</ul></div></div>
        <div class="pc-note">Đơn vị: tỷ đồng (sau VAT) · phải thu = nghiệm thu − tiền về (âm: CĐT ứng trước)</div>`;
    }
    default: { // tổng quan
      const groups = d.nhom.filter((n) => n[v] > 0).sort((a, b) => b[v] - a[v]);
      const top = groups.slice(0, 5);
      const rest = groups.slice(5).reduce((s2, n) => s2 + n[v], 0);
      const parts = [...top.map((n, i) => ({ l: NHOM_NGAN[n.code] || n.ten, val: n[v], c: PROJ_COLORS[i] })), ...(rest ? [{ l: 'Khác', val: rest, c: '#b5b3ab' }] : [])];
      return `${bTdBlock(d)}
        <div class="pc-sub-h">Doanh thu – Chi phí – Lợi nhuận (tỷ đồng)</div>
        <div class="chart pc-chart" data-pcchart="tong"></div>
        <div class="pc-2col">
          <div><div class="pc-sub-h">Cơ cấu chi phí</div><div class="pc-donut" data-pcdonut='${JSON.stringify(parts).replace(/'/g, '&#39;')}'></div></div>
          <div><div class="pc-sub-h">Tình hình công nợ</div><ul class="pc-list compact">
            ${row('Phải thu', H.con_lai)}${row('Phải trả TP', d.tp.con_lai)}${row('Thu trong kỳ (tiền về + vay)', cur.thu)}${row('Số dư cuối kỳ', bBalance([d], P.to), 'strong')}</ul></div>
        </div>${kyNote}`;
    }
  }
}

// ---------------------------------------------------------------------
// Thời điểm chốt số (TĐ1–TĐ3): số thực tế nhập tay, so với số hệ thống tự tính đến cùng ngày (trước VAT)
// Chỉ hiện các TĐ đã nhập (có TĐ2 thì hiện TĐ1–TĐ2, có TĐ3 thì hiện đủ); chưa có TĐ nào -> 1 dòng chờ nhập TĐ1
// ---------------------------------------------------------------------
const TD_TEN = { 1: 'Ban đầu', 2: 'Có phát sinh', 3: 'Quyết toán' };
const TD_HT = { 1: 'HĐ gốc', 2: 'HĐ + phụ lục', 3: 'quyết toán' };
// Số hệ thống theo mốc (KẾ HOẠCH theo hợp đồng): TĐ1 = HĐ gốc · TĐ2 = HĐ + PL · TĐ3 = quyết toán (DT);
// CP = thầu phụ cùng mốc + chi phí khác đã ghi nhận đến ngày chốt (ngày chứng từ ≤ ngày chốt)
function bSysMoc(d, td, ngay) {
  const m = d.moc || {};
  const dt = td === 1 ? m.dt_goc : td === 2 ? m.dt_ps : m.dt_qt;
  const khac = ngay && m.cp_khac_ngay
    ? Object.entries(m.cp_khac_ngay).reduce((a, [k, x]) => a + (k <= ngay ? x : 0), 0)
    : m.cp_khac || 0;
  const cp = (td === 1 ? m.tp_goc : td === 2 ? m.tp_ps : m.tp_qt) + khac;
  return { dt: dt || 0, cp: cp || 0, ln: (dt || 0) - (cp || 0) };
}
const bTodayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
function bTdBox(label, cls, val, sys, isPct) {
  const fmtV = (x) => (isPct ? (x === null ? '—' : `${(x * 100).toFixed(1).replace('.', ',')}%`) : bTyU(x));
  let note;
  if (val === null || sys === null) note = `HT ${fmtV(sys)}`;
  else {
    const diff = val - sys;
    const near = isPct ? Math.abs(diff) < 0.0005 : Math.abs(diff) <= Math.max(1000, Math.abs(sys) * 0.005);
    const dtx = isPct ? `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1).replace('.', ',')} điểm %` : `${diff > 0 ? '+' : ''}${bTy(diff)} tỷ đ`;
    note = `HT ${fmtV(sys)} · <i class="${near ? 'ok' : 'lech'}">${near ? 'khớp' : 'lệch ' + dtx}</i>`;
  }
  return `<div class="pc-k ${cls}"><span>${label}</span><b class="${val < 0 ? 'neg' : ''}">${fmtV(val)}</b><small class="pc-td-ht">${note}</small></div>`;
}
// Tiền thật đến ngày chốt (sau VAT): thực thu = tiền về; thực chi = chi phí đã chi + đã trả thầu phụ (gồm tạm ứng);
// không gồm nhận tiền vay / trả nợ gốc – cùng cách tính mục "Thực thu – Thực chi"
function bTienThucDen(d, ngay) {
  const o = { thu: 0, chi: 0 };
  for (const [k, x] of Object.entries(d.tien_thuc?.ngay || {})) if (k <= ngay) { o.thu += x.thu; o.chi += x.cp + x.tp; }
  o.con = o.thu - o.chi;
  return o;
}
// Dòng "Thực tế đến ngày chốt" (bật/tắt): tiền thật thu – chi – còn lại (sau VAT), tách hẳn khỏi số kế hoạch phía trên
function bTdThucTe(d, t) {
  const a = bTienThucDen(d, t.ngay);
  const pctTxt = (x) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
  const cell = (label, val, sub, isPct) => `<div class="pc-tt-c"><span>${label}</span><b class="${val < 0 ? 'neg' : ''}">${isPct ? (val === null ? '—' : pctTxt(val)) : bTyU(val)}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  return `<div class="pc-td-tt"><div class="pc-tt-lab">Tiền thực tế<br><span>đến ${dmy(t.ngay)} · sau VAT</span></div>
    ${cell('Thực thu (tiền về)', a.thu)}${cell('Thực chi (tiền ra)', a.chi)}${cell('Còn lại thực (thu − chi)', a.con)}${cell('Tỷ lệ còn lại / thực thu', a.thu ? a.con / a.thu : null, '', true)}</div>`;
}
function bTdBlock(d) {
  const tds = [...(d.thoi_diem || [])].sort((a, b) => a.td - b.td);
  const edit = canEditPc();
  const pct = (a, b) => (b ? a / b : null);
  const tt = Boolean(BST.td_tt) && tds.length;
  const rows = tds.map((t) => {
    const s = bSysMoc(d, t.td, t.ngay), ln = t.dt - t.cp;
    return `<div class="pc-td" ${t.ghi_chu ? `title="${esc(t.ghi_chu)}"` : ''}>
      <div class="pc-td-lab"><b>TĐ${t.td}</b><em>${TD_TEN[t.td]}</em><span>${dmy(t.ngay)}</span>${edit ? `<button type="button" class="pc-td-edit no-print" data-tdedit="${t.td}">Sửa</button>` : ''}</div>
      <div class="pc-kpis">${bTdBox('Doanh thu', 'k-dt', t.dt, s.dt)}${bTdBox('Chi phí', 'k-cp', t.cp, s.cp)}${bTdBox('Lợi nhuận', 'k-ln', ln, s.ln)}${bTdBox('Tỷ suất LN', 'k-ts', pct(ln, t.dt), pct(s.ln, s.dt), true)}</div>
    </div>${tt ? bTdThucTe(d, t) : ''}`;
  });
  if (!tds.length) {
    const s = bSysMoc(d, 1, bTodayIso());
    rows.push(`<div class="pc-td pc-td-empty">
      <div class="pc-td-lab"><b>TĐ1</b><em>${TD_TEN[1]}</em><span>Chưa nhập</span></div>
      <div class="pc-td-none">${edit ? '<button type="button" class="primary sm no-print" data-tdedit="1">+ Nhập DT – CP ban đầu</button>' : '<span class="muted">Chưa nhập số liệu thời điểm</span>'}
        <span class="muted small">Hệ thống theo HĐ gốc: DT <b>${bTy(s.dt)}</b> · CP <b>${bTy(s.cp)}</b> · LN <b class="${s.ln < 0 ? 'neg' : ''}">${bTy(s.ln)}</b> tỷ</span></div>
    </div>`);
  }
  const next = tds.length + 1;
  const add = edit && tds.length && next <= 3 ? `<button type="button" class="pc-td-add no-print" data-tdedit="${next}">+ Thêm TĐ${next} – ${TD_TEN[next]}</button>` : '';
  const sw = tds.length ? `<div class="pc-td-bar no-print"><span>Số <b>kế hoạch</b> theo hợp đồng tại từng thời điểm</span>
    <button type="button" class="pc-tt-sw ${tt ? 'on' : ''}" data-tdtt aria-pressed="${tt ? 'true' : 'false'}">${tt ? '✓ ' : ''}So với thực tế</button></div>` : '';
  return `<div class="pc-tds">${sw}${rows.join('')}${add}
    <div class="pc-note">TĐ1 ban đầu · TĐ2 có phát sinh · TĐ3 quyết toán – số <b>kế hoạch</b> nhập tay (trước VAT, tỷ đồng) · dòng nhỏ <b>HT</b> = số hệ thống: DT theo HĐ gốc / HĐ + phụ lục / quyết toán; CP = thầu phụ cùng mốc + chi phí khác có ngày ≤ ngày chốt${
      tt ? ' · dòng <b>Tiền thực tế</b> = tiền đã về và tiền đã chi ra đến ngày chốt (sau VAT, không gồm vay / trả nợ gốc)' : ''}</div></div>`;
}
function bTdDialog(d, n) {
  const t = (d.thoi_diem || []).find((x) => x.td === n);
  const last = Math.max(0, ...(d.thoi_diem || []).map((x) => x.td));
  const dlg = document.createElement('dialog');
  dlg.className = 'pass-dlg f-dlg';
  const mv = (x) => (x === null || x === undefined ? '' : bf.format(x));
  dlg.innerHTML = `<form method="dialog" class="stack">
    <h3>TĐ${n} – ${TD_TEN[n]} · ${esc(d.ma_du_an)}</h3>
    <p class="muted small">Doanh thu – chi phí ${TD_TEN[n].toLowerCase()} của công trình (trước VAT, đồng). Hệ thống hiện kèm số theo ${TD_HT[n]} để đối chiếu.</p>
    <label>Ngày ${n === 1 ? 'ký HĐ / lập dự toán' : n === 2 ? 'phát sinh (phụ lục)' : 'quyết toán'}<input name="ngay" type="date" value="${t?.ngay || bTodayIso()}" required></label>
    <label>Doanh thu ${TD_TEN[n].toLowerCase()} (đồng)<input name="dt" class="money" value="${mv(t?.dt)}" required></label>
    <label>Chi phí ${TD_TEN[n].toLowerCase()} (đồng)<input name="cp" class="money" value="${mv(t?.cp)}" required></label>
    <label>Ghi chú<input name="ghi_chu" maxlength="200" value="${esc(t?.ghi_chu || '')}" placeholder="VD: số kế toán chốt quý III"></label>
    <div class="td-sys muted small"></div>
    <button type="button" class="sm" data-fill>Lấy số hệ thống theo ${TD_HT[n]}</button>
    <div class="msg" role="alert"></div>
    <div class="actions"><button type="submit" class="primary">Lưu</button>${t && n === last ? '<button type="button" class="danger" data-del>Xóa TĐ' + n + '</button>' : ''}<button type="button" data-x>Hủy</button></div>
  </form>`;
  document.body.appendChild(dlg);
  const f = $('form', dlg);
  $$('input.money', f).forEach(attachMoneyInput);
  const sysNote = () => {
    const s = bSysMoc(d, n, f.elements.ngay.value || bTodayIso());
    $('.td-sys', f).innerHTML = `Hệ thống theo ${TD_HT[n]}: DT <b>${bn(s.dt)}</b> · CP <b>${bn(s.cp)}</b> · LN <b>${bn(s.ln)}</b> đ`;
    return s;
  };
  sysNote();
  f.elements.ngay.addEventListener('change', sysNote);
  $('[data-fill]', f).addEventListener('click', () => { const s = sysNote(); f.elements.dt.value = bf.format(s.dt); f.elements.cp.value = bf.format(s.cp); });
  const close = () => { dlg.close(); dlg.remove(); };
  const done = (list) => { d.thoi_diem = list; close(); if (pcOpenId) bPcOpen(pcOpenId); else renderReport(); };
  $('[data-x]', f).addEventListener('click', close);
  $('[data-del]', f)?.addEventListener('click', async () => {
    if (!confirm(`Xóa số liệu TĐ${n} của ${d.ma_du_an}?`)) return;
    try { await api(`/api/du-an/${d.id}/thoi-diem/${n}`, { method: 'DELETE' }); done((d.thoi_diem || []).filter((x) => x.td !== n)); }
    catch (err) { showMsg($('.msg', f), err.message, 'err'); }
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dt = parseMoney(f.elements.dt.value), cp = parseMoney(f.elements.cp.value);
    if (dt === '' || cp === '') return showMsg($('.msg', f), 'Nhập đủ Doanh thu và Chi phí thực tế', 'err');
    try {
      const list = await api(`/api/du-an/${d.id}/thoi-diem/${n}`, { method: 'PUT', body: JSON.stringify({ ngay: f.elements.ngay.value, dt: Number(dt), cp: Number(cp), ghi_chu: f.elements.ghi_chu.value }) });
      done(list.map(({ du_an_id, ...x }) => x));
    } catch (err) { showMsg($('.msg', f), err.message, 'err'); }
  });
  dlg.showModal();
}

function bPcDraw(card) {
  const id = Number(card.dataset.pc);
  const d = BC.du_an.find((x) => x.id === id);
  if (!d) return;
  const P = bPeriod(bScope().list);
  const H = card.closest('#pc-modal') ? 340 : 170; // khung tổng quan nhanh: biểu đồ cao gấp đôi
  const ch = $('[data-pcchart]', card);
  if (ch) {
    const pts = bSeries([d], BST.vat, P);
    if (ch.dataset.pcchart === 'dong') bColChart(ch, pts, [{ key: 'thu', name: 'Thu', color: BCOL.thu }, { key: 'chi', name: 'Chi', color: BCOL.chi }], { height: H, valueLabels: pts.length <= 4 });
    else bColChart(ch, pts, [{ key: 'dt', name: 'Doanh thu', color: BCOL.dt }, { key: 'cp', name: 'Chi phí', color: BCOL.cp }, { key: 'ln', name: 'Lợi nhuận', color: BCOL.dk }], { height: H, valueLabels: pts.length <= 4 });
  }
  const dn = $('[data-pcdonut]', card);
  if (dn) bMiniDonut(dn, JSON.parse(dn.dataset.pcdonut));
}

function bMiniDonut(el, parts) {
  const total = parts.reduce((s2, x) => s2 + x.val, 0);
  if (!total) return bEmpty(el, 'Chưa có chi phí');
  const S = 92, R = 44, r0 = 27, c = S / 2;
  el.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S, role: 'img', 'aria-label': 'Cơ cấu chi phí' }, el);
  let a = 0;
  const pt = (ang, rr) => [c + rr * Math.sin(ang), c - rr * Math.cos(ang)];
  for (const x of parts) {
    let a1 = a + (x.val / total) * Math.PI * 2;
    if (a1 - a >= Math.PI * 2 - 1e-9) a1 = a + Math.PI * 2 - 1e-4;
    const big = a1 - a > Math.PI ? 1 : 0;
    const [x0, y0] = pt(a, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r0), [x3, y3] = pt(a, r0);
    const path = svgEl('path', { d: `M${x0},${y0}A${R},${R} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${big} 0 ${x3},${y3}Z`, fill: x.c, stroke: '#fff', 'stroke-width': 1.5 }, svg);
    path.addEventListener('mousemove', (e) => showTip(`<b>${esc(x.l)}</b><br>${bn(x.val)} đ · ${bpct(x.val, total)}`, e.clientX, e.clientY));
    path.addEventListener('mouseleave', hideTip);
    a = a1;
  }
  svgEl('text', { x: c, y: c + 4, 'text-anchor': 'middle', class: 'pc-donut-c' }, svg).textContent = bTy(total);
  const ul = document.createElement('ul');
  ul.className = 'pc-legend';
  ul.innerHTML = parts.map((x) => `<li><i style="background:${x.c}"></i><span title="${esc(x.l)}">${esc(x.l)}</span><b>${bpct(x.val, total).replace(',0%', '%')}</b></li>`).join('');
  el.appendChild(ul);
}

// Ảnh công trình: thu nhỏ (cạnh dài ≤ 1280px, JPEG) rồi tải lên
async function bUploadImage(id, file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WEBP');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.85));
  const r = await fetch(`/api/du-an/${id}/anh`, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'X-Requested-With': 'fetch' }, body: blob });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error((j.errors || [j.error]).filter(Boolean).join('; ') || 'Không tải được ảnh'); }
}

$('#b-report').addEventListener('click', async (e) => {
  const tile = e.target.closest('[data-pctile]');
  if (tile) return bPcOpen(Number(tile.dataset.pctile));
  if (e.target.closest('[data-pcclose]') || e.target.id === 'pc-modal') return bPcClose();
  const card = e.target.closest('.pc-card');
  if (!card) return;
  const id = Number(card.dataset.pc);
  if (e.target.closest('[data-pcth]')) { // bật/tắt số thực hiện, giữ tab đang xem
    BST.th_on = !BST.th_on;
    const tab = $('.pc-tabs button.on', card)?.dataset.pt || 'dt';
    $('.pc-body', card).innerHTML = bPcBody(BC.du_an.find((x) => x.id === id), tab);
    return bPcDraw(card);
  }
  if (e.target.closest('[data-tdtt]')) { // bật/tắt dòng thực tế cho mọi TĐ, giữ nguyên tab đang xem
    BST.td_tt = !BST.td_tt;
    $('.pc-body', card).innerHTML = bPcBody(BC.du_an.find((x) => x.id === id), 'tong');
    return bPcDraw(card);
  }
  if (e.target.closest('[data-pcngay]')) return bNgayDialog(BC.du_an.find((x) => x.id === id));
  const te = e.target.closest('[data-tdedit]');
  if (te) return bTdDialog(BC.du_an.find((x) => x.id === id), Number(te.dataset.tdedit));
  const t = e.target.closest('[data-pt]');
  if (t) {
    pcTab[id] = t.dataset.pt;
    $$('.pc-tabs button', card).forEach((b) => b.classList.toggle('on', b === t));
    $('.pc-body', card).innerHTML = bPcBody(BC.du_an.find((x) => x.id === id), t.dataset.pt);
    return bPcDraw(card);
  }
  if (e.target.closest('[data-pdetail]')) {
    bPcClose();
    BST.project = String(id); BST.chi_tiet = true; bSave(); renderReport();
    return $('.b-detail-bar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (e.target.closest('[data-pcimgdel]')) {
    e.stopPropagation();
    if (!confirm('Xóa ảnh công trình này?')) return;
    try { await api(`/api/du-an/${id}/anh`, { method: 'DELETE' }); await loadReport(); } catch (err) { alert(err.message); }
    return;
  }
  if (e.target.closest('[data-pcimg]')) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp';
    inp.onchange = async () => {
      if (!inp.files[0]) return;
      showMsg($('#b-msg'), 'Đang tải ảnh lên...');
      try { await bUploadImage(id, inp.files[0]); showMsg($('#b-msg'), 'Đã cập nhật ảnh công trình'); await loadReport(); }
      catch (err) { showMsg($('#b-msg'), err.message, 'err'); }
    };
    inp.click();
  }
});

// ---------------------------------------------------------------------
// Sự kiện
// ---------------------------------------------------------------------
$('#b-project').addEventListener('change', (e) => { BST.project = e.target.value; BST.chi_tiet = false; bSave(); renderReport(); });
$('#b-vat').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; BST.vat = b.dataset.v; bSave(); renderReport(); });
$('#b-ky').addEventListener('change', (e) => { BST.ky = e.target.value; bSave(); renderReport(); });
$('#b-ky-custom').addEventListener('change', () => { BST.tu = $('#b-tu').value; BST.den = $('#b-den').value; bSave(); renderReport(); });
$('#b-reload').addEventListener('click', () => loadReport().catch((err) => alert(err.message)));
$('#b-report').addEventListener('click', (e) => {
  if (e.target.id === 'b-open-all' || e.target.id === 'b-close-all') $$('#b-report details.b-proj').forEach((d) => (d.open = e.target.id === 'b-open-all'));
  if (e.target.id === 'f-set-target') return bTargetDialog();
  const kp = e.target.closest('[data-kypick]');
  if (kp) return $('.ky-pop') ? $('.ky-pop').remove() : bKyPopover(kp);
  if (e.target.id === 'b-detail-toggle') return bSetDetail(!BST.chi_tiet);
  if (e.target.id === 'pc-back') {
    BST.project = ''; BST.chi_tiet = false; bSave(); renderReport(); // về tổng quan -> tự ẩn chi tiết
    return $('#pc-sec')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const go = e.target.dataset.bgo;
  if (go) { e.preventDefault(); revProjectId = Number(e.target.dataset.id); showTab(go); }
  const ttd = e.target.closest('[data-ttd]');
  if (ttd) return bThucDrill(ttd.dataset.ttd);
});
let bResize;
window.addEventListener('resize', () => { clearTimeout(bResize); bResize = setTimeout(() => { if (BC && !$('#tab-report').hidden) bDrawCharts(bScope().list, BST.vat, bScope().one); }, 200); });

// Ẩn / hiện khối Phân tích chi tiết (I → V); vẽ lại biểu đồ khi hiện
function bSetDetail(on) {
  BST.chi_tiet = on;
  bSave();
  const box = $('#b-detail'), btn = $('#b-detail-toggle');
  if (!box) return;
  box.hidden = !on;
  btn.textContent = on ? 'Ẩn chi tiết ▴' : 'Hiện chi tiết ▾';
  btn.classList.toggle('primary', !on);
  if (on) { const { list, one } = bScope(); bDrawCharts(list, BST.vat, one); }
}

// In / PDF: mở hết chi tiết, vẽ lại biểu đồ theo khổ giấy
let bOpenState = null;
let bDetailWas = null;
window.addEventListener('beforeprint', () => {
  if ($('#tab-report').hidden || !BC) return;
  bDetailWas = BST.chi_tiet;
  if ($('#b-detail')) $('#b-detail').hidden = false;
  bOpenState = $$('#b-report details.b-proj').map((d) => d.open);
  $$('#b-report details.b-proj').forEach((d) => (d.open = true));
});
window.addEventListener('afterprint', () => {
  if (bDetailWas === false && $('#b-detail')) $('#b-detail').hidden = true;
  bDetailWas = null;
  if (!bOpenState) return;
  $$('#b-report details.b-proj').forEach((d, i) => (d.open = bOpenState[i]));
  bOpenState = null;
});
$('#b-print').addEventListener('click', () => { logEvent('in_pdf', bLogScope()); window.print(); });

// ---------------------------------------------------------------------
// Tải thư viện xuất (nhúng sẵn trong /vendor, chỉ tải khi cần)
// ---------------------------------------------------------------------
const bLibs = {};
function bLoad(src) {
  return (bLibs[src] ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Không tải được thư viện xuất file'));
    document.head.appendChild(s);
  }));
}
const bStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const bFileScope = () => { const { one } = bScope(); return one ? one.ma_du_an.replace(/[^\w-]+/g, '') : 'TatCaDuAn'; };
async function bBusy(btn, fn) {
  const t = btn.textContent;
  btn.disabled = true; btn.textContent = 'Đang xuất...';
  try { await fn(); showMsg($('#b-msg'), ''); } catch (err) { showMsg($('#b-msg'), err.message, 'err'); }
  btn.disabled = false; btn.textContent = t;
}

// ---------- Excel ----------
// Excel theo mẫu trình ký TMN: máy chủ dựng file có định dạng sẵn (logo, font, màu, công thức) cho các dự án đang xem
$('#b-xlsx-tmn').addEventListener('click', (e) => bBusy(e.target, async () => {
  const ids = bScope().list.map((d) => d.id).join(',');
  const r = await fetch(`/api/bao-cao/dtcp.xlsx?ids=${ids}`, { credentials: 'same-origin' });
  if (!r.ok) { let m = 'Không xuất được file'; try { m = (await r.json()).errors.join('; '); } catch { /* không phải JSON */ } throw new Error(m); }
  const blob = await r.blob();
  const name = (r.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1] || 'BaoCao_DTCP_TMN.xlsx';
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}));
// ---------- Excel tổng hợp: định dạng theo mẫu trình ký TMN (ExcelJS) ----------
// Mỗi trang: logo + thông tin công ty, đường kẻ, tiêu đề, ngày cập nhật; bảng Times New Roman, tiêu đề navy, khung viền,
// số #,##0, tỷ lệ 0,0%, dòng TỔNG CỘNG (SUBTOTAL – lọc vẫn đúng), cố định tiêu đề, in ngang vừa trang.
const XL = { FONT: 'Times New Roman', NAVY: 'FF002060', YELLOW: 'FFFFFF00', PEACH: 'FFF8CBAD', RED: 'FFFF0000',
  NUM: '#,##0;(#,##0);"-"', PCT: '0.0%;-0.0%;"-"' };
const xlDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s.split('-').reverse().join('/') : s || '');
function xlBook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = BC.nguoi_lap || 'PROJECT PROFIT';
  wb.created = new Date();
  return wb;
}
// Khung đầu trang chuẩn TMN. Trả về số dòng bắt đầu nội dung.
function xlHeader(wb, ws, logoId, { title, sub, widths: w0 }) {
  // Trang hẹp: thêm cột trống bên phải cho đủ chỗ khung thông tin công ty (~115 ký tự)
  const widths = [...w0];
  while (widths.reduce((s, x) => s + x, 0) < 115) widths.push(16);
  const n = widths.length;
  const CT = BC.cong_ty || { ten: BC.ten_cong_ty || '', dong: [] };
  ws.columns = widths.map((w) => ({ width: w }));
  // Logo chiếm các cột đầu (~30 ký tự); thông tin công ty căn giữa phần còn lại
  let k = 0, acc = 0;
  while (k < n - 1 && acc < 30) acc += widths[k++];
  const from = Math.max(1, Math.min(k, n - 1)) + 1;
  [CT.ten, ...CT.dong].forEach((t, i) => {
    const r = i + 1;
    if (from < n) ws.mergeCells(r, from, r, n);
    const c = ws.getCell(r, from);
    c.value = t;
    c.font = { name: XL.FONT, size: i ? 11 : 13, bold: !i };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = i ? 18 : 21;
  });
  if (logoId !== null) ws.addImage(logoId, { tl: { col: 0.15, row: 0.1 }, ext: { width: 150, height: 95 }, editAs: 'oneCell' });
  for (let c = 1; c <= n; c++) ws.getCell(6, c).border = { bottom: { style: 'medium' } };
  ws.getRow(6).height = 8;
  ws.mergeCells(7, 1, 7, n);
  Object.assign(ws.getCell(7, 1), { value: title });
  ws.getCell(7, 1).font = { name: XL.FONT, size: 20, bold: true, color: { argb: XL.NAVY } };
  ws.getCell(7, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(7).height = 34;
  ws.mergeCells(8, 1, 8, n);
  ws.getCell(8, 1).value = sub;
  ws.getCell(8, 1).font = { name: XL.FONT, size: 12, bold: true };
  ws.getCell(8, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(8).height = 20;
  ws.pageSetup = { orientation: 'landscape', paperSize: n > 10 ? 8 : 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
  ws.headerFooter = { oddFooter: '&L&"Times New Roman"&9PROJECT PROFIT · Ban Kiểm soát&R&"Times New Roman"&9Trang &P/&N' };
  return 10;
}
const xlBox = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
function xlHeadRow(ws, r, head) {
  head.forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { name: XL.FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.NAVY } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = xlBox;
  });
  ws.getRow(r).height = Math.max(30, 15 * Math.ceil(Math.max(...head.map((h, i) => String(h).length / Math.max(6, (ws.getColumn(i + 1).width || 10) - 2)))));
}
// fmt: mảng kiểu cột 'num' | 'pct' | 'int' | 'txt' | 'date' (bỏ trống: tự đoán từ tiêu đề và giá trị)
function xlGuess(head, rows) {
  return head.map((h, i) => {
    const t = String(h);
    if (/^%|tỷ suất|tỷ trọng|% hoàn thành|% KH|% đạt|% thay đổi/i.test(t) && !/tiến độ|VAT/i.test(t)) return 'pct';
    if (/^ngày/i.test(t)) return 'date';
    if (/VAT %|tiến độ|^số |số PL|số HĐ|HĐTP|cảnh báo|HĐ đã QT/i.test(t)) return 'int';
    return rows.some((r) => typeof r[i] === 'number' && Math.abs(r[i]) >= 1000) ? 'num' : 'txt';
  });
}
function xlRows(ws, r0, rows, fmt, { band } = {}) {
  rows.forEach((row, j) => {
    const r = r0 + j;
    row.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = fmt[i] === 'date' ? xlDate(v) : v === null || v === undefined ? '' : v;
      c.font = { name: XL.FONT, size: 11 };
      c.border = xlBox;
      if (fmt[i] === 'num') c.numFmt = XL.NUM;
      if (fmt[i] === 'pct') c.numFmt = XL.PCT;
      c.alignment = { vertical: 'middle', wrapText: fmt[i] === 'txt', horizontal: ['date', 'int', 'pct'].includes(fmt[i]) ? 'center' : undefined };
      if (band && j % 2) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5FA' } };
    });
  });
}
function xlTotal(ws, r, from, to, fmt, label = 'TỔNG CỘNG') {
  fmt.forEach((f, i) => {
    const c = ws.getCell(r, i + 1);
    const col = ws.getColumn(i + 1).letter;
    if (f === 'num') { c.value = { formula: `SUBTOTAL(9,${col}${from}:${col}${to})` }; c.numFmt = XL.NUM; }
    c.font = { name: XL.FONT, size: 11, bold: true, color: { argb: XL.RED } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.YELLOW } };
    c.border = xlBox;
  });
  const firstNum = fmt.findIndex((f) => f === 'num');
  if (firstNum > 0) {
    ws.mergeCells(r, 1, r, firstNum);
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  }
  ws.getRow(r).height = 24;
}
// Bảng dữ liệu một trang: tiêu đề cột + dòng + tổng cộng; cố định tiêu đề, lọc
function xlTable(wb, logoId, name, title, sub, head, rows, widths, { total = true } = {}) {
  const ws = wb.addWorksheet(name);
  const r0 = xlHeader(wb, ws, logoId, { title, sub, widths });
  xlHeadRow(ws, r0, head);
  const fmt = xlGuess(head, rows);
  xlRows(ws, r0 + 1, rows, fmt, { band: true });
  if (rows.length) {
    ws.autoFilter = { from: { row: r0, column: 1 }, to: { row: r0 + rows.length, column: head.length } };
    if (total && fmt.includes('num')) xlTotal(ws, r0 + rows.length + 1, r0 + 1, r0 + rows.length, fmt);
  } else {
    ws.mergeCells(r0 + 1, 1, r0 + 1, head.length);
    ws.getCell(r0 + 1, 1).value = 'Không có dữ liệu';
    ws.getCell(r0 + 1, 1).font = { name: XL.FONT, size: 11, italic: true };
    ws.getCell(r0 + 1, 1).alignment = { horizontal: 'center' };
  }
  ws.views = [{ state: 'frozen', ySplit: r0, xSplit: 0, zoomScale: 90 }];
  ws.pageSetup.printTitlesRow = `${r0}:${r0}`;
  return ws;
}
// Trang dạng biểu mẫu nhiều khối: mỗi khối có tiêu đề navy + các dòng (fmt riêng theo khối)
function xlForm(wb, logoId, name, title, sub, blocks, widths) {
  const ws = wb.addWorksheet(name);
  let r = xlHeader(wb, ws, logoId, { title, sub, widths });
  for (const b of blocks) {
    if (b.info) { // dòng thông tin: nhãn đậm – giá trị
      b.info.forEach(([k, v]) => {
        ws.getCell(r, 1).value = k; ws.getCell(r, 1).font = { name: XL.FONT, size: 11, bold: true };
        if (widths.length > 2) ws.mergeCells(r, 2, r, widths.length);
        ws.getCell(r, 2).value = v; ws.getCell(r, 2).font = { name: XL.FONT, size: 11 };
        r++;
      });
      r++;
      continue;
    }
    xlHeadRow(ws, r, b.head);
    const fmt = b.fmt || xlGuess(b.head, b.rows);
    xlRows(ws, r + 1, b.rows, fmt);
    // dòng tỷ lệ trong khối số tiền: định dạng %
    b.rows.forEach((row, j) => {
      if (b.pctRows && b.pctRows.includes(row[0])) for (let i = 1; i < row.length; i++) { const c = ws.getCell(r + 1 + j, i + 1); c.value = row[i] === '' ? '' : row[i]; c.numFmt = XL.PCT; c.alignment = { horizontal: 'right' }; }
      if (b.bold && b.bold.includes(row[0])) for (let i = 0; i < row.length; i++) { const c = ws.getCell(r + 1 + j, i + 1); c.font = { name: XL.FONT, size: 11, bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.PEACH } }; }
    });
    r += b.rows.length + 2;
  }
  ws.views = [{ state: 'normal', zoomScale: 90 }];
  return ws;
}
async function xlLogo(wb) {
  try {
    const buf = await (await fetch('/img/tmn-logo.png')).arrayBuffer();
    return wb.addImage({ buffer: buf, extension: 'png' });
  } catch { return null; } // không tải được logo: vẫn xuất file
}
async function xlSave(wb, name) {
  const buf = await wb.xlsx.writeBuffer();
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

$('#b-xlsx').addEventListener('click', (e) => bBusy(e.target, async () => {
  logEvent('xuat_excel', bLogScope());
  await bLoad('/vendor/exceljs-4.4.0.min.js');
  const { list, one } = bScope();
  const v = BST.vat, vt = v === 'gt' ? 'trước VAT' : 'sau VAT';
  const T = bTotals(list);
  const wb = xlBook();
  const logo = await xlLogo(wb);
  const today = bTodayIso().split('-').reverse().join('/');
  const pham = one ? `${one.ma_du_an} – ${one.ten_du_an}` : `Tất cả dự án (${list.length})`;
  const sub = (x) => `CẬP NHẬT: NGÀY ${today} · ${pham}${x ? ' · ' + x : ''}`;
  const F = bFinData(list, v);
  const chg = (a, b) => (F.prv && b ? (a - b) / Math.abs(b) : '');
  const tsY = F.ytd.dt ? F.ytd.ln / F.ytd.dt : 0;
  const pctT = (a, t) => (t ? a / t : '');
  const N4 = ['txt', 'num', 'num', 'pct'];
  xlForm(wb, logo, 'Tai chinh ky', 'TỔNG QUAN TÀI CHÍNH THEO KỲ', sub(`Đơn vị: đồng, ${vt} (dòng tiền sau VAT)`), [
    { info: [['Kỳ báo cáo', `${F.P.label} (${F.P.range})`], ['So với kỳ trước', F.P.prev ? `${ymTxt(F.P.prev.from)} – ${ymTxt(F.P.prev.to)}` : '—']] },
    { head: ['Chỉ tiêu', 'Kỳ này', 'Kỳ trước', '% thay đổi'], fmt: N4, pctRows: ['Tỷ suất lợi nhuận'], bold: ['Lợi nhuận', 'Dòng tiền thực tế (thu − chi)'], rows: [
      ['Tổng doanh thu', F.cur.dt, F.prv ? F.prv.dt : '', chg(F.cur.dt, F.prv?.dt)],
      ['Tổng chi phí', F.cur.cp, F.prv ? F.prv.cp : '', chg(F.cur.cp, F.prv?.cp)],
      ['Lợi nhuận', F.cur.ln, F.prv ? F.prv.ln : '', chg(F.cur.ln, F.prv?.ln)],
      ['Tỷ suất lợi nhuận', F.cur.dt ? F.cur.ln / F.cur.dt : 0, F.prv && F.prv.dt ? F.prv.ln / F.prv.dt : '', ''],
      ['Dòng tiền thực tế (thu − chi)', F.cur.dong_tien, F.prv ? F.prv.dong_tien : '', chg(F.cur.dong_tien, F.prv?.dong_tien)],
      ['   Thu (tiền về + nhận tiền vay)', F.cur.thu, F.prv ? F.prv.thu : '', ''], ['   Chi', F.cur.chi, F.prv ? F.prv.chi : '', ''],
      ['Số dư dòng tiền cuối kỳ', F.bal, '', '']] },
    { head: [`Mục tiêu năm ${F.year}`, `Thực hiện 01/${F.year} – ${ymTxt(F.P.to)}`, 'Mục tiêu', '% đạt'], fmt: N4, pctRows: ['Tỷ suất lợi nhuận'], rows: [
      ['Doanh thu', F.ytd.dt, F.tg.dt ?? '', pctT(F.ytd.dt, F.tg.dt)], ['Chi phí', F.ytd.cp, F.tg.cp ?? '', pctT(F.ytd.cp, F.tg.cp)],
      ['Lợi nhuận', F.ytd.ln, F.tg.ln ?? '', pctT(F.ytd.ln, F.tg.ln)],
      ['Tỷ suất lợi nhuận', tsY, F.tg.ty_suat != null ? F.tg.ty_suat / 100 : '', pctT(tsY * 100, F.tg.ty_suat)]] },
    { head: ['Theo tháng / quý', 'Doanh thu', 'Chi phí', 'Lợi nhuận', 'Thu', 'Chi', 'Dòng tiền'], fmt: ['txt', 'num', 'num', 'num', 'num', 'num', 'num'],
      rows: F.series.map((p) => [p.label, p.dt, p.cp, p.ln, p.thu, p.chi, p.dong_tien]) },
    { head: ['Hiệu quả từng công trình', 'Doanh thu', 'Chi phí', 'Lợi nhuận', 'Tỷ suất LN', 'Tỷ trọng doanh thu'], fmt: ['txt', 'num', 'num', 'num', 'pct', 'pct'],
      rows: F.rows.map((x) => [`${x.d.ma_du_an} – ${x.d.ten_du_an}`, x.dt, x.cp, x.ln, x.dt ? x.ln / x.dt : '', F.cur.dt ? x.dt / F.cur.dt : '']) },
  ], [44, 22, 22, 20, 20, 20, 20]);
  const lnDk = T.dk.dt[v] - T.dk.cp[v], lnTh = T.th.dt[v] - T.th.cp[v];
  xlForm(wb, logo, 'Tong quan', 'BÁO CÁO TỔNG QUAN DỰ ÁN', sub(`Đơn vị: đồng, ${vt}`), [
    { info: [['Người lập', BC.nguoi_lap], ['Lập lúc', new Date(BC.lap_luc).toLocaleString('vi-VN')], ['Phiên bản', BC.phien_ban]] },
    { head: ['Chỉ tiêu', 'Dự kiến', 'Thực hiện'], fmt: ['txt', 'num', 'num'], pctRows: ['Tỷ suất lợi nhuận'], bold: ['Lợi nhuận'], rows: [
      ['Doanh thu', T.dk.dt[v], T.th.dt[v]], ['Chi phí', T.dk.cp[v], T.th.cp[v]], ['Lợi nhuận', lnDk, lnTh],
      ['Tỷ suất lợi nhuận', T.dk.dt[v] ? lnDk / T.dk.dt[v] : 0, T.th.dt[v] ? lnTh / T.th.dt[v] : 0]] },
    { head: ['Dòng tiền & công nợ (sau VAT)', 'Giá trị'], fmt: ['txt', 'num'], rows: [
      ['Tiền về', T.tien_ve], ['Còn phải thu (theo nghiệm thu)', T.th.con_lai], ['Còn lại theo HĐ', T.dk.con_lai],
      ['Đã trả thầu phụ', T.tp_da_tt], ['Còn phải trả thầu phụ', T.tp_con_lai], ['Trả nợ gốc vay (không tính chi phí)', T.tra_goc]] },
    { head: ['Số lượng', 'Số'], fmt: ['txt', 'int'], rows: [
      ['Số dự án', T.so_da], ['HĐ chủ đầu tư', T.so_hd], ['HĐ CĐT đã quyết toán', T.so_hd_qt], ['HĐ thầu phụ', T.so_tp], ['HĐ thầu phụ đã quyết toán', T.so_tp_qt]] },
  ], [44, 24, 24]);
  {
    const P2 = bPeriod(list), to = P2.to < bNowYm() ? P2.to : bNowYm();
    const R = list.map((d) => ({ d, ...bThuc(d, to) }));
    xlTable(wb, logo, 'Thuc thu thuc chi', 'THỰC THU – THỰC CHI – CÒN LẠI THỰC', sub(`Lũy kế đến hết ${ymTxt(to)} · đồng, sau VAT`),
      ['Mã DA', 'Tên dự án', 'Kế hoạch thu', 'Thực thu', '% KH thu', 'Còn phải thu', 'Kế hoạch chi',
        'Thực chi', 'Trong đó: chi phí', 'Trong đó: trả thầu phụ', '% KH chi', 'Còn phải chi', 'Còn lại thực (thu − chi)', 'Nhận tiền vay', 'Trả nợ gốc vay', 'Sau vay & trả nợ', 'Dư nợ vay'],
      R.map((x) => [x.d.ma_du_an, x.d.ten_du_an, x.kh_thu, x.thu, x.kh_thu ? x.thu / x.kh_thu : null, x.phai_thu, x.kh_chi, x.chi, x.cp, x.tp,
        x.kh_chi ? x.chi / x.kh_chi : null, x.phai_chi, x.con, x.vay, x.goc, x.sau_goc, x.du_no]), [10, 32, 18, 18, 9, 18, 18, 18, 18, 18, 9, 18, 20, 16, 16, 18, 16]);
  }
  xlTable(wb, logo, 'Du an', 'TỔNG HỢP THEO DỰ ÁN', sub(`Đơn vị: đồng, ${vt} (tiền về, phải thu, phải trả: sau VAT)`),
    ['Mã DA', 'Tên dự án', 'Chủ đầu tư', 'Trạng thái', 'Tiến độ %', 'Số HĐ CĐT', 'HĐ đã QT', 'Số HĐTP', 'HĐTP đã QT',
      'DT dự kiến', 'CP dự kiến', 'LN dự kiến', 'DT thực hiện', 'CP thực hiện', 'LN thực hiện',
      'Tiền về', 'Còn phải thu', 'Đã trả TP', 'Còn phải trả TP', 'Trả nợ gốc vay', 'Số cảnh báo'],
    list.map((d) => [d.ma_du_an, d.ten_du_an, d.chu_dau_tu, d.trang_thai, d.tien_do, d.so_hd, d.so_hd_qt, d.so_tp, d.so_tp_qt,
      d.du_kien.doanh_thu[v], d.du_kien.chi_phi[v], d.du_kien.doanh_thu[v] - d.du_kien.chi_phi[v],
      d.thuc_hien.doanh_thu[v], d.thuc_hien.chi_phi[v], d.thuc_hien.doanh_thu[v] - d.thuc_hien.chi_phi[v],
      d.tien_ve, d.thuc_hien.con_lai, d.tp.da_tt, d.tp.con_lai, d.tra_goc.sv, d.canh_bao.length]),
    [10, 32, 28, 14, 9, 9, 9, 9, 10, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 16, 10]);
  xlTable(wb, logo, 'HD chu dau tu', 'HỢP ĐỒNG CHỦ ĐẦU TƯ', sub(`Đơn vị: đồng, ${vt} (tiền về, phải thu, đã trả: sau VAT)`),
    ['Mã DA', 'Số HĐ', 'Ngày HĐ', 'VAT %', 'Số PL', 'Giá trị HĐ+PL', 'Nghiệm thu', '% hoàn thành', 'Đã quyết toán',
      'DT dự kiến', 'Tiền về', 'Còn phải thu', 'Số HĐTP', 'HĐTP đã QT', 'Giá trị TP HT/QT', 'Đã trả TP', 'Còn phải trả TP', 'Lãi gộp dự kiến'],
    list.flatMap((d) => d.hds.map((x) => [d.ma_du_an, x.so_ma, x.ngay || '', x.vat, x.so_pl, x.hd[v], x.nt[v], x.pct_ht, x.da_qt ? 'Có' : '',
      x.dk[v], x.tien_ve, x.phai_thu, x.tp.n, x.tp.n_qt, v === 'gt' ? x.tp.qt_gt : x.tp.qt_sv, x.tp.da_tt, x.tp.con_lai, x.dk[v] - (v === 'gt' ? x.tp.qt_gt : x.tp.qt_sv)])),
    [10, 24, 12, 7, 7, 18, 18, 11, 11, 18, 18, 18, 9, 10, 18, 18, 18, 18]);
  xlTable(wb, logo, 'Thau phu', 'HỢP ĐỒNG THẦU PHỤ', sub('Đơn vị: đồng'),
    ['Mã DA', 'Thuộc HĐ CĐT', 'Số HĐ thầu phụ', 'Nhà thầu phụ', 'Số PL', 'Giá trị HĐ+PL (sau VAT)', 'HT/QT (trước VAT)', 'HT/QT (sau VAT)', 'Đã thanh toán', 'Còn lại', 'Trạng thái', 'Ghi chú'],
    list.flatMap((d) => d.chi_tiet.thau_phu.map((x) => [d.ma_du_an, x.hd_cdt, x.so_ma, x.doi_tac, x.so_pl, x.hd_sv, x.qt_gt, x.qt_sv, x.da_tt, x.con_lai, x.trang_thai, x.ghi_chu])),
    [10, 24, 18, 28, 7, 18, 18, 18, 18, 18, 20, 36]);
  xlTable(wb, logo, 'Chi phi', 'CHI TIẾT CHI PHÍ', sub('Đơn vị: đồng'),
    ['Mã DA', 'Khối', 'Nhóm', 'Hạng mục', 'Nội dung', 'Đối tác', 'Số CT', 'Ngày', 'Trước VAT', 'VAT %', 'Tiền VAT', 'Sau VAT', 'Tính vào chi phí', 'Ghi chú'],
    list.flatMap((d) => d.chi_tiet.chi_phi.map((x) => [d.ma_du_an, x.khoi, x.nhom, x.hang_muc, x.noi_dung, x.doi_tac, x.so_ct, x.ngay || '', x.gia_tri, x.vat, x.tien_vat, x.sau_vat, x.tinh_cp, x.ghi_chu])),
    [10, 18, 26, 26, 34, 24, 18, 12, 17, 7, 15, 17, 18, 28]);
  xlTable(wb, logo, 'Doanh thu', 'CHI TIẾT DOANH THU (HĐ / PHỤ LỤC / NGHIỆM THU)', sub('Đơn vị: đồng'),
    ['Mã DA', 'Loại', 'Số HĐ/PL – Đợt', 'Thuộc HĐ', 'Ngày', 'Trước VAT', 'VAT %', 'Tiền VAT', 'Sau VAT', 'Ghi chú'],
    list.flatMap((d) => d.chi_tiet.doanh_thu.map((x) => [d.ma_du_an, x.loai, x.so_hieu, x.thuoc_hd, x.ngay || '', x.gia_tri, x.vat, x.tien_vat, x.sau_vat, x.ghi_chu])),
    [10, 9, 28, 26, 12, 18, 7, 16, 18, 30], { total: false }); // HĐ và nghiệm thu cùng bảng: cộng chung không có nghĩa
  xlTable(wb, logo, 'Tien ve', 'CHI TIẾT TIỀN VỀ', sub('Đơn vị: đồng, sau VAT'),
    ['Mã DA', 'HĐ', 'Loại', 'Ngày', 'Số tiền', 'Ghi chú'],
    list.flatMap((d) => d.chi_tiet.tien_ve.map((x) => [d.ma_du_an, x.hd, x.loai, x.ngay || '', x.so_tien, x.ghi_chu])), [10, 28, 16, 12, 20, 34]);
  xlTable(wb, logo, 'Theo thang', 'DOANH THU – CHI PHÍ – DÒNG TIỀN THEO THÁNG', sub(`Đơn vị: đồng, ${vt} (thu, chi: sau VAT)`),
    ['Tháng', 'DT thực hiện', 'CP thực hiện', 'DT lũy kế', 'CP lũy kế', 'Thu (tiền về + vay)', 'Chi', 'Chênh lệch thu – chi'],
    bMonths(list, v).map((p) => [p.k.split('-').reverse().join('/'), p.dt, p.cp, p.luy_dt, p.luy_cp, p.thu, p.chi, p.thu - p.chi]), [12, 20, 20, 20, 20, 20, 20, 20],
    { total: false }); // cột lũy kế không cộng dồn được
  xlTable(wb, logo, 'Canh bao', 'CẢNH BÁO & LƯU Ý', sub(''), ['Mã DA', 'Mức', 'Nội dung'],
    list.flatMap((d) => d.canh_bao.map((w) => [d.ma_du_an, MUC[w.muc], w.noi_dung])), [12, 14, 90]);
  await xlSave(wb, `BaoCao_${bFileScope()}_${bStamp()}.xlsx`);
}));

// ---------- PowerPoint ----------
$('#b-pptx').addEventListener('click', (e) => bBusy(e.target, async () => {
  logEvent('xuat_pptx', bLogScope());
  await bLoad('/vendor/pptxgenjs-3.12.0.bundle.js');
  const { list, one } = bScope();
  const v = BST.vat, vt = v === 'gt' ? 'trước VAT' : 'sau VAT';
  const T = bTotals(list);
  const NAVY = '1F3A6E', TEAL = '0FA3A3', INK = '1E293B', MUTED = '64748B', LINE = 'E3E9F2';
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.company = BC.ten_cong_ty || '';
  pptx.title = 'Báo cáo tổng quan dự án';
  const FONT = 'Arial';
  const scope = one ? `${one.ma_du_an} – ${one.ten_du_an}` : `Tất cả dự án (${list.length})`;
  const dateTxt = new Date(BC.lap_luc).toLocaleDateString('vi-VN');
  pptx.defineSlideMaster({
    title: 'TMN', background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: TEAL } } },
      { text: { text: `${BC.ten_cong_ty || ''} · Báo cáo tổng quan dự án · ${dateTxt}`, options: { x: 0.5, y: 7.05, w: 9, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED } } },
    ],
    slideNumber: { x: 12.3, y: 7.05, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, align: 'right' },
  });
  const slide = (title, sub) => {
    const s = pptx.addSlide({ masterName: 'TMN' });
    s.addText(title, { x: 0.5, y: 0.3, w: 12.3, h: 0.6, fontFace: FONT, fontSize: 24, bold: true, color: NAVY });
    if (sub) s.addText(sub, { x: 0.5, y: 0.85, w: 12.3, h: 0.35, fontFace: FONT, fontSize: 12, color: MUTED });
    return s;
  };
  const ty = (n) => bTy(n);
  const hd = (t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, align: 'center', valign: 'middle' } });
  const num = (n, extra = {}) => ({ text: typeof n === 'string' ? n : ty(n), options: { align: 'right', color: typeof n === 'number' && n < 0 ? 'D92D35' : INK, ...extra } });
  const tblOpt = { x: 0.5, y: 1.35, w: 12.3, fontFace: FONT, fontSize: 10, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 1.35, newSlideStartY: 1.35, rowH: 0.3, margin: 0.04 };
  const chartOpt = { x: 0.5, y: 1.35, w: 12.3, h: 5.5, fontFace: FONT, showLegend: true, legendPos: 't', legendFontSize: 11, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
    valAxisLabelFormatCode: '#,##0.0', valGridLine: { color: LINE, size: 0.5 }, catAxisLineShow: true };

  // 1. Trang bìa
  const s1 = pptx.addSlide();
  s1.background = { color: NAVY };
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 5.6, w: 13.33, h: 0.08, fill: { color: TEAL } });
  s1.addText(BC.ten_cong_ty || '', { x: 0.8, y: 1.4, w: 11.7, h: 0.5, fontFace: FONT, fontSize: 18, color: 'BFE9E6', bold: true });
  s1.addText('BÁO CÁO TỔNG QUAN DỰ ÁN', { x: 0.8, y: 2.0, w: 11.7, h: 1.0, fontFace: FONT, fontSize: 40, color: 'FFFFFF', bold: true });
  s1.addText(scope, { x: 0.8, y: 3.1, w: 11.7, h: 0.5, fontFace: FONT, fontSize: 20, color: 'FFFFFF' });
  s1.addText(`Ngày lập: ${dateTxt} · Người lập: ${BC.nguoi_lap} · Đơn vị: tỷ đồng (${vt})`, { x: 0.8, y: 4.0, w: 11.7, h: 0.4, fontFace: FONT, fontSize: 14, color: 'BFE9E6' });
  s1.addText('Produced by the Supervisory Board of Tan Minh Nhan Corporation®', { x: 0.8, y: 6.2, w: 11.7, h: 0.4, fontFace: FONT, fontSize: 11, color: 'BFE9E6' });

  // 1b. Tổng quan tài chính theo kỳ
  const F = bFinData(list, v);
  const dPct = (a, b, good = true) => {
    if (!F.prv) return { text: '', color: MUTED };
    if (!b) return { text: '— (kỳ trước = 0)', color: MUTED };
    const p = (a - b) / Math.abs(b);
    return { text: `${p >= 0 ? '▲' : '▼'} ${Math.abs(p * 100).toFixed(1).replace('.', ',')}% so với kỳ trước`, color: (p >= 0) === good ? '0A7D32' : 'C2410C' };
  };
  const sF = slide(`Tổng quan tài chính · ${F.P.label}`, `${F.P.range}${F.P.prev ? ` · so với ${ymTxt(F.P.prev.from)} – ${ymTxt(F.P.prev.to)}` : ''} · Đơn vị: tỷ đồng (${vt}; dòng tiền sau VAT)`);
  [['TỔNG DOANH THU', F.cur.dt, dPct(F.cur.dt, F.prv?.dt), 'Nghiệm thu trong kỳ', 'F7F9FC', '2C5FA3'],
    ['TỔNG CHI PHÍ', F.cur.cp, dPct(F.cur.cp, F.prv?.cp, false), `${bpct(F.cur.cp, F.cur.dt)} doanh thu`, 'F7F9FC', 'C27A3E'],
    ['LỢI NHUẬN', F.cur.ln, dPct(F.cur.ln, F.prv?.ln), `Tỷ suất LN: ${bpct(F.cur.ln, F.cur.dt)}`, 'F7F9FC', '16968A'],
    ['DÒNG TIỀN THỰC TẾ', F.cur.dong_tien, dPct(F.cur.dong_tien, F.prv?.dong_tien), `Số dư cuối kỳ: ${ty(F.bal)} tỷ`, 'F7F9FC', '7E5AA6']]
    .forEach(([t, val, dl, sub, bg, ac], i) => {
      const x = 0.5 + i * 2.62;
      sF.addShape(pptx.ShapeType.roundRect, { x, y: 1.45, w: 2.47, h: 2.0, fill: { color: bg }, line: { color: LINE }, rectRadius: 0.06 });
      sF.addShape(pptx.ShapeType.rect, { x, y: 1.45, w: 2.47, h: 0.07, fill: { color: ac } });
      sF.addText(t, { x: x + 0.15, y: 1.6, w: 2.2, h: 0.3, fontFace: FONT, fontSize: 10.5, bold: true, color: ac });
      sF.addText([{ text: ty(val), options: { fontSize: 24, bold: true, color: val < 0 ? 'D92D35' : NAVY } }, { text: ' tỷ', options: { fontSize: 11, color: MUTED } }], { x: x + 0.15, y: 1.92, w: 2.25, h: 0.55, fontFace: FONT });
      sF.addText(dl.text, { x: x + 0.15, y: 2.5, w: 2.25, h: 0.3, fontFace: FONT, fontSize: 9.5, bold: true, color: dl.color });
      sF.addText(sub, { x: x + 0.15, y: 2.8, w: 2.25, h: 0.5, fontFace: FONT, fontSize: 9, color: MUTED, valign: 'top' });
    });
  // Mục tiêu năm
  sF.addShape(pptx.ShapeType.roundRect, { x: 11.0, y: 1.45, w: 1.83, h: 2.0, fill: { color: 'FFFFFF' }, line: { color: LINE }, rectRadius: 0.1 });
  sF.addText(`Mục tiêu ${F.year}`, { x: 11.1, y: 1.52, w: 1.7, h: 0.3, fontFace: FONT, fontSize: 10.5, bold: true, color: NAVY });
  const tsY = F.ytd.dt ? (F.ytd.ln / F.ytd.dt) * 100 : 0;
  [['Doanh thu', F.ytd.dt, F.tg.dt, '2C5FA3'], ['Chi phí', F.ytd.cp, F.tg.cp, 'C27A3E'], ['Lợi nhuận', F.ytd.ln, F.tg.ln, '16968A'], ['Tỷ suất LN', tsY, F.tg.ty_suat, '7E5AA6']].forEach(([l, a, t, c], i) => {
    const y = 1.88 + i * 0.38;
    const pc = t > 0 ? a / t : 0;
    sF.addText([{ text: l, options: { color: INK } }, { text: t > 0 ? `  ${pc < 0 ? '<0' : Math.round(pc * 100)}%` : '  chưa đặt', options: { bold: true, color: pc < 0 ? 'D92D35' : c } }], { x: 11.1, y, w: 1.7, h: 0.2, fontFace: FONT, fontSize: 8.5 });
    sF.addShape(pptx.ShapeType.rect, { x: 11.12, y: y + 0.22, w: 1.58, h: 0.07, fill: { color: 'EEF2F7' }, line: { color: 'EEF2F7' } });
    if (pc > 0) sF.addShape(pptx.ShapeType.rect, { x: 11.12, y: y + 0.22, w: 1.58 * Math.min(1, pc), h: 0.07, fill: { color: c }, line: { color: c } });
  });
  // Hiệu quả từng công trình
  sF.addText('Hiệu quả từng công trình trong kỳ', { x: 0.5, y: 3.65, w: 8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: NAVY });
  const totF = F.rows.reduce((a, x) => ({ dt: a.dt + x.dt, cp: a.cp + x.cp, ln: a.ln + x.ln }), { dt: 0, cp: 0, ln: 0 });
  sF.addTable([
    ['Công trình', 'Doanh thu', 'Chi phí', 'Lợi nhuận', 'Tỷ suất LN', 'Tỷ trọng DT'].map(hd),
    ...F.rows.map((x) => [{ text: [{ text: '●', options: { color: x.color.slice(1).toUpperCase(), fontSize: 13 } }, { text: `\u00A0\u00A0${x.d.ma_du_an} – ${x.d.ten_du_an}`, options: { bold: true } }] }, num(x.dt), num(x.cp), num(x.ln, { bold: true, color: x.ln < 0 ? 'D92D35' : '0A7D32' }), num(bpct(x.ln, x.dt)), num(bpct(x.dt, F.cur.dt))]),
    [{ text: 'Tổng cộng', options: { bold: true, fill: { color: 'EEF4FB' } } }, ...[totF.dt, totF.cp, totF.ln, bpct(totF.ln, totF.dt), '100%'].map((x) => num(x, { bold: true, fill: { color: 'EEF4FB' } }))],
  ], { ...tblOpt, y: 4.0, autoPageSlideStartY: 1.35, colW: [5.3, 1.4, 1.4, 1.4, 1.4, 1.4], rowH: 0.27, fontSize: 9.5 });
  // Biểu đồ DT–CP–LN theo kỳ + cơ cấu doanh thu
  if (F.series.length) {
    const sC = slide(`Doanh thu – Chi phí – Lợi nhuận · ${F.P.label}`, `Đơn vị: tỷ đồng (${vt})`);
    sC.addChart(pptx.ChartType.bar, ['dt', 'cp', 'ln'].map((k, i) => ({ name: ['Doanh thu', 'Chi phí', 'Lợi nhuận'][i], labels: F.series.map((p) => p.label), values: F.series.map((p) => p[k] / 1e9) })),
      { ...chartOpt, x: 0.5, w: 7.6, barDir: 'col', catAxisLabelPos: 'low', barGrouping: 'clustered', chartColors: ['2C5FA3', 'C27A3E', '16968A'], showValue: F.series.length <= 6, dataLabelFormatCode: '#,##0.0', dataLabelFontSize: 8 });
    const pos = F.rows.filter((x) => x.dt > 0).sort((a, b) => b.dt - a.dt);
    if (pos.length) {
      sC.addText('Cơ cấu doanh thu theo công trình', { x: 8.4, y: 1.35, w: 4.4, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: NAVY });
      sC.addChart(pptx.ChartType.doughnut, [{ name: 'Doanh thu', labels: pos.map((x) => x.d.ma_du_an), values: pos.map((x) => x.dt / 1e9) }],
        { x: 8.3, y: 1.7, w: 4.6, h: 5.1, holeSize: 55, chartColors: pos.map((x) => x.color.slice(1).toUpperCase()), showPercent: true, showValue: false, showLegend: true, legendPos: 'b', legendFontSize: 10, dataLabelColor: 'FFFFFF', dataLabelFontSize: 10, fontFace: FONT });
    }
  }

  // 2. Tổng quan theo hợp đồng
  const lnDk = T.dk.dt[v] - T.dk.cp[v], lnTh = T.th.dt[v] - T.th.cp[v];
  const s2 = slide('Tổng quan theo hợp đồng', `${T.so_da} dự án · ${T.so_hd} HĐ chủ đầu tư (${T.so_hd_qt} đã QT) · ${T.so_tp} HĐ thầu phụ (${T.so_tp_qt} đã QT) · Đơn vị: tỷ đồng`);
  const card = (x, y, label, val, sub, color) => {
    s2.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.9, h: 1.35, fill: { color: 'F5F8FC' }, line: { color: LINE }, rectRadius: 0.08 });
    s2.addShape(pptx.ShapeType.rect, { x, y, w: 3.9, h: 0.07, fill: { color } });
    s2.addText(label, { x: x + 0.2, y: y + 0.15, w: 3.5, h: 0.3, fontFace: FONT, fontSize: 11, color: MUTED, bold: true });
    s2.addText(ty(val), { x: x + 0.2, y: y + 0.45, w: 3.5, h: 0.5, fontFace: FONT, fontSize: 24, bold: true, color: val < 0 ? 'D92D35' : NAVY });
    s2.addText(sub, { x: x + 0.2, y: y + 0.95, w: 3.5, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED });
  };
  const rowLab = (y, t, sub) => s2.addText([{ text: t.toUpperCase(), options: { bold: true, color: NAVY } }, { text: `  (${sub})`, options: { color: MUTED } }], { x: 0.5, y: y - 0.34, w: 12, h: 0.3, fontFace: FONT, fontSize: 12 });
  const cols = [0.5, 4.7, 8.9];
  [['Dự kiến', 'theo HĐ', 1.62, [['Doanh thu dự kiến', T.dk.dt[v], vt, TEAL], ['Chi phí dự kiến', T.dk.cp[v], `${bpct(T.dk.cp[v], T.dk.dt[v])} doanh thu`, 'C27A3E'], ['Lợi nhuận dự kiến', lnDk, `Tỷ suất ${bpct(lnDk, T.dk.dt[v])}`, NAVY]]],
    ['Thực hiện', 'đến nay', 3.37, [['Doanh thu thực hiện', T.th.dt[v], `Đạt ${bpct(T.th.dt[v], T.dk.dt[v])} dự kiến`, TEAL], ['Chi phí thực hiện', T.th.cp[v], `${bpct(T.th.cp[v], T.th.dt[v])} doanh thu`, 'C27A3E'], ['Lợi nhuận thực hiện', lnTh, `Tỷ suất ${bpct(lnTh, T.th.dt[v])}`, NAVY]]],
    ['Dòng tiền & công nợ', 'sau VAT', 5.12, [['Tiền về', T.tien_ve, `${bpct(T.tien_ve, T.dk.dt.sv)} giá trị HĐ`, TEAL], ['Còn phải thu', T.th.con_lai, 'Theo khối lượng nghiệm thu', 'C27A3E'], ['Còn phải trả thầu phụ', T.tp_con_lai, `Trả nợ gốc vay: ${ty(T.tra_goc)}`, NAVY]]]]
    .forEach(([t, sub, y, cards]) => { rowLab(y, t, sub); cards.forEach(([l, val, s, c], i) => card(cols[i], y, l, val, s, c)); });

  // 3–4. Biểu đồ theo tháng (biểu đồ gốc PowerPoint, sửa được)
  const pts = bMonths(list, v);
  if (pts.length) {
    slide('Doanh thu – Chi phí thực hiện (lũy kế)', `Đơn vị: tỷ đồng (${vt})`).addChart(pptx.ChartType.line, [
      { name: 'Doanh thu', labels: pts.map((p) => p.label), values: pts.map((p) => p.luy_dt / 1e9) },
      { name: 'Chi phí', labels: pts.map((p) => p.label), values: pts.map((p) => p.luy_cp / 1e9) },
    ], { ...chartOpt, chartColors: ['2C5FA3', 'C27A3E'], lineSize: 2, lineDataSymbolSize: 5 });
    slide('Dòng tiền thực tế theo tháng', 'Thu = tiền về + nhận tiền vay; Chi = chi phí + thanh toán thầu phụ + trả nợ gốc · Đơn vị: tỷ đồng (sau VAT)').addChart(pptx.ChartType.bar, [
      { name: 'Thu', labels: pts.map((p) => p.label), values: pts.map((p) => p.thu / 1e9) },
      { name: 'Chi', labels: pts.map((p) => p.label), values: pts.map((p) => p.chi / 1e9) },
    ], { ...chartOpt, barDir: 'col', barGrouping: 'clustered', chartColors: ['2C5FA3', 'C27A3E'] });
  }
  // 5. Cơ cấu chi phí
  const cg = bCostGroups(list, v).slice(0, 10).reverse();
  if (cg.length) {
    slide('Cơ cấu chi phí dự kiến theo nhóm', `Đơn vị: tỷ đồng (${vt})`).addChart(pptx.ChartType.bar, [{ name: 'Chi phí', labels: cg.map((x) => x.ten), values: cg.map((x) => x.val / 1e9) }],
      { ...chartOpt, barDir: 'bar', catAxisLabelPos: 'low', chartColors: ['C27A3E'], showLegend: false, showValue: true, dataLabelFormatCode: '#,##0.00', dataLabelFontSize: 9 });
  }
  // 6. Lợi nhuận theo dự án / theo HĐ
  if (one) {
    const tp = (x) => (v === 'gt' ? x.qt_gt : x.qt_sv);
    if (one.hds.length) slide('Lãi gộp dự kiến theo HĐ chủ đầu tư', `Doanh thu dự kiến − giá trị thầu phụ thuộc HĐ · Đơn vị: tỷ đồng (${vt})`).addChart(pptx.ChartType.bar,
      [{ name: 'Lãi gộp dự kiến', labels: one.hds.map((x) => x.so_ma), values: one.hds.map((x) => (x.dk[v] - tp(x.tp)) / 1e9) }],
      { ...chartOpt, barDir: 'bar', catAxisLabelPos: 'low', chartColors: ['16968A'], showLegend: false, showValue: true, dataLabelFormatCode: '#,##0.00', dataLabelFontSize: 9 });
  } else {
    const rows = [...list].reverse();
    slide('Lợi nhuận theo dự án', `Dự kiến và thực hiện · Đơn vị: tỷ đồng (${vt})`).addChart(pptx.ChartType.bar, [
      { name: 'Dự kiến', labels: rows.map((d) => d.ma_du_an), values: rows.map((d) => (d.du_kien.doanh_thu[v] - d.du_kien.chi_phi[v]) / 1e9) },
      { name: 'Thực hiện', labels: rows.map((d) => d.ma_du_an), values: rows.map((d) => (d.thuc_hien.doanh_thu[v] - d.thuc_hien.chi_phi[v]) / 1e9) },
    ], { ...chartOpt, barDir: 'bar', catAxisLabelPos: 'low', barGrouping: 'clustered', chartColors: ['16968A', '2C5FA3'], showValue: true, dataLabelFormatCode: '#,##0.00', dataLabelFontSize: 9 });
    // 7. Bảng tổng hợp dự án
    slide('Tổng hợp theo dự án', `Đơn vị: tỷ đồng (${vt}; tiền về, phải thu, phải trả sau VAT)`).addTable([
      ['Dự án', 'DT dự kiến', 'CP dự kiến', 'LN dự kiến', '%', 'DT thực hiện', 'CP thực hiện', 'LN thực hiện', '%', 'Tiền về', 'Còn phải thu', 'Phải trả TP'].map(hd),
      ...list.map((d) => {
        const a = d.du_kien.doanh_thu[v] - d.du_kien.chi_phi[v], b = d.thuc_hien.doanh_thu[v] - d.thuc_hien.chi_phi[v];
        return [{ text: `${d.ma_du_an} ${d.ten_du_an}`, options: { bold: true } }, num(d.du_kien.doanh_thu[v]), num(d.du_kien.chi_phi[v]), num(a, { bold: true }), num(bpct(a, d.du_kien.doanh_thu[v])),
          num(d.thuc_hien.doanh_thu[v]), num(d.thuc_hien.chi_phi[v]), num(b, { bold: true }), num(bpct(b, d.thuc_hien.doanh_thu[v])), num(d.tien_ve), num(d.thuc_hien.con_lai), num(d.tp.con_lai)];
      }),
      [{ text: 'TỔNG CỘNG', options: { bold: true, fill: { color: 'EEF4FB' } } }, ...[T.dk.dt[v], T.dk.cp[v], lnDk, bpct(lnDk, T.dk.dt[v]), T.th.dt[v], T.th.cp[v], lnTh, bpct(lnTh, T.th.dt[v]), T.tien_ve, T.th.con_lai, T.tp_con_lai]
        .map((x) => num(x, { bold: true, fill: { color: 'EEF4FB' } }))],
    ], { ...tblOpt, colW: [2.9, 0.95, 0.95, 0.95, 0.65, 0.95, 0.95, 0.95, 0.65, 0.95, 0.95, 0.95] });
  }
  // 8+. Từng dự án (kèm ảnh công trình nếu có)
  const imgs = {};
  await Promise.all(list.filter((d) => d.co_anh).map(async (d) => {
    try {
      const b = await (await fetch(`/api/du-an/${d.id}/anh?v=${d.anh_v}`)).blob();
      const bmp = await createImageBitmap(b);
      imgs[d.id] = { data: await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }), ratio: bmp.width / bmp.height };
    } catch {}
  }));
  for (const d of list) {
    const a = d.du_kien.doanh_thu[v] - d.du_kien.chi_phi[v], b = d.thuc_hien.doanh_thu[v] - d.thuc_hien.chi_phi[v];
    const tp = (x) => (v === 'gt' ? x.qt_gt : x.qt_sv);
    const s = slide(`${d.ma_du_an} – ${d.ten_du_an}`,
      `CĐT: ${d.chu_dau_tu || '—'} · ${d.trang_thai} · Tiến độ ${d.tien_do}% · LN dự kiến ${ty(a)} (${bpct(a, d.du_kien.doanh_thu[v])}) · LN thực hiện ${ty(b)} (${bpct(b, d.thuc_hien.doanh_thu[v])}) · Đơn vị: tỷ đồng`);
    if (imgs[d.id]) {
      const h = 0.95, w = Math.min(2.4, h * imgs[d.id].ratio);
      s.addImage({ data: imgs[d.id].data, x: 12.83 - w, y: 0.22, w, h, rounding: false });
    }
    const rows = d.hds.map((x) => [{ text: x.so_ma + (x.da_qt ? ' (Đã QT)' : ''), options: { bold: true } }, num(x.hd[v]), num(x.nt[v]), num((x.pct_ht * 100).toFixed(1).replace('.', ',') + '%'),
      num(x.tien_ve), num(x.phai_thu), num(String(x.tp.n)), num(tp(x.tp)), num(x.tp.da_tt), num(x.tp.con_lai), num(x.dk[v] - tp(x.tp), { bold: true })]);
    if (d.tp.chua_gan.n) rows.push([{ text: 'Thầu phụ chưa gắn HĐ CĐT', options: { italic: true } }, num(''), num(''), num(''), num(''), num(''), num(String(d.tp.chua_gan.n)), num(tp(d.tp.chua_gan)), num(d.tp.chua_gan.da_tt), num(d.tp.chua_gan.con_lai), num(-tp(d.tp.chua_gan))]);
    s.addTable([
      ['HĐ chủ đầu tư', 'Giá trị HĐ+PL', 'Nghiệm thu', '% HT', 'Tiền về', 'Còn phải thu', 'Số HĐTP', 'TP HT/QT', 'Đã trả TP', 'Còn phải trả', 'Lãi gộp DK'].map(hd),
      ...(rows.length ? rows : [[{ text: 'Chưa có HĐ chủ đầu tư', options: { colspan: 11, align: 'center', color: MUTED } }]]),
    ], { ...tblOpt, colW: [2.5, 1.05, 1.05, 0.75, 1.05, 1.05, 0.75, 1.05, 1.05, 1.0, 1.0] });
  }
  // Cảnh báo
  const warns = list.flatMap((d) => d.canh_bao.map((w) => ({ ...w, da: d.ma_du_an }))).sort((x, y) => ({ cao: 0, tb: 1, thap: 2 }[x.muc] - { cao: 0, tb: 1, thap: 2 }[y.muc]));
  slide('Cảnh báo & lưu ý', `${warns.length} mục cần kiểm tra`).addTable([
    ['Mức', 'Dự án', 'Nội dung'].map(hd),
    ...(warns.length ? warns.map((w) => [{ text: MUC[w.muc], options: { bold: true, color: w.muc === 'cao' ? 'D92D35' : w.muc === 'tb' ? 'B45309' : MUTED } }, w.da, w.noi_dung])
      : [[{ text: 'Không có cảnh báo', options: { colspan: 3, align: 'center', color: MUTED } }]]),
  ], { ...tblOpt, colW: [1.4, 1.6, 9.3] });

  await pptx.writeFile({ fileName: `BaoCao_${bFileScope()}_${bStamp()}.pptx` });
}));
