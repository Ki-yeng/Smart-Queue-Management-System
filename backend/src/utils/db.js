const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.log("Error connecting to DB:", error);
  }
};

module.exports = connectDB;
Update server.js:
const app = require("./src/app");
const connectDB = require("./src/utils/db");

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
In .env:
MONGO_URI=mongodb+srv://xxxxxxx
