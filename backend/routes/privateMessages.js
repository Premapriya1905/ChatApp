const express = require("express");
const router = express.Router();
const PrivateMessage = require("../models/PrivateMessage");

// Get private messages
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

// Edit private message
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  try {
    const updated = await PrivateMessage.findByIdAndUpdate(
      id,
      { message, isEdited: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to edit message" });
  }
});

// Delete private message
router.delete("/:id", async (req, res) => {
  try {
    await PrivateMessage.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

module.exports = router;
