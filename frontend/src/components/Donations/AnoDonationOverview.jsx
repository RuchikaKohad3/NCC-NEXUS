import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IndianRupee, CheckCircle, Target, Users } from "lucide-react";
import { fetchAnoOverview, fetchAnoProjects } from "../../store/donationSlice";
import "./donationModule.css";

const AnoDonationOverview = () => {
  const dispatch = useDispatch();
  const { anoOverview, anoProjects, loading } = useSelector((s) => s.donations);

  useEffect(() => {
    dispatch(fetchAnoOverview());
    dispatch(fetchAnoProjects());
  }, [dispatch]);

  const completedCount = anoProjects.filter((p) => p.status === "COMPLETED").length;
  const ongoingCount = anoProjects.filter((p) => p.status !== "COMPLETED").length;

  return (
    <div className="don-page">
      <div className="don-page-head">
        <div>
          <h1>Donation Overview</h1>
          <p>Aggregated donation statistics for your NCC unit.</p>
        </div>
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
                          style={{ width: `${Math.round((project.raised / project.target) * 100)}%` }}
                        />
                      </div>
                      <div className="don-progress-meta">
                        <span className="don-progress-raised">
                          {Math.round((project.raised / project.target) * 100)}% funded
                        </span>
                        <span>Rs {project.target?.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
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
                        <div className="don-progress-fill" style={{ width: "100%" }} />
                      </div>
                      <div className="don-progress-meta">
                        <span className="don-progress-raised">100% funded</span>
                        <span>Rs {project.target?.toLocaleString("en-IN")}</span>
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
    </div>
  );
};

export default AnoDonationOverview;
