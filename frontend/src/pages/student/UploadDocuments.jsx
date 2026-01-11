const UploadDocuments = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">Upload Documents</h2>

      <input
        type="file"
        className="mt-4 border p-2"
      />

      <button className="mt-3 bg-[#182B5C] text-[#D0B216] px-4 py-2 rounded">
        Upload
      </button>
    </div>
  );
};

export default UploadDocuments;
