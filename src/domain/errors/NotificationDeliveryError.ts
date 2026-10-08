import { DomainError } from './DomainError.js';

export class NotificationDeliveryError extends DomainError {
  override readonly name = 'NotificationDeliveryError';
}
