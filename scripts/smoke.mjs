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

  const projectsRes = await request("/api/projects", {}, jar)
  const projectId = projectsRes.json?.data?.[0]?.id
  if (projectId) {
    const previewStart = await request(`/api/projects/${projectId}/preview`, { method: "POST" }, jar)
    if (previewStart.status !== 200 && previewStart.status !== 500) failures.push(`preview start ${previewStart.status}`)
    const previewGet = await request(`/api/projects/${projectId}/preview`, {}, jar)
    if (previewGet.status !== 200) failures.push(`preview get ${previewGet.status}`)
    const previewStop = await request(`/api/projects/${projectId}/preview`, { method: "DELETE" }, jar)
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
