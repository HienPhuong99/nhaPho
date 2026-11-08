# nhaPho

Nhà phố 4,2 × 18 m, 2 tầng, mái tôn. Bản vẽ **Final 1** (01/11/2026), chờ chủ đầu tư duyệt.

| Trang | Link |
|---|---|
| Mặt bằng, mặt cắt A–A | https://hienphuong99.github.io/nhaPho/ |
| Mặt đứng và 3 bảng màu mặt tiền | https://hienphuong99.github.io/nhaPho/mat-dung.html |
| Bố trí cột, máy lạnh, ổ điện | https://hienphuong99.github.io/nhaPho/cot-dien.html |
| Phương án sân trước, lồng sắt kín để xe và thú cưng khi mua thêm 3,5 m đất (chưa chốt) | https://hienphuong99.github.io/nhaPho/cong-truoc.html |
| Phương án lồng sắt kín trùm sân trước (2 kiểu mái, có 3D) | https://hienphuong99.github.io/nhaPho/long-sat.html |
| Mô hình 3D | https://hienphuong99.github.io/nhaPho/3d.html |
| Đi bộ trong nhà 3D | https://hienphuong99.github.io/nhaPho/di-bo.html |
| Phiếu khảo sát lần 3: cấp thoát nước (chờ trả lời; lần 2 đã điền nằm trong `vechoichoi`) | https://hienphuong99.github.io/nhaPho/khaosat.html |

Bộ bản vẽ PDF `Ban_Ve_Final_1_Bo_Sung_02-11-2026.pdf` (bản mới nhất; `Ban_Ve_Final_1.pdf` là bản đã gửi chủ đầu tư), video, kết quả khảo sát và 2 phiếu đã điền: thư mục [`vechoichoi`](vechoichoi).

Mã nguồn: `mat-bang.js` (dữ liệu và hàm vẽ mặt bằng, mặt cắt), `mat-bang.css` (màu, ký hiệu), `mo-hinh-3d.js` (mô hình 3D dùng chung cho `3d.html` và `di-bo.html`), `bia.html` (trang bìa của bộ PDF). PDF in từ `bia.html`, `index.html`, `mat-dung.html`, `cot-dien.html`, `cong-truoc.html` (khổ A4, theo `@media print` của từng trang) rồi gộp theo thứ tự khai trong `banve.json`, bằng plugin [banve-kit](https://github.com/HienPhuong99/banve-kit) (skill `banve:pdf`: `build-pdf.mjs`, `diff-pdf.mjs`, `render.mjs`).
