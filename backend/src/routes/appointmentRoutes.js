const express = require("express");
const router = express.Router();
const controller = require("../controllers/appointmentController");
const { protect, customerOrStaff } = require("../middleware/authMiddleware");

router.use(protect, customerOrStaff);

router.get("/", controller.getAppointments);
router.post("/", controller.createAppointment);
router.put("/:id/cancel", controller.cancelAppointment);
router.put("/:id/join-queue", controller.joinQueueFromAppointment);

module.exports = router;

