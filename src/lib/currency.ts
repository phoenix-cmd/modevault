import { prisma } from "@/lib/db"

export interface CurrencyRates {
  USD_INR: number
  EUR_USD: number
  GBP_USD: number
}

const DEFAULT_RATES: CurrencyRates = {
  USD_INR: 84.5,
  EUR_USD: 1.08,
  GBP_USD: 1.27,
}

export async function getExchangeRatesMap(): Promise<CurrencyRates> {
  try {
    const rows = await prisma.exchangeRate.findMany()
    const rates = { ...DEFAULT_RATES }
    for (const row of rows) {
      if (row.fromCurrency === "USD" && row.toCurrency === "INR" && row.rate > 0) {
        rates.USD_INR = row.rate
      } else if (row.fromCurrency === "EUR" && row.toCurrency === "USD" && row.rate > 0) {
        rates.EUR_USD = row.rate
      } else if (row.fromCurrency === "GBP" && row.toCurrency === "USD" && row.rate > 0) {
        rates.GBP_USD = row.rate
      }
    }
    return rates
  } catch {
    return { ...DEFAULT_RATES }
  }
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
