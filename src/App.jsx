import React from "react";
import MapContainer from "./components/MapContainer";
import { UserProvider } from "./contexts/UserContext";

import "./App.css";

function App() {
  return (
    <UserProvider>
      <MapContainer />
    </UserProvider>
  );
}

export default App;
