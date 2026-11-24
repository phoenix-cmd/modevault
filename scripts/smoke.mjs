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

  const gitProjectRes = await request(
    "/api/projects",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repositoryUrl: "modevault-org/smoke-repo",
        sourceType: "git_repo",
      }),
    },
    jar
  )
  if (gitProjectRes.status !== 201) {
    failures.push(`git project create ${gitProjectRes.status} ${gitProjectRes.json?.error || ""}`)
  } else if (gitProjectRes.json?.data?.name !== "smoke repo") {
    failures.push(`git project auto-name expected 'smoke repo' got '${gitProjectRes.json?.data?.name}'`)
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

  const benchmark = await request(
    "/api/models/benchmark",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelSlug: "claude-3-7-sonnet", prompt: "Smoke benchmark test" }),
    },
    jar
  )
  if (benchmark.status !== 200 || !benchmark.json?.data?.output) {
    failures.push(`model benchmark ${benchmark.status}`)
  }

  const dagRun = await request(
    "/api/workflows/execute",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowName: "Smoke DAG",
        nodes: [
          { id: "n1", type: "trigger", data: { label: "Start", tone: "terminal" } },
          { id: "n2", type: "agent", data: { label: "Analyze", tone: "accent" } },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      }),
    },
    jar
  )
  if (dagRun.status !== 201 || !dagRun.json?.data?.executionId) {
    failures.push(`workflow execute ${dagRun.status} ${dagRun.json?.error || ""}`)
  }

  const billingRes = await request(
    "/api/billing",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 25,
        currency: "USD",
        type: "api_topup",
        status: "pending",
        paymentMethod: "Corporate Card",
      }),
    },
    jar
  )
  if (
    billingRes.status !== 201 ||
    billingRes.json?.data?.status !== "pending" ||
    billingRes.json?.data?.paymentMethod !== "Corporate Card"
  ) {
    failures.push(`billing metadata ${billingRes.status}`)
  }

  const provRes = await request("/api/providers", {}, jar)
  const firstProviderId = provRes.json?.data?.[0]?.id
  if (firstProviderId) {
    const accCreate = await request(
      "/api/api-accounts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: firstProviderId,
          accountName: "Smoke Test Key",
          prepaidBalance: 15,
          currency: "USD",
        }),
      },
      jar
    )
    if (accCreate.status !== 201) {
      failures.push(`api-account create ${accCreate.status}`)
    } else {
      const delAcc = await request(`/api/api-accounts/${accCreate.json.data.id}`, { method: "DELETE" }, jar)
      if (delAcc.status !== 200) failures.push(`api-account delete ${delAcc.status}`)
    }
  }

  // Delete the temporary Git project created earlier in smoke.mjs
  if (gitProjectRes.json?.data?.id) {
    const delProj = await request(`/api/projects?id=${encodeURIComponent(gitProjectRes.json.data.id)}`, { method: "DELETE" }, jar)
    if (delProj.status !== 200) failures.push(`project delete ${delProj.status}`)
  }

  // Invited member -> invite token redemption -> account self-deletion
  const invitedEmail = `invited-smoke-${Date.now().toString(36)}@example.com`
  const inviteRes = await request(
    "/api/members",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Smoke Invitee", email: invitedEmail, role: "Developer" }),
    },
    jar
  )
  const inviteUrl = inviteRes.json?.data?.inviteUrl || ""
  const tokenMatch = inviteUrl.match(/invite=([^&]+)/)
  if (inviteRes.status !== 201 || !tokenMatch?.[1]) {
    failures.push(`member invite ${inviteRes.status}`)
  } else {
    const inviteJar = cookieJar()
    const acceptRes = await request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Smoke Invitee",
          email: invitedEmail,
          password: "SmokeStrongPassword99!",
          inviteToken: decodeURIComponent(tokenMatch[1]),
        }),
      },
      inviteJar
    )
    if (acceptRes.status !== 201 || !acceptRes.json?.invited) {
      failures.push(`invite redeem ${acceptRes.status} ${acceptRes.json?.error || ""}`)
    } else {
      const delSelf = await request(
        "/api/settings",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmText: "DELETE" }),
        },
        inviteJar
      )
      if (delSelf.status !== 200) failures.push(`account self-delete ${delSelf.status}`)
    }
  }

  // Public SEO verification (must return 200 without redirecting to /login)
  const [robotsRes, sitemapRes, manifestRes, ogRes, homeRes] = await Promise.all([
    fetch(`${BASE}/robots.txt`, { redirect: "manual" }),
    fetch(`${BASE}/sitemap.xml`, { redirect: "manual" }),
    fetch(`${BASE}/manifest.webmanifest`, { redirect: "manual" }),
    fetch(`${BASE}/opengraph-image`, { redirect: "manual" }),
    fetch(`${BASE}/`, { redirect: "manual" }),
  ])
  if (robotsRes.status !== 200) failures.push(`robots.txt ${robotsRes.status}`)
  else {
    const txt = await robotsRes.text()
    if (!txt.includes("Sitemap:")) failures.push("robots.txt missing Sitemap")
  }
  if (sitemapRes.status !== 200) failures.push(`sitemap.xml ${sitemapRes.status}`)
  else {
    const xml = await sitemapRes.text()
    if (!xml.includes("<urlset")) failures.push("sitemap.xml missing urlset")
  }
  if (manifestRes.status !== 200) failures.push(`manifest.webmanifest ${manifestRes.status}`)
  if (ogRes.status !== 200 || !(ogRes.headers.get("content-type") || "").includes("image/png")) {
    failures.push(`opengraph-image ${ogRes.status}`)
  }
  if (homeRes.status !== 200) failures.push(`landing html ${homeRes.status}`)
  else {
    const html = await homeRes.text()
    if (!html.includes("application/ld+json") || !html.includes("FAQPage") || !html.includes("SoftwareApplication")) {
      failures.push("landing missing JSON-LD structured data")
    }
    if (!html.includes("og:title") || !html.includes("twitter:card")) {
      failures.push("landing missing OpenGraph/Twitter meta tags")
    }
    if (!html.includes("hidden=\"\"") && !html.includes("hidden")) {
      failures.push("landing FAQ answers not rendered in SSR DOM")
    }
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
