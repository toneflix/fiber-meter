import crypto from 'node:crypto'

import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

import { env } from '../../config/env.js'
import { prisma } from '../../db/prisma.js'
import { hash, requireJwt } from '../../middleware/auth.js'
import { ApiError } from '../../utils/errors.js'
import { validate } from '../../utils/validation.js'

export const authRouter = Router()

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

authRouter.post('/auth/register', validate(credentialsSchema.extend({ name: z.string() })), async (req, res) => {
  const developer = await prisma.developer.create({
    data: {
      name: req.body.name,
      email: req.body.email,
      passwordHash: await bcrypt.hash(req.body.password, 10),
    },
  })

  res.status(201).json({
    developer: {
      id: developer.id,
      email: developer.email,
      name: developer.name,
    },
    token: jwt.sign({ sub: developer.id }, env.jwtSecret),
  })
})

authRouter.post('/auth/login', validate(credentialsSchema), async (req, res, next) => {
  const developer = await prisma.developer.findUnique({ where: { email: req.body.email } })

  if (!developer || !(await bcrypt.compare(req.body.password, developer.passwordHash))) {
    return next(new ApiError('invalid_credentials', 'Invalid email or password', 401))
  }

  res.json({
    developer: {
      id: developer.id,
      email: developer.email,
      name: developer.name,
    },
    token: jwt.sign({ sub: developer.id }, env.jwtSecret),
  })
})

authRouter.get('/auth/me', requireJwt, async (req, res) => {
  const developer = await prisma.developer.findUnique({
    where: { id: req.developerId! },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  })

  res.json({ developer })
})

authRouter.post('/api-keys', requireJwt, async (req, res) => {
  const rawKey = `fm_${crypto.randomBytes(24).toString('hex')}`
  const apiKey = await prisma.apiKey.create({
    data: {
      developerId: req.developerId!,
      name: req.body.name ?? 'Default key',
      keyHash: hash(rawKey),
      keyPrefix: rawKey.slice(0, 10),
    },
  })

  res.status(201).json({ ...apiKey, key: rawKey })
})

authRouter.get('/api-keys', requireJwt, async (req, res) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: { developerId: req.developerId! },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      active: true,
      createdAt: true,
    },
  })

  res.json(apiKeys)
})

authRouter.delete('/api-keys/:id', requireJwt, async (req, res) => {
  await prisma.apiKey.updateMany({
    where: {
      id: req.params.id,
      developerId: req.developerId!,
    },
    data: { active: false },
  })

  res.status(204).end()
})
