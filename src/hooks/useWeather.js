import { useState, useEffect } from "react";
import { OPENWEATHERMAP_KEY } from "../config";

// Module-level cache so it persists across component unmounts
const weatherCache = {};
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export function useWeather(place) {
  const [weather, setWeather] = useState(null);
  const [weatherErr, setWeatherErr] = useState(null);

  useEffect(() => {
    if (!place || !place.Latitude || !place.Longitude) {
      setWeather(null);
      setWeatherErr(null);
      return;
    }

    const lat = place.Latitude;
    const lon = place.Longitude;
    const cacheKey = `${lat},${lon}`;
    const now = Date.now();
    
    // Check cache
    if (weatherCache[cacheKey] && now - weatherCache[cacheKey].timestamp < CACHE_DURATION_MS) {
      if (weatherCache[cacheKey].error) {
        setWeatherErr(weatherCache[cacheKey].error);
        setWeather(null);
      } else {
        setWeather(weatherCache[cacheKey].data);
        setWeatherErr(null);
      }
      return;
    }

    setWeather(null);
    setWeatherErr(null);

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_KEY}&units=metric`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.cod === 200) {
          weatherCache[cacheKey] = { timestamp: now, data };
          setWeather(data);
        } else {
          const errStr = "Weather unavailable";
          weatherCache[cacheKey] = { timestamp: now, error: errStr };
          setWeatherErr(errStr);
        }
      })
      .catch(() => {
        const errStr = "Weather unavailable";
        weatherCache[cacheKey] = { timestamp: now, error: errStr };
        setWeatherErr(errStr);
      });
  }, [place]);

  return { weather, weatherErr };
}
