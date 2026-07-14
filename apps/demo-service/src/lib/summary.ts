export const MAX_TEXT_LENGTH = 2_000
export const DEMO_RATE_PER_1000_TOKENS = 10

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / 4))
}

export function createExtractiveSummary(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []
  const summary = sentences.slice(0, 2).map((sentence) => sentence.trim()).join(' ')

  if (summary.length <= 320) return summary
  return `${summary.slice(0, 317).trimEnd()}…`
}
