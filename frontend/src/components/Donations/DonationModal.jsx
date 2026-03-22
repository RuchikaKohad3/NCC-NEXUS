import { useState } from "react";
import { useDispatch } from "react-redux";
import { X, CheckCircle, ShieldCheck } from "lucide-react";
import { createDonation } from "../../store/donationSlice";
import "./donationModule.css";

const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Card", "Net Banking"];

const DonationModal = ({ need, needs = [], onClose, onSuccess }) => {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    needId: need?.id || "",
    needTitle: need?.title || "",
    amount: "",
    paymentMethod: "UPI",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [donationResult, setDonationResult] = useState(null);

  const selectedNeed = need || needs.find((n) => n.id === form.needId);
  const remaining = selectedNeed ? selectedNeed.targetAmount - selectedNeed.raisedAmount : 0;
  const isValid = form.needId && form.amount && Number(form.amount) > 0;

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "needId") {
        const n = needs.find((x) => x.id === value);
        updated.needTitle = n?.title || "";
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const result = await dispatch(createDonation({
        needId: form.needId,
        needTitle: form.needTitle,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        message: form.message,
        unitName: "XYZ Engineering College NCC",
      })).unwrap();
      setDonationResult(result);
      setShowSuccess(true);
    } catch {
      // error handled by slice
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="don-modal-overlay" onClick={onClose}>
      <div className="don-modal" onClick={(e) => e.stopPropagation()}>
        <button className="don-modal-close" onClick={onClose} type="button">
          <X size={16} />
        </button>

        {showSuccess ? (
          <div className="don-modal-success">
            <div className="don-modal-success-icon">
              <CheckCircle size={32} />
            </div>
            <h2>Donation Successful!</h2>
            <p>
              Your donation of <strong>Rs {Number(form.amount).toLocaleString("en-IN")}</strong> towards{" "}
              <strong>{form.needTitle}</strong> has been received securely.
            </p>
            {donationResult?.id && (
              <p style={{ fontSize: 12, color: "var(--don-text-muted)" }}>
                Donation ID: {donationResult.id}
              </p>
            )}
            <button
              className="don-btn don-btn-primary"
              onClick={() => { onSuccess?.(); onClose(); }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2>Make a Donation</h2>

            <div className="don-trust-banner">
              <ShieldCheck size={18} />
              Funds are secured in escrow until verified utilization.
            </div>

            {selectedNeed && (
              <div className="don-modal-need-info">
                <h4>{selectedNeed.title}</h4>
                <p>
                  Rs {selectedNeed.raisedAmount.toLocaleString("en-IN")} raised of Rs{" "}
                  {selectedNeed.targetAmount.toLocaleString("en-IN")}
                  {remaining > 0 && ` — Rs ${remaining.toLocaleString("en-IN")} remaining`}
                </p>
              </div>
            )}

            {!need && needs.length > 0 && (
              <label className="don-form-field">
                <span>Select Need</span>
                <select value={form.needId} onChange={(e) => handleChange("needId", e.target.value)}>
                  <option value="">Choose a need...</option>
                  {needs.filter((n) => n.status === "active").map((n) => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="don-form-field">
              <span>Amount (Rs)</span>
              <input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
              />
            </label>

            <label className="don-form-field">
              <span>Payment Method</span>
              <select value={form.paymentMethod} onChange={(e) => handleChange("paymentMethod", e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="don-form-field">
              <span>Message (Optional)</span>
              <textarea
                rows={3}
                placeholder="Leave a message for the unit..."
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
              />
            </label>

            <div className="don-modal-actions">
              <button className="don-btn don-btn-secondary" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className="don-btn don-btn-primary"
                disabled={!isValid || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Processing..." : "Donate"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DonationModal;
