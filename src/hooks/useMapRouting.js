import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { OPENROUTESERVICE_KEY } from "../config";

export function useMapRouting(map) {
  const destMarkerRef = useRef(null);
  const [routeGeojson, setRouteGeojson] = useState(null);
  const [routeDest, setRouteDest] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);

  function clearRoute() {
    setRouteGeojson(null);
    setRouteDest(null);
    setRouteSummary(null);
  }

  useEffect(() => {
    if (!map) return;
    if (map.getLayer && map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getSource && map.getSource("route")) map.removeSource("route");
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }

    if (!routeGeojson) return;

    map.addSource("route", { type: "geojson", data: routeGeojson });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: { "line-color": "#e74c3c", "line-width": 7, "line-opacity": 0.9 }
    });

    const coords = routeGeojson.geometry?.coordinates;
    if (coords && coords.length > 0) {
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 100, duration: 900 });
    }

    if (routeDest && routeDest.coords) {
      destMarkerRef.current = new maplibregl.Marker({ color: "#e74c3c" })
        .setLngLat(routeDest.coords)
        .setPopup(new maplibregl.Popup().setText(routeDest.name))
        .addTo(map);
    }

    return () => {
      if (map && map.getLayer && map.getLayer("route-line")) map.removeLayer("route-line");
      if (map && map.getSource && map.getSource("route")) map.removeSource("route");
      if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
    };
  }, [routeGeojson, map, routeDest]);

  async function handleShowRoute(dest) {
    if (!dest || !dest.Longitude || !dest.Latitude) {
      alert("Destination not available");
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const start = [pos.coords.longitude, pos.coords.latitude];
      const end = [Number(dest.Longitude), Number(dest.Latitude)];
      const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": OPENROUTESERVICE_KEY
          },
          body: JSON.stringify({ coordinates: [start, end] })
        });
        const data = await resp.json();
        if (!data || !data.features || !data.features[0]) {
          alert("No route found.");
          return;
        }
        setRouteGeojson(data.features[0]);
        setRouteDest({ coords: end, name: dest.Places || dest.NAME || "Destination" });
        setRouteSummary(data.features[0].properties.summary);
      } catch (err) {
        alert("Failed to get directions.");
        clearRoute();
      }
    }, () => alert("Could not get your location."));
  }

  return { routeSummary, clearRoute, handleShowRoute };
}
