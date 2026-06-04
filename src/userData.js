import { ref, set, get, child, update, remove } from "firebase/database";
import { db } from "./firebase";

// ---- Firebase-safe path helper ----
export function safePlaceKey(name) {
  return (name || "")
    .replace(/\./g, '_')
    .replace(/#/g, '_')
    .replace(/\$/g, '_')
    .replace(/\[/g, '_')
    .replace(/\]/g, '_')
    .replace(/\//g, '_')
    .replace(/\s+/g, '_');
}

// --- User Profile CRUD ---

export async function createUserProfile(user) {
  await set(ref(db, `users/${user.uid}`), {
    uid: user.uid, // Always store uid inside the user node!
    name: user.name,
    from: user.from,
    email: user.email,
    favorites: user.favorites || [],
    reviews: user.reviews || [],
    photoURL: user.photoURL || ""
  });
}

export async function getUserProfile(uid) {
  const snap = await get(child(ref(db), `users/${uid}`));
  if (snap.exists()) {
    const data = snap.val();
    return { ...data, uid }; // always include uid!
  } else {
    return null;
  }
}

export async function updateUserProfile(uid, data) {
  await update(ref(db, `users/${uid}`), data);
}



// ===============================
// === GLOBAL REVIEWS BY PLACE ====
// ===============================

export async function addOrUpdateGlobalReview(placeName, review) {
  // placeName is the *plain string* (e.g., "Prabalgad")
  await set(ref(db, `reviews/${safePlaceKey(placeName)}/${review.userId}`), review);
}

export async function deleteGlobalReview(placeName, userId) {
  // placeName is the *plain string*
  await remove(ref(db, `reviews/${safePlaceKey(placeName)}/${userId}`));
}

export async function getAllGlobalReviewsForPlace(placeName) {
  // placeName is the *plain string*
  const snap = await get(ref(db, `reviews/${safePlaceKey(placeName)}`));
  const reviews = [];
  if (snap.exists()) {
    snap.forEach(childSnap => reviews.push(childSnap.val()));
  }
  return reviews;
}
