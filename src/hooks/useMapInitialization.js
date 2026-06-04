import { useEffect, useState } from "react";
import * as turf from "@turf/turf";
import { loadGeoJSONs } from "../utils/geojsonLoader";

const geojsonFiles = ["/data/cultural_places.geojson"];
const mhBorderFile = "/data/mh_border.geojson";
const divisionsFile = "/data/divisions.geojson";

export function useMapInitialization(map) {
  const [places, setPlaces] = useState([]);
  const [mhBorder, setMhBorder] = useState(null);

  useEffect(() => {
    if (!map) return;
    loadGeoJSONs(geojsonFiles).then(geojson => {
      if (!geojson || !geojson.features) return;
      setPlaces(geojson.features);
    });
  }, [map]);

  useEffect(() => {
    if (!map) return;
    let removed = false;
    function addLineLayer(sourceName, layerId, url, color, width, cb) {
      fetch(url)
        .then(res => res.json())
        .then(geojson => {
          if (removed || !map) return;
          if (map.getLayer && map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource && map.getSource(sourceName)) map.removeSource(sourceName);
          map.addSource(sourceName, { type: "geojson", data: geojson });
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceName,
            paint: { "line-color": color, "line-width": width, "line-opacity": 0.9 }
          });
          if (cb) cb(geojson);
        });
    }
    const init = () => {
      addLineLayer("border", "border-line", mhBorderFile, "#bc004c", 3, (geojson) => {
        setMhBorder(geojson);
        const bounds = turf.bbox(geojson);
        map.fitBounds(bounds, { padding: 30 });
      });
      addLineLayer("divisions", "divisions-line", divisionsFile, "#2095F3", 2);
    };
    if (map.isStyleLoaded && map.isStyleLoaded()) init();
    else if (map.once) map.once("style.load", init);

    return () => {
      removed = true;
      ["border-line", "divisions-line"].forEach(layerId => {
        if (map && map.getLayer && map.getLayer(layerId)) map.removeLayer(layerId);
      });
      ["border", "divisions"].forEach(sourceName => {
        if (map && map.getSource && map.getSource(sourceName)) map.removeSource(sourceName);
      });
    };
  }, [map]);

  return { places, mhBorder };
}
