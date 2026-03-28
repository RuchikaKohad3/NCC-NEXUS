import { CheckCircle } from "lucide-react";
import "./donationModule.css";

const DEFAULT_TIMELINE = [
  { step: 1, label: "Donation Created", status: "pending", date: null },
  { step: 2, label: "Payment Verified", status: "pending", date: null },
  { step: 3, label: "Recorded in Donation History", status: "pending", date: null },
  { step: 4, label: "Campaign Total Updated", status: "pending", date: null },
  { step: 5, label: "Unit Notified", status: "pending", date: null },
];

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
};

const DonationTimeline = ({ timeline }) => {
  const steps = timeline && timeline.length ? timeline : DEFAULT_TIMELINE;

  return (
    <div className="don-timeline">
      {steps.map((item) => (
        <div
          key={item.step}
          className={`don-timeline-step don-timeline-${item.status}`}
        >
          <div className="don-timeline-indicator">
            {item.status === "completed" ? (
              <CheckCircle size={18} />
            ) : (
              <span>{item.step}</span>
            )}
          </div>
          <div className="don-timeline-content">
            <span className="don-timeline-label">{item.label}</span>
            {formatDate(item.date) && (
              <span className="don-timeline-date">{formatDate(item.date)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DonationTimeline;
