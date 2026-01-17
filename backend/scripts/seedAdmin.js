#!/usr/bin/env node

/**
 * Seed Script: Initialize Admin User
 * 
 * Usage:
 *   npm run seed
 *   OR
 *   node scripts/seedAdmin.js
 * 
 * This script creates an initial admin user for first-time setup.
 * If an admin already exists, it skips creation and shows existing admin details.
 * 
 * Default Credentials (CHANGE THESE IMMEDIATELY IN PRODUCTION):
 *   Email: admin@kcau.ac.ke
 *   Password: Admin@2024
 *   Role: admin
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/User");
const connectDB = require("../src/utils/db");

// Default admin credentials (CHANGE IN PRODUCTION)
const DEFAULT_ADMIN = {
  name: "KCAU Admin",
  email: "admin@kcau.ac.ke",
  password: "Admin@2024", // MUST BE CHANGED in production
  role: "admin",
  department: "Administration",
};

async function seedAdmin() {
  try {
    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...");
    await connectDB();

    // Check if admin exists
    console.log("🔍 Checking for existing admin user...");
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("\n✅ Admin user already exists:");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Department: ${existingAdmin.department || "N/A"}`);
      console.log(
        `   Created: ${
          existingAdmin.createdAt
            ? existingAdmin.createdAt.toLocaleString()
            : "N/A"
        }`
      );
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log("\n⏭️  Skipping admin creation.");
      process.exit(0);
    }

    // Hash password
    console.log("\n🔐 Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);

    // Create admin user
    console.log("👤 Creating admin user...");
    const adminUser = new User({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role,
      department: DEFAULT_ADMIN.department,
      isActive: true,
    });

    await adminUser.save();

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📋 Admin Details:");
    console.log(`   ID: ${adminUser._id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Department: ${adminUser.department}`);
    console.log(`   Active: ${adminUser.isActive}`);
    console.log(`   Created: ${adminUser.createdAt.toLocaleString()}`);

    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: ${DEFAULT_ADMIN.email}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);

    console.log("\n⚠️  IMPORTANT:");
    console.log("   1. Change the default admin password immediately");
    console.log("   2. Never commit default credentials to version control");
    console.log("   3. Use strong, unique passwords in production");
    console.log("   4. Consider enabling 2FA for admin accounts");

    process.exit(0);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      console.error("\n❌ Error: Admin email already exists in database");
      console.error(
        "   If you need to reset the admin account, delete it manually from the database first."
      );
    } else if (error.name === "ValidationError") {
      console.error("\n❌ Validation Error:");
      Object.keys(error.errors).forEach((key) => {
        console.error(`   ${key}: ${error.errors[key].message}`);
      });
    } else {
      console.error("\n❌ Seed Error:", error.message);
    }
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 Database connection closed");
    }
  }
}

// Run seed script
seedAdmin();
