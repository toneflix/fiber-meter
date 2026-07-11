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
  if (error instanceof ApiError) {
    return sendError(res, error)
  }

  const message = error instanceof Error ? error.message : 'Internal server error'
  return sendError(res, new ApiError('internal_error', message, 500))
}
