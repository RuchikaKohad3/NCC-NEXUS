import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { ArrowLeft, Upload, X, FileText, Image, CheckCircle } from "lucide-react";
import { uploadUtilization } from "../../store/donationSlice";
import "./donationModule.css";

const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_DOCS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const UtilizationForm = ({ donationId, donation, onBack, onSuccess }) => {
  const dispatch = useDispatch();
  const imgInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [form, setForm] = useState({ title: "", description: "" });
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imgDragOver, setImgDragOver] = useState(false);
  const [docDragOver, setDocDragOver] = useState(false);

  const isValid = form.title.trim() && form.description.trim() && (images.length > 0 || documents.length > 0);

  const handleImageAdd = (fileList) => {
    const files = Array.from(fileList).filter((f) => ACCEPTED_IMAGES.includes(f.type));
    setImages((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const handleDocAdd = (fileList) => {
    const files = Array.from(fileList).filter((f) => ACCEPTED_DOCS.includes(f.type));
    setDocuments((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDoc = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await dispatch(uploadUtilization({
        donationId,
        payload: { title: form.title, description: form.description },
        files: { images, documents },
      })).unwrap();
      setShowSuccess(true);
    } catch {
      // handled by slice
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="don-page don-page-embedded">
        <div className="don-modal-success" style={{ padding: "60px 20px" }}>
          <div className="don-modal-success-icon">
            <CheckCircle size={32} />
          </div>
          <h2>Proof Submitted Successfully</h2>
          <p>Your utilization proof for <strong>{donation?.needTitle}</strong> has been submitted for verification.</p>
          <p style={{ fontSize: 12, color: "var(--don-text-muted)" }}>
            Status: Under Verification — No edits can be made after submission.
          </p>
          <button className="don-btn don-btn-primary" onClick={onSuccess}>
            Back to Donations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="don-page don-page-embedded">
      <div className="don-page-head">
        <div>
          <h1>Upload Utilization Proof</h1>
          <p>Provide evidence of how donation funds were utilized.</p>
        </div>
      </div>

      <button className="don-detail-back" onClick={onBack} type="button" style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Section 1: Donation Info */}
      <div className="don-create-card">
        <div className="don-create-card-header">
          <span className="don-step-badge">1</span>
          <h3>Donation Details</h3>
        </div>
        <div className="don-detail-meta">
          {donation?.donorName && (
            <span className="don-detail-meta-item">Donor: <strong>{donation.donorName}</strong></span>
          )}
          <span className="don-detail-meta-item">Amount: <strong>Rs {donation?.amount?.toLocaleString("en-IN")}</strong></span>
          <span className="don-detail-meta-item">For: <strong>{donation?.needTitle}</strong></span>
        </div>
      </div>

      {/* Section 2: Evidence */}
      <div className="don-create-card">
        <div className="don-create-card-header">
          <span className="don-step-badge">2</span>
          <h3>Utilization Evidence</h3>
        </div>

        <div className="don-create-fields">
          <label className="don-form-field don-form-field-full">
            <span>What was purchased</span>
            <input
              type="text"
              placeholder="e.g. 10 NCC Uniforms"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </label>

          <label className="don-form-field don-form-field-full">
            <span>Description</span>
            <textarea
              rows={4}
              placeholder="Describe how the funds were used, vendor details, quantities..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
        </div>

        {/* Image Upload */}
        <div className="don-upload-zone">
          <span className="don-upload-zone-label">Upload Images (Bills/Receipts)</span>
          <div
            className={`don-upload-area ${imgDragOver ? "don-upload-dragover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
            onDragLeave={() => setImgDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setImgDragOver(false); handleImageAdd(e.dataTransfer.files); }}
            onClick={() => imgInputRef.current?.click()}
          >
            <input
              ref={imgInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleImageAdd(e.target.files)}
              style={{ display: "none" }}
            />
            <div className="don-upload-icon"><Image size={24} /></div>
            <div className="don-upload-text"><strong>Click to upload</strong> or drag and drop</div>
            <div className="don-upload-hint">JPG, PNG, WEBP</div>
          </div>
          {imagePreviews.length > 0 && (
            <div className="don-upload-previews">
              {imagePreviews.map((src, i) => (
                <div key={i} className="don-upload-preview">
                  <img src={src} alt={`Preview ${i + 1}`} />
                  <button className="don-upload-preview-remove" onClick={() => removeImage(i)} type="button">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Upload */}
        <div className="don-upload-zone">
          <span className="don-upload-zone-label">Upload Documents (PDF, DOC)</span>
          <div
            className={`don-upload-area ${docDragOver ? "don-upload-dragover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDocDragOver(true); }}
            onDragLeave={() => setDocDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDocDragOver(false); handleDocAdd(e.dataTransfer.files); }}
            onClick={() => docInputRef.current?.click()}
          >
            <input
              ref={docInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleDocAdd(e.target.files)}
              style={{ display: "none" }}
            />
            <div className="don-upload-icon"><Upload size={24} /></div>
            <div className="don-upload-text"><strong>Click to upload</strong> or drag and drop</div>
            <div className="don-upload-hint">PDF, DOC, DOCX</div>
          </div>
          {documents.length > 0 && (
            <div className="don-upload-file-list">
              {documents.map((file, i) => (
                <span key={i} className="don-upload-file-chip">
                  <FileText size={12} /> {file.name}
                  <button onClick={() => removeDoc(i)} type="button"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="don-create-submit">
        <button className="don-btn don-btn-secondary" onClick={onBack} type="button">
          Cancel
        </button>
        <button
          className="don-btn don-btn-primary"
          disabled={!isValid || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : "Submit for Verification"}
        </button>
      </div>
    </div>
  );
};

export default UtilizationForm;
