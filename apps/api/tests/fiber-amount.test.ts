import { describe, expect, it } from 'vitest'

import { ckbAmountToShannonsHex } from '../src/providers/fiber/fiber-provider.js'

describe('ckbAmountToShannonsHex', () => {
  it('converts 1 CKB to 0x5f5e100', () => {
    expect(ckbAmountToShannonsHex('1')).toBe('0x5f5e100')
  })

  it('converts fractional CKB', () => {
    expect(ckbAmountToShannonsHex('0.5')).toBe('0x2faf080')
  })
})
