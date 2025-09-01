const express = require('express');
const PrivateMessage = require('../models/PrivateMessage');

const router = express.Router();

// Get private messages between two users
router.get('/', async (req, res) => {
  try {
    const { user1, user2, limit = 50, offset = 0 } = req.query;

    if (!user1 || !user2) {
      return res.status(400).json({ 
        error: 'Both user1 and user2 parameters are required',
        missing: {
          user1: !user1,
          user2: !user2
        }
      });
    }

    const messages = await PrivateMessage.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    res.json({
      messages: messages.reverse(),
      total: await PrivateMessage.countDocuments({
        $or: [
          { sender: user1, receiver: user2 },
          { sender: user2, receiver: user1 }
        ]
      }),
      users: [user1, user2],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Error fetching private messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch private messages',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get private message by ID
router.get('/:id', async (req, res) => {
  try {
    const message = await PrivateMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Private message not found' });
    }

    res.json({ message });
  } catch (error) {
    console.error('❌ Error fetching private message:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID format' });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch private message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new private message
router.post('/', async (req, res) => {
  try {
    const { sender, receiver, message } = req.body;

    if (!sender || !receiver || !message) {
      return res.status(400).json({ 
        error: 'Sender, receiver, and message are required',
        missing: {
          sender: !sender,
          receiver: !receiver,
          message: !message
        }
      });
    }

    const newPrivateMessage = new PrivateMessage({
      sender: sender.trim(),
      receiver: receiver.trim(),
      message: message.trim(),
      timestamp: new Date()
    });

    await newPrivateMessage.save();

    console.log(`💭 New private message from ${sender} to ${receiver}: ${message}`);

    res.status(201).json({
      message: 'Private message sent successfully',
      data: newPrivateMessage
    });
  } catch (error) {
    console.error('❌ Error creating private message:', error);
    res.status(500).json({ 
      error: 'Failed to send private message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update private message
router.put('/:id', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const updatedMessage = await PrivateMessage.findByIdAndUpdate(
      req.params.id,
      { 
        message: message.trim(),
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: 'Private message not found' });
    }

    console.log(`✏️ Private message edited: ${req.params.id}`);

    res.json({
      message: 'Private message updated successfully',
      data: updatedMessage
    });
  } catch (error) {
    console.error('❌ Error updating private message:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID format' });
    }
    
    res.status(500).json({ 
      error: 'Failed to update private message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete private message
router.delete('/:id', async (req, res) => {
  try {
    const deletedMessage = await PrivateMessage.findByIdAndDelete(req.params.id);

    if (!deletedMessage) {
      return res.status(404).json({ error: 'Private message not found' });
    }

    console.log(`🗑️ Private message deleted: ${req.params.id}`);

    res.json({
      message: 'Private message deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('❌ Error deleting private message:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID format' });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete private message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all private messages for a user
router.get('/user/:username', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await PrivateMessage.find({
      $or: [
        { sender: req.params.username },
        { receiver: req.params.username }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    res.json({
      messages: messages.reverse(),
      total: await PrivateMessage.countDocuments({
        $or: [
          { sender: req.params.username },
          { receiver: req.params.username }
        ]
      }),
      username: req.params.username,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Error fetching user private messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch private messages',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get conversation list for a user
router.get('/conversations/:username', async (req, res) => {
  try {
    const conversations = await PrivateMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: req.params.username },
            { receiver: req.params.username }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.params.username] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $last: '$$ROOT' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    res.json({
      conversations,
      username: req.params.username,
      total: conversations.length
    });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search private messages
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { username, limit = 20 } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Username parameter is required for search' });
    }

    const messages = await PrivateMessage.find({
      $and: [
        {
          $or: [
            { sender: username },
            { receiver: username }
          ]
        },
        {
          $or: [
            { message: { $regex: query, $options: 'i' } },
            { sender: { $regex: query, $options: 'i' } },
            { receiver: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      messages: messages.reverse(),
      query,
      username,
      total: messages.length,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('❌ Error searching private messages:', error);
    res.status(500).json({ 
      error: 'Failed to search private messages',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check for private messages routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Private messages routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

