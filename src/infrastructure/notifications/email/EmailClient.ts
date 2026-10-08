/** Interface of the (simulated) mail client: deliberately unlike the other channels. */
export interface EmailClient {
  sendMail(to: string, subject: string, html: string, highPriority: boolean): void;
}
