// Lộ trình prompt build hệ thống BKS (Revi + Dev) – xuất Word để in
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, Footer, PageNumber, Table, TableRow, TableCell, WidthType, ShadingType } = require('docx');

const FONT = 'Arial', NAVY = '1F3A6E', TEAL = '0F7F75', MUTED = '64748B', W = 9638;

// [giai đoạn, mã, vai, tiêu đề, [dòng prompt], kết quả cần thấy]
const P = [
  ['GIAI ĐOẠN 0 – NỀN TẢNG'],
  ['P00', 'Dev', 'Quy ước chung (dán 1 lần đầu phiên)', [
    'Trả lời tiếng Việt, ngắn gọn. Làm trên nhánh staging; tôi nói "sync" mới đưa lên main.',
    'Mỗi yêu cầu: sửa → tăng phiên bản → chạy thử (máy tính 1366px, điện thoại 390px) → commit, push staging → báo: đã làm / kiểm tra / cần tôi quyết.',
    'Tiền lưu số nguyên đồng. Màu: Doanh thu #2c5fa3, Chi phí #c27a3e, Lợi nhuận #16968a; tăng có lợi xanh, bất lợi đỏ (chi phí tăng = bất lợi).',
    'Không lưu mật khẩu vào file. Không xóa dữ liệu thật khi đổi cấu trúc.'], 'Claude xác nhận quy ước'],
  ['P01', 'Dev', 'Khởi tạo hệ thống', [
    'Tạo web Node 18 + Express + PostgreSQL (chỉ dùng express, pg). Không có DATABASE_URL thì chạy bộ nhớ tạm và hiện thanh cảnh báo vàng.',
    'Trang /setup lần đầu: tên công ty, tên hệ thống, tạo Quản trị, xong tự khóa. /login phiên 7 ngày, mật khẩu scrypt, sai 10 lần/15 phút chặn tạm.',
    'Quy tắc mật khẩu ≥8 ký tự, hoa, thường, số, ký tự đặc biệt, không chứa tên đăng nhập.',
    'Cấu hình deploy Railway (railway.json, /health).'], 'Đăng nhập được trên Railway'],
  ['P02', 'Dev', 'Tài khoản, cài đặt, phiên bản', [
    'Tài khoản: tạo / sửa / khóa / xóa, đặt lại mật khẩu; luôn còn ≥1 Quản trị; không tự hạ quyền, tự khóa mình. Tab Cá nhân đổi mật khẩu.',
    'Script scripts/bump-version.js: phiên bản V[lần trong ngày].[dd].[mm].[yy] giờ VN, lưu version.json.',
    'Tab Liên hệ: thông tin hệ thống, đơn vị sở hữu / phát triển, SĐT, mail, phiên bản; Quản trị sửa được.',
    'APP_ENV=staging thì hiện dải đỏ "HỆ THỐNG THỬ NGHIỆM". Tạo docs/TOM-TAT-PHIEN.md, 2 subagent: dev (làm), revi (rà soát).'], 'Có staging + main, số phiên bản hiện ở Liên hệ'],

  ['GIAI ĐOẠN 1 – NHẬP LIỆU'],
  ['P03', 'Dev', 'Dự án', [
    'Tab Dự án: mã, tên, chủ đầu tư, loại công trình, địa điểm, trạng thái (Chuẩn bị / Đang thi công / Tạm dừng / Hoàn thành), % tiến độ.',
    'Thêm / sửa / xóa, tìm không dấu, sắp xếp mã tự nhiên (DA-2 trước DA-10), xuất CSV, ghi người cập nhật.'], 'Danh sách dự án chạy'],
  ['P04', 'Dev', 'Doanh thu với chủ đầu tư', [
    'Theo từng dự án, 3 mục: (1) HĐ / PL (Loại HĐ, PL01… + Số mã, không trùng); (2) Hoàn thành / Quyết toán gắn HĐ gốc; (3) Tiền về gắn HĐ: Tạm ứng, TT Đợt n, Quyết toán.',
    'Mỗi dòng: ngày dd/mm/yyyy, giá trị trước VAT, VAT %, tiền VAT = làm tròn(giá trị × VAT%), sau VAT. VAT trống = "Tạm tính". Cho phép số âm (PL giảm). Có dòng tổng.',
    'Không xóa HĐ đang được HT/QT hoặc tiền về tham chiếu.'], 'HĐ 10 tỷ VAT 10% = 11 tỷ; PL −0,5 tỷ trừ đúng'],
  ['P05', 'Dev', 'Passcode xóa', [
    'Quản trị đặt passcode 8 chữ số ở Cài đặt (nhập lại mật khẩu), lưu mã hóa một chiều.',
    'Bắt buộc passcode khi xóa HĐ/PL, HĐ đầu vào, dự án. Hộp xác nhận liệt kê toàn bộ dữ liệu bị xóa kèm. Sai 5 lần khóa 15 phút.'], 'Xóa dự án hiện hộp passcode + danh sách'],
  ['P06', 'Dev', 'Chi phí 3 khối', [
    'B1 trực tiếp: Thầu phụ, Vật tư (chính/phụ), Nhân công (giao khoán, công nhật, vận chuyển, vệ sinh, bao che, thí nghiệm), Máy móc thiết bị, Tổ chức thi công/VP, Khác.',
    'B2 gián tiếp: Tiện ích phục vụ thi công, Lương thưởng, Ngoại giao (không VAT). B3 tài chính: Chi phí tài chính, Vay và trả nợ (bắt buộc tên ngân hàng): Nhận tiền vay – tiền vào, Trả gốc – không tính chi phí, Trả lãi – tính chi phí; Phạt CĐT.',
    'Bảng cây nhóm → hạng mục → dòng, tổng và tỷ trọng; gợi ý nội dung theo hạng mục. Bảng chi phí không hiện cột VAT, thuế suất ghi nhỏ dưới số sau VAT.'], 'Vay 2 tỷ, trả gốc 1 tỷ, lãi 20tr → chi phí chỉ tăng 20tr'],
  ['P07', 'Dev', 'Hợp đồng đầu vào', [
    'Thầu phụ, vật tư, máy móc thiết bị, nhân công giao khoán đều quản lý theo hợp đồng: HĐ gốc + PL, giá trị HT/QT (trống = bằng HĐ), thanh toán Tạm ứng / Đợt n / Quyết toán, Còn lại = HT/QT − đã trả.',
    'Có thanh toán Quyết toán thì khóa sổ; mở khóa = xóa dòng QT bằng passcode. Mỗi HĐ gắn 1 HĐ chủ đầu tư; bảng gộp theo HĐ CĐT.',
    'Form chi phí có ô Hình thức: Dòng lẻ / Hợp đồng. Bảng HĐ đầu vào: lọc Loại + Quyết toán có số đếm, cột HĐ 2 dòng, đơn vị triệu, đổi loại ngay trên dòng, nhóm "Mua lẻ – không HĐ" và dòng TỔNG GỒM MUA LẺ khớp cây chi phí.'], 'Tổng HĐ đầu vào + mua lẻ = 4 nhóm ở cây chi phí'],
  ['P08', 'Dev', 'Dữ liệu mẫu và tester', [
    'Cài đặt → Dữ liệu mẫu: 12 dự án DEMO-01…12 sát thực tế (lãi/lỗ đan xen, nghiệm thu hằng tháng, tạm ứng 15–30%, vay ngân hàng, chốt TĐ). Xóa bằng passcode.',
    'scripts/tester.js <URL> <user> <mật khẩu>: đối chiếu độc lập doanh thu, HĐ đầu vào, chi phí, báo cáo.'], 'Tester báo đạt 100%'],

  ['GIAI ĐOẠN 2 – THỜI ĐIỂM TĐ1 / TĐ2 / TĐ3'],
  ['P09', 'Dev', 'Chốt thời điểm ở thẻ dự án', [
    'TĐ1 Ký hợp đồng, TĐ2 Điều chỉnh, TĐ3 Quyết toán. Người có quyền bấm "Chốt TĐ" nhập ngày, DT dự kiến, CP dự kiến (trước VAT), ghi chú.',
    'Số hệ thống đối chiếu theo mốc: TĐ1 HĐ gốc, TĐ2 HĐ + PL, TĐ3 quyết toán; hiện "HT …" khi lệch số chốt.',
    'Ma trận DT · CP · LN · Tỷ suất 3 TĐ có ▲▼ so TĐ trước; bảng tiền thực tế theo giai đoạn (TĐ1 tạm ứng, TĐ2 các đợt, TĐ3 quyết toán) có cột Tổng.',
    'Ô "DT-CP dự kiến" (chi phí dự kiến, nhập tay) cho dự án chưa QT; chi phí ghi nhận vượt thì báo đỏ.'], 'Chốt TĐ1 → thêm PL → chốt TĐ2, ▲▼ đúng màu'],
  ['P10', 'Dev', 'Ngày và ảnh công trình', [
    'Ngày bắt đầu tự lấy ngày ký HĐ CĐT đầu tiên, ngày kết thúc lấy ngày quyết toán (công trình Hoàn thành luôn có ngày); 1 nút Sửa ngày, ô trống = tự động.',
    'Ảnh công trình: bấm khung để tải (JPG/PNG/WEBP, tự thu ≤1280px, ≤3MB), lưu PostgreSQL.'], 'Thẻ dự án có ngày và ảnh'],

  ['GIAI ĐOẠN 3 – BÁO CÁO'],
  ['P11', 'Dev', 'Khung trang Báo cáo', [
    'API /api/bao-cao tổng hợp toàn bộ số liệu. Tab Báo cáo là trang mặc định: lọc Phạm vi (tất cả / 1 dự án), Kỳ, nút Trước VAT / Sau VAT áp dụng mọi số.',
    'Đầu trang: logo, tên công ty, "BÁO CÁO TỔNG QUAN TÀI CHÍNH DỰ ÁN", phạm vi, đơn vị. Góc phải 3 dòng: Dòng thu / Thực chi / Còn lại (thu − chi), lũy kế đến hôm nay, không gồm vay và trả gốc.',
    'Lưới ô công trình kèm ảnh, bấm mở khung tổng quan nhanh (tab Tổng quan, Doanh thu, Chi phí, Lợi nhuận, Dòng tiền, Công nợ). Khối "Phân tích chi tiết" và Cảnh báo (bấm nhảy đúng chỗ sửa) mặc định ẩn.'], 'Đổi VAT / phạm vi số đổi theo'],
  ['P12', 'Dev', 'Mục I-A: Thực tế (dạng Hành trình)', [
    'Mục I "Bảng tổng hợp theo dõi thời điểm", luôn tính đến hôm nay. Phần A "Doanh thu hoàn thành – quyết toán · Thực tế": số máy tự tính.',
    '3 thẻ Theo HĐ gốc → Theo HĐ + phụ lục → Theo quyết toán nối mũi tên ghi DT/CP/LN tăng giảm. Mỗi thẻ: LN lớn, tỷ suất, DT, CP, CP/DT; chi phí tách "HĐ đầu vào + CP khác đến nay". Bấm thẻ nào thẻ đó nền xanh đậm.',
    'Hàng nút Chi tiết Doanh thu / Chi phí / Lợi nhuận mở bảng theo dự án (STT | Mã DA | Tên dự án | TĐ1 | PL1, PL2… | TĐ2 | TĐ3 | Đã nhận | Còn lại | BH/Khác | Ghi chú). Nút (+) LN gộp. BH/Khác, ghi chú nhập tay.'], 'TĐ1 + các PL = TĐ2 từng dòng'],
  ['P13', 'Dev', 'Mục I-B: Kế hoạch đã chốt', [
    'Phần B "Doanh thu – Chi phí theo thời điểm · Kế hoạch đã chốt": dùng số chốt TĐ; dự án chưa chốt lấy số thực tế, đánh dấu (*).',
    'Trái: "Lợi nhuận quyết toán · kế hoạch đã chốt" số lớn, tỷ suất, so lúc ký; 2 thanh Lúc ký / Quyết toán (dài = doanh thu, cam chi phí, xanh lãi; lỗ thì đỏ sọc).',
    'Phải: biểu đồ cột nhóm DT–CP–LN 3 TĐ (trục từ 0), câu kết luận tự động, bảng 3 thời điểm bấm chọn.',
    'Dưới: bảng theo dự án STT | Mã DA | Tên | Tình trạng | Doanh thu ▲▼ | Chi phí ▲▼ | Lợi nhuận | % Hoàn thành | Tỷ lệ LN; mũi tên rê chuột xem giá trị; dòng tổng ghi "x/N đã chốt".'], 'Bấm TĐ2 thì bảng dự án đổi theo'],
  ['P14', 'Dev', 'Đối chiếu kế hoạch – thực tế', [
    'Dưới phần B thêm khung thu gọn "Đối chiếu kế hoạch đã chốt (B) với thực tế (A)", chỉ mở khi bấm, nhớ trạng thái.',
    'Có câu giải thích 2 nguồn số khác nhau là bình thường. Bảng 3 TĐ × DT/CP/LN: Kế hoạch | Thực tế | Chênh (= Thực tế − Kế hoạch, xanh có lợi, đỏ bất lợi, lệch <1tr ghi "khớp").',
    'Bấm số bất kỳ → bảng theo dự án: Mã DA | Tên | Kế hoạch | Nguồn số (Chốt TĐ ngày… / Chưa chốt) | Thực tế | Chênh | nút Thẻ dự án; nút dẫn tới bảng chi tiết phần A. Bỏ dự án chưa có HĐ CĐT.'], 'Tổng chi tiết = ô vừa bấm'],
  ['P15', 'Dev', 'Mục II, III', [
    'II "Dòng tiền thực tế" theo kỳ báo cáo (nút 📅 chọn kỳ đặt tại đây): Dòng thu (tạm ứng + thanh toán + QT), Dòng chi (chi phí đã chi + đã trả HĐ đầu vào), Còn lại (thu − chi); thẻ + bảng dự án.',
    'III "Doanh thu còn lại sau thực chi" (đến hôm nay, không phải dòng tiền): Doanh thu (TĐ mới nhất · thực tế) − Thực chi; thẻ + bảng dự án + % thực chi / DT.'], 'Chọn kỳ cũ: mục II đổi, mục I, III giữ'],
  ['P16', 'Dev', 'Quy tắc số liệu', [
    'Làm tròn: DT, CP từng dự án làm tròn 0,01 tỷ trước; LN, chênh lệch, tổng tính từ số đã làm tròn (luôn cộng trừ khớp). Ghi chú quy tắc cuối báo cáo.',
    'Xem trước VAT: tiền thật (đã gồm VAT) quy đổi theo tỷ lệ DT (thu) và CP (chi) từng dự án, làm tròn 0,1 tỷ; dùng chung cho mục I-A và II.',
    'Số chốt (trước VAT) xem sau VAT: nhân tỷ lệ VAT của số hệ thống cùng TĐ, cùng chỉ tiêu; bằng số hệ thống thì lấy đúng số hệ thống.',
    'Không hiện số đồng khi rê chuột trên số đã làm tròn.'], 'Test đọc số trên màn hình: 0 lệch'],
  ['P17', 'Dev', 'Xuất file', [
    'In / PDF (A4 ngang, ẩn nút). Excel nhiều sheet (Tổng quan, Doanh thu, Tiền về, HĐ đầu vào có cột Loại, Chi phí…). Excel mẫu TMN trình ký (ExcelJS: logo, Times New Roman, tiêu đề navy, khung, #,##0). PowerPoint (bìa, tổng quan, biểu đồ, từng dự án, cảnh báo). Thư viện nhúng sẵn public/vendor, chỉ tải khi bấm.'], 'Số trong file khớp màn hình'],

  ['GIAI ĐOẠN 4 – PHÂN QUYỀN, BẢO MẬT'],
  ['P18', 'Dev', '8 vai trò', [
    'Quản trị, Kỹ thuật hệ thống (IT), Lãnh đạo, Ban Kiểm soát, Quản lý dự án / QS, Kế toán, Nhập liệu (tất cả), Chỉ xem. Kiểm tra quyền ở máy chủ.',
    'QS: HĐ, PL, nghiệm thu, HĐ đầu vào. Kế toán: tiền về, thanh toán, chi phí, vay. Lãnh đạo: chốt TĐ, DT-CP dự kiến. BKS: xem toàn bộ + nhật ký, không sửa. IT: tài khoản, phiên, nhật ký, không thấy số tài chính.',
    'Menu gộp: Báo cáo · Nhập liệu ▾ · Quản trị ▾. Nút (i) cạnh ô Vai trò mở bảng quyền 8 vai trò.'], 'Ma trận vai trò × API đạt'],
  ['P19', 'Dev', 'Bảo mật và phiên', [
    'Tường lửa tầng ứng dụng (header bảo mật, kiểm Origin, giới hạn yêu cầu, chặn tạm khi vượt). Tự đăng xuất sau 60 phút không thao tác.',
    'Tài khoản: cột Truy cập gần nhất, Đang trực tuyến. Quản trị xem phiên (thiết bị, IP, giờ, thao tác cuối) và buộc đăng xuất.'], 'Phiên hiện đúng, buộc đăng xuất được'],
  ['P20', 'Dev', 'Nhật ký hoạt động', [
    'Ghi mọi thêm / sửa / xóa (trước → sau), đăng nhập / đăng xuất / sai mật khẩu, xuất file. Lọc người, loại, ngày, tìm; phân trang số; 50/100/150 dòng.',
    'Nhật ký quá 7 ngày nén Brotli theo ngày, tự giải nén khi xem; không ai xóa được.'], 'Sửa 1 HĐ thấy trước → sau'],

  ['GIAI ĐOẠN 5 – TRỢ LÝ, ĐIỆN THOẠI'],
  ['P21', 'Dev', 'Trợ lý BKS (không dùng AI)', [
    'Nút 💬 góc phải dưới (ẩn với IT), dùng đúng hàm tính của báo cáo, tính đến hôm nay, theo nút VAT. Nút ↺ xóa lịch sử, nút "Xem trong báo cáo →".',
    '40 câu, 7 nhóm: ① Tổng quan ② Cảnh báo ③ Thu tiền CĐT ④ Chi tiền & thầu phụ ⑤ Chi phí ⑥ Tra cứu (dự án, CĐT, loại/địa điểm, số HĐ, thầu phụ – gõ không dấu) ⑦ Xếp hạng & so sánh 2 dự án.',
    'Mỗi câu ghi rõ nguồn: Kế hoạch (I-B) hay Thực tế (I-A).'], '40 câu chạy, 0 lỗi'],
  ['P22', 'Dev', 'Giao diện điện thoại', [
    'Màn ≤760px: bảng thành thẻ (nhãn : giá trị, không cuộn ngang), menu gọn, khung công trình vừa màn hình. Chạm 1 lần hiện bong bóng chú thích. Không nhảy trang khi bấm trên Safari. Bảng chọn kỳ co theo khung.'], 'Ảnh chụp 390px, 820px đạt'],

  ['GIAI ĐOẠN 6 – RÀ SOÁT VÀ PHÁT HÀNH'],
  ['P23', 'Revi', 'Rà soát độc lập', [
    'Revi: rà soát toàn bộ trang Báo cáo và Trợ lý (chỉ đọc): cùng tên khác số, nhãn sai công thức, làm tròn, quy đổi VAT, kỳ báo cáo, trường hợp biên. Báo theo mức Nghiêm trọng / Trung bình / Nhẹ kèm file:dòng và đề xuất. Tôi duyệt mục nào dev mới làm mục đó.'], 'Danh sách lỗi có đề xuất'],
  ['P24', 'Dev', 'Sửa theo revi + kiểm thử', [
    'Dev: sửa các mục đã duyệt. Viết kiểm thử tự động đọc số trên màn hình: DT − CP = LN, TĐ1 + PL = TĐ2, cộng dòng = tổng, mũi tên = hiệu, A ↔ II khớp; chạy cả trước và sau VAT; chụp 1366px và 390px.'], 'Kiểm thử báo 0 lệch'],
  ['P25', 'Dev', 'Phát hành', [
    'sync: đưa staging lên main (chỉ khi tôi nói), kiểm tra bản chính đã chạy phiên bản mới, cập nhật docs/TOM-TAT-PHIEN.md.'], 'Bản chính lên phiên bản mới'],
];

const T = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 50, before: o.before ?? 0, line: 276 }, alignment: o.align, keepNext: o.keepNext, keepLines: true,
  indent: o.ind ? { left: 300, hanging: 220 } : undefined,
  children: [].concat(text).map((t) => (typeof t === 'string' ? new TextRun({ text: t, font: FONT, size: o.size ?? 21, bold: o.bold, color: o.color, italics: o.italics }) : t)) });
const R = (t, o = {}) => new TextRun({ text: t, font: FONT, size: o.size ?? 21, bold: o.bold, color: o.color, italics: o.italics });

const children = [];
children.push(T('LỘ TRÌNH PROMPT BUILD HỆ THỐNG BKS – PROJECT PROFIT', { size: 30, bold: true, color: NAVY, align: AlignmentType.CENTER, after: 60 }));
children.push(T('Revi + Dev · 25 prompt theo thứ tự từ đầu đến cuối · gõ đúng nội dung trong khung', { size: 19, color: MUTED, align: AlignmentType.CENTER, after: 200 }));

const box = (lines) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: [new TableRow({ cantSplit: true, children: [new TableCell({
  width: { size: W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F4F8FB' }, margins: { top: 90, bottom: 90, left: 160, right: 160 },
  borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 18, color: TEAL } },
  children: lines.map((l, i) => T(l, { after: i === lines.length - 1 ? 0 : 50, size: 20, keepNext: true })) })] })] });

for (const row of P) {
  if (row.length === 1) {
    children.push(new Paragraph({ spacing: { before: 260, after: 120 }, keepNext: true, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 3 } },
      children: [R(row[0], { size: 23, bold: true, color: NAVY })] }));
    continue;
  }
  const [ma, vai, tieu, lines, kq] = row;
  children.push(T([R(`${ma} · `, { bold: true, color: TEAL, size: 21 }), R(`[${vai}] `, { bold: true, color: vai === 'Revi' ? 'B45309' : NAVY, size: 19 }), R(tieu, { bold: true, size: 21 })], { before: 120, after: 60, keepNext: true }));
  children.push(box(lines));
  children.push(T([R('Xong khi: ', { bold: true, color: MUTED, size: 17 }), R(kq, { italics: true, color: MUTED, size: 17 })], { before: 40, after: 80 }));
}

const doc = new Document({
  creator: 'Ban Kiểm soát', title: 'Lộ trình prompt build hệ thống BKS',
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [R('Lộ trình prompt BKS · Trang ', { size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED })] })] }) },
    children }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(process.argv[2], b); console.log('ok', b.length); });
