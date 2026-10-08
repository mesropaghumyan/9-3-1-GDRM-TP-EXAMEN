export const CHANNEL_KINDS = ['EMAIL', 'SMS', 'PUSH'] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];
