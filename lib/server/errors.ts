/** An error whose message is safe and useful to show the user. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** True if trying again later, with the same upload, might work. */
    readonly retryable = false,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}
