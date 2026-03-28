import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, AlertTriangle, X, CheckCircle, FileText, Image, Clock } from "lucide-react";
import { fetchDonationById, reportDonationIssue, clearCurrentDonation } from "../../store/donationSlice";
import DonationTimeline from "./DonationTimeline";
import "./donationModule.css";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
};

const DonationDetailPage = ({ donationId, onBack, openReportOnLoad = false }) => {
  const dispatch = useDispatch();
  const donation = useSelector((state) => state.donations.currentDonation);
  const loading = useSelector((state) => state.donations.loading);

  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    if (donationId) dispatch(fetchDonationById(donationId));
    return () => { dispatch(clearCurrentDonation()); };
  }, [donationId, dispatch]);

  useEffect(() => {
    if (openReportOnLoad && donation) {
      setShowReport(true);
    }
  }, [openReportOnLoad, donation]);

  const handleReport = async () => {
    if (!reportText.trim()) return;
    await dispatch(reportDonationIssue({ donationId, issueText: reportText }));
    setReportSubmitted(true);
  };

  if (loading || !donation) {
    return <div className="don-empty">Loading donation details...</div>;
  }

  return (
    <div className="don-page don-page-embedded">
      <div className="don-detail-header">
        <button className="don-detail-back" onClick={onBack} type="button">
          <ArrowLeft size={16} /> Back to Donations
        </button>
        <span className={`don-status-badge ${getStatusClass(donation.status)}`}>
          {getStatusLabel(donation.status)}
        </span>
      </div>

      <div className="don-detail-card">
        <h2>{donation.needTitle}</h2>
        <div className="don-detail-meta">
          <span className="don-detail-meta-item">
            <strong>Rs {donation.amount?.toLocaleString("en-IN")}</strong>
          </span>
          <span className="don-detail-meta-item">{formatDate(donation.createdAt)}</span>
          <span className="don-detail-meta-item">{donation.paymentMethod}</span>
          {donation.unitName && (
            <span className="don-detail-meta-item">{donation.unitName}</span>
          )}
        </div>
        {donation.message && (
          <p className="don-detail-message">&ldquo;{donation.message}&rdquo;</p>
        )}
      </div>

      {/* Timeline */}
      <div className="don-create-card">
        <div className="don-create-card-header">
          <span className="don-step-badge"><Clock size={16} /></span>
          <h3>Donation Timeline</h3>
        </div>
        <DonationTimeline timeline={donation.timeline} />
      </div>

      {/* Utilization Proof */}
      {donation.utilizationProof && (
        <div className="don-create-card">
          <div className="don-create-card-header">
            <span className="don-step-badge"><FileText size={16} /></span>
            <h3>Utilization Proof</h3>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: "var(--don-navy)" }}>
            {donation.utilizationProof.title}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--don-text-secondary)", lineHeight: 1.55 }}>
            {donation.utilizationProof.description}
          </p>
          {donation.utilizationProof.images?.length > 0 && (
            <div className="don-proof-images">
              {donation.utilizationProof.images.map((img, i) => (
                <div key={i} className="don-proof-image">
                  <img src={img} alt={`Proof ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
          {donation.utilizationProof.documents?.length > 0 && (
            <div className="don-proof-docs">
              {donation.utilizationProof.documents.map((doc, i) => (
                <span key={i} className="don-upload-file-chip">
                  <FileText size={12} /> {doc.name || `Document ${i + 1}`}
                </span>
              ))}
            </div>
          )}
          {!donation.utilizationProof.images?.length && !donation.utilizationProof.documents?.length && (
            <p style={{ fontSize: 13, color: "var(--don-text-muted)", fontStyle: "italic" }}>
              <Image size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Proof files will appear here once uploaded.
            </p>
          )}
        </div>
      )}

      {/* Report Issue */}
      <div style={{ marginTop: 8 }}>
        <button className="don-btn don-btn-danger" onClick={() => setShowReport(true)} type="button">
          <AlertTriangle size={14} /> Report Issue
        </button>
      </div>

      {/* Report Modal */}
      {showReport && (
        <div className="don-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="don-modal" onClick={(e) => e.stopPropagation()}>
            <button className="don-modal-close" onClick={() => setShowReport(false)} type="button">
              <X size={16} />
            </button>

            {reportSubmitted ? (
              <div className="don-modal-success">
                <div className="don-modal-success-icon">
                  <CheckCircle size={32} />
                </div>
                <h2>Report Submitted</h2>
                <p>Your concern has been recorded. We will investigate and respond.</p>
                <button className="don-btn don-btn-primary" onClick={() => setShowReport(false)}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2>Report an Issue</h2>
                <p style={{ fontSize: 13.5, color: "var(--don-text-muted)", margin: "0 0 16px" }}>
                  Describe the problem with this donation or utilization.
                </p>
                <div className="don-report-form">
                  <textarea
                    placeholder="Describe the issue in detail..."
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                  />
                </div>
                <div className="don-modal-actions">
                  <button className="don-btn don-btn-secondary" onClick={() => setShowReport(false)} type="button">
                    Cancel
                  </button>
                  <button
                    className="don-btn don-btn-danger"
                    disabled={!reportText.trim()}
                    onClick={handleReport}
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Status Helpers ── */
const STATUS_MAP = {
  AWAITING_PAYMENT: { label: "Awaiting Payment", className: "don-status-awaiting" },
  AWAITING_UTILIZATION: { label: "Awaiting Utilization", className: "don-status-awaiting" },
  PROOF_UPLOADED: { label: "Proof Uploaded", className: "don-status-proof-uploaded" },
  UNDER_VERIFICATION: { label: "Under Verification", className: "don-status-under-verification" },
  VERIFIED: { label: "Verified", className: "don-status-verified" },
  COMPLETED: { label: "Completed", className: "don-status-completed" },
};

const getStatusLabel = (status) => STATUS_MAP[status]?.label || status;
const getStatusClass = (status) => STATUS_MAP[status]?.className || "";

export default DonationDetailPage;
