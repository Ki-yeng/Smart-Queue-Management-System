// src/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ------------------------
// MIDDLEWARE
// ------------------------
app.use(cors());
app.use(express.json());

// ------------------------
// TEST ROUTES
// ------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => {
  res.send('Smart Queue Management System Backend is running');
});

// ------------------------
// ROUTES
// ------------------------
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// ------------------------
// DATABASE CONNECTION
// ------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ------------------------
// START SERVER
// ------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
