const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// Get all group messages
router.get("/group", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Error fetching group messages" });
  }
});

// Edit group message
router.put("/group/:id", async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  try {
    const updated = await Message.findByIdAndUpdate(
      id,
      { message: text, isEdited: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to edit group message" });
  }
});

// Delete group message
router.delete("/group/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

module.exports = router;
