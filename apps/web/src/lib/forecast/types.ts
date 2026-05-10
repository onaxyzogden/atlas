/**
 * forecast/types — shared types + WMO weather-code lookup for the Open-Meteo
 * 7-day forecast surface. Response shapes are re-exported from `apiClient.ts`
 * (single source of truth); this module adds the icon/label mapping the UI
 * components need.
 *
 * WMO codes: https://open-meteo.com/en/docs (search "weather_code"). Mapping
 * collapses neighboring codes to a single icon when the practical farm
 * distinction is small (e.g. 71/73/75 all show as "snow").
 */

import {
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Cloudy,
  Sun,
  type LucideIcon,
} from 'lucide-react';

export type {
  ForecastCurrent,
  ForecastDay,
  ForecastHour,
  WeatherForecastResponse,
} from '../apiClient.js';

export interface WeatherCodeMeta {
  icon: LucideIcon;
  label: string;
  /** Coarse category for chip tinting / dot colors. */
  band: 'clear' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog';
}

const WEATHER_CODE_TABLE: Record<number, WeatherCodeMeta> = {
  0: { icon: Sun, label: 'Clear', band: 'clear' },
  1: { icon: Sun, label: 'Mostly clear', band: 'clear' },
  2: { icon: Cloudy, label: 'Partly cloudy', band: 'cloud' },
  3: { icon: Cloudy, label: 'Overcast', band: 'cloud' },
  45: { icon: CloudFog, label: 'Fog', band: 'fog' },
  48: { icon: CloudFog, label: 'Rime fog', band: 'fog' },
  51: { icon: CloudRain, label: 'Light drizzle', band: 'rain' },
  53: { icon: CloudRain, label: 'Drizzle', band: 'rain' },
  55: { icon: CloudRain, label: 'Heavy drizzle', band: 'rain' },
  56: { icon: CloudRain, label: 'Freezing drizzle', band: 'rain' },
  57: { icon: CloudRain, label: 'Freezing drizzle', band: 'rain' },
  61: { icon: CloudRain, label: 'Light rain', band: 'rain' },
  63: { icon: CloudRain, label: 'Rain', band: 'rain' },
  65: { icon: CloudRain, label: 'Heavy rain', band: 'rain' },
  66: { icon: CloudRain, label: 'Freezing rain', band: 'rain' },
  67: { icon: CloudRain, label: 'Freezing rain', band: 'rain' },
  71: { icon: CloudSnow, label: 'Light snow', band: 'snow' },
  73: { icon: CloudSnow, label: 'Snow', band: 'snow' },
  75: { icon: CloudSnow, label: 'Heavy snow', band: 'snow' },
  77: { icon: CloudSnow, label: 'Snow grains', band: 'snow' },
  80: { icon: CloudRain, label: 'Rain showers', band: 'rain' },
  81: { icon: CloudRain, label: 'Rain showers', band: 'rain' },
  82: { icon: CloudRain, label: 'Heavy showers', band: 'rain' },
  85: { icon: CloudSnow, label: 'Snow showers', band: 'snow' },
  86: { icon: CloudSnow, label: 'Snow showers', band: 'snow' },
  95: { icon: CloudLightning, label: 'Thunderstorm', band: 'storm' },
  96: { icon: CloudHail, label: 'Thunderstorm w/ hail', band: 'storm' },
  99: { icon: CloudHail, label: 'Thunderstorm w/ hail', band: 'storm' },
};

const FALLBACK_META: WeatherCodeMeta = {
  icon: Cloudy,
  label: 'Unknown',
  band: 'cloud',
};

export function weatherCodeMeta(code: number | null | undefined): WeatherCodeMeta {
  if (code == null) return FALLBACK_META;
  return WEATHER_CODE_TABLE[code] ?? FALLBACK_META;
}
