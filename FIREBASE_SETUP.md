# Firebase Setup Guide

## Bước 1: Tạo Firebase Project

1. Vào https://console.firebase.google.com
2. Nhấp **"Create a new project"**
3. Đặt tên: `spa-vip-management`
4. Chọn hoặc tạo Google Cloud Project
5. Enable Google Analytics (optional)
6. Nhấp **"Create project"**

## Bước 2: Lấy Service Account Credentials

1. Vào **Project Settings** (⚙️ icon ở góc trên phải)
2. Chọn tab **"Service Accounts"**
3. Nhấp **"Generate New Private Key"**
4. File JSON sẽ được download tự động

## Bước 3: Cấu hình Application

1. Sao chép nội dung file JSON vừa download
2. Copy file `src/config/firebase-template.json` thành `src/config/firebase-config.json`
3. Dán nội dung JSON vào file `firebase-config.json`

```bash
# Hoặc dùng command line:
cp src/config/firebase-template.json src/config/firebase-config.json
# Sau đó mở file và dán nội dung của JSON từ Firebase
```

## Bước 4: Kiểm tra .gitignore

Chắc chắn rằng `firebase-config.json` đã được thêm vào `.gitignore`:

```gitignore
# Firebase config (chứa credentials nhạy cảm)
src/config/firebase-config.json
```

## Bước 5: Chạy Migration (Nếu có dữ liệu SQLite cũ)

```bash
npm start
# Sau khi app chạy, nếu bạn muốn migrate dữ liệu từ SQLite:
# Node script sẽ tự chạy nếu phát hiện dữ liệu SQLite
```

Hoặc chạy migration thủ công:

```bash
node src/main/migration/runMigration.js
```

## Bước 6: Kiểm tra Firestore

1. Vào Firebase Console
2. Chọn project `spa-vip-management`
3. Vào **Firestore Database**
4. Chọn **"Start collection"** để kiểm tra xem collections đã được tạo hay chưa

## Collections trong Firestore

Các collections sau sẽ được tạo tự động:
- `customers` - Khách hàng
- `services` - Dịch vụ
- `staff` - Nhân viên
- `bookings` - Đặt lịch
- `transactions` - Giao dịch
- `inventory` - Tồn kho
- `appSettings` - Cài đặt ứng dụng

## Lưu ý Bảo mật

⚠️ **KHÔNG BAO GIỜ COMMIT**:
- `src/config/firebase-config.json` - Chứa private key
- `.env` files với Firebase credentials

✅ **NÊN LÀMASK**:
- Thêm vào `.gitignore`
- Sử dụng environment variables trên production

## Troubleshooting

### Firebase config not found
```
Error: Firebase config file not found
```
→ Copy `firebase-template.json` thành `firebase-config.json` và fill credentials

### Permission denied errors
→ Kiểm tra Firestore Rules trong Firebase Console:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Development only!
    }
  }
}
```

### Migration failed
```
Error: Database not initialized
```
→ Chắc chắn Firebase config file tồn tại trước khi chạy migration

## Production Setup

Cho production, sử dụng environment variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

Hoặc sử dụng Firebase Cloud Functions + Service Account tách biệt.

## Kết Nối từ Electron

App sẽ tự động:
1. Kiểm tra `firebase-config.json`
2. Nếu tìm thấy → Dùng Firebase
3. Nếu không → Fallback sang SQLite (cũ)

Điều này cho phép testing offline với SQLite trước khi deploy Firebase.
