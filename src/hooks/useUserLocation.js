import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export function useUserLocation(map) {
  const [userLoc, setUserLoc] = useState(null);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        setUserLoc({ lat, lng });
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([lng, lat]);
        } else {
          userMarkerRef.current = new maplibregl.Marker({ color: "#317aff" })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup().setText("Your location"))
            .addTo(map);
        }
      },
      (err) => {}
    );

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [map]);

  return userLoc;
}
