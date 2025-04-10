const express = require('express')
const http = require('http')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const {Server} = require('socket.io')
const authRoutes = require("./routes/auth");
const Message = require('./models/Message');
const messageRoutes = require("./routes/messages");
const PrivateMessage = require("./models/PrivateMessage")
const privateMessagesRoutes = require("./routes/privateMessages")

dotenv.config()

const app = express()
app.use(express.json()); 
const server = http.createServer(app)

const io = new Server(server, {
    cors:{
        origin: "http://localhost:5173",
        methods: ["Get", "Post"]
    }
})

app.use(cors())
app.use(express.json())
app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);        
app.use("/privateMessages", privateMessagesRoutes);

require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

let onlineUsers = {};

// Socket.io Logic 
io.on("connection", (socket) => {
    console.log("🔵 User Connected:", socket.id);

    socket.on("joinChat", async (username) => {
        onlineUsers[socket.id] = username;
        io.emit("userList", Object.values(onlineUsers));

        const chatHistory = await Message.find().sort({ timestamp: 1 }).limit(50);
        socket.emit("chatHistory", chatHistory);
    });

    socket.on("sendMessage", async ({ sender, text, audio }) => {
        const newMessage = new Message({
            sender,
            message: text || null,
            receiver: 'Curatales',
            audio: audio || null,
        });

        await newMessage.save();
        io.emit("receiveMessage", { sender, text, audio });
    });

    // 🔧sendPrivateMessage handler to also save the private message
    
    socket.on("sendPrivateMessage", async ({ sender, receiver, message, audio }) => {
      try {
        const saved = await PrivateMessage.create({ sender, receiver, message, audio });
    
        const receiverSocketId = Object.keys(onlineUsers).find(
          (key) => onlineUsers[key] === receiver
        );
    
        const payload = {
          _id: saved._id,
          sender,
          receiver,
          message,
          audio,
        };
    
        // Emit to receiver if online
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receivePrivateMessage", payload);
        }
    
        // Emit to sender as well (for local sync)
        const senderSocketId = Object.keys(onlineUsers).find(
          (key) => onlineUsers[key] === sender
        );
        if (senderSocketId) {
          io.to(senderSocketId).emit("receivePrivateMessage", payload);
        }
      } catch (err) {
        console.error("❌ Failed to save private message:", err);
      }
    });
    
      
        

    socket.on("disconnect", () => {
        console.log("🔴 User Disconnected:", socket.id);
        delete onlineUsers[socket.id];
        io.emit("userList", Object.values(onlineUsers));
    });
});
        
server.listen(5000, () => console.log("🚀 Server running on port 5000"));
        