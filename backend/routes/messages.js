const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

// Get all group messages
router.get('/group', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    res.json({
      messages: messages.reverse(),
      total: await Message.countDocuments(),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Error fetching group messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get message by ID
router.get('/group/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    console.error('❌ Error fetching message:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID format' });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new group message
router.post('/group', async (req, res) => {
  try {
    const { sender, message, receiver = 'Curatales' } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ 
        error: 'Sender and message are required',
        missing: {
          sender: !sender,
          message: !message
        }
      });
    }

    const newMessage = new Message({
      sender: sender.trim(),
      receiver: receiver.trim(),
      message: message.trim(),
      timestamp: new Date()
    });

    await newMessage.save();

    console.log(`💬 New group message from ${sender}: ${message}`);

    res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('❌ Error creating group message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update group message
router.put('/group/:id', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      { 
        message: text.trim(),
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log(`✏️ Group message edited: ${req.params.id}`);

    res.json({
      message: 'Message updated successfully',
      data: updatedMessage
    });
  } catch (error) {
    console.error('❌ Error updating group message:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID format' });
    }
    
    res.status(500).json({ 
      error: 'Failed to update message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete group message
router.delete('/group/:id', async (req, res) => {
  try {
    const deletedMessage = await Message.findByIdAndDelete(req.params.id);

    if (!deletedMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log(`🗑️ Group message deleted: ${req.params.id}`);

    res.json({
      message: 'Message deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('❌ Error deleting group message:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID format' });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get messages by sender
router.get('/group/sender/:sender', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await Message.find({ sender: req.params.sender })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    res.json({
      messages: messages.reverse(),
      total: await Message.countDocuments({ sender: req.params.sender }),
      sender: req.params.sender,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Error fetching messages by sender:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search messages
router.get('/group/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;
    
    const messages = await Message.find({
      $or: [
        { message: { $regex: query, $options: 'i' } },
        { sender: { $regex: query, $options: 'i' } }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      messages: messages.reverse(),
      query,
      total: messages.length,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('❌ Error searching messages:', error);
    res.status(500).json({ 
      error: 'Failed to search messages',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check for messages routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Messages routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
