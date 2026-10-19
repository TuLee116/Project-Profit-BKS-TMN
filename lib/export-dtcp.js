// Xuất Excel "BẢNG TỔNG HỢP THEO DÕI DOANH THU - CHI PHÍ CÔNG TRÌNH" theo mẫu trình ký của TMN
// (logo, thông tin công ty, font Times New Roman, tiêu đề xanh navy, các cấp dòng vàng / cam / xám / trắng, dòng tổng vàng chữ đỏ).
// Cấp dòng: Công ty (vàng) → Nhóm trạng thái (cam) → Công trình (xám, số lũy kế thực hiện) → TĐ1–TĐ3 (trắng, số chốt nhập tay).
// Số tiền: đồng, trước VAT. CPTT = cột (7)…(21); %CPTT/DT để dạng công thức để người dùng sửa trực tiếp trong Excel.
const path = require('path');
const ExcelJS = require('exceljs');
const { isNgoaiCp } = require('./cost');

const CONG_TY = {
  ky_hieu: 'TMN',
  ten: 'CÔNG TY CỔ PHẦN XÂY DỰNG KIẾN TRÚC TÂN MINH NHÂN',
  dong: [
    'Trụ sở chính: Tổ 3, khối Ngân Giang, Phường Điện Ngọc, Thị xã Điện Bàn, Tỉnh Quảng Nam',
    'VPĐD: 248 – 250 Lê Văn Hiến, Phường Khuê Mỹ, Quận Ngũ Hành Sơn, TP. Đà Nẵng',
    'Tell/Hotline: (0236) 3958 718; Email: contact@tanminhnhan.com.vn',
    'Web: tanminhnhan.com.vn',
  ],
};
const LOGO = path.join(__dirname, 'assets', 'tmn-logo.png');

const FONT = 'Times New Roman';
const NAVY = 'FF002060', YELLOW = 'FFFFFF00', PEACH = 'FFF8CBAD', GRAY = 'FF595959';
const NUM = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
const PCT = '0.0%;-0.0%;"-"';
const TD_TEN = { 1: 'Ban đầu', 2: 'Có phát sinh', 3: 'Quyết toán' };
const TRANG_THAI = ['Đang thi công', 'Hoàn thành', 'Chuẩn bị', 'Tạm dừng'];

// Cột chi phí trực tiếp: [cột, tiêu đề, (lọc dòng chi phí)]
const isHopNhan = (r) => /h[ợo]p\s*nh[âa]n/i.test(`${r.doi_tac || ''}`);
const keToanMua = (r) => /k[ếe]\s*to[áa]n/i.test(`${r.noi_dung || ''} ${r.ghi_chu || ''}`);
const CP_COLS = [
  ['K', (r) => r.nhom === 'vat_tu' && r.nhom_con === 'chinh' && isHopNhan(r)],
  ['L', (r) => r.nhom === 'vat_tu' && r.nhom_con !== 'phu' && !(r.nhom_con === 'chinh' && isHopNhan(r))],
  ['M', (r) => r.nhom === 'vat_tu' && r.nhom_con === 'phu' && keToanMua(r)],
  ['N', (r) => r.nhom === 'vat_tu' && r.nhom_con === 'phu' && !keToanMua(r)],
  ['O', (r) => r.nhom === 'may_moc'],
  ['P', null], // thầu phụ: theo số thực hiện của hệ thống
  ['Q', (r) => r.nhom === 'nhan_cong' && !['cong_nhat', 'van_chuyen', 'ho_tro', 've_sinh', 'bao_che', 'thi_nghiem'].includes(r.nhom_con)], // giao khoán (+ dòng chưa chọn hạng mục)
  ['R', (r) => r.nhom === 'nhan_cong' && r.nhom_con === 'cong_nhat'],
  ['S', (r) => r.nhom === 'nhan_cong' && r.nhom_con === 'van_chuyen'],
  ['T', (r) => r.nhom === 'nhan_cong' && r.nhom_con === 'ho_tro'],
  ['U', (r) => r.nhom === 'nhan_cong' && r.nhom_con === 've_sinh'],
  ['V', (r) => r.nhom === 'nhan_cong' && r.nhom_con === 'bao_che'],
  ['W', (r) => r.nhom === 'nhan_cong' && r.nhom_con === 'thi_nghiem'],
  ['X', (r) => r.nhom === 'to_chuc'],
  ['Y', (r) => r.nhom === 'khac'],
];
const NUM_COLS = ['F', 'G', 'H', 'I', 'J', ...CP_COLS.map(([c]) => c), 'Z'];
const B1 = new Set(['thau_phu', 'vat_tu', 'nhan_cong', 'may_moc', 'to_chuc', 'khac']);

// Số lũy kế thực hiện của 1 công trình (trước VAT) từ dữ liệu báo cáo (lib/report.js)
function projectRow(d) {
  const lines = d.chi_tiet_cp; // dòng chi phí gốc (đã tính VAT) – không gồm vay / trả nợ gốc
  const v = {};
  for (const [c, f] of CP_COLS) if (f) v[c] = lines.filter(f).reduce((s, r) => s + r.gia_tri, 0);
  const other = lines.reduce((s, r) => s + r.gia_tri, 0);
  // Thầu phụ thực hiện = tổng chi phí thực hiện của hệ thống − chi phí khác (đúng quy tắc dashboard: đã QT theo QT, chưa QT theo các đợt thanh toán)
  v.P = d.thuc_hien.chi_phi.gt - other;
  const gianTiep = lines.filter((r) => !B1.has(r.nhom)).reduce((s, r) => s + r.gia_tri, 0);
  return {
    F: d.hds.reduce((s, h) => s + h.hd.gt, 0),        // giá trị HĐ + phụ lục
    G: d.du_kien.doanh_thu.gt,                          // sản lượng theo HĐ (đã QT theo QT)
    H: d.hds.reduce((s, h) => s + h.nt.gt, 0),          // sản lượng hồ sơ (HT/QT đã nghiệm thu)
    I: d.tien_ve,                                       // tiền về (sau VAT)
    J: d.thuc_hien.doanh_thu.gt,                        // doanh thu thời điểm
    ...v, gianTiep,
  };
}

async function buildDtcp({ du_an, ngay, nguoi_lap }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = nguoi_lap || 'PROJECT PROFIT';
  wb.created = new Date();
  const ws = wb.addWorksheet('DTCP (in trình)', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 13, zoomScale: 55 }],
    pageSetup: { paperSize: 8, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
      margins: { left: 0.354, right: 0.354, top: 0.354, bottom: 0.354, header: 0.2, footer: 0.2 }, printTitlesRow: '10:13' },
    headerFooter: { oddFooter: '&L&"Times New Roman"&10PROJECT PROFIT · Ban Kiểm soát&R&"Times New Roman"&10Trang &P/&N' },
  });
  const W = { A: 10.9, B: 13, C: 20.5, D: 70, E: 13, F: 24, G: 24, H: 24, I: 24, J: 25.4, K: 22, L: 22, M: 22, N: 22, O: 22, P: 24,
    Q: 22, R: 20, S: 20, T: 20, U: 20, V: 22, W: 20, X: 22, Y: 22, Z: 26, AA: 12, AB: 52 };
  ws.columns = Object.entries(W).map(([key, width]) => ({ key, width }));
  ws.getColumn('G').hidden = true; // giống mẫu: ẩn "Giá trị sản lượng đến …"
  const LAST = 'AB';
  const font = (o = {}) => ({ name: FONT, size: 15, ...o });
  const thin = { style: 'thin', color: { argb: 'FF000000' } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

  // ---- Đầu trang: logo + thông tin công ty ----
  [CONG_TY.ten, ...CONG_TY.dong].forEach((t, i) => {
    const r = i + 1;
    ws.mergeCells(`A${r}:${LAST}${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = t; c.font = font({ size: 13, bold: i === 0 }); c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(r).height = i === 0 ? 21.75 : 24.95;
  });
  ws.getRow(6).height = 15;
  for (let c = 1; c <= 28; c++) ws.getRow(6).getCell(c).border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  const logo = wb.addImage({ filename: LOGO, extension: 'png' });
  ws.addImage(logo, { tl: { col: 0.25, row: 0.15 }, ext: { width: 236, height: 150 }, editAs: 'oneCell' });

  ws.mergeCells(`A7:${LAST}7`);
  Object.assign(ws.getCell('A7'), { value: 'BẢNG TỔNG HỢP THEO DÕI DOANH THU - CHI PHÍ CÔNG TRÌNH' });
  ws.getCell('A7').font = font({ size: 36, bold: true });
  ws.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(7).height = 48;
  ws.mergeCells(`A8:${LAST}8`);
  const [y, m, dd] = ngay.split('-');
  ws.getCell('A8').value = `CẬP NHẬT: NGÀY ${dd}/${m}/${y}`;
  ws.getCell('A8').font = font({ size: 18, bold: true });
  ws.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(8).height = 24.75;
  ws.getRow(9).height = 17.25;

  // ---- Tiêu đề bảng (dòng 10–12) + số thứ tự cột (dòng 13) ----
  const head = (ref, text, o = {}) => {
    if (ref.includes(':')) ws.mergeCells(ref);
    const c = ws.getCell(ref.split(':')[0]);
    c.value = text;
    c.font = font({ size: o.size || 15, bold: true, color: { argb: o.yellow ? YELLOW : 'FFFFFFFF' } });
  };
  [['A10:A12', 'STT'], ['B10:B12', 'CÔNG TY'], ['C10:C12', 'KÝ HIỆU\nDT-CP'], ['D10:D12', 'TÊN CÔNG TRÌNH'], ['E10:E12', 'THỜI ĐIỂM'],
    ['F10:F12', 'GIÁ TRỊ HỢP ĐỒNG'], ['G10:G12', 'GIÁ TRỊ SẢN LƯỢNG ĐẾN …'], ['H10:H12', 'GIÁ TRỊ SẢN LƯỢNG HỒ SƠ ĐẾN …'],
    ['I10:I12', 'GIÁ TRỊ TIỀN VỀ ĐẾN …'], ['AB10:AB12', 'GHI CHÚ']].forEach(([r, t]) => head(r, t));
  head('J10:J12', 'DOANH THU THỜI ĐIỂM', { yellow: true });
  head('K10:Y10', 'CHI PHÍ TRỰC TIẾP', { yellow: true });
  head('Z10:AA11', 'GIÁ TRỊ CHI PHÍ', { yellow: true });
  [['K11:L11', '1. VẬT TƯ CHÍNH'], ['M11:N11', '2. VẬT TƯ PHỤ'], ['O11:O12', '3. MÁY MÓC - THIẾT BỊ CÔNG TRÌNH THUÊ'], ['P11:P12', '4. THẦU PHỤ'],
    ['Q11:W11', '5. NHÂN CÔNG'], ['X11:X12', '6. CHI PHÍ VĂN PHÒNG, TỔ CHỨC THI CÔNG'], ['Y11:Y12', '7. CHI PHÍ KHÁC - NCB']].forEach(([r, t]) => head(r, t, { size: 14 }));
  [['K12', 'HỢP NHÂN'], ['L12', 'ĐỐI TÁC KHÁC'], ['M12', 'Vật tư phụ công trình đề xuất bộ phận kế toán mua'], ['N12', 'Vật tư phụ công trình mua'],
    ['Q12', 'Nhân công giao khoán'], ['R12', 'Chi phí công nhật'], ['S12', 'Chi phí nhân công vận chuyển'], ['T12', 'Chi phí hỗ trợ đội thi công/ công nhân'],
    ['U12', 'Nhân công vệ sinh công nghiệp/ Sắp xếp thiết bị'], ['V12', 'Nhân công bao che sàn/ Biện pháp (giàn giáo, an toàn, cừ chắn,…)/ Thưởng'],
    ['W12', 'Chi phí Thí Nghiệm']].forEach(([r, t]) => head(r, t, { size: 14 }));
  head('Z12', 'CHI PHÍ TRỰC TIẾP');
  head('AA12', '%CPTT/ DT');
  ws.getRow(10).height = 31.5; ws.getRow(11).height = 40; ws.getRow(12).height = 96;
  const so = { A: '(1)', C: '(2)', D: '(3)', E: '(4)', F: '(5)', G: '(5.1)', H: '(5.2)', I: '(5.3)', J: '(6)' };
  CP_COLS.forEach(([c], i) => { so[c] = `(${i + 7})`; });
  Object.assign(so, { Z: '(22)', AA: '(23)', AB: '(24)' });
  for (let c = 1; c <= 28; c++) {
    for (let r = 10; r <= 12; r++) {
      const cell = ws.getRow(r).getCell(c);
      cell.fill = fill(NAVY); cell.border = box;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (!cell.font || cell.font.name !== FONT) cell.font = font({ bold: true, color: { argb: 'FFFFFFFF' } });
    }
    const n = ws.getRow(13).getCell(c);
    n.value = so[ws.getColumn(c).letter] || '';
    n.font = font({ bold: true }); n.alignment = { horizontal: 'center', vertical: 'middle' }; n.border = box;
  }
  ws.getRow(13).height = 30.75;

  // ---- Dữ liệu ----
  let r = 14;
  const style = (row, kind) => {
    const opt = {
      cty: { fill: YELLOW, color: 'FF000000', bold: true, h: 33.75 },
      nhom: { fill: PEACH, color: 'FF000000', bold: true, h: 33.75 },
      ct: { fill: GRAY, color: 'FFFFFFFF', bold: true, h: 33.75 },
      td: { fill: null, color: 'FF000000', bold: false, h: 30.75 },
      tong: { fill: YELLOW, color: 'FFFF0000', bold: true, h: 47.25 },
    }[kind];
    const R = ws.getRow(row);
    R.height = opt.h;
    for (let c = 1; c <= 28; c++) {
      const cell = R.getCell(c);
      if (opt.fill) cell.fill = fill(opt.fill);
      cell.font = font({ bold: opt.bold, color: { argb: opt.color }, italic: kind === 'td' });
      cell.border = box;
      const L = ws.getColumn(c).letter;
      if (NUM_COLS.includes(L)) { cell.numFmt = NUM; cell.alignment = { vertical: 'middle' }; }
      if (L === 'AA') { cell.numFmt = PCT; cell.alignment = { horizontal: 'center', vertical: 'middle' }; }
      if (L === 'AB') cell.font = font({ size: 12, bold: false, italic: true, color: { argb: opt.color } });
      if (NUM_COLS.includes(L) || L === 'AA') continue;
      cell.alignment = { horizontal: ['D', 'AB'].includes(L) ? 'left' : 'center', vertical: 'middle', wrapText: true, indent: L === 'D' ? (kind === 'td' ? 3 : kind === 'ct' ? 1 : 0) : 0 };
    }
  };
  const put = (row, col, value) => { ws.getCell(`${col}${row}`).value = value; };
  const cptt = (row, val) => put(row, 'Z', { formula: `SUM(K${row}:Y${row})`, result: val });
  const pct = (row, z, j) => put(row, 'AA', { formula: `IF(J${row}=0,0,Z${row}/J${row})`, result: j ? z / j : 0 });
  const sumRows = (row, rows, vals) => {
    for (const c of NUM_COLS) {
      const result = vals.reduce((s, x) => s + (x[c] || 0), 0);
      put(row, c, rows.length ? { formula: rows.map((x) => `${c}${x}`).join('+'), result } : 0);
    }
  };

  const groups = TRANG_THAI.map((t) => ({ t, list: du_an.filter((d) => d.trang_thai === t) }))
    .concat([{ t: 'Khác', list: du_an.filter((d) => !TRANG_THAI.includes(d.trang_thai)) }]).filter((g) => g.list.length);

  const ctyRow = r++;
  style(ctyRow, 'cty');
  const nhomRows = [], ctyVals = [];
  groups.forEach((g, gi) => {
    const nr = r++;
    style(nr, 'nhom');
    put(nr, 'A', gi + 1); put(nr, 'B', CONG_TY.ky_hieu);
    ws.mergeCells(`C${nr}:D${nr}`);
    put(nr, 'C', `CÔNG TRÌNH ${g.t.toUpperCase()} (${g.list.length})`);
    ws.getCell(`C${nr}`).alignment = { horizontal: 'left', vertical: 'middle' };
    const ctRows = [], vals = [];
    g.list.forEach((d, i) => {
      const cr = r++;
      style(cr, 'ct');
      const v = projectRow(d);
      put(cr, 'A', i + 1); put(cr, 'B', CONG_TY.ky_hieu); put(cr, 'C', d.ma_du_an); put(cr, 'D', d.ten_du_an);
      put(cr, 'E', 'Hiện tại');
      for (const c of NUM_COLS) if (c !== 'Z') put(cr, c, v[c] || 0);
      const z = CP_COLS.reduce((s, [c]) => s + (v[c] || 0), 0);
      v.Z = z;
      cptt(cr, z); pct(cr, z, v.J);
      put(cr, 'AB', `CP gián tiếp + tài chính: ${new Intl.NumberFormat('vi-VN').format(v.gianTiep)}`);
      ctRows.push(cr); vals.push(v);
      // Thời điểm chốt số TĐ1–TĐ3 (nhập tay): DT, CP tổng; giá trị HĐ theo mốc tương ứng
      for (const t of [...(d.thoi_diem || [])].sort((a, b) => a.td - b.td)) {
        const tr = r++;
        style(tr, 'td');
        const moc = d.moc || {};
        put(tr, 'A', `${i + 1}.${t.td}`); put(tr, 'B', CONG_TY.ky_hieu); put(tr, 'C', d.ma_du_an);
        put(tr, 'D', `TĐ${t.td} – ${TD_TEN[t.td]} (chốt ngày ${t.ngay.split('-').reverse().join('/')})`);
        put(tr, 'E', `TĐ${t.td}`);
        put(tr, 'F', t.td === 1 ? moc.dt_goc || 0 : t.td === 2 ? moc.dt_ps || 0 : moc.dt_qt || 0);
        put(tr, 'J', t.dt); put(tr, 'Z', t.cp); pct(tr, t.cp, t.dt);
        put(tr, 'AB', 'Số chốt – CP tổng');
      }
    });
    sumRows(nr, ctRows, vals);
    const gz = vals.reduce((s, x) => s + x.Z, 0), gj = vals.reduce((s, x) => s + x.J, 0);
    pct(nr, gz, gj);
    nhomRows.push(nr); ctyVals.push(...vals);
  });
  put(ctyRow, 'A', 'I'); put(ctyRow, 'B', CONG_TY.ky_hieu);
  ws.mergeCells(`C${ctyRow}:D${ctyRow}`);
  put(ctyRow, 'C', CONG_TY.ten);
  ws.getCell(`C${ctyRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  sumRows(ctyRow, nhomRows, ctyVals);
  const tz = ctyVals.reduce((s, x) => s + x.Z, 0), tj = ctyVals.reduce((s, x) => s + x.J, 0);
  pct(ctyRow, tz, tj);

  const tr = r++;
  style(tr, 'tong');
  ws.mergeCells(`A${tr}:D${tr}`);
  put(tr, 'A', 'TỔNG CỘNG');
  sumRows(tr, [ctyRow], ctyVals);
  pct(tr, tz, tj);
  ws.getRow(r + 1).getCell(1).value = `Ghi chú: đơn vị đồng, trước VAT (riêng cột (5.3) tiền về sau VAT). Dòng xám = lũy kế thực hiện của công trình đến ngày cập nhật; dòng TĐ = số chốt nhập tay (CP tổng gồm gián tiếp). (22) CPTT = (7)…(21). Người lập: ${nguoi_lap || ''}.`;
  ws.getRow(r + 1).getCell(1).font = font({ size: 13, italic: true });
  ws.pageSetup.printArea = `A1:${LAST}${r + 1}`;
  return wb.xlsx.writeBuffer();
}

// Dòng chi phí dùng cho cột CPTT: bỏ trả nợ gốc / nhận tiền vay (không phải chi phí)
const costLinesFor = (cost) => cost.filter((x) => !isNgoaiCp(x));

module.exports = { buildDtcp, costLinesFor, CONG_TY };
