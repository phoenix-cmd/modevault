export function clearSessionScopedStorage(): void {
  if (typeof window === "undefined") return
  try {
    const fixedKeys = [
      "mv-active-org",
      "mv-active-workspace",
      "mv-active-project",
      "mv-active-execution",
      "mv-workflow-draft",
    ]
    for (const key of fixedKeys) {
      window.localStorage.removeItem(key)
    }

    const dynamicKeys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue
      if (key.startsWith("mv-studio-") || key.startsWith("mv-agent-prompt:")) {
        dynamicKeys.push(key)
      }
    }
    for (const key of dynamicKeys) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage access failures in restricted browsing modes
  }
}
