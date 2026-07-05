import type { ErrorRequestHandler, Response } from 'express';
export class ApiError extends Error{constructor(public code:string,message:string,public status=400,public details?:unknown){super(message)}}
export const sendError=(res:Response,e:ApiError)=>res.status(e.status).json({error:{code:e.code,message:e.message,details:e.details ?? {}}})
export const errorHandler:ErrorRequestHandler=(err,_req,res,_next)=>sendError(res,err instanceof ApiError?err:new ApiError('internal_error','Internal server error',500))
