"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Play,
  RotateCw,
  Smartphone,
  Tablet,
  Monitor,
  FileCode,
  ExternalLink,
  Save,
  PanelBottom,
  PanelLeft,
  Square,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Terminal,
  X,
  Link2,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand } from "@/components/ui/stat-band"
import { TrustBadge } from "@/components/ui/trust-badge"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { useMediaQuery } from "@/lib/use-media-query"
import { useModalA11y } from "@/lib/use-modal-a11y"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] items-center justify-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
      Loading Monaco editor…
    </div>
  ),
})

interface BindingModel {
  slug: string
  name: string
  tags: string[]
  inputPerM: number
  outputPerM: number
  contextTokens: number
  estimatedRunCostUsd: number
}

interface CodingBindingOption {
  id: string
  label: string
  providerSlug: string
  providerName: string
  backendType: "direct_api" | "local_bridge" | "manual_unsupported"
  subscriptionId: string | null
  apiAccountId: string | null
  bridgeEndpoint: string | null
  defaultModel: string | null
  maxCostPerRun: number | null
  minBalanceGuardrail: number | null
  isEnabled: boolean
  hasLiveCredential: boolean
  canExecuteLive: boolean
  guardrailBlocked: boolean
  guardrailReason: string | null
  balance: number | null
  currency: string
  balanceSource: string
  syncedAt: string | null
  models: BindingModel[]
  capabilityNote: string
}

interface StudioExecution {
  id: string
  status: string
  targetBranch?: string | null
  totalTokens?: number
  estimatedCost?: number
  events?: Array<{
    id: string
    seq: number
    eventType: string
    level: string
    payload?: Record<string, unknown>
    payloadJson?: string
    createdAt: string
  }>
  usageAttribution?: {
    providerSlug: string
    backendType: string
    model: string
    totalTokens: number
    cost: number
    currency: string
    balanceBefore: number | null
    balanceAfter: number | null
    fallbackUsed: boolean
    fallbackReason: string | null
    confidenceLevel: string
    dataSource: string
    toolCallsCount: number
    apiAccount?: { accountName: string | null } | null
    subscription?: { customPlanName: string | null } | null
  } | null
}

export default function StudioPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState("")
  const [fileList, setFileList] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewRunning, setPreviewRunning] = useState(false)
  const [previewSimulated, setPreviewSimulated] = useState(false)
  const [previewSimReason, setPreviewSimReason] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewFrameKey, setPreviewFrameKey] = useState(0)

  // Phase 3: Coding bindings & Model selection
  const [bindings, setBindings] = useState<CodingBindingOption[]>([])
  const [selectedBindingId, setSelectedBindingId] = useState<string>("")
  const [selectedModelSlug, setSelectedModelSlug] = useState<string>("")
  const [allowFallback, setAllowFallback] = useState(false)
  const [bridgeModalOpen, setBridgeModalOpen] = useState(false)
  const [bridgeLabel, setBridgeLabel] = useState("Local CLI Bridge")
  const [bridgeProviderSlug, setBridgeProviderSlug] = useState("cursor")
  const [bridgeUrl, setBridgeUrl] = useState("http://127.0.0.1:4100")
  const [bridgeModel, setBridgeModel] = useState("claude-3-7-sonnet")
  const [bridgeError, setBridgeError] = useState<string | null>(null)
  const [savingBridge, setSavingBridge] = useState(false)

  // Active execution stream in Studio
  const [activeExecution, setActiveExecution] = useState<StudioExecution | null>(null)
  const [dispatchError, setDispatchError] = useState<string | null>(null)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const [newFileName, setNewFileName] = useState("")
  const [fileFilter, setFileFilter] = useState("")
  const [creatingFile, setCreatingFile] = useState(false)
  const [agentModalOpen, setAgentModalOpen] = useState(false)
  const [agentPrompt, setAgentPrompt] = useState("")
  const [dispatchingAgent, setDispatchingAgent] = useState(false)
  const agentDialogRef = useModalA11y(agentModalOpen, () => setAgentModalOpen(false))
  const isMdUp = useMediaQuery("(min-width: 768px)")
  const isXlUp = useMediaQuery("(min-width: 1280px)")
  const [explorerOverride, setExplorerOverride] = useState<boolean | null>(null)
  const explorerOpen = explorerOverride ?? isXlUp
  const [mobileTab, setMobileTab] = useState<"files" | "code" | "preview" | "tools">("code")

  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activePane, setActivePane] = useState<"split" | "editor" | "preview">("split")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [devToolsTab, setDevToolsTab] = useState<"console" | "network" | "ast" | "agent">("console")
  const [showDevTools, setShowDevTools] = useState(true)
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark")
  const [filesLoading, setFilesLoading] = useState(true)

  const showFilesPane = !isMdUp && mobileTab === "files"
  const showEditorPane = isMdUp ? activePane === "editor" || activePane === "split" : mobileTab === "code"
  const showPreviewPane = isMdUp ? activePane === "preview" || activePane === "split" : mobileTab === "preview"
  const showDevToolsPanel = isMdUp ? showDevTools : mobileTab === "tools"

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setEditorTheme(root.classList.contains("light") ? "light" : "vs-dark")
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const [logs, setLogs] = useState<Array<{ id: number; time: string; type: string; text: string }>>([
    { id: 1, time: "init", type: "system", text: "Studio workspace initialized. Select an account & file to code." },
  ])

  const [networkRequests, setNetworkRequests] = useState<Array<{ id: number; method: string; path: string; status: number; duration: string }>>([])
  const [astSummary, setAstSummary] = useState<{
    lineCount?: number
    byteSize?: number
    exportedSymbols?: string[]
    importedModules?: string[]
    hooksUsed?: string[]
    complexityScore?: number
    complexityRating?: string
    parserEngine?: string
  } | null>(null)

  const loadBindings = async () => {
    try {
      const res = await fetch("/api/coding-bindings")
      const json = await res.json()
      if (Array.isArray(json?.data)) {
        const list = json.data as CodingBindingOption[]
        setBindings(list)
        if (!selectedBindingId && list.length > 0) {
          const preferred = list.find((b) => b.canExecuteLive) || list[0]
          setSelectedBindingId(preferred.id)
          setSelectedModelSlug(preferred.defaultModel || preferred.models[0]?.slug || "")
        }
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadBindings()
  }, [])

  const selectedBinding = bindings.find((b) => b.id === selectedBindingId) || bindings[0] || null
  useEffect(() => {
    if (selectedBinding) {
      const hasCurrent = selectedBinding.models.some((m) => m.slug === selectedModelSlug)
      if (!hasCurrent) {
        setSelectedModelSlug(selectedBinding.defaultModel || selectedBinding.models[0]?.slug || "")
      }
    }
  }, [selectedBindingId, bindings])

  const selectedModelMeta = selectedBinding?.models.find((m) => m.slug === selectedModelSlug) || null

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      if (typeof window !== "undefined" && event.origin !== window.location.origin) return
      const payload = event.data
      if (!payload || typeof payload !== "object" || payload.source !== "modelvault-preview") return

      if (payload.kind === "console" && typeof payload.text === "string") {
        setLogs((prev) => [
          ...prev.slice(-99),
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            time: new Date().toLocaleTimeString(),
            type: typeof payload.level === "string" ? payload.level : "info",
            text: payload.text,
          },
        ])
      } else if (payload.kind === "network" && typeof payload.path === "string") {
        setNetworkRequests((prev) => [
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            method: typeof payload.method === "string" ? payload.method : "GET",
            path: `[preview] ${payload.path}`,
            status: typeof payload.status === "number" ? payload.status : 200,
            duration: typeof payload.duration === "string" ? payload.duration : "1ms",
          },
          ...prev.slice(0, 29),
        ])
      }
    }
    window.addEventListener("message", handlePreviewMessage)
    return () => window.removeEventListener("message", handlePreviewMessage)
  }, [])

  useEffect(() => {
    let active = true
    const urlProjectId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("projectId") ||
          window.localStorage.getItem("mv-active-project")
        : null
    fetch("/api/projects")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const list = json?.data || []
        setProjects(list)
        if (list.length > 0) {
          const matched = urlProjectId
            ? list.find((item: { id: string }) => item.id === urlProjectId)
            : null
          setProjectId((current) => current || matched?.id || list[0].id)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (projectId && typeof window !== "undefined") {
      window.localStorage.setItem("mv-active-project", projectId)
    }
  }, [projectId])

  const loadFiles = async (pid: string) => {
    if (!pid) return
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/projects/${pid}/files`)
      const json = await res.json()
      const files = json?.data?.allFiles || []
      setFileList(files)
      if (files.length > 0) setSelectedFile((current) => (current && files.includes(current) ? current : files[0]))
    } finally {
      setFilesLoading(false)
    }
  }

  useEffect(() => {
    if (!projectId) return
    setSelectedFile("")
    setFileList([])
    loadFiles(projectId)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    let active = true
    setPreviewRunning(false)
    setPreviewSimulated(false)
    setPreviewSimReason(null)
    setPreviewUrl(null)
    setPreviewError(null)
    fetch(`/api/projects/${projectId}/preview`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json?.data?.running && json.data.port) {
          setPreviewUrl(json.data.url || `/api/projects/${projectId}/preview/proxy`)
          setPreviewSimulated(Boolean(json.data.simulated || json.data.mode !== "process"))
          setPreviewSimReason(json.data.simulationReason || null)
          setPreviewRunning(true)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [projectId])

  const fetchFile = async (path: string) => {
    if (!projectId || !path) return
    const started = performance.now()
    const url = `/api/projects/${projectId}/files?file=${encodeURIComponent(path)}`
    try {
      const res = await fetch(url)
      const elapsed = `${Math.max(1, Math.round(performance.now() - started))}ms`
      setNetworkRequests((prev) => [
        { id: Date.now(), method: "GET", path: url, status: res.status, duration: elapsed },
        ...prev.slice(0, 19),
      ])
      const json = await res.json()
      if (json.data && typeof json.data.content === "string") {
        setCode(json.data.content)
        setAstSummary(json.data.astSummary || null)
      } else {
        setCode("// Select or create a file to inspect")
        setAstSummary(null)
      }
    } catch {
      setCode("// Unable to load file")
      setAstSummary(null)
    }
  }

  useEffect(() => {
    fetchFile(selectedFile)
  }, [selectedFile, projectId])

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const subscribeToExecutionStream = (execId: string) => {
    eventSourceRef.current?.close()
    const source = new EventSource(`/api/executions/${execId}/events`)
    eventSourceRef.current = source
    source.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data)
        if (parsed.eventType === "done") return
        setActiveExecution((prev) => {
          if (!prev || prev.id !== execId) return prev
          const curEvents = prev.events || []
          if (curEvents.some((e) => e.id === parsed.id)) return prev
          return { ...prev, events: [...curEvents, parsed] }
        })
      } catch {
        // ignore
      }
    }
    source.onerror = () => {
      source.close()
    }
  }

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

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !newFileName.trim()) return
    setCreatingFile(true)
    try {
      const target = newFileName.trim()
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: target, content: `// ${target}\n` }),
      })
      const json = await res.json()
      if (res.ok && Array.isArray(json.data?.allFiles)) {
        setFileList(json.data.allFiles)
        setSelectedFile(target)
        setNewFileName("")
      }
    } finally {
      setCreatingFile(false)
    }
  }

  const handleDeleteFile = async (target: string) => {
    if (!projectId || !target) return
    const res = await fetch(
      `/api/projects/${projectId}/files?file=${encodeURIComponent(target)}`,
      { method: "DELETE" }
    )
    const json = await res.json()
    if (res.ok && Array.isArray(json.data?.allFiles)) {
      setFileList(json.data.allFiles)
      if (selectedFile === target) {
        setSelectedFile(json.data.allFiles[0] || "")
        if (!json.data.allFiles[0]) setCode("")
      }
    }
  }

  const handleRunAgentOnFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !agentPrompt.trim()) return
    setDispatchingAgent(true)
    setDispatchError(null)
    try {
      if (selectedFile) {
        await handleSave()
      }
      const res = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          bindingId: selectedBinding?.id || undefined,
          model: selectedModelSlug || undefined,
          allowDeterministicFallback: allowFallback || (selectedBinding ? !selectedBinding.canExecuteLive : true),
          prompt: selectedFile
            ? `Target file ${selectedFile}: ${agentPrompt.trim()}`
            : agentPrompt.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Execution blocked")
      }
      if (json.data?.id) {
        setActiveExecution(json.data as StudioExecution)
        subscribeToExecutionStream(json.data.id)
        setDevToolsTab("agent")
        setShowDevTools(true)
        setAgentModalOpen(false)
        setAgentPrompt("")
        await loadBindings()
        await loadFiles(projectId)
        if (selectedFile) await fetchFile(selectedFile)
      }
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : "Failed to run coding agent")
    } finally {
      setDispatchingAgent(false)
    }
  }

  const handleStudioApproval = async (action: "approve" | "request_revision") => {
    if (!activeExecution?.id) return
    setApprovalBusy(true)
    try {
      const res = await fetch(`/api/executions/${activeExecution.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          feedback: action === "request_revision" ? "Refine changes in Studio review pass" : undefined,
        }),
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setActiveExecution((prev) => (prev ? { ...prev, status: json.data.status } : prev))
        await loadFiles(projectId)
        if (selectedFile) await fetchFile(selectedFile)
      }
    } finally {
      setApprovalBusy(false)
    }
  }

  const handleSaveBridge = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBridge(true)
    setBridgeError(null)
    try {
      const res = await fetch("/api/coding-bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: bridgeLabel,
          providerSlug: bridgeProviderSlug,
          backendType: "local_bridge",
          bridgeEndpoint: bridgeUrl,
          defaultModel: bridgeModel,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save local bridge")
      setBridgeModalOpen(false)
      await loadBindings()
      if (json.data?.id) setSelectedBindingId(json.data.id)
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : "Failed to save local bridge")
    } finally {
      setSavingBridge(false)
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
      const isSimulated = Boolean(json.data.simulated || json.data.mode !== "process")
      setPreviewSimulated(isSimulated)
      setPreviewSimReason(json.data.simulationReason || null)
      setPreviewUrl(json.data.url || `/api/projects/${projectId}/preview/proxy`)
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
      setPreviewSimulated(false)
      setPreviewSimReason(null)
      setPreviewUrl(null)
    }
  }

  const filteredFileList = fileFilter.trim()
    ? fileList.filter((f) => f.toLowerCase().includes(fileFilter.trim().toLowerCase()))
    : fileList

  const activeProject = projects.find((project) => project.id === projectId)
  const editorLanguage = selectedFile.endsWith(".json")
    ? "json"
    : selectedFile.endsWith(".css")
      ? "css"
      : selectedFile.endsWith(".md")
        ? "markdown"
        : selectedFile.endsWith(".js") || selectedFile.endsWith(".jsx")
          ? "javascript"
          : "typescript"

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <PageHeader
        eyebrow="Build · Attributable Vibe Coding"
        title="Studio"
        description="Code inside MODELVAULT using your managed API accounts or sanctioned local bridges — with real multi-step tool calls, cost guardrails, and honest fallback labeling."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBridgeModalOpen(true)}
              className="btn-ghost btn-sm"
            >
              <Link2 className="h-3.5 w-3.5" />
              Local CLI bridge
            </button>
            <button
              onClick={() => setExplorerOverride(!explorerOpen)}
              className="btn-secondary btn-sm hidden md:inline-flex"
            >
              <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              {explorerOpen ? "Hide files" : "Files"}
            </button>
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className="btn-secondary btn-sm hidden md:inline-flex"
            >
              <PanelBottom className="h-3.5 w-3.5" strokeWidth={1.8} />
              {showDevTools ? "Hide panel" : "Show panel"}
            </button>
            <button
              onClick={previewRunning ? handleStopPreview : handleStartPreview}
              className="btn-secondary btn-sm"
              disabled={!projectId}
            >
              {previewRunning ? <Square className="h-3 w-3" strokeWidth={2} /> : <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />}
              {previewRunning ? "Stop preview" : "Start preview"}
            </button>
            <button onClick={handleSave} className="btn-secondary btn-sm" disabled={!projectId || !selectedFile}>
              <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
              {saveSuccess ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => {
                setDispatchError(null)
                setAgentModalOpen(true)
              }}
              className="btn-primary btn-sm"
              disabled={!projectId}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
              Save &amp; Run Agent
            </button>
          </div>
        }
      />

      {/* Managed Subscription / Account Execution Picker Bar */}
      <section className="border border-line bg-surface p-4 space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <label className="label">Run using managed account / subscription</label>
            <select
              value={selectedBindingId}
              onChange={(e) => setSelectedBindingId(e.target.value)}
              aria-label="Coding credential binding"
              className="select select-sm"
            >
              {bindings.length === 0 && <option value="">No coding bindings found</option>}
              {bindings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.providerName} — {b.label} ({b.backendType === "direct_api" ? (b.hasLiveCredential ? "Direct API Ready" : "Needs Key") : b.backendType === "local_bridge" ? "Local CLI Bridge" : "Manual / Unsupported"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Model ({selectedBinding?.providerName || "—"})</label>
            <select
              value={selectedModelSlug}
              onChange={(e) => setSelectedModelSlug(e.target.value)}
              aria-label="Coding model"
              className="select select-sm font-mono text-[11px]"
              disabled={!selectedBinding || selectedBinding.models.length === 0}
            >
              {!selectedBinding || selectedBinding.models.length === 0 ? (
                <option value="">Manual / No selectable API models</option>
              ) : (
                selectedBinding.models.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name} [{m.tags.join(", ")}] · ~${m.estimatedRunCostUsd.toFixed(4)}/run
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col justify-between">
            <span className="label">Account balance &amp; estimate</span>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {selectedBinding ? (
                <>
                  <ProviderIcon slug={selectedBinding.providerSlug} size="sm" />
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] font-medium text-ink tabular-nums">
                      {selectedBinding.balance !== null
                        ? `${formatCurrency(selectedBinding.balance, selectedBinding.currency)} avail`
                        : "Subscription seat"}
                      {selectedModelMeta ? ` · ~$${selectedModelMeta.estimatedRunCostUsd.toFixed(4)}/run` : ""}
                    </p>
                    <TrustBadge
                      source={selectedBinding.backendType === "manual_unsupported" ? "unsupported" : selectedBinding.balanceSource}
                      syncedAt={selectedBinding.syncedAt}
                      showFreshness={selectedBinding.balanceSource === "live_api_sync"}
                    />
                  </div>
                </>
              ) : (
                <span className="text-[12px] text-ink-3">Loading bindings…</span>
              )}
            </div>
          </div>
        </div>

        {selectedBinding && (selectedBinding.backendType === "manual_unsupported" || selectedBinding.guardrailBlocked || !selectedBinding.hasLiveCredential) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border border-warning/30 bg-warning-soft/30 px-3 py-2 text-[12px] text-warning">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                {selectedBinding.guardrailReason ||
                  (!selectedBinding.hasLiveCredential
                    ? `No live API key connected for ${selectedBinding.providerName}. Connect a key in Integrations or runs will use low-confidence deterministic fallback.`
                    : selectedBinding.capabilityNote)}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <Link href="/integrations" className="font-mono text-[10.5px] uppercase underline">
                Connect key
              </Link>
              <Link href="/api-usage" className="font-mono text-[10.5px] uppercase underline">
                Top up
              </Link>
            </div>
          </div>
        )}
      </section>

      <StatBand
        columns={4}
        items={[
          { label: "Projects", value: String(projects.length), meta: activeProject?.name || "No project selected" },
          { label: "Workspace files", value: filesLoading ? "—" : String(fileList.length), meta: selectedFile || "No file selected" },
          {
            label: "Preview",
            value: previewRunning
              ? previewSimulated
                ? "Simulated Preview"
                : "Live Process"
              : "Stopped",
            meta: previewRunning
              ? previewSimReason || previewUrl || "Active preview session"
              : "Click Start preview to launch",
            accent: previewRunning && !previewSimulated,
          },
          {
            label: "Execution backend",
            value: selectedBinding?.canExecuteLive ? "Live API" : "Fallback / Manual",
            meta: selectedBinding?.label || "Select an account",
          },
        ]}
      />

      <section className="overflow-hidden border border-line bg-surface">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
          <div className="grid w-full gap-3 md:max-w-3xl md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
            <label className="block min-w-0">
              <span className="label">Project</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                aria-label="Active project"
                className="select select-sm"
              >
                {projects.length === 0 && <option value="">No projects</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="label">File</span>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                aria-label="Active file"
                className="select select-sm font-mono text-[11px]"
              >
                {fileList.length === 0 && <option value="">No files</option>}
                {fileList.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto">
            <div className="segmented w-full md:hidden" role="group" aria-label="Mobile studio panels">
              {[
                { id: "files" as const, label: "Files" },
                { id: "code" as const, label: "Code" },
                { id: "preview" as const, label: "Preview" },
                { id: "tools" as const, label: "Tools" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  aria-pressed={mobileTab === tab.id}
                  className={cn("segmented-item flex-1", mobileTab === tab.id && "segmented-item-active")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <div className="segmented" role="group" aria-label="Preview viewport">
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
                    className={cn("segmented-item h-8 w-8 px-0", viewport === id && "segmented-item-active")}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                ))}
              </div>
              <div className="segmented" role="group" aria-label="Workspace pane">
                {(["split", "editor", "preview"] as const).map((pane) => (
                  <button
                    key={pane}
                    onClick={() => setActivePane(pane)}
                    aria-pressed={activePane === pane}
                    className={cn("segmented-item px-2.5 capitalize", activePane === pane && "segmented-item-active")}
                  >
                    {pane}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col md:min-h-[680px]">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {((isMdUp && explorerOpen) || showFilesPane) && (
              <aside
                className={cn(
                  "flex shrink-0 flex-col overflow-hidden bg-surface-2/10",
                  showFilesPane ? "w-full min-h-[380px]" : "w-60 border-r border-line"
                )}
              >
                <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                  <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">Explorer</span>
                  <span className="font-mono text-[10px] tabular-nums text-ink-3">
                    {fileFilter.trim()
                      ? `${filteredFileList.length}/${fileList.length}`
                      : String(fileList.length).padStart(2, "0")}
                  </span>
                </div>
                <form onSubmit={handleCreateFile} className="flex gap-1 border-b border-line px-2 py-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="src/new-file.ts"
                    aria-label="New file path"
                    className="field field-sm flex-1 font-mono text-[10.5px]"
                    disabled={!projectId}
                  />
                  <button
                    type="submit"
                    disabled={creatingFile || !newFileName.trim() || !projectId}
                    className="icon-btn shrink-0"
                    title="Create file"
                    aria-label="Create file"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </form>
                <div className="border-b border-line px-2 py-1.5">
                  <input
                    type="text"
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Filter files…"
                    aria-label="Filter workspace files"
                    className="field field-sm w-full font-mono text-[10.5px]"
                    disabled={!projectId || fileList.length === 0}
                  />
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {filesLoading && (
                    <div className="space-y-2 px-3 py-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="skeleton h-3 w-full" />
                      ))}
                    </div>
                  )}
                  {!filesLoading && fileList.length === 0 && (
                    <div className="px-3 py-8">
                      <p className="text-[12.5px] font-medium text-ink">No workspace files</p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">Select a project with an extracted workspace to browse files.</p>
                    </div>
                  )}
                  {filteredFileList.map((file) => {
                    const isSelected = selectedFile === file
                    const parts = file.split("/")
                    const name = parts.pop()
                    const folder = parts.join("/")
                    return (
                      <div
                        key={file}
                        className={cn(
                          "group relative flex min-h-[44px] w-full items-center justify-between gap-1 px-3 py-2 transition-colors md:min-h-0",
                          isSelected ? "bg-surface-2/80 text-ink" : "text-ink-2 hover:bg-surface-2/50 hover:text-ink"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(file)
                            if (!isMdUp) setMobileTab("code")
                          }}
                          title={file}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className={cn("absolute inset-y-1 left-0 w-[2px] rounded-full bg-accent transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
                          <FileCode className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-accent" : "text-ink-3")} strokeWidth={1.8} />
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[11px] md:text-[10.5px]">{name}</span>
                            {folder && <span className="block truncate font-mono text-[9.5px] text-ink-3 md:text-[9px]">{folder}</span>}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file)}
                          className="icon-btn h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                          title={`Delete ${file}`}
                          aria-label={`Delete ${file}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-line px-3 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                  {activeProject?.name || "No project"} · {previewRunning ? (previewSimulated ? "simulated preview" : "live process") : "preview stopped"}
                </div>
              </aside>
            )}

            {!showFilesPane && !(!isMdUp && mobileTab === "tools") && (
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
                {showEditorPane && (
                  <div
                    className={cn(
                      "flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface",
                      isMdUp && activePane === "split"
                        ? "h-1/2 w-full border-b border-line md:h-auto md:w-1/2 md:border-b-0 md:border-r"
                        : "h-[58dvh] min-h-[360px] w-full md:h-full"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[10.5px] text-ink">{selectedFile || "No file selected"}</p>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">Monaco editor · {editorLanguage}</p>
                      </div>
                      <button onClick={handleSave} className="btn-secondary btn-sm" disabled={!projectId || !selectedFile}>
                        <Save className="h-3 w-3" strokeWidth={1.8} />
                        {saveSuccess ? "Saved" : "Save"}
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      <Editor
                        height="100%"
                        language={editorLanguage}
                        theme={editorTheme}
                        value={code}
                        onChange={(v) => setCode(v || "")}
                        options={{
                          fontSize: isMdUp ? 12.5 : 13,
                          lineNumbersMinChars: isMdUp ? 4 : 3,
                          glyphMargin: isMdUp,
                          folding: isMdUp,
                          wordWrap: isMdUp ? "off" : "on",
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          lineNumbers: "on",
                          fontFamily: "var(--font-jetbrains), monospace",
                          padding: { top: 12, bottom: 12 },
                        }}
                      />
                    </div>
                  </div>
                )}

                {showPreviewPane && (
                  <div
                    className={cn(
                      "flex min-h-0 flex-col overflow-hidden bg-canvas",
                      isMdUp && activePane === "split"
                        ? "h-1/2 w-full md:h-auto md:w-1/2"
                        : "h-[60dvh] min-h-[380px] w-full md:h-full"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2/20 px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">Sandbox preview</p>
                          {previewRunning && previewSimulated && (
                            <span className="badge bg-warning-soft text-warning">Simulated Renderer</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-2" title={previewSimReason || previewUrl || undefined}>
                          {previewUrl || (previewRunning ? "Running" : "Preview stopped")}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {previewUrl && (
                          <a href={previewUrl} target="_blank" rel="noreferrer" className="icon-btn" title="Open preview in new tab" aria-label="Open preview in new tab">
                            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </a>
                        )}
                        <button
                          onClick={() => setPreviewFrameKey((key) => key + 1)}
                          disabled={!previewRunning}
                          className="icon-btn"
                          title="Reload preview"
                          aria-label="Reload preview"
                        >
                          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>

                    {previewError && (
                      <div className="flex items-center justify-between gap-2 border-b border-danger/30 bg-danger-soft/50 px-3 py-2 text-[12px] text-danger">
                        <span className="flex items-center gap-2 min-w-0 truncate">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{previewError}</span>
                        </span>
                        <button onClick={handleStartPreview} className="btn-secondary btn-sm shrink-0">
                          Retry
                        </button>
                      </div>
                    )}

                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-x-auto p-3 sm:p-4">
                      <div
                        className={cn(
                          "flex h-full flex-col overflow-hidden border border-line bg-surface transition-[width] duration-300",
                          viewport === "mobile"
                            ? "w-[375px] max-w-full"
                            : viewport === "tablet"
                              ? "w-[720px] shrink-0 md:max-w-full"
                              : "w-full"
                        )}
                      >
                        <div className="flex h-8 items-center justify-between gap-2 border-b border-line bg-surface-2/60 px-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={cn("h-1.5 w-1.5 shrink-0", previewRunning ? (previewSimulated ? "bg-warning" : "bg-success") : "bg-soft-grey")} />
                            <span className="truncate font-mono text-[10px] text-ink-2">
                              {previewRunning ? (previewSimulated ? "Simulated static preview" : "Live process") : "Stopped"}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">{viewport}</span>
                        </div>

                        <div className={cn("relative flex-1 overflow-hidden", previewRunning && previewUrl ? "bg-white" : "bg-surface")}>
                          {previewRunning && previewUrl ? (
                            <iframe
                              key={previewFrameKey}
                              src={previewUrl}
                              title="Project preview"
                              sandbox="allow-scripts allow-forms allow-same-origin"
                              referrerPolicy="no-referrer"
                              className="h-full w-full border-0"
                              allow="fullscreen"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center sm:p-8">
                              <span className="flex h-10 w-10 items-center justify-center border border-line bg-surface-2">
                                <Play className="h-4 w-4 text-accent" strokeWidth={1.8} />
                              </span>
                              <div className="max-w-sm">
                                <p className="text-[13px] font-medium text-ink">{previewError ? "Preview could not start" : "Preview is not running"}</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                                  {previewError || "Start preview to serve the local process or simulated static workspace renderer."}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {showDevToolsPanel && (
            <div className={cn("flex shrink-0 flex-col border-t border-line bg-[#0a0b0d] text-[#c9c6bf]", isMdUp ? "h-60" : "min-h-[380px]")}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1e22] px-3 py-1.5 sm:px-4">
                <div className="flex items-center gap-4">
                  {[
                    { id: "console" as const, label: "Console" },
                    { id: "network" as const, label: `Network ${networkRequests.length}` },
                    { id: "ast" as const, label: "AST & symbols" },
                    { id: "agent" as const, label: activeExecution ? `Agent Run (${activeExecution.status})` : "Agent Run" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDevToolsTab(tab.id)}
                      aria-pressed={devToolsTab === tab.id}
                      className={cn(
                        "-mb-1.5 border-b py-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] transition-colors",
                        devToolsTab === tab.id ? "border-accent text-[#f4f2ec]" : "border-transparent text-[#77736c] hover:text-[#c9c6bf]"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#77736c]">Telemetry &amp; Attributable Runs</span>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto p-3 font-mono text-[10.5px] leading-relaxed sm:px-4">
                {devToolsTab === "console" && (
                  <>
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="shrink-0 text-[#77736c]">[{log.time}]</span>
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
                      <div key={req.id} className="flex items-center justify-between gap-3 border-b border-[#1c1e22] py-1.5 last:border-b-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 text-[9px] font-medium text-success">{req.method}</span>
                          <span className="truncate text-[#c9c6bf]">{req.path}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-[#77736c]">
                          <span className="font-medium text-success">{req.status}</span>
                          <span className="tabular-nums">{req.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {devToolsTab === "ast" && (
                  <div className="space-y-2">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-[#77736c]">
                      {astSummary?.parserEngine === "python-ast"
                        ? "Python AST analysis"
                        : "TypeScript Compiler AST analysis"}{" "}
                      · ({astSummary?.lineCount ?? code.split(/\r?\n/).length} lines)
                    </p>
                    <p className="text-[#77736c]">
                      Exported symbols{" "}
                      <span className="text-accent">
                        {astSummary?.exportedSymbols?.length ? astSummary.exportedSymbols.join(", ") : "None detected"}
                      </span>
                    </p>
                    <p className="text-[#77736c]">
                      Dependencies{" "}
                      <span className="text-success">
                        {astSummary?.importedModules?.length ? astSummary.importedModules.join(", ") : "None"}
                      </span>
                    </p>
                    <p className="text-[#77736c]">
                      Complexity{" "}
                      <span className="text-warning">
                        {astSummary?.complexityScore ?? 1} · {astSummary?.complexityRating || "safe"}
                      </span>
                    </p>
                  </div>
                )}

                {devToolsTab === "agent" && (
                  <div className="space-y-3">
                    {!activeExecution ? (
                      <p className="text-[#77736c]">
                        Click “Save &amp; Run Agent” to launch a streaming tool-use coding run billed to the selected account.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c1e22] pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <TrustBadge source={activeExecution.usageAttribution?.dataSource || "deterministic_fallback"} />
                            {activeExecution.usageAttribution?.fallbackUsed && (
                              <span className="badge bg-warning-soft text-warning">
                                Low Confidence · Not AI-Generated
                              </span>
                            )}
                            <span className="text-[#f4f2ec]">
                              {activeExecution.usageAttribution?.apiAccount?.accountName ||
                                activeExecution.usageAttribution?.subscription?.customPlanName ||
                                activeExecution.usageAttribution?.providerSlug}
                              {" · "}
                              {activeExecution.usageAttribution?.model}
                              {" · "}
                              {formatNumber(activeExecution.usageAttribution?.totalTokens || 0)} tokens
                              {" · "}${Number(activeExecution.usageAttribution?.cost || 0).toFixed(4)}
                            </span>
                            {activeExecution.usageAttribution?.balanceBefore !== null &&
                              activeExecution.usageAttribution?.balanceAfter !== null && (
                                <span className="text-accent">
                                  Balance ${Number(activeExecution.usageAttribution?.balanceBefore).toFixed(4)} → $
                                  {Number(activeExecution.usageAttribution?.balanceAfter).toFixed(4)}
                                </span>
                              )}
                          </div>
                          <div className="flex items-center gap-2">
                            {activeExecution.status === "awaiting_approval" && (
                              <>
                                <button
                                  type="button"
                                  disabled={approvalBusy}
                                  onClick={() => handleStudioApproval("request_revision")}
                                  className="btn-secondary btn-sm"
                                >
                                  Request revision
                                </button>
                                <button
                                  type="button"
                                  disabled={approvalBusy}
                                  onClick={() => handleStudioApproval("approve")}
                                  className="btn-primary btn-sm"
                                >
                                  <Check className="h-3 w-3" />
                                  Approve &amp; Merge
                                </button>
                              </>
                            )}
                            <Link
                              href={`/agents?executionId=${encodeURIComponent(activeExecution.id)}`}
                              className="btn-ghost btn-sm text-[#f4f2ec]"
                            >
                              Full diff review
                            </Link>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {(activeExecution.events || []).map((ev) => (
                            <div key={ev.id} className="flex items-start gap-2">
                              <Terminal className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                              <span className="text-accent">[{ev.eventType}]</span>
                              <span className="text-[#c9c6bf] break-all">
                                {ev.payload ? JSON.stringify(ev.payload) : ev.payloadJson}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {agentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
          <div
            ref={agentDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-agent-title"
            className="panel max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Studio Dispatch</p>
                <h2 id="studio-agent-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                  Save &amp; Run Agent
                </h2>
                <p className="mt-1 font-mono text-[10px] text-ink-3">
                  {selectedBinding ? `${selectedBinding.providerName} (${selectedModelSlug || "fallback"})` : activeProject?.name}
                </p>
              </div>
              <button onClick={() => setAgentModalOpen(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={handleRunAgentOnFile} className="space-y-4 p-5">
              {dispatchError && (
                <div className="border border-danger/30 bg-danger-soft/40 px-3 py-2 text-[12px] text-danger">
                  {dispatchError}
                </div>
              )}
              <div>
                <label className="label">Agent instruction</label>
                <textarea
                  required
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Describe what the agent should inspect, edit, test, and commit..."
                  className="field min-h-[100px]"
                />
              </div>
              {selectedBinding && !selectedBinding.canExecuteLive && (
                <label className="flex items-start gap-2 text-[12px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={allowFallback}
                    onChange={(e) => setAllowFallback(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Proceed using deterministic fallback scaffold (marked Low Confidence, Not AI-generated).
                  </span>
                </label>
              )}
              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setAgentModalOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    dispatchingAgent ||
                    !agentPrompt.trim() ||
                    (selectedBinding?.backendType === "manual_unsupported" && !allowFallback)
                  }
                  className="btn-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {dispatchingAgent ? "Running tool loop…" : "Run agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bridgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px]">
          <div role="dialog" aria-modal="true" className="panel w-full max-w-md shadow-float">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-[15px] font-medium text-ink">Attach sanctioned local CLI bridge</h3>
              <button type="button" onClick={() => setBridgeModalOpen(false)} className="icon-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBridge} className="space-y-4 p-5">
              {bridgeError && (
                <div className="border border-danger/30 bg-danger-soft/40 px-3 py-2 text-[12px] text-danger">
                  {bridgeError}
                </div>
              )}
              <p className="text-[12px] leading-relaxed text-ink-3">
                Connect a user-authorized local CLI/OAuth service on localhost/127.0.0.1 exposing OpenAI-compatible <code className="font-mono">/v1/chat/completions</code>.
              </p>
              <div>
                <label className="label">Provider</label>
                <select value={bridgeProviderSlug} onChange={(e) => setBridgeProviderSlug(e.target.value)} className="select">
                  <option value="anthropic">Anthropic / Claude Code CLI Bridge</option>
                  <option value="openai">OpenAI / Codex CLI Bridge</option>
                  <option value="google">Google / Gemini CLI Bridge</option>
                  <option value="cursor">Cursor Local Bridge</option>
                  <option value="antigravity">Antigravity Local Bridge</option>
                </select>
              </div>
              <div>
                <label className="label">Binding label</label>
                <input type="text" value={bridgeLabel} onChange={(e) => setBridgeLabel(e.target.value)} className="field" required />
              </div>
              <div>
                <label className="label">Loopback endpoint URL</label>
                <input type="url" value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} placeholder="http://127.0.0.1:4100" className="field font-mono" required />
              </div>
              <div>
                <label className="label">Default model ID</label>
                <input type="text" value={bridgeModel} onChange={(e) => setBridgeModel(e.target.value)} className="field font-mono" required />
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setBridgeModalOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={savingBridge} className="btn-primary">
                  {savingBridge ? "Saving…" : "Attach bridge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
