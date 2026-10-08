export const WEATHER_TYPES = ['SUNNY', 'RAIN', 'SNOW', 'CLOUDY'] as const;
export type WeatherType = (typeof WEATHER_TYPES)[number];
