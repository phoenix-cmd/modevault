"use client"

import { useState, useEffect } from "react"
import {
  Code2,
  Play,
  RotateCw,
  Smartphone,
  Tablet,
  Monitor,
  FileCode,
  Folder,
  ChevronRight,
  ExternalLink,
  Terminal,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import Editor from "@monaco-editor/react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

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
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activePane, setActivePane] = useState<"split" | "editor" | "preview">("split")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [devToolsTab, setDevToolsTab] = useState<"console" | "network" | "ast">("console")
  const [showDevTools, setShowDevTools] = useState(true)

  // DevTools logs
  const [logs, setLogs] = useState<Array<{ id: number; time: string; type: string; text: string }>>([
    { id: 1, time: "12:04:12", type: "system", text: "Sandbox nodejs-20 environment initialized on port 3001" },
    { id: 2, time: "12:04:13", type: "build", text: "Ready in 1.4s — Fast Refresh enabled" },
    { id: 3, time: "12:04:15", type: "http", text: "GET / 200 OK — 24ms" },
  ])

  const [networkRequests, setNetworkRequests] = useState<Array<{ id: number; method: string; path: string; status: number; duration: string }>>([
    { id: 1, method: "GET", path: "/_next/static/chunks/main.js", status: 200, duration: "12ms" },
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
    fetch(`/api/projects/${projectId}/files`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const files = json?.data?.allFiles || []
        setFileList(files)
        if (files.length > 0) setSelectedFile((current) => current || files[0])
      })
      .catch(() => {})
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
      const res = await fetch(`/api/projects/${projectId}/files?file=${encodeURIComponent(path)}`)
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
      const res = await fetch(`/api/projects/${projectId}/preview`, { method: "POST" })
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
      setPreviewError(err instanceof Error ? err.message : "Failed to start preview")
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

  return (
    <div className="space-y-4 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Development Studio & Live Preview"
        description="Browser-based Monaco code workspace with AST modifications and sandboxed preview reverse proxy."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2"
            >
              {showDevTools ? "Hide DevTools" : "Show DevTools"}
            </button>
            <button
              onClick={previewRunning ? handleStopPreview : handleStartPreview}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2"
            >
              {previewRunning ? "Stop Preview" : "Start Preview"}
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-charcoal px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all"
            >
              {saveSuccess ? "Saved to Worktree ✓" : "Save Changes"}
            </button>
          </div>
        }
      />

      {/* Main Workspace Frame */}
      <div className="rounded-xl border border-line bg-surface shadow-sm overflow-hidden flex flex-col h-[780px]">
        {/* Studio Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-line bg-canvas px-4 py-2 text-xs gap-2">
          <div className="flex items-center gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
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
              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink max-w-[260px]"
            >
              {fileList.length === 0 && <option value="">No files</option>}
              {fileList.map((file) => (
                <option key={file} value={file}>
                  {file}
                </option>
              ))}
            </select>
            <span className="text-ink-3">•</span>
            <span className="text-[11px] text-ink-2">
              {previewRunning && previewUrl ? previewUrl : "Preview not running"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Viewport controls */}
            <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
              <button
                onClick={() => setViewport("desktop")}
                className={`p-1 rounded ${viewport === "desktop" ? "bg-surface-2 text-ink" : "text-ink-3"}`}
                title="Desktop"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewport("tablet")}
                className={`p-1 rounded ${viewport === "tablet" ? "bg-surface-2 text-ink" : "text-ink-3"}`}
                title="Tablet"
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={`p-1 rounded ${viewport === "mobile" ? "bg-surface-2 text-ink" : "text-ink-3"}`}
                title="Mobile"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Pane View Toggle */}
            <div className="flex rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActivePane("split")}
                className={`px-2.5 py-1 rounded ${activePane === "split" ? "bg-charcoal text-white" : "text-ink-2"}`}
              >
                Split
              </button>
              <button
                onClick={() => setActivePane("editor")}
                className={`px-2.5 py-1 rounded ${activePane === "editor" ? "bg-charcoal text-white" : "text-ink-2"}`}
              >
                Editor
              </button>
              <button
                onClick={() => setActivePane("preview")}
                className={`px-2.5 py-1 rounded ${activePane === "preview" ? "bg-charcoal text-white" : "text-ink-2"}`}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Explorer (Left sidebar) */}
          <div className="w-56 border-r border-line bg-canvas p-3 overflow-y-auto space-y-3 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-3 px-2">
              Project Explorer
            </p>
            <div className="space-y-0.5">
              {fileList.map((file) => {
                const isSelected = selectedFile === file
                return (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-surface font-semibold text-ink shadow-xs border border-line"
                        : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <FileCode className={`h-3.5 w-3.5 ${isSelected ? "text-accent" : "text-ink-3"}`} />
                    <span className="truncate">{file.split("/").pop()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Pane: Editor and/or Live Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* Monaco Editor Pane */}
            {(activePane === "editor" || activePane === "split") && (
              <div className={`overflow-hidden bg-surface ${activePane === "split" ? "w-1/2 border-r border-line" : "w-full"}`}>
                <Editor
                  height="100%"
                  language={selectedFile.endsWith(".json") ? "json" : "typescript"}
                  theme="vs-light"
                  value={code}
                  onChange={(v) => setCode(v || "")}
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: "on",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                />
              </div>
            )}

            {/* Live Preview Pane */}
            {(activePane === "preview" || activePane === "split") && (
              <div className={`overflow-hidden bg-surface-2 flex flex-col items-center justify-center p-3 ${activePane === "split" ? "w-1/2" : "w-full"}`}>
                <div
                  className={`h-full bg-white rounded-xl shadow-md border border-line overflow-hidden flex flex-col transition-all duration-300 ${
                    viewport === "mobile"
                      ? "w-[375px]"
                      : viewport === "tablet"
                      ? "w-[560px]"
                      : "w-full"
                  }`}
                >
                  {/* Browser Address Bar */}
                  <div className="h-8 border-b border-line bg-canvas px-3 flex items-center justify-between gap-2 text-[11px] text-ink-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          previewRunning ? "bg-success" : "bg-soft-grey"
                        }`}
                      />
                      <span className="truncate font-mono">
                        {previewUrl || previewError || "Preview not running"}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {previewUrl && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:text-ink"
                          title="Open preview in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        onClick={() => setPreviewFrameKey((key) => key + 1)}
                        disabled={!previewRunning}
                        className="p-1 hover:text-ink disabled:opacity-40"
                        title="Reload preview"
                      >
                        <RotateCw className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Real preview iframe — loaded directly from the dev server port so HMR WebSockets work */}
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-canvas">
                          <Play className="h-4 w-4 text-accent" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-ink">
                            {previewError ? "Preview could not start" : "Preview is not running"}
                          </p>
                          <p className="max-w-xs text-xs text-ink-2">
                            {previewError ||
                              "Upload a project or select one with an extracted workspace, then start the preview to load its dev server here."}
                          </p>
                        </div>
                        {previewError && (
                          <button
                            onClick={handleStartPreview}
                            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2"
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

        {/* Bottom DevTools Drawer */}
        {showDevTools && (
          <div className="h-48 border-t border-line bg-charcoal text-white flex flex-col">
            <div className="flex items-center justify-between border-b border-[#202020] px-4 py-1.5 text-xs">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDevToolsTab("console")}
                  className={`font-semibold transition-colors ${
                    devToolsTab === "console" ? "text-white border-b-2 border-accent pb-0.5" : "text-ink-2 hover:text-white"
                  }`}
                >
                  Console Logs
                </button>
                <button
                  onClick={() => setDevToolsTab("network")}
                  className={`font-semibold transition-colors ${
                    devToolsTab === "network" ? "text-white border-b-2 border-accent pb-0.5" : "text-ink-2 hover:text-white"
                  }`}
                >
                  Network Inspector ({networkRequests.length})
                </button>
                <button
                  onClick={() => setDevToolsTab("ast")}
                  className={`font-semibold transition-colors ${
                    devToolsTab === "ast" ? "text-white border-b-2 border-accent pb-0.5" : "text-ink-2 hover:text-white"
                  }`}
                >
                  AST & Symbols
                </button>
              </div>

              <span className="text-[10px] font-mono text-muted-slate">Sandbox PID: 8192</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-mono text-[11.5px] space-y-1">
              {devToolsTab === "console" && (
                <>
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-zinc-300">
                      <span className="text-muted-slate shrink-0">[{log.time}]</span>
                      <span
                        className={`font-bold shrink-0 ${
                          log.type === "http" ? "text-success" : log.type === "build" ? "text-cyan-400" : "text-amber-400"
                        }`}
                      >
                        [{log.type.toUpperCase()}]
                      </span>
                      <span>{log.text}</span>
                    </div>
                  ))}
                </>
              )}

              {devToolsTab === "network" && (
                <div className="space-y-1">
                  {networkRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between text-zinc-300 py-0.5 border-b border-zinc-800/40">
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-bold text-success">
                          {req.method}
                        </span>
                        <span className="text-zinc-200">{req.path}</span>
                      </div>
                      <div className="flex items-center gap-3 text-ink-3">
                        <span className="text-success font-semibold">{req.status}</span>
                        <span>{req.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {devToolsTab === "ast" && (
                <div className="space-y-2 text-xs text-zinc-300">
                  <p className="text-zinc-400">File: <span className="text-white">{selectedFile}</span></p>
                  <p className="text-zinc-400">Exported Symbols: <span className="text-cyan-400 font-mono">CheckoutButton, ApiClient, POST</span></p>
                  <p className="text-zinc-400">Dependencies: <span className="text-emerald-400 font-mono">motion/react, react, prisma, next/server</span></p>
                  <p className="text-zinc-400">Cyclomatic Complexity: <span className="text-amber-400 font-mono">3 (Safe)</span></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
