# BỘ BÀN GIAO – HỆ THỐNG QUẢN LÝ HIỆU QUẢ DỰ ÁN (BKS)

Tài liệu dành cho một Claude (hoặc lập trình viên) khác **dựng lại / dựng mới một hệ thống tương tự** từ mã nguồn bản Staging.

- Phiên bản đóng gói: **V30.04.11.26** (nhánh `staging`, commit `e3b1199`)
- Mã nguồn đầy đủ: file `BKS-staging-V30.04.11.26.zip` cùng thư mục này (giải nén ra là chạy được)
- Prompt gửi Claude khác: xem `PROMPT-GUI-CLAUDE.md`

---

## 1. Hệ thống làm gì

Web nội bộ cho **Ban Kiểm soát / Ban Giám đốc** công ty xây dựng theo dõi **hiệu quả tài chính từng dự án**:

| Phần | Nội dung |
|---|---|
| **Nhập liệu – Dự án** | Danh sách dự án (mã, tên, CĐT, tình trạng, tiến độ, khu vực, tọa độ bản đồ, ảnh), TĐ1–TĐ3 chốt tay |
| **Nhập liệu – Doanh thu** | (1) HĐ / Phụ lục với CĐT · (2) Hoàn thành / Quyết toán · (3) Tiền về (Tạm ứng, TT đợt n, Quyết toán). Chọn "Tất cả dự án" để xem tổng hợp (chỉ xem) |
| **Nhập liệu – Chi phí** | 3 khối: Trực tiếp (Thầu phụ, Vật tư, Nhân công, MMTB, Tổ chức TC, Khác) · Gián tiếp · Tài chính (gồm vay / trả nợ – không tính chi phí). Hợp đồng đầu vào (thầu phụ, vật tư, nhân công, MMTB) quản lý theo HĐ: HĐ/PL, HT/QT, thanh toán, khóa số. "Tất cả dự án" = chỉ xem |
| **Báo cáo** | Mục I DT–CP–LN theo TĐ1/2/3 · II Dòng tiền thực tế · III Còn phải thu–chi · IV TĐ1→TĐ3 · Bản đồ · Thẻ từng công trình · Phân tích chi tiết. Chế độ **Dashboard** (1 màn hình ngang). Xuất In/PDF, Dashboard PDF, Excel, Excel mẫu TMN, PowerPoint |
| **Quản trị** | Tài khoản, phân quyền 8 vai trò, nhật ký hoạt động, cài đặt (tên công ty, passcode xóa), liên hệ |
| **Trợ lý** | 40 câu hỏi nhanh trả lời từ số liệu hệ thống (không gọi AI bên ngoài) |

## 2. Công nghệ

- **Node.js 18+**, **Express 4**, **PostgreSQL** (thư viện `pg`), **ExcelJS** (xuất Excel). Không framework giao diện: HTML + CSS + JavaScript thuần.
- Thư viện tải sẵn trong `public/vendor` (Leaflet bản đồ, …) – không phụ thuộc CDN.
- Mật khẩu băm **scrypt**; phiên đăng nhập lưu trong CSDL; CSP chặt (`lib/security.js`).
- Không có `DATABASE_URL` → chạy bằng **bộ nhớ tạm + dữ liệu mẫu** (để thử, mất khi tắt).

## 3. Chạy thử trên máy

```bash
unzip BKS-staging-V30.04.11.26.zip && cd bks   # file nén có sẵn thư mục bks/
npm install
npm start            # http://localhost:3000  (không có DATABASE_URL = bộ nhớ tạm)
```
Lần đầu vào `/setup` để tạo công ty + tài khoản Quản trị. Tab Quản trị → Cài đặt có nút **Tạo dữ liệu mẫu** / **Xóa dữ liệu mẫu** (`/api/demo`).

## 4. Triển khai (Railway)

1. Tạo repo GitHub, đẩy mã nguồn. Tạo 2 nhánh: `main` (chính thức) và `staging` (thử nghiệm).
2. Railway: tạo project → thêm **PostgreSQL** → thêm service từ repo (nhánh `main`). Tạo môi trường thứ 2 cho nhánh `staging`, CSDL riêng.
3. Biến môi trường của service:

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (bắt buộc khi chạy thật) |
| `SETUP_TOKEN` | Mã bảo vệ trang Khởi tạo lần đầu (nên đặt) |
| `APP_ENV` | `staging` → hiện dải cảnh báo "HỆ THỐNG THỬ NGHIỆM" |
| `SESSION_IDLE_MIN` | Phút không thao tác thì tự đăng xuất (mặc định 60) |
| `LOG_HOT_DAYS` | Số ngày giữ nhật ký nguyên dạng, cũ hơn được nén (mặc định 7) |
| `PORT` | Railway tự cấp |

4. `railway.json` đã khai báo `npm start`, healthcheck `/health`. Bảng CSDL **tự tạo / tự nâng cấp khi khởi động** (`lib/db.js → init()`), không cần chạy migration tay.
5. Quy trình: sửa trên `staging` → kiểm tra trên link staging → người dùng "duyệt" → đưa `staging` lên `main`.

## 5. Cấu trúc mã nguồn

```
server.js            Toàn bộ API (Express): đăng nhập, phân quyền, dự án, doanh thu, chi phí, HĐ đầu vào, báo cáo
lib/db.js            Lớp dữ liệu: PostgreSQL (tạo bảng + nâng cấp cột) và bản bộ nhớ tạm cùng giao diện hàm
lib/validate.js      Kiểm tra dữ liệu đầu vào, VAI TRÒ (ROLES) và QUYỀN (QUYEN)
lib/revenue.js       Công thức doanh thu: VAT, sau VAT, HĐ/PL, tiền về
lib/cost.js          Danh mục nhóm / hạng mục chi phí (B1–B3), tổng hợp chi phí
lib/subcontract.js   HĐ đầu vào: HĐ/PL, HT/QT, thanh toán, còn lại, khóa số
lib/dashboard.js     Số Dự kiến / Thực hiện từng dự án (cho báo cáo)
lib/report.js        Dữ liệu báo cáo tổng hợp gửi về trình duyệt
lib/export-dtcp.js   Excel mẫu TMN (ExcelJS)
lib/auth.js, security.js, audit.js, version.js, demo.js
views/index.html     Khung trang chính · login.html · setup.html
public/common.js     Hàm dùng chung: định dạng tiền, ĐƠN VỊ hiển thị (đồng/nghìn/triệu/tỷ), ô ngày + lịch, ô gợi ý
public/app.js        Nhập liệu: Dự án, Doanh thu, Chi phí, HĐ đầu vào, Tài khoản, Cài đặt
public/report.js     Trang Báo cáo (mục I–IV, thẻ công trình, biểu đồ SVG tự vẽ, xuất Excel / PowerPoint)
public/dash-tong.js  Chế độ Dashboard tổng · dash-pdf.js Dashboard PDF 1 trang · map.js Bản đồ (Leaflet)
public/assistant.js  Trợ lý 40 câu · style.css giao diện (font Montserrat)
scripts/bump-version.js  Tăng số phiên bản Vnn.dd.mm.yy mỗi lần commit
docs/                Lộ trình prompt, danh sách phiên bản lưu, tóm tắt phiên
.claude/agents/      Định nghĩa 2 trợ lý: dev (lập trình) và revi (rà soát độc lập)
```

## 6. Dữ liệu (PostgreSQL)

`users`, `sessions`, `nhat_ky`, `nhat_ky_luu`, `settings`, `du_an`, `du_an_thoi_diem` (TĐ1–TĐ3 chốt tay), `du_an_anh`, `doanh_thu` (HĐ/PL, HT/QT), `tien_ve`, `chi_phi`, `tp_hop_dong` (HĐ đầu vào: nhom, so_ma, doi_tac, **hang_muc**, ghi_chu, hd_cdt_id), `tp_hd_pl`, `tp_thanh_toan` (tam_ung / dot / quyet_toan, có số đợt).

Tiền lưu `NUMERIC(18,0)` – **số nguyên đồng**, tính bằng số nguyên (BigInt khi chia tỷ lệ) để không lệch làm tròn.

## 7. Quy tắc nghiệp vụ cốt lõi (phải giữ đúng)

**VAT:** Tiền VAT = làm tròn(Giá trị × VAT% / 100), VAT nguyên 0–100. Sau VAT = Giá trị + Tiền VAT. VAT 0/để trống = **Tạm tính** (trừ nhóm không chịu VAT: lương, ngoại giao, tài chính, phạt, vay). Cho phép số âm (phụ lục giảm).

**Doanh thu:** HĐ gốc + PL01, PL02… cùng Số mã. HT/QT và Tiền về luôn gắn **HĐ gốc**. Số đợt tiền về riêng theo từng HĐ.

**Chi phí:** nhóm "Vay và trả nợ": *Nhận tiền vay* (tiền vào) và *Trả nợ gốc* **không tính vào chi phí / lợi nhuận**; *Trả lãi* là chi phí.

**HĐ đầu vào (thầu phụ, vật tư, nhân công, MMTB):**
- HT/QT của từng HĐ/PL: để trống = chưa quyết toán = bằng giá trị HĐ/PL.
- Thanh toán: Tạm ứng · TT Đợt 1..n · **QT Đợt 1..n** (quyết toán chia nhiều đợt, đều là tiền đã trả).
- **Còn lại = HT/QT sau VAT − Tổng đã thanh toán.**
- **Khóa số khi Còn lại = 0** (đã có thanh toán): máy chủ chặn sửa (mã 423). **Mở khóa tạm bằng Passcode** (số liệu giữ nguyên), tự khóa lại khi đóng bảng chi tiết hoặc sau 60 phút.
- Tình trạng: *Chưa QT* · *Đã QT · còn phải trả* (giữ bảo hành / chưa trả hết) · *Đã QT · trả đủ 🔒* · *Trả vượt*.
- Nhóm Thầu phụ trong tổng chi phí = tổng HT/QT các HĐ; mua lẻ (không HĐ) nhập như dòng chi phí thường.
- Hạng mục thi công + bộ nhớ gợi ý: gõ tên nhà thầu đã có → tự điền hạng mục đã từng làm (API `/api/thau-phu-goi-y`).

**Thời điểm (TĐ):** TĐ1 = ký HĐ (chốt tay hoặc lấy HĐ gốc) · TĐ2 = HĐ + PL tăng/giảm · TĐ3 = quyết toán (chưa QT tạm tính theo TĐ2). Báo cáo mục I chọn TĐ1/2/3, mũi tên ▲▼ so với TĐ liền trước.

**Dòng tiền thực tế (mục II):** Thu = tiền về; Chi = chi phí đã chi + đã trả HĐ đầu vào (gồm tạm ứng); không gồm vay / trả gốc. Xem *trước VAT* thì tiền thật quy đổi theo tỷ lệ VAT, làm tròn 0,1 tỷ.

**Xóa:** xóa HĐ/PL, dự án cần **Passcode 8 số** do Quản trị đặt; sai 5 lần / 15 phút khóa chức năng. Mọi thao tác quan trọng ghi `[NHẬT KÝ]`.

## 8. Phân quyền

Vai trò: `admin` Quản trị · `it` Kỹ thuật (không xem số liệu tài chính) · `lanh_dao` · `bks` Ban Kiểm soát · `qs` QS/QLDA · `ke_toan` · `editor` Nhập liệu tất cả · `viewer` Chỉ xem.

| Quyền | Vai trò | Phạm vi |
|---|---|---|
| `hd` | admin, editor, qs | Dự án, HĐ/PL/HT-QT với CĐT, HĐ đầu vào + PL |
| `tien` | admin, editor, ke_toan | Tiền về, thanh toán HĐ đầu vào, chi phí, vay – trả nợ |
| `td`, `ns` | admin, editor, lanh_dao | Chốt TĐ1–TĐ3, DT–CP dự kiến |
| `xoa_da` | admin, editor | Xóa dự án |
| `nhat_ky` | admin, bks, it | Xem nhật ký |
| `tai_khoan`, `lien_he` | admin, it | Tài khoản, liên hệ |

Kiểm tra quyền ở **máy chủ** (bắt buộc) và giao diện (ẩn nút).

## 9. Giao diện – quy ước đã thống nhất với người dùng

- Tiếng Việt toàn bộ, font **Montserrat**, số dạng `1.234.567`, ngày `dd/mm/yyyy` (ô ngày gõ tay + nút lịch).
- Ô **Đơn vị** trên thanh trên cùng: Tự động / Đồng / Nghìn / Triệu / Tỷ (chỉ đổi hiển thị, không đổi dữ liệu, ô nhập và file xuất giữ đơn vị gốc).
- Báo cáo: tông **cafe** làm điểm nhấn (kem `#f6f1e9`, vàng đồng `#c9a96a`, xanh than `#1f2a44`); mỗi mục I–IV một khung, màu nhấn riêng (I xanh dương, II xanh than, III cam đất, IV xanh ngọc).
- Màu số liệu: Doanh thu xanh dương `#2f6bd8`, Chi phí cam đất `#e07b39`, Lợi nhuận xanh ngọc `#12a58b`. Tình trạng: Chuẩn bị cam · Đang thi công xanh dương · Hoàn thành xanh lá · Tạm dừng đỏ.
- Bảng: kẻ cột mảnh (nhập liệu rõ vừa, báo cáo nhạt), chỉ đậm số cần thiết; bảng dài hiện 10 dòng + "Xem thêm"; nhóm thu gọn mặc định.
- Điện thoại: bảng tự chuyển thành thẻ (`table.m-card`), trợ lý dạng bottom sheet.

## 10. Quy trình làm việc đã áp dụng

1. Mọi thay đổi trên nhánh `staging`, mỗi lần commit chạy `node scripts/bump-version.js`.
2. Kiểm tra bằng trình duyệt tự động (Playwright) với dữ liệu mẫu: số liệu khớp giữa các mục, không lỗi JS, xem ảnh chụp máy tính + điện thoại.
3. Thay đổi về **tiền, phân quyền, cấu trúc dữ liệu**: báo người dùng trước, gọi trợ lý **revi** rà soát độc lập.
4. Chỉ đưa `staging` → `main` khi người dùng nói **"duyệt"**.
5. Lưu danh sách phiên bản để quay lại (`docs/PHIEN-BAN-LUU.md`).

## 11. Gợi ý khi dựng hệ thống mới tương tự

- Giữ nguyên: lớp `lib/` (công thức tiền), cách lưu tiền số nguyên, phân quyền 2 lớp, bộ nhớ tạm để chạy thử.
- Đổi theo công ty mới: tên / logo (`public/img`, trang `/setup`), danh mục chi phí (`lib/cost.js → NHOM_CHI_PHI`), vai trò (`lib/validate.js → ROLES, QUYEN`), màu (`public/style.css`), mẫu Excel (`lib/export-dtcp.js`).
- Xóa / thay dữ liệu mẫu ở `lib/demo.js`.
