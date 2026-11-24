const META_PREFIX = "MV_META:"

export interface PackedBillingMeta {
  status: "paid" | "pending" | "failed"
  paymentMethod: string | null
  notes: string | null
}

/**
 * Encode status, paymentMethod, and user notes safely into BillingRecord.description
 * so existing SQLite schemas without dedicated status/paymentMethod columns persist them cleanly.
 */
export function packBillingDescription(meta: {
  description?: string | null
  status?: "paid" | "pending" | "failed" | null
  paymentMethod?: string | null
}): string | null {
  const status = meta.status || "paid"
  const paymentMethod = meta.paymentMethod?.trim() || null
  const notes = meta.description?.trim() || null

  if (!paymentMethod && status === "paid") {
    return notes
  }

  return `${META_PREFIX}${JSON.stringify({ status, paymentMethod, notes })}`
}

export function unpackBillingDescription(raw: string | null | undefined): PackedBillingMeta {
  if (!raw) {
    return { status: "paid", paymentMethod: null, notes: null }
  }
  if (raw.startsWith(META_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(META_PREFIX.length)) as Partial<PackedBillingMeta>
      return {
        status:
          parsed.status === "pending" || parsed.status === "failed" ? parsed.status : "paid",
        paymentMethod: parsed.paymentMethod || null,
        notes: parsed.notes || null,
      }
    } catch {
      return { status: "paid", paymentMethod: null, notes: raw }
    }
  }
  return { status: "paid", paymentMethod: null, notes: raw }
}
