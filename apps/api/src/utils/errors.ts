import type { ErrorRequestHandler, Response } from 'express'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message)
  }
}

export function sendError(res: Response, error: ApiError) {
  return res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? {},
    },
  })
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  sendError(
    res,
    error instanceof ApiError ? error : new ApiError('internal_error', 'Internal server error', 500),
  )
}
