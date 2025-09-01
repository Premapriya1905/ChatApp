# ChatApp - Real-time Chat Application

A modern, real-time chat application built with React, Node.js, Socket.io, and MongoDB. Features include group chat, private messaging, message editing/deletion, and a beautiful UI.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using Socket.io
- **Group Chat**: Public chat room for all users
- **Private Messaging**: One-on-one conversations
- **Message Management**: Edit and delete your own messages
- **User Authentication**: Secure login/registration system
- **Modern UI**: Beautiful, responsive design with gradients and animations
- **Emoji Support**: Built-in emoji picker
- **Online Status**: See who's currently online
- **Message History**: Persistent message storage
- **Search Users**: Find users quickly in the sidebar

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **Emoji Picker React** - Emoji support
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - Authentication
- **CORS** - Cross-origin resource sharing

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd ChatApp/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
NODE_ENV=development
```

4. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd ChatApp/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
VITE_API_BASE=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

## 🌐 API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile (protected)

### Group Messages
- `GET /messages/group` - Get all group messages
- `POST /messages/group` - Send group message
- `PUT /messages/group/:id` - Edit group message
- `DELETE /messages/group/:id` - Delete group message

### Private Messages
- `GET /privateMessages` - Get private messages between users
- `POST /privateMessages` - Send private message
- `PUT /privateMessages/:id` - Edit private message
- `DELETE /privateMessages/:id` - Delete private message

## 🔧 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_BASE=http://localhost:5000
```

## 🚀 Deployment

### Backend Deployment (Render)
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as a Node.js service

### Frontend Deployment (Netlify/Vercel)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables

## 📱 Usage

1. **Register**: Create a new account with your name, contact number, and password
2. **Login**: Sign in with your credentials
3. **Group Chat**: Join the public chat room "Curatales"
4. **Private Chat**: Click on any online user to start a private conversation
5. **Send Messages**: Type your message and press Enter or click the send button
6. **Edit/Delete**: Use the edit and delete buttons on your own messages
7. **Emojis**: Click the emoji button to add emojis to your messages

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- CORS protection
- Environment variable configuration
- Error handling and logging

## 🎨 UI Features

- Responsive design
- Dark theme with gradients
- Smooth animations and transitions
- Loading states and error handling
- User avatars with initials
- Online status indicators
- Unread message notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions, please:
1. Check the console for error messages
2. Verify your environment variables
3. Ensure MongoDB is running
4. Check network connectivity

## 🔄 Updates

- Real-time message updates
- User online/offline status
- Message editing and deletion
- Improved error handling
- Enhanced UI/UX
- Better mobile responsiveness
