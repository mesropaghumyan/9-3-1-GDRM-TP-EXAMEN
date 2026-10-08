/** Interface of the (simulated) SMS gateway: asynchronous, answers with a boolean. */
export interface SmsGateway {
  push(phoneNumber: string, text: string): Promise<boolean>;
}
