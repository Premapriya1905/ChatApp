const mongoose = require("mongoose");

const PrivateMessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  message: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PrivateMessage", PrivateMessageSchema);
