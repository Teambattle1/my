import { useEffect, useState } from 'react';

export interface CurrentWeather {
  temperature: number;
  apparent: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;       // m/s
  windDirection: number;   // degrees
  windGusts: number;       // m/s
  time: string;
}

export interface HourPoint {
  time: string;            // ISO
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourPoint[];
}

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
}

export function useWeather(lat: number | null, lon: number | null) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
      + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m`
      + `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m`
      + `&timezone=Europe/Copenhagen`
      + `&forecast_hours=6`
      + `&wind_speed_unit=ms`
      + `&models=dmi_seamless`;

    fetch(url)
      .then(r => r.ok ? r.json() as Promise<OpenMeteoResponse> : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(json => {
        if (cancelled) return;
        if (!json.current || !json.hourly) {
          setError('Ingen vejrdata');
          return;
        }
        const c = json.current;
        const h = json.hourly;
        const parsed: WeatherData = {
          current: {
            time: c.time,
            temperature: c.temperature_2m,
            apparent: c.apparent_temperature,
            humidity: c.relative_humidity_2m,
            precipitation: c.precipitation,
            weatherCode: c.weather_code,
            isDay: c.is_day === 1,
            windSpeed: c.wind_speed_10m,
            windDirection: c.wind_direction_10m,
            windGusts: c.wind_gusts_10m,
          },
          hourly: h.time.map((t, i) => ({
            time: t,
            temperature: h.temperature_2m[i],
            precipitation: h.precipitation[i],
            precipitationProbability: h.precipitation_probability[i],
            weatherCode: h.weather_code[i],
            windSpeed: h.wind_speed_10m[i],
          })),
        };
        setData(parsed);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message || 'Vejr-fetch fejlede'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [lat, lon]);

  return { data, loading, error };
}
