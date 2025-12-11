// src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String }, // optional Cloudinary/Imgur URL
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
