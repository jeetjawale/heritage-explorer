import React, { useEffect, useState } from "react";
import { getAllGlobalReviewsForPlace } from "../userData";
import { haversineDistance } from "../utils/mathUtils";
import { useMapContext } from "../contexts/MapContext";

export default function PopularNearYou({ userLocation, selectedDistricts }) {
  const { filteredPlaces: places, handleSelectPlace: onSelectPlace } = useMapContext();
  const [nearby, setNearby] = useState([]);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function fetchData() {
      if (!places.length) {
        setNearby([]);
        return;
      }

      let filtered = [];
      // Filter by district or proximity
      if (selectedDistricts && selectedDistricts.length === 1) {
        filtered = places.filter(p => p.District === selectedDistricts[0]);
      } else if (userLocation) {
        filtered = places
          .map(p => {
            const lat = Number(p.Latitude);
            const lng = Number(p.Longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            const dist = haversineDistance(userLocation.lat, userLocation.lng, lat, lng);
            return dist <= 30 ? { ...p, _dist_km: dist } : null;
          })
          .filter(Boolean);
      } else {
        setNearby([]);
        return;
      }

      // Fetch reviews for each place in parallel
      const enriched = await Promise.all(filtered.map(async (p) => {
        
        const reviews = await getAllGlobalReviewsForPlace(p.Places);
        const count = reviews.length;
        // Calculate the average rating from all reviews (not just the latest!)
        const avg = count
          ? (reviews.reduce((sum, r) => sum + (parseFloat(r.rating) || 0), 0) / count)
          : 0;
        return { ...p, avgRating: avg, reviewCount: count };
      }));

      // Sort: highest rating, then most reviews, then nearest (if applicable)
      enriched.sort((a, b) => {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
        if (a._dist_km !== undefined && b._dist_km !== undefined) {
          return a._dist_km - b._dist_km;
        }
        return 0;
      });

      setNearby(enriched.slice(0, 5)); // Top 5
    }

    fetchData();
    timer = setInterval(fetchData, 30000); // Poll every 30 seconds

    return () => { cancelled = true; clearInterval(timer); };
  }, [places, userLocation, selectedDistricts]);

  function handleClick(p) {
    if (onSelectPlace) onSelectPlace(p);
  }

  const panelTitle = selectedDistricts && selectedDistricts.length === 1
    ? `Popular in ${selectedDistricts[0]}`
    : "Popular Near You";

  return (
    <div
      className="panel panel--slide"
      style={{
        position: "absolute",
        top: 110,
        left: 20,
        zIndex: 25,
        width: 278,
        maxWidth: "95vw",
        maxHeight: "calc(100vh - 140px)",
        padding: "18px 20px",
        overflowY: "auto"
      }}
    >
      <b className="panel-title" style={{ fontSize: 20 }}>{panelTitle}</b>
      {nearby.length === 0 ? (
        <div style={{ color: "var(--muted)", marginTop: 12 }}>No popular places.</div>
      ) : (
        <ul style={{ margin: "13px 0 0 0", padding: 0, listStyle: "none" }}>
          {nearby.map((p, idx) => (
            <li key={idx} style={{
              marginBottom: 11,
              borderBottom: idx < nearby.length - 1 ? "1px solid #f0f0f0" : "none",
              paddingBottom: 8,
              padding: "8px",
              borderRadius: "8px",
              transition: "background 0.2s ease",
              cursor: "pointer"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(15, 91, 115, 0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <a
                href="#"
                onClick={e => { e.preventDefault(); handleClick(p); }}
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: "var(--accent-strong)",
                  cursor: "pointer",
                  textDecoration: "none"
                }}
              >
                {p.Places}
              </a>
              <span style={{ color: "var(--muted)", fontSize: 14, marginLeft: 6 }}>
                ({p.Category}){p._dist_km !== undefined && ` — ${p._dist_km.toFixed(2)} km`}
              </span>
              <br />
              <span style={{ fontSize: 15 }}>
                {p.reviewCount
                  ? (
                    <>
                      <span style={{ color: "var(--accent-warm)", fontWeight: 700 }}>
                        {p.avgRating.toFixed(1)}★
                      </span>
                      <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 4 }}>
                        · {p.reviewCount} review{p.reviewCount > 1 ? "s" : ""}
                      </span>
                    </>
                  )
                  : <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No reviews yet</span>
                }
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


