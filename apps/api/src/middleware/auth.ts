import crypto from 'node:crypto'

import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import { ApiError } from '../utils/errors.js'

declare global {
  namespace Express {
    interface Request {
      developerId?: string
    }
  }
}

export function hash(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export const requireJwt: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new ApiError('unauthorized', 'Missing bearer token', 401)
    }

    const payload = jwt.verify(token, env.jwtSecret) as { sub: string }
    req.developerId = payload.sub
    next()
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError('unauthorized', 'Invalid bearer token', 401))
  }
}

export const requireApiKey: RequestHandler = async (req, _res, next) => {
  const rawKey = req.headers.authorization?.replace('Bearer ', '') ?? req.headers['x-api-key']?.toString()

  if (!rawKey) {
    return next(new ApiError('unauthorized', 'Missing API key', 401))
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash: hash(rawKey),
      active: true,
    },
  })

  if (!apiKey) {
    return next(new ApiError('unauthorized', 'Invalid API key', 401))
  }

  req.developerId = apiKey.developerId

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  next()
}
