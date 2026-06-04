import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import { MAPTILER_KEY } from "../config";
import PlacePanel from "./PlacePanel";
import SearchBar from "./SearchBar";
import FilterBar from "./FilterBar";
import ProfileButton from "./ProfileButton";
import ProfilePanel from "./ProfilePanel";
import LoginSignupModal from "./LoginSignupModal";
import MapLegend from "./MapLegend";
import "maplibre-gl/dist/maplibre-gl.css";
import PopularNearYou from "./PopularNearYou";

import { useMapInitialization } from "../hooks/useMapInitialization";
import { useMapRouting } from "../hooks/useMapRouting";
import { useUserLocation } from "../hooks/useUserLocation";
import { useUser } from "../contexts/UserContext";
import { MapProvider } from "../contexts/MapContext";

const basemaps = {
  osm: `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_KEY}`,
};

function runWhenStyleReady(map, fn) {
  if (map && map.isStyleLoaded && map.isStyleLoaded()) {
    fn();
  } else if (map && map.once) {
    map.once("style.load", fn);
  }
}

export default function MapContainer() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    const handler = () => setShowLogin(true);
    window.addEventListener("openLoginModal", handler);
    return () => window.removeEventListener("openLoginModal", handler);
  }, []);

  useEffect(() => {
    const m = new maplibregl.Map({
      container: mapRef.current,
      style: basemaps.osm,
      center: [73.5, 18.5],
      zoom: 7,
    });
    setMap(m);
    return () => m.remove();
  }, []);

  const { places, mhBorder } = useMapInitialization(map);
  const userLoc = useUserLocation(map);
  const { routeSummary, clearRoute, handleShowRoute } = useMapRouting(map);

  const [selected, setSelected] = useState(null);
  
  const { user, login, logout, updateProfile } = useUser();
  const [showProfile, setShowProfile] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Multi-select state
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);

  const [searchActive, setSearchActive] = useState(false);

  const categories = useMemo(() =>
    Array.from(new Set(places.map(f => f.properties.Category).filter(Boolean))).sort(),
    [places]
  );
  const districts = useMemo(() =>
    Array.from(new Set(places.map(f => f.properties.District).filter(Boolean))).sort(),
    [places]
  );
  const placeList = useMemo(() =>
    places.map(f => {
      const lon = f.geometry?.coordinates ? f.geometry.coordinates[0] : f.properties?.Longitude;
      const lat = f.geometry?.coordinates ? f.geometry.coordinates[1] : f.properties?.Latitude;
      return {
        ...f.properties,
        Longitude: lon,
        Latitude: lat,
        ...f,
        properties: undefined
      };
    }),
    [places]
  );

  const filteredPlaces = useMemo(() =>
    placeList.filter(p => {
      const matchCat = selectedCategories.length === 0 || selectedCategories.includes(p.Category);
      const matchDist = selectedDistricts.length === 0 || selectedDistricts.includes(p.District);
      return matchCat && matchDist;
    }),
    [placeList, selectedCategories, selectedDistricts]
  );

  async function handleLogin(userProfile) {
    await login(userProfile);
    setShowLogin(false);
  }

  // --- Show all places always (ONLY CIRCLE MARKERS) ---
  useEffect(() => {
    if (!map) return;
    runWhenStyleReady(map, () => {
      if (!filteredPlaces || filteredPlaces.length === 0) {
        if (map.getSource("places")) {
          map.getSource("places").setData({ type: "FeatureCollection", features: [] });
        }
        return;
      }

      const features = filteredPlaces.map(f => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(f.Longitude), Number(f.Latitude)]
        },
        properties: { ...f }
      }));

      const geojson = {
        type: "FeatureCollection",
        features
      };

      if (map.getSource("places")) {
        map.getSource("places").setData(geojson);
      } else {
        map.addSource("places", {
          type: "geojson",
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "places",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#51bbd6", 10,
              "#f1f075", 50,
              "#f28cb1"
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              15, 10,
              22, 50,
              30
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff"
          }
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "places",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 14
          }
        });

        map.addLayer({
          id: "places-points",
          type: "circle",
          source: "places",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 7,
            "circle-color": [
              "match",
              ["get", "Category"],
              "Fort", "#d32f2f",
              "Temple", "#f57c00",
              "Cave", "#7b1fa2",
              "Beach", "#0288d1",
              "Hill Station", "#388e3c",
              "Museum", "#00796b",
              "Dam", "#1976d2",
              "Waterfall", "#0288d1",
              "National Park", "#4caf50",
              "Wildlife Sanctuary", "#4caf50",
              "Palace", "#c2185b",
              "Lake", "#03a9f4",
              "Hot Spring", "#fbc02d",
              "Historical Monument", "#795548",
              "Tomb", "#5d4037",
              "Stepwell", "#607d8b",
              "Mosque", "#009688",
              "Church", "#5c6bc0",
              "Synagogue", "#3f51b5",
              "#ffb700"
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#333",
          }
        });

        // Map events for places
        map.on("click", "places-points", (e) => {
          handleSelectPlace(e.features[0].properties);
        });
        map.on("mouseenter", "places-points", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "places-points", () => {
          map.getCanvas().style.cursor = "";
        });

        // Map events for clusters
        map.on("click", "clusters", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          const clusterId = features[0].properties.cluster_id;
          map.getSource("places").getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          });
        });
        map.on("mouseenter", "clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "clusters", () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });
  }, [map, filteredPlaces]);

  // --- FlyTo Effects ---
  useEffect(() => {
    if (!map || selectedDistricts.length !== 1) return;
    const features = places.filter(f => f.properties.District === selectedDistricts[0]);
    if (!features || features.length === 0) return;
    const points = features.map(f => {
      const lng = Number(f.geometry?.coordinates ? f.geometry.coordinates[0] : f.properties?.Longitude || f.Longitude);
      const lat = Number(f.geometry?.coordinates ? f.geometry.coordinates[1] : f.properties?.Latitude || f.Latitude);
      return turf.point([lng, lat]);
    });
    const fc = turf.featureCollection(points);
    const bbox = turf.bbox(fc);
    if (bbox[0] === bbox[2] && bbox[1] === bbox[3]) {
      bbox[0] -= 0.07; bbox[2] += 0.07; bbox[1] -= 0.07; bbox[3] += 0.07;
    }
    map.fitBounds(bbox, { padding: 35, duration: 800 });
  }, [selectedDistricts, places, map]);

  useEffect(() => {
    if (!map) return;
    if (selectedCategories.length === 1) {
      const features = places.filter(f => f.properties.Category === selectedCategories[0]);
      if (!features || features.length === 0) return;
      const points = features.map(f => {
        const lng = Number(f.geometry?.coordinates ? f.geometry.coordinates[0] : f.properties?.Longitude || f.Longitude);
        const lat = Number(f.geometry?.coordinates ? f.geometry.coordinates[1] : f.properties?.Latitude || f.Latitude);
        return turf.point([lng, lat]);
      });
      const fc = turf.featureCollection(points);
      const bbox = turf.bbox(fc);
      if (bbox[0] === bbox[2] && bbox[1] === bbox[3]) {
        bbox[0] -= 0.07; bbox[2] += 0.07; bbox[1] -= 0.07; bbox[3] += 0.07;
      }
      map.fitBounds(bbox, { padding: 35, duration: 800 });
    }
  }, [selectedCategories, places, map]);

  useEffect(() => {
    if (!map || !mhBorder) return;
    if (selectedDistricts.length === 0 && selectedCategories.length === 0) {
      const bounds = turf.bbox(mhBorder);
      map.fitBounds(bounds, { padding: 30, duration: 700 });
    }
  }, [selectedDistricts, selectedCategories, map, mhBorder]);

  function handleSelectPlace(p) {
    clearRoute();
    setShowProfile(false);
    setSelected(p);
    if (map && p.Longitude && p.Latitude) {
      map.flyTo({
        center: [Number(p.Longitude), Number(p.Latitude)],
        zoom: 13,
        essential: true
      });
    }
  }

  function handleClosePanel() {
    setSelected(null);
    clearRoute();
    if (map && mhBorder) {
      const bounds = turf.bbox(mhBorder);
      map.fitBounds(bounds, { padding: 30 });
    }
  }

  return (
    <MapProvider value={{ map, places, filteredPlaces, selected, handleSelectPlace, handleShowRoute, routeSummary, clearRoute, mhBorder, handleClosePanel }}>
      <div className="map-shell">
      <div className="toolbar">
        <SearchBar
          onFocus={() => setSearchActive(true)}
          onBlur={() => setSearchActive(false)}
        />
        <FilterBar
          categories={categories}
          districts={districts}
          selectedCategories={selectedCategories}
          setSelectedCategories={cats => { setSelectedCategories(cats); setSelected(null); clearRoute(); }}
          selectedDistricts={selectedDistricts}
          setSelectedDistricts={dists => { setSelectedDistricts(dists); setSelected(null); clearRoute(); }}
        />
        <ProfileButton user={user} onClick={() => {
          setSelected(null);
          if (user) setShowProfile(true);
          else setShowLogin(true);
        }} />
      </div>

      {!searchActive && !selected && (
        <PopularNearYou
          userLocation={userLoc}
          selectedDistricts={selectedDistricts}
        />
      )}

      {selected && (
        <div style={{ position: "absolute", top: 0, right: 0, width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", pointerEvents: "none", zIndex: 51 }}>
          <div style={{ marginRight: 18, pointerEvents: "auto" }}>
            <PlacePanel />
          </div>
        </div>
      )}

      {showLogin && <LoginSignupModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />}

      {showProfile && (
        <ProfilePanel
          user={user}
          onClose={() => setShowProfile(false)}
          onLogout={() => { logout(); setShowProfile(false); }}
        />
      )}
      {!selected && <MapLegend />}
      <div ref={mapRef} style={{ width: "100vw", height: "100vh" }} />
    </div>
    </MapProvider>
  );
}
