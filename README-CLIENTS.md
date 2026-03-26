# 📋 Hướng Dẫn Cung Cấp Phần Mềm Cho Khách Hàng

## Mỗi cửa hàng → 1 file .exe riêng

---

## Các bước thực hiện

### Bước 1 — Tạo thư mục cho khách hàng mới

```
clients/
└── ten-spa-khach/          ← đặt tên không dấu, viết liền
    ├── client-config.json  ← thông tin spa
    ├── firebase-config.json ← (tùy chọn) Firebase riêng
    └── icon.ico            ← (tùy chọn) Logo spa
```

**Tạo nhanh bằng cách copy thư mục mẫu:**
```bash
xcopy clients\template clients\ten-spa-khach /E /I
```

---

### Bước 2 — Điền thông tin vào `client-config.json`

```json
{
  "slug": "ten-spa-khach",
  "displayName": "TÊN SPA KHÁCH",
  "tagline": "Slogan của spa",
  "primaryColor": "#ff69b4",
  "appId": "com.spa.ten-spa-khach.management",
  "version": "1.0.0",
  "iconFile": "icon.ico"
}
```

| Trường | Ý nghĩa |
|--------|---------|
| `slug` | Tên thư mục (không dấu, không khoảng trắng) |
| `displayName` | Tên hiển thị trong phần mềm và trên taskbar |
| `tagline` | Dòng phụ bên dưới tên spa |
| `primaryColor` | Màu chủ đạo (mã hex) |
| `appId` | ID duy nhất của app (đảo ngược tên miền) |
| `version` | Phiên bản phần mềm |

---

### Bước 3 — (Tùy chọn) Firebase riêng cho khách

Nếu khách muốn dữ liệu hoàn toàn riêng biệt:
1. Tạo Firebase project mới tại [console.firebase.google.com](https://console.firebase.google.com)
2. Vào Project Settings → Service accounts → Generate new private key
3. Lưu file JSON vào `clients/ten-spa-khach/firebase-config.json`

> **Nếu không có firebase-config.json** → phần mềm tự dùng SQLite (lưu local trên máy khách)

---

## ✅ Trường hợp bạn muốn: “Cửa hàng 2 KHÔNG lấy dữ liệu, nhưng logic hệ thống giống bản gốc”

Để 2 cửa hàng **tách dữ liệu hoàn toàn** nhưng **giống cấu hình/luồng hệ thống**, khuyến nghị:
- Mỗi cửa hàng dùng **Firebase project riêng** (2 file `firebase-config.json` khác nhau)
- Sau đó **clone các collection cấu hình** từ cửa hàng gốc sang cửa hàng 2

### Clone những gì?
Script sẽ copy đúng các collection “cấu hình hệ thống”:
- `services`
- `staff`
- `inventory`
- `packages`
- `appSettings`

Và **KHÔNG** copy các dữ liệu vận hành như:
- `customers`, `bookings`, `transactions`, `attendance`, `stockMovements`

### Cách chạy
Ví dụ cửa hàng gốc là `ten-spa`, cửa hàng 2 là `shop-2`:

1) Tạo client mới:
```bash
xcopy clients\template clients\shop-2 /E /I
```

2) Điền `clients/shop-2/client-config.json`

3) Tạo Firebase project mới cho `shop-2`, lưu credentials vào:
`clients/shop-2/firebase-config.json`

4) Clone cấu hình hệ thống từ cửa hàng gốc sang cửa hàng 2:
```bash
npm run clone:system-config -- --from=clients/ten-spa/firebase-config.json --to=clients/shop-2/firebase-config.json --wipe
```
`--wipe` sẽ xóa các collection cấu hình ở cửa hàng 2 trước khi copy (để đảm bảo giống 100%).

---

### Bước 4 — Build phần mềm

```bash
node build-client.js --client=ten-spa-khach
```

## ✅ 1 Lệnh Setup Cửa Hàng Mới (Không Lấy Dữ Liệu, Giữ Logic Giống Bản Gốc)

Nếu bạn có cửa hàng gốc (ví dụ `ten-spa`) và muốn tạo cửa hàng 2 (ví dụ `shop-2`) nhưng **không sao chép dữ liệu vận hành**, chỉ sao chép cấu hình/logic hệ thống:

Chạy:
```bash
npm run oneclick:client-config -- --fromSlug=ten-spa --toSlug=shop-2 --wipe
```

`--wipe` sẽ xóa các collection cấu hình ở `shop-2` trước khi copy để giống 100%.

Thao tác này sẽ clone:
- `services`, `staff`, `inventory`, `packages`, `appSettings`

Và **không clone**:
- `customers`, `bookings`, `transactions`, `attendance`, `stockMovements`


**Xem trước (không build thật):**
```bash
node build-client.js --client=ten-spa-khach --dry-run
```

---

### Bước 5 — Lấy file và giao cho khách

File output nằm tại:
```
releases/ten-spa-khach/
├── TÊN SPA KHÁCH Setup 1.0.0.exe   ← Gửi file này cho khách cài
└── TÊN SPA KHÁCH 1.0.0.exe         ← Bản portable (chạy không cần cài)
```

---

## Ví dụ thực tế

| Khách hàng | Lệnh build | File output |
|------------|-----------|-------------|
| Spa Hoa Lan | `node build-client.js --client=spa-hoa-lan` | `releases/spa-hoa-lan/...exe` |
| Beauty Zone | `node build-client.js --client=beauty-zone` | `releases/beauty-zone/...exe` |
| Ngọc Spa | `node build-client.js --client=ngoc-spa` | `releases/ngoc-spa/...exe` |

---

## Lưu ý bảo mật
- File `firebase-config.json` chứa **private key** → **KHÔNG** commit lên Git
- File `.gitignore` đã được cấu hình để tự động loại trừ các file này
- Backup `clients/` ở nơi an toàn (USB, Google Drive riêng)
