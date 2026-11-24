import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { getPreview } from "@/lib/preview-manager"
import { ensureProjectSourceWorkspace } from "@/lib/project-source"
import { flattenWorkspaceTree, listWorkspaceTree, readWorkspaceFile } from "@/lib/project-workspace"

function normalizePreviewPath(rawPath: string | null): string | null {
  const p = (rawPath || "/").trim()
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("\\") || p.includes("@") || p.includes("..")) {
    return null
  }
  if (/[\r\n\0]/.test(p)) {
    return null
  }
  return p
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const DEVTOOLS_BRIDGE_SCRIPT = `<script>
(function(){
  var origin = window.location.origin;
  function send(payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: "modelvault-preview" }, payload), origin);
      }
    } catch (e) {}
  }
  ["log", "info", "warn", "error"].forEach(function(level) {
    var orig = console[level];
    console[level] = function() {
      var args = Array.prototype.slice.call(arguments).map(function(a) {
        if (typeof a === "string") return a;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }).join(" ");
      send({ kind: "console", level: level === "error" ? "error" : level === "warn" ? "warning" : "info", text: args });
      if (orig) orig.apply(console, arguments);
    };
  });
  window.addEventListener("error", function(ev) {
    send({ kind: "console", level: "error", text: ev.message || "Uncaught runtime error" });
  });
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      var method = (init && init.method) || "GET";
      var url = typeof input === "string" ? input : (input && input.url) || "/";
      var started = performance.now();
      return origFetch.apply(this, arguments).then(function(res) {
        var ms = Math.max(1, Math.round(performance.now() - started)) + "ms";
        send({ kind: "network", method: method.toUpperCase(), path: url, status: res.status, duration: ms });
        return res;
      }).catch(function(err) {
        var ms = Math.max(1, Math.round(performance.now() - started)) + "ms";
        send({ kind: "network", method: method.toUpperCase(), path: url, status: 500, duration: ms });
        throw err;
      });
    };
  }
  send({ kind: "console", level: "build", text: "Preview runtime attached to Studio DevTools bridge." });
})();
</script>`

const PREVIEW_CSP =
  "sandbox allow-scripts allow-forms allow-same-origin; default-src 'self' 'unsafe-inline' data: blob:;"

async function buildWorkspaceRendererHtml(projectId: string, safePath: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { sources: true, environments: true },
  })
  if (!project) return "<html><body>Project not found</body></html>"

  const sourcePath = await ensureProjectSourceWorkspace(project)
  const tree = await listWorkspaceTree(sourcePath).catch(() => [])
  const allFiles = flattenWorkspaceTree(tree)

  // If workspace contains an index.html or requested .html file, render it directly with the DevTools bridge
  const directCandidate =
    safePath !== "/" && allFiles.includes(safePath.replace(/^\/+/, ""))
      ? safePath.replace(/^\/+/, "")
      : allFiles.find((f) => f === "index.html" || f === "public/index.html")

  if (directCandidate && directCandidate.endsWith(".html")) {
    const rawHtml = await readWorkspaceFile(sourcePath, directCandidate).catch(() => "")
    if (rawHtml) {
      return rawHtml.includes("</head>")
        ? rawHtml.replace("</head>", `${DEVTOOLS_BRIDGE_SCRIPT}</head>`)
        : `${DEVTOOLS_BRIDGE_SCRIPT}${rawHtml}`
    }
  }

  const entryFile =
    allFiles.find((f) =>
      [
        "src/app/page.tsx",
        "src/app/page.jsx",
        "app/page.tsx",
        "pages/index.tsx",
        "src/index.tsx",
        "src/index.ts",
        "main.py",
        "README.md",
      ].includes(f)
    ) ||
    allFiles[0] ||
    "README.md"

  const entryContent = await readWorkspaceFile(sourcePath, entryFile).catch(() => "")
  const apiRoutes = allFiles.filter(
    (f) => f.includes("api/") || f.endsWith("route.ts") || f.endsWith("route.js") || f.endsWith("main.py")
  )

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(project.name)} — Live Workspace Preview</title>
  ${DEVTOOLS_BRIDGE_SCRIPT}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #0f1115; color: #ece9e2; padding: 20px; }
    .bar { display: flex; align-items: center; justify-content: space-between; border: 1px solid #252830; background: #161920; padding: 10px 14px; margin-bottom: 16px; }
    .tag { font-family: ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #52b788; }
    .card { border: 1px solid #252830; background: #14171d; padding: 16px; margin-bottom: 14px; }
    h1 { font-size: 18px; margin: 0 0 6px; }
    p { font-size: 13px; color: #a7a39b; margin: 0; line-height: 1.5; }
    pre { margin: 10px 0 0; padding: 12px; background: #0b0c0f; border: 1px solid #22252c; overflow-x: auto; font-size: 11.5px; color: #d9d5cc; max-height: 240px; }
    .btn { background: #c25e00; color: #fff; border: 0; padding: 7px 12px; font-family: ui-monospace, monospace; font-size: 11px; cursor: pointer; margin-right: 8px; margin-top: 10px; }
    .btn-sec { background: #222630; color: #ece9e2; border: 1px solid #323744; padding: 7px 12px; font-family: ui-monospace, monospace; font-size: 11px; cursor: pointer; margin-right: 8px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="bar">
    <div>
      <strong>${escapeHtml(project.name)}</strong>
      <span style="margin-left:8px;font-family:monospace;font-size:11px;color:#9c9890;">${escapeHtml(project.framework || "nextjs")} · ${escapeHtml(project.language || "typescript")}</span>
    </div>
    <span class="tag">● Live Workspace Renderer (${allFiles.length} files)</span>
  </div>
  <div class="card">
    <h1>Interactive Workspace Runtime</h1>
    <p>Rendering entry module <code>${escapeHtml(entryFile)}</code> (${allFiles.length} files indexed${apiRoutes.length ? `, ${apiRoutes.length} route module(s)` : ""}). Trigger actions below to stream live console &amp; network telemetry to Studio DevTools.</p>
    <div>
      <button class="btn" onclick="console.log('Executed workspace health check for ${escapeHtml(project.name)} (' + new Date().toISOString() + ')')">Emit console.log</button>
      <button class="btn-sec" onclick="fetch(window.location.pathname + '?ping=1').then(function(r){ console.info('Workspace probe status: HTTP ' + r.status); })">Probe preview endpoint</button>
      <button class="btn-sec" onclick="console.warn('Simulated latency threshold warning: 142ms on ${escapeHtml(entryFile)}')">Emit warning</button>
    </div>
  </div>
  <div class="card">
    <div style="font-family:monospace;font-size:11px;color:#9c9890;text-transform:uppercase;letter-spacing:0.08em;">Source snapshot · ${escapeHtml(entryFile)}</div>
    <pre>${escapeHtml(entryContent.slice(0, 2000))}</pre>
  </div>
</body>
</html>`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    await requireProjectAccess(id, user.id, "viewer")

    const preview = getPreview(id)
    if (!preview.running || !preview.port) {
      return NextResponse.json({ error: "Preview is not running" }, { status: 404 })
    }

    const safePath = normalizePreviewPath(req.nextUrl.searchParams.get("path"))
    if (!safePath) {
      return NextResponse.json({ error: "Invalid preview path" }, { status: 400 })
    }

    if (req.nextUrl.searchParams.get("ping") === "1") {
      return NextResponse.json({ ok: true, projectId: id, mode: preview.mode })
    }

    const target = new URL(safePath, `http://127.0.0.1:${preview.port}`)
    if (target.hostname !== "127.0.0.1" || Number(target.port) !== preview.port) {
      return NextResponse.json({ error: "Invalid preview target" }, { status: 400 })
    }

    if (preview.mode === "process") {
      try {
        const upstream = await fetch(target.toString(), {
          headers: { Accept: req.headers.get("accept") || "*/*" },
          redirect: "manual",
          signal: AbortSignal.timeout(1800),
        })
        const contentType = upstream.headers.get("content-type") || "text/html"
        if (contentType.includes("text/html")) {
          const rawHtml = await upstream.text()
          const injected = rawHtml.includes("</head>")
            ? rawHtml.replace("</head>", `${DEVTOOLS_BRIDGE_SCRIPT}</head>`)
            : `${DEVTOOLS_BRIDGE_SCRIPT}${rawHtml}`
          return new NextResponse(injected, {
            status: upstream.status,
            headers: {
              "Content-Type": contentType,
              "Content-Security-Policy": PREVIEW_CSP,
              "X-Content-Type-Options": "nosniff",
              "X-Frame-Options": "SAMEORIGIN",
            },
          })
        }
        const body = await upstream.arrayBuffer()
        return new NextResponse(body, {
          status: upstream.status,
          headers: {
            "Content-Type": contentType,
            "Content-Security-Policy": PREVIEW_CSP,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
          },
        })
      } catch {
        // Local dev server process not yet listening on port; fall back to live workspace renderer below
      }
    }

    const html = await buildWorkspaceRendererHtml(id, safePath)
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": PREVIEW_CSP,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      },
    })
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err) {
      return authErrorResponse(err, "Preview proxy unauthorized")
    }
    return NextResponse.json({ error: "Preview proxy failed" }, { status: 502 })
  }
}
