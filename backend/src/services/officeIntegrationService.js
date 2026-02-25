const mongoose = require("mongoose");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const OfficeTransaction = require("../models/OfficeTransaction");

const OFFICE_ENDPOINTS = {
  finance: process.env.FINANCE_TX_API_URL || "",
  registry: process.env.REGISTRY_TX_API_URL || "",
  ict: process.env.ICT_TX_API_URL || "",
  library: process.env.LIBRARY_TX_API_URL || "",
  hostel: process.env.HOSTEL_TX_API_URL || "",
  security: process.env.SECURITY_TX_API_URL || "",
};

const makeTrackingId = (office, operation) =>
  `${office.toUpperCase()}-${operation.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const ensureUserExists = async (userId) => {
  const user = await User.findById(userId).select("_id");
  if (!user) {
    const error = new Error("Target user not found");
    error.status = 404;
    throw error;
  }
};

const getOrCreateProfile = async (userId, session) => {
  let profile = await StudentProfile.findOne({ userId }).session(session);
  if (!profile) {
    const created = await StudentProfile.create([{ userId }], { session });
    profile = created[0];
  }
  return profile;
};

const asJson = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { raw: text };
  }
};

const callExternalSystem = async ({ office, path, method = "POST", payload = {}, mockFactory }) => {
  const baseUrl = OFFICE_ENDPOINTS[office];
  if (!baseUrl || typeof fetch !== "function") {
    return {
      source: "mock",
      ...mockFactory(),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await asJson(response);
    if (!response.ok) {
      const message = data?.message || `External ${office} service request failed`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return { source: "external", ...data };
  } finally {
    clearTimeout(timeout);
  }
};

const updatePending = (profile, trackingId, office, operation, status) => {
  const index = profile.pendingRequests.findIndex((r) => r.trackingId === trackingId);
  if (status === "processing" && index === -1) {
    profile.pendingRequests.push({
      trackingId,
      office,
      operation,
      status: "processing",
      createdAt: new Date(),
    });
    return;
  }

  if (index !== -1) {
    profile.pendingRequests.splice(index, 1);
  }
};

const updateSection = (section, status, note) => {
  section.status = status;
  section.note = note;
  section.lastUpdatedAt = new Date();
};

const executeTransactionalOperation = async ({
  office,
  operation,
  userId,
  actorId,
  payload = {},
  externalPath,
  method = "POST",
  mockFactory,
  onApply,
}) => {
  await ensureUserExists(userId);

  const trackingId = makeTrackingId(office, operation);
  const tx = await OfficeTransaction.create({
    trackingId,
    office,
    operation,
    userId,
    actorId: actorId || null,
    status: "initiated",
    requestPayload: payload,
  });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    tx.status = "processing";
    await tx.save({ session });

    const profile = await getOrCreateProfile(userId, session);
    updatePending(profile, trackingId, office, operation, "processing");

    const externalResult = await callExternalSystem({
      office,
      path: externalPath,
      method,
      payload: { userId, trackingId, ...payload },
      mockFactory,
    });

    onApply(profile, externalResult, payload, trackingId);
    updatePending(profile, trackingId, office, operation, "completed");
    profile.historicalServiceRecords.unshift(
      `[${new Date().toISOString()}] ${office}:${operation} -> success (${trackingId})`
    );
    profile.historicalServiceRecords = profile.historicalServiceRecords.slice(0, 200);

    tx.status = "success";
    tx.responsePayload = externalResult;
    tx.completedAt = new Date();

    await profile.save({ session });
    await tx.save({ session });
    await session.commitTransaction();

    return { trackingId, transactionStatus: "success", result: externalResult };
  } catch (error) {
    await session.abortTransaction();
    await OfficeTransaction.findByIdAndUpdate(tx._id, {
      status: "failed",
      errorMessage: error.message || "Operation failed",
      completedAt: new Date(),
    });
    throw error;
  } finally {
    session.endSession();
  }
};

const officeIntegrationService = {
  async getFeeBalance(userId, actorId) {
    return executeTransactionalOperation({
      office: "finance",
      operation: "fee_balance_lookup",
      userId,
      actorId,
      externalPath: "/fees/balance",
      mockFactory: () => ({
        feeBalance: 12450,
        currency: "KES",
        clearanceEligible: false,
      }),
      onApply: (profile, result) => {
        const status = result.feeBalance > 0 ? "pending" : "cleared";
        updateSection(profile.feeStatus, status, `Outstanding fee balance: KES ${result.feeBalance}`);
      },
    });
  },

  async verifyFeeClearance(userId, actorId) {
    return executeTransactionalOperation({
      office: "finance",
      operation: "fee_clearance_verification",
      userId,
      actorId,
      externalPath: "/fees/clearance/verify",
      mockFactory: () => ({
        cleared: Math.random() > 0.5,
      }),
      onApply: (profile, result) => {
        const status = result.cleared ? "cleared" : "pending";
        updateSection(profile.feeStatus, status, result.cleared ? "Finance clearance verified" : "Finance clearance not met");
        updateSection(profile.clearanceStatus, status, result.cleared ? "Finance dependency satisfied" : "Pending finance clearance");
      },
    });
  },

  async processPayment(userId, actorId, payload) {
    const { amount, method = "mpesa", accountReference = "" } = payload || {};
    if (!amount || Number(amount) <= 0) {
      const err = new Error("Valid payment amount is required");
      err.status = 400;
      throw err;
    }

    return executeTransactionalOperation({
      office: "finance",
      operation: "payment_processing",
      userId,
      actorId,
      payload: { amount: Number(amount), method, accountReference },
      externalPath: "/payments/collect",
      mockFactory: () => ({
        paymentStatus: "confirmed",
        providerReference: `PAY-${Date.now()}`,
        receiptNumber: `RCPT-${Date.now()}`,
      }),
      onApply: (profile, result, input) => {
        updateSection(
          profile.feeStatus,
          "cleared",
          `Payment ${result.paymentStatus}. Amount KES ${input.amount}. Receipt ${result.receiptNumber}`
        );
        updateSection(profile.clearanceStatus, "cleared", "Finance payment confirmed and linked to profile");
      },
    });
  },

  async requestTranscript(userId, actorId, payload) {
    return executeTransactionalOperation({
      office: "registry",
      operation: "transcript_request",
      userId,
      actorId,
      payload,
      externalPath: "/transcripts/requests",
      mockFactory: () => ({
        status: "queued",
        transcriptRequestId: `TR-${Date.now()}`,
      }),
      onApply: (profile, result) => {
        updateSection(profile.academicStatus, "processing", `Transcript request queued: ${result.transcriptRequestId}`);
      },
    });
  },

  async generateExamCard(userId, actorId) {
    return executeTransactionalOperation({
      office: "registry",
      operation: "exam_card_generation",
      userId,
      actorId,
      externalPath: "/exam-cards/generate",
      mockFactory: () => ({
        generated: true,
        examCardUrl: `/mock/exam-card/${userId}`,
      }),
      onApply: (profile, result) => {
        const note = result.generated ? `Exam card generated: ${result.examCardUrl}` : "Exam card generation failed";
        updateSection(profile.academicStatus, result.generated ? "cleared" : "pending", note);
      },
    });
  },

  async verifyUnitRegistration(userId, actorId) {
    return executeTransactionalOperation({
      office: "registry",
      operation: "unit_registration_verification",
      userId,
      actorId,
      externalPath: "/units/registration/verify",
      mockFactory: () => ({
        verified: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.academicStatus, result.verified ? "cleared" : "pending", result.verified ? "Unit registration verified" : "Unit registration incomplete");
      },
    });
  },

  async trackGraduationClearance(userId, actorId) {
    return executeTransactionalOperation({
      office: "registry",
      operation: "graduation_clearance_tracking",
      userId,
      actorId,
      externalPath: "/graduation/clearance/status",
      method: "GET",
      mockFactory: () => ({
        graduationStatus: "in_progress",
      }),
      onApply: (profile, result) => {
        updateSection(profile.clearanceStatus, result.graduationStatus === "approved" ? "cleared" : "processing", `Graduation clearance status: ${result.graduationStatus}`);
      },
    });
  },

  async lookupAcademicStatus(userId, actorId) {
    return executeTransactionalOperation({
      office: "registry",
      operation: "academic_status_lookup",
      userId,
      actorId,
      externalPath: "/students/academic-status",
      method: "GET",
      mockFactory: () => ({
        status: "good_standing",
      }),
      onApply: (profile, result) => {
        updateSection(profile.academicStatus, "cleared", `Academic status: ${result.status}`);
      },
    });
  },

  async reportPortalIssue(userId, actorId, payload) {
    return executeTransactionalOperation({
      office: "ict",
      operation: "portal_issue_reporting",
      userId,
      actorId,
      payload,
      externalPath: "/support/portal-issues",
      mockFactory: () => ({
        ticketId: `ICT-${Date.now()}`,
        status: "opened",
      }),
      onApply: (profile, result) => {
        updateSection(profile.academicStatus, "processing", `ICT ticket ${result.ticketId} opened for portal issue`);
      },
    });
  },

  async automatePasswordReset(userId, actorId) {
    return executeTransactionalOperation({
      office: "ict",
      operation: "password_reset_automation",
      userId,
      actorId,
      externalPath: "/support/password-reset",
      mockFactory: () => ({
        resetStatus: "completed",
      }),
      onApply: (profile, result) => {
        updateSection(profile.academicStatus, "cleared", `Password reset status: ${result.resetStatus}`);
      },
    });
  },

  async trackICTIdCardStatus(userId, actorId) {
    return executeTransactionalOperation({
      office: "ict",
      operation: "ict_id_card_tracking",
      userId,
      actorId,
      externalPath: "/id-cards/status",
      method: "GET",
      mockFactory: () => ({
        idCardStatus: "processing",
      }),
      onApply: (profile, result) => {
        updateSection(profile.securityStatus, "processing", `ICT ID card status: ${result.idCardStatus}`);
      },
    });
  },

  async getEmailActivationStatus(userId, actorId) {
    return executeTransactionalOperation({
      office: "ict",
      operation: "email_activation_status",
      userId,
      actorId,
      externalPath: "/email/activation-status",
      method: "GET",
      mockFactory: () => ({
        activated: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.academicStatus, "cleared", result.activated ? "Student email active" : "Student email not active");
      },
    });
  },

  async lookupLibraryFineBalance(userId, actorId) {
    return executeTransactionalOperation({
      office: "library",
      operation: "fine_balance_lookup",
      userId,
      actorId,
      externalPath: "/fines/balance",
      method: "GET",
      mockFactory: () => ({
        fineBalance: 0,
      }),
      onApply: (profile, result) => {
        updateSection(profile.libraryStatus, result.fineBalance > 0 ? "pending" : "cleared", `Library fine balance: KES ${result.fineBalance}`);
      },
    });
  },

  async lookupBookReturnStatus(userId, actorId) {
    return executeTransactionalOperation({
      office: "library",
      operation: "book_return_status",
      userId,
      actorId,
      externalPath: "/books/return-status",
      method: "GET",
      mockFactory: () => ({
        allReturned: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.libraryStatus, result.allReturned ? "cleared" : "pending", result.allReturned ? "All library books returned" : "Pending book returns");
      },
    });
  },

  async approveLibraryClearance(userId, actorId) {
    return executeTransactionalOperation({
      office: "library",
      operation: "library_clearance_approval",
      userId,
      actorId,
      externalPath: "/clearance/approve",
      mockFactory: () => ({
        approved: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.libraryStatus, result.approved ? "cleared" : "pending", result.approved ? "Library clearance approved" : "Library clearance denied");
      },
    });
  },

  async lookupRoomAllocation(userId, actorId) {
    return executeTransactionalOperation({
      office: "hostel",
      operation: "room_allocation_status",
      userId,
      actorId,
      externalPath: "/rooms/allocation",
      method: "GET",
      mockFactory: () => ({
        roomNumber: "B3-214",
        allocated: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.hostelStatus, result.allocated ? "cleared" : "pending", result.allocated ? `Room allocated: ${result.roomNumber}` : "No room allocation yet");
      },
    });
  },

  async verifyHostelPayment(userId, actorId) {
    return executeTransactionalOperation({
      office: "hostel",
      operation: "hostel_payment_verification",
      userId,
      actorId,
      externalPath: "/payments/verify",
      method: "GET",
      mockFactory: () => ({
        verified: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.hostelStatus, result.verified ? "cleared" : "pending", result.verified ? "Hostel payment verified" : "Hostel payment pending");
      },
    });
  },

  async confirmHostelClearance(userId, actorId) {
    return executeTransactionalOperation({
      office: "hostel",
      operation: "hostel_clearance_confirmation",
      userId,
      actorId,
      externalPath: "/clearance/confirm",
      mockFactory: () => ({
        confirmed: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.hostelStatus, result.confirmed ? "cleared" : "pending", result.confirmed ? "Hostel clearance confirmed" : "Hostel clearance not confirmed");
      },
    });
  },

  async trackSecurityIdCardProduction(userId, actorId) {
    return executeTransactionalOperation({
      office: "security",
      operation: "id_card_production_tracking",
      userId,
      actorId,
      externalPath: "/id-cards/production-status",
      method: "GET",
      mockFactory: () => ({
        status: "printing",
      }),
      onApply: (profile, result) => {
        updateSection(profile.securityStatus, "processing", `Security ID card production: ${result.status}`);
      },
    });
  },

  async reportLostCard(userId, actorId, payload) {
    return executeTransactionalOperation({
      office: "security",
      operation: "lost_card_reporting",
      userId,
      actorId,
      payload,
      externalPath: "/id-cards/lost",
      mockFactory: () => ({
        reportId: `LOSS-${Date.now()}`,
        status: "filed",
      }),
      onApply: (profile, result) => {
        updateSection(profile.securityStatus, "processing", `Lost card report filed: ${result.reportId}`);
      },
    });
  },

  async approveSecurityGraduationClearance(userId, actorId) {
    return executeTransactionalOperation({
      office: "security",
      operation: "graduation_clearance_approval",
      userId,
      actorId,
      externalPath: "/graduation/clearance/approve",
      mockFactory: () => ({
        approved: true,
      }),
      onApply: (profile, result) => {
        updateSection(profile.securityStatus, result.approved ? "cleared" : "pending", result.approved ? "Security graduation clearance approved" : "Security clearance pending");
      },
    });
  },

  async getProfile(userId) {
    await ensureUserExists(userId);
    const profile = await StudentProfile.findOne({ userId }).lean();
    return profile || null;
  },

  async getTransactions(userId, limit = 50) {
    await ensureUserExists(userId);
    return OfficeTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
      .lean();
  },
};

module.exports = officeIntegrationService;

