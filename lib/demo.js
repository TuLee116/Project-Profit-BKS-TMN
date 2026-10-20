const fs = require('fs');
const path = require('path');
// Dữ liệu mẫu để chạy thử hệ thống (tester): 12 dự án mã DEMO-01..12
//   Mỗi dự án 5–10 HĐ chủ đầu tư ở các giai đoạn: Mới ký / Đang thi công / Đã quyết toán
//   Mỗi HĐ CĐT 5–10 HĐ thầu phụ (ở các giai đoạn tạm ứng / thanh toán đợt / quyết toán) + chi phí khác
// Mọi dòng đi qua đúng bộ kiểm tra hợp lệ (lib/validate.js) như khi nhập tay.
const { validateProject, validateRevenue, validateTienVe, validateCost, validateTp, validateTpLine, validateTpPay } = require('./validate');
const { tienVat } = require('./revenue');

const DEMO_PREFIX = 'DEMO-';
const TODAY = '2026-10-15';

// Sinh số ngẫu nhiên có hạt giống (cùng hạt giống -> cùng bộ dữ liệu)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROJECTS = [
  { ten: 'Nhà xưởng KCN Tân Uyên', cdt: 'Cty TNHH Điện tử Sao Việt', trang_thai: 'Đang thi công', from: '2025-01-05', stages: [0.15, 0.45, 0.4], margin: 0.92 },
  { ten: 'Trung tâm thương mại Long Hậu', cdt: 'Cty CP Đầu tư Long Hậu', trang_thai: 'Đang thi công', from: '2025-04-10', stages: [0.25, 0.6, 0.15], margin: 1.02 },
  // Công trình hoàn thành: mọi HĐ chủ đầu tư đã quyết toán
  { ten: 'Khu nhà ở xã hội Bình Chánh', cdt: 'Cty CP Địa ốc Phú Lợi', trang_thai: 'Hoàn thành', from: '2024-11-01', stages: [0, 0, 1], margin: 0.88 },
  { ten: 'Kho lạnh Cảng Cát Lái', cdt: 'Tổng Cty Tân Cảng', trang_thai: 'Đang thi công', from: '2025-08-15', stages: [0.4, 0.5, 0.1], margin: 0.98, phat: 0.003 },
  { ten: 'Bệnh viện Đa khoa Thủ Đức', cdt: 'Ban QLDA Đầu tư XD TP. Thủ Đức', trang_thai: 'Chuẩn bị', from: '2026-03-01', stages: [0.7, 0.3, 0], margin: 0.95 },
  { ten: 'Trường THPT Nhơn Trạch', cdt: 'Ban QLDA ĐTXD tỉnh Đồng Nai', trang_thai: 'Đang thi công', from: '2025-02-15', stages: [0.2, 0.5, 0.3], margin: 0.95 },
  { ten: 'Cao ốc văn phòng Quận 7', cdt: 'Cty CP Phát triển Nam Sài Gòn', trang_thai: 'Hoàn thành', from: '2024-12-10', stages: [0, 0, 1], margin: 0.9 },
  { ten: 'Nhà máy xử lý nước thải Hiệp Phước', cdt: 'Cty CP KCN Hiệp Phước', trang_thai: 'Đang thi công', from: '2025-06-01', stages: [0.3, 0.55, 0.15], margin: 0.96 },
  { ten: 'Hạ tầng Khu dân cư Nhơn Đức', cdt: 'Cty TNHH Địa ốc Nhà Bè', trang_thai: 'Đang thi công', from: '2025-03-20', stages: [0.2, 0.5, 0.3], margin: 1.0, phat: 0.002 },
  { ten: 'Trung tâm Logistics Sóng Thần', cdt: 'Cty CP Kho vận Sóng Thần', trang_thai: 'Đang thi công', from: '2025-10-01', stages: [0.45, 0.5, 0.05], margin: 0.93 },
  { ten: 'Khách sạn Sea View Vũng Tàu', cdt: 'Cty CP Du lịch Biển Xanh', trang_thai: 'Đang thi công', from: '2026-01-15', stages: [0.3, 0.7, 0], margin: 0.97 },
  { ten: 'Trạm biến áp 110kV Củ Chi', cdt: 'Ban QLDA Điện lực miền Nam', trang_thai: 'Hoàn thành', from: '2024-10-15', stages: [0, 0, 1], margin: 0.86 },
];
const NHA_THAU = ['Cty Nền Móng Phía Nam', 'Cty Cơ điện Hưng Phát', 'Cty Kết cấu thép Đại Dũng', 'Cty PCCC Thành Đạt', 'Cty Nhôm kính Việt Á',
  'Cty Sơn & Chống thấm Kova', 'Cty Thang máy Thiên Nam', 'Cty Cảnh quan Xanh', 'Cty HVAC Lạnh Việt', 'Cty Xây lắp Hòa Bình Minh',
  'Cty Ống & Phụ kiện Bình Minh', 'Cty Điện nhẹ Sài Gòn', 'Cty Hạ tầng Phước Thành', 'Cty Cửa cuốn Austdoor Nam', 'Cty Trần thạch cao Vĩnh Tường'];
const HANG_MUC_TP = ['Cọc khoan nhồi', 'Kết cấu thép', 'Cơ điện (M&E)', 'PCCC', 'Nhôm kính mặt dựng', 'Chống thấm', 'Thang máy', 'Cảnh quan', 'HVAC', 'Hoàn thiện', 'Cấp thoát nước', 'Điện nhẹ', 'San lấp mặt bằng', 'Cửa cuốn', 'Trần thạch cao'];
const NCC = ['Thép Hòa Phát', 'Cty TNHH Hợp Nhân', 'Xi măng Hà Tiên', 'VLXD Minh Tâm', 'Gạch Đồng Tâm']; // Hợp Nhân: nhà cung cấp vật tư chính nội bộ (cột riêng trong mẫu TMN)
const BANKS = ['Vietcombank', 'BIDV', 'VietinBank', 'NCB', 'MB Bank'];

function buildPlan(seed = 2026) {
  const r = rng(seed);
  const int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const round = (v, unit = 1000000) => Math.round(v / unit) * unit;
  const addDays = (iso, n) => {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    const s = d.toISOString().slice(0, 10);
    return s > TODAY ? TODAY : s;
  };
  const sv = (gt, vat) => gt + tienVat(gt, vat);

  return PROJECTS.map((P, pi) => {
    const ma = `${DEMO_PREFIX}${String(pi + 1).padStart(2, '0')}`;
    const plan = {
      project: { ma_du_an: ma, ten_du_an: P.ten, chu_dau_tu: P.cdt, trang_thai: P.trang_thai, tien_do: 0,
        // Ngày bắt đầu / kết thúc để trống -> tự lấy theo ngày ký HĐ / ngày quyết toán; dự án chuẩn bị có ngày kết thúc kế hoạch tự điền (không chặn theo hôm nay)
        ngay_bat_dau: null, ngay_ket_thuc: (() => { const kt = new Date(Date.parse(P.from) + int(540, 900) * 86400000).toISOString().slice(0, 10); return P.trang_thai === 'Chuẩn bị' ? kt : null; })() },
      contracts: [], costs: [],
    };
    const nHd = int(5, 10);
    let doneWeight = 0;
    for (let h = 1; h <= nHd; h++) {
      const x = r();
      const stage = x < P.stages[0] ? 0 : x < P.stages[0] + P.stages[1] ? 1 : 2; // 0 mới ký, 1 đang TC, 2 đã QT
      const so_ma = `${String(h).padStart(2, '0')}/${ma.slice(5)}/2025/HĐTC`;
      const span = Math.max(0, Math.round((new Date(TODAY) - new Date(P.from)) / 86400000));
      const need = stage === 0 ? 20 : stage === 1 ? 150 : 330;   // số ngày cần cho các đợt nghiệm thu / quyết toán
      // HĐ đang thi công: ký sao cho các đợt nghiệm thu hằng tháng kéo dài tới gần hiện tại (không có tháng "chết")
      // HĐ đang thi công: ký rải từ đầu dự án, nghiệm thu hằng tháng liên tục tới gần hiện tại (không có tháng "chết")
      const ngay = h === 1 ? addDays(P.from, int(0, 10)) // HĐ đầu tiên ký ngay khi khởi công
        : stage === 1 ? addDays(P.from, int(0, Math.max(0, Math.round(span * 0.5))))
        : addDays(P.from, int(0, Math.max(0, span - need)));
      const nDot1 = Math.max(2, Math.min(22, Math.floor((Math.round((new Date(TODAY) - new Date(ngay)) / 86400000) - 2) / 30)));
      r(); pick([0]); const vat = 10; // VAT HĐ chủ đầu tư 10%
      const gt = round(int(3, 40) * 1e9 * (0.5 + r()), 1e6);
      const C = { stage, hd: { ma_loai: 'HĐ', so_ma, ngay, gia_tri: gt, vat, ghi_chu: ['Mới ký', 'Đang thi công', 'Đã quyết toán'][stage] },
        pl: [], qt: [], tv: [], tps: [] };
      // Phụ lục: tăng / giảm
      let tongHd = gt;
      for (let k = 1, n = stage === 0 ? int(0, 1) : int(0, 3); k <= n; k++) {
        const g = round(gt * (r() < 0.3 ? -1 : 1) * (0.03 + r() * 0.12), 1e6);
        tongHd += g;
        C.pl.push({ ma_loai: 'PL' + String(k).padStart(2, '0'), so_ma, ngay: addDays(ngay, 60 * k + int(0, 30)), gia_tri: g, vat, ghi_chu: g < 0 ? 'Phụ lục giảm khối lượng' : 'Phát sinh tăng' });
      }
      // Nghiệm thu / quyết toán (HT/QT) và tiền về
      r(); const tamUng = round(sv(tongHd, vat) * (0.15 + r() * 0.15), 1000); // CĐT tạm ứng 15–30% khi ký
      if (tamUng && stage >= 0 && (stage > 0 || r() < 0.6)) C.tv.push({ loai: 'tam_ung', so_tien: tamUng, ngay: addDays(ngay, int(5, 25)) });
      const daUng = C.tv.length ? tamUng : 0;
      const nts = [];        // các đợt nghiệm thu: { ngay, g } – chi phí và thanh toán thầu phụ bám theo
      if (stage >= 1) {
        const tongQt = stage === 2 ? round(tongHd * (0.95 + r() * 0.08), 1e6) : round(tongHd * (0.2 + r() * 0.6), 1e6);
        const nDot = stage === 2 ? int(7, 9) : nDot1; // nghiệm thu khối lượng hằng tháng
        let con = tongQt, ngayNt = ngay, daTra = 0;
        for (let d = 1; d <= nDot; d++) {
          const last = d === nDot;
          const g = last ? con : round(tongQt / nDot * (0.85 + r() * 0.3), 1e6);
          con -= g;
          ngayNt = addDays(ngayNt, int(29, 31));
          if (ngayNt > addDays(TODAY, -1)) ngayNt = addDays(TODAY, -1); // nghiệm thu liền mạch hằng tháng, không vượt quá hôm nay
          nts.push({ ngay: ngayNt, g });
          const quyetToan = last && stage === 2;
          C.qt.push({ so_hieu: quyetToan ? 'Quyết toán' : `Nghiệm thu đợt ${d}`, ngay: (r(), ngayNt), gia_tri: g, vat });
          // Thanh toán đợt: giá trị nghiệm thu sau VAT − thu hồi tạm ứng − giữ lại 5% (đợt cuối của HĐ đang TC có thể chưa trả)
          if (quyetToan) {
            const phaiTra = round(sv(tongQt, vat) * 0.95, 1000) - daUng - daTra;
            if (phaiTra > 0) C.tv.push({ loai: 'quyet_toan', so_tien: phaiTra, ngay: addDays(ngayNt, int(20, 45)) });
          } else if (!(last && r() < 0.3)) {
            const tra = Math.max(0, round(sv(g, vat) * 0.95 - (daUng * g) / tongQt, 1000));
            daTra += tra;
            C.tv.push({ loai: 'dot', dot: d, so_tien: tra, ngay: addDays(ngayNt, int(7, 15)) });
          }
        }
      }
      // Thầu phụ cho HĐ này
      const nTp = int(5, 10);
      const tyLeTp = (0.62 / nTp) * P.margin;
      // Trần tổng thầu phụ của HĐ: ≤ 90% giá trị HĐ (DT quyết toán ≥ 95% HĐ) -> không HĐ nào có thầu phụ vượt doanh thu.
      // Mỗi HĐTP tính phần dự phòng 45% (phụ lục tăng tối đa 2 × 20% + quyết toán +4%)
      let tpRoom = tongHd * 0.9;
      for (let t = 1; t <= nTp; t++) {
        const hm = HANG_MUC_TP[(h * 3 + t) % HANG_MUC_TP.length];
        r(); pick([0]); const tvat = 10; // VAT HĐ thầu phụ 10%
        const tgt = Math.min(round(tongHd * tyLeTp * (0.6 + r() * 0.8), 1e6), Math.floor(tpRoom / 1.45 / 1e6) * 1e6);
        if (tgt < 1e8) break; // hết hạn mức thầu phụ của HĐ
        const tngay = addDays(ngay, int(10, 60));
        // giai đoạn HĐTP theo giai đoạn HĐ CĐT: 0 chưa TT, 1 tạm ứng, 2 đang TT, 3 quyết toán (khóa sổ)
        const ts = stage === 0 ? int(0, 1) : stage === 1 ? 2 : (r() < 0.85 ? 3 : 2);
        const T = { tp: { so_ma: `TP-${String(h).padStart(2, '0')}.${String(t).padStart(2, '0')}/${ma.slice(5)}`, doi_tac: NHA_THAU[(h + t * 2) % NHA_THAU.length], ghi_chu: `${hm} – thuộc HĐ CĐT ${so_ma}` },
          hd: { ngay: tngay, gia_tri: tgt, vat: tvat, gia_tri_qt: null }, pl: [], pays: [] };
        let tTong = tgt;
        for (let k = 1, n = ts >= 2 ? int(0, 2) : 0; k <= n; k++) {
          const g = round(tgt * (r() < 0.35 ? -1 : 1) * (0.05 + r() * 0.15), 1e6);
          tTong += g;
          T.pl.push({ ma_loai: 'PL' + String(k).padStart(2, '0'), ngay: addDays(tngay, 45 * k), gia_tri: g, vat: tvat, gia_tri_qt: null });
        }
        const tSv = sv(tTong, tvat);
        // Tạm ứng khi khởi công; thanh toán đợt theo từng đợt nghiệm thu của HĐ CĐT (giữ lại 10%), sau nghiệm thu 10–25 ngày
        const tamUngTp = ts >= 1 ? round(tSv * (0.1 + r() * 0.05), 1000) : 0;
        if (tamUngTp) T.pays.push({ loai: 'tam_ung', so_tien: tamUngTp, ngay: addDays(tngay, int(3, 15)) });
        if (ts >= 2 && nts.length) {
          // Mỗi đợt: giá trị khối lượng × 90% (giữ lại 10%) − thu hồi tạm ứng theo tỷ lệ; tổng không vượt giá trị HĐTP
          let paid = tamUngTp;
          nts.forEach((n, d) => {
            const ratio = n.g / tongHd;
            let tra = Math.max(0, round(tSv * ratio * 0.9 - tamUngTp * ratio, 1000));
            tra = Math.min(tra, Math.max(0, round(tSv * 0.95, 1000) - paid));
            paid += tra;
            T.pays.push({ loai: 'dot', dot: d + 1, so_tien: tra, ngay: (r(), addDays(n.ngay, int(2, 6))) }); // trả thầu phụ ngay sau nghiệm thu
          });
        }
        if (ts === 3) {
          // Quyết toán: HT/QT từng dòng ±4%, khoản quyết toán = phần còn lại -> khóa sổ
          T.hd.gia_tri_qt = round(tgt * (0.97 + r() * 0.07), 1e6);
          T.pl.forEach((l) => { l.gia_tri_qt = l.gia_tri; });
          const qtSv = sv(T.hd.gia_tri_qt + T.pl.reduce((s2, l) => s2 + l.gia_tri_qt, 0), tvat);
          const paid = T.pays.reduce((s2, p2) => s2 + p2.so_tien, 0);
          const lastNt = nts.length ? nts[nts.length - 1].ngay : tngay;
          T.pays.push({ loai: 'quyet_toan', so_tien: Math.max(0, qtSv - paid), ngay: addDays(lastNt, int(1, 7)) });
        }
        tpRoom -= (T.hd.gia_tri_qt ?? T.hd.gia_tri) + T.pl.reduce((s2, l) => s2 + (l.gia_tri_qt ?? l.gia_tri), 0);
        C.tps.push(T);
      }
      // Chi phí trực tiếp khác (Số CT ghi số HĐ CĐT): phát sinh theo từng đợt nghiệm thu, đúng tỷ lệ khối lượng
      const base = tongHd;   // biên lợi nhuận từng công trình điều chỉnh qua giá trị thầu phụ (P.margin)
      const cp = (nhom, nhom_con, noi_dung, val, ngay2, extra = {}) => plan.costs.push({ nhom, nhom_con, noi_dung, so_ct: so_ma, ngay: ngay2,
        gia_tri: round(val, 1000), vat: (pick([0]), nhom === 'nhan_cong' ? 8 : 10), ...extra }); // VAT: nhân công 8%, vật tư và chi phí khác 10%
      const pr = nts.reduce((a, n) => a + n.g, 0) / tongHd;   // tỷ lệ khối lượng đã nghiệm thu
      nts.forEach((n, d) => {
        const f = n.g / tongHd;
        cp('vat_tu', 'chinh', `Thép, bê tông đợt ${d + 1}`, base * 0.05 * f * (0.9 + r() * 0.2), addDays(n.ngay, -int(0, 8)), { doi_tac: pick(NCC) });
        cp('nhan_cong', 'giao_khoan', `Tổ đội thi công đợt ${d + 1}`, base * 0.03 * f * (0.9 + r() * 0.2), addDays(n.ngay, int(0, 10)));
      });
      if (nts.length) {
        const d0 = addDays(nts[0].ngay, -int(20, 40));
        cp('vat_tu', 'phu', h % 2 ? 'Vật tư phụ, tiêu hao – đề xuất bộ phận kế toán mua' : 'Vật tư phụ, tiêu hao – công trình mua', base * 0.008 * pr, d0, { doi_tac: pick(NCC) });
        cp('nhan_cong', pick(['van_chuyen', 've_sinh', 'bao_che', 'thi_nghiem']), 'Nhân công phục vụ', base * 0.006 * pr, d0);
        cp('may_moc', null, 'Thuê cẩu, máy đào', base * 0.01 * pr, d0);
        if (r() < 0.25) cp('vat_tu', 'chinh', 'Hoàn trả vật tư thừa (giảm trừ)', -base * 0.003 * pr, addDays(nts[nts.length - 1].ngay, 15), { doi_tac: pick(NCC) });
        if (r() < 0.2) cp('khac', null, 'Chi phí khác phát sinh tại công trường', base * 0.002 * pr, addDays(nts[nts.length - 1].ngay, 5));
      } else if (r() < 0.5) {
        cp('to_chuc', null, 'Huy động lán trại, văn phòng công trường', base * 0.004, addDays(ngay, int(10, 30)));
      }
      doneWeight += stage === 2 ? 1 : stage === 1 ? 0.5 : 0.05;
      plan.contracts.push(C);
    }
    plan.project.tien_do = Math.round((doneWeight / nHd) * 100);
    // Chi phí chung của dự án: gián tiếp + tài chính, theo tháng
    // Công trình hoàn thành: ban chỉ huy giải thể sau đợt quyết toán cuối; đang làm: tới hiện tại; chuẩn bị: bộ máy gọn (30%)
    const lastQt = plan.contracts.flatMap((c) => c.qt.map((q) => q.ngay)).filter(Boolean).sort().pop();
    const end = P.trang_thai === 'Hoàn thành' && lastQt ? lastQt : TODAY;
    const months = Math.max(3, Math.min(24, Math.round((new Date(end) - new Date(P.from)) / (30.4 * 86400000))));
    const tongDt = plan.contracts.reduce((s, c) => s + c.hd.gia_tri, 0);
    const heSo = P.trang_thai === 'Chuẩn bị' ? 0.3 : 1;
    for (let m = 0; m < months; m++) {
      const ngay = addDays(P.from, 30 * m + 25);
      if (ngay > TODAY) break;
      plan.costs.push({ nhom: 'gt_luong', nhom_con: 'luong', noi_dung: `Lương BCH tháng ${m + 1}`, ngay, gia_tri: round(tongDt * 0.0025 * heSo, 1000), vat: 0 });
      plan.costs.push({ nhom: 'gt_tien_ich', nhom_con: pick(['tien_ich', 'cong_trinh', 've_may_bay']), noi_dung: `Tiện ích, phục vụ tháng ${m + 1}`, ngay, gia_tri: round(tongDt * 0.0004 * heSo * (0.5 + r()), 1000), vat: 10 });
    }
    plan.costs.push({ nhom: 'gt_luong', nhom_con: 'thuong_le', noi_dung: 'Thưởng Tết âm lịch', ngay: addDays(P.from, 120), gia_tri: round(tongDt * 0.003, 1000), vat: 0 });
    plan.costs.push({ nhom: 'gt_ngoai_giao', nhom_con: pick(['bgd1', 'bgd2', 'bgd0']), noi_dung: 'Chi ngoại giao', ngay: addDays(P.from, int(30, 300)), gia_tri: round(tongDt * 0.002, 1000), vat: 0 });
    plan.costs.push({ nhom: 'tc_chi_phi', nhom_con: null, noi_dung: 'Phí bảo lãnh thực hiện HĐ', ngay: addDays(P.from, 10), gia_tri: round(tongDt * 0.0015, 1000), vat: 0 });
    const bank = pick(BANKS);
    const nKy = int(2, 4), goc1 = round(tongDt * 0.02, 1000);
    // Khoản vay: giải ngân 1 lần đầu dự án, trả dần gốc + lãi mỗi 90 ngày (chỉ các kỳ đã đến hạn);
    // công trình hoàn thành đã trả hết gốc, công trình đang làm còn dư nợ 1–3 kỳ
    const conNo = P.trang_thai === 'Hoàn thành' ? 0 : int(1, 3);
    const kyDaTra = [];
    for (let k = 1; k <= nKy; k++) if (addDays(P.from, 90 * k) <= TODAY) kyDaTra.push(k);
    plan.costs.push({ nhom: 'tc_tra_no', nhom_con: 'giai_ngan', noi_dung: `Giải ngân khế ước vay KU-${String(pi + 1).padStart(2, '0')}`, doi_tac: bank, ngay: addDays(P.from, 5), gia_tri: goc1 * (kyDaTra.length + conNo), vat: 0 });
    for (const k of kyDaTra) {
      const d = addDays(P.from, 90 * k) > end ? end : addDays(P.from, 90 * k); // hoàn thành: tất toán cùng đợt quyết toán
      plan.costs.push({ nhom: 'tc_tra_no', nhom_con: 'goc', noi_dung: `Trả nợ gốc kỳ ${k}`, doi_tac: bank, ngay: d, gia_tri: goc1, vat: 0 });
      plan.costs.push({ nhom: 'tc_tra_no', nhom_con: 'lai', noi_dung: `Lãi vay kỳ ${k}`, doi_tac: bank, ngay: d, gia_tri: round(tongDt * 0.0018, 1000), vat: 0 });
    }
    if (P.phat) plan.costs.push({ nhom: 'tc_phat', nhom_con: null, noi_dung: 'Phạt chậm tiến độ', ngay: addDays(P.from, 200), gia_tri: round(tongDt * P.phat, 1000), vat: 0 });
    // Không có phát sinh sau ngày hiện tại: chi phí / thanh toán thầu phụ dời về hôm nay; tiền CĐT chưa đến hạn thì chưa về
    for (const c of plan.costs) if (c.ngay && c.ngay > TODAY) c.ngay = TODAY;
    for (const C of plan.contracts) {
      C.tv = C.tv.filter((t) => !t.ngay || t.ngay <= TODAY);
      for (const T of C.tps) for (const x of T.pays) if (x.ngay && x.ngay > TODAY) x.ngay = TODAY;
    }
    plan.thoi_diem = buildThoiDiem(plan, P, rng(seed * 31 + pi)); // bộ số ngẫu nhiên riêng: không làm đổi số liệu dự án
    return plan;
  });
}

// 3 thời điểm của công trình (số nhập tay, trước VAT):
//  TĐ1 Ban đầu = HĐ gốc / CP dự kiến ban đầu · TĐ2 Có phát sinh = sau phụ lục · TĐ3 Quyết toán (chỉ công trình đã quyết toán xong)
//  Số lấy theo đúng mốc hệ thống (khớp 100%)
function buildThoiDiem(plan, P, r) {
  const S = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const C = plan.contracts;
  const tps = C.flatMap((c) => c.tps);
  // Chi phí khác đã ghi nhận đến ngày chốt (≤ ngày) – giống cách hệ thống tính số HT của TĐ
  const cpKhac = (ngay) => S(plan.costs.filter((c) => !(c.nhom === 'tc_tra_no' && ['goc', 'giai_ngan'].includes(c.nhom_con)) && c.ngay && c.ngay <= ngay), (c) => c.gia_tri);
  const qtDone = (c) => c.stage === 2 && c.qt.length > 0;
  const moc = {
    1: (n) => [S(C, (c) => c.hd.gia_tri), S(tps, (t) => t.hd.gia_tri) + cpKhac(n)],
    2: (n) => [S(C, (c) => c.hd.gia_tri + S(c.pl, (l) => l.gia_tri)), S(tps, (t) => t.hd.gia_tri + S(t.pl, (l) => l.gia_tri)) + cpKhac(n)],
    3: (n) => [S(C, (c) => (qtDone(c) ? S(c.qt, (q) => q.gia_tri) : c.hd.gia_tri + S(c.pl, (l) => l.gia_tri))),
      S(tps, (t) => (t.hd.gia_tri_qt ?? t.hd.gia_tri) + S(t.pl, (l) => l.gia_tri_qt ?? l.gia_tri)) + cpKhac(n)],
  };
  const lech = (r(), false); // số chốt khớp đúng hệ thống (dữ liệu mẫu chuẩn)
  const adj = (v) => Math.round((lech ? v * (1 + (r() - 0.5) * 0.06) : v) / 1e6) * 1e6;
  const dates = C.map((c) => c.hd.ngay).sort();
  const plDates = C.flatMap((c) => c.pl.map((l) => l.ngay)).sort();
  const qtDates = C.flatMap((c) => c.qt.map((q) => q.ngay).filter(Boolean)).sort();
  const m1 = moc[1](dates[0]);
  const out = [{ td: 1, ngay: dates[0], dt: adj(m1[0]), cp: adj(m1[1]), ghi_chu: 'DT theo HĐ gốc, CP theo dự toán ban đầu' }];
  if (plDates.length && P.trang_thai !== 'Chuẩn bị') {
    const n2 = plDates[plDates.length - 1], m2 = moc[2](n2);
    out.push({ td: 2, ngay: n2, dt: adj(m2[0]), cp: adj(m2[1]), ghi_chu: `Sau ${plDates.length} phụ lục phát sinh` });
  }
  if (P.trang_thai === 'Hoàn thành' && out.length === 2) {
    const last = qtDates[qtDates.length - 1] || out[1].ngay;
    const n3 = last > out[1].ngay ? last : out[1].ngay, m3 = moc[3](n3);
    out.push({ td: 3, ngay: n3, dt: adj(m3[0]), cp: adj(m3[1]), ghi_chu: 'Hồ sơ quyết toán công trình' });
  }
  return out;
}

// Ghi vào CSDL; báo lỗi rõ nếu một dòng không qua kiểm tra hợp lệ
async function seedDemo(store, userId, seed) {
  const must = ({ data, errors }, what) => {
    if (errors.length) throw new Error(`Dữ liệu mẫu không hợp lệ (${what}): ${errors.join('; ')}`);
    return data;
  };
  const plans = buildPlan(seed);
  const count = { du_an: 0, hd: 0, pl: 0, ht_qt: 0, tien_ve: 0, thau_phu: 0, tp_thanh_toan: 0, chi_phi: 0, thoi_diem: 0 };
  for (const P of plans) {
    const pid = (await store.createProject(must(validateProject(P.project), P.project.ma_du_an), userId)).id;
    count.du_an++;
    // Ảnh minh họa công trình (lib/assets/demo/DEMO-xx.jpg): thiếu file thì bỏ qua
    try {
      const img = fs.readFileSync(path.join(__dirname, 'assets', 'demo', `demo-${P.project.ma_du_an.slice(-2)}.jpg`));
      if (store.setProjectImage) { await store.setProjectImage(pid, 'image/jpeg', img); count.anh = (count.anh || 0) + 1; }
    } catch { /* không có ảnh */ }
    for (const C of P.contracts) {
      const hdId = (await store.createRevenue(pid, must(validateRevenue({ loai: 'hd', ...C.hd }), C.hd.so_ma), userId)).id;
      count.hd++;
      for (const l of C.pl) { await store.createRevenue(pid, must(validateRevenue({ loai: 'hd', ...l }), l.ma_loai), userId); count.pl++; }
      for (const q of C.qt) { await store.createRevenue(pid, must(validateRevenue({ loai: 'qt', hd_id: hdId, ...q }), q.so_hieu), userId); count.ht_qt++; }
      for (const t of C.tv) { await store.createTienVe(pid, must(validateTienVe({ hd_id: hdId, ...t }), 'tiền về'), userId); count.tien_ve++; }
      for (const T of C.tps) {
        const tpId = (await store.createTp(pid, must(validateTp({ ...T.tp, hd_cdt_id: hdId }), T.tp.so_ma), must(validateTpLine({ ...T.hd, ma_loai: 'HĐ' }), T.tp.so_ma), userId)).id;
        count.thau_phu++;
        for (const l of T.pl) await store.createTpLine(tpId, must(validateTpLine(l), T.tp.so_ma + ' ' + l.ma_loai), userId);
        for (const p of T.pays) { await store.createTpPay(tpId, must(validateTpPay(p), T.tp.so_ma + ' thanh toán'), userId); count.tp_thanh_toan++; }
      }
    }
    for (const c of P.costs) { await store.createCost(pid, must(validateCost({ ...c, _new: true }), c.noi_dung), userId); count.chi_phi++; }
    for (const t of P.thoi_diem || []) { await store.setThoiDiem(pid, t.td, t, userId); count.thoi_diem++; }
  }
  return count;
}

module.exports = { DEMO_PREFIX, buildPlan, seedDemo };
