const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const authRoutes = require("./routes/auth");
const Message = require('./models/Message');
const messageRoutes = require("./routes/messages");
const PrivateMessage = require("./models/PrivateMessage");
const privateMessagesRoutes = require("./routes/privateMessages");

dotenv.config();

const app = express();
app.use(express.json());

const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://rad-crisp-9bd9a7.netlify.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});


const allowedOrigins = [
  "http://localhost:5173", 
  "https://rad-crisp-9bd9a7.netlify.app" 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/privateMessages", privateMessagesRoutes);

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

    socket.on("sendMessage", async ({ sender, text }) => {
        const newMessage = new Message({
            sender,
            message: text,
            receiver: 'Curatales',
        });

        await newMessage.save();
        io.emit("receiveMessage", { sender, text });
    });

    socket.on("sendPrivateMessage", async ({ sender, receiver, message }) => {
        try {
            const saved = await PrivateMessage.create({ sender, receiver, message });

            const receiverSocketId = Object.keys(onlineUsers).find(
                (key) => onlineUsers[key] === receiver
            );

            const payload = {
                _id: saved._id,
                sender,
                receiver,
                message,
            };

            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receivePrivateMessage", payload);
            }

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

    // Handle editing group messages
    socket.on("editGroupMessage", async ({ messageId, newText }) => {
      try {
        const updated = await Message.findByIdAndUpdate(
          messageId,
          { message: newText, isEdited: true },
          { new: true }
        );
        io.emit("groupMessageEdited", updated); // Broadcast to all clients
      } catch (err) {
        console.error("Edit group message failed:", err);
      }
    });

    // Handle deleting group messages
    socket.on("deleteGroupMessage", async (messageId) => {
      try {
        await Message.findByIdAndDelete(messageId);
        io.emit("groupMessageDeleted", messageId); // Notify all clients
      } catch (err) {
        console.error("Delete group message failed:", err);
      }
    });

    // Private Message edit
    socket.on("editPrivateMessage", async ({ messageId, newText }) => {
      try {
        const updated = await PrivateMessage.findByIdAndUpdate(
          messageId,
          { message: newText, isEdited: true },
          { new: true }
        );
        // Emit to sender and receiver only
        Object.entries(onlineUsers).forEach(([socketId, user]) => {
          if ([updated.sender, updated.receiver].includes(user)) {
            io.to(socketId).emit("privateMessageEdited", updated);
          }
        });
      } catch (err) {
        console.error("Edit private message failed:", err);
      }
    });

    // Private Message delete
    socket.on("deletePrivateMessage", async (messageId) => {
      try {
        const deleted = await PrivateMessage.findByIdAndDelete(messageId);
        Object.entries(onlineUsers).forEach(([socketId, user]) => {
          if ([deleted.sender, deleted.receiver].includes(user)) {
            io.to(socketId).emit("privateMessageDeleted", messageId);
          }
        });
      } catch (err) {
        console.error("Delete private message failed:", err);
      }
    });


    socket.on("disconnect", () => {
        console.log("🔴 User Disconnected:", socket.id);
        delete onlineUsers[socket.id];
        io.emit("userList", Object.values(onlineUsers));
    });
});

server.listen(5000, () => console.log("🚀 Server running on port 5000"));
