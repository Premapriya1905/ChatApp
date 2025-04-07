const express = require("express");
const router = express.Router();
const PrivateMessage = require("../models/PrivateMessage");

// GET private messages between two users
router.get("/", async (req, res) => {
  const { user1, user2 } = req.query;

  try {
    const messages = await PrivateMessage.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Error fetching private messages" });
  }
});

module.exports = router;
