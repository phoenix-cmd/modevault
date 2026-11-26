import { prisma } from "@/lib/db"
import { listProviderCapabilities } from "@/lib/providers/capabilities"

export async function ensureProviderCapabilitiesInDb(): Promise<void> {
  const providers = await prisma.provider.findMany({
    select: { id: true, slug: true },
  })
  const providerIdBySlug = new Map(providers.map((p) => [p.slug, p.id]))

  for (const spec of listProviderCapabilities()) {
    await prisma.providerCapability.upsert({
      where: { providerSlug: spec.providerSlug },
      update: {
        providerId: providerIdBySlug.get(spec.providerSlug) ?? null,
        displayName: spec.displayName,
        canSyncUsage: spec.canSyncUsage,
        canSyncCredits: spec.canSyncCredits,
        canReplenish: spec.canReplenish,
        canCode: spec.canCode,
        authMode: spec.authMode,
        syncCadence: spec.syncCadence,
        termsStatus: spec.termsStatus,
        billingUrl: spec.billingUrl,
        capabilitiesNote: spec.capabilitiesNote,
        supportedModelsJson: JSON.stringify(spec.supportedModels),
      },
      create: {
        providerSlug: spec.providerSlug,
        providerId: providerIdBySlug.get(spec.providerSlug) ?? null,
        displayName: spec.displayName,
        canSyncUsage: spec.canSyncUsage,
        canSyncCredits: spec.canSyncCredits,
        canReplenish: spec.canReplenish,
        canCode: spec.canCode,
        authMode: spec.authMode,
        syncCadence: spec.syncCadence,
        termsStatus: spec.termsStatus,
        billingUrl: spec.billingUrl,
        capabilitiesNote: spec.capabilitiesNote,
        supportedModelsJson: JSON.stringify(spec.supportedModels),
      },
    })
  }
}
