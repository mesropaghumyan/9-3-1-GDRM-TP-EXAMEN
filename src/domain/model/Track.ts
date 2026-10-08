/** A track carries nothing but its title and artist: no provider field may leak here. */
export interface Track {
  readonly title: string;
  readonly artist: string;
}

export function createTrack(title: string, artist: string): Track {
  return Object.freeze({ title, artist });
}
