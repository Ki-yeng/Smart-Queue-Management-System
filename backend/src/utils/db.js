const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // no need for useNewUrlParser or useUnifiedTopology
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1); // stop server if DB connection fails
  }
};

module.exports = connectDB;
