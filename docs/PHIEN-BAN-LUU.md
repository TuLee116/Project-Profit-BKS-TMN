# Các phiên bản đã lưu (để quay lại)

Mỗi phiên bản là một mốc trong lịch sử Git đã đẩy lên GitHub (nhánh `staging`), nên luôn khôi phục được.
Muốn quay lại: nhắn "quay về bản <mã phiên bản>", Claude làm trên staging trước, anh duyệt mới đưa lên main.

| Phiên bản | Mã lưu (commit) | Ngày | Nội dung chính |
|---|---|---|---|
| **V18.02.11.26** | `a628df6` | 02/11/2026 | **Bản main hiện tại.** Báo cáo mới: mục I gồm A Thực tế (Hành trình TĐ1→TĐ3) + B Kế hoạch (dashboard tông cafe), đối chiếu kế hoạch – thực tế, bản đồ, hiệu ứng, Dashboard PDF 1 trang |
| V03.03.11.26 | `69adb08` | 03/11/2026 | **Bản staging hiện tại.** Trang Báo cáo về kiểu V05 ngày 28/10, giữ Trợ lý 40 câu, bản đồ, Dashboard PDF |
| V10.02.11.26 | `fd7c969` | 02/11/2026 | Lúc vừa thêm hiệu ứng chuyển động / 3D |
| V01.29.10.26 | `0af3552` | 29/10/2026 | Trước khi dời mục IV lên mục I (mục I có biểu đồ cột nhóm) |
| V16.28.10.26 | `d4de557` | 28/10/2026 | Mục I kiểu chia đôi + biểu đồ cột nhóm DT – CP – LN |
| V05.28.10.26 | `22b58fe` | 28/10/2026 | Thẻ chỉ tiêu trắng đơn giản, trước khi làm thẻ màu và biểu đồ mục I; đã có Hợp đồng đầu vào + mua lẻ |
| V12.24.10.26 | `122aa68` | 24/10/2026 | Bản main cũ trước đợt Trợ lý và Hợp đồng đầu vào |

Ghi chú: quay lại phiên bản chỉ đổi phần mềm (giao diện, cách tính); **dữ liệu dự án trong cơ sở dữ liệu không bị đổi**.

## Toàn bộ phiên bản tháng 10/2026 (152 bản)

Kiểm tra 04/11/2026: cả 152 bản đều còn nguyên trên GitHub (nhánh staging), quay lại được bản nào cũng được.


### Ngày 16/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V03.16.10.26 | `51816d5` | Phiên bản tự động V[lần].[dd].[mm].[yy] (V03.16.10.26), hiển thị ở tab Liên hệ |
| V04.16.10.26 | `c04fa6a` | V04.16.10.26: Quản trị sửa được thông tin tab Liên hệ |
| V05.16.10.26 | `0e1a771` | Doanh thu mục 2: gộp Hoàn thành/Quyết toán theo hợp đồng |
| V06.16.10.26 | `40eb0e8` | Thầu phụ gộp theo HĐ chủ đầu tư |
| V07.16.10.26 | `9c47f1d` | Chi phí trực tiếp: nhóm Thầu phụ gộp theo HĐ chủ đầu tư (3 cấp) |
| V08.16.10.26 | `2c49c4d` | Tab Báo cáo tổng quan: tổng quát + chi tiết, xuất In/PDF, Excel, PowerPoint |
| V09.16.10.26 | `fea0fdd` | Báo cáo: Tổng quan tài chính theo kỳ (mẫu dashboard) và Mục tiêu năm |
| V10.16.10.26 | `d934b91` | Báo cáo theo công trình: thẻ 7 tab kèm ảnh công trình |
| V11.16.10.26 | `ef305f2` | Báo cáo: bỏ biểu tượng ở 4 thẻ KPI Tổng quan tài chính, thay bằng viền màu phía trên |
| V12.16.10.26 | `0669e83` | Báo cáo: gom phần I → V vào khối Phân tích chi tiết, mặc định ẩn |
| V13.16.10.26 | `cac258b` | Báo cáo theo công trình: ô chọn kỳ liên kết, nút Về tổng quan; thêm kỳ Toàn bộ thời gian |
| V14.16.10.26 | `2c58f3a` | Thẻ công trình: gộp tab Hạng mục vào tab Chi phí (khối → nhóm chi phí) |
| V15.16.10.26 | `2675b73` | Báo cáo: cảnh báo có liên kết tới đúng vị trí |
| V16.16.10.26 | `a0c15c5` | Báo cáo: bảng màu doanh nghiệp, biểu đồ DT–CP–LN toàn chiều rộng |
| V17.16.10.26 | `57fa72c` | Báo cáo: thanh lọc gọn một hàng; thẻ KPI cân đối, đủ thông tin |
| V18.16.10.26 | `3c7f59b` | Báo cáo: ô khoảng ngày bấm được để chọn kỳ |
| V19.16.10.26 | `ba93582` | Tab Dự án: chỉ còn nhập liệu và danh sách, bỏ khối tổng quan và biểu đồ |
| V20.16.10.26 | `8c010a3` | Báo cáo: Tổng quan tài chính sắp xếp 4 tầng rõ ràng |
| V21.16.10.26 | `4af4e5f` | Dữ liệu mẫu sát thực tế: có lãi có lỗ, tổng có lãi; phân bổ chi phí thầu phụ đã QT theo ngày thanh toán |
| V22.16.10.26 | `59da7b8` | Báo cáo: bỏ cảnh báo lặp trong Chi tiết dự án, giữ mục Cảnh báo & lưu ý; dữ liệu mẫu thu hồi tạm ứng thầu phụ |
| V23.16.10.26 | `aa669b6` | Báo cáo: Biểu đồ doanh thu – chi phí xem theo Năm/Quý/Tháng/Ngày, phóng to bằng bấm cột hoặc lăn chuột |
| V24.16.10.26 | `a9ac3f9` | Thêm dải báo HỆ THỐNG THỬ NGHIỆM khi đặt APP_ENV=staging |
| V25.16.10.26 | `fbfeb17` | Dữ liệu mẫu: 12 dự án (DEMO-01..12) lãi/lỗ đan xen; màu công trình theo thứ hạng doanh thu, khớp biểu đồ tròn |

### Ngày 19/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.19.10.26 | `8fbec92` | Phát hành bản chính: gộp các thay đổi từ staging (dải báo thử nghiệm, dữ liệu mẫu 12 dự án, màu công trình) |
| V02.19.10.26 | `e2e0485` | Tài khoản: thêm cột Truy cập gần nhất (tự ghi nhận, tối đa 1 lần/phút) và trạng thái Đang trực tuyến |
| V03.19.10.26 | `ce48c9f` | Truy cập gần nhất theo thời gian thực: trang đang mở gửi tín hiệu mỗi phút, tab Tài khoản tự làm mới 30 giây |
| V04.19.10.26 | `6227840` | Trạng thái trực tuyến chính xác theo phiên: đăng xuất / đóng trang -> ngoại tuyến ngay; tín hiệu 20 giây, danh sách tự làm mới 10 giây |
| V05.19.10.26 | `f40688c` | Gia cố bảo mật: tường lửa tầng ứng dụng |
| V06.19.10.26 | `c5987a3` | Tự đăng xuất khi không thao tác quá 60 phút (kể cả trang vẫn mở); tín hiệu tự động không gia hạn phiên |
| V07.19.10.26 | `849cf14` | Báo cáo theo công trình: lưới ô công trình kèm ảnh, bấm mở khung tổng quan nhanh, nút dẫn xuống chi tiết |
| V08.19.10.26 | `2198c21` | Nhật ký hoạt động cho quản trị: tự ghi thêm/sửa/xóa (giá trị trước → sau), đăng nhập/đăng xuất/hết phiên/đăng nhập sai, xuất báo cáo; lọc, xuất CSV… |
| V09.19.10.26 | `b391c20` | Nhật ký: nén Brotli theo ngày cho nhật ký quá 7 ngày, tự giải nén khi xem thêm / lọc / tìm kiếm; thống kê dung lượng. Báo cáo: phần chi tiết luôn ẩ… |
| V10.19.10.26 | `00c6dd4` | Khung tổng quan nhanh công trình: mở rộng gần toàn màn hình, biểu đồ cao gấp đôi, chữ số lớn hơn |
| V11.19.10.26 | `b0ef317` | Thẻ công trình: 3 thời điểm chốt số TĐ1–TĐ3 (nhập tay DT/CP thực tế, so với số hệ thống đến cùng ngày); chỉ hiện các TĐ đã nhập, nhập theo thứ tự, … |
| V12.19.10.26 | `558193a` | TĐ1 ban đầu · TĐ2 có phát sinh · TĐ3 quyết toán: đối chiếu theo mốc HĐ gốc / HĐ+PL / quyết toán; dữ liệu mẫu 12 dự án có đủ thời điểm (một số cố ý … |
| V13.19.10.26 | `9ce1fe5` | Báo cáo: mục Thực thu – Thực chi – Còn lại thực (tiền thật, sau VAT, lũy kế), so với kế hoạch theo HĐ; biểu đồ lũy kế, bảng theo công trình, trang … |
| V14.19.10.26 | `1b1bb02` | Ô công trình: hiện Thực thu · Thực chi · Còn lại (tiền thật, lũy kế) thay cho Doanh thu · Lợi nhuận · Tỷ suất |
| V15.19.10.26 | `aea1201` | Thực thu – Thực chi: mọi con số bấm được, mở bảng chi tiết (công thức, từng công trình, các lần tiền về / trả nợ gốc, nút tới tab nhập liệu) |
| V16.19.10.26 | `23f2054` | Khung tổng quan: thêm đơn vị tỷ đồng cho mọi số tiền, xếp HĐ theo số hiệu (a→z, 1→9) |
| V17.19.10.26 | `5b075cf` | Thêm tiền vay nhận về (giải ngân): tiền vào, không tính chi phí; Sau vay & trả nợ, Dư nợ vay. Dữ liệu mẫu chuẩn: đủ ngày, VAT 10% / nhân công 8%, k… |
| V18.19.10.26 | `6056462` | Dữ liệu mẫu sát thực tế thi công: nghiệm thu hằng tháng liền mạch, CĐT tạm ứng 15–30%, trả thầu phụ sau nghiệm thu, thầu phụ 55–65% DT, BCH giải th… |
| V19.19.10.26 | `f60de67` | Xuất Excel mẫu TMN: bảng tổng hợp DT – CP công trình đúng mẫu trình ký (logo, thông tin công ty, Times New Roman, tiêu đề navy, cấp dòng vàng/cam/x… |
| V20.19.10.26 | `04498d8` | Excel tổng hợp định dạng theo mẫu TMN (ExcelJS): logo, thông tin công ty, Times New Roman, tiêu đề navy, khung viền, số #,##0 / %, dòng TỔNG CỘNG (… |

### Ngày 20/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.20.10.26 | `0679ec0` | TĐ: số HT theo đúng ngày chốt (chi phí khác ngày ≤ ngày chốt); nút "So với thực tế" hiện dòng thực tế đến ngày chốt (DT nghiệm thu, CP thực hiện, L… |
| V02.20.10.26 | `d6b1d23` | TĐ: dòng thực tế theo tiền thật (thực thu, thực chi, còn lại thực, tỷ lệ còn lại; sau VAT, đến ngày chốt). Tab Doanh thu: ô DT thực thu (tiền về lũ… |
| V03.20.10.26 | `c80ac4e` | Khung tổng quan: tab Doanh thu / Chi phí / Lợi nhuận chỉ 2 lớp số Kế hoạch (theo HĐ) và Thực (thực thu, thực chi, LN thực = thu − chi), cùng sau VA… |
| V04.20.10.26 | `b3b577e` | Khung công trình: ngày bắt đầu (tự điền hoặc ngày ký HĐ đầu tiên) → ngày kết thúc (tự điền hoặc ngày quyết toán khi mọi HĐ đã QT); dữ liệu mẫu: côn… |
| V05.20.10.26 | `574bbcb` | Khung công trình: bấm vào ngày bắt đầu / kết thúc để sửa (lưu vào hồ sơ dự án, tải lại mọi tab; nút Dùng tự động); nhật ký ghi ngày trước → sau |
| V06.20.10.26 | `f30e144` | Ngày công trình: 1 nút Sửa ngày (ô trống = tự động, hiện sẵn ngày tự động); công trình Hoàn thành luôn có ngày kết thúc (quyết toán, hoặc nghiệm th… |
| V07.20.10.26 | `1cde32c` | Nhật ký hoạt động: chọn số dòng hiển thị 50 / 100 / 150 (Xem thêm tải đúng số dòng đã chọn, Xóa lọc giữ lựa chọn) |
| V08.20.10.26 | `6b4e2bb` | Nhật ký hoạt động: chuyển trang theo số (‹ 1 2 3 … 7 ›) thay cho Xem thêm; tổng số trang khi không lọc, giới hạn xem sâu 10.000 dòng |
| V09.20.10.26 | `eaa515b` | Thẻ công trình: bấm số CP kế hoạch / CP thực chi / Còn phải chi (và DT kế hoạch / thực thu / còn phải thu) mở bảng cách tính và chi tiết riêng công… |
| V10.20.10.26 | `aa8a13f` | Bảng Thực thu – Thực chi: đường kẻ dọc nét đứt, mờ phân tách nhóm THU / CHI / CÒN LẠI THỰC |
| V11.20.10.26 | `03aefd5` | Bảng Thực thu – Thực chi: đường phân nhóm nét liền mảnh (thêm Công trình / THU), tiêu đề nhóm gạch chân theo màu Thu / Chi / Còn lại, cột Còn lại t… |
| V12.20.10.26 | `9e1155c` | Bảng Thực thu – Thực chi: 3 gạch màu Thu / Chi / Còn lại thẳng hàng ở đáy tiêu đề; đường giữa dòng nhóm và dòng cột con là nét mảnh như các đường p… |
| V13.20.10.26 | `3ca7b02` | Sửa 2 lỗi phát hiện khi rà soát: đổi kỳ / VAT / phạm vi lúc báo cáo đang tải gây lỗi JS (renderReport chờ dữ liệu); tab quản trị nhấp nháy với ngườ… |

### Ngày 22/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.22.10.26 | `3401ea3` | Giao diện điện thoại: bảng số liệu thành thẻ (nhãn cột : giá trị, không cuộn ngang; 2 cột ở máy tính bảng), menu lưới 4 × 2, danh sách hiện trước f… |

### Ngày 23/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.23.10.26 | `9e1b8b8` | Phát hành V01.23.10.26: cập nhật tóm tắt phiên (nhập liệu 3 dự án xong, sync staging → main) |
| V02.23.10.26 | `7dba168` | Tổng quan tài chính: 3 thẻ đầu hiển thị Tổng DT – CP – LN dự kiến (theo HĐ) kèm thực hiện lũy kế; thẻ dòng tiền giữ theo kỳ |
| V03.23.10.26 | `31a77a3` | Báo cáo tổng hợp cho Ban TGĐ/Hội đồng: I. Doanh thu theo HĐ (4 ô + bảng dự án), II. Dòng tiền thực tế (4 ô + bảng), III. Còn lại phải thu (3 ô + bả… |
| V04.23.10.26 | `dd7fafc` | Báo cáo tổng hợp: cột Tỷ lệ LN canh phải đúng tiêu đề, đánh dấu (*) tạm tính cho dự án chưa hoàn thành kèm chú thích |
| V05.23.10.26 | `04e43d7` | Báo cáo tổng hợp: giãn khoảng cách giữa các ô số và bảng dự án |
| V06.23.10.26 | `bb43c96` | Tổng quan tài chính: bỏ mục Phân tích theo kỳ (tiến độ & mục tiêu năm, biểu đồ, cơ cấu theo công trình), chỉ giữ báo cáo tổng hợp I–III |
| V07.23.10.26 | `232ad6b` | Báo cáo tổng hợp: thiết kế lại tiêu đề mục I–III (số La Mã, tên mục, mô tả, nhãn phạm vi – VAT – đơn vị) |
| V08.23.10.26 | `9f4ecd7` | Tiêu đề mục I–III: số La Mã dùng font Montserrat như toàn hệ thống |
| V09.23.10.26 | `6c72f85` | Khung công trình: TĐ1–TĐ3 thành ma trận DT · CP · LN · Tỷ suất |
| V10.23.10.26 | `dbc32f3` | Ma trận TĐ: tiền thực tế theo giai đoạn thanh toán (TĐ1 tạm ứng · TĐ2 các đợt · TĐ3 quyết toán), còn lại từng giai đoạn và lũy kế; chỉ đối chiếu HT… |
| V11.23.10.26 | `1d822e1` | Ma trận TĐ: bảng tiền thực tế riêng có cột Tổng cộng; Thực chi (tổng) mở/thu gọn chi tiết Trả thầu phụ + Chi phí khác |
| V12.23.10.26 | `9c5b468` | Bỏ ghi chú dưới ma trận TĐ và dòng hướng dẫn trên lưới công trình |
| V13.23.10.26 | `49aaaa2` | Báo cáo: bỏ mục Thực thu – Thực chi – Còn lại thực (đã có ở mục II–III Tổng quan tài chính) |
| V14.23.10.26 | `0d2219b` | Mục IV Doanh thu – chi phí theo thời điểm: bảng tổng hợp TĐ1 Hợp đồng / TĐ2 Điều chỉnh / TĐ3 Quyết toán (tự tính từ dữ liệu, có tăng/giảm), bấm số … |
| V15.23.10.26 | `6eb1015` | Mục IV: nút Xem/Ẩn chi tiết dự án đặt trên tiêu đề mục; bỏ bấm số và tiêu đề lặp của bảng chi tiết |
| V16.23.10.26 | `3d2d5dc` | Mục IV: nút Chi tiết dưới từng dòng Doanh thu / Chi phí / Lợi nhuận, mỗi dòng mở bảng chi tiết riêng theo dự án (CP: phụ lục thầu phụ, đã chi, còn … |
| V17.23.10.26 | `d828557` | Mục I: ô Tỷ suất LN đổi thành Hoàn thành KH lợi nhuận (LN quyết toán so với LN kế hoạch HĐ ký: %, vượt/hụt, tỷ suất KH → thực hiện); mục IV: TĐ3 lấ… |
| V18.23.10.26 | `deb2a4e` | Mục I: ô thứ 4 hiển thị Chênh lệch LN = LN quyết toán (TĐ3) − LN kế hoạch (TĐ1), bỏ % |
| V19.23.10.26 | `f5410f5` | Mục I: Chênh lệch LN quyết toán chỉ cộng các dự án đã quyết toán (LN TĐ3 − LN TĐ1), dự án QT thêm tự cộng tiếp |
| V20.23.10.26 | `7d8cb04` | Mục I: ô thứ 4 = LN kế hoạch còn lại = LN kế hoạch (QT: TĐ3, chưa QT: TĐ2) − LN thực tế (tiền về − tiền chi), sau VAT |
| V21.23.10.26 | `fb793c2` | Mục I: rút gọn ô LN kế hoạch còn lại (Kế hoạch − Thực tế, sau VAT); cách tính chuyển xuống ghi chú dưới bảng |
| V22.23.10.26 | `22357ea` | Rà soát Revi: ô LN kế hoạch còn lại ghi rõ sau VAT; thêm Ngân sách chi phí dự kiến (nhập tay, nhãn NS) cho dự án chưa quyết toán ở mục I; mục IV gh… |
| V23.23.10.26 | `30215c1` | Mục I: bỏ nhãn NS, số chi phí căn thẳng hàng, nút ✎ chuyển ra cột thao tác cuối dòng; chi phí ghi nhận vượt ngân sách dự kiến thì lấy theo thực tế … |
| V24.23.10.26 | `8a91e1b` | Đổi thuật ngữ Ngân sách chi phí dự kiến thành DT-CP dự kiến (từ ngữ của công ty) |
| V25.23.10.26 | `10a3866` | Đổi tên mục III: Dòng tiền còn lại phải thu – chi; mục IV: Doanh thu hoàn thành – quyết toán |
| V26.23.10.26 | `ab0b44a` | Mục III: Thu = tổng kế hoạch CĐT phải trả (DTHĐ sau VAT), Chi = tổng thực chi, Còn lại = Thu − Chi |
| V27.23.10.26 | `07ba3df` | Mục III: đổi nhãn Hợp đồng · Thực chi · Còn lại |
| V28.23.10.26 | `7be4f5e` | Mục IV: thêm dòng LN gộp và Tỷ suất LN gộp (DT − giá vốn: thầu phụ + chi phí trực tiếp B1) cho TĐ1–TĐ3, có tăng/giảm |
| V29.23.10.26 | `ea3a1bd` | Mục IV: LN gộp, Tỷ suất LN gộp mặc định ẩn, mở bằng nút (+) cạnh Tỷ suất LN |
| V30.23.10.26 | `018a7b7` | Mục IV chi tiết: bỏ số tổng các cột phụ lục TĐ2; rê chuột vào ô tổng TĐ3 / Còn lại / Còn phải chi để xem phần thực (đã QT) và phần tạm tính (chưa QT) |
| V31.23.10.26 | `fb43c55` | Mục IV chi tiết lợi nhuận: rê chuột ô tổng LN TĐ3 tách phần thực (đã QT) và tạm tính (chưa QT) |
| V32.23.10.26 | `808cb18` | Sửa lỗi biểu đồ theo quý: gộp đúng quý dương lịch (01–03, 04–06…) thay vì 3 tháng tính từ tháng đầu có dữ liệu – trước đây làm lệch nghiệm thu / qu… |
| V33.23.10.26 | `94dc920` | Tài khoản: Quản trị xem các phiên đăng nhập còn hiệu lực (thiết bị, IP, giờ đăng nhập, thao tác cuối, trạng thái) và buộc đăng xuất 1 phiên hoặc tấ… |
| V34.23.10.26 | `a012a97` | Giao diện điện thoại / máy gập / máy tính bảng: khung công trình không còn rộng hơn màn hình (lưới modal co theo màn hình), ma trận TĐ và mục IV ch… |
| V35.23.10.26 | `858eaa6` | Mục IV: mở/đóng Chi tiết, LN gộp, lưu BH/DT-CP dự kiến không còn nhảy lên đầu trang trên iPhone/iPad (Safari không tự giữ vị trí cuộn): giữ chiều c… |
| V36.23.10.26 | `119b10b` | Thiết bị cảm ứng: chạm 1 lần vào ô có chú thích hiện bong bóng thông tin (thay cho rê chuột trên máy tính); chạm lại / chạm ra ngoài / cuộn thì đón… |
| V37.23.10.26 | `057d005` | Khung công trình: bảng tiền thực tế theo giai đoạn mặc định hiện (nút So với thực tế để ẩn); tiêu đề cột và nhãn dòng xuống dòng không bị cắt; điện… |
| V38.23.10.26 | `b1e4edd` | Menu gộp: Báo cáo (trang mặc định) · Nhập liệu ▾ (Dự án, Doanh thu, Chi phí – ẩn với tài khoản Chỉ xem) · Quản trị ▾ (Tài khoản, Cài đặt) · tên ngư… |
| V39.23.10.26 | `e18b15a` | Phân quyền theo vai trò: thêm Lãnh đạo (chốt TĐ, DT-CP dự kiến), Ban Kiểm soát (xem toàn bộ + nhật ký, không sửa), Quản lý dự án/QS (HĐ, phụ lục, n… |
| V40.23.10.26 | `7e66709` | Vai trò Kỹ thuật hệ thống (IT): quản lý tài khoản, phiên đăng nhập, nhật ký, thông tin liên hệ; không tạo/sửa/cấp quyền Quản trị, không xóa tài kho… |
| V41.23.10.26 | `e6da67a` | Lãnh đạo, Ban Kiểm soát: xem Dự án / Doanh thu / Chi phí (menu Dữ liệu, chỉ xem); sửa lỗi trang Chi phí trống với vai trò chỉ xem (khởi tạo form đã… |
| V42.23.10.26 | `b27f97e` | Xóa dự án bắt buộc Passcode xóa: hộp xác nhận liệt kê dữ liệu bị xóa kèm (HĐ/PL, nghiệm thu, tiền về, HĐ thầu phụ, thanh toán, chi phí, TĐ); nhật k… |

### Ngày 24/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.24.10.26 | `9697060` | Tài khoản: nút (i) cạnh ô Vai trò mở bảng quyền đủ 8 vai trò (được làm / không được làm); icon thông tin dạng nét SVG; màu nhãn cho các vai trò mới… |
| V02.24.10.26 | `65e251d` | Báo cáo: mục III Thực thu = HĐ tại thời điểm mới nhất − Dòng thu, Còn lại = Thực thu − Thực chi; mục I–IV cùng theo nút trước/sau VAT (tiền thật qu… |
| V03.24.10.26 | `954161f` | Báo cáo mục II: bỏ thẻ Sau vay & trả nợ |
| V04.24.10.26 | `32ed1e0` | Báo cáo mục IV: dòng Chi phí hiện tỷ lệ chi phí / doanh thu ở TĐ1, TĐ2, TĐ3 |
| V05.24.10.26 | `c0558f7` | Báo cáo mục I: bỏ thẻ LN kế hoạch còn lại |
| V06.24.10.26 | `a5f58a0` | Báo cáo mục III: Doanh thu mới nhất − Thực chi = Còn lại |
| V07.24.10.26 | `b288af6` | Báo cáo mục III: đổi nhãn thành Doanh thu (TĐ mới nhất) |
| V08.24.10.26 | `c76f6be` | Báo cáo mục I: thẻ Doanh thu – Chi phí tại thời điểm mới nhất (DT, CP, LN theo TĐ mới nhất, ghi chú tách đã QT / tạm tính) |
| V09.24.10.26 | `8754e89` | Báo cáo mục I: Doanh thu – Chi phí – Lợi nhuận dự kiến tại thời điểm ký hợp đồng (TĐ1); chưa chốt TĐ1 lấy HĐ gốc trên hệ thống |
| V10.24.10.26 | `986ab69` | Bảng chi phí (nhập liệu): bỏ cột VAT và Tiền VAT ở 3 khối; thuế suất hiện nhỏ dưới số Sau VAT; cân lại độ rộng cột |
| V11.24.10.26 | `8f50171` | Báo cáo mục I: số TĐ1 quy đổi sau VAT làm tròn tới 0,1 tỷ |
| V12.24.10.26 | `122aa68` | Báo cáo: tiền thật quy đổi trước VAT (mục II, III, IV) làm tròn tới 0,1 tỷ |

### Ngày 27/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.27.10.26 | `c299cb0` | Trợ lý BKS (đợt 1): nút 💬 hỏi đáp số liệu bằng nút bấm, không dùng AI – 23 câu nhóm Tổng quan, Cảnh báo, Thu tiền CĐT, Tra cứu; số liệu dùng chung … |

### Ngày 28/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.28.10.26 | `f300c97` | Hợp đồng đầu vào: vật tư, máy móc thiết bị, nhân công giao khoán có hợp đồng như thầu phụ (HĐ, PL, HT/QT, thanh toán, khóa quyết toán, TĐ1/TĐ2/TĐ3) |
| V02.28.10.26 | `e60d7f1` | Hợp đồng đầu vào: luôn hiện bộ lọc đủ 4 loại; đổi loại HĐ ngay trên dòng bảng (ô chọn màu theo loại, chỉ người được sửa HĐ) |
| V03.28.10.26 | `b5954f5` | Bảng Hợp đồng đầu vào: thiết kế lại gọn – bộ lọc Loại / Quyết toán có nhãn và số đếm, cột Hợp đồng 2 dòng (loại + số HĐ / trạng thái + phụ lục), ti… |
| V04.28.10.26 | `35d81ef` | Bảng Hợp đồng đầu vào: số hiển thị theo triệu đồng (giữ phần lẻ nghìn, rê chuột xem số đồng đầy đủ), ghi rõ đơn vị |
| V05.28.10.26 | `22b58fe` | Bảng Hợp đồng đầu vào: thêm nhóm 'Mua lẻ – không HĐ' (vật tư, MMTB, nhân công) và dòng TỔNG GỒM MUA LẺ để khớp cây chi phí; bộ lọc loại báo có dòng… |
| V06.28.10.26 | `e3169e1` | Báo cáo mục I–III: thẻ chỉ tiêu thiết kế mới – biểu tượng, nền chuyển màu theo chỉ tiêu, thanh tỷ lệ / vòng tỷ suất; mục I thêm thanh cơ cấu doanh … |
| V07.28.10.26 | `9025198` | Báo cáo mục I: thử kiểu 2 – khối nền xanh đậm gom 3 chỉ tiêu dự kiến, thanh tỷ lệ, vòng tỷ suất, cơ cấu doanh thu trong khối (mục II, III giữ thẻ k… |
| V08.28.10.26 | `c800d6d` | Báo cáo mục I: 3 khối DT – CP – LN theo TĐ1 (ký HĐ) · TĐ2 (điều chỉnh) · TĐ3 (quyết toán), phong cách tối giản; tăng/giảm so với thời điểm trước; b… |
| V09.28.10.26 | `cc959b4` | Báo cáo mục I: biểu đồ dải lợi nhuận (đường doanh thu & chi phí TĐ1 → TĐ3, phần tô giữa = lợi nhuận), khung số liệu khi rê chuột / chạm; bỏ thanh m… |
| V10.28.10.26 | `60a8362` | Báo cáo mục I: gộp 3 khối TĐ và biểu đồ dải lợi nhuận thành một khối – bảng số canh thẳng từng thời điểm dưới biểu đồ, cột đang chọn tô xuyên suốt;… |
| V11.28.10.26 | `2c15582` | Báo cáo mục I: phần dưới biểu đồ gọn lại – mỗi thời điểm lấy lợi nhuận làm số chính (kèm tỷ suất), DT · CP một dòng, chỉ báo thay đổi LN; thêm dòng… |
| V12.28.10.26 | `ed7c0b2` | Báo cáo mục I: cân đối biểu đồ – lề trái = lề phải, các cột căn giữa khối; ô tô cột đang chọn nối liền từ biểu đồ xuống phần số |
| V13.28.10.26 | `42cd65a` | Báo cáo mục I: kiểu chia đôi – trái: lợi nhuận quyết toán (TĐ3) là số chính, tỷ suất, so với lúc ký, DT/CP/LN lúc ký; phải: 3 biểu đồ mini DT/CP/LN… |
| V14.28.10.26 | `34efd9e` | Báo cáo mục I: thay 3 biểu đồ mini bằng cầu lợi nhuận 'Vì sao lợi nhuận thay đổi?' (LN lúc ký → ± DT, CP phát sinh → LN TĐ2 → ± khi QT → LN quyết t… |
| V15.28.10.26 | `8975a97` | Báo cáo mục I: cầu lợi nhuận bản tinh tế – cột mảnh bo tròn chuyển màu, LN tại mốc màu navy, số tăng/giảm trong ô nhãn nhạt, dải nền theo giai đoạn… |
| V16.28.10.26 | `d4de557` | Báo cáo mục I: thay cầu lợi nhuận bằng biểu đồ cột nhóm DT – CP – LN theo TĐ1/TĐ2/TĐ3 (thang từ 0, thời điểm đang chọn đậm và ghi số, bấm nhóm cột … |

### Ngày 29/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.29.10.26 | `0af3552` | Đổi tiêu đề: Bảng tổng hợp theo dõi thời điểm; biểu đồ mục I: Doanh thu – Chi phí theo thời điểm |
| V02.29.10.26 | `3020ce5` | Báo cáo: đưa mục Doanh thu hoàn thành – quyết toán lên đầu (mục I), đánh số lại I–IV; thêm ô Dòng thu / Thực chi / Còn lại ở đầu báo cáo |
| V03.29.10.26 | `8060ccc` | Đầu báo cáo: Dòng thu / Thực chi / Còn lại dạng 3 dòng gọn, bỏ khung |
| V04.29.10.26 | `85e8064` | Mục II – chi tiết theo dự án: mũi tên ▲▼ DT, CP so với TĐ trước; rê chuột xem giá trị |
| V05.29.10.26 | `b92e8f1` | Mục II: khối lợi nhuận TĐ3 dạng vành khuyên (chi phí + lợi nhuận = doanh thu), vạch tỷ suất lúc ký |
| V06.29.10.26 | `f8075e2` | Báo cáo: gộp mục I gồm A. Doanh thu hoàn thành – quyết toán, B. Doanh thu – chi phí theo thời điểm; đánh số lại II, III |
| V07.29.10.26 | `da34c32` | Mục I-B: lợi nhuận TĐ3 dạng 2 thanh so lúc ký – quyết toán (chi phí + lợi nhuận, độ dài = doanh thu) |
| V08.29.10.26 | `f22f5f4` | Đầu báo cáo: bỏ Lập lúc, Người lập, phiên bản |
| V09.29.10.26 | `1c94044` | Báo cáo: bỏ tiêu đề trên cùng, mục I đổi tên Bảng tổng hợp theo dõi thời điểm |
| V10.29.10.26 | `334b5b8` | Báo cáo: nút chọn kỳ đưa vào tiêu đề mục I (bỏ dòng trống), bảng chọn kỳ bỏ khoảng trắng thừa |
| V11.29.10.26 | `750c588` | Trợ lý: nút ↺ xóa lịch sử hỏi đáp để bắt đầu yêu cầu mới |
| V12.29.10.26 | `acef8a4` | Bảng chọn kỳ: ép nội dung co theo khung (không tràn khi ô tháng / nút rộng trên Chrome Windows tiếng Việt), khung 380px |
| V13.29.10.26 | `957a099` | Trợ lý đợt 2: nhóm ④ Chi tiền & thầu phụ, ⑤ Chi phí, ⑦ Xếp hạng & so sánh (17 câu); tìm nhanh theo thầu phụ / nhà cung cấp |
| V14.29.10.26 | `9352bf4` | Trợ lý: bỏ mục Câu hay dùng |

### Ngày 30/10/2026

| Phiên bản | Mã lưu | Nội dung |
|---|---|---|
| V01.30.10.26 | `22fe879` | Mục I-B: bảng chi tiết theo dự án gồm STT, Mã DA, Tên dự án, Tình trạng, Doanh thu, Chi phí, Lợi nhuận, % Hoàn thành, Tỷ lệ LN |
| V02.30.10.26 | `a9bed1c` | Mục I-A: dạng Hành trình TĐ1 → TĐ2 → TĐ3 (mũi tên ghi tăng / giảm), bấm thẻ TĐ để làm nổi bật; nút chi tiết DT / CP / LN và LN gộp đặt dưới |
| V03.30.10.26 | `c1d0a72` | Báo cáo: quy tắc làm tròn — DT, CP từng dự án làm tròn 0,01 tỷ trước rồi mới tính LN, chênh lệch, tổng (số hiển thị luôn khớp); bảng chi tiết mục I… |
| V04.30.10.26 | `8fa89c3` | Mục I: gắn nhãn A Thực tế / B Kế hoạch đã chốt; thêm bảng đối chiếu kế hoạch – thực tế 3 thời điểm kèm giải thích vì sao khác số |
| V05.30.10.26 | `a1304d9` | Đối chiếu kế hoạch – thực tế: bấm số để xem chi tiết theo dự án (nguồn số kế hoạch, thực tế, chênh), dẫn tới bảng chi tiết phần A và thẻ dự án |
| V06.30.10.26 | `108db95` | Số chốt TĐ xem sau VAT: quy đổi theo tỷ lệ VAT của số hệ thống cùng thời điểm, cùng chỉ tiêu (bỏ làm tròn 0,1 tỷ gây chênh lệch giả) |
| V07.30.10.26 | `b336deb` | Báo cáo (revi 1–6): mục III đổi tên Doanh thu còn lại sau thực chi (đến hôm nay); nút kỳ chuyển sang mục II, mục I ghi rõ đến hôm nay; đầu trang lũ… |
| V08.30.10.26 | `4a600d9` | Báo cáo (revi 7, 9–13): đối chiếu bỏ dự án chưa có HĐ CĐT; dấu * và x/N đã chốt ở bảng dự án mục I-B; bỏ hiện số đồng trên số đã làm tròn; ghi chú … |
| V09.30.10.26 | `6768abc` | Mục I-A (revi 8): thẻ đổi tên Theo HĐ gốc / Theo HĐ + phụ lục / Theo quyết toán; tách chi phí = HĐ đầu vào theo mốc + chi phí khác đến nay; ghi chú… |
| V10.30.10.26 | `6f40ab0` | Bảng đối chiếu kế hoạch – thực tế: mặc định thu gọn, chỉ mở khi bấm, nhớ trạng thái khi vẽ lại |
