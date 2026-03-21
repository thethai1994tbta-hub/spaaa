# 📦 Hướng Dẫn Cài Đặt

## Yêu Cầu Hệ Thống

- **Windows**: Windows 7 trở lên (64-bit khuyến cáo)
- **RAM**: Tối thiểu 2GB
- **Dung Lượng**: 200MB cho ứng dụng + dữ liệu

## Cách 1: Chạy File EXE (Dễ Nhất)

1. Tải file `SPA-VIP-Management-Setup.exe` từ thư mục `dist/`
2. Chạy file setup
3. Chọn vị trí cài đặt
4. Click **Cài Đặt**
5. Chạy ứng dụng từ Start Menu hoặc Desktop

## Cách 2: Chạy Từ Mã Nguồn (Cho Developer)

### Bước 1: Cài Đặt Node.js
1. Vào https://nodejs.org/
2. Tải **LTS Version**
3. Cài đặt (bấm Next > Next > Finish)
4. Mở Command Prompt, gõ: `node --version`

### Bước 2: Clone/Tải Dự Án
```bash
# Hoặc sao chép folder spa_vip vào máy
cd C:\spa_vip
```

### Bước 3: Cài Đặt Dependencies
```bash
npm install
```
Chờ cho đến khi hoàn tất (2-5 phút tùy tốc độ internet)

### Bước 4: Chạy Ứng Dụng
```bash
npm start
```

Ứng dụng sẽ khởi động. Chờ 3-5 giây để cửa sổ mở.

## Cách 3: Tạo EXE Riêng

### Bước 1: Chuẩn Bị
```bash
cd C:\spa_vip
npm install
```

### Bước 2: Build
```bash
npm run build:win
```

### Bước 3: Lấy File
File EXE nằm trong: `dist/SPA VIP Management Setup.exe`

**Ghi Chú**: Bước build mất khoảng 5-10 phút lần đầu.

## Xử Lý Sự Cố

### ❌ Lỗi: "node is not recognized"
**Giải pháp**:
- Cài đặt lại Node.js
- Khởi động lại Command Prompt
- Gõ: `node --version`

### ❌ Lỗi: "npm ERR! code ERESOLVE"
**Giải pháp**:
```bash
npm install --legacy-peer-deps
```

### ❌ Cổng 3001 bị sử dụng
**Giải pháp**:
- Mở `server.js`
- Tìm dòng: `const PORT = 3001`
- Đổi thành: `const PORT = 3002`

### ❌ Ứng dụng chạy chậm
**Giải pháp**:
- Tắt các chương trình khác
- Kiểm tra RAM còn trống (tối thiểu 1GB)

## Cập Nhật

### Cập Nhật Từ Mã Nguồn
```bash
# Tải mã nguồn mới
cd C:\spa_vip
git pull origin main

# Cài dependencies mới (nếu có)
npm install

# Chạy lại
npm start
```

## Sao Lưu Dữ Liệu

Dữ liệu Spa được lưu trong file `data/spa.db`

**Cách sao lưu**:
1. Mở thư mục cài đặt
2. Tìm thư mục `data`
3. Copy file `spa.db` ra USB hoặc Cloud

**Khôi Phục**:
1. Copy file `spa.db` vào thư mục `data`
2. Khởi động lại ứng dụng

## Kích Hoạt

Ứng dụng không cần kích hoạt hoặc đăng ký. Sử dụng trực tiếp.

## Liên Hệ Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra README.md
2. Mở Console (F12) để xem lỗi
3. Liên hệ team hỗ trợ

---

**Happy Spa Management! 💅**
