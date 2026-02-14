import { useState } from "react";
import { uploadDocuments } from "../../services/uploadService";

const UploadDocuments = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!files.length) return alert("Select files first");
    setUploading(true);
    try {
      await uploadDocuments({ files, category: "clearance" });
      setFiles([]);
      alert("Uploaded successfully");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">Upload Documents</h2>

      <input
        type="file"
        className="mt-4 border p-2"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="mt-3 bg-[#182B5C] text-[#D0B216] px-4 py-2 rounded"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default UploadDocuments;
