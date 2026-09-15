// Responsibility: AI Adjutant console (M9) — officer chat over whitelisted
//   read-only tools, with full tool-call transparency and human-gated action
//   proposals (approve / reject inline).
// Layer: Command Center UI (Layer 4).
// Depends on: api/adjutantApi, adjutantConsole.css. Rendered in the ANO shell
//   (/ano/command/adjutant).
// Must never be depended on by: backend code or the Intelligence/Decision layers.
//
// Trust rules made visible: every assistant reply lists WHICH tools it consulted
// ("Consulted: at-risk list"), and nothing consequential happens without the
// officer pressing Approve — the proposal card is the human-in-the-loop gate.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Plus,
  SendHorizonal,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  ShieldX,
  Loader2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock3,
} from "lucide-react";
import { adjutantApi } from "../../api/adjutantApi";
import "./adjutantConsole.css";

const TOOL_LABELS = {
  get_cohort_readiness: "cohort readiness",
  get_cadet_readiness: "a cadet's snapshot",
  get_at_risk: "at-risk list",
  get_active_flags: "active flags",
  get_camp_selection: "camp selection",
  propose_action: "action proposal",
};

const ACTION_LABELS = {
  acknowledge_flag: "Acknowledge at-risk flag",
  scan_at_risk: "Run an at-risk scan",
  recompute_college: "Recompute college readiness",
};

const QUICK_PROMPTS = [
  "Who is at risk right now, and why?",
  "Rank the top 5 cadets for RDC.",
  "Which cadet has the weakest discipline pillar?",
  "Summarise unit readiness for my HOD.",
];

const STATUS_META = {
  pending: { label: "Awaiting decision", icon: Clock3, cls: "aj-p-pending" },
  approved: { label: "Approved", icon: CheckCircle2, cls: "aj-p-done" },
  executed: { label: "Executed", icon: CheckCircle2, cls: "aj-p-done" },
  rejected: { label: "Rejected", icon: XCircle, cls: "aj-p-rejected" },
  failed: { label: "Execution failed", icon: AlertTriangle, cls: "aj-p-failed" },
};

function ProposalCard({ proposal, onDecide, busy }) {
  const meta = STATUS_META[proposal.status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <div className={`aj-proposal ${meta.cls}`}>
      <div className="aj-proposal-head">
        <span className="aj-proposal-type">
          <Wrench size={13} /> {ACTION_LABELS[proposal.action_type] || proposal.action_type}
        </span>
        <span className="aj-proposal-status">
          <Icon size={13} /> {meta.label}
        </span>
      </div>
      {proposal.reason && <p className="aj-proposal-reason">{proposal.reason}</p>}
      {proposal.params && Object.keys(proposal.params).length > 0 && (
        <p className="aj-proposal-params">
          {Object.entries(proposal.params)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        </p>
      )}
      {proposal.status === "pending" && (
        <div className="aj-proposal-actions">
          <button
            className="aj-btn aj-btn-approve"
            disabled={busy}
            onClick={() => onDecide(proposal.proposal_id, "approve")}
          >
            <ShieldCheck size={14} /> Approve & execute
          </button>
          <button
            className="aj-btn aj-btn-reject"
            disabled={busy}
            onClick={() => onDecide(proposal.proposal_id, "reject")}
          >
            <ShieldX size={14} /> Reject
          </button>
        </div>
      )}
      {proposal.status === "failed" && proposal.result?.error && (
        <p className="aj-proposal-error">{proposal.result.error}</p>
      )}
    </div>
  );
}

function Message({ msg, proposals, onDecide, busyProposal }) {
  const isUser = msg.role === "user";
  const trace = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
  const consulted = trace.filter((t) => t.name !== "propose_action");
  const myProposals = proposals.filter((p) => p.message_id === msg.message_id);

  return (
    <div className={`aj-msg ${isUser ? "aj-msg-user" : "aj-msg-bot"}`}>
      {!isUser && (
        <div className="aj-avatar">
          <Bot size={15} />
        </div>
      )}
      <div className="aj-bubblecol">
        <div className="aj-bubble">{msg.content}</div>
        {consulted.length > 0 && (
          <div className="aj-trace">
            <Wrench size={11} />
            Consulted:{" "}
            {consulted
              .map((t) => TOOL_LABELS[t.name] || t.name)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(", ")}
          </div>
        )}
        {myProposals.map((p) => (
          <ProposalCard
            key={p.proposal_id}
            proposal={p}
            onDecide={onDecide}
            busy={busyProposal === p.proposal_id}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdjutantConsole() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [busyProposal, setBusyProposal] = useState(null);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await adjutantApi.listConversations();
      const rows = Array.isArray(res.data) ? res.data : [];
      setConversations(rows);
      return rows;
    } catch (err) {
      setError(
        err?.response?.status === 403
          ? "Only officers (ANO/SUO) can use the Adjutant."
          : err?.response?.data?.message || "Failed to load conversations."
      );
      return [];
    }
  }, []);

  const loadProposals = useCallback(async () => {
    try {
      const res = await adjutantApi.listProposals();
      setProposals(Array.isArray(res.data) ? res.data : []);
    } catch {
      /* proposals are supplementary — the chat still works without them */
    }
  }, []);

  const openConversation = useCallback(
    async (conversationId) => {
      setActiveId(conversationId);
      setError("");
      try {
        const res = await adjutantApi.getMessages(conversationId);
        setMessages(Array.isArray(res.data) ? res.data : []);
        scrollToEnd();
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load messages.");
      }
    },
    [scrollToEnd]
  );

  // Boot: conversations + proposals; open the latest conversation if any.
  useEffect(() => {
    (async () => {
      const rows = await loadConversations();
      await loadProposals();
      if (rows.length) openConversation(rows[0].conversation_id);
    })();
  }, [loadConversations, loadProposals, openConversation]);

  const startConversation = useCallback(async () => {
    try {
      const res = await adjutantApi.createConversation();
      setConversations((prev) => [res.data, ...prev]);
      setActiveId(res.data.conversation_id);
      setMessages([]);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start a conversation.");
    }
  }, []);

  const send = useCallback(
    async (text) => {
      const clean = String(text || "").trim();
      if (!clean || sending) return;

      let conversationId = activeId;
      if (!conversationId) {
        try {
          const res = await adjutantApi.createConversation();
          conversationId = res.data.conversation_id;
          setConversations((prev) => [res.data, ...prev]);
          setActiveId(conversationId);
        } catch (err) {
          setError(err?.response?.data?.message || "Failed to start a conversation.");
          return;
        }
      }

      setSending(true);
      setError("");
      setDraft("");
      // Optimistic officer message; reconciled with the server copy on success.
      const optimistic = { message_id: `tmp-${Date.now()}`, role: "user", content: clean };
      setMessages((prev) => [...prev, optimistic]);
      scrollToEnd();

      try {
        const res = await adjutantApi.sendMessage(conversationId, clean);
        const { user, assistant, proposals: newProposals } = res.data || {};
        setMessages((prev) => [
          ...prev.filter((m) => m.message_id !== optimistic.message_id),
          ...(user ? [user] : []),
          ...(assistant ? [assistant] : []),
        ]);
        if (newProposals?.length) setProposals((prev) => [...newProposals, ...prev]);
        loadConversations(); // refresh titles/ordering
        scrollToEnd();
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.message_id !== optimistic.message_id));
        setDraft(clean); // give the officer their text back
        setError(
          err?.response?.status === 502
            ? "The Adjutant is unreachable right now — your message was not lost, try again."
            : err?.response?.data?.message || "Failed to send."
        );
      } finally {
        setSending(false);
      }
    },
    [activeId, sending, loadConversations, scrollToEnd]
  );

  const decide = useCallback(async (proposalId, decision) => {
    setBusyProposal(proposalId);
    try {
      const res =
        decision === "approve"
          ? await adjutantApi.approveProposal(proposalId)
          : await adjutantApi.rejectProposal(proposalId);
      setProposals((prev) =>
        prev.map((p) => (p.proposal_id === proposalId ? res.data : p))
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record the decision.");
    } finally {
      setBusyProposal(null);
    }
  }, []);

  const pendingCount = useMemo(
    () => proposals.filter((p) => p.status === "pending").length,
    [proposals]
  );

  return (
    <div className="aj-page">
      <div className="aj-hero">
        <div>
          <h1 className="aj-title">
            <Bot size={22} /> AI Adjutant
          </h1>
          <p className="aj-sub">
            Answers only from unit data via whitelisted read-only tools · every action needs your
            approval
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="aj-pending-badge">
            <Clock3 size={14} /> {pendingCount} proposal{pendingCount > 1 ? "s" : ""} awaiting you
          </span>
        )}
      </div>

      {error && (
        <div className="aj-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="aj-layout">
        {/* Conversation rail */}
        <aside className="aj-rail">
          <button className="aj-new-btn" onClick={startConversation}>
            <Plus size={15} /> New conversation
          </button>
          <div className="aj-rail-list">
            {conversations.map((c) => (
              <button
                key={c.conversation_id}
                className={`aj-rail-item ${c.conversation_id === activeId ? "aj-active" : ""}`}
                onClick={() => openConversation(c.conversation_id)}
              >
                <MessageSquare size={13} />
                <span>{c.title}</span>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="aj-rail-empty">No conversations yet.</p>
            )}
          </div>
        </aside>

        {/* Chat pane */}
        <section className="aj-chat">
          <div className="aj-scroll" ref={scrollRef}>
            {messages.length === 0 && !sending ? (
              <div className="aj-empty">
                <Bot size={30} />
                <h3>Ask about your unit</h3>
                <p>
                  The Adjutant consults readiness snapshots, the risk watchlist and the selection
                  board — and shows you exactly what it consulted.
                </p>
                <div className="aj-quick">
                  {QUICK_PROMPTS.map((q) => (
                    <button key={q} className="aj-quick-btn" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <Message
                  key={m.message_id}
                  msg={m}
                  proposals={proposals}
                  onDecide={decide}
                  busyProposal={busyProposal}
                />
              ))
            )}
            {sending && (
              <div className="aj-msg aj-msg-bot">
                <div className="aj-avatar">
                  <Bot size={15} />
                </div>
                <div className="aj-bubblecol">
                  <div className="aj-bubble aj-thinking">
                    <Loader2 size={14} className="aj-spin" /> Consulting unit data…
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            className="aj-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder='Ask the Adjutant — e.g. "who needs attention before the camp?"'
              disabled={sending}
              maxLength={2000}
            />
            <button className="aj-send" type="submit" disabled={sending || !draft.trim()}>
              <SendHorizonal size={16} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
