// Import mongoose so we can create schemas and models
const mongoose = require("mongoose");

// Define the structure (schema) for the User collection
const userSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: [true, "Name is required"], // must be provided
      trim: true, // removes extra spaces
    },

    // Email used for login
    email: {
      type: String,
      required: [true, "Email is required"], // must be provided
      unique: true, // no two users can use the same email
      lowercase: true, // converts EMAIL@EXAMPLE.COM → email@example.com
      trim: true, // removes spaces before/after
    },

    // Hashed password (never store plain text passwords)
    password: {
      type: String,
      required: [true, "Password is required"], // must be provided
      minlength: 6, // minimum length for security
    },

    // Defines user role in the system
    role: {
      type: String,
      enum: ["admin", "staff", "customer"], // allowed roles only
      default: "customer", // if not specified, default is 'customer'
    },
  },

  // Automatically adds createdAt and updatedAt fields
  {
    timestamps: true,
  }
);

// Export the model so it can be used in routes and controllers
module.exports = mongoose.model("User", userSchema);
