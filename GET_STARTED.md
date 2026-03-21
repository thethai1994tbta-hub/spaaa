# 🎉 SPA VIP Management - Hệ Thống Quản Lý Spa Hoàn Chỉnh

## ✨ Chúc Mừng!

Hệ thống quản lý Spa **hoàn chỉnh** đã được tạo tại:
```
C:\Users\hau93\spa_vip
```

---

## 🚀 Bắt Đầu Trong 2 Phút

### Bước 1: Cài Node.js (Nếu Chưa Có)

Kiểm tra xem đã cài chưa:
```bash
node --version
```

Nếu chưa → Tải tại: https://nodejs.org/ (chọn **LTS**)

### Bước 2: Chạy Ứng Dụng

**Cách dễ nhất** - Double-click file:
```
start.bat
```

Hoặc mở Command Prompt tại folder `spa_vip`:
```bash
npm install
npm start
```

### Bước 3: Ứng Dụng Sẽ Mở

Chờ 3-5 giây, ứng dụng sẽ xuất hiện 🎊

---

## 📋 Điều Gì Đã Được Tạo?

### ✅ Frontend (Giao Diện)
- **HTML/CSS/JavaScript** đẹp mắt
- **8 Modules** đầy đủ tính năng
- Responsive (chạy trên màn hình bất kỳ)
- Hỗ trợ **Tiếng Việt** hoàn toàn

### ✅ Backend (Máy Chủ)
- **Express.js** framework
- **SQLite Database** lưu dữ liệu
- **REST API** hoàn chỉnh
- Tính hoa hồng **tự động**

### ✅ Desktop App
- **Electron** - chạy như ứng dụng Windows
- Có thể đóng gói **thành .exe**
- Chạy offline (không cần internet)

### ✅ Tài Liệu
- **README.md** - Hướng dẫn chi tiết
- **QUICK_START.md** - Nhanh gọn
- **INSTALL.md** - Cài đặt step-by-step
- **DEPLOYMENT.md** - Triển khai chuyên nghiệp

---

## 📚 8 Modules Chính

| # | Module | Chức Năng |
|---|--------|----------|
| 1 | 📊 **Dashboard** | Tổng quan doanh thu, lịch hẹn |
| 2 | 📅 **Đặt Lịch** | Quản lý appointment khách hàng |
| 3 | 💳 **Thanh Toán (POS)** | Bán dịch vụ & sản phẩm |
| 4 | 👥 **Khách Hàng** | CRM, lưu thông tin, điểm |
| 5 | 👔 **Nhân Viên** | Quản lý lương, chức vụ |
| 6 | 📦 **Kho Hàng** | Inventory, cảnh báo hàng |
| 7 | 💰 **Hoa Hồng** | Tính toán tự động |
| 8 | 📈 **Báo Cáo** | Thống kê ngày/tháng |

---

## 🎯 Tính Năng Nổi Bật

✅ **Giao diện đẹp** - Gradient, icons, animation
✅ **Đầy đủ chức năng** - Tất cả những gì spa cần
✅ **Quản lý dữ liệu** - SQLite, persistent
✅ **Báo cáo chi tiết** - Doanh thu, khách hàng
✅ **Tính hoa hồng** - Tự động tính từ giao dịch
✅ **Responsive design** - Desktop & Tablet
✅ **Tiếng Việt** - 100% UI Vietnamese
✅ **Offline-first** - Không cần internet

---

## 📁 Cấu Trúc Dự Án

```
spa_vip/
├── 📄 start.bat              ← Double-click để chạy
├── 📄 build.bat              ← Tạo file .exe
├── 📄 server.js              ← Backend (Express + SQLite)
├── 📄 main.js                ← Electron launcher
├── 📄 package.json           ← Cấu hình npm
│
├── 📂 public/
│   ├── index.html            ← Giao diện chính
│   ├── css/                  ← 6 file stylesheet
│   └── js/
│       ├── app.js            ← Logic chính
│       └── modules/          ← 8 modules
│
├── 📂 data/
│   └── spa.db                ← Database (tự tạo)
│
├── 📂 docs/
│   ├── README.md
│   ├── QUICK_START.md
│   ├── INSTALL.md
│   ├── DEPLOYMENT.md
│   └── GET_STARTED.md (file này)
```

---

## 🎮 Hướng Dẫn Sử Dụng Nhanh

### 1️⃣ Dashboard
Mở ứng dụng → Xem doanh thu, lịch hẹn, khách hàng mới

### 2️⃣ Thêm Khách Hàng
`Khách Hàng` → `+ Thêm Khách Hàng` → Điền thông tin

### 3️⃣ Đặt Lịch
`Đặt Lịch` → `+ Thêm Lịch Hẹn` → Chọn khách, dịch vụ, giờ

### 4️⃣ Thanh Toán
`Thanh Toán` → Chọn khách → Click dịch vụ → Hoàn tất

### 5️⃣ Xem Báo Cáo
`Báo Cáo` → Chọn ngày/tháng → Xem chi tiết

---

## 💻 Yêu Cầu Hệ Thống

| Yêu Cầu | Tối Thiểu | Khuyến Cáo |
|---------|-----------|-----------|
| **OS** | Windows 7 | Windows 10/11 |
| **RAM** | 2 GB | 4 GB+ |
| **CPU** | Intel i3 | Intel i5+ |
| **Dung Lượng** | 200 MB | 500 MB |
| **Node.js** | 14.x | 18.x LTS |

---

## 🚀 Tiếp Theo - 3 Lựa Chọn

### ✅ Lựa Chọn A: Chạy Trực Tiếp
```bash
# Dùng start.bat hoặc:
npm start
```
→ Chạy trên máy của bạn, localhost:3001

### ✅ Lựa Chọn B: Tạo File EXE
```bash
# Dùng build.bat hoặc:
npm run build:win
```
→ Tạo file .exe trong thư mục `dist/`
→ Có thể cài trên máy khác

### ✅ Lựa Chọn C: Chỉnh Sửa & Mở Rộng
Mở folder `spa_vip` với VS Code
→ Sửa code theo nhu cầu
→ Rebuild .exe

---

## 🎨 Tùy Chỉnh

### Đổi Tên Ứng Dụng
Sửa `package.json` dòng 2:
```json
"productName": "SPA VIP Management"
```

### Đổi Màu Chính
Sửa `public/css/style.css` dòng 6:
```css
--primary-color: #d4509e;  /* Đổi màu này */
```

### Thêm Logo
Đặt ảnh vào `assets/` folder
Cập nhật `index.html` dòng 15

---

## 📊 Dữ Liệu

### Database
- **Tên**: `data/spa.db`
- **Loại**: SQLite (không cần cài gì thêm)
- **Auto-backup**: Sao lưu thủ công hàng tuần

### Sao Lưu
```bash
copy data\spa.db data\spa_backup.db
```

### Khôi Phục
```bash
copy data\spa_backup.db data\spa.db
```

---

## 🔧 Cấu Hình Nâng Cao

### Đổi Cổng
`server.js` dòng 13: `const PORT = 3001` → `3002`

### Thêm Xác Thực
Thêm middleware trong `server.js` để bảo vệ API

### Kết Nối Database Khác
Sửa dòng 24 trong `server.js`:
```javascript
const dbPath = path.join(__dirname, 'data/spa.db');
```

---

## 🆘 Gặp Sự Cố?

### Lỗi 1: Node.js Not Found
```bash
# Cài Node.js từ https://nodejs.org/
# Khởi động lại máy
node --version  # Kiểm tra
```

### Lỗi 2: Port 3001 In Use
```javascript
// server.js dòng 13
const PORT = 3002;  // Đổi cổng
```

### Lỗi 3: Database Error
```bash
# Xóa file spa.db
del data\spa.db

# Khởi động lại app
npm start
```

Xem chi tiết tại: **DEPLOYMENT.md**

---

## 📞 Cần Giúp?

1. Đọc **README.md** - Hướng dẫn đầy đủ
2. Xem **QUICK_START.md** - Nhanh gọn
3. Kiểm tra **DEPLOYMENT.md** - Chi tiết
4. Xem console (F12) để debug

---

## ✨ Tính Năng Premium (Có Thể Thêm)

- 🔐 Đăng nhập/Xác thực
- 📧 Gửi Email/SMS nhắc nhở
- 📱 Mobile app (React Native)
- ☁️ Cloud sync
- 🔔 Real-time notifications
- 📊 Advanced analytics
- 🎨 Themes & Customization

---

## 🎓 Tài Liệu Tham Khảo

- [Express.js](https://expressjs.com)
- [SQLite](https://www.sqlite.org)
- [Electron](https://www.electronjs.org)
- [JavaScript](https://developer.mozilla.org)
- [HTML/CSS](https://www.w3schools.com)

---

## 🎯 Checklist

- [ ] Cài Node.js
- [ ] Chạy `npm install`
- [ ] Chạy `npm start`
- [ ] Test dashboard
- [ ] Thêm khách hàng
- [ ] Tạo lịch hẹn
- [ ] Test thanh toán
- [ ] Xem báo cáo
- [ ] Sao lưu dữ liệu
- [ ] Build .exe (optional)

---

## 🎊 Sẵn Sàng!

Bây giờ bạn có:
✅ Ứng dụng quản lý Spa hoàn chỉnh
✅ Giao diện chuyên nghiệp
✅ Tất cả tính năng cần thiết
✅ Có thể đóng gói .exe

**Hãy bắt đầu!**

```bash
# Double-click start.bat
# Hoặc gõ:
npm start
```

---

**Phiên Bản**: 1.0.0
**Ngôn Ngữ**: Tiếng Việt (Vi)
**Nền Tảng**: Windows 7+
**Node.js**: 14.0+
**License**: MIT
**Status**: ✅ Sẵn Sàng Sử Dụng

---

**Chúc bạn thành công! 💅✨**
