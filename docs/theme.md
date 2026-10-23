# Theme và hệ thống thiết kế

Toàn bộ giao diện (web và admin) dùng chung một theme trong `packages/ui/src/theme/`. Chỉ cần `@import "@lineagraph/ui/src/theme.css"` sau `@import "tailwindcss"` là có đủ màu, khoảng cách, bo góc, đổ bóng, chữ và hiệu ứng. Muốn đổi diện mạo thì sửa theme, không sửa từng component.

## Bốn lớp

| File | Lớp | Nội dung |
| --- | --- | --- |
| `theme/tokens.css` | Nguyên liệu | Thang màu (`brand`, `indigo`, `gold`, `stone`, `night`), khoảng cách, bo góc, đổ bóng, cỡ chữ, chuyển động |
| `theme/semantic.css` | Ý nghĩa | `background`, `card`, `primary`, `border`... mỗi biến có giá trị sáng và tối |
| `theme/base.css` | Mặc định | Kiểu chữ, liên kết, vùng chọn, tôn trọng `prefers-reduced-motion` |
| `theme/utilities.css` | Lớp tiện ích ghép sẵn | `surface`, `surface-interactive`, `glass`, `eyebrow`, `text-gradient`, `bg-brand-gradient`, `bg-aurora`, `bg-dots`, `container-page` |

Quy tắc: component chỉ dùng tên ngữ nghĩa (`bg-card`, `text-muted-foreground`, `bg-primary`), không dùng bậc màu thô như `bg-brand-600`. Nhờ vậy đổi bảng màu chỉ cần sửa lớp 1 và 2.

## Màu

- `brand` (son, đỏ cam): hành động chính, điểm nhấn. `indigo` (chàm): liên kết, thông tin, cạnh gia đình trong sơ đồ. `gold` (vàng): điểm sáng. `stone` (xám ấm): nền và chữ ở chế độ sáng. `night` (xanh đen): nền và chữ ở chế độ tối.
- Thang màu viết bằng OKLCH, mỗi thang giữ nguyên sắc độ, đổi độ sáng từ 50 đến 950.
- Sáng/tối dùng `light-dark()` kết hợp `color-scheme`, nên mỗi giá trị chỉ khai báo một lần. Mặc định theo hệ điều hành; `ThemeToggle` ép bằng `data-theme="light|dark"` trên `<html>`.
- Đổi thương hiệu: sửa các bậc `--color-brand-*` (và `--brand-from`, `--brand-to` cho gradient). Mọi nơi dùng `primary` tự đổi theo.

## Khoảng cách và bố cục

Tailwind lấy mọi `p-*`, `m-*`, `gap-*`, `size-*` từ `--spacing` (1 đơn vị = 0,25rem). Thêm các bước bố cục có tên, dùng như `px-gutter`, `mt-section`, `h-header`, `w-sidebar`:

| Biến | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `--spacing-gutter` | 1rem đến 2,5rem (co giãn) | Lề hai bên trang |
| `--spacing-section` | 3rem | Khoảng cách giữa các mục |
| `--spacing-stack` | 1,5rem | Khoảng cách giữa các khối trong một mục |
| `--spacing-header` | 3,75rem | Chiều cao header |
| `--spacing-sidebar` / `-collapsed` | 15,5rem / 4,75rem | Bề rộng thanh bên |
| `--container-page` | 90rem | Bề rộng tối đa của trang (`max-w-page`, hoặc `container-page`) |
| `--container-prose-page` | 46rem | Bề rộng cột văn bản dài |

## Bo góc, đổ bóng, chữ, chuyển động

- Bo góc: một biến gốc `--radius` (0,875rem), các cỡ `rounded-xs` đến `rounded-3xl` suy ra từ đó. Đổi `--radius` là đổi độ tròn của cả sản phẩm.
- Đổ bóng: `shadow-xs/sm/md/lg`, `shadow-card`, `shadow-card-hover`, `shadow-brand`; màu bóng là `--shadow-color`, tự đậm hơn ở chế độ tối.
- Chữ: `font-sans` là Be Vietnam Pro (nội dung), `font-serif` là Newsreader (tiêu đề), cả hai đều có chữ Việt. Cỡ `text-display`, `text-headline`, `text-title` đi kèm line-height và letter-spacing. URL Google Fonts nằm ở `fontsHref` trong `theme/fonts.ts`; `apps/admin/index.html` lặp lại URL đó vì HTML tĩnh không import được, nên đổi font thì sửa cả hai.
- Chuyển động: `ease-smooth`, `animate-fade-up`, `animate-fade-in`.

## Dùng lại cho app mới

1. Thêm dependency `@lineagraph/ui`.
2. Trong CSS gốc: `@import "tailwindcss"; @import "@lineagraph/ui/src/theme.css";`.
3. Nạp font bằng `fontsHref`, và chèn `themeInitScript` vào `<head>` để chế độ tối không bị nhấp nháy.
4. Dùng các lớp tiện ích và component trong `@lineagraph/ui`.

## Component dùng chung ở web

`PageHeader` (tiêu đề trang, có chế độ `hero`), `Section`, `Monogram` (avatar chữ cái), `PersonCard`, `PolityCard`, `Logo`, `SiteHeader` (thanh điều hướng ngang), `SiteFooter`, `DynastyRibbon` (dải triều đại vẽ từ dữ liệu) và `LineageMotif` (hoạ tiết cây phả hệ) nằm trong `apps/web/components/`. Web công khai không còn thanh bên (`--spacing-sidebar` chỉ còn admin dùng).

Ba tiện ích mới trong `packages/ui/src/theme/utilities.css` phục vụ giao diện "mực tàu": `bg-ink` (khối nền tối cho hero và chân trang, tối ở cả hai chế độ), `scheme-dark` (khai báo lại token tối cho một vùng, vì `light-dark()` trong biến tuỳ chỉnh được tính tại `:root` nên `color-scheme` ở phần tử con không đủ), và bộ `tone-brand|indigo|gold` + `tone-panel` + `text-tone` để tô màu thẻ theo một tông.
