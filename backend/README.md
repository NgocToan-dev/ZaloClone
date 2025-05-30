# ZaloClone Backend (TypeScript)

Backend API cho ứng dụng ZaloClone được viết bằng Node.js, Express, MongoDB và TypeScript.

## 🚀 Features

- **Authentication & Authorization** với JWT
- **User Management** với CRUD operations
- **Real-time Chat** với Socket.io (coming soon)
- **Type Safety** với TypeScript
- **Database Seeding** với sample data
- **Performance Optimization** với MongoDB indexes

## 📁 Project Structure

```
backend/
├── src/
│   ├── types/           # TypeScript type definitions
│   │   ├── auth.types.ts
│   │   ├── user.types.ts
│   │   └── common.types.ts
│   ├── models/          # Mongoose models
│   │   └── User.ts
│   ├── controllers/     # Route controllers
│   │   ├── authController.ts
│   │   └── userController.ts
│   ├── routes/          # Express routes
│   │   ├── auth.ts
│   │   └── users.ts
│   ├── middleware/      # Custom middleware
│   │   └── auth.ts
│   ├── config/          # Configuration files
│   │   └── database.ts
│   └── app.ts           # Main application file
├── scripts/             # Database scripts
│   ├── seedUsers.ts
│   └── createIndexes.ts
├── dist/                # Compiled JavaScript (auto-generated)
└── tsconfig.json        # TypeScript configuration
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js >= 18
- MongoDB
- npm or yarn

### Installation

1. **Clone & navigate:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database:**
```bash
npm run db:setup
```

5. **Start development server:**
```bash
npm run dev
```

## 📜 Available Scripts

### Development
```bash
npm run dev         # Start development server with hot reload
npm run build       # Build TypeScript to JavaScript
npm run start       # Start production server
npm run type-check  # Type check without building
```

### Database Management
```bash
npm run db:seed     # Create sample users
npm run db:indexes  # Create database indexes
npm run db:setup    # Create indexes + seed data
npm run db:reset    # Drop indexes + recreate everything
```

## 🔑 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/zaloclone

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_very_long_and_secure
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Client Configuration
CLIENT_URL=http://localhost:3000
```

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | Login user | Public |
| POST | `/logout` | Logout user | Private |
| GET | `/me` | Get current user | Private |
| POST | `/refresh` | Refresh JWT token | Private |

### User Routes (`/api/users`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/profile` | Get user profile | Private |
| PUT | `/profile` | Update profile | Private |
| PUT | `/change-password` | Change password | Private |
| GET | `/search?q=query` | Search users | Private |
| GET | `/email/:email` | Get user by email | Private |
| GET | `/online` | Get online users | Private |
| GET | `/:id` | Get user by ID | Private |
| GET | `/contacts` | Get user contacts | Private |
| POST | `/contacts` | Add contact | Private |
| DELETE | `/contacts/:userId` | Remove contact | Private |
| PUT | `/status` | Update user status | Private |

## 🧪 API Testing

### Sample Login Request
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

### Sample Authenticated Request
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Sample User Search
```bash
curl -X GET "http://localhost:5000/api/users/search?q=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Sample Data

After running `npm run db:seed`, you'll have 8 sample users:

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

## 🏗️ TypeScript Types

### User Types
- `IUser` - Database user document interface
- `UserResponse` - API response format
- `UserStatus` - Enum for user status (online, away, busy, offline)
- `UpdateProfileRequest` - Profile update request body
- `ChangePasswordRequest` - Password change request body

### Auth Types
- `AuthRequest` - Extended Express request with user data
- `TokenPayload` - JWT token payload interface
- `LoginRequestBody` - Login request body
- `RegisterRequestBody` - Register request body
- `AuthResponseData` - Authentication response format

### Common Types
- `ApiResponse<T>` - Generic API response format
- `TypedResponse<T>` - Type-safe Express response
- `PaginationQuery` - Pagination parameters
- `EnvConfig` - Environment variables interface

## 🔧 Development

### Adding New Routes
1. Create controller in `src/controllers/`
2. Define routes in `src/routes/`
3. Add route to `src/app.ts`
4. Define types in `src/types/`

### Database Models
- Models are defined using Mongoose with TypeScript
- Types are defined in `src/types/`
- Validation and middleware in model files

### Type Safety
- All controllers use typed requests/responses
- Type definitions in `src/types/`
- Strict TypeScript configuration

## 🚀 Production Deployment

```bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2
pm2 start dist/app.js --name "zaloclone-backend"
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error:**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env

2. **TypeScript Compilation Errors:**
   - Run `npm run type-check`
   - Check import paths use `@/` alias

3. **JWT Token Issues:**
   - Verify JWT_SECRET is set
   - Check token format: `Bearer <token>`

4. **Port Already in Use:**
   - Change PORT in .env
   - Kill existing process: `npx kill-port 5000`

## 📄 License

MIT License - see LICENSE file for details.