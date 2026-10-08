import { inject, injectable } from 'tsyringe';
import { NOTIFICATION_SINK, type NotificationSink } from '../../../domain/index.js';
import type { SmsGateway } from './SmsGateway.js';

/** Sends nothing: records a simulated delivery through the sink. */
@injectable()
export class FakeSmsGateway implements SmsGateway {
  constructor(@inject(NOTIFICATION_SINK) private readonly sink: NotificationSink) {}

  push(phoneNumber: string, text: string): Promise<boolean> {
    this.sink.record({ channel: 'SMS', recipient: phoneNumber, title: text });
    return Promise.resolve(true);
  }
}
