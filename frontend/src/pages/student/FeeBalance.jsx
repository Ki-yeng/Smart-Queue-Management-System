const FeeBalance = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">Fee Balance</h2>
      <p>Your current fee balance is:</p>

      <div className="mt-4 p-4 bg-white rounded shadow">
        <strong>KES 25,000</strong>
      </div>

      <p className="text-sm mt-2 text-gray-500">
        Contact Finance Office for payment confirmation.
      </p>
    </div>
  );
};

export default FeeBalance;
