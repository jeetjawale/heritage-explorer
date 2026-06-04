import React, { useState, useRef, useEffect } from "react";
import { useMapContext } from "../contexts/MapContext";

const inputBoxStyle = {
  fontSize: 18,
  borderRadius: 12,
  background: "var(--panel-bg)",
  border: "1.5px solid var(--input-border)",
  padding: "10px 15px",
  minHeight: 46,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  boxShadow: "var(--input-shadow)",
  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
  color: "var(--ink)",
  fontFamily: "var(--font-body)"
};

export default function SearchBar({ onFocus, onBlur }) {
  const { filteredPlaces: places, handleSelectPlace: onSelect } = useMapContext();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [show, setShow] = useState(false);
  const containerRef = useRef();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 150);
    return () => clearTimeout(timer);
  }, [q]);

  const filtered = debouncedQ.length === 0 ? [] :
    places.filter(p =>
      [p.Places, p.Location, p.District, p.Category]
        .some(field =>
          field &&
          field.toLowerCase().includes(debouncedQ.toLowerCase())
        )
    ).slice(0, 8);

  function handleSelect(p) {
    setQ("");
    setShow(false);
    if (onSelect) onSelect(p);
  }

  // Hide dropdown on outside click (for better UX)
  React.useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShow(false);
        if (onBlur) onBlur();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onBlur]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", minWidth: 240, width: 320, flex: 1 }}
    >
      <input
        type="text"
        placeholder="Search places, locations, districts."
        className="ui-input"
        style={inputBoxStyle}
        value={q}
        onChange={e => {
          setQ(e.target.value);
          setShow(true);
        }}
        onFocus={() => {
          setShow(true);
          if (onFocus) onFocus();
        }}
        onBlur={() => {
          setTimeout(() => setShow(false), 150); // Give dropdown a chance to register click
          if (onBlur) onBlur();
        }}
        autoComplete="off"
      />
      {show && filtered.length > 0 && (
        <div
          className="ui-dropdown"
          style={{
            position: "absolute",
            top: 56,
            left: 0,
            right: 0,
            zIndex: 36,
            maxHeight: 300,
            overflowY: "auto"
          }}
        >
          {filtered.map((p, idx) => (
            <div
              key={idx}
              className="ui-option"
              style={{
                padding: "13px 16px",
                fontSize: 17,
                cursor: "pointer",
                borderBottom: idx < filtered.length - 1 ? "1px solid rgba(27, 38, 49, 0.08)" : "none"
              }}
              onMouseDown={e => { e.preventDefault(); handleSelect(p); }}
            >
              <b>{p.Places}</b>
              {p.Location && <> — <span style={{ color: "var(--muted)" }}>{p.Location}</span></>}
              {p.District && <> ({p.District})</>}
              {p.Category && <span style={{ color: "var(--muted)", fontSize: 15, marginLeft: 5 }}>[{p.Category}]</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
