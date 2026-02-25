const express = require("express");
const controller = require("../controllers/officeIntegrationController");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Unified profile + transaction history
router.get("/profile/:userId", controller.getUnifiedStudentProfile);
router.get("/transactions/:userId", controller.getOfficeTransactions);

// Finance Office Integration
router.get("/finance/fee-balance/:userId", controller.getFeeBalance);
router.get("/finance/clearance/verify/:userId", controller.verifyFeeClearance);
router.post("/finance/payments", controller.processPayment);

// Registry / Academic Office Integration
router.post("/registry/transcripts/request", controller.requestTranscript);
router.post("/registry/exam-card/generate", controller.generateExamCard);
router.get("/registry/unit-registration/verify/:userId", controller.verifyUnitRegistration);
router.get("/registry/graduation-clearance/:userId", controller.trackGraduationClearance);
router.get("/registry/academic-status/:userId", controller.lookupAcademicStatus);

// ICT Department Integration
router.post("/ict/portal-issues/report", controller.reportPortalIssue);
router.post("/ict/password-reset", controller.automatePasswordReset);
router.get("/ict/id-card-status/:userId", controller.trackICTIdCardStatus);
router.get("/ict/email-activation/:userId", controller.getEmailActivationStatus);

// Library Integration
router.get("/library/fines/:userId", controller.lookupLibraryFineBalance);
router.get("/library/book-return-status/:userId", controller.lookupBookReturnStatus);
router.post("/library/clearance/approve", allowRoles("staff", "admin"), controller.approveLibraryClearance);

// Hostel / Accommodation Integration
router.get("/hostel/room-allocation/:userId", controller.lookupRoomAllocation);
router.get("/hostel/payment-verification/:userId", controller.verifyHostelPayment);
router.post("/hostel/clearance/confirm", allowRoles("staff", "admin"), controller.confirmHostelClearance);

// Security Integration
router.get("/security/id-card-production/:userId", controller.trackSecurityIdCardProduction);
router.post("/security/lost-card/report", controller.reportLostCard);
router.post(
  "/security/graduation-clearance/approve",
  allowRoles("staff", "admin"),
  controller.approveSecurityGraduationClearance
);

module.exports = router;

