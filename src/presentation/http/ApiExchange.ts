export interface ApiRequest {
  readonly method: string;
  readonly path: string;
  /** Raw request body (empty string when absent). */
  readonly body: string;
}

export interface ApiResponse {
  readonly status: number;
  readonly contentType: string;
  readonly body: string;
}
