// backend/src/utils/clearanceStore.js
// In-memory clearance store to keep mock data consistent across routes.

const clearanceStore = {
  "6948009e873645fc85d47db6": {
    finance: {
      status: "PENDING",
      message: "Outstanding fee balance detected",
    },
    academics: {
      status: "REGISTERED",
      message: "All required units registered",
    },
    examinations: {
      status: "BLOCKED",
      message: "Exam access blocked due to pending fees",
    },
    library: {
      status: "CLEARED",
      message: "No pending library books",
    },
  },
};

const getClearance = (userId) => {
  return clearanceStore[userId] || null;
};

const setClearance = (userId, clearance) => {
  clearanceStore[userId] = clearance;
  return clearanceStore[userId];
};

const ensureClearance = (userId) => {
  if (!clearanceStore[userId]) {
    clearanceStore[userId] = {
      finance: { status: "", message: "" },
      academics: { status: "", message: "" },
      examinations: { status: "", message: "" },
      library: { status: "", message: "" },
    };
  }
  return clearanceStore[userId];
};

const updateClearance = (userId, patch) => {
  const current = ensureClearance(userId);
  clearanceStore[userId] = {
    ...current,
    ...patch,
  };
  return clearanceStore[userId];
};

module.exports = {
  clearanceStore,
  getClearance,
  setClearance,
  ensureClearance,
  updateClearance,
};
