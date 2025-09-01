const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const privateMessageRoutes = require('./routes/privateMessages');

// Import models
const Message = require('./models/Message');
const PrivateMessage = require('./models/PrivateMessage');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://flourishing-gaufre-1944d4.netlify.app',
  'https://your-frontend-domain.com' // Add your frontend domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'ChatApp API is running! 🚀', status: 'healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);
app.use('/privateMessages', privateMessageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.io connection handling
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔵 User Connected:', socket.id);

  // Join chat
  socket.on('joinChat', async (username) => {
    try {
      onlineUsers.set(socket.id, username);
      
      // Send updated user list to all clients
      const userList = Array.from(onlineUsers.values());
      io.emit('userList', userList);

      // Send chat history
      const chatHistory = await Message.find()
        .sort({ timestamp: 1 })
        .limit(50)
        .lean();
      
      socket.emit('chatHistory', chatHistory);
      
      console.log(`👤 ${username} joined the chat`);
    } catch (error) {
      console.error('Error in joinChat:', error);
    }
  });

  // Send group message
  socket.on('sendMessage', async ({ sender, text }) => {
    try {
      const newMessage = new Message({
        sender,
        receiver: 'Curatales',
        message: text,
        timestamp: new Date()
      });

      await newMessage.save();
      
      const messageData = {
        _id: newMessage._id,
        sender: newMessage.sender,
        message: newMessage.message,
        timestamp: newMessage.timestamp
      };

      io.emit('receiveMessage', messageData);
      console.log(`💬 Group message from ${sender}: ${text}`);
    } catch (error) {
      console.error('Error sending group message:', error);
    }
  });

  // Send private message
  socket.on('sendPrivateMessage', async ({ sender, receiver, message }) => {
    try {
      const newPrivateMessage = new PrivateMessage({
        sender,
        receiver,
        message,
        timestamp: new Date()
      });

      await newPrivateMessage.save();

      const messageData = {
        _id: newPrivateMessage._id,
        sender: newPrivateMessage.sender,
        receiver: newPrivateMessage.receiver,
        message: newPrivateMessage.message,
        timestamp: newPrivateMessage.timestamp
      };

      // Send to receiver if online
      const receiverSocketId = Array.from(onlineUsers.entries())
        .find(([id, user]) => user === receiver)?.[0];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receivePrivateMessage', messageData);
      }

      // Send back to sender
      socket.emit('receivePrivateMessage', messageData);
      
      console.log(`💭 Private message from ${sender} to ${receiver}: ${message}`);
    } catch (error) {
      console.error('Error sending private message:', error);
    }
  });

  // Edit group message
  socket.on('editGroupMessage', async ({ messageId, newText }) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { 
          message: newText, 
          isEdited: true 
        },
        { new: true }
      );

      if (updatedMessage) {
        io.emit('groupMessageEdited', updatedMessage);
        console.log(`✏️ Group message edited: ${messageId}`);
      }
    } catch (error) {
      console.error('Error editing group message:', error);
    }
  });

  // Delete group message
  socket.on('deleteGroupMessage', async (messageId) => {
    try {
      await Message.findByIdAndDelete(messageId);
      io.emit('groupMessageDeleted', messageId);
      console.log(`🗑️ Group message deleted: ${messageId}`);
    } catch (error) {
      console.error('Error deleting group message:', error);
    }
  });

  // Edit private message
  socket.on('editPrivateMessage', async ({ messageId, newText }) => {
    try {
      const updatedMessage = await PrivateMessage.findByIdAndUpdate(
        messageId,
        { 
          message: newText, 
          isEdited: true 
        },
        { new: true }
      );

      if (updatedMessage) {
        const { sender, receiver } = updatedMessage;
        
        // Send to both sender and receiver
        onlineUsers.forEach((user, socketId) => {
          if (user === sender || user === receiver) {
            io.to(socketId).emit('privateMessageEdited', updatedMessage);
          }
        });
        
        console.log(`✏️ Private message edited: ${messageId}`);
      }
    } catch (error) {
      console.error('Error editing private message:', error);
    }
  });

  // Delete private message
  socket.on('deletePrivateMessage', async (messageId) => {
    try {
      const deletedMessage = await PrivateMessage.findByIdAndDelete(messageId);
      
      if (deletedMessage) {
        const { sender, receiver } = deletedMessage;
        
        // Send to both sender and receiver
        onlineUsers.forEach((user, socketId) => {
          if (user === sender || user === receiver) {
            io.to(socketId).emit('privateMessageDeleted', messageId);
          }
        });
        
        console.log(`🗑️ Private message deleted: ${messageId}`);
      }
    } catch (error) {
      console.error('Error deleting private message:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    
    const userList = Array.from(onlineUsers.values());
    io.emit('userList', userList);
    
    console.log(`🔴 User Disconnected: ${username || 'Unknown'} (${socket.id})`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io server ready`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
