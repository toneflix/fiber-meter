import { Prisma } from '@prisma/client';
export const D=Prisma.Decimal;
export function calculateCharge(model:string, price:Prisma.Decimal.Value, quantity:Prisma.Decimal.Value){const p=new D(price); const q=new D(quantity); if(model==='fixed_per_request') return p; if(model==='per_1000_units') return p.mul(q).div(1000).toDecimalPlaces(12); return p.mul(q).toDecimalPlaces(12)}
export const money=(v:Prisma.Decimal.Value)=>new D(v).toString()
