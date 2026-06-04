import React, { createContext, useContext } from "react";

const MapContext = createContext();

export function MapProvider({ children, value }) {
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  return useContext(MapContext);
}
