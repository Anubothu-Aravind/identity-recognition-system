const express = require("express");
const User = require("../Models/User");
const router = express.Router();

// Utility function to calculate similarity between two feature vectors
function calculateSimilarity(features1, features2) {
  if (features1.length !== features2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < features1.length; i++) {
    dotProduct += features1[i] * features2[i];
    norm1 += features1[i] * features1[i];
    norm2 += features2[i] * features2[i];
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return similarity;
}

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { username, imageData, features } = req.body;

    // Validate input
    if (!username || !imageData || !features) {
      return res
        .status(400)
        .json({ error: "Username, image data, and features are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Save user data
    const newUser = new User({
      username,
      imageData,
      features,
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      username: newUser.username,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { features } = req.body;

    if (!features || !Array.isArray(features)) {
      return res
        .status(400)
        .json({ error: "Valid features array is required" });
    }

    // Get all users
    const users = await User.find({});

    let bestMatch = null;
    let bestSimilarity = 0;
    const threshold = 0.7; // Similarity threshold for recognition

    // Compare with all registered users
    for (const user of users) {
      const similarity = calculateSimilarity(features, user.features);

      if (similarity > bestSimilarity && similarity > threshold) {
        bestSimilarity = similarity;
        bestMatch = user;
      }
    }

    if (bestMatch) {
      res.json({
        message: "Login successful",
        username: bestMatch.username,
        similarity: bestSimilarity,
      });
    } else {
      res.status(401).json({ error: "Face not recognized" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users (for admin purposes)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "username createdAt");
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete user
router.delete("/users/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const deletedUser = await User.findOneAndDelete({ username });

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;