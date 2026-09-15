import React from "react";
import { ChevronDown, Star, Volume2 } from "lucide-react";

export default function VoiceCommandCard({
  command,
  audioSrc,
  isExpanded,
  isLearned,
  isPlaying,
  playingSpeed,
  onToggleExpand,
  onToggleLearned,
  onPlay,
  onAudioRef,
  onPractice,
  isPracticeTarget,
}) {
  return (
    <article className={`voice-card ${isExpanded ? "expanded" : ""}`} role="listitem">
      <audio ref={onAudioRef} src={audioSrc} preload="none" />

      <div className="voice-card-main">
        <div className="voice-card-title-wrap">
          <h3> {command.name}</h3>
          <span className="voice-type-badge">{command.type}</span>
        </div>

        <div className="voice-card-actions">
          <button
            type="button"
            className={`voice-audio-btn ${isPlaying && playingSpeed === 1 ? "playing" : ""}`}
            onClick={() => onPlay(1)}
          >
            <Volume2 size={14} />
            Play 1x
          </button>

          <button
            type="button"
            className={`voice-audio-btn ${isPlaying && playingSpeed === 0.75 ? "playing" : ""}`}
            onClick={() => onPlay(0.75)}
          >
            ?? 0.75x
          </button>

          <button
            type="button"
            className={`voice-learned-btn ${isLearned ? "active" : ""}`}
            onClick={onToggleLearned}
            aria-pressed={isLearned}
          >
            <Star size={14} />
            {isLearned ? "Learned" : "Mark Learned"}
          </button>

          <button
            type="button"
            className={`voice-practice-btn ${isPracticeTarget ? "active" : ""}`}
            onClick={onPractice}
          >
            {isPracticeTarget ? "Practicing" : "Practice"}
          </button>

          <button
            type="button"
            className={`voice-expand-btn ${isExpanded ? "open" : ""}`}
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
          >
            Details
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className={`voice-card-details-wrap ${isExpanded ? "open" : ""}`}>
        <div className="voice-card-details">
          <p>
            <strong>Hindi Pronunciation:</strong> {command.hindi}
          </p>
          <p>
            <strong>English Phonetic:</strong> {command.phonetic}
          </p>
          <p>
            <strong>Hindi Explanation:</strong> {command.hindiExplanation}
          </p>
          <p>
            <strong>English Explanation:</strong> {command.englishExplanation}
          </p>
        </div>
      </div>
    </article>
  );
}
