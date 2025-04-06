const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
    const { username, contact, password } = req.body;

    if (!username || !contact || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = await User.create({ username, contact, password: hashedPassword });
        res.json({ message: "User registered successfully!" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Contact already exists" });
    }
});


// Login User
router.post("/login", async (req, res) => {
  const { contact, password } = req.body;
  console.log("Body received:", req.body);

  try {
    console.log("🔐 Incoming login request");
    console.log("👉 Contact received from frontend:", contact, "Type:", typeof contact);

    const users = await User.find({});
    console.log("📦 All users in DB:");
    users.forEach(u => console.log(` - ${u.contact} (type: ${typeof u.contact})`));

    // Try to find user
    const user = await User.findOne({ contact: String(contact).trim() });

    if (!user) {
      console.log("❌ User not found with contact:", contact);
      return res.status(400).json({ error: "User not found" });
    }

    console.log("✅ User found:", user.username);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Invalid password");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ contact: user.contact }, "your-secret-key", { expiresIn: "1h" });

    res.json({ token, username: user.username, contact: user.contact });
  } catch (err) {
    console.error("🔥 Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
