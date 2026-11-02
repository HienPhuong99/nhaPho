# nhaPho: nhà phố 4,2 × 18 m, 2 tầng

Web tĩnh trên GitHub Pages (link từng trang trong README.md). Bản vẽ là HTML + SVG vẽ bằng hàm từ mảng dữ liệu; bộ PDF in từ chính các trang đó.

## Sửa bản vẽ

Sửa số trong mảng dữ liệu, không sửa SVG. Tìm bằng grep (`grep -n "const P = " cot-dien.html`), đừng đọc nguyên file (cot-dien.html 60 KB, mat-bang.js 25 KB).

| File | Vẽ gì | Dữ liệu |
|---|---|---|
| `mat-bang.js` | mặt bằng, mặt cắt A–A; dùng chung cho index, cot-dien, di-bo | `GROUND`, `UPPER` (phòng, tường, cửa); `H_TRET`, `H_LAU`, `SLAB`, `RF_*` (cao độ, mái) |
| `index.html` | trang mặt bằng, mặt cắt, ghi chú | chuỗi kích thước viết tay trong `<h2>`, phải khớp `GROUND`/`UPPER` |
| `mat-dung.html` | mặt đứng, 3 bảng màu | `PAL`, `PARTS`; cao độ riêng `H1`, `ZR`, `ZP` |
| `cot-dien.html` | cột, dầm, máy lạnh, ổ điện, mạch | `AX` trục cột, `P` ổ điện, `AC` máy lạnh, `M` mạch, `TAI` công suất, `CAO` chiều cao lắp, `HOI` câu hỏi |
| `mo-hinh-3d.js` | 3D cho 3d.html, di-bo.html | số riêng trong `nha3D()` (`H1`, `H2`, `SLAB`, `TOP`, `SILL`) |
| `bia.html` | bìa bộ PDF | mục lục ghi số trang |

Cao độ và kích thước phòng lặp ở nhiều file: đổi số nào thì grep số cũ trong cả `mat-bang.js`, `mat-dung.html`, `mo-hinh-3d.js`, `index.html`, `cot-dien.html`.

## Dựng và kiểm tra PDF

```bash
npm ci --prefix tools                                                   # lần đầu trên máy
node tools/build-pdf.mjs out/Ban_Ve.pdf                                 # khoảng 15 s, in bảng trang
node tools/diff-pdf.mjs vechoichoi/Ban_Ve_Final_1.pdf out/Ban_Ve.pdf    # dòng chữ −/+ từng trang, ảnh cắt vùng đổi ở out/diff/
node tools/render.mjs out/Ban_Ve.pdf 9-10                               # chỉ khi cần xem cả trang
```

- Thứ tự gộp: bia (trang 1), index (2–8), mat-dung (9–10), cot-dien (11–25). Thêm hay bớt trang thì sửa mục lục trong `bia.html`.
- Kiểm tra bằng phần chữ của diff-pdf trước; chỉ mở ảnh cắt (trái bản cũ, phải bản mới) khi cần nhìn hình. Không đọc thẳng file PDF bằng Read.
- Trang báo đổi hình 0,0x% mà "chữ giữ nguyên" thường chỉ là lệch khử răng cưa.
- Cần mạng để tải font Barlow (Google Fonts); thiếu font thì build-pdf báo.
- `out/` là thư mục tạm, không commit.

## Quy tắc

- `vechoichoi/Ban_Ve_Final_1.pdf` và `vechoichoi/Ban_Ve_Dien_Final_1.pdf` đã gửi chủ đầu tư: không in lại, không ghi đè (build-pdf từ chối). Bản mới đặt tên mới.
- Gộp lệnh vào ít lượt: sửa, dựng PDF, so bản cũ trong cùng một lượt.
- Máy Windows, Node 24, không có Python. Chromium của Playwright 1.64.0 đã cài sẵn; `pdftotext` có trong Git Bash.
- Commit message tiếng Việt, một câu nói thay đổi gì (xem `git log`).
