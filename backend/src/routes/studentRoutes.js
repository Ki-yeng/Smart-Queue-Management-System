const express = require("express");
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");

const router = express.Router();

// @route POST /api/students/register
// @desc Register a new student
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStudent = new Student({
      name,
      email,
      password: hashedPassword,
    });

    await newStudent.save();

    res.status(201).json({ message: "Student registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
