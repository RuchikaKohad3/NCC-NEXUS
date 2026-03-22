import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ShieldCheck, Award } from "lucide-react";
import {
  fetchUnitNeeds,
  fetchMyDonations,
  fetchLeaderboard,
  fetchRecognition,
} from "../../store/donationSlice";
import NeedCard from "./NeedCard";
import DonationCard from "./DonationCard";
import DonationModal from "./DonationModal";
import DonationDetailPage from "./DonationDetailPage";
import LeaderboardSection from "./LeaderboardSection";
import "./donationModule.css";

const AlumniDonations = ({ profileName = "" }) => {
  const dispatch = useDispatch();
  const { unitNeeds, myDonations, leaderboard, recognition, loading } = useSelector((s) => s.donations);

  const [subTab, setSubTab] = useState("overview");
  const [donationView, setDonationView] = useState("list");
  const [selectedDonationId, setSelectedDonationId] = useState(null);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState(null);

  useEffect(() => {
    dispatch(fetchUnitNeeds());
    dispatch(fetchMyDonations());
    dispatch(fetchLeaderboard());
    dispatch(fetchRecognition());
  }, [dispatch]);

  const handleDonate = (need) => {
    setSelectedNeed(need);
    setShowDonateModal(true);
  };

  const handleDonationSuccess = () => {
    dispatch(fetchMyDonations());
    dispatch(fetchUnitNeeds());
    dispatch(fetchRecognition());
    dispatch(fetchLeaderboard());
  };

  return (
    <div className="don-page don-page-embedded">
      {/* Donate Modal */}
      {showDonateModal && (
        <DonationModal
          need={selectedNeed}
          needs={unitNeeds}
          onClose={() => { setShowDonateModal(false); setSelectedNeed(null); }}
          onSuccess={handleDonationSuccess}
        />
      )}

      <div className="don-page-head">
        <div>
          <h1>Donations</h1>
          <p>Support your NCC unit through the secure reimbursement program.</p>
        </div>
      </div>

      {/* Trust Banner */}
      <div className="don-trust-banner">
        <ShieldCheck size={18} />
        All donations are secured in escrow. Funds are released only after verified utilization.
      </div>

      {/* Recognition Card */}
      {recognition && (
        <div className="don-recognition-card">
          <div className="don-recognition-stat">
            <span className="don-recognition-stat-value">Rs {recognition.totalDonated?.toLocaleString("en-IN")}</span>
            <span className="don-recognition-stat-label">Total Donated</span>
          </div>
          <div className="don-recognition-divider" />
          <div className="don-recognition-stat">
            <span className="don-recognition-stat-value">{recognition.donationCount}</span>
            <span className="don-recognition-stat-label">Donations</span>
          </div>
          <div className="don-recognition-divider" />
          <span className={`don-badge don-badge-${recognition.badge?.toLowerCase()}`}>
            <Award size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
            {recognition.badge}
          </span>
          <div className="don-recognition-divider" />
          <div className="don-recognition-stat">
            <span className="don-recognition-stat-value">#{recognition.rank}</span>
            <span className="don-recognition-stat-label">Unit Rank</span>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="don-subtab-bar">
        <button className={subTab === "overview" ? "active" : ""} onClick={() => setSubTab("overview")}>
          Unit Needs
        </button>
        <button
          className={subTab === "my-donations" ? "active" : ""}
          onClick={() => { setSubTab("my-donations"); setDonationView("list"); setSelectedDonationId(null); }}
        >
          My Donations
        </button>
        <button className={subTab === "leaderboard" ? "active" : ""} onClick={() => setSubTab("leaderboard")}>
          Leaderboard
        </button>
      </div>

      {/* Content */}
      {loading && <div className="don-empty">Loading...</div>}

      {!loading && subTab === "overview" && (
        unitNeeds.length > 0 ? (
          <div className="don-card-grid">
            {unitNeeds.map((need) => (
              <NeedCard key={need.id} need={need} onDonate={handleDonate} />
            ))}
          </div>
        ) : (
          <div className="don-empty">No active needs at the moment.</div>
        )
      )}

      {!loading && subTab === "my-donations" && donationView === "list" && (
        myDonations.length > 0 ? (
          <div className="don-card-grid">
            {myDonations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                role="alumni"
                onViewDetail={(id) => { setSelectedDonationId(id); setDonationView("detail"); }}
              />
            ))}
          </div>
        ) : (
          <div className="don-empty">You haven't made any donations yet. Support your unit!</div>
        )
      )}

      {!loading && subTab === "my-donations" && donationView === "detail" && selectedDonationId && (
        <DonationDetailPage
          donationId={selectedDonationId}
          onBack={() => { setDonationView("list"); setSelectedDonationId(null); }}
        />
      )}

      {!loading && subTab === "leaderboard" && (
        <LeaderboardSection leaderboard={leaderboard} currentUserName={profileName} />
      )}
    </div>
  );
};

export default AlumniDonations;
