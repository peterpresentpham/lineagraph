// Thrown by services; the API turns it into an HTTP response with the same status.
// Messages are shown to the user, so they are written in Vietnamese.
export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new ServiceError(404, `Không tìm thấy ${what}`);
