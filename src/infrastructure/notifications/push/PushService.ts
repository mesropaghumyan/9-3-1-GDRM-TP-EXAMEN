/** Payload specific to the (simulated) push service. */
export interface PushPayload {
  readonly deviceId: string;
  readonly heading: string;
  readonly message: string;
}

export interface PushService {
  dispatch(payload: PushPayload): Promise<{ ok: boolean; id: string }>;
}
