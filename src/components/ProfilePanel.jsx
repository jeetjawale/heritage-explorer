import React from "react";
export default function ProfilePanel({ user, onClose, onLogout }) {
  if (!user) return null;
  return (
    <div
      className="panel panel--slide"
      style={{
        position: "fixed",
        right: 26,
        top: 65,
        width: 340,
        padding: 24,
        zIndex: 55
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 9,
          right: 18,
          border: "none",
          background: "none",
          fontSize: 24,
          color: "var(--muted)",
          cursor: "pointer"
        }}
      >
        &times;
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 8 }}>
        <div>
          <span
            style={{
              width: 55,
              height: 55,
              borderRadius: "50%",
              display: "inline-block",
              background: "rgba(15, 91, 115, 0.12)",
              color: "var(--accent-strong)",
              fontSize: 28,
              textAlign: "center",
              lineHeight: "55px",
              fontWeight: 700,
              boxShadow: "var(--panel-shadow)"
            }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
          </span>
        </div>
        <div>
          <b style={{ fontSize: 20, fontFamily: "var(--font-display)", color: "var(--accent-strong)" }}>{user.name}</b>
          <div style={{ color: "var(--muted)", fontSize: 16 }}>From: {user.from}</div>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="soft-button"
        style={{
          color: "#c41c3b",
          float: "right",
          marginTop: -18,
          marginBottom: 10,
          fontSize: 16,
          padding: "6px 22px"
        }}
      >
        Logout
      </button>
      <hr />
      <div style={{ marginTop: 10 }}>
        <b style={{ fontFamily: "var(--font-display)", color: "var(--accent-strong)" }}>Favorites:</b>
        <ul>
          {(!user.favorites || user.favorites.length === 0) && <li><i>No favorites yet</i></li>}
          {user.favorites && user.favorites.map((fav, i) => (
            <li key={i} style={{ color: "var(--ink)" }}>{fav}</li>
          ))}
        </ul>
        <b style={{ fontFamily: "var(--font-display)", color: "var(--accent-strong)" }}>Your Reviews:</b>
        <ul>
          {(!user.reviews || user.reviews.length === 0) && <li><i>No reviews yet</i></li>}
          {user.reviews && user.reviews.map((r, i) => (
            <li key={i} style={{ color: "var(--ink)" }}>
              <span style={{ fontWeight: 600 }}>{r.place}</span>
              : {r.rating}★ — <span style={{ fontSize: 15, color: "var(--muted)" }}>{r.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
