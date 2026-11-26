import { prisma } from "@/lib/db"

export interface CurrencyRates {
  USD_INR: number
  EUR_USD: number
  GBP_USD: number
}

export interface ExchangeRatesMeta {
  rates: CurrencyRates
  isFallback: boolean
  source: string
  fetchedAt: string | null
}

export const DEFAULT_RATES: CurrencyRates = {
  USD_INR: 84.5,
  EUR_USD: 1.08,
  GBP_USD: 1.27,
}

const STALE_MS = 12 * 60 * 60 * 1000 // 12 hours

export async function refreshLiveExchangeRates(timeoutMs = 2500): Promise<boolean> {
  if (process.env.DISABLE_LIVE_FX === "1") return false
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return false
    const json = (await res.json()) as { rates?: Record<string, number> }
    const usdInr = json.rates?.INR
    const usdEur = json.rates?.EUR
    const usdGbp = json.rates?.GBP
    const now = new Date()

    const updates: Array<{ from: string; to: string; rate: number }> = []
    if (usdInr && usdInr > 0) updates.push({ from: "USD", to: "INR", rate: Number(usdInr.toFixed(4)) })
    if (usdEur && usdEur > 0) updates.push({ from: "EUR", to: "USD", rate: Number((1 / usdEur).toFixed(4)) })
    if (usdGbp && usdGbp > 0) updates.push({ from: "GBP", to: "USD", rate: Number((1 / usdGbp).toFixed(4)) })
    if (updates.length === 0) return false

    for (const item of updates) {
      await prisma.exchangeRate.upsert({
        where: { fromCurrency_toCurrency: { fromCurrency: item.from, toCurrency: item.to } },
        update: { rate: item.rate, source: "open.er-api.com", fetchedAt: now },
        create: { fromCurrency: item.from, toCurrency: item.to, rate: item.rate, source: "open.er-api.com", fetchedAt: now },
      })
    }
    return true
  } catch {
    return false
  }
}

export async function getExchangeRatesWithMeta(opts?: {
  allowLiveRefresh?: boolean
}): Promise<ExchangeRatesMeta> {
  try {
    let rows = await prisma.exchangeRate.findMany()
    const latestFetched = rows.reduce<Date | null>((acc, r) => {
      if (!r.fetchedAt) return acc
      return !acc || r.fetchedAt > acc ? r.fetchedAt : acc
    }, null)
    const hasLiveSource = rows.some((r) => r.source === "open.er-api.com")
    const isStale = !latestFetched || Date.now() - latestFetched.getTime() > STALE_MS

    if (opts?.allowLiveRefresh && (!hasLiveSource || isStale)) {
      const updated = await refreshLiveExchangeRates(2200)
      if (updated) {
        rows = await prisma.exchangeRate.findMany()
      }
    }

    if (rows.length === 0) {
      return {
        rates: { ...DEFAULT_RATES },
        isFallback: true,
        source: "estimated_fallback",
        fetchedAt: null,
      }
    }

    const rates = { ...DEFAULT_RATES }
    let newest: Date | null = null
    let liveVerified = false
    for (const row of rows) {
      if (row.fromCurrency === "USD" && row.toCurrency === "INR" && row.rate > 0) {
        rates.USD_INR = row.rate
      } else if (row.fromCurrency === "EUR" && row.toCurrency === "USD" && row.rate > 0) {
        rates.EUR_USD = row.rate
      } else if (row.fromCurrency === "GBP" && row.toCurrency === "USD" && row.rate > 0) {
        rates.GBP_USD = row.rate
      }
      if (row.fetchedAt && (!newest || row.fetchedAt > newest)) {
        newest = row.fetchedAt
      }
      if (row.source === "open.er-api.com") {
        liveVerified = true
      }
    }

    const freshEnough = newest ? Date.now() - newest.getTime() <= 48 * 60 * 60 * 1000 : false
    const isFallback = !(liveVerified && freshEnough)

    return {
      rates,
      isFallback,
      source: isFallback ? "estimated_fallback" : "open.er-api.com",
      fetchedAt: newest ? newest.toISOString() : null,
    }
  } catch {
    return {
      rates: { ...DEFAULT_RATES },
      isFallback: true,
      source: "estimated_fallback",
      fetchedAt: null,
    }
  }
}

export async function getExchangeRatesMap(): Promise<CurrencyRates> {
  const meta = await getExchangeRatesWithMeta()
  return meta.rates
}

export function convertCurrency(
  amount: number,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined,
  rates: CurrencyRates = DEFAULT_RATES
): number {
  const from = (fromCurrency || "USD").toUpperCase()
  const to = (toCurrency || "USD").toUpperCase()
  if (from === to) return amount

  let usdAmount = amount
  if (from === "INR") usdAmount = amount / rates.USD_INR
  else if (from === "EUR") usdAmount = amount * rates.EUR_USD
  else if (from === "GBP") usdAmount = amount * rates.GBP_USD

  if (to === "USD") return usdAmount
  if (to === "INR") return usdAmount * rates.USD_INR
  if (to === "EUR") return usdAmount / rates.EUR_USD
  if (to === "GBP") return usdAmount / rates.GBP_USD
  return usdAmount
}
