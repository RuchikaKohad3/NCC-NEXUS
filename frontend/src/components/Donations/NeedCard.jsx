import { Heart } from "lucide-react";
import "./donationModule.css";

const NeedCard = ({ need, onDonate }) => {
  const hasTarget = need.targetAmount > 0;
  const percentage = hasTarget
    ? Math.min(100, Math.round((need.raisedAmount / need.targetAmount) * 100))
    : 0;

  const isFulfilled = need.status === "fulfilled";

  return (
    <article className="don-need-card">
      <div className="don-need-card-head">
        <div>
          <h3>{need.title}</h3>
          <span className="don-category-chip">{need.category}</span>
        </div>
        <span className={`don-status-badge ${isFulfilled ? "don-status-fulfilled" : "don-status-active"}`}>
          {isFulfilled ? "Fulfilled" : "Active"}
        </span>
      </div>

      <p className="don-need-description">{need.description}</p>

      <div className="don-progress-section">
        {hasTarget && (
          <div className="don-progress-bar">
            <div className="don-progress-fill" style={{ width: `${percentage}%` }} />
          </div>
        )}
        <div className="don-progress-meta">
          <span className="don-progress-raised">Rs {need.raisedAmount.toLocaleString("en-IN")} raised</span>
          <span>{hasTarget ? `Goal Rs ${need.targetAmount.toLocaleString("en-IN")}` : "Open goal"}</span>
        </div>
      </div>

      {!isFulfilled && (
        <button
          className="don-btn don-btn-primary"
          onClick={() => onDonate(need)}
        >
          <Heart size={15} />
          Donate
        </button>
      )}
    </article>
  );
};

export default NeedCard;
