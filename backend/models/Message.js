const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
  receiver: { type: String, default: null }, 
  message: { type: String, default: "" },
  audio: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", MessageSchema);
