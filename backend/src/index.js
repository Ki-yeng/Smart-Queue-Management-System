// backend/src/index.js

// Import required packages
const express = require('express');      // Express framework for server
const cors = require('cors');            // Middleware to handle Cross-Origin requests
require('dotenv').config();              // Loads environment variables from .env file

// Initialize Express app
const app = express();

// ------------------------
// MIDDLEWARE
// ------------------------
app.use(cors());                         // Allow requests from other domains (like frontend)
app.use(express.json());                 // Parse JSON data in request body

// ------------------------
// ROUTES
// ------------------------
// Import your route files
const userRoutes = require('./routes/userRoutes');       // Routes for user authentication and management
//const ticketRoutes = require('./routes/ticketRoutes');   // Routes for ticket creation and queue management

// Connect routes to the API
app.use('/api/users', userRoutes);      // All user-related routes will start with /api/users
//app.use('/api/tickets', ticketRoutes);  // All ticket-related routes will start with /api/tickets

// ------------------------
// TEST ROUTE
// ------------------------
app.get('/', (req, res) => {
  res.send('Smart Queue Management System Backend is running');  // Simple test to check server
});

// ------------------------
// START SERVER
// ------------------------
const PORT = process.env.PORT || 5000;   // Use the PORT from .env or default to 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);  // Logs to console when server starts
});
