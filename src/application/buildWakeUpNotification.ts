import type { Track, UserId, WakeUpNotification } from '../domain/index.js';

/** Pure: the user-visible text is French (SFD §9); the recipient is the user id (RG-14). */
export function buildWakeUpNotification(userId: UserId, track: Track): WakeUpNotification {
  return {
    recipient: userId,
    title: 'Réveil musical',
    body: `C'est l'heure de se réveiller avec « ${track.title} » de ${track.artist}.`,
    track,
  };
}
