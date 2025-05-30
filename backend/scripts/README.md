# MongoDB Database Scripts

Các script để setup và quản lý database MongoDB cho ZaloClone backend.

## 📁 Files

- **`seedUsers.js`** - Script tạo dữ liệu mẫu cho bảng users
- **`createIndexes.js`** - Script tạo indexes để tối ưu performance
- **`package.json`** - NPM scripts để chạy các commands dễ dàng

## 🚀 Cách sử dụng

### 1. Setup Database từ đầu

```bash
# Chạy từ thư mục backend/scripts/
cd backend/scripts

# Tạo indexes + seed data
npm run setup
```

### 2. Seed Users Data

```bash
# Tạo 8 users mẫu với contacts
npm run seed

# Hoặc chạy trực tiếp
node seedUsers.js
```

### 3. Tạo Database Indexes

```bash
# Tạo tất cả indexes
npm run indexes

# Hoặc chạy trực tiếp
node createIndexes.js
```

### 4. Reset Database

```bash
# Xóa indexes + tạo lại từ đầu
npm run reset
```

### 5. Drop Indexes

```bash
# Xóa tất cả indexes
npm run indexes:drop

# Hoặc
node createIndexes.js drop
```

## 📊 Dữ liệu được tạo

### Sample Users (8 users):

| Name | Email | Password | Status |
|------|-------|----------|--------|
| John Doe | john.doe@example.com | password123 | online |
| Jane Smith | jane.smith@example.com | password123 | away |
| Mike Johnson | mike.johnson@example.com | password123 | busy |
| Sarah Wilson | sarah.wilson@example.com | password123 | offline |
| David Brown | david.brown@example.com | password123 | online |
| Emily Davis | emily.davis@example.com | password123 | away |
| Chris Miller | chris.miller@example.com | password123 | online |
| Lisa Garcia | lisa.garcia@example.com | password123 | offline |

### Sample Contacts:
- John ↔ Jane (mutual contacts)
- Mike ↔ Sarah (mutual contacts)  
- David có nhiều bạn: John, Emily, Chris

### Database Indexes:

1. **Email Index** - Unique index cho email field
2. **Status Index** - Để filter users theo status
3. **Text Search Index** - Full-text search cho firstName, lastName, email
4. **Compound Index** - status + lastSeen để query active users
5. **LastSeen Index** - Sắp xếp theo activity
6. **CreatedAt Index** - Sắp xếp theo thời gian tạo

## 🔧 Requirements

Đảm bảo đã cài đặt:
- Node.js
- MongoDB đang chạy
- File `.env` với `MONGODB_URI` đã được config

## 📝 Environment Variables

```bash
# File: backend/.env
MONGODB_URI=mongodb://localhost:27017/zaloclone
# hoặc MongoDB Atlas connection string
```

## 🧪 Test Commands

```bash
# Test login với user mẫu
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'

# Test search users
curl -X GET "http://localhost:5000/api/users/search?q=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ⚠️ Lưu ý

- Script sẽ **XÓA TẤT CẢ** users hiện có trước khi tạo mới
- Chỉ chạy trên development environment
- Backup dữ liệu quan trọng trước khi chạy script
- Default password cho tất cả users: `password123`

## 🔍 Troubleshooting

### Connection Error:
```bash
# Kiểm tra MongoDB đang chạy
mongosh # hoặc mongo

# Kiểm tra connection string trong .env
echo $MONGODB_URI
```

### Permission Error:
```bash
# Đảm bảo có quyền write vào database
# Hoặc thay đổi connection string trong script