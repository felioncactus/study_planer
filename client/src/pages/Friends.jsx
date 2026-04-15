import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { acceptFriend, blockUser, fetchFriends, removeFriend, requestFriend, unblockUser } from "../api/friends.api";
import Navbar from "../components/Navbar";
import { useNotifications } from "../context/NotificationsContext";

function FriendCard({ friend, meta, actions }) {
  return (
    <article className="card friend-card">
      <div className="friend-card-main">
        <div className="avatar friend-card-avatar" title={friend.name || friend.email}>
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt={`${friend.name || friend.email} avatar`} />
          ) : (
            <span className="small">{(friend.name || friend.email || "?").slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        <div className="friend-card-copy">
          <div className="friend-card-name">{friend.name || friend.email}</div>
          <div className="small muted">{friend.email}</div>
          {meta}
        </div>
      </div>

      <div className="friend-card-actions">{actions}</div>
    </article>
  );
}

function FriendSection({ title, actions, children }) {
  return (
    <section className="friend-section">
      <div className="friend-section-head">
        <h2 className="section-title">{title}</h2>
        {actions}
      </div>
      <div className="friend-section-body">{children}</div>
    </section>
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

  const counts = useMemo(
    () => ({
      accepted: data.accepted.length,
      inbound: data.pending_inbound.length,
      outbound: data.pending_outbound.length,
      blocked: data.blocked.length,
    }),
    [data]
  );

  const hasAnything = useMemo(
    () => counts.accepted + counts.inbound + counts.outbound + counts.blocked > 0,
    [counts]
  );

  async function onRequest() {
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      await requestFriend(value);
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
      <main className="container stack friends-page">
        <section className="friends-hero card bg-texture">
          <div className="friends-hero-copy">
            <div className="eyebrow">People & conversations</div>
            <h1 className="friends-hero-title">Manage requests, keep classmates close, and jump straight into chat.</h1>
            <p className="small muted">
              Add friends by email, accept or block requests, and open direct conversations without leaving your workspace.
            </p>
          </div>

          <div className="friends-stats" aria-label="Friendship overview">
            <div className="friends-stat"><span className="friends-stat-value">{counts.accepted}</span><span className="small muted">Friends</span></div>
            <div className="friends-stat"><span className="friends-stat-value">{counts.inbound}</span><span className="small muted">Incoming</span></div>
            <div className="friends-stat"><span className="friends-stat-value">{counts.outbound}</span><span className="small muted">Sent</span></div>
            <div className="friends-stat"><span className="friends-stat-value">{counts.blocked}</span><span className="small muted">Blocked</span></div>
          </div>

          <div className="friends-hero-actions">
            <Link className="btn btn-primary" to="/chat">
              Open chat page{badge ? ` (${badge})` : ""}
            </Link>
          </div>
        </section>

        <section className="card friends-request-card">
          <div className="section-head">
            <div>
              <h2 className="section-title">Add a friend</h2>
              <div className="section-sub">Send a request by email.</div>
            </div>
          </div>

          <div className="friends-request-row">
            <label className="sr-only" htmlFor="friend-email">Friend email</label>
            <input
              id="friend-email"
              className="input"
              placeholder="someone@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRequest();
              }}
            />
            <button className="btn btn-primary" onClick={onRequest} disabled={busy || !email.trim()}>
              Send request
            </button>
            <button className="btn btn-ghost" onClick={refresh} disabled={busy || loading}>
              Refresh
            </button>
          </div>

          {error ? <div className="notice notice-danger small">{error}</div> : null}
        </section>

        {loading ? (
          <div className="card">Loading…</div>
        ) : !hasAnything ? (
          <div className="empty">
            <div className="empty-title">No friends yet</div>
            <div className="empty-sub">Send your first request above to start collaborating.</div>
          </div>
        ) : (
          <div className="friends-sections">
            {data.pending_inbound.length > 0 ? (
              <FriendSection title="Incoming requests">
                {data.pending_inbound.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Wants to connect</div>}
                    actions={
                      <>
                        <button className="btn btn-primary" onClick={() => onAccept(r.friend_id)} disabled={busy}>Accept</button>
                        <button className="btn btn-ghost" onClick={() => onRemove(r.friend_id)} disabled={busy}>Decline</button>
                        <button className="btn btn-ghost" onClick={() => onBlock(r.friend_id)} disabled={busy}>Block</button>
                      </>
                    }
                  />
                ))}
              </FriendSection>
            ) : null}

            {data.pending_outbound.length > 0 ? (
              <FriendSection title="Outgoing requests">
                {data.pending_outbound.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Awaiting response</div>}
                    actions={
                      <>
                        <button className="btn btn-ghost" onClick={() => onRemove(r.friend_id)} disabled={busy}>Cancel</button>
                        <button className="btn btn-ghost" onClick={() => onBlock(r.friend_id)} disabled={busy}>Block</button>
                      </>
                    }
                  />
                ))}
              </FriendSection>
            ) : null}

            {data.accepted.length > 0 ? (
              <FriendSection
                title="Friends"
                actions={<Link className="btn btn-ghost" to="/chat/self">Open self chat</Link>}
              >
                {data.accepted.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Connected</div>}
                    actions={
                      <>
                        <Link className="btn btn-primary" to={`/chat/${r.friend_id}`}>Chat</Link>
                        <button className="btn btn-ghost" onClick={() => onRemove(r.friend_id)} disabled={busy}>Remove</button>
                        <button className="btn btn-ghost" onClick={() => onBlock(r.friend_id)} disabled={busy}>Block</button>
                      </>
                    }
                  />
                ))}
              </FriendSection>
            ) : null}

            {data.blocked.length > 0 ? (
              <FriendSection title="Blocked">
                {data.blocked.map((r) => (
                  <FriendCard
                    key={r.friend_id}
                    friend={{ id: r.friend_id, email: r.friend_email, name: r.friend_name, avatar_url: r.friend_avatar_url }}
                    meta={<div className="small muted">Blocked</div>}
                    actions={
                      <button className="btn btn-ghost" onClick={() => onUnblock(r.friend_id)} disabled={busy}>Unblock</button>
                    }
                  />
                ))}
              </FriendSection>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
