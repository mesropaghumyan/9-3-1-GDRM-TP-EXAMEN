/** Technical failure of the transport; never exposed beyond the infrastructure layer. */
export class HttpTransportError extends Error {
  override readonly name = 'HttpTransportError';
}
