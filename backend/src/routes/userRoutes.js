// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();

// Example user route
router.get('/', (req, res) => {
  res.send('User route works!');
});

// Add more routes here (login, register, etc.)

module.exports = router;
