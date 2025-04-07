const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// GET group messages
router.get("/group", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Error fetching group messages" });
  }
});

module.exports = router;
