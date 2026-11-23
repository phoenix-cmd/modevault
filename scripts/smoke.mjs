const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000"

function cookieJar() {
  let cookie = ""
  return {
    get: () => cookie,
    setFromResponse: (res) => {
      const setCookie = res.headers.get("set-cookie")
      if (setCookie) cookie = setCookie.split(";")[0]
    },
  }
}

async function request(path, options = {}, jar = null) {
  const headers = { ...(options.headers || {}) }
  if (jar?.get()) headers.Cookie = jar.get()
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (jar) jar.setFromResponse(res)
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text }
}

async function main() {
  const jar = cookieJar()
  const failures = []

  const health = await request("/api/health")
  if (health.status !== 200) failures.push(`health ${health.status}`)

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@modelvault.dev", password: "password" }),
  }, jar)
  if (login.status !== 200) failures.push(`login ${login.status}`)

  const me = await request("/api/auth/me", {}, jar)
  if (me.status !== 200) failures.push(`me ${me.status}`)

  for (const path of ["/api/projects", "/api/workflows", "/api/organizations", "/api/members", "/api/settings"]) {
    const res = await request(path, {}, jar)
    if (res.status !== 200) failures.push(`${path} ${res.status}`)
  }

  const csvExport = await request("/api/settings/export", {}, jar)
  if (csvExport.status !== 200 || !csvExport.text.includes("Category,ID,Provider")) {
    failures.push(`settings/export ${csvExport.status}`)
  }

  const models = await request("/api/models", {}, jar)
  if (models.status !== 200) failures.push(`models ${models.status}`)
  else if (!Array.isArray(models.json?.data) || models.json.data.length === 0) {
    failures.push("models catalog empty")
  }

  const suggestions = await request("/api/suggestions", {}, jar)
  if (suggestions.status !== 200) failures.push(`suggestions ${suggestions.status}`)
  else if (!Array.isArray(suggestions.json?.data?.suggestions)) {
    failures.push("suggestions shape invalid")
  }

  const integrations = await request("/api/integrations", {}, jar)
  if (integrations.status !== 200) failures.push(`integrations ${integrations.status}`)

  const savedIntegration = await request(
    "/api/integrations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerSlug: "smoke-test",
        apiKey: "sk-smoke-test-1234",
        status: "connected",
      }),
    },
    jar
  )
  if (savedIntegration.status !== 201) {
    failures.push(`integration save ${savedIntegration.status}`)
  } else {
    const record = savedIntegration.json?.data
    if (record?.encryptedKey) failures.push("integration response leaked encrypted key")
    if (!record?.hasKey || !record?.keyPreview) failures.push("integration key metadata missing")
    const listed = await request("/api/integrations", {}, jar)
    const stored = listed.json?.data?.find(
      (item) => item.providerSlug === "smoke-test"
    )
    if (!stored?.hasKey) failures.push("integration not persisted")
    const removed = await request(
      "/api/integrations?providerSlug=smoke-test",
      { method: "DELETE" },
      jar
    )
    if (removed.status !== 200) failures.push(`integration delete ${removed.status}`)
  }

  const gitState = await request(
    "/api/git?projectId=proj_ai_analytics_002",
    {},
    jar
  )
  if (gitState.status !== 200) failures.push(`git state ${gitState.status}`)
  else if (!gitState.json?.data?.sync) failures.push("git sync state missing")

  const fs = await import("node:fs")
  const path = await import("node:path")
  const demoZipPath = path.join(process.cwd(), "scripts", "demo.zip")
  let previewProjectId = null
  if (fs.existsSync(demoZipPath)) {
    const zipBuffer = fs.readFileSync(demoZipPath)
    const form = new FormData()
    form.append("file", new Blob([zipBuffer], { type: "application/zip" }), "demo.zip")
    form.append("name", "Smoke Preview Project")
    const upload = await request("/api/projects/upload", { method: "POST", body: form }, jar)
    if (upload.status === 200) previewProjectId = upload.json?.data?.project?.id
  }
  if (previewProjectId) {
    const previewStart = await request(`/api/projects/${previewProjectId}/preview`, { method: "POST" }, jar)
    if (previewStart.status !== 200) failures.push(`preview start ${previewStart.status} ${previewStart.json?.error || ""}`)
    const previewGet = await request(`/api/projects/${previewProjectId}/preview`, {}, jar)
    if (previewGet.status !== 200) failures.push(`preview get ${previewGet.status}`)
    const previewStop = await request(`/api/projects/${previewProjectId}/preview`, { method: "DELETE" }, jar)
    if (previewStop.status !== 200) failures.push(`preview stop ${previewStop.status}`)
  }

  if (failures.length) {
    console.error("Smoke test failed:", failures.join(", "))
    process.exitCode = 1
    return
  }
  console.log("Smoke test passed")
}

main().catch((error) => {
  console.error("Smoke test error:", error)
  process.exitCode = 1
})
