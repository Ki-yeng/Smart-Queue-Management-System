const ClearanceRequest = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">Request Clearance</h2>

      <button className="mt-4 bg-[#D0B216] text-[#182B5C] px-4 py-2 rounded">
        Submit Clearance Request
      </button>

      <p className="mt-2 text-sm text-gray-500">
        Clearance will be processed by all departments.
      </p>
    </div>
  );
};

export default ClearanceRequest;
