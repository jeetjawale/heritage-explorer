import React from "react";

const colorMap = {
  "Fort": "#d32f2f",
  "Temple": "#f57c00",
  "Cave": "#7b1fa2",
  "Beach": "#0288d1",
  "Hill Station": "#388e3c",
  "Museum": "#00796b",
  "Dam": "#1976d2",
  "Waterfall": "#0288d1",
  "National Park": "#4caf50",
  "Wildlife Sanctuary": "#4caf50",
  "Palace": "#c2185b",
  "Lake": "#03a9f4",
  "Hot Spring": "#fbc02d",
  "Historical Monument": "#795548",
  "Tomb": "#5d4037",
  "Stepwell": "#607d8b",
  "Mosque": "#009688",
  "Church": "#5c6bc0",
  "Synagogue": "#3f51b5",
  "Other": "#ffb700"
};

export default function MapLegend() {
  return (
    <div style={{
      position: "absolute",
      bottom: 30,
      right: 15,
      background: "var(--panel-bg)",
      padding: "10px 15px",
      borderRadius: 12,
      boxShadow: "var(--panel-shadow)",
      zIndex: 10,
      fontSize: 13,
      maxHeight: 250,
      overflowY: "auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px 15px",
      border: "1px solid var(--border-color)",
      color: "var(--ink)",
      fontFamily: "var(--font-body)"
    }}>
      {Object.entries(colorMap).map(([category, color]) => (
        <div key={category} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, border: "1px solid rgba(0,0,0,0.2)" }} />
          <span>{category}</span>
        </div>
      ))}
    </div>
  );
}
