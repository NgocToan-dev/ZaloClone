# 💬 ZaloClone - Real-time Messaging Application

A modern real-time messaging application built with Vue.js frontend and Node.js backend, featuring WebSocket communication for instant messaging.

## 🚀 Features

- **User Authentication** - Register and login with email/password
- **Real-time Messaging** - Instant message delivery using WebSocket
- **Private Chats** - One-on-one conversations between users
- **Message History** - Persistent message storage and retrieval
- **Responsive Design** - Works on desktop and mobile devices
- **Modern UI** - Clean interface built with Tailwind CSS

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket/HTTP    ┌─────────────────┐
│   Vue.js 3      │ ◄─────────────────► │   Node.js       │
│   Frontend      │                     │   Backend       │
│                 │                     │                 │
│ • Pinia Store   │                     │ • Express.js    │
│ • Vue Router    │                     │ • Socket.io     │
│ • Tailwind CSS  │                     │ • JWT Auth      │
│ • Axios         │                     │ • Mongoose ODM  │
└─────────────────┘                     └─────────────────┘
                                                  │
                                                  ▼
                                        ┌─────────────────┐
                                        │   MongoDB       │
                                        │   Database      │
                                        └─────────────────┘
```

## 📁 Project Structure

```
zalo-clone/
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   ├── socket/          # WebSocket handlers
│   │   └── config/          # Database config
│   ├── .env                 # Environment variables
│   └── package.json
│
├── frontend/                # Vue.js Frontend
│   ├── src/
│   │   ├── components/      # Vue components
│   │   ├── views/           # Page components
│   │   ├── store/           # Pinia stores
│   │   ├── services/        # API services
│   │   └── router/          # Vue Router config
│   ├── index.html
│   └── package.json
│
├── PROJECT_PLAN.md          # Detailed project plan
└── README.md               # This file
```

## 🛠️ Technology Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zalo-clone
   ```

2. **Set up the Backend**
   ```bash
   cd backend
   npm install
   
   # Create .env file with your configuration
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   
   # Start the backend server
   npm run dev
   ```

3. **Set up the Frontend**
   ```bash
   cd ../frontend
   npm install
   
   # Start the frontend development server
   npm run dev
   ```

4. **Start MongoDB**
   - Ensure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017/zaloclone`

### Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zaloclone
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

## 📱 Usage

1. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

2. **Create an Account**
   - Navigate to the registration page
   - Fill in your details (First Name, Last Name, Email, Password)
   - Click "Create account"

3. **Start Messaging**
   - After login, you'll see the chat interface
   - Enter an email address to start a new conversation
   - Send and receive messages in real-time

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Chats
- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id/messages` - Get chat messages

### Messages
- `POST /api/messages` - Send message

## 🌐 WebSocket Events

### Client to Server
- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `send_message` - Send a message

### Server to Client
- `receive_message` - Receive new message
- `error` - Error notifications

## 🧪 Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

**Frontend:**
```bash
cd frontend
npm run dev  # Uses Vite dev server with HMR
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

### Project Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **Input Validation** - Server-side validation for all inputs
- **CORS Configuration** - Cross-origin resource sharing setup
- **Environment Variables** - Sensitive data stored in environment files

## 🎯 Current Features

✅ User registration and authentication  
✅ Real-time messaging with WebSocket  
✅ Private one-on-one conversations  
✅ Message history and persistence  
✅ Responsive design  
✅ Clean, modern UI  

## 🚧 Future Enhancements

- [ ] Group chats
- [ ] File sharing and image uploads
- [ ] Emoji reactions to messages
- [ ] Message editing and deletion
- [ ] Online status indicators
- [ ] Push notifications
- [ ] Message search functionality
- [ ] User profiles with avatars
- [ ] Message read receipts
- [ ] Typing indicators

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Vue.js team for the excellent framework
- Socket.io for real-time communication
- Tailwind CSS for the utility-first CSS framework
- MongoDB team for the flexible database solution

---

**Happy Chatting!** 💬✨