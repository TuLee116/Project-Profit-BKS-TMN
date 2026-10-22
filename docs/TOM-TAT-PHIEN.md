# Tóm tắt phiên làm việc – PROJECT PROFIT (Ban Kiểm soát TMN)

Cập nhật: 22/10/2026. Đọc file này đầu phiên mới; chi tiết kỹ thuật xem code và `git log`.

## 1. Hệ thống
| | Repo / nhánh | Địa chỉ |
|---|---|---|
| Bản chính | `TuLee116/Project-Profit-BKS-TMN` · `main` | https://bks.up.railway.app |
| Thử nghiệm | cùng repo · `staging` | https://bks-staging.up.railway.app (APP_ENV=staging, Postgres riêng) |
| Hệ thống khác | `TuLee116/Bao-Cao-DT-CP-BKS-TMN` (T&T Helio, điện mặt trời, đơn vị triệu đồng) | https://bks-tmn-report.up.railway.app |

- Stack: Node/Express + PostgreSQL (`lib/db.js`), giao diện JS thuần (`public/app.js`, `public/report.js`, `public/common.js`, `public/style.css`, `views/index.html`).
- Quy trình: sửa trên `staging` → người dùng nói **"chuyển qua chính" / "sync staging → main"** thì fast-forward `main`. Giữ 2 nhánh đồng bộ.
- Phiên bản: `node scripts/bump-version.js` trước mỗi lần phát hành (dạng `Vlần.dd.mm.yy`, giờ VN).
- Kiểm thử: `node scripts/tester.js <url> <user> <pass>` (~4.500 kiểm tra).
- Commit kết thúc bằng dòng `Co-Authored-By` theo hướng dẫn phiên.

## 2. Người dùng & cách làm việc
- PMP / QS / Ban Kiểm soát, không lập trình. Trả lời **tiếng Việt, ngắn, đúng số liệu**.
- **Tiết kiệm credit**: không rà soát/chụp màn hình thừa, không theo dõi chạy nền, báo kết quả ngắn. Chỉ chạy khi người dùng bảo.
- **Không tự lấy ảnh từ Internet** (đã có sự cố ảnh không phù hợp – người dùng cấm).
- Tài khoản dùng để thao tác: `claude` (quyền Nhập liệu) và `test1` – mật khẩu người dùng cung cấp trong chat, **không ghi vào file**. Đã khuyên khóa/đổi sau khi dùng.

## 3. Tính năng đã có (tóm tắt)
- Bảo mật: header CSP/HSTS, giới hạn tần suất **600 yêu cầu/phút, 120 lệnh ghi/phút → chặn IP 10 phút**, khóa đăng nhập sai, kiểm tra Origin (`lib/security.js`).
- Trực tuyến theo phiên, tự đăng xuất khi không thao tác 60 phút.
- Nhật ký hoạt động cho quản trị (trước → sau), nén Brotli nhật ký > 7 ngày (`lib/audit.js`).
- Doanh thu / Chi phí: nhóm **"Vay và trả nợ ngân hàng"** có *Nhận tiền vay – giải ngân* (tiền vào), *Trả nợ gốc* (không tính CP), *Lãi vay*. Nhóm lương, ngoại giao, phí tài chính, phạt: không chịu VAT.
- Báo cáo: lưới ô công trình kèm ảnh; khung tổng quan nhanh 6 tab. Tab DT/CP/LN chỉ 2 lớp **Kế hoạch (theo HĐ)** và **Thực (tiền thật, sau VAT)**; số "thực hiện" ẩn sau nút *Thực hiện đến hiện tại*.
- Mục **Thực thu – Thực chi – Còn lại thực**: Còn lại thực = thực thu − thực chi (không gồm vay / trả gốc); bấm số xem chi tiết.
- **TĐ1–TĐ3** (ban đầu / có phát sinh / quyết toán): số kế hoạch nhập tay, đối chiếu HT (DT theo HĐ gốc / HĐ+PL / QT; CP = thầu phụ cùng mốc + chi phí khác có ngày ≤ ngày chốt). Nút *So với thực tế* hiện tiền thật đến ngày chốt.
- Ngày bắt đầu / kết thúc công trình: trống = tự lấy ngày ký HĐ đầu tiên / ngày quyết toán (công trình Hoàn thành mà còn HĐ chưa QT → "nghiệm thu cuối"); 1 nút **✎ Sửa ngày** (`PUT /api/du-an/:id/ngay`).
- Xuất: **Excel** (11 trang, định dạng mẫu TMN qua ExcelJS phía trình duyệt), **Excel mẫu TMN** (bảng DT–CP trình ký, `lib/export-dtcp.js`, `GET /api/bao-cao/dtcp.xlsx`), PowerPoint, In/PDF.
- Dữ liệu mẫu 12 dự án DEMO (`lib/demo.js`, seed mặc định 22): 0 cảnh báo, 12/12 có lãi, VAT 10% (nhân công 8%), ảnh minh họa tự vẽ `lib/assets/demo/`.
- **Giao diện điện thoại** (commit `3401ea3`, V01.22.10.26): bảng → thẻ (≤ 900px), menu lưới 4×2, danh sách trước form; máy tính và bản in giữ nguyên.

## 4. Trạng thái hiện tại (22/10/2026)
- GitHub: `staging` = `3401ea3` (có giao diện điện thoại); `main` = `605f6c1` (V13.20.10.26). **Chưa sync staging → main.**
- **Railway đang sự cố bảo mật, tạm dừng build** (status.railway.com/incident/QH8L8B3E); gói Trial mở build sau cùng. Cả 2 site vẫn chạy bản V13.
  - Khi build mở lại: đổi mật khẩu Postgres (production + staging), xóa `SETUP_TOKEN`, kiểm tra kết nối GitHub, Redeploy 1 lần.
  - Tài khoản Railway là **Trial** (~24 ngày / 4,03 USD) → cần nâng gói Hobby trước khi chạy số liệu thật.
- **Nhập liệu thật trên bản chính (tài khoản `claude`) – ĐANG TẠM DỪNG:**
  - DA-2026-01 Nhà xưởng KCN Điện Nam – Điện Ngọc (Hoàn thành, HĐ 25 tỷ): **đã nhập đủ**.
  - DA-2026-02 Trường TH Hòa Xuân (Đang thi công, 19,5 tỷ): **nhập dở** → cần xóa rồi nhập lại.
  - DA-2026-03 Văn phòng 7 tầng Mỹ Khê (Đang thi công, 28 tỷ): chưa nhập.
  - Quy tắc: số tròn, mỗi HĐ thầu phụ ≤ 5 tỷ, mỗi dự án ≤ 30 tỷ; ghi chậm (~0,8 s/lệnh, < 120 lệnh/phút).
  - Script đã viết sẵn (chỉ có trong máy phiên cũ, sẽ mất): nội dung 3 dự án nằm ở mục 5. Chỉ chạy khi người dùng nói "chạy tiếp".

## 5. Số liệu 3 dự án (để nhập lại nếu cần), đơn vị triệu đồng
- **DA-2026-02** – CĐT Ban QLDA ĐTXD quận Cẩm Lệ, HĐ `05/2025/HĐTC-TMN` 18.000 (05/09/2025), PL01 +1.500 (10/02/2026); NT đợt 1–3 mỗi đợt 4.000 (20/12/2025, 20/04/2026, 20/08/2026); tiền về TƯ 2.000, đợt 1 3.500, đợt 2 3.500, đợt 3 3.000. Thầu phụ: Phần thô 4.000 (XD Hòa Khánh), Cửa – nhôm kính 3.000 (Nhôm kính Đà Thành), Điện nước 2.500 (ME Miền Trung), Sân trường 1.500 (Cảnh quan Xanh); trả TƯ 10% + 1 đợt 40% (sau VAT). Chi phí vật tư (Hợp Nhân 900…), nhân công, máy, lán trại, bảo lãnh 40; lương BCH 50/tháng; vay 2.000, trả gốc 1.000 + lãi 20.
- **DA-2026-03** – CĐT Cty CP Đầu tư Biển Mỹ Khê, HĐ `03/2026/HĐTC-TMN` 28.000 (10/05/2026); NT đợt 1 3.000 (25/08/2026); tiền về TƯ 4.000, đợt 1 2.500. Thầu phụ: Cọc – móng 5.000, BTCT thân 5.000, MEP 3.500, Mặt dựng kính 2.500; trả TƯ 10% (+ đợt 20% cho 2 HĐ đầu). Chi phí vật tư (Hợp Nhân 600), thí nghiệm cọc 60, cẩu tháp 250, lán trại 200, bảo lãnh 60; lương BCH 70/tháng; vay 3.000.
- VAT: HĐ và thầu phụ 10%, vật tư 10%, nhân công 8%; TĐ nhập theo số HT tại ngày chốt.
