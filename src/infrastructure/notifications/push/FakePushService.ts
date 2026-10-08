import { inject, injectable } from 'tsyringe';
import { NOTIFICATION_SINK, type NotificationSink } from '../../../domain/index.js';
import type { PushPayload, PushService } from './PushService.js';

/** Sends nothing: records a simulated delivery through the sink. */
@injectable()
export class FakePushService implements PushService {
  constructor(@inject(NOTIFICATION_SINK) private readonly sink: NotificationSink) {}

  dispatch(payload: PushPayload): Promise<{ ok: boolean; id: string }> {
    this.sink.record({ channel: 'PUSH', recipient: payload.deviceId, title: payload.heading });
    return Promise.resolve({ ok: true, id: `push-${payload.deviceId}` });
  }
}
