import type { RequestHandler } from 'express'; import { z } from 'zod'; import { ApiError } from './errors.js';
export const validate=(schema:z.ZodSchema):RequestHandler=>(req,_res,next)=>{const r=schema.safeParse(req.body); if(!r.success) return next(new ApiError('validation_error','Invalid request payload',422,r.error.flatten())); req.body=r.data; next()}
