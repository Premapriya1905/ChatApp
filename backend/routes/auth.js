const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// ✅ Use JWT secret from environment (never hardcode!)
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// ✅ Register User
router.post("/register", async (req, res) => {
  const { username, contact, password } = req.body;

  if (!username || !contact || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, contact, password: hashedPassword });
    res.json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(400).json({ error: "Contact already exists" });
  }
});

// ✅ Login User
router.post("/login", async (req, res) => {
  const { contact, password } = req.body;

  try {
    console.log("🔐 Incoming login:", contact);

    // Ensure we treat contact consistently as string
    const user = await User.findOne({ contact: String(contact).trim() });

    if (!user) {
      console.log("❌ User not found:", contact);
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Wrong password for:", contact);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, contact: user.contact },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ 
      token, 
      username: user.username, 
      contact: user.contact 
    });
  } catch (err) {
    console.error("🔥 Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
