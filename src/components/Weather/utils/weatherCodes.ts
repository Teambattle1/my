import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain,
  CloudRainWind, CloudSnow, Snowflake, CloudLightning, CloudMoon, Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface WeatherCodeInfo {
  icon: LucideIcon;
  iconNight?: LucideIcon;
  label: string;
}

export const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0:  { icon: Sun,            iconNight: Moon,     label: 'Klart' },
  1:  { icon: Sun,            iconNight: Moon,     label: 'Overvejende klart' },
  2:  { icon: CloudSun,       iconNight: CloudMoon,label: 'Delvist skyet' },
  3:  { icon: Cloud,                                label: 'Overskyet' },
  45: { icon: CloudFog,                             label: 'Tåge' },
  48: { icon: CloudFog,                             label: 'Rimtåge' },
  51: { icon: CloudDrizzle,                         label: 'Let støvregn' },
  53: { icon: CloudDrizzle,                         label: 'Støvregn' },
  55: { icon: CloudDrizzle,                         label: 'Kraftig støvregn' },
  61: { icon: CloudRain,                            label: 'Let regn' },
  63: { icon: CloudRain,                            label: 'Regn' },
  65: { icon: CloudRainWind,                        label: 'Kraftig regn' },
  71: { icon: CloudSnow,                            label: 'Let sne' },
  73: { icon: CloudSnow,                            label: 'Sne' },
  75: { icon: Snowflake,                            label: 'Kraftig sne' },
  77: { icon: Snowflake,                            label: 'Snekorn' },
  80: { icon: CloudRain,                            label: 'Byger' },
  81: { icon: CloudRain,                            label: 'Kraftige byger' },
  82: { icon: CloudRainWind,                        label: 'Voldsomme byger' },
  85: { icon: CloudSnow,                            label: 'Snebyger' },
  86: { icon: CloudSnow,                            label: 'Kraftige snebyger' },
  95: { icon: CloudLightning,                       label: 'Torden' },
  96: { icon: CloudLightning,                       label: 'Torden m. hagl' },
  99: { icon: CloudLightning,                       label: 'Kraftig torden' },
};

export function getWeatherInfo(code: number | null | undefined, isDay = true): WeatherCodeInfo {
  if (code === null || code === undefined) {
    return { icon: Cloud, label: 'Ukendt' };
  }
  const info = WEATHER_CODES[code] ?? { icon: Cloud, label: `Kode ${code}` };
  if (!isDay && info.iconNight) {
    return { ...info, icon: info.iconNight };
  }
  return info;
}

export function windDirectionLabel(degrees: number): string {
  const dirs = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
  return dirs[Math.round(((degrees % 360) / 45)) % 8];
}

export function windColorByStrength(mps: number): string {
  if (mps < 5)  return '#22c55e';
  if (mps < 10) return '#eab308';
  if (mps < 15) return '#f97316';
  return '#ef4444';
}
