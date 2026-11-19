"use client"

import { useState, useEffect } from "react"
import {
  Play,
  RotateCw,
  Smartphone,
  Tablet,
  Monitor,
  FileCode,
  ExternalLink,
} from "lucide-react"
import Editor from "@monaco-editor/react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

export default function StudioPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState("")
  const [fileList, setFileList] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewRunning, setPreviewRunning] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewFrameKey, setPreviewFrameKey] = useState(0)
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  )
  const [activePane, setActivePane] = useState<"split" | "editor" | "preview">(
    "split"
  )
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [devToolsTab, setDevToolsTab] = useState<"console" | "network" | "ast">(
    "console"
  )
  const [showDevTools, setShowDevTools] = useState(true)
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark")
  const [filesLoading, setFilesLoading] = useState(true)

  // Keep the editor surface in step with the site theme.
  useEffect(() => {
    const root = document.documentElement
    const sync = () =>
      setEditorTheme(root.classList.contains("dark") ? "vs-dark" : "light")
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // DevTools logs
  const [logs, setLogs] = useState<
    Array<{ id: number; time: string; type: string; text: string }>
  >([
    {
      id: 1,
      time: "12:04:12",
      type: "system",
      text: "Sandbox nodejs-20 environment initialized on port 3001",
    },
    {
      id: 2,
      time: "12:04:13",
      type: "build",
      text: "Ready in 1.4s — Fast Refresh enabled",
    },
    { id: 3, time: "12:04:15", type: "http", text: "GET / 200 OK — 24ms" },
  ])

  const [networkRequests, setNetworkRequests] = useState<
    Array<{
      id: number
      method: string
      path: string
      status: number
      duration: string
    }>
  >([
    {
      id: 1,
      method: "GET",
      path: "/_next/static/chunks/main.js",
      status: 200,
      duration: "12ms",
    },
    { id: 2, method: "GET", path: "/api/health", status: 200, duration: "8ms" },
  ])

  // Load projects
  useEffect(() => {
    let active = true
    fetch("/api/projects")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const list = json?.data || []
        setProjects(list)
        if (list.length > 0) setProjectId((current) => current || list[0].id)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Load file tree when project changes
  useEffect(() => {
    if (!projectId) return
    let active = true
    setSelectedFile("")
    setFileList([])
    setFilesLoading(true)
    fetch(`/api/projects/${projectId}/files`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const files = json?.data?.allFiles || []
        setFileList(files)
        if (files.length > 0) setSelectedFile((current) => current || files[0])
      })
      .catch(() => {})
      .finally(() => {
        if (active) setFilesLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  // Sync preview state with the server when switching projects
  useEffect(() => {
    if (!projectId) return
    let active = true
    setPreviewRunning(false)
    setPreviewUrl(null)
    setPreviewError(null)
    fetch(`/api/projects/${projectId}/preview`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json?.data?.running && json.data.port) {
          setPreviewUrl(json.data.url || `http://localhost:${json.data.port}`)
          setPreviewRunning(true)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [projectId])

  // Fetch file content
  const fetchFile = async (path: string) => {
    if (!projectId || !path) return
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files?file=${encodeURIComponent(path)}`
      )
      const json = await res.json()
      if (json.data && json.data.content) {
        setCode(json.data.content)
      } else {
        setCode("// Select or create a file to inspect")
      }
    } catch {
      setCode("// Unable to load file")
    }
  }

  useEffect(() => {
    fetchFile(selectedFile)
  }, [selectedFile, projectId])

  const handleSave = async () => {
    if (!projectId || !selectedFile) return
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content: code }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaveSuccess(true)
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          type: "build",
          text: `Saved ${selectedFile}`,
        },
      ])
    } catch {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          type: "error",
          text: `Failed to save ${selectedFile}`,
        },
      ])
    } finally {
      setTimeout(() => setSaveSuccess(false), 2500)
    }
  }

  const handleStartPreview = async () => {
    if (!projectId) return
    setPreviewError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/preview`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok || !json.data?.port) {
        throw new Error(json.error || "Failed to start preview")
      }
      setPreviewUrl(json.data.url || `http://localhost:${json.data.port}`)
      setPreviewRunning(true)
      setPreviewFrameKey((key) => key + 1)
    } catch (err) {
      setPreviewRunning(false)
      setPreviewUrl(null)
      setPreviewError(
        err instanceof Error ? err.message : "Failed to start preview"
      )
    }
  }

  const handleStopPreview = async () => {
    if (!projectId) return
    try {
      await fetch(`/api/projects/${projectId}/preview`, { method: "DELETE" })
    } finally {
      setPreviewRunning(false)
      setPreviewUrl(null)
    }
  }

  const activeProject = projects.find((project) => project.id === projectId)

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Build · Studio"
        title="Studio"
        description="A browser code workspace with AST inspection and a sandboxed preview reverse proxy."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className="btn-secondary"
            >
              {showDevTools ? "Hide DevTools" : "Show DevTools"}
            </button>
            <button
              onClick={previewRunning ? handleStopPreview : handleStartPreview}
              className="btn-secondary"
            >
              {previewRunning ? "Stop preview" : "Start preview"}
            </button>
            <button onClick={handleSave} className="btn-primary">
              {saveSuccess ? "Saved" : "Save changes"}
            </button>
          </div>
        }
      />

      <StatBand
        columns={4}
        items={[
          {
            label: "Projects",
            value: String(projects.length),
            meta: activeProject?.name || "No project selected",
          },
          {
            label: "Files",
            value: filesLoading ? "—" : String(fileList.length),
            meta: selectedFile || "No file selected",
          },
          {
            label: "Preview",
            value: previewRunning ? "Live" : "Stopped",
            meta: previewUrl || "Sandbox not running",
            accent: previewRunning,
          },
          {
            label: "DevTools",
            value: showDevTools ? "Open" : "Hidden",
            meta: "Local sample session",
          },
        ]}
      />

      <section className="flex h-[760px] flex-col overflow-hidden border border-line bg-surface">
        {/* Studio control bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/30 px-3 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Active project"
              className="select select-sm w-auto max-w-[190px]"
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              aria-label="Active file"
              className="select select-sm w-auto max-w-[260px] font-mono text-[11px]"
            >
              {fileList.length === 0 && <option value="">No files</option>}
              {fileList.map((file) => (
                <option key={file} value={file}>
                  {file}
                </option>
              ))}
            </select>
            <span
              className="hidden font-mono text-[10px] text-ink-3 sm:inline"
              title={previewUrl || undefined}
            >
              {previewRunning && previewUrl ? previewUrl : "Preview stopped"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="segmented"
              role="group"
              aria-label="Preview viewport"
            >
              {[
                { id: "desktop" as const, label: "Desktop", Icon: Monitor },
                { id: "tablet" as const, label: "Tablet", Icon: Tablet },
                { id: "mobile" as const, label: "Mobile", Icon: Smartphone },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewport(id)}
                  aria-pressed={viewport === id}
                  aria-label={label}
                  title={label}
                  className={cn(
                    "segmented-item h-7 w-7 px-0",
                    viewport === id && "segmented-item-active"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              ))}
            </div>

            <div
              className="segmented"
              role="group"
              aria-label="Workspace pane"
            >
              {(["split", "editor", "preview"] as const).map((pane) => (
                <button
                  key={pane}
                  onClick={() => setActivePane(pane)}
                  aria-pressed={activePane === pane}
                  className={cn(
                    "segmented-item px-2.5 capitalize",
                    activePane === pane && "segmented-item-active"
                  )}
                >
                  {pane}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workspace body */}
        <div className="flex flex-1 overflow-hidden">
          {/* File explorer */}
          <aside className="hidden w-56 shrink-0 flex-col overflow-hidden border-r border-line bg-surface-2/20 md:flex">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
              <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                Explorer
              </span>
              <span className="font-mono text-[10px] tabular-nums text-ink-3">
                {String(fileList.length).padStart(2, "0")}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {filesLoading && (
                <div className="space-y-2 px-3 py-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-3 w-full" />
                  ))}
                </div>
              )}
              {!filesLoading && fileList.length === 0 && (
                <p className="px-3 py-6 text-[11.5px] leading-relaxed text-ink-3">
                  No files found in this workspace.
                </p>
              )}
              {fileList.map((file) => {
                const isSelected = selectedFile === file
                const parts = file.split("/")
                const name = parts.pop()
                const folder = parts.join("/")
                return (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    title={file}
                    className={cn(
                      "relative flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-surface-2 text-ink"
                        : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-px bg-accent transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <FileCode
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected ? "text-accent" : "text-ink-3"
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10.5px]">
                        {name}
                      </span>
                      {folder && (
                        <span className="block truncate font-mono text-[9px] text-ink-3">
                          {folder}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Editor and preview */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
            {(activePane === "editor" || activePane === "split") && (
              <div
                className={cn(
                  "min-h-0 overflow-hidden bg-surface",
                  activePane === "split"
                    ? "h-1/2 w-full border-b border-line md:h-auto md:w-1/2 md:border-b-0 md:border-r"
                    : "h-full w-full"
                )}
              >
                <Editor
                  height="100%"
                  language={
                    selectedFile.endsWith(".json") ? "json" : "typescript"
                  }
                  theme={editorTheme}
                  value={code}
                  onChange={(v) => setCode(v || "")}
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: "on",
                    fontFamily: "var(--font-jetbrains), monospace",
                  }}
                />
              </div>
            )}

            {(activePane === "preview" || activePane === "split") && (
              <div
                className={cn(
                  "flex min-h-0 flex-col items-center justify-center overflow-hidden bg-surface-2/40 p-3",
                  activePane === "split"
                    ? "h-1/2 w-full md:h-auto md:w-1/2"
                    : "h-full w-full"
                )}
              >
                <div
                  className={cn(
                    "flex h-full flex-col overflow-hidden border border-line bg-white transition-[width] duration-300",
                    viewport === "mobile"
                      ? "w-[375px] max-w-full"
                      : viewport === "tablet"
                        ? "w-[560px] max-w-full"
                        : "w-full"
                  )}
                >
                  <div className="flex h-8 items-center justify-between gap-2 border-b border-line bg-surface-2/60 px-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          previewRunning ? "bg-success" : "bg-soft-grey"
                        )}
                      />
                      <span className="truncate font-mono text-[10px] text-ink-2">
                        {previewUrl || previewError || "Preview not running"}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {previewUrl && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="icon-btn h-6 w-6"
                          title="Open preview in new tab"
                          aria-label="Open preview in new tab"
                        >
                          <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                        </a>
                      )}
                      <button
                        onClick={() => setPreviewFrameKey((key) => key + 1)}
                        disabled={!previewRunning}
                        className="icon-btn h-6 w-6"
                        title="Reload preview"
                        aria-label="Reload preview"
                      >
                        <RotateCw className="h-3 w-3" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  <div className="relative flex-1 overflow-hidden bg-white">
                    {previewRunning && previewUrl ? (
                      <iframe
                        key={previewFrameKey}
                        src={previewUrl}
                        title="Live project preview"
                        className="h-full w-full border-0"
                        allow="clipboard-read; clipboard-write; fullscreen"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                        <span className="flex h-9 w-9 items-center justify-center border border-line bg-surface-2">
                          <Play
                            className="h-3.5 w-3.5 text-accent"
                            strokeWidth={1.8}
                          />
                        </span>
                        <div>
                          <p className="text-[12.5px] font-medium text-ink">
                            {previewError
                              ? "Preview could not start"
                              : "Preview is not running"}
                          </p>
                          <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-ink-3">
                            {previewError ||
                              "Select a project with an extracted workspace, then start the preview to load its dev server here."}
                          </p>
                        </div>
                        {previewError && (
                          <button
                            onClick={handleStartPreview}
                            className="btn-secondary btn-sm"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DevTools drawer */}
        {showDevTools && (
          <div className="flex h-48 shrink-0 flex-col border-t border-line bg-[#0a0b0d] text-[#c9c6bf]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1e22] px-3 py-1.5">
              <div className="flex items-center gap-4">
                {[
                  { id: "console" as const, label: "Console" },
                  {
                    id: "network" as const,
                    label: `Network ${networkRequests.length}`,
                  },
                  { id: "ast" as const, label: "AST & symbols" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDevToolsTab(tab.id)}
                    aria-pressed={devToolsTab === tab.id}
                    className={cn(
                      "-mb-1.5 border-b py-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] transition-colors",
                      devToolsTab === tab.id
                        ? "border-accent text-[#f4f2ec]"
                        : "border-transparent text-[#77736c] hover:text-[#c9c6bf]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#77736c]">
                Sample session · sandbox PID 8192
              </span>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3 font-mono text-[10.5px] leading-relaxed">
              {devToolsTab === "console" && (
                <>
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="shrink-0 text-[#77736c]">
                        [{log.time}]
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          log.type === "http"
                            ? "text-success"
                            : log.type === "build"
                              ? "text-accent"
                              : log.type === "error"
                                ? "text-danger"
                                : "text-[#c9c6bf]"
                        )}
                      >
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="min-w-0 break-words">{log.text}</span>
                    </div>
                  ))}
                </>
              )}

              {devToolsTab === "network" && (
                <div>
                  {networkRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 border-b border-[#1c1e22] py-1.5 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 text-[9px] font-medium text-success">
                          {req.method}
                        </span>
                        <span className="truncate text-[#c9c6bf]">
                          {req.path}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-[#77736c]">
                        <span className="font-medium text-success">
                          {req.status}
                        </span>
                        <span className="tabular-nums">{req.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {devToolsTab === "ast" && (
                <div className="space-y-2">
                  <p className="text-[9px] uppercase tracking-[0.12em] text-[#77736c]">
                    Static sample · not derived from the selected file
                  </p>
                  <p className="text-[#77736c]">
                    File{" "}
                    <span className="text-[#f4f2ec]">{selectedFile || "—"}</span>
                  </p>
                  <p className="text-[#77736c]">
                    Exported symbols{" "}
                    <span className="text-accent">
                      CheckoutButton, ApiClient, POST
                    </span>
                  </p>
                  <p className="text-[#77736c]">
                    Dependencies{" "}
                    <span className="text-success">
                      motion/react, react, prisma, next/server
                    </span>
                  </p>
                  <p className="text-[#77736c]">
                    Cyclomatic complexity{" "}
                    <span className="text-warning">3 · safe</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
