export const TRACK_SOURCES = ['WEATHER', 'USER_FALLBACK', 'LOCAL_FALLBACK'] as const;
export type TrackSource = (typeof TRACK_SOURCES)[number];
