import { inject, injectable } from 'tsyringe';
import { NOTIFICATION_SINK, type NotificationSink } from '../../../domain/index.js';
import type { EmailClient } from './EmailClient.js';

/** Sends nothing: records a simulated delivery through the sink. */
@injectable()
export class FakeEmailClient implements EmailClient {
  constructor(@inject(NOTIFICATION_SINK) private readonly sink: NotificationSink) {}

  sendMail(to: string, subject: string): void {
    this.sink.record({ channel: 'EMAIL', recipient: to, title: subject });
  }
}
