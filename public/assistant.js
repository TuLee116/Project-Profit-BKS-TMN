// =====================================================================
// TRỢ LÝ BKS – hỏi đáp nhanh bằng nút bấm (không dùng AI, không tốn phí)
// Số liệu lấy từ /api/bao-cao và đúng các hàm của trang Báo cáo (bTongHopData, bMuc4Data, bThuc)
// -> trả lời khớp 100% với báo cáo, theo nút trước / sau VAT. Vai trò IT không thấy trợ lý.
// =====================================================================
const AS = { at: 0, last: null, timer: null };
const asNorm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const asTy = (x) => `<span class="${x < 0 ? 'neg' : ''}">${bTy(x)}</span>`;
const asVt = () => (BST.vat === 'gt' ? 'trước VAT' : 'sau VAT');
const asDays = (iso) => Math.floor((Date.now() - new Date(String(iso).slice(0, 10) + 'T00:00:00+07:00')) / 864e5);

// Số liệu tổng hợp theo dự án (cùng nguồn báo cáo)
function asModel() {
  const v = BST.vat, list = BC.du_an;
  const th = bTongHopData(list, v, { to: '9999-12' });            // TĐ1 dự kiến, thu, chi (lũy kế đến nay)
  const m4 = bMuc4Data(list, v);                                  // TĐ1 – TĐ2 – TĐ mới nhất (theo dữ liệu hệ thống)
  const by4 = new Map(m4.rows.map((x) => [x.d.id, x]));
  const rows = th.rows.map((x) => {
    const r = by4.get(x.d.id) || { t1: 0, t2: x.dt, t3: x.dt, c1: 0, c2: x.cp, c3: x.cp, l1: 0, l2: x.ln, l3: x.ln, qt: false };
    return { ...x, t2: r.t2, c2: r.c2, l2: r.l2, t3: r.t3, c3: r.c3, l3: r.l3, qt: r.qt };
  });
  const S = (k) => rows.reduce((a, x) => a + (x[k] || 0), 0);
  return { v, rows, S, T4: m4.T };
}
const asTd = (d, n) => (d.thoi_diem || []).find((t) => t.td === n);
const asPrj = (d) => `<button type="button" class="as-lnk" data-asprj="${d.id}" title="${esc(d.ten_du_an)}"><b>${esc(d.ma_du_an)}</b></button> <span class="as-nm">${esc(d.ten_du_an)}</span>`;
const asKv = (label, val, sub = '') => `<div class="as-kv"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const asTbl = (head, rows, foot) => `<div class="as-tw"><table class="as-t"><thead><tr>${head.map((h, i) => `<th class="${i ? 'num' : ''}">${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td class="${i ? 'num' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
const asOk = (txt) => `<p class="as-ok">✓ ${txt}</p>`;
const asNote = (txt) => `<p class="as-note">${txt}</p>`;
const asGo = (sec, label = 'Xem trong báo cáo') => `<button type="button" class="as-go" data-asgo="${sec}">${label} →</button>`;

// ---------------------------------------------------------------------
// Câu hỏi: ① Tổng quan · ② Cảnh báo · ③ Thu tiền CĐT · ④ Chi tiền & thầu phụ · ⑤ Chi phí · ⑥ Tra cứu · ⑦ Xếp hạng & so sánh
// ---------------------------------------------------------------------
const AS_GRP = [
  { k: 'tq', ten: 'Tổng quan', ic: '①' },
  { k: 'cb', ten: 'Cảnh báo', ic: '②' },
  { k: 'thu', ten: 'Thu tiền CĐT', ic: '③' },
  { k: 'chi', ten: 'Chi tiền & thầu phụ', ic: '④' },
  { k: 'cp', ten: 'Chi phí', ic: '⑤' },
  { k: 'tra', ten: 'Tra cứu', ic: '⑥' },
  { k: 'xh', ten: 'Xếp hạng & so sánh', ic: '⑦' },
];
// ---- Dữ liệu dùng chung cho đợt 2 ----
const AS_TPN = { thau_phu: 'Thầu phụ', vat_tu: 'Vật tư', may_moc: 'Máy móc TB', nhan_cong: 'Nhân công' };
const asTps = () => BC.du_an.flatMap((d) => (d.chi_tiet?.thau_phu || []).map((c) => ({ d, ...c })));     // HĐ đầu vào (tiền: sau VAT)
const asTpVal = (c) => (BST.vat === 'gt' ? c.qt_gt : c.qt_sv);                                                  // giá trị HT/QT theo nút VAT
const asCps = () => BC.du_an.flatMap((d) => (d.chi_tiet?.chi_phi || []).map((r) => ({ d, ...r, val: BST.vat === 'gt' ? r.gia_tri : r.sau_vat })));
const asYm = (n = 0) => { const now = bNowYm(), t = Number(now.slice(0, 4)) * 12 + Number(now.slice(5)) - 1 - n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const asYmTxt = (m) => `${m.slice(5)}/${m.slice(0, 4)}`;
const asBar = (x, mx) => `<span class="as-bar"><i style="width:${mx ? Math.max(2, Math.min(100, (x / mx) * 100)) : 0}%"></i></span>`;
const asGroupBy = (arr, key, val) => { const m = new Map(); for (const x of arr) { const k = key(x) || '(chưa ghi)'; m.set(k, (m.get(k) || 0) + val(x)); } return [...m].sort((a, b) => b[1] - a[1]); };
const AS_Q = [
  { id: 1, g: 'tq', q: 'Tình hình chung hôm nay', f: () => {
    const M = asModel(), t3 = M.S('t3'), c3 = M.S('c3'), l3 = M.S('l3'), thu = M.S('thu'), chi = M.S('chi');
    const nQt = M.rows.filter((x) => x.qt).length;
    return `<div class="as-kvs">${asKv('Doanh thu (TĐ mới nhất)', asTy(t3) + ' tỷ', `${M.rows.length} dự án · ${nQt} đã quyết toán`)}${asKv('Chi phí', asTy(c3) + ' tỷ', `Bằng ${bpct(c3, t3)} doanh thu`)}
      ${asKv('Lợi nhuận', asTy(l3) + ' tỷ', `Tỷ suất ${bpct(l3, t3)}`)}${asKv('Đã thu', asTy(thu) + ' tỷ', `Đạt ${bpct(thu, t3)} doanh thu`)}
      ${asKv('Đã chi', asTy(chi) + ' tỷ', `Thu − chi: ${asTy(thu - chi)} tỷ`)}${asKv('Còn phải thu', asTy(t3 - thu) + ' tỷ', 'Doanh thu − đã thu')}</div>${asGo('I')}`;
  } },
  { id: 2, g: 'tq', q: 'LN dự kiến lúc ký so với hiện tại', f: () => {
    const M = asModel(), a = M.S('ln1'), b = M.S('l3');
    const rows = [...M.rows].sort((x, y) => (y.l3 - y.ln1) - (x.l3 - x.ln1));
    return `<div class="as-kvs">${asKv('LN dự kiến lúc ký (TĐ1)', asTy(a) + ' tỷ', `Tỷ suất ${bpct(a, M.S('dt1'))}`)}${asKv('LN hiện tại (TĐ mới nhất)', asTy(b) + ' tỷ', `Tỷ suất ${bpct(b, M.S('t3'))}`)}
      ${asKv('Chênh lệch', `<span class="${b - a < 0 ? 'neg' : 'pos'}">${b - a >= 0 ? '▲ +' : '▼ −'}${bTy(Math.abs(b - a))}</span> tỷ`, b - a >= 0 ? 'Tăng so với lúc ký' : 'Giảm so với lúc ký')}</div>
      ${asTbl(['Dự án', 'LN lúc ký', 'LN hiện tại', 'Chênh lệch'], rows.map((x) => [asPrj(x.d), asTy(x.ln1), asTy(x.l3) + (x.qt ? '' : '<sup title="Tạm tính – chưa quyết toán">*</sup>'), `<span class="${x.l3 - x.ln1 < 0 ? 'neg' : 'pos'}">${x.l3 - x.ln1 >= 0 ? '+' : ''}${bTy(x.l3 - x.ln1)}</span>`]))}
      ${asNote('(*) Chưa quyết toán – số tạm tính. LN lúc ký theo TĐ1 đã chốt; dự án chưa chốt TĐ1 lấy theo HĐ gốc trên hệ thống.')}${asGo('I')}`;
  } },
  { id: 3, g: 'tq', q: 'Số dự án theo trạng thái', f: () => {
    const L = BC.du_an, tts = (typeof META !== 'undefined' && META.trang_thai) || [...new Set(L.map((d) => d.trang_thai))];
    const qt = L.filter((d) => d.moc?.da_qt);
    return `<div class="as-kvs">${tts.map((t) => asKv(esc(t), L.filter((d) => d.trang_thai === t).length + ' dự án')).join('')}${asKv('Đã quyết toán', qt.length + ' dự án', 'Tất cả HĐ CĐT đã có quyết toán')}</div>
      ${asTbl(['Dự án', 'Trạng thái', 'Tiến độ'], L.map((d) => [asPrj(d), `<span class="st st-${slug(d.trang_thai)}">${esc(d.trang_thai)}</span>${d.moc?.da_qt ? ' <small class="as-qt">QT</small>' : ''}`, `${d.tien_do || 0}%`]))}`;
  } },
  { id: 4, g: 'tq', q: 'Tỷ suất LN bình quân (TĐ1 · TĐ2 · mới nhất)', f: () => {
    const M = asModel();
    const ts = (l, t) => bpct(M.S(l), M.S(t));
    return `<div class="as-kvs">${asKv('Lúc ký (TĐ1)', ts('ln1', 'dt1'), `LN ${bTy(M.S('ln1'))} / DT ${bTy(M.S('dt1'))} tỷ`)}${asKv('Điều chỉnh (TĐ2)', ts('l2', 't2'), `LN ${bTy(M.S('l2'))} / DT ${bTy(M.S('t2'))} tỷ`)}
      ${asKv('Mới nhất', ts('l3', 't3'), `LN ${bTy(M.S('l3'))} / DT ${bTy(M.S('t3'))} tỷ`)}</div>
      ${asTbl(['Dự án', 'TĐ1', 'TĐ2', 'Mới nhất'], M.rows.map((x) => [asPrj(x.d), bpct(x.ln1, x.dt1), bpct(x.l2, x.t2), bpct(x.l3, x.t3)]))}${asGo('I')}`;
  } },
  { id: 5, g: 'tq', q: 'Cơ cấu chi phí toàn công ty', f: () => {
    const v = BST.vat, m = new Map();
    for (const d of BC.du_an) for (const n of d.nhom) m.set(n.ten, (m.get(n.ten) || 0) + (n[v] || 0));
    const rows = [...m].filter(([, x]) => x).sort((a, b) => b[1] - a[1]), tot = rows.reduce((a, [, x]) => a + x, 0);
    return `${asTbl(['Nhóm chi phí', 'Giá trị (tỷ)', 'Tỷ trọng'], rows.map(([k, x]) => [esc(k), asTy(x), `<span class="as-bar"><i style="width:${tot ? Math.max(2, (x / tot) * 100) : 0}%"></i></span>${bpct(x, tot)}`]), ['Tổng', asTy(tot), '100%'])}
      ${asNote('Chi phí đã ghi nhận trên hệ thống (thầu phụ theo HĐ / quyết toán + chi phí khác), không gồm tiền vay, trả nợ gốc.')}`;
  } },
  { id: 6, g: 'tq', q: 'Giá trị HĐ đang thực hiện và phần còn phải làm', f: () => {
    const v = BST.vat, L = BC.du_an.filter((d) => !d.moc?.da_qt);
    if (!L.length) return asOk('Tất cả dự án đã quyết toán.');
    const r = L.map((d) => { const hd = d.hds.reduce((a, h) => a + h.hd[v], 0), nt = d.hds.reduce((a, h) => a + h.nt[v], 0); return { d, hd, nt, con: hd - nt }; });
    const S = (k) => r.reduce((a, x) => a + x[k], 0);
    return `<div class="as-kvs">${asKv('Giá trị HĐ + PL', asTy(S('hd')) + ' tỷ', `${L.length} dự án chưa quyết toán`)}${asKv('Đã nghiệm thu', asTy(S('nt')) + ' tỷ', `${bpct(S('nt'), S('hd'))} giá trị HĐ`)}${asKv('Còn phải làm', asTy(S('con')) + ' tỷ', 'HĐ + PL − đã nghiệm thu')}</div>
      ${asTbl(['Dự án', 'HĐ + PL', 'Đã NT', 'Còn phải làm', 'Tiến độ'], r.map((x) => [asPrj(x.d), asTy(x.hd), asTy(x.nt), asTy(x.con), `${x.d.tien_do || 0}%`]), ['Tổng', asTy(S('hd')), asTy(S('nt')), asTy(S('con')), ''])}`;
  } },

  { id: 7, g: 'cb', q: 'Dự án lỗ hoặc tỷ suất dưới 10%', f: () => {
    const M = asModel(), r = M.rows.filter((x) => x.l3 < 0 || (x.t3 && x.l3 / x.t3 < 0.1));
    if (!r.length) return asOk('Không có dự án lỗ hoặc tỷ suất LN dưới 10% (theo TĐ mới nhất).');
    return `${asTbl(['Dự án', 'Doanh thu', 'Lợi nhuận', 'Tỷ suất'], r.map((x) => [asPrj(x.d), asTy(x.t3), asTy(x.l3), `<b class="${x.l3 < 0 ? 'neg' : 'warn-text'}">${bpct(x.l3, x.t3)}</b>${x.qt ? '' : '<sup title="Tạm tính">*</sup>'}`]))}
      ${asNote('Theo TĐ mới nhất (đã quyết toán: số thực; (*) chưa quyết toán: tạm tính).')}${asGo('I')}`;
  } },
  { id: 8, g: 'cb', q: 'Chi phí vượt dự kiến', f: () => {
    // So trước VAT: số TĐ chốt nhập tay là trước VAT
    const r = [];
    for (const d of BC.du_an) {
      const ghi = d.du_kien.chi_phi.gt;
      const td = asTd(d, 2) || asTd(d, 1);
      if (td && ghi > Number(td.cp)) r.push([asPrj(d), `TĐ${td.td} (${dmy(td.ngay)})`, asTy(Number(td.cp)), asTy(ghi), `<b class="neg">+${bTy(ghi - Number(td.cp))}</b>`]);
      if (!d.moc?.da_qt && d.ns_cp > 0 && ghi > d.ns_cp) r.push([asPrj(d), 'DT-CP dự kiến', asTy(d.ns_cp), asTy(ghi), `<b class="neg">+${bTy(ghi - d.ns_cp)}</b>`]);
    }
    if (!r.length) return asOk('Không có dự án nào có chi phí đã ghi nhận vượt dự toán đã chốt.');
    return `${asTbl(['Dự án', 'So với', 'Dự toán', 'Đã ghi nhận', 'Vượt'], r)}${asNote('Trước VAT. Đã ghi nhận = thầu phụ theo HĐ / quyết toán + chi phí khác đến nay. Dự toán = chi phí của TĐ đã chốt gần nhất (TĐ2, nếu chưa có thì TĐ1).')}`;
  } },
  { id: 9, g: 'cb', q: 'Dự án đang chi nhiều hơn thu', f: () => {
    const M = asModel(), r = M.rows.filter((x) => x.con < 0).sort((a, b) => a.con - b.con);
    if (!r.length) return asOk('Không có dự án nào đang chi nhiều hơn thu.');
    return `${asTbl(['Dự án', 'Đã thu', 'Đã chi', 'Thu − chi'], r.map((x) => [asPrj(x.d), asTy(x.thu), asTy(x.chi), asTy(x.con)]))}${asNote(`Tiền thật lũy kế đến nay, không gồm tiền vay, trả nợ gốc · ${asVt()}.`)}${asGo('II')}`;
  } },
  { id: 10, g: 'cb', q: 'Hoàn thành nhưng chưa chốt quyết toán', f: () => {
    const r = BC.du_an.filter((d) => d.trang_thai === 'Hoàn thành' && (!d.moc?.da_qt || !asTd(d, 3)));
    if (!r.length) return asOk('Mọi dự án hoàn thành đều đã quyết toán và đã chốt TĐ3.');
    return asTbl(['Dự án', 'Thiếu'], r.map((d) => [asPrj(d), [!d.moc?.da_qt ? 'Quyết toán HĐ CĐT' : '', !asTd(d, 3) ? 'Chốt TĐ3' : ''].filter(Boolean).join(' · ')]));
  } },
  { id: 11, g: 'cb', q: 'Có phụ lục nhưng chưa chốt TĐ2', f: () => {
    const r = BC.du_an.filter((d) => { const m = d.moc || {}; return ((m.dt_ps || 0) !== (m.dt_goc || 0) || (m.tp_ps || 0) !== (m.tp_goc || 0)) && !asTd(d, 2); });
    if (!r.length) return asOk('Không có dự án nào có phụ lục mà chưa chốt TĐ2.');
    return asTbl(['Dự án', 'Phụ lục CĐT (trước VAT)'], r.map((d) => [asPrj(d), asTy((d.moc.dt_ps || 0) - (d.moc.dt_goc || 0))]));
  } },
  { id: 12, g: 'cb', q: 'Dự án chưa chốt TĐ1 (thiếu dự toán lúc ký)', f: () => {
    const r = BC.du_an.filter((d) => !asTd(d, 1));
    if (!r.length) return asOk('Tất cả dự án đã chốt TĐ1.');
    return `${asTbl(['Dự án', 'Trạng thái'], r.map((d) => [asPrj(d), esc(d.trang_thai)]))}${asNote('Mục I-B báo cáo đang lấy tạm theo HĐ gốc trên hệ thống cho các dự án này.')}`;
  } },
  { id: 13, g: 'cb', q: 'Dữ liệu cần kiểm tra', f: () => {
    const all = BC.du_an.flatMap((d) => d.canh_bao.map((w) => ({ d, ...w })));
    if (!all.length) return asOk('Không có dữ liệu nào cần kiểm tra.');
    const ord = { cao: 0, tb: 1, thap: 2 }, n = (k) => all.filter((w) => w.muc === k).length;
    const top = all.sort((a, b) => ord[a.muc] - ord[b.muc]).slice(0, 12);
    return `<div class="as-kvs">${asKv('Mức cao', `<span class="neg">${n('cao')}</span>`)}${asKv('Trung bình', n('tb'))}${asKv('Thấp', n('thap'))}</div>
      ${asTbl(['Dự án', 'Nội dung'], top.map((w) => [asPrj(w.d), `<span class="as-m as-m-${w.muc}">${MUC[w.muc] || ''}</span> ${esc(w.noi_dung)}`]))}${all.length > top.length ? asNote(`… và ${all.length - top.length} mục khác.`) : ''}`;
  } },

  { id: 14, g: 'thu', q: 'Còn phải thu CĐT', f: () => {
    const M = asModel(), r = M.rows.filter((x) => Math.abs(x.phai_thu) >= 1e6).sort((a, b) => b.phai_thu - a.phai_thu);
    if (!r.length) return asOk('Đã thu đủ theo doanh thu của tất cả dự án.');
    return `${asTbl(['Dự án', 'Doanh thu', 'Đã thu', 'Còn phải thu'], r.map((x) => [asPrj(x.d), asTy(x.hd_sv), asTy(x.thu), `<b>${asTy(x.phai_thu)}</b>`]), ['Tổng', asTy(M.S('hd_sv')), asTy(M.S('thu')), `<b>${asTy(M.S('phai_thu'))}</b>`])}
      ${asNote(`Doanh thu theo TĐ mới nhất (đã quyết toán lấy quyết toán) − tiền đã về · ${asVt()}. Gồm cả phần chưa nghiệm thu.`)}${asGo('III')}`;
  } },
  { id: 15, g: 'thu', q: 'Đã thu bao nhiêu % giá trị HĐ', f: () => {
    const M = asModel(), r = [...M.rows].sort((a, b) => (a.hd_sv ? a.thu / a.hd_sv : 0) - (b.hd_sv ? b.thu / b.hd_sv : 0));
    return `${asTbl(['Dự án', 'Doanh thu', 'Đã thu', '% đã thu'], r.map((x) => [asPrj(x.d), asTy(x.hd_sv), asTy(x.thu), `<span class="as-bar"><i style="width:${x.hd_sv ? Math.max(0, Math.min(100, (x.thu / x.hd_sv) * 100)) : 0}%"></i></span>${bpct(x.thu, x.hd_sv)}`]), ['Tổng', asTy(M.S('hd_sv')), asTy(M.S('thu')), bpct(M.S('thu'), M.S('hd_sv'))])}${asNote(asVt()[0].toUpperCase() + asVt().slice(1) + ' · xếp từ thấp đến cao.')}`;
  } },
  { id: 16, g: 'thu', q: 'Tiền về theo tháng (6 tháng gần nhất)', f: () => {
    const now = bNowYm(), ms = [];
    for (let i = 5; i >= 0; i--) { const t = Number(now.slice(0, 4)) * 12 + Number(now.slice(5)) - 1 - i; ms.push(`${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`); }
    const val = (m) => BC.du_an.reduce((a, d) => a + (d.tien_thuc?.thang?.[m]?.thu || 0), 0);
    const r = ms.map((m) => [m, val(m)]), mx = Math.max(1, ...r.map(([, x]) => x)), tot = r.reduce((a, [, x]) => a + x, 0);
    return `${asTbl(['Tháng', 'Tiền về (tỷ)', ''], r.map(([m, x]) => [`${m.slice(5)}/${m.slice(0, 4)}`, asTy(x), `<span class="as-bar as-bar-w"><i style="width:${(x / mx) * 100}%"></i></span>`]), ['6 tháng', asTy(tot), ''])}
      ${asNote('Tiền thật đã về tài khoản (tạm ứng + thanh toán + quyết toán), luôn sau VAT.')}`;
  } },
  { id: 17, g: 'thu', q: 'Lần tiền về gần nhất của từng dự án', f: () => {
    const r = BC.du_an.map((d) => {
      const tv = (d.chi_tiet?.tien_ve || []).filter((t) => t.ngay).sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)))[0];
      return { d, tv, n: tv ? asDays(tv.ngay) : Infinity };
    }).sort((a, b) => b.n - a.n);
    return `${asTbl(['Dự án', 'Ngày', 'Số tiền', 'Cách đây'], r.map((x) => [asPrj(x.d), x.tv ? dmy(x.tv.ngay) : '—', x.tv ? asTy(x.tv.so_tien) : '—',
      x.tv ? `<span class="${x.n > 90 && x.d.trang_thai !== 'Hoàn thành' ? 'neg' : ''}">${x.n} ngày</span>` : '<span class="neg">Chưa có</span>']))}
      ${asNote('Đỏ: dự án chưa hoàn thành mà quá 90 ngày chưa có tiền về. Số tiền sau VAT.')}`;
  } },
  { id: 18, g: 'thu', q: 'Đã nghiệm thu nhưng chưa thu đủ', f: () => {
    const r = BC.du_an.flatMap((d) => d.hds.filter((h) => h.phai_thu >= 1e6).map((h) => ({ d, h }))).sort((a, b) => b.h.phai_thu - a.h.phai_thu);
    if (!r.length) return asOk('Không có khoản nghiệm thu nào chưa thu đủ.');
    const S = (k) => r.reduce((a, x) => a + x.h[k], 0);
    return `${asTbl(['Dự án / HĐ', 'Đã nghiệm thu', 'Đã thu', 'Còn phải thu'], r.map((x) => [`${asPrj(x.d)}<div class="as-sub">${esc(x.h.so_hieu)}</div>`, asTy(x.h.nt.sv), asTy(x.h.tien_ve), `<b>${asTy(x.h.phai_thu)}</b>`]), ['Tổng', asTy(r.reduce((a, x) => a + x.h.nt.sv, 0)), asTy(S('tien_ve')), `<b>${asTy(S('phai_thu'))}</b>`])}
      ${asNote('Sau VAT. Phải thu theo nghiệm thu = giá trị đã nghiệm thu / quyết toán − tiền đã về (gồm cả phần CĐT giữ bảo hành).')}`;
  } },
  { id: 19, g: 'thu', q: 'Bảo hành CĐT đang giữ', f: () => {
    const r = BC.du_an.filter((d) => d.bh_khac > 0);
    if (!r.length) return asOk('Chưa ghi nhận khoản bảo hành / giữ lại nào.');
    return `${asTbl(['Dự án', 'Số tiền', 'Ghi chú'], r.map((d) => [asPrj(d), asTy(d.bh_khac), `<span class="as-gc">${esc(d.ghi_chu_bh)}</span>`]), ['Tổng', asTy(r.reduce((a, d) => a + d.bh_khac, 0)), ''])}${asNote('Nhập ở mục I-A – Chi tiết doanh thu – cột BH/Khác.')}`;
  } },

  // ===== ④ Chi tiền và thầu phụ (HĐ đầu vào: thầu phụ, vật tư, MMTB, nhân công) =====
  { id: 20, g: 'chi', q: 'Còn phải trả HĐ đầu vào, theo đối tác', f: () => {
    const r = asGroupBy(asTps().filter((c) => Math.abs(c.con_lai) >= 1e6), (c) => c.doi_tac, (c) => c.con_lai);
    if (!r.length) return asOk('Đã trả đủ tất cả HĐ đầu vào theo giá trị HT/QT.');
    const tot = r.reduce((a, [, x]) => a + x, 0), mx = r[0][1];
    return `${asTbl(['Đối tác', 'Còn phải trả (tỷ)', ''], r.map(([k, x]) => [`<button type="button" class="as-lnk" data-astp="${esc(k)}">${esc(k)}</button>`, `<b>${asTy(x)}</b>`, asBar(x, mx)]), ['Tổng', `<b>${asTy(tot)}</b>`, ''])}
      ${asNote('Sau VAT · Còn phải trả = giá trị HT/QT − đã thanh toán (gồm tạm ứng). Bấm tên đối tác để xem từng HĐ.')}`;
  } },
  { id: 21, g: 'chi', q: 'Tra 1 thầu phụ / nhà cung cấp', pick: 'tp' },
  { id: 22, g: 'chi', q: 'Đối tác nhận nhiều việc nhất', f: () => {
    const r = asGroupBy(asTps(), (c) => c.doi_tac, asTpVal).slice(0, 10), mx = r[0]?.[1] || 0;
    if (!r.length) return asOk('Chưa có HĐ đầu vào nào.');
    const n = (k) => asTps().filter((c) => c.doi_tac === k).length;
    return `${asTbl(['Đối tác', 'Số HĐ', 'Giá trị HT/QT', ''], r.map(([k, x]) => [`<button type="button" class="as-lnk" data-astp="${esc(k)}">${esc(k)}</button>`, String(n(k)), asTy(x), asBar(x, mx)]))}
      ${asNote(`Top 10 theo giá trị HT/QT (chưa QT lấy HĐ + PL) · ${asVt()}.`)}`;
  } },
  { id: 23, g: 'chi', q: 'HĐ đầu vào đã / chưa quyết toán', f: () => {
    const L = asTps(), qt = L.filter((c) => c.da_qt), ch = L.filter((c) => !c.da_qt), S = (a) => a.reduce((x, c) => x + asTpVal(c), 0);
    const row = (c) => [`${esc(c.so_ma)} · ${esc(c.doi_tac)}<div class="as-sub">${asPrj(c.d)} · ${esc(AS_TPN[c.nhom] || c.loai)}</div>`, asTy(asTpVal(c)), asTy(c.da_tt), asTy(c.con_lai)];
    return `<div class="as-kvs">${asKv('Đã quyết toán', `${qt.length} HĐ`, `${bTy(S(qt))} tỷ`)}${asKv('Chưa quyết toán', `${ch.length} HĐ`, `${bTy(S(ch))} tỷ`)}</div>
      ${ch.length ? `<div class="as-h">Chưa quyết toán</div>${asTbl(['HĐ', 'Giá trị', 'Đã trả', 'Còn lại'], ch.map(row))}` : asOk('Tất cả HĐ đầu vào đã quyết toán.')}
      ${asNote(`Giá trị HT/QT ${asVt()}; đã trả, còn lại: sau VAT.`)}`;
  } },
  { id: 24, g: 'chi', q: 'Đã tạm ứng nhưng chưa có thanh toán đợt', f: () => {
    const r = asTps().filter((c) => c.tam_ung > 0 && !c.n_tt).sort((a, b) => b.tam_ung - a.tam_ung);
    if (!r.length) return asOk('Không có HĐ đầu vào nào chỉ mới tạm ứng.');
    return `${asTbl(['HĐ', 'Tạm ứng', 'Giá trị HĐ', 'Lần trả gần nhất'], r.map((c) => [`${esc(c.so_ma)} · ${esc(c.doi_tac)}<div class="as-sub">${asPrj(c.d)}</div>`, `<b>${asTy(c.tam_ung)}</b>`, asTy(c.hd_sv), c.ngay_tt ? `${dmy(c.ngay_tt)} <small>(${asDays(c.ngay_tt)} ngày)</small>` : '—']), ['Tổng', `<b>${asTy(r.reduce((a, c) => a + c.tam_ung, 0))}</b>`, '', ''])}
      ${asNote('Sau VAT. Cần theo dõi thu hồi tạm ứng qua các đợt thanh toán.')}`;
  } },
  { id: 25, g: 'chi', q: 'Tiền chi theo tháng (6 tháng gần nhất)', f: () => {
    const ms = [5, 4, 3, 2, 1, 0].map(asYm), g = (m, k) => BC.du_an.reduce((a, d) => a + (d.tien_thuc?.thang?.[m]?.[k] || 0), 0);
    const r = ms.map((m) => ({ m, tp: g(m, 'tp'), cp: g(m, 'cp') })), mx = Math.max(1, ...r.map((x) => x.tp + x.cp)), S = (k) => r.reduce((a, x) => a + x[k], 0);
    return `${asTbl(['Tháng', 'Trả HĐ đầu vào', 'Chi phí khác', 'Tổng chi', ''], r.map((x) => [asYmTxt(x.m), asTy(x.tp), asTy(x.cp), `<b>${asTy(x.tp + x.cp)}</b>`, asBar(x.tp + x.cp, mx)]), ['6 tháng', asTy(S('tp')), asTy(S('cp')), `<b>${asTy(S('tp') + S('cp'))}</b>`, ''])}
      ${asNote('Tiền thật đã chi (sau VAT), gồm tạm ứng HĐ đầu vào; không gồm trả nợ gốc vay.')}${asGo('II')}`;
  } },
  { id: 26, g: 'chi', q: 'Tỷ lệ HĐ đầu vào trên doanh thu từng dự án', f: () => {
    const M = asModel(), v = BST.vat;
    const r = M.rows.map((x) => { const tn = x.d.tp_nhom || {}, val = (k) => (v === 'gt' ? tn[k]?.qt_gt : tn[k]?.qt_sv) || 0;
      return { x, tp: val('thau_phu'), all: Object.keys(AS_TPN).reduce((a, k) => a + val(k), 0) }; }).sort((a, b) => (b.x.t3 ? b.all / b.x.t3 : 0) - (a.x.t3 ? a.all / a.x.t3 : 0));
    return `${asTbl(['Dự án', 'Doanh thu', 'Thầu phụ', '% TP', 'Tất cả HĐ đầu vào', '%'], r.map((o) => [asPrj(o.x.d), asTy(o.x.t3), asTy(o.tp), bpct(o.tp, o.x.t3), asTy(o.all), `<b>${bpct(o.all, o.x.t3)}</b>`]))}
      ${asNote(`Doanh thu TĐ mới nhất; HĐ đầu vào theo giá trị HT/QT (thầu phụ + vật tư + MMTB + nhân công) · ${asVt()}.`)}`;
  } },

  // ===== ⑤ Chi phí =====
  { id: 27, g: 'cp', q: 'Chi phí theo nhóm của 1 dự án', pick: 'cpprj' },
  { id: 28, g: 'cp', q: 'Top 10 khoản chi lớn nhất', f: () => {
    const a = asCps().filter((r) => r.tinh_cp === 'Có').map((r) => ({ d: r.d, t: r.noi_dung, sub: [r.nhom, r.doi_tac].filter(Boolean).join(' · '), val: r.val }));
    const b = asTps().map((c) => ({ d: c.d, t: `HĐ ${c.so_ma}`, sub: `${AS_TPN[c.nhom] || c.loai} · ${c.doi_tac}`, val: asTpVal(c) }));
    const r = [...a, ...b].sort((x, y) => y.val - x.val).slice(0, 10);
    if (!r.length) return asOk('Chưa có khoản chi nào.');
    return `${asTbl(['Khoản chi', 'Giá trị (tỷ)'], r.map((x) => [`${esc(x.t)}<div class="as-sub">${asPrj(x.d)} · ${esc(x.sub)}</div>`, `<b>${asTy(x.val)}</b>`]))}
      ${asNote(`Gồm HĐ đầu vào (giá trị HT/QT) và các dòng chi phí tính vào chi phí · ${asVt()}.`)}`;
  } },
  { id: 29, g: 'cp', q: 'Chi phí gián tiếp theo dự án', f: () => {
    const M = asModel(), L = asCps().filter((r) => r.khoi === 'CHI PHÍ GIÁN TIẾP');
    const r = M.rows.map((x) => { const my = L.filter((c) => c.d.id === x.d.id), g = (k) => my.filter((c) => c.nhom_ma === k).reduce((a, c) => a + c.val, 0);
      return { x, luong: g('gt_luong'), ti: g('gt_tien_ich'), ng: g('gt_ngoai_giao') }; }).map((o) => ({ ...o, tot: o.luong + o.ti + o.ng })).sort((a, b) => b.tot - a.tot);
    const S = (k) => r.reduce((a, o) => a + o[k], 0);
    return `${asTbl(['Dự án', 'Lương, thưởng', 'Tiện ích', 'Ngoại giao', 'Tổng', '% DT'], r.map((o) => [asPrj(o.x.d), asTy(o.luong), asTy(o.ti), asTy(o.ng), `<b>${asTy(o.tot)}</b>`, bpct(o.tot, o.x.t3)]), ['Tổng', asTy(S('luong')), asTy(S('ti')), asTy(S('ng')), `<b>${asTy(S('tot'))}</b>`, bpct(S('tot'), M.S('t3'))])}
      ${asNote(`Khối B2 – chi phí gián tiếp · % trên doanh thu TĐ mới nhất · ${asVt()}.`)}`;
  } },
  { id: 30, g: 'cp', q: 'Chi phí theo đối tác / nhà cung cấp', f: () => {
    const items = [...asCps().filter((r) => r.tinh_cp === 'Có' && r.doi_tac).map((r) => ({ k: r.doi_tac, v: r.val })), ...asTps().map((c) => ({ k: c.doi_tac, v: asTpVal(c) }))];
    const r = asGroupBy(items, (x) => x.k, (x) => x.v).slice(0, 15), mx = r[0]?.[1] || 0;
    if (!r.length) return asOk('Chưa có chi phí nào ghi đối tác.');
    return `${asTbl(['Đối tác', 'Giá trị (tỷ)', ''], r.map(([k, x]) => [esc(k), asTy(x), asBar(x, mx)]))}
      ${asNote(`Top 15 · HĐ đầu vào (HT/QT) + dòng chi phí có ghi đối tác · ${asVt()}.`)}`;
  } },
  { id: 31, g: 'cp', q: 'Chi phí phát sinh trong tháng này', f: () => {
    const m = bNowYm(), r = asCps().filter((x) => x.tinh_cp === 'Có' && String(x.ngay || '').slice(0, 7) === m).sort((a, b) => b.val - a.val);
    const tp = BC.du_an.reduce((a, d) => a + (d.tien_thuc?.thang?.[m]?.tp || 0), 0);
    const tot = r.reduce((a, x) => a + x.val, 0);
    return `<div class="as-kvs">${asKv(`Chi phí ghi nhận ${asYmTxt(m)}`, asTy(tot) + ' tỷ', `${r.length} dòng · ${asVt()}`)}${asKv('Trả HĐ đầu vào trong tháng', asTy(tp) + ' tỷ', 'Tiền thật, sau VAT')}</div>
      ${r.length ? asTbl(['Nội dung', 'Ngày', 'Giá trị'], r.slice(0, 15).map((x) => [`${esc(x.noi_dung)}<div class="as-sub">${asPrj(x.d)} · ${esc(x.nhom)}${x.doi_tac ? ' · ' + esc(x.doi_tac) : ''}</div>`, dmy(x.ngay), asTy(x.val)])) : asOk('Tháng này chưa có dòng chi phí nào.')}
      ${r.length > 15 ? asNote(`… và ${r.length - 15} dòng khác.`) : ''}`;
  } },
  { id: 32, g: 'cp', q: 'Vay ngân hàng: nhận, trả gốc, dư nợ, lãi', f: () => {
    const L = asCps().filter((r) => r.nhom_ma === 'tc_tra_no');
    if (!L.length) return asOk('Chưa ghi nhận khoản vay ngân hàng nào.');
    const keys = [...new Set(L.map((r) => `${r.d.id}|${r.doi_tac || '(chưa ghi)'}`))];
    const r = keys.map((k) => { const [id, nh] = k.split('|'), my = L.filter((x) => String(x.d.id) === id && (x.doi_tac || '(chưa ghi)') === nh), g = (h) => my.filter((x) => x.hm_ma === h).reduce((a, x) => a + x.sau_vat, 0);
      return { d: my[0].d, nh, vay: g('giai_ngan'), goc: g('goc'), lai: g('lai') }; });
    const S = (k) => r.reduce((a, x) => a + x[k], 0);
    return `<div class="as-kvs">${asKv('Đã nhận (giải ngân)', asTy(S('vay')) + ' tỷ')}${asKv('Đã trả gốc', asTy(S('goc')) + ' tỷ')}${asKv('Dư nợ', `<b>${asTy(S('vay') - S('goc'))}</b> tỷ`, 'Nhận − trả gốc')}${asKv('Lãi đã trả', asTy(S('lai')) + ' tỷ', 'Tính vào chi phí')}</div>
      ${asTbl(['Dự án / ngân hàng', 'Nhận', 'Trả gốc', 'Dư nợ', 'Lãi'], r.map((x) => [`${asPrj(x.d)}<div class="as-sub">${esc(x.nh)}</div>`, asTy(x.vay), asTy(x.goc), `<b>${asTy(x.vay - x.goc)}</b>`, asTy(x.lai)]))}
      ${asNote('Giải ngân và trả gốc là dòng tiền, không tính vào chi phí; chỉ lãi vay tính vào chi phí. Không chịu VAT.')}`;
  } },

  { id: 33, g: 'tra', q: 'Tra 1 dự án', pick: 'prj' },
  { id: 34, g: 'tra', q: 'Tra theo chủ đầu tư', pick: 'cdt' },
  { id: 35, g: 'tra', q: 'Tra theo loại công trình / địa điểm', pick: 'loai' },
  { id: 36, g: 'tra', q: 'Tra số HĐ / số chứng từ', pick: 'so' },

  // ===== ⑦ Xếp hạng và so sánh =====
  { id: 37, g: 'xh', q: 'Top 3 lãi nhiều nhất và tỷ suất cao nhất', f: () => {
    const M = asModel(), ln = [...M.rows].sort((a, b) => b.l3 - a.l3).slice(0, 3), ts = [...M.rows].filter((x) => x.t3).sort((a, b) => b.l3 / b.t3 - a.l3 / a.t3).slice(0, 3);
    const md = ['🥇', '🥈', '🥉'];
    return `<div class="as-h">Lợi nhuận cao nhất</div>${asTbl(['', 'Dự án', 'Lợi nhuận', 'Tỷ suất'], ln.map((x, i) => [md[i], asPrj(x.d), `<b>${asTy(x.l3)}</b>`, bpct(x.l3, x.t3)]))}
      <div class="as-h">Tỷ suất cao nhất</div>${asTbl(['', 'Dự án', 'Tỷ suất', 'Lợi nhuận'], ts.map((x, i) => [md[i], asPrj(x.d), `<b>${bpct(x.l3, x.t3)}</b>`, asTy(x.l3)]))}
      ${asNote(`Theo TĐ mới nhất (chưa quyết toán: tạm tính) · ${asVt()}.`)}${asGo('I')}`;
  } },
  { id: 38, g: 'xh', q: 'Top 3 biến động LN từ lúc ký đến nay', f: () => {
    const M = asModel(), r = [...M.rows].sort((a, b) => Math.abs(b.l3 - b.ln1) - Math.abs(a.l3 - a.ln1)).slice(0, 3);
    return `${asTbl(['Dự án', 'LN lúc ký', 'LN hiện tại', 'Biến động'], r.map((x) => { const d = x.l3 - x.ln1;
      return [asPrj(x.d), asTy(x.ln1), asTy(x.l3), `<b class="${d < 0 ? 'neg' : 'pos'}">${d >= 0 ? '▲ +' : '▼ −'}${bTy(Math.abs(d))}</b> <small>${x.ln1 ? `(${d >= 0 ? '+' : '−'}${bpct(Math.abs(d), Math.abs(x.ln1))})` : ''}</small>`]; }))}
      ${asNote(`Xếp theo mức thay đổi lớn nhất (tăng hoặc giảm) · ${asVt()}.`)}${asGo('I')}`;
  } },
  { id: 39, g: 'xh', q: 'So sánh 2 dự án', pick: 'cmp' },
  { id: 40, g: 'xh', q: 'Lợi nhuận theo năm khởi công', f: () => {
    const M = asModel(), yr = (x) => String(x.d.ngay_ky_hd || x.d.ngay_bat_dau || '').slice(0, 4) || 'Chưa có ngày';
    const ys = [...new Set(M.rows.map(yr))].sort();
    const r = ys.map((y) => { const L = M.rows.filter((x) => yr(x) === y), S = (k) => L.reduce((a, x) => a + x[k], 0); return { y, n: L.length, t: S('t3'), l: S('l3'), l1: S('ln1') }; });
    return `${asTbl(['Năm', 'Số DA', 'Doanh thu', 'Lợi nhuận', 'Tỷ suất', 'LN lúc ký'], r.map((o) => [`<b>${esc(o.y)}</b>`, String(o.n), asTy(o.t), `<b>${asTy(o.l)}</b>`, bpct(o.l, o.t), asTy(o.l1)]), ['Tổng', String(M.rows.length), asTy(M.S('t3')), `<b>${asTy(M.S('l3'))}</b>`, bpct(M.S('l3'), M.S('t3')), asTy(M.S('ln1'))])}
      ${asNote(`Năm khởi công = năm ký HĐ CĐT đầu tiên · số theo TĐ mới nhất · ${asVt()}.`)}`;
  } },
];
// ---- Trả lời đợt 2: tra 1 đối tác, chi phí 1 dự án, so sánh 2 dự án ----
function asTpAnswer(name) {
  const L = asTps().filter((c) => c.doi_tac === name);
  if (!L.length) return asOk('Không tìm thấy đối tác.');
  const S = (f) => L.reduce((a, c) => a + f(c), 0);
  return `<div class="as-h">${esc(name)}</div>
    <div class="as-kvs">${asKv('Số HĐ', `${L.length} HĐ`, `${L.filter((c) => c.da_qt).length} đã quyết toán`)}${asKv('Giá trị HT/QT', asTy(S(asTpVal)) + ' tỷ', asVt())}${asKv('Đã trả', asTy(S((c) => c.da_tt)) + ' tỷ')}${asKv('Còn nợ', `<b>${asTy(S((c) => c.con_lai))}</b> tỷ`)}</div>
    ${asTbl(['HĐ', 'HĐ + PL', 'HT/QT', 'Đã trả', 'Còn nợ'], L.map((c) => [`${esc(c.so_ma)}${c.so_pl ? ` <small>+${c.so_pl} PL</small>` : ''}<div class="as-sub">${asPrj(c.d)} · ${esc(AS_TPN[c.nhom] || c.loai)} · ${esc(c.trang_thai)}</div>`, asTy(c.hd_sv), asTy(asTpVal(c)), asTy(c.da_tt), asTy(c.con_lai)]))}
    ${asNote('HĐ + PL, đã trả, còn nợ: sau VAT.')}`;
}
function asCpProject(id) {
  const d = BC.du_an.find((x) => x.id === id), v = BST.vat; if (!d) return asOk('Không tìm thấy dự án.');
  const r = (d.nhom || []).filter((n) => n[v]).sort((a, b) => b[v] - a[v]), tot = r.reduce((a, n) => a + n[v], 0), mx = r[0]?.[v] || 0;
  if (!r.length) return asOk('Dự án chưa có chi phí.');
  return `<div class="as-h"><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</div>${asTbl(['Nhóm chi phí', 'Giá trị (tỷ)', 'Tỷ trọng'], r.map((n) => [esc(n.ten), asTy(n[v]), `${asBar(n[v], mx)}${bpct(n[v], tot)}`]), ['Tổng', asTy(tot), '100%'])}
    ${asNote(`Chi phí đã ghi nhận (HĐ đầu vào theo HĐ / quyết toán + chi phí khác), không gồm vay, trả gốc · ${asVt()}.`)}<button type="button" class="as-go" data-asprj="${d.id}">Mở thẻ dự án →</button>`;
}
function asCompare(a, b) {
  const M = asModel(), x = M.rows.find((r) => r.d.id === a), y = M.rows.find((r) => r.d.id === b); if (!x || !y) return asOk('Không tìm thấy dự án.');
  const L = [['Doanh thu', 't3'], ['Chi phí', 'c3'], ['Lợi nhuận', 'l3', 1], ['LN lúc ký', 'ln1'], ['Đã thu', 'thu'], ['Đã chi', 'chi'], ['Còn phải thu', 'phai_thu']];
  const hi = (p, q, on) => (on && p > q ? 'as-win' : '');
  const tx = x.t3 ? x.l3 / x.t3 : 0, ty = y.t3 ? y.l3 / y.t3 : 0;
  return `<div class="as-sub"><b>${esc(x.d.ma_du_an)}</b> ${esc(x.d.ten_du_an)} · ${esc(x.d.trang_thai)} ${x.d.tien_do || 0}%</div>
    <div class="as-sub"><b>${esc(y.d.ma_du_an)}</b> ${esc(y.d.ten_du_an)} · ${esc(y.d.trang_thai)} ${y.d.tien_do || 0}%</div>
    ${asTbl(['Tỷ đồng', esc(x.d.ma_du_an), esc(y.d.ma_du_an)], [
    ...L.map(([t, k, on]) => [t, `<span class="${hi(x[k], y[k], on)}">${asTy(x[k])}</span>`, `<span class="${hi(y[k], x[k], on)}">${asTy(y[k])}</span>`]),
    ['Tỷ suất', `<span class="${hi(tx, ty, 1)}">${bpct(x.l3, x.t3)}</span>`, `<span class="${hi(ty, tx, 1)}">${bpct(y.l3, y.t3)}</span>`],
  ])}${asNote(`TĐ mới nhất · ${asVt()}. Tô xanh: dự án có lợi nhuận / tỷ suất cao hơn.`)}`;
}

// ---- Trả lời tra cứu ----
function asOneProject(id) {
  const d = BC.du_an.find((x) => x.id === id); if (!d) return asOk('Không tìm thấy dự án.');
  const x = asModel().rows.find((r) => r.d.id === id);
  const info = [d.chu_dau_tu && `CĐT: ${esc(d.chu_dau_tu)}`, d.loai_cong_trinh && esc(d.loai_cong_trinh), d.dia_diem && esc(d.dia_diem)].filter(Boolean).join(' · ');
  const tp = d.tp || {};
  return `<div class="as-h"><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)} <span class="st st-${slug(d.trang_thai)}">${esc(d.trang_thai)}</span> <small>${d.tien_do || 0}%</small></div>
    ${info ? `<div class="as-sub">${info}</div>` : ''}
    ${asTbl(['', 'Lúc ký (TĐ1)', 'Điều chỉnh (TĐ2)', 'Mới nhất'], [
      ['Doanh thu', asTy(x.dt1), asTy(x.t2), asTy(x.t3)],
      ['Chi phí', asTy(x.cp1), asTy(x.c2), asTy(x.c3)],
      ['Lợi nhuận', asTy(x.ln1), asTy(x.l2), `<b>${asTy(x.l3)}</b>`],
      ['Tỷ suất', bpct(x.ln1, x.dt1), bpct(x.l2, x.t2), bpct(x.l3, x.t3)],
    ])}
    <div class="as-kvs">${asKv('Đã thu', asTy(x.thu) + ' tỷ', `${bpct(x.thu, x.hd_sv)} doanh thu`)}${asKv('Đã chi', asTy(x.chi) + ' tỷ', `Thu − chi: ${asTy(x.con)} tỷ`)}${asKv('Còn phải thu', asTy(x.phai_thu) + ' tỷ')}
      ${asKv('HĐ đầu vào', `${tp.n || 0} HĐ`, `${tp.n_qt || 0} đã QT · đã trả ${bTy(tp.da_tt || 0)} · còn nợ ${bTy(tp.con_lai || 0)} tỷ`)}${d.bh_khac ? asKv('Bảo hành CĐT giữ', asTy(d.bh_khac) + ' tỷ') : ''}${asKv('Cảnh báo dữ liệu', String(d.canh_bao.length))}</div>
    ${asNote(`${x.qt ? 'Đã quyết toán – số thực' : 'Chưa quyết toán – mới nhất lấy theo TĐ2 (tạm tính)'} · ${asVt()} · thầu phụ sau VAT.`)}
    <button type="button" class="as-go" data-asprj="${d.id}">Mở thẻ dự án →</button>`;
}
function asGroupProjects(title, L) {
  if (!L.length) return asOk('Không có dự án nào.');
  const M = asModel(), r = M.rows.filter((x) => L.includes(x.d)), S = (k) => r.reduce((a, x) => a + x[k], 0);
  return `<div class="as-h">${title}</div>${asTbl(['Dự án', 'Doanh thu', 'Lợi nhuận', 'Đã thu', 'Còn phải thu'], r.map((x) => [asPrj(x.d), asTy(x.t3), asTy(x.l3), asTy(x.thu), asTy(x.phai_thu)]),
    [`Tổng (${r.length})`, asTy(S('t3')), asTy(S('l3')), asTy(S('thu')), asTy(S('phai_thu'))])}${asNote(`Doanh thu, lợi nhuận theo TĐ mới nhất · ${asVt()}.`)}`;
}
function asSoMatches(key) {
  const k = asNorm(key), out = [];
  if (k.length < 2) return out;
  for (const d of BC.du_an) {
    for (const h of d.hds) if (asNorm(h.so_hieu).includes(k) || asNorm(h.so_ma).includes(k)) out.push({ t: 'hd', d, h });
    for (const c of d.chi_tiet?.thau_phu || []) if (asNorm(c.so_ma).includes(k)) out.push({ t: 'tp', d, c });
    for (const r of d.chi_tiet?.chi_phi || []) if (r.so_ct && asNorm(r.so_ct).includes(k)) out.push({ t: 'cp', d, r });
  }
  return out;
}
function asSoAnswer(key) {
  const m = asSoMatches(key);
  if (!m.length) return asOk(`Không tìm thấy số HĐ / chứng từ chứa "${esc(key)}".`);
  const v = BST.vat, hd = m.filter((x) => x.t === 'hd'), tp = m.filter((x) => x.t === 'tp'), cp = m.filter((x) => x.t === 'cp').slice(0, 15);
  return [
    hd.length && `<div class="as-h">HĐ với chủ đầu tư</div>${asTbl(['HĐ', 'Giá trị HĐ + PL', 'Đã NT', 'Đã thu'], hd.map((x) => [`${esc(x.h.so_hieu)}<div class="as-sub">${asPrj(x.d)}</div>`, asTy(x.h.hd[v]), asTy(x.h.nt[v]), asTy(x.h.tien_ve)]))}`,
    tp.length && `<div class="as-h">HĐ thầu phụ</div>${asTbl(['HĐTP', 'HĐ (sau VAT)', 'Đã trả', 'Còn nợ'], tp.map((x) => [`${esc(x.c.so_ma)} · ${esc(x.c.doi_tac)}<div class="as-sub">${asPrj(x.d)} · ${esc(x.c.trang_thai)}</div>`, asTy(x.c.hd_sv), asTy(x.c.da_tt), asTy(x.c.con_lai)]))}`,
    cp.length && `<div class="as-h">Chứng từ chi phí</div>${asTbl(['Nội dung', 'Ngày', v === 'gt' ? 'Trước VAT' : 'Sau VAT'], cp.map((x) => [`${esc(x.r.noi_dung)}<div class="as-sub">${asPrj(x.d)} · ${esc(x.r.so_ct)}${x.r.doi_tac ? ' · ' + esc(x.r.doi_tac) : ''}</div>`, dmy(x.r.ngay), asTy(v === 'gt' ? x.r.gia_tri : x.r.sau_vat)]))}`,
  ].filter(Boolean).join('');
}
// Danh sách chọn cho câu tra cứu
function asPickHtml(kind) {
  const L = BC.du_an, uniq = (f) => [...new Set(L.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  if (kind === 'prj') return `<p>Chọn dự án (hoặc gõ mã / tên vào ô tìm bên dưới):</p><div class="as-chips">${L.map((d) => `<button type="button" class="as-chip" data-asone="${d.id}"><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</button>`).join('')}</div>`;
  if (kind === 'cdt') return `<p>Chọn chủ đầu tư:</p><div class="as-chips">${uniq((d) => d.chu_dau_tu).map((c) => `<button type="button" class="as-chip" data-ascdt="${esc(c)}">${esc(c)}</button>`).join('') || '<span class="muted">Chưa có dữ liệu CĐT</span>'}</div>`;
  if (kind === 'loai') {
    const chips = [...uniq((d) => d.loai_cong_trinh).map((c) => `<button type="button" class="as-chip" data-asloai="${esc(c)}">🏗 ${esc(c)}</button>`), ...uniq((d) => d.dia_diem).map((c) => `<button type="button" class="as-chip" data-asdd="${esc(c)}">📍 ${esc(c)}</button>`)];
    return chips.length ? `<p>Chọn loại công trình hoặc địa điểm:</p><div class="as-chips">${chips.join('')}</div>` : asOk('Các dự án chưa nhập loại công trình / địa điểm (nhập ở trang Dự án).');
  }
  if (kind === 'tp') { const ns = [...new Set(asTps().map((c) => c.doi_tac).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
    return ns.length ? `<p>Chọn thầu phụ / nhà cung cấp (hoặc gõ tên vào ô tìm):</p><div class="as-chips">${ns.map((c) => `<button type="button" class="as-chip" data-astp="${esc(c)}">🤝 ${esc(c)}</button>`).join('')}</div>` : asOk('Chưa có HĐ đầu vào nào.'); }
  if (kind === 'cpprj') return `<p>Chọn dự án:</p><div class="as-chips">${L.map((d) => `<button type="button" class="as-chip" data-ascp="${d.id}"><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</button>`).join('')}</div>`;
  if (kind === 'cmp') { AS.cmp = []; return `<p>Chọn <b>2 dự án</b> để so sánh:</p><div class="as-chips">${L.map((d) => `<button type="button" class="as-chip" data-ascmp="${d.id}"><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</button>`).join('')}</div>`; }
  return '<p>Gõ số HĐ, số HĐ thầu phụ hoặc số chứng từ vào ô tìm bên dưới rồi bấm Enter.</p>';
}
// Ô tìm nhanh: dự án, CĐT, loại / địa điểm, số HĐ / chứng từ
function asSearchHtml(key) {
  const k = asNorm(key), L = BC.du_an;
  const prj = L.filter((d) => asNorm(d.ma_du_an).includes(k) || asNorm(d.ten_du_an).includes(k));
  if (prj.length === 1 && asNorm(prj[0].ma_du_an) === k) return { one: prj[0].id };
  const uniq = (f) => [...new Set(L.map(f).filter((x) => x && asNorm(x).includes(k)))];
  const cdt = uniq((d) => d.chu_dau_tu), loai = uniq((d) => d.loai_cong_trinh), dd = uniq((d) => d.dia_diem), so = asSoMatches(key);
  const tpn = k.length >= 2 ? [...new Set(asTps().map((c) => c.doi_tac).filter((x) => x && asNorm(x).includes(k)))] : [];
  const chips = [
    ...prj.map((d) => `<button type="button" class="as-chip" data-asone="${d.id}"><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</button>`),
    ...cdt.map((c) => `<button type="button" class="as-chip" data-ascdt="${esc(c)}">👤 ${esc(c)}</button>`),
    ...loai.map((c) => `<button type="button" class="as-chip" data-asloai="${esc(c)}">🏗 ${esc(c)}</button>`),
    ...dd.map((c) => `<button type="button" class="as-chip" data-asdd="${esc(c)}">📍 ${esc(c)}</button>`),
    ...tpn.map((c) => `<button type="button" class="as-chip" data-astp="${esc(c)}">🤝 ${esc(c)}</button>`),
    so.length ? `<button type="button" class="as-chip" data-asso="${esc(key)}"># ${so.length} số HĐ / chứng từ khớp "${esc(key)}"</button>` : '',
  ].filter(Boolean);
  return { html: chips.length ? `<p>Kết quả cho "<b>${esc(key)}</b>":</p><div class="as-chips">${chips.join('')}</div>` : asOk(`Không tìm thấy "${esc(key)}". Thử mã dự án, tên CĐT, thầu phụ / nhà cung cấp, loại công trình, địa điểm hoặc số HĐ.`) };
}

// ---------------------------------------------------------------------
// Giao diện khung chat
// ---------------------------------------------------------------------
const asUse = () => { try { return JSON.parse(localStorage.getItem('tro_ly_dung') || '{}'); } catch { return {}; } };
const asCount = (id) => { try { const u = asUse(); u[id] = (u[id] || 0) + 1; localStorage.setItem('tro_ly_dung', JSON.stringify(u)); } catch {} };
function asMenuHtml() {
  const u = asUse(), hay = AS_Q.filter((q) => u[q.id]).sort((a, b) => u[b.id] - u[a.id]).slice(0, 5);
  return `<p>Chào ${esc(ME.full_name || ME.username || 'anh/chị')}, em là trợ lý số liệu của hệ thống. Chọn nhóm câu hỏi hoặc gõ vào ô tìm bên dưới.</p>
    ${hay.length ? `<div class="as-h">★ Câu hay dùng</div><div class="as-qs">${hay.map((q) => `<button type="button" class="as-q" data-asq="${q.id}">${esc(q.q)}</button>`).join('')}</div>` : ''}
    <div class="as-chips">${AS_GRP.map((g) => `<button type="button" class="as-chip as-grp" data-asg="${g.k}">${g.ic} ${g.ten}</button>`).join('')}</div>`;
}
const asGroupHtml = (k) => `<div class="as-qs">${AS_Q.filter((q) => q.g === k).map((q) => `<button type="button" class="as-q" data-asq="${q.id}">${esc(q.q)}</button>`).join('')}</div>`;

function asBubble(html, who = 'bot', rerun) {
  const log = $('#as-log');
  const el = document.createElement('div');
  el.className = `as-b as-${who}`;
  el.innerHTML = html;
  log.appendChild(el);
  while (log.children.length > 30) log.firstElementChild.remove();
  if (rerun) AS.last = { el, rerun };
  requestAnimationFrame(() => { (who === 'user' ? el : el.previousElementSibling || el).scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  return el;
}
// Hỏi – đáp: hiện câu hỏi (bong bóng phải) rồi câu trả lời (bong bóng trái), luôn tính lại theo số liệu mới nhất
async function asAsk(label, fn) {
  asBubble(esc(label), 'user');
  const el = asBubble('<span class="muted">Đang tổng hợp…</span>', 'bot');
  try { await asLoad(); el.innerHTML = fn(); AS.last = { el, rerun: fn }; } catch (err) { el.innerHTML = `<span class="neg">Lỗi: ${esc(err.message)}</span>`; }
}
async function asLoad(force) {
  if (!BC || force || Date.now() - AS.at > 60000) { BC = await api('/api/bao-cao'); AS.at = Date.now(); }
}
function asVatSync() { $$('#as-vat button').forEach((b) => b.classList.toggle('on', b.dataset.v === BST.vat)); }

// Chuyển tới báo cáo: mục I–III hoặc thẻ dự án
async function asNav(sec, prjId) {
  if (window.innerWidth <= 760) asToggle(false);
  if (prjId) BST.project = String(prjId);
  else BST.project = '';
  bSave();
  await showTab('report');
  const target = prjId ? $('.pc-grid .pc-card') : [...$$('.th-head .th-no')].find((n) => n.textContent.trim() === sec)?.closest('.th-head');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function asToggle(open) {
  const p = $('#as-panel'); if (!p) return;
  open = open ?? p.hidden;
  p.hidden = !open;
  $('#as-fab').setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('as-on', open);
  if (open) {
    asVatSync();
    if (!$('#as-log').children.length) asBubble(asMenuHtml());
    asLoad().catch(() => {});
    if (window.innerWidth > 760) $('#as-q').focus({ preventScroll: true });
  }
}

function asInit() {
  if (!ME?.role || ME.role === 'it' || $('#as-fab')) return; // IT: không có quyền xem số liệu tài chính
  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" id="as-fab" class="as-fab no-print" aria-expanded="false" aria-controls="as-panel" title="Trợ lý số liệu"><span class="as-fab-ic">💬</span><span class="as-fab-t">Trợ lý</span></button>
    <section id="as-panel" class="as-panel no-print" hidden role="dialog" aria-label="Trợ lý số liệu">
      <header class="as-head">
        <div class="as-ttl"><b>Trợ lý BKS</b><small>Số liệu khớp báo cáo · không dùng AI</small></div>
        <div class="seg as-vat" id="as-vat"><button type="button" data-v="gt">Trước VAT</button><button type="button" data-v="sv">Sau VAT</button></div>
        <button type="button" class="as-clr" data-asclear title="Xóa lịch sử hỏi đáp, bắt đầu yêu cầu mới" aria-label="Xóa lịch sử">↺</button>
        <button type="button" class="as-x" data-asclose title="Đóng (Esc)">×</button>
      </header>
      <nav class="as-nav">${AS_GRP.map((g) => `<button type="button" data-asg="${g.k}">${g.ic} ${g.ten}</button>`).join('')}<button type="button" data-asmenu title="Về đầu">⌂</button></nav>
      <div class="as-log" id="as-log" aria-live="polite"></div>
      <form class="as-foot" id="as-form" autocomplete="off">
        <input id="as-q" type="search" placeholder="Gõ mã / tên dự án, CĐT, địa điểm, số HĐ…" aria-label="Tìm nhanh">
        <button type="submit" class="as-send" title="Tìm">➤</button>
      </form>
    </section>`);
  $('#as-fab').addEventListener('click', () => asToggle());
  $('#as-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = $('#as-q').value.trim(); if (!key) return;
    $('#as-q').value = '';
    asBubble(esc(key), 'user');
    const el = asBubble('<span class="muted">Đang tìm…</span>');
    try {
      await asLoad();
      const r = asSearchHtml(key);
      if (r.one) { el.innerHTML = asOneProject(r.one); AS.last = { el, rerun: () => asOneProject(r.one) }; } else el.innerHTML = r.html;
    } catch (err) { el.innerHTML = `<span class="neg">Lỗi: ${esc(err.message)}</span>`; }
  });
  $('#as-panel').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const ds = b.dataset;
    if ('asclose' in ds) return asToggle(false);
    if ('asmenu' in ds) return asBubble(asMenuHtml());
    if ('asclear' in ds) { $('#as-log').innerHTML = ''; AS.last = null; $('#as-q').value = ''; return asBubble(asMenuHtml()); }
    if (b.closest('#as-vat')) {
      BST.vat = ds.v; bSave(); asVatSync();
      if (AS.last?.el?.isConnected) AS.last.el.innerHTML = AS.last.rerun();
      if (!$('#tab-report')?.hidden && BC) renderReport();
      return;
    }
    if (ds.asg) { const g = AS_GRP.find((x) => x.k === ds.asg); asBubble(esc(`${g.ic} ${g.ten}`), 'user'); return asBubble(asGroupHtml(ds.asg)); }
    if (ds.asq) {
      const q = AS_Q.find((x) => x.id === Number(ds.asq)); asCount(q.id);
      if (q.pick) { asBubble(esc(q.q), 'user'); await asLoad(); return asBubble(asPickHtml(q.pick)); }
      return asAsk(q.q, q.f);
    }
    if (ds.asone) { const d = BC.du_an.find((x) => x.id === Number(ds.asone)); return asAsk(`${d.ma_du_an} – ${d.ten_du_an}`, () => asOneProject(d.id)); }
    if (ds.ascdt) { const c = ds.ascdt; return asAsk(`Chủ đầu tư: ${c}`, () => asGroupProjects(`Dự án của ${esc(c)}`, BC.du_an.filter((d) => d.chu_dau_tu === c))); }
    if (ds.asloai) { const c = ds.asloai; return asAsk(`Loại công trình: ${c}`, () => asGroupProjects(`Loại công trình: ${esc(c)}`, BC.du_an.filter((d) => d.loai_cong_trinh === c))); }
    if (ds.asdd) { const c = ds.asdd; return asAsk(`Địa điểm: ${c}`, () => asGroupProjects(`Địa điểm: ${esc(c)}`, BC.du_an.filter((d) => d.dia_diem === c))); }
    if (ds.asso) { const c = ds.asso; return asAsk(`Số HĐ / chứng từ: ${c}`, () => asSoAnswer(c)); }
    if (ds.astp) { const c = ds.astp; return asAsk(`Đối tác: ${c}`, () => asTpAnswer(c)); }
    if (ds.ascp) { const d = BC.du_an.find((x) => x.id === Number(ds.ascp)); return asAsk(`Chi phí theo nhóm: ${d.ma_du_an}`, () => asCpProject(d.id)); }
    if (ds.ascmp) {
      const id = Number(ds.ascmp); AS.cmp = AS.cmp || [];
      if (AS.cmp.includes(id)) { AS.cmp = AS.cmp.filter((x) => x !== id); b.classList.remove('on'); return; }
      AS.cmp.push(id); b.classList.add('on');
      if (AS.cmp.length < 2) return;
      const [a, c] = AS.cmp; AS.cmp = []; b.closest('.as-chips')?.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
      const na = BC.du_an.find((x) => x.id === a).ma_du_an, nc = BC.du_an.find((x) => x.id === c).ma_du_an;
      return asAsk(`So sánh ${na} với ${nc}`, () => asCompare(a, c));
    }
    if (ds.asprj) return asNav(null, Number(ds.asprj));
    if (ds.asgo) return asNav(ds.asgo);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#as-panel').hidden && !document.querySelector('.pc-modal:not([hidden])')) asToggle(false); });
}
// Chờ app.js nạp xong thông tin người dùng (ME) rồi mới gắn trợ lý
(function asWait(n = 0) { if (ME?.role) asInit(); else if (n < 100) setTimeout(() => asWait(n + 1), 200); })();
