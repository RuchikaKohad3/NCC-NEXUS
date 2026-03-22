import { CalendarDays, Upload } from "lucide-react";
import "./donationModule.css";

const STATUS_MAP = {
  AWAITING_UTILIZATION: { label: "Awaiting Utilization", className: "don-status-awaiting" },
  PROOF_UPLOADED: { label: "Proof Uploaded", className: "don-status-proof-uploaded" },
  UNDER_VERIFICATION: { label: "Under Verification", className: "don-status-under-verification" },
  VERIFIED: { label: "Verified", className: "don-status-verified" },
  COMPLETED: { label: "Completed", className: "don-status-completed" },
  REIMBURSEMENT_APPROVED: { label: "Reimbursement Approved", className: "don-status-reimbursement-approved" },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
};

const DonationCard = ({ donation, role = "alumni", onViewDetail, onUploadProof }) => {
  const statusInfo = STATUS_MAP[donation.status] || { label: donation.status, className: "" };

  return (
    <article className="don-card">
      <div className="don-card-head">
        <div>
          <h3>{donation.needTitle}</h3>
          <span className="don-amount-chip">Rs {donation.amount?.toLocaleString("en-IN")}</span>
        </div>
        <span className={`don-status-badge ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      {role === "suo" && donation.donorName && (
        <p className="don-card-donor">Donor: {donation.donorName}</p>
      )}

      {donation.message && (
        <p className="don-card-message">&ldquo;{donation.message}&rdquo;</p>
      )}

      <div className="don-card-meta">
        <span><CalendarDays size={14} /> {formatDate(donation.createdAt)}</span>
        {donation.unitName && <span>{donation.unitName}</span>}
      </div>

      <div className="don-card-actions">
        {onViewDetail && (
          <button className="don-btn don-btn-secondary" onClick={() => onViewDetail(donation.id)}>
            Details
          </button>
        )}
        {role === "suo" && donation.status === "AWAITING_UTILIZATION" && onUploadProof && (
          <button className="don-btn don-btn-primary" onClick={() => onUploadProof(donation)}>
            <Upload size={14} /> Upload Proof
          </button>
        )}
      </div>
    </article>
  );
};

export default DonationCard;
