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
// Câu hỏi đợt 1: ① Tổng quan · ② Cảnh báo · ③ Thu tiền CĐT · ⑥ Tra cứu
// ---------------------------------------------------------------------
const AS_GRP = [
  { k: 'tq', ten: 'Tổng quan', ic: '①' },
  { k: 'cb', ten: 'Cảnh báo', ic: '②' },
  { k: 'thu', ten: 'Thu tiền CĐT', ic: '③' },
  { k: 'tra', ten: 'Tra cứu', ic: '⑥' },
];
const AS_Q = [
  { id: 1, g: 'tq', q: 'Tình hình chung hôm nay', f: () => {
    const M = asModel(), t3 = M.S('t3'), c3 = M.S('c3'), l3 = M.S('l3'), thu = M.S('thu'), chi = M.S('chi');
    const nQt = M.rows.filter((x) => x.qt).length;
    return `<div class="as-kvs">${asKv('Doanh thu (TĐ mới nhất)', asTy(t3) + ' tỷ', `${M.rows.length} dự án · ${nQt} đã quyết toán`)}${asKv('Chi phí', asTy(c3) + ' tỷ', `Bằng ${bpct(c3, t3)} doanh thu`)}
      ${asKv('Lợi nhuận', asTy(l3) + ' tỷ', `Tỷ suất ${bpct(l3, t3)}`)}${asKv('Đã thu', asTy(thu) + ' tỷ', `Đạt ${bpct(thu, t3)} doanh thu`)}
      ${asKv('Đã chi', asTy(chi) + ' tỷ', `Thu − chi: ${asTy(thu - chi)} tỷ`)}${asKv('Còn phải thu', asTy(t3 - thu) + ' tỷ', 'Doanh thu − đã thu')}</div>${asGo('II')}`;
  } },
  { id: 2, g: 'tq', q: 'LN dự kiến lúc ký so với hiện tại', f: () => {
    const M = asModel(), a = M.S('ln1'), b = M.S('l3');
    const rows = [...M.rows].sort((x, y) => (y.l3 - y.ln1) - (x.l3 - x.ln1));
    return `<div class="as-kvs">${asKv('LN dự kiến lúc ký (TĐ1)', asTy(a) + ' tỷ', `Tỷ suất ${bpct(a, M.S('dt1'))}`)}${asKv('LN hiện tại (TĐ mới nhất)', asTy(b) + ' tỷ', `Tỷ suất ${bpct(b, M.S('t3'))}`)}
      ${asKv('Chênh lệch', `<span class="${b - a < 0 ? 'neg' : 'pos'}">${b - a >= 0 ? '▲ +' : '▼ −'}${bTy(Math.abs(b - a))}</span> tỷ`, b - a >= 0 ? 'Tăng so với lúc ký' : 'Giảm so với lúc ký')}</div>
      ${asTbl(['Dự án', 'LN lúc ký', 'LN hiện tại', 'Chênh lệch'], rows.map((x) => [asPrj(x.d), asTy(x.ln1), asTy(x.l3) + (x.qt ? '' : '<sup title="Tạm tính – chưa quyết toán">*</sup>'), `<span class="${x.l3 - x.ln1 < 0 ? 'neg' : 'pos'}">${x.l3 - x.ln1 >= 0 ? '+' : ''}${bTy(x.l3 - x.ln1)}</span>`]))}
      ${asNote('(*) Chưa quyết toán – số tạm tính. LN lúc ký theo TĐ1 đã chốt; dự án chưa chốt TĐ1 lấy theo HĐ gốc trên hệ thống.')}${asGo('II')}`;
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
    return `${asTbl(['Dự án', 'Đã thu', 'Đã chi', 'Thu − chi'], r.map((x) => [asPrj(x.d), asTy(x.thu), asTy(x.chi), asTy(x.con)]))}${asNote(`Tiền thật lũy kế đến nay, không gồm tiền vay, trả nợ gốc · ${asVt()}.`)}${asGo('III')}`;
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
    return `${asTbl(['Dự án', 'Trạng thái'], r.map((d) => [asPrj(d), esc(d.trang_thai)]))}${asNote('Mục II báo cáo đang lấy tạm theo HĐ gốc trên hệ thống cho các dự án này.')}`;
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
      ${asNote(`Doanh thu theo TĐ mới nhất (đã quyết toán lấy quyết toán) − tiền đã về · ${asVt()}. Gồm cả phần chưa nghiệm thu.`)}${asGo('IV')}`;
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
    return `${asTbl(['Dự án', 'Số tiền', 'Ghi chú'], r.map((d) => [asPrj(d), asTy(d.bh_khac), `<span class="as-gc">${esc(d.ghi_chu_bh)}</span>`]), ['Tổng', asTy(r.reduce((a, d) => a + d.bh_khac, 0)), ''])}${asNote('Nhập ở mục I – Chi tiết doanh thu – cột BH/Khác.')}`;
  } },

  { id: 33, g: 'tra', q: 'Tra 1 dự án', pick: 'prj' },
  { id: 34, g: 'tra', q: 'Tra theo chủ đầu tư', pick: 'cdt' },
  { id: 35, g: 'tra', q: 'Tra theo loại công trình / địa điểm', pick: 'loai' },
  { id: 36, g: 'tra', q: 'Tra số HĐ / số chứng từ', pick: 'so' },
];

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
  return '<p>Gõ số HĐ, số HĐ thầu phụ hoặc số chứng từ vào ô tìm bên dưới rồi bấm Enter.</p>';
}
// Ô tìm nhanh: dự án, CĐT, loại / địa điểm, số HĐ / chứng từ
function asSearchHtml(key) {
  const k = asNorm(key), L = BC.du_an;
  const prj = L.filter((d) => asNorm(d.ma_du_an).includes(k) || asNorm(d.ten_du_an).includes(k));
  if (prj.length === 1 && asNorm(prj[0].ma_du_an) === k) return { one: prj[0].id };
  const uniq = (f) => [...new Set(L.map(f).filter((x) => x && asNorm(x).includes(k)))];
  const cdt = uniq((d) => d.chu_dau_tu), loai = uniq((d) => d.loai_cong_trinh), dd = uniq((d) => d.dia_diem), so = asSoMatches(key);
  const chips = [
    ...prj.map((d) => `<button type="button" class="as-chip" data-asone="${d.id}"><b>${esc(d.ma_du_an)}</b> ${esc(d.ten_du_an)}</button>`),
    ...cdt.map((c) => `<button type="button" class="as-chip" data-ascdt="${esc(c)}">👤 ${esc(c)}</button>`),
    ...loai.map((c) => `<button type="button" class="as-chip" data-asloai="${esc(c)}">🏗 ${esc(c)}</button>`),
    ...dd.map((c) => `<button type="button" class="as-chip" data-asdd="${esc(c)}">📍 ${esc(c)}</button>`),
    so.length ? `<button type="button" class="as-chip" data-asso="${esc(key)}"># ${so.length} số HĐ / chứng từ khớp "${esc(key)}"</button>` : '',
  ].filter(Boolean);
  return { html: chips.length ? `<p>Kết quả cho "<b>${esc(key)}</b>":</p><div class="as-chips">${chips.join('')}</div>` : asOk(`Không tìm thấy "${esc(key)}". Thử mã dự án, tên CĐT, loại công trình, địa điểm hoặc số HĐ.`) };
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

// Chuyển tới báo cáo: mục I–IV hoặc thẻ dự án
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
    if (ds.asprj) return asNav(null, Number(ds.asprj));
    if (ds.asgo) return asNav(ds.asgo);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#as-panel').hidden && !document.querySelector('.pc-modal:not([hidden])')) asToggle(false); });
}
// Chờ app.js nạp xong thông tin người dùng (ME) rồi mới gắn trợ lý
(function asWait(n = 0) { if (ME?.role) asInit(); else if (n < 100) setTimeout(() => asWait(n + 1), 200); })();
