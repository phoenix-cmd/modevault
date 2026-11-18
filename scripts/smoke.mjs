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

  for (const path of ["/api/projects", "/api/workflows", "/api/organizations"]) {
    const res = await request(path, {}, jar)
    if (res.status !== 200) failures.push(`${path} ${res.status}`)
  }

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
