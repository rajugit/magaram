import type { Response } from 'express';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown[];
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

export function sendSuccess<T>(response: Response, data: T, message = 'Success'): Response {
  return response.status(200).json({
    success: true,
    data,
    message,
    requestId: response.locals.requestId,
  });
}

export function sendError(response: Response, status: number, error: ApiErrorPayload): Response {
  return response.status(status).json({
    success: false,
    error,
    requestId: response.locals.requestId,
  });
}
