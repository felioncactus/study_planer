import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { acceptFriend, blockUser, fetchFriends, removeFriend, requestFriend, unblockUser } from "../api/friends.api";
import Navbar from "../components/Navbar";
import { useNotifications } from "../context/NotificationsContext";

function FriendCard({ friend, meta, actions }) {
  return (
    <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div className="avatar" title={friend.name || friend.email}>
          {friend.avatar_url ? <img src={friend.avatar_url} alt="avatar" /> : <span className="small">{(friend.name || friend.email || "?").slice(0, 2).toUpperCase()}</span>}
        </div>
        <div style={{ display: "grid" }}>
          <div style={{ fontWeight: 650 }}>{friend.name || friend.email}</div>
          <div className="small muted">{friend.email}</div>
          {meta}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div>
    </div>
  );
}

export default function Friends() {
  const { badge } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ accepted: [], pending_inbound: [], pending_outbound: [], blocked: [] });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const d = await fetchFriends();
      setData(d);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAnything = useMemo(
    () =>
      data.accepted.length + data.pending_inbound.length + data.pending_outbound.length + data.blocked.length > 0,
    [data]
  );

  async function onRequest() {
    const v = email.trim();
    if (!v) return;
    setBusy(true);
    setError("");
    try {
      await requestFriend(v);
      setEmail("");
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to send request");
    } finally {
      setBusy(false);
    }
  }

  async function onAccept(userId) {
    setBusy(true);
    setError("");
    try {
      await acceptFriend(userId);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to accept request");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(userId) {
    setBusy(true);
    setError("");
    try {
      await removeFriend(userId);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBlock(userId) {
    setBusy(true);
    setError("");
    try {
      await blockUser(userId);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to block");
    } finally {
      setBusy(false);
    }
  }

  async function onUnblock(userId) {
    setBusy(true);
    setError("");
    try {
      await unblockUser(userId);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to unblock");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 18, paddingBottom: 32 }}>
      <div className="page-header" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Friends</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Add friends by email, accept requests, block users, open direct chats, create groups, and message yourself.
          </p>
        </div>
        <Link className="btn" to="/chat">
          Open chat page{badge ? ` (${badge})` : ""}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Friend email (e.g. someone@example.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRequest();
            }}
            style={{ minWidth: 280 }}
          />
          <button className="btn" onClick={onRequest} disabled={busy || !email.trim()}>
            Send request
          </button>
          <button className="btn btn-ghost" onClick={refresh} disabled={busy || loading}>
            Refresh
          </button>
        </div>
        {error ? (
          <div className="small" style={{ marginTop: 10, color: "var(--danger)" }}>
            {error}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="card">Loading…</div>
      ) : !hasAnything ? (
        <div className="card">No friends yet. Send a request by email above.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {data.pending_inbound.length > 0 ? (
            <section>
              <h3 style={{ margin: "0 0 8px 0" }}>Incoming requests</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {data.pending_inbound.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Wants to be friends</div>}
                    actions={
                      <>
                        <button className="btn" onClick={() => onAccept(r.friend_id)} disabled={busy}>
                          Accept
                        </button>
                        <button className="btn btn-ghost" onClick={() => onRemove(r.friend_id)} disabled={busy}>
                          Decline
                        </button>
                        <button className="btn btn-ghost" onClick={() => onBlock(r.friend_id)} disabled={busy}>
                          Block
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {data.pending_outbound.length > 0 ? (
            <section>
              <h3 style={{ margin: "0 0 8px 0" }}>Outgoing requests</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {data.pending_outbound.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Pending</div>}
                    actions={
                      <>
                        <button className="btn btn-ghost" onClick={() => onRemove(r.friend_id)} disabled={busy}>
                          Cancel
                        </button>
                        <button className="btn btn-ghost" onClick={() => onBlock(r.friend_id)} disabled={busy}>
                          Block
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {data.accepted.length > 0 ? (
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}><h3 style={{ margin: 0 }}>Friends</h3><Link className="btn btn-ghost" to="/chat/self">Open self chat</Link></div>
              <div style={{ display: "grid", gap: 10 }}>
                {data.accepted.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Accepted</div>}
                    actions={
                      <>
                        <Link className="btn" to={`/chat/${r.friend_id}`}>
                          Chat
                        </Link>
                        <button className="btn btn-ghost" onClick={() => onRemove(r.friend_id)} disabled={busy}>
                          Remove
                        </button>
                        <button className="btn btn-ghost" onClick={() => onBlock(r.friend_id)} disabled={busy}>
                          Block
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {data.blocked.length > 0 ? (
            <section>
              <h3 style={{ margin: "0 0 8px 0" }}>Blocked</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {data.blocked.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Blocked</div>}
                    actions={
                      <>
                        <button className="btn btn-ghost" onClick={() => onUnblock(r.friend_id)} disabled={busy}>
                          Unblock
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
      </div>
    </>
  );
}
