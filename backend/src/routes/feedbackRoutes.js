const express = require("express");
const feedbackController = require("../controllers/feedbackController");
const { protect, customerOrStaff, staffOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Students/customers submit feedback/complaints and view own items
router.post("/", customerOrStaff, feedbackController.createFeedback);
router.get("/my", customerOrStaff, feedbackController.getMyFeedback);

// Staff/admin complaint lifecycle management
router.get("/queue", staffOnly, feedbackController.getFeedbackQueue);
router.get("/summary", staffOnly, feedbackController.getFeedbackSummary);
router.patch("/:id/status", staffOnly, feedbackController.updateFeedbackStatus);
router.patch("/:id/assign", staffOnly, feedbackController.assignFeedback);

module.exports = router;

