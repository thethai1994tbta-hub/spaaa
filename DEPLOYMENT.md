# 🚀 Hướng Dẫn Triển Khai - SPA VIP Management

## 📦 Dự Án Đã Được Tạo Hoàn Chỉnh!

Chúc mừng! Bạn đã có một hệ thống quản lý Spa đầy đủ với:

✅ Frontend đẹp (HTML/CSS/JavaScript)
✅ Backend mạnh (Express.js + SQLite)
✅ Desktop app (Electron)
✅ Có thể đóng gói thành .exe Windows

---

## 📂 Cấu Trúc Thư Mục

```
spa_vip/
├── main.js                    ⭐ Khởi động Electron
├── server.js                  ⭐ Backend API Express
├── package.json              ⭐ Cấu hình npm
├── start.bat                 ⭐ Chạy nhanh (Windows)
├── build.bat                 ⭐ Tạo EXE (Windows)
│
├── public/                    # Web interface
│   ├── index.html            # Giao diện chính
│   ├── css/                  # Stylesheets
│   │   ├── style.css         # Chính
│   │   ├── dashboard.css     # Dashboard
│   │   ├── booking.css       # Lịch hẹn
│   │   ├── pos.css           # Thanh toán
│   │   ├── inventory.css     # Kho
│   │   └── reports.css       # Báo cáo
│   └── js/
│       ├── app.js            # Logic chính
│       └── modules/          # Các module
│           ├── dashboard.js
│           ├── booking.js
│           ├── pos.js
│           ├── inventory.js
│           ├── customers.js
│           ├── staff.js
│           ├── commission.js
│           └── reports.js
│
├── data/                      # Database
│   └── spa.db               # SQLite (tự tạo)
│
├── assets/                    # Ảnh, icon (để tốt nhất)
│
└── node_modules/            # Dependencies (sau npm install)
```

---

## 🎯 3 Cách Chạy Ứng Dụng

### Cách 1️⃣: Dễ Nhất (Recommended)

**Chỉ cần double-click:**
```
start.bat
```

Ứng dụng sẽ:
1. Kiểm tra Node.js
2. Cài dependencies (nếu cần)
3. Khởi động app trong 3-5 giây

---

### Cách 2️⃣: Dùng Command Prompt

Mở Command Prompt tại folder `spa_vip`:

```bash
# Lần đầu: cài dependencies
npm install

# Mỗi lần muốn chạy
npm start
```

---

### Cách 3️⃣: Dùng IDE (Visual Studio Code)

1. Mở folder `spa_vip` với VS Code
2. Mở Terminal (Ctrl+`)
3. Gõ: `npm start`

---

## 📦 Tạo File EXE

### Cách 1: Dùng Batch File

Double-click:
```
build.bat
```

### Cách 2: Command Prompt

```bash
npm run build:win
```

**Kết quả:**
- File `.exe` sẽ ở: `dist/`
- Bạn có thể:
  - Chạy trực tiếp (portable)
  - Cài đặt trên máy khác
  - Chia sẻ với khách hàng

**Lưu ý**: Lần đầu mất 5-15 phút

---

## ⚙️ Cấu Hình

### Đổi Cổng

Mở `server.js` dòng 13:
```javascript
const PORT = 3001;  // Đổi sang 3002, 3003, etc
```

### Đổi Giao Diện

Mở `public/css/style.css` dòng 5-18:
```css
:root {
  --primary-color: #d4509e;      /* Màu chính */
  --secondary-color: #6c5ce7;    /* Màu phụ */
  /* ... */
}
```

### Đổi Tiêu Đề

Mở `public/index.html` dòng 5:
```html
<title>SPA VIP Management - Hệ Thống Quản Lý Spa</title>
```

---

## 🔑 Quản Lý Khóa

### Thêm Đăng Nhập (Optional)

Mở `server.js`, thêm middleware:
```javascript
const authRequired = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token || token !== 'Bearer YOUR_TOKEN') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use('/api', authRequired);
```

---

## 💾 Sao Lưu & Khôi Phục

### Sao Lưu Dữ Liệu

```bash
# Sao lưu thủ công
copy data\spa.db data\spa_backup.db

# Hoặc dùng script
```

### Khôi Phục Dữ Liệu

```bash
# Từ backup
copy data\spa_backup.db data\spa.db
```

---

## 🔄 Cập Nhật Phần Mềm

```bash
# Tải phiên bản mới
git pull origin main

# Cài dependencies mới
npm install

# Chạy lại
npm start
```

---

## 🐛 Khắc Phục Sự Cố

### Lỗi Cơ Bản

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| `node is not recognized` | Node.js chưa cài | Cài Node.js + khởi động lại |
| `Port 3001 in use` | Cổng đã bị sử dụng | Đổi cổng trong server.js |
| `Cannot find module` | Dependencies chưa cài | Chạy `npm install` |
| Database error | File bị lỗi | Xóa `data/spa.db` khởi động lại |

### Xóa Cache

```bash
# Xóa dependencies
rmdir /s /q node_modules

# Cài lại
npm install

# Chạy
npm start
```

---

## 📊 Tính Năng & Modules

| Module | Tính Năng | File |
|--------|----------|------|
| 📊 Dashboard | Tổng quan, thống kê | `dashboard.js` |
| 📅 Booking | Đặt lịch hẹn | `booking.js` |
| 💳 POS | Thanh toán, bán hàng | `pos.js` |
| 👥 Customers | Quản lý khách | `customers.js` |
| 👔 Staff | Quản lý nhân viên | `staff.js` |
| 📦 Inventory | Quản lý kho | `inventory.js` |
| 💰 Commission | Tính hoa hồng | `commission.js` |
| 📈 Reports | Báo cáo | `reports.js` |

---

## 🌐 API Endpoints

```
GET    /api/customers           - Danh sách KH
POST   /api/customers           - Thêm KH mới
PUT    /api/customers/:id       - Sửa KH
DELETE /api/customers/:id       - Xóa KH

GET    /api/bookings            - Danh sách lịch
POST   /api/bookings            - Thêm lịch
PUT    /api/bookings/:id        - Cập nhật lịch

GET    /api/transactions        - Danh sách giao dịch
POST   /api/transactions        - Tạo giao dịch

GET    /api/reports/daily       - Báo cáo ngày
GET    /api/reports/monthly     - Báo cáo tháng

POST   /api/seed-data           - Nạp dữ liệu mẫu
GET    /api/health              - Kiểm tra server
```

---

## 🔒 Bảo Mật

### Khuyến Cáo
1. Sao lưu dữ liệu hàng ngày
2. Dùng password mạnh nếu có đăng nhập
3. Chặn truy cập từ bên ngoài
4. Kiểm tra logs định kỳ

### Mã Hóa (Optional)
```javascript
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(password).digest('hex');
```

---

## 📈 Mở Rộng

### Thêm Module Mới

1. Tạo file `modules/newfeature.js`
2. Thêm route trong `server.js`
3. Thêm nút trong `index.html`
4. Import JS module

### Thêm Database Field

1. Mở `server.js`
2. Tìm `CREATE TABLE`
3. Thêm column: `ALTER TABLE ... ADD COLUMN ...`
4. Cập nhật form trong `index.html`

---

## 🚢 Triển Khai Trên Server

### Cách 1: Portable EXE
```bash
npm run build:win
```
→ Chia sẻ file EXE, người dùng cài đặt

### Cách 2: Chạy Như Dịch Vụ
```bash
npm install -g pm2
pm2 start server.js
```

### Cách 3: Docker (Advanced)
```dockerfile
FROM node:14
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

---

## 📞 Hỗ Trợ & Debugging

### Xem Logs
```bash
# Server logs (khi chạy npm start)
# Xem console output

# Client logs (trong app)
# Nhấn F12 → Console
```

### Gửi Báo Cáo
1. Screenshot lỗi
2. Copy console log
3. Mô tả điều kiện gây lỗi
4. Gửi cho team support

---

## 🎓 Học Thêm

- **Express.js**: https://expressjs.com
- **SQLite**: https://www.sqlite.org
- **Electron**: https://www.electronjs.org
- **JavaScript**: https://developer.mozilla.org

---

## 📝 Checklist Triển Khai

- [ ] Cài Node.js
- [ ] Chạy `npm install`
- [ ] Chạy `npm start` - kiểm tra ứng dụng
- [ ] Tạo dữ liệu mẫu (call API `/seed-data`)
- [ ] Test tất cả modules
- [ ] Sao lưu dữ liệu
- [ ] Build .exe: `npm run build:win`
- [ ] Test file .exe
- [ ] Chia sẻ với khách hàng

---

## 🎉 Bắt Đầu!

```bash
cd C:\spa_vip
npm install
npm start
```

**Ứng dụng sẽ mở trong 3-5 giây!**

---

**Phiên Bản**: 1.0.0
**Được Tạo**: 2024
**License**: MIT
