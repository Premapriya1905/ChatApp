const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Input validation middleware
const validateRegistration = (req, res, next) => {
  const { username, contact, password } = req.body;
  
  if (!username || !contact || !password) {
    return res.status(400).json({ 
      error: 'All fields are required',
      missing: {
        username: !username,
        contact: !contact,
        password: !password
      }
    });
  }

  if (username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters long' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  if (!/^\d{10,}$/.test(contact.replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Please enter a valid contact number' });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { contact, password } = req.body;
  
  if (!contact || !password) {
    return res.status(400).json({ 
      error: 'Contact and password are required',
      missing: {
        contact: !contact,
        password: !password
      }
    });
  }

  next();
};

// Register User
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, contact, password } = req.body;
    
    // Clean contact number
    const cleanContact = contact.replace(/\D/g, '');
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      contact: cleanContact 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this contact number already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      username: username.trim(),
      contact: cleanContact,
      password: hashedPassword
    });

    await newUser.save();

    console.log(`✅ New user registered: ${username} (${cleanContact})`);

    res.status(201).json({ 
      message: 'User registered successfully!',
      user: {
        username: newUser.username,
        contact: newUser.contact
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'User with this contact number already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login User
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { contact, password } = req.body;
    
    // Clean contact number
    const cleanContact = contact.replace(/\D/g, '');
    
    console.log(`🔐 Login attempt for contact: ${cleanContact}`);

    // Find user by contact
    const user = await User.findOne({ contact: cleanContact });
    
    if (!user) {
      console.log(`❌ Login failed: User not found (${cleanContact})`);
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`❌ Login failed: Wrong password for ${cleanContact}`);
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        contact: user.contact 
      },
      JWT_SECRET,
      { 
        expiresIn: '7d' // Token expires in 7 days
      }
    );

    console.log(`✅ Login successful: ${user.username} (${cleanContact})`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        contact: user.contact,
        id: user._id
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify Token (for protected routes)
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get user profile (protected route)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        contact: user.contact
      }
    });
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all users (for chat list)
router.get('/users', verifyToken, async (req, res) => {
  try {
    const users = await User.find().select('username contact').lean();
    
    // Filter out the current user
    const filteredUsers = users.filter(user => user._id.toString() !== req.user.userId);
    
    res.json({
      users: filteredUsers,
      total: filteredUsers.length
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check for auth routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
