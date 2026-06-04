import React, { createContext, useContext, useState } from "react";
import { getUserProfile, updateUserProfile } from "../userData";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return (u && u.uid) ? u : null;
  });

  const saveUser = (u) => {
    setUser(u);
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
  };

  const login = async (userProfile) => {
    if (!userProfile || !userProfile.uid) {
      saveUser(null);
      return;
    }
    const latest = await getUserProfile(userProfile.uid);
    saveUser(latest);
  };

  const logout = () => {
    saveUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    await updateUserProfile(user.uid, updates);
    const refreshed = await getUserProfile(user.uid);
    saveUser(refreshed);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, updateProfile, saveUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
