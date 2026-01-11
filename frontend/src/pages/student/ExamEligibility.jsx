const ExamEligibility = () => {
  const eligible = false;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">Exam Eligibility</h2>

      <div className="mt-4 p-4 rounded bg-white shadow">
        Status:{" "}
        <strong style={{ color: eligible ? "green" : "red" }}>
          {eligible ? "Eligible" : "Not Eligible"}
        </strong>
      </div>

      {!eligible && (
        <p className="mt-2 text-sm text-gray-500">
          Clear fees and library dues to qualify.
        </p>
      )}
    </div>
  );
};

export default ExamEligibility;
