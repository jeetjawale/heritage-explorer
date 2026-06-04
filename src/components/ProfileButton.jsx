import React from "react";
export default function ProfileButton({ user, onClick }) {
  return (
    <button
      className="avatar-button"
      style={{
        border: "none",
        background: "none",
        cursor: "pointer",
        marginLeft: 4
      }}
      onClick={onClick}
      title={user ? user.name : "Login / Signup"}
    >
      {user ? (
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            display: "inline-block",
            background: "rgba(15, 91, 115, 0.12)",
            color: "var(--accent-strong)",
            fontSize: 22,
            textAlign: "center",
            lineHeight: "42px",
            fontWeight: 700,
            boxShadow: "var(--panel-shadow)"
          }}
        >
          {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
        </span>
      ) : (
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            display: "inline-block",
            background: "rgba(15, 91, 115, 0.12)",
            color: "var(--accent-strong)",
            fontSize: 22,
            textAlign: "center",
            lineHeight: "42px",
            fontWeight: 700,
            boxShadow: "var(--panel-shadow)"
          }}
        >👤</span>
      )}
    </button>
  );
}
