import React, { useEffect, useState, useRef } from "react";
import { OPENWEATHERMAP_KEY } from "../config";
import { showSuccess, showError, showInfo } from "../utils/toastUtils";
import {
  getUserProfile,
  updateUserProfile,
  getAllGlobalReviewsForPlace,
  addOrUpdateGlobalReview,
  deleteGlobalReview
} from "../userData";

import LoginSignupModal from "./LoginSignupModal";
import { formatArrivalTime } from "../utils/timeUtils";
import { haversineDistance } from "../utils/mathUtils";
import { useUser } from "../contexts/UserContext";
import { useMapContext } from "../contexts/MapContext";
import { useWeather } from "../hooks/useWeather";
function AutoGrowTextarea({ value, onChange, ...rest }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      {...rest}
      style={{
        ...rest.style,
        overflow: "hidden",
        resize: "none",
        minHeight: 38,
        maxHeight: 180,
        width: "97%",
        fontSize: 15,
        borderRadius: 7,
        border: "1.2px solid #b5b5b5",
        padding: 7,
        boxSizing: "border-box",
        marginTop: 5,
      }}
    />
  );
}



export default function PlacePanel() {
  const { user, updateProfile, login } = useUser();
  const { selected: place, handleClosePanel: onClose, filteredPlaces: allPlaces, handleShowRoute: onDirections, routeSummary, clearRoute: onClearRoute, handleSelectPlace: onSelectPlace } = useMapContext();
  const [firstLoad, setFirstLoad] = useState(true);
  const { weather, weatherErr } = useWeather(place);
  const [activeTab, setActiveTab] = useState("overview");

  // Reviews & favoritespolling
  const [favBusy, setFavBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [allReviews, setAllReviews] = useState([]);
  const [loadingAllReviews, setLoadingAllReviews] = useState(false);

  // Review form state
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // Editing
  const [editingReview, setEditingReview] = useState(false);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(0);

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Reviews polling
  useEffect(() => {
    let cancelled = false, timer = null;
    async function fetchReviews(isInitial = false) {
      if (isInitial) setLoadingAllReviews(true);
      const reviews = await getAllGlobalReviewsForPlace(place?.Places);
      if (!cancelled) {
        setAllReviews(reviews);
        setLoadingAllReviews(false);
        if (isInitial) setFirstLoad(false);
      }
    }
    if (place && place.Places) {
      setFirstLoad(true);
      fetchReviews(true);
      timer = setInterval(() => fetchReviews(false), 30000);
    } else {
      setAllReviews([]);
    }
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [place]);

  function getNearbyPlaces(current, all, maxDistKm = 20) {
    if (!current || !current.Latitude || !current.Longitude) return [];
    return all
      .filter(p =>
        (p.Places !== current.Places || p.Location !== current.Location) &&
        p.Latitude && p.Longitude &&
        haversineDistance(current.Latitude, current.Longitude, p.Latitude, p.Longitude) <= maxDistKm
      )
      .map(p => ({
        ...p,
        _dist_km: haversineDistance(current.Latitude, current.Longitude, p.Latitude, p.Longitude)
      }))
      .sort((a, b) => a._dist_km - b._dist_km)
      .slice(0, 5);
  }

  const {
    Places, District, Location, Category, Description,
    "Image URL": imageUrl, "Link to Page": wikiUrl,
    Latitude, Longitude
  } = place || {};

  const nearby = getNearbyPlaces(place, allPlaces);

  // --- Favorites ---
  async function handleAddFavorite() {
    if (!user || (Array.isArray(user.favorites) && user.favorites.includes(Places))) return;
    setFavBusy(true);
    try {
      const newFavorites = [...(user.favorites || []), Places];
      await updateProfile({ favorites: newFavorites });
      showSuccess("Added to favorites!");
    } catch (err) {
      showError("Failed to add favorite!");
    }
    setFavBusy(false);
  }
  async function handleRemoveFavorite() {
    setFavBusy(true);
    try {
      const newFavorites = (user.favorites || []).filter(f => f !== Places);
      await updateProfile({ favorites: newFavorites });
      showInfo("Removed from favorites.");
    } catch (err) {
      showError("Failed to remove favorite!");
    }
    setFavBusy(false);
  }

  // --- Review logic ---
  const userReview = user && allReviews.find(r => r.userId === user.uid);

  function handleGoogleDirections() {
  if (!Latitude || !Longitude) return;
  if (!navigator.geolocation) {
    // Fallback: open with My Location
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(`${Latitude},${Longitude}`)}&travelmode=best`,
      "_blank"
    );
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${encodeURIComponent(`${Latitude},${Longitude}`)}&travelmode=best`;
      window.open(url, "_blank");
    },
    (err) => {
      // If denied or unavailable, fallback to "My Location"
      const url = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(`${Latitude},${Longitude}`)}&travelmode=best`;
      window.open(url, "_blank");
    }
  );
}

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!reviewRating || !reviewText.trim()) return;
    setReviewBusy(true);
    try {
      const newReview = {
        place: Places,
        rating: reviewRating,
        text: reviewText,
        date: Date.now(),
        userName: user?.name || "User",
        userId: user?.uid
      };
      await addOrUpdateGlobalReview(Places, newReview);
      const newReviews = [
        newReview,
        ...(user.reviews || []).filter(r => r.place !== Places)
      ];
      await updateProfile({ reviews: newReviews });
      setReviewRating(0);
      setReviewText("");
      setReviewFormOpen(false);
      showSuccess("Review submitted!");
    } catch (err) {
      showError("Error submitting review: " + (err.message || err));
    }
    setReviewBusy(false);
  }

  function openReviewForm() {
    if (!user) {
      setShowLoginModal(true);
    } else if (!userReview) {
      setReviewFormOpen(true);
      setReviewRating(0);
      setReviewText("");
    }
  }

  function startEditReview(r) {
    setEditingReview(true);
    setEditText(r.text);
    setEditRating(r.rating);
  }
  async function handleEditSave(e) {
    e.preventDefault();
    if (!user || !user.uid) return;
    setReviewBusy(true);
    try {
      const updatedReview = {
        place: Places,
        rating: editRating,
        text: editText,
        date: Date.now(),
        userName: user.name || "User",
        userId: user.uid
      };
      await addOrUpdateGlobalReview(Places, updatedReview);
      const newUserReviews = [
        updatedReview,
        ...(user.reviews || []).filter(r => r.place !== Places)
      ];
      await updateProfile({ reviews: newUserReviews });
      showSuccess("Review updated!");
      setEditingReview(false);
      setEditText("");
      setEditRating(0);
    } catch (err) {
      showError("Error updating review.");
    }
    setReviewBusy(false);
  }
  async function handleDeleteReview() {
    if (!user || !user.uid) return;
    setReviewBusy(true);
    try {
      await deleteGlobalReview(Places, user.uid);
      const newUserReviews = (user.reviews || []).filter(r => r.place !== Places);
      await updateProfile({ reviews: newUserReviews });
      showSuccess("Review deleted!");
      setEditingReview(false);
      setEditText("");
      setEditRating(0);
    } catch (err) {
      showError("Error deleting review.");
    }
    setReviewBusy(false);
  }

  if (!place) return null;

  let sortedReviews = allReviews.slice().sort((a, b) => (b.date || 0) - (a.date || 0));
  const numReviews = sortedReviews.length;
  const avgRating = numReviews
    ? (sortedReviews.reduce((sum, r) => sum + (parseFloat(r.rating) || 0), 0) / numReviews)
    : 0;

  return (
    <div
      className="panel panel--slide"
      style={{
        position: "relative",
        width: "min(98vw, 420px)",
        maxWidth: "99vw",
        minWidth: "230px",
        maxHeight: "calc(100vh - 44px)",
        zIndex: 30,
        padding: "18px 18px 18px 26px",
        display: "flex",
        flexDirection: "column",
        fontSize: 17,
        overflow: "hidden"
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 14,
          right: 20,
          fontSize: 28,
          cursor: "pointer",
          color: "var(--muted)",
          background: "none",
          border: "none",
          lineHeight: 1,
          zIndex: 2
        }}
        title="Close"
      >
        ×
      </button>

      {/* Place info (Place name + rating) */}
      <b
        className="panel-title"
        style={{
          fontSize: 23,
          marginBottom: 2,
          wordBreak: "break-word",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {Places}
        {numReviews > 0 && (
          <span className="rating-pill" style={{
            display: "flex",
            alignItems: "center",
            marginLeft: 8,
            fontWeight: 700,
            fontSize: 16,
            borderRadius: 10,
            padding: "3px 10px 3px 8px"
          }}>
            {avgRating.toFixed(1)}
            <span style={{ color: "var(--accent-warm)", fontSize: 19, marginLeft: 3 }}>★</span>
            <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 8, fontSize: 14 }}>
              ({numReviews})
            </span>
          </span>
        )}
      </b>
      <div style={{ fontSize: 15, color: "var(--muted)", marginBottom: 4 }}>
        {Location && <><b>Location:</b> {Location}<br /></>}
        {District && <><b>District:</b> {District}<br /></>}
        {Category && <><b>Category:</b> {Category}<br /></>}
      </div>

      {/* Favorites */}
      <div style={{ margin: "6px 0 12px 0" }}>
        {user ? (
          Array.isArray(user.favorites) && user.favorites.includes(Places) ? (
            <button
              onClick={handleRemoveFavorite}
              className="soft-button"
              style={{
                color: "#c41c3b",
                padding: "7px 16px",
                fontSize: 15,
                marginRight: 10,
                cursor: favBusy ? "wait" : "pointer"
              }}
              disabled={favBusy}
            >
              {favBusy ? "Updating..." : "Unfavorite"}
            </button>
          ) : (
            <button
              onClick={handleAddFavorite}
              className="soft-button"
              style={{
                color: "var(--accent-strong)",
                padding: "7px 16px",
                fontSize: 15,
                marginRight: 10,
                cursor: favBusy ? "wait" : "pointer"
              }}
              disabled={favBusy}
            >
              {favBusy ? "Adding..." : "Add to Favorites"}
            </button>
          )
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="soft-button"
            style={{
              color: "var(--accent-strong)",
              padding: "7px 16px",
              fontSize: 15,
              marginRight: 10,
              cursor: "pointer"
            }}
          >
            Add to Favorites
          </button>
        )}
      </div>


      {/* Directions/Info */}
      <div style={{ display: "flex", gap: 12, marginTop: 7, marginBottom: 7, flexWrap: "wrap" }}>
        <button
          onClick={() => onDirections(place)}
          className="primary-button"
          style={{
            padding: "8px 20px",
            fontSize: 16
          }}
          title="Directions via OpenRouteService"
        >
          Directions
        </button>
        {wikiUrl && (
          <a href={wikiUrl} target="_blank" rel="noopener noreferrer">
            <button
              className="primary-button"
              style={{
                background: "var(--accent-strong)",
                padding: "8px 20px",
                fontSize: 16
              }}
            >
              More Info
            </button>
          </a>
        )}
        {Latitude && Longitude && (
          <button
            className="primary-button"
            style={{
              background: "var(--accent-strong)",
              padding: "8px 20px",
              fontSize: 16
            }}
            title="Google Maps Directions"
            onClick={handleGoogleDirections}
          >
            Google Maps
          </button>
        )}
      </div>

      {/* Route Info */}
      {routeSummary && (
        <div
          className="panel panel--slide"
          style={{
            padding: "14px 24px 12px 20px",
            margin: "16px 0 12px 0",
            fontSize: 17,
            position: "relative"
          }}
        >
          <button
            onClick={onClearRoute}
            title="Clear route"
            style={{
              position: "absolute",
              top: 6,
              right: 9,
              border: "none",
              background: "none",
              color: "var(--muted)",
              fontSize: 24,
              cursor: "pointer",
              fontWeight: 600
            }}
          >&times;</button>
          <b style={{ fontFamily: "var(--font-display)", color: "var(--accent-strong)" }}>Route Info</b><br />
          <span>Distance: <b>{(routeSummary.distance / 1000).toFixed(1)} km</b></span><br />
          <span>Time: <b>{Math.round(routeSummary.duration / 60)} min</b></span><br />
          <span>
            ETA: <b>{formatArrivalTime(routeSummary.duration)}</b>
          </span>
        </div>
      )}

      {/* Main content */}
      <div
        style={{
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          marginBottom: 2,
        }}
      >
        {/* Weather */}
        <div
          className="panel"
          style={{
            margin: "10px 0 13px 0",
            fontSize: 16,
            padding: "9px 15px",
            minHeight: 40
          }}
        >
          <b style={{ fontFamily: "var(--font-display)", color: "var(--accent-strong)" }}>Weather:</b>{" "}
          {weather === null && !weatherErr && <i>Loading...</i>}
          {weatherErr && <span style={{ color: "var(--ink)" }}>{weatherErr}</span>}
          {weather && (
            <>
              <img
                src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`}
                alt={weather.weather[0].description}
                style={{ verticalAlign: "middle", marginRight: 4 }}
              />
              <b>{Math.round(weather.main.temp)}&deg;C</b>, {weather.weather[0].main}
              {weather.wind && (
                <span style={{ color: "var(--muted)", marginLeft: 12 }}>
                  Wind: {weather.wind.speed} m/s
                </span>
              )}
            </>
          )}
        </div>
        {imageUrl && imageUrl !== "null" && (
          <img
            src={imageUrl}
            alt={Places}
            style={{
              width: "100%",
              maxHeight: 270,
              borderRadius: 12,
              boxShadow: "0 2px 14px #0001",
              margin: "0 0 14px 0",
              objectFit: "contain",
              display: "block",
              background: "#fafafa"
            }}
          />
        )}
        {Description && (
          <div
            style={{
              marginBottom: 8,
              lineHeight: 1.54,
              fontSize: 16,
              color: "var(--ink)",
              whiteSpace: "pre-line"
            }}
          >
            <b style={{ fontFamily: "var(--font-display)", color: "var(--accent-strong)" }}>Description:</b> {Description}
          </div>
        )}

        {/* Nearby */}
        {nearby.length > 0 && (
          <div
            className="panel"
            style={{
              marginTop: 10,
              marginBottom: 3,
              padding: "10px 13px"
            }}
          >
            <b style={{ fontFamily: "var(--font-display)", color: "var(--accent-strong)" }}>Nearby Places:</b>
            <ul style={{ margin: "7px 0 0 10px", padding: 0 }}>
              {nearby.map((p, idx) => (
                <li key={idx}>
                  <a
                    href="#"
                    style={{ color: "var(--accent-strong)" }}
                    onClick={e => {
                      e.preventDefault();
                      onClose && onClose();
                      setTimeout(() =>
                        onSelectPlace && onSelectPlace(p),
                        150
                      );
                    }}
                  >
                    {p.Places}
                  </a>
                  {p.Location && <span style={{ color: "var(--muted)", marginLeft: 4, fontSize: 14 }}>({p.Location})</span>}
                  {p.Category && <span style={{ color: "var(--muted)", marginLeft: 4, fontSize: 13 }}>— {p.Category}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Reviews */}
        <hr style={{ border: "none", borderTop: "1.5px solid rgba(27, 38, 49, 0.12)", margin: "22px 0 10px 0" }} />
        <div style={{ fontWeight: 700, fontSize: 19, color: "var(--accent-strong)", marginBottom: 6, fontFamily: "var(--font-display)" }}>
          User Reviews
        </div>
        <div
          className="panel"
          style={{
            padding: "10px 0 10px 0",
            marginBottom: 8,
            maxHeight: 220,
            overflowY: "auto",
            minHeight: 40
          }}
        >
          {firstLoad && loadingAllReviews && (
            <div style={{ marginTop: 10, color: "var(--muted)" }}>Loading user reviews…</div>
          )}
          {!loadingAllReviews && sortedReviews.length === 0 && (
            <div style={{ marginTop: 10, color: "var(--muted)" }}><i>No reviews from users yet.</i></div>
          )}
          {!loadingAllReviews && sortedReviews.length > 0 && (
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              width: "100%"
            }}>
              {sortedReviews.map((r, i) => (
                <li
                  key={i}
                  className="panel"
                  style={{
                    marginBottom: 14,
                    padding: "13px 15px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 13,
                    borderLeft: (user && r.userId === user?.uid)
                      ? "4px solid var(--accent)"
                      : "4px solid transparent",
                    background: (user && r.userId === user?.uid) ? "rgba(15, 91, 115, 0.08)" : undefined
                  }}
                >
                  {/* Avatar and Name */}
                  <div style={{ minWidth: 42, textAlign: "center" }}>
                    <span
                          style={{
                            display: "inline-block",
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "var(--accent)",
                            color: "#fff",
                            textAlign: "center",
                            fontSize: 18,
                            lineHeight: "32px",
                            fontWeight: 700
                          }}
                        >
                          {r.userName?.[0]?.toUpperCase() || "?"}
                        </span>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        marginTop: 3,
                        color: "var(--ink)"
                      }}
                    >
                      {r.userName || "User"}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 1 }}>
                      {r.date && new Date(r.date).toLocaleDateString()}
                    </div>
                  </div>
                  {/* Review Body & Edit/Delete */}
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 3, display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ color: "var(--accent-warm)", fontSize: 20, letterSpacing: 2 }}>
                        {"★".repeat(r.rating)}
                      </span>
                      {/* Only show Edit/Delete for current user's review */}
                      {user && r.userId === user?.uid && !editingReview && (
                        <span>
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--accent)",
                              cursor: "pointer",
                              fontSize: 15,
                              marginRight: 3
                            }}
                            onClick={() => startEditReview(r)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              color: "#c41c3b",
                              cursor: "pointer",
                              fontSize: 15
                            }}
                            onClick={handleDeleteReview}
                          >
                            🗑️ Delete
                          </button>
                        </span>
                      )}
                    </div>
                    {/* Show plain review text (not editable unless editing own review) */}
                    {(!editingReview || r.userId !== user?.uid) && (
                      <div
                        style={{
                          color: "var(--ink)",
                          fontSize: 16,
                          marginLeft: 1,
                          whiteSpace: "pre-line",
                          lineHeight: 1.55,
                          wordBreak: "break-word",
                          overflowX: "hidden",
                          maxWidth: "100%"
                        }}
                      >
                        {r.text}
                      </div>
                    )}
                    {/* Show edit form for current user's review */}
                    {user && r.userId === user?.uid && editingReview && (
                      <form onSubmit={handleEditSave}>
                        <span>
                          {[1, 2, 3, 4, 5].map(star => (
                            <label key={star} style={{ cursor: "pointer" }}>
                              <input
                                type="radio"
                                name="edit-stars"
                                value={star}
                                checked={editRating === star}
                                onChange={() => setEditRating(star)}
                                style={{ display: "none" }}
                                required
                              />
                              <span
                                style={{
                                  fontSize: 21,
                                  color: editRating >= star ? "var(--accent-warm)" : "var(--muted)"
                                }}
                              >
                                ★
                              </span>
                            </label>
                          ))}
                        </span>
                        <br />
                        <AutoGrowTextarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          placeholder="Edit your review..."
                          required
                        />
                        <br />
                        <button
                          type="submit"
                          disabled={reviewBusy}
                          className="primary-button"
                          style={{
                            padding: "7px 20px",
                            fontSize: 16,
                            marginTop: 6
                          }}
                        >
                          {reviewBusy ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReview(false)}
                          style={{
                            background: "none",
                            color: "var(--muted)",
                            border: "none",
                            fontSize: 15,
                            marginLeft: 8
                          }}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add Review Button (always visible) */}
        {!userReview && !reviewFormOpen && (
          <div style={{ textAlign: "left", marginBottom: 18 }}>
            <button
              onClick={openReviewForm}
              className="primary-button"
              style={{
                padding: "10px 25px",
                fontSize: 17,
                marginTop: 5,
                marginBottom: 0
              }}
            >
              Add Review
            </button>
          </div>
        )}

        {/* Review form */}
        {user && !userReview && reviewFormOpen && (
          <form style={{ marginBottom: 16 }} onSubmit={handleReviewSubmit}>
            <div style={{ fontWeight: 500 }}>Your Review:</div>
            <span>
              {[1, 2, 3, 4, 5].map(star => (
                <label key={star} style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="stars"
                    value={star}
                    checked={reviewRating === star}
                    onChange={() => setReviewRating(star)}
                    style={{ display: "none" }}
                    required
                  />
                  <span
                    style={{
                      fontSize: 21,
                      color: reviewRating >= star ? "var(--accent-warm)" : "var(--muted)",
                      cursor: "pointer"
                    }}
                  >
                    ★
                  </span>
                </label>
              ))}
            </span>
            <br />
            <AutoGrowTextarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Write your review..."
              required
            />
            <br />
            <button
              type="submit"
              disabled={reviewBusy}
              className="primary-button"
              style={{
                padding: "7px 20px",
                fontSize: 16,
                marginTop: 6
              }}
            >
              {reviewBusy ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setReviewFormOpen(false)}
              style={{
                background: "none",
                color: "var(--muted)",
                border: "none",
                fontSize: 16,
                marginLeft: 12
              }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Login/Signup Modal */}
        {showLoginModal && (
          <LoginSignupModal
            onLogin={async (profile) => {
              await login(profile);
              setShowLoginModal(false);
              setReviewFormOpen(true);
            }}
            onClose={() => setShowLoginModal(false)}
          />
        )}

      </div>
    </div>
  );
}
