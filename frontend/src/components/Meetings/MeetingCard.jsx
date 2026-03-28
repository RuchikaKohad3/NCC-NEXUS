import { Link } from "react-router-dom";
import { CalendarDays, Users, Clock } from "lucide-react";
import {
  formatMeetingDateTime,
  getMeetingRelativeTimingLabel,
  getMeetingTiming,
  getStatusClass,
  getStatusLabel,
  isAuthority,
  canManageMeeting,
  isInvitedToMeeting,
  isMeetingHost,
} from "./meetingUtils";

const MeetingCard = ({ meeting, role, currentUser, participants = [], detailsPath, roomPath, reportPath, onViewDetails, onJoinRoom, onViewReport }) => {
  const invited = isInvitedToMeeting(meeting, currentUser.id, role);
  const isHost = isMeetingHost(meeting, currentUser.id);
  const authority = isAuthority(role);
  const canManage = canManageMeeting(meeting, role);
  const timing = getMeetingTiming(meeting);
  const isLive = timing.isLive;
  const isScheduled = timing.isUpcoming;
  const isCompleted =
    !timing.isMissed &&
    [ "ENDED", "COMPLETED", "CANCELLED" ].includes(String(meeting.status || "").toUpperCase());
  const canJoin = invited && isLive;
  const showParticipantJoin = canJoin && (!authority || !canManage);
  const timeUntil = getMeetingRelativeTimingLabel(meeting);

  return (
    <article className="meeting-card">
      <div className="meeting-card-head">
        <div>
          <h3>{meeting.title}</h3>
          <div className="meeting-card-footer">
            <span className="meeting-type-chip">{meeting.meetingType}</span>
            {isHost ? <span className="meeting-host-chip">Host</span> : null}
          </div>
        </div>
        <span className={`meeting-status-badge ${getStatusClass(meeting.status, meeting)}`}>
          {getStatusLabel(meeting.status, meeting)}
        </span>
      </div>

      {meeting.description ? (
        <p className="meeting-card-description">{meeting.description}</p>
      ) : null}

      <div className="meeting-card-meta">
        <span>
          <CalendarDays size={14} />
          {formatMeetingDateTime(meeting.dateTime)}
        </span>
        <span>
          <Users size={14} />
          {(meeting.invitedUserIds || []).length} invited
        </span>
        {timeUntil ? (
          <span className="meeting-time-until">
            <Clock size={14} />
            {timeUntil}
          </span>
        ) : null}
      </div>

      <div className="meeting-card-actions">
        {onViewDetails ? (
          <button type="button" className="meeting-btn meeting-btn-secondary" onClick={() => onViewDetails(meeting.id)}>
            Details
          </button>
        ) : (
          <Link className="meeting-btn meeting-btn-secondary" to={detailsPath}>
            Details
          </Link>
        )}

        {/* Cadet actions */}
        {showParticipantJoin ? (
          onJoinRoom ? (
            <button type="button" className="meeting-btn meeting-btn-primary" onClick={() => onJoinRoom(meeting.id)}>
              Join Meeting
            </button>
          ) : (
            <Link className="meeting-btn meeting-btn-primary" to={roomPath}>
              Join Meeting
            </Link>
          )
        ) : null}

        {!authority && isScheduled ? (
          <span className="meeting-btn meeting-btn-primary meeting-btn-disabled" aria-disabled="true">
            Join Meeting
          </span>
        ) : null}

        {!authority && isCompleted ? (
          onViewReport ? (
            <button type="button" className="meeting-btn meeting-btn-completed" onClick={() => onViewReport(meeting.id)}>
              View Summary
            </button>
          ) : (
            <Link className="meeting-btn meeting-btn-completed" to={reportPath || `${detailsPath}/report`}>
              View Summary
            </Link>
          )
        ) : null}

        {/* Authority actions */}
        {authority && canManage && isLive ? (
          onJoinRoom ? (
            <button type="button" className="meeting-btn meeting-btn-primary" onClick={() => onJoinRoom(meeting.id)}>
              Open Room
            </button>
          ) : (
            <Link className="meeting-btn meeting-btn-primary" to={roomPath}>
              Open Room
            </Link>
          )
        ) : null}

        {authority && canManage && isCompleted ? (
          onViewReport ? (
            <button type="button" className="meeting-btn meeting-btn-completed" onClick={() => onViewReport(meeting.id)}>
              View Report
            </button>
          ) : (
            <Link className="meeting-btn meeting-btn-completed" to={reportPath || `${detailsPath}/report`}>
              View Report
            </Link>
          )
        ) : null}
      </div>
    </article>
  );
};

export default MeetingCard;
