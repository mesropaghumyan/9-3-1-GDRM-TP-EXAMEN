import {
  EmailChannelAdapter,
  type EmailClient,
} from '../../src/infrastructure/notifications/email/index.js';
import {
  SmsChannelAdapter,
  type SmsGateway,
} from '../../src/infrastructure/notifications/sms/index.js';
import {
  PushChannelAdapter,
  type PushPayload,
  type PushService,
} from '../../src/infrastructure/notifications/push/index.js';
import { notificationChannelContract } from './notificationChannel.contract.js';

const body = "C'est l'heure";

notificationChannelContract(
  'EmailChannelAdapter',
  'EMAIL',
  () => {
    const calls: unknown[][] = [];
    const client: EmailClient = {
      sendMail: (...args) => {
        calls.push(args);
      },
    };
    return { channel: new EmailChannelAdapter(client), received: () => calls[0] };
  },
  () =>
    new EmailChannelAdapter({
      sendMail: () => {
        throw new Error('smtp down');
      },
    }),
  ['alice', 'Réveil musical', `<p>${body}</p>`, true],
);

notificationChannelContract(
  'SmsChannelAdapter',
  'SMS',
  () => {
    const calls: unknown[][] = [];
    const gateway: SmsGateway = {
      push: (...args) => {
        calls.push(args);
        return Promise.resolve(true);
      },
    };
    return { channel: new SmsChannelAdapter(gateway), received: () => calls[0] };
  },
  () => new SmsChannelAdapter({ push: () => Promise.resolve(false) }),
  ['alice', body],
);

notificationChannelContract(
  'PushChannelAdapter',
  'PUSH',
  () => {
    const payloads: PushPayload[] = [];
    const service: PushService = {
      dispatch: (payload) => {
        payloads.push(payload);
        return Promise.resolve({ ok: true, id: '1' });
      },
    };
    return { channel: new PushChannelAdapter(service), received: () => payloads[0] };
  },
  () => new PushChannelAdapter({ dispatch: () => Promise.resolve({ ok: false, id: '' }) }),
  { deviceId: 'alice', heading: 'Réveil musical', message: body },
);
