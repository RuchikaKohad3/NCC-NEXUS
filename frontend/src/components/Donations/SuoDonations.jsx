import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ShieldCheck } from "lucide-react";
import { fetchPendingDonations, fetchSuoStatus } from "../../store/donationSlice";
import DonationCard from "./DonationCard";
import UtilizationForm from "./UtilizationForm";
import "./donationModule.css";

const SuoDonations = () => {
  const dispatch = useDispatch();
  const { pendingDonations, suoTracked, loading } = useSelector((s) => s.donations);

  const [suoView, setSuoView] = useState("pending");
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    dispatch(fetchPendingDonations());
    dispatch(fetchSuoStatus());
  }, [dispatch]);

  const handleUploadProof = (donation) => {
    setSelectedDonation(donation);
    setSuoView("upload");
  };

  const handleUploadSuccess = () => {
    dispatch(fetchPendingDonations());
    dispatch(fetchSuoStatus());
    setSuoView("pending");
    setSelectedDonation(null);
  };

  return (
    <div className="don-page don-page-embedded">
      <div className="don-page-head">
        <div>
          <h1>Donation Management</h1>
          <p>Upload utilization proof for received donations.</p>
        </div>
      </div>

      {/* Trust Banner */}
      <div className="don-trust-banner">
        <ShieldCheck size={18} />
        Reimbursement is processed only after proof is verified. No direct fund access.
      </div>

      {suoView !== "upload" && (
        <div className="don-subtab-bar">
          <button
            className={suoView === "pending" ? "active" : ""}
            onClick={() => setSuoView("pending")}
          >
            Pending Utilization ({pendingDonations.length})
          </button>
          <button
            className={suoView === "tracked" ? "active" : ""}
            onClick={() => setSuoView("tracked")}
          >
            Tracking ({suoTracked.length})
          </button>
        </div>
      )}

      {loading && <div className="don-empty">Loading...</div>}

      {!loading && suoView === "pending" && (
        pendingDonations.length > 0 ? (
          <div className="don-card-grid">
            {pendingDonations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                role="suo"
                onUploadProof={handleUploadProof}
              />
            ))}
          </div>
        ) : (
          <div className="don-empty">No pending donations requiring utilization proof.</div>
        )
      )}

      {!loading && suoView === "tracked" && (
        suoTracked.length > 0 ? (
          <div className="don-card-grid">
            {suoTracked.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                role="suo"
              />
            ))}
          </div>
        ) : (
          <div className="don-empty">No tracked utilizations yet.</div>
        )
      )}

      {suoView === "upload" && selectedDonation && (
        <UtilizationForm
          donationId={selectedDonation.id}
          donation={selectedDonation}
          onBack={() => { setSuoView("pending"); setSelectedDonation(null); }}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default SuoDonations;
