const officeIntegrationService = require("../services/officeIntegrationService");

const readTargetUserId = (req) =>
  req.params.userId || req.body.userId || req.query.userId || req.user?._id?.toString();

const ensureAccess = (req, userId) => {
  const role = req.user?.role;
  if (["admin", "staff"].includes(role)) return;

  const isOwner = req.user?._id?.toString() === String(userId);
  if (!isOwner) {
    const err = new Error("Forbidden: you can only access your own records");
    err.status = 403;
    throw err;
  }
};

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    res.status(200).json({ message: "Operation completed", data: result });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Operation failed",
    });
  }
};

exports.getFeeBalance = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.getFeeBalance(userId, req.user?._id);
});

exports.verifyFeeClearance = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.verifyFeeClearance(userId, req.user?._id);
});

exports.processPayment = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.processPayment(userId, req.user?._id, req.body);
});

exports.requestTranscript = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.requestTranscript(userId, req.user?._id, req.body);
});

exports.generateExamCard = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.generateExamCard(userId, req.user?._id);
});

exports.verifyUnitRegistration = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.verifyUnitRegistration(userId, req.user?._id);
});

exports.trackGraduationClearance = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.trackGraduationClearance(userId, req.user?._id);
});

exports.lookupAcademicStatus = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.lookupAcademicStatus(userId, req.user?._id);
});

exports.reportPortalIssue = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.reportPortalIssue(userId, req.user?._id, req.body);
});

exports.automatePasswordReset = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.automatePasswordReset(userId, req.user?._id);
});

exports.trackICTIdCardStatus = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.trackICTIdCardStatus(userId, req.user?._id);
});

exports.getEmailActivationStatus = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.getEmailActivationStatus(userId, req.user?._id);
});

exports.lookupLibraryFineBalance = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.lookupLibraryFineBalance(userId, req.user?._id);
});

exports.lookupBookReturnStatus = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.lookupBookReturnStatus(userId, req.user?._id);
});

exports.approveLibraryClearance = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.approveLibraryClearance(userId, req.user?._id);
});

exports.lookupRoomAllocation = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.lookupRoomAllocation(userId, req.user?._id);
});

exports.verifyHostelPayment = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.verifyHostelPayment(userId, req.user?._id);
});

exports.confirmHostelClearance = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.confirmHostelClearance(userId, req.user?._id);
});

exports.trackSecurityIdCardProduction = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.trackSecurityIdCardProduction(userId, req.user?._id);
});

exports.reportLostCard = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.reportLostCard(userId, req.user?._id, req.body);
});

exports.approveSecurityGraduationClearance = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.approveSecurityGraduationClearance(userId, req.user?._id);
});

exports.getUnifiedStudentProfile = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.getProfile(userId);
});

exports.getOfficeTransactions = handle(async (req) => {
  const userId = readTargetUserId(req);
  ensureAccess(req, userId);
  return officeIntegrationService.getTransactions(userId, req.query.limit);
});

