export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }

  static badRequest(message = 'Bad request') {
    return new HttpError(400, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Not found') {
    return new HttpError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new HttpError(409, message);
  }
}
