import { Trophy } from "lucide-react";
import "./donationModule.css";

const LeaderboardSection = ({ leaderboard = [], currentUserName = "" }) => {
  if (!leaderboard.length) {
    return <div className="don-empty">No leaderboard data available yet.</div>;
  }

  return (
    <div className="don-leaderboard">
      <div className="don-leaderboard-header">
        <h3><Trophy size={20} /> Unit Leaderboard</h3>
      </div>
      <div className="don-leaderboard-list">
        {leaderboard.map((entry) => (
          <div
            key={entry.rank}
            className={`don-leaderboard-row ${entry.donorName === currentUserName ? "don-leaderboard-highlight" : ""}`}
          >
            <span className="don-leaderboard-rank">#{entry.rank}</span>
            <div className="don-leaderboard-info">
              <strong>{entry.donorName}{entry.donorName === currentUserName ? " (You)" : ""}</strong>
              <span>{entry.donationCount} donation{entry.donationCount !== 1 ? "s" : ""}</span>
            </div>
            <span className={`don-badge don-badge-${entry.badge.toLowerCase()}`}>{entry.badge}</span>
            <span className="don-leaderboard-amount">Rs {entry.totalDonated.toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardSection;
