import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IndianRupee, CheckCircle, Target, Users, AlertTriangle, Send, Plus, X } from "lucide-react";
import { fetchAnoOverview, fetchAnoProjects } from "../../store/donationSlice";
import { donationApi } from "../../api/donationApi";
import "./donationModule.css";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const AnoDonationOverview = () => {
  const dispatch = useDispatch();
  const { anoOverview, anoProjects, loading } = useSelector((s) => s.donations);
  const [issueReports, setIssueReports] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState("");
  const [resolutionDrafts, setResolutionDrafts] = useState({});
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    title: "",
    description: "",
    minimumAmount: "",
    targetAmount: "",
  });
  const [createError, setCreateError] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [closingCampaignId, setClosingCampaignId] = useState(null);

  const loadIssueReports = async () => {
    try {
      setIssuesLoading(true);
      setIssuesError("");
      const response = await donationApi.getAnoIssueReports();
      setIssueReports(response.data || []);
    } catch (error) {
      setIssueReports([]);
      setIssuesError(error.message || "Failed to load donation issue reports.");
    } finally {
      setIssuesLoading(false);
    }
  };

  useEffect(() => {
    dispatch(fetchAnoOverview());
    dispatch(fetchAnoProjects());
    loadIssueReports();
  }, [dispatch]);

  const completedCount = anoProjects.filter((p) => p.status === "COMPLETED").length;
  const ongoingCount = anoProjects.filter((p) => p.status !== "COMPLETED").length;
  const openIssues = issueReports.filter((report) => String(report.status || "").toUpperCase() !== "RESOLVED");
  const resolvedIssues = issueReports.filter((report) => String(report.status || "").toUpperCase() === "RESOLVED");

  const getFundingPercent = (project) => {
    if (!project.target || project.target <= 0) return null;
    return Math.min(100, Math.round((project.raised / project.target) * 100));
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateError("");
    setCreatingCampaign(false);
    setCreateDraft({
      title: "",
      description: "",
      minimumAmount: "",
      targetAmount: "",
    });
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();

    const title = String(createDraft.title || "").trim();
    const description = String(createDraft.description || "").trim();
    const minimumAmount = Number(createDraft.minimumAmount);
    const targetAmount = createDraft.targetAmount === "" ? null : Number(createDraft.targetAmount);

    if (!title) {
      setCreateError("Campaign title is required.");
      return;
    }

    if (!Number.isFinite(minimumAmount) || minimumAmount < 0) {
      setCreateError("Minimum amount must be zero or more.");
      return;
    }

    if (targetAmount !== null && (!Number.isFinite(targetAmount) || targetAmount < 0)) {
      setCreateError("Target amount must be zero or more.");
      return;
    }

    try {
      setCreatingCampaign(true);
      setCreateError("");
      await donationApi.createCampaign({
        title,
        description,
        minimumAmount,
        targetAmount,
      });
      dispatch(fetchAnoOverview());
      dispatch(fetchAnoProjects());
      resetCreateModal();
    } catch (error) {
      setCreateError(error.message || "Failed to create donation campaign.");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleResolveIssue = async (reportId) => {
    const resolutionText = String(resolutionDrafts[reportId] || "").trim();
    if (!resolutionText) return;

    try {
      setResolvingReportId(reportId);
      await donationApi.resolveAnoIssueReport({ reportId, resolutionText });
      setResolutionDrafts((prev) => ({ ...prev, [reportId]: "" }));
      await loadIssueReports();
    } catch (error) {
      setIssuesError(error.message || "Failed to resolve donation issue.");
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleCloseCampaign = async (campaignId) => {
    try {
      setClosingCampaignId(campaignId);
      setIssuesError("");
      await donationApi.closeCampaign(campaignId);
      dispatch(fetchAnoOverview());
      dispatch(fetchAnoProjects());
    } catch (error) {
      setIssuesError(error.message || "Failed to close campaign.");
    } finally {
      setClosingCampaignId(null);
    }
  };

  return (
    <div className="don-page">
      <div className="don-page-head">
        <div>
          <h1>Donation Overview</h1>
          <p>Aggregated donation statistics and issue handling for your NCC unit.</p>
        </div>
        <button className="don-btn don-btn-primary" type="button" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Create Donation Campaign
        </button>
      </div>

      {loading && <div className="don-empty">Loading overview...</div>}

      {!loading && anoOverview && (
        <div className="don-stat-cards">
          <div className="don-stat-card">
            <div className="don-stat-icon don-icon-green"><IndianRupee size={22} /></div>
            <div className="don-stat-info">
              <h3>Rs {anoOverview.totalDonated?.toLocaleString("en-IN")}</h3>
              <p>Total Donations</p>
            </div>
          </div>
          <div className="don-stat-card">
            <div className="don-stat-icon don-icon-blue"><CheckCircle size={22} /></div>
            <div className="don-stat-info">
              <h3>{anoOverview.projectsCompleted}</h3>
              <p>Projects Completed</p>
            </div>
          </div>
          <div className="don-stat-card">
            <div className="don-stat-icon don-icon-amber"><Target size={22} /></div>
            <div className="don-stat-info">
              <h3>{anoOverview.activeNeeds}</h3>
              <p>Active Needs</p>
            </div>
          </div>
          <div className="don-stat-card">
            <div className="don-stat-icon don-icon-navy"><Users size={22} /></div>
            <div className="don-stat-info">
              <h3>{anoOverview.totalDonors}</h3>
              <p>Total Donors</p>
            </div>
          </div>
        </div>
      )}

      <h3 className="don-section-title">Donation Issue Reports</h3>
      {issuesLoading ? <div className="don-empty">Loading donation issue reports...</div> : null}
      {!issuesLoading && issuesError ? <div className="don-empty">{issuesError}</div> : null}

      {!issuesLoading && !issuesError && openIssues.length > 0 ? (
        <div className="don-card-grid" style={{ marginBottom: 32 }}>
          {openIssues.map((report) => (
            <article key={report.report_id} className="don-card">
              <div className="don-card-head">
                <div>
                  <h3>{report.campaign_title}</h3>
                  <span className="don-amount-chip">Rs {Number(report.amount || 0).toLocaleString("en-IN")}</span>
                </div>
                <span className="don-status-badge don-status-awaiting">
                  <AlertTriangle size={12} /> Open
                </span>
              </div>

              <p className="don-card-donor">Reported by: {report.reporter_name}</p>
              <p className="don-card-message">{report.issue_text}</p>
              <div className="don-card-meta">
                <span>{formatDate(report.created_at)}</span>
              </div>

              <label className="don-form-field" style={{ marginBottom: 12 }}>
                <span>Resolution Text</span>
                <textarea
                  rows={3}
                  placeholder="Write the resolution that should be sent in chat to the reporting alumni..."
                  value={resolutionDrafts[report.report_id] || ""}
                  onChange={(e) => setResolutionDrafts((prev) => ({ ...prev, [report.report_id]: e.target.value }))}
                />
              </label>

              <button
                className="don-btn don-btn-primary"
                type="button"
                disabled={!String(resolutionDrafts[report.report_id] || "").trim() || resolvingReportId === report.report_id}
                onClick={() => handleResolveIssue(report.report_id)}
              >
                <Send size={14} />
                {resolvingReportId === report.report_id ? "Sending..." : "Resolve and Send in Chat"}
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {!issuesLoading && !issuesError && openIssues.length === 0 ? (
        <div className="don-empty">No open donation issues right now.</div>
      ) : null}

      {!issuesLoading && !issuesError && resolvedIssues.length > 0 ? (
        <>
          <h3 className="don-section-title">Resolved Issues</h3>
          <div className="don-card-grid" style={{ marginBottom: 32 }}>
            {resolvedIssues.slice(0, 6).map((report) => (
              <article key={report.report_id} className="don-card">
                <div className="don-card-head">
                  <div>
                    <h3>{report.campaign_title}</h3>
                    <span className="don-amount-chip">Rs {Number(report.amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <span className="don-status-badge don-status-completed">Resolved</span>
                </div>
                <p className="don-card-donor">Reported by: {report.reporter_name}</p>
                <p className="don-card-message">{report.issue_text}</p>
                <p style={{ margin: "10px 0 0", fontSize: 13.5, color: "var(--don-text-secondary)" }}>
                  <strong>Resolution:</strong> {report.resolution_text || "-"}
                </p>
                <div className="don-card-meta">
                  <span>Resolved {formatDate(report.resolved_at)}</span>
                  {report.resolver_name ? <span>by {report.resolver_name}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {!loading && anoProjects.length > 0 && (
        <>
          {ongoingCount > 0 && (
            <>
              <h3 className="don-section-title">Ongoing Projects</h3>
              <div className="don-card-grid" style={{ marginBottom: 32 }}>
                {anoProjects.filter((p) => p.status !== "COMPLETED").map((project) => (
                  <article key={project.id} className="don-card">
                    <div className="don-card-head">
                      <h3>{project.title}</h3>
                      <span className="don-status-badge don-status-in-progress">In Progress</span>
                    </div>
                    <p className="don-need-description">{project.description}</p>
                    <div className="don-progress-section">
                      <div className="don-progress-bar">
                        <div
                          className="don-progress-fill"
                          style={{ width: `${getFundingPercent(project) || 0}%` }}
                        />
                      </div>
                      <div className="don-progress-meta">
                        <span className="don-progress-raised">
                          {getFundingPercent(project) !== null ? `${getFundingPercent(project)}% funded` : "Open goal"}
                        </span>
                        <span>
                          {project.target > 0 ? `Rs ${project.target?.toLocaleString("en-IN")}` : `Raised Rs ${project.raised?.toLocaleString("en-IN")}`}
                        </span>
                      </div>
                    </div>
                    {project.canClose ? (
                      <div className="don-card-actions">
                        <button
                          className="don-btn don-btn-secondary"
                          type="button"
                          disabled={closingCampaignId === project.id}
                          onClick={() => handleCloseCampaign(project.id)}
                        >
                          {closingCampaignId === project.id ? "Closing..." : "Close Campaign"}
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          )}

          {completedCount > 0 && (
            <>
              <h3 className="don-section-title">Completed Projects</h3>
              <div className="don-card-grid">
                {anoProjects.filter((p) => p.status === "COMPLETED").map((project) => (
                  <article key={project.id} className="don-card">
                    <div className="don-card-head">
                      <h3>{project.title}</h3>
                      <span className="don-status-badge don-status-completed">Completed</span>
                    </div>
                    <p className="don-need-description">{project.description}</p>
                    <div className="don-progress-section">
                      <div className="don-progress-bar">
                        <div
                          className="don-progress-fill"
                          style={{ width: `${getFundingPercent(project) || 0}%` }}
                        />
                      </div>
                      <div className="don-progress-meta">
                        <span className="don-progress-raised">
                          {getFundingPercent(project) !== null ? `${getFundingPercent(project)}% funded` : "Closed campaign"}
                        </span>
                        <span>
                          {project.target > 0 ? `Rs ${project.raised?.toLocaleString("en-IN")} of Rs ${project.target?.toLocaleString("en-IN")}` : `Raised Rs ${project.raised?.toLocaleString("en-IN")}`}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {!loading && anoProjects.length === 0 && (
        <div className="don-empty">No projects found.</div>
      )}

      {showCreateModal ? (
        <div className="don-modal-overlay" onClick={resetCreateModal}>
          <div className="don-modal" onClick={(event) => event.stopPropagation()}>
            <button className="don-modal-close" type="button" onClick={resetCreateModal} aria-label="Close">
              <X size={18} />
            </button>
            <h2>Create Donation Campaign</h2>
            <div className="don-modal-need-info">
              <h4>Visible to alumni donors</h4>
              <p>Create a new campaign for your unit. Alumni will see it in Unit Needs and can donate against it.</p>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div className="don-form-field">
                <span>Campaign Title</span>
                <input
                  type="text"
                  placeholder="Support new training equipment"
                  value={createDraft.title}
                  onChange={(event) => setCreateDraft((prev) => ({ ...prev, title: event.target.value }))}
                />
              </div>

              <div className="don-form-field">
                <span>Description</span>
                <textarea
                  rows={4}
                  placeholder="Briefly explain what the unit needs and why alumni should contribute."
                  value={createDraft.description}
                  onChange={(event) => setCreateDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>

              <div className="don-create-fields">
                <label className="don-form-field">
                  <span>Minimum Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="100"
                    value={createDraft.minimumAmount}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, minimumAmount: event.target.value }))}
                  />
                </label>

                <label className="don-form-field">
                  <span>Target Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="50000"
                    value={createDraft.targetAmount}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, targetAmount: event.target.value }))}
                  />
                </label>
              </div>

              {createError ? <div className="don-empty" style={{ marginTop: 8 }}>{createError}</div> : null}

              <div className="don-modal-actions">
                <button className="don-btn don-btn-secondary" type="button" onClick={resetCreateModal}>
                  Cancel
                </button>
                <button className="don-btn don-btn-primary" type="submit" disabled={creatingCampaign}>
                  {creatingCampaign ? "Creating..." : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AnoDonationOverview;
