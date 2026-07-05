import type { RequestHandler } from 'express'
import { z } from 'zod'

import { ApiError } from './errors.js'

export const validate = (schema: z.ZodSchema): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return next(new ApiError('validation_error', 'Invalid request payload', 422, result.error.flatten()))
    }

    req.body = result.data
    next()
  }
}
