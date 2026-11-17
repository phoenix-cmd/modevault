"use client"

import { useState } from "react"
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
} from "lucide-react"
import Editor from "@monaco-editor/react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

const SAMPLE_FILES: Record<string, string> = {
  "src/app/api/checkout/route.ts": `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Missing Idempotency-Key header" }, { status: 400 });
    }

    // Atomic idempotency verification
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey }
    });

    if (existing && existing.status === "completed") {
      return NextResponse.json(JSON.parse(existing.responseBody), { status: 200 });
    }

    const body = await req.json();
    return NextResponse.json({
      success: true,
      transactionId: "tx_" + Date.now().toString(36),
      amount: body.amount,
      status: "confirmed"
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}`,
  "src/lib/services/api-client.ts": `export class ApiClient {
  async request<T>(endpoint: string, options: any = {}): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
    };
    const res = await fetch(endpoint, { headers });
    return await res.json() as T;
  }
}`,
  "package.json": `{
  "name": "fintech-checkout",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "jest"
  },
  "dependencies": {
    "next": "16.4.6",
    "react": "19.3.0",
    "prisma": "^6.19.3"
  }
}`,
}

export default function StudioPage() {
  const [selectedFile, setSelectedFile] = useState("src/app/api/checkout/route.ts")
  const [code, setCode] = useState(SAMPLE_FILES[selectedFile])
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activePane, setActivePane] = useState<"editor" | "preview">("editor")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSelectFile = (fileName: string) => {
    setSelectedFile(fileName)
    setCode(SAMPLE_FILES[fileName] || "// File content empty")
  }

  const handleSave = () => {
    SAMPLE_FILES[selectedFile] = code
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  return (
    <div className="space-y-4 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Development Studio & Live Preview"
        description="Browser-based Monaco code workspace with AST modifications and sandboxed preview reverse proxy."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-[#040404] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all"
            >
              {saveSuccess ? "Saved to Worktree ✓" : "Save Changes"}
            </button>
          </div>
        }
      />

      {/* Main Workspace Frame */}
      <div className="rounded-xl border border-[#E8EAED] bg-[#FFFFFF] shadow-sm overflow-hidden flex flex-col h-[740px]">
        {/* Studio Top Control Bar */}
        <div className="flex items-center justify-between border-b border-[#E8EAED] bg-[#F8F9FB] px-4 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[#17191C] font-semibold flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-[#D5222D]" />
              {selectedFile}
            </span>
            <span className="text-[#9AA0A8]">•</span>
            <span className="text-[11px] text-[#737982]">TypeScript Sandbox (Port :3001)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Viewport controls */}
            <div className="flex items-center rounded-lg border border-[#E8EAED] bg-[#FFFFFF] p-0.5">
              <button
                onClick={() => setViewport("desktop")}
                className={`p-1 rounded ${viewport === "desktop" ? "bg-[#F2F3F5] text-[#17191C]" : "text-[#9AA0A8]"}`}
                title="Desktop"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewport("tablet")}
                className={`p-1 rounded ${viewport === "tablet" ? "bg-[#F2F3F5] text-[#17191C]" : "text-[#9AA0A8]"}`}
                title="Tablet"
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={`p-1 rounded ${viewport === "mobile" ? "bg-[#F2F3F5] text-[#17191C]" : "text-[#9AA0A8]"}`}
                title="Mobile"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Toggle Editor vs Live Preview */}
            <div className="flex rounded-lg border border-[#E8EAED] bg-[#FFFFFF] p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActivePane("editor")}
                className={`px-2.5 py-1 rounded ${activePane === "editor" ? "bg-[#040404] text-white" : "text-[#737982]"}`}
              >
                Code Editor
              </button>
              <button
                onClick={() => setActivePane("preview")}
                className={`px-2.5 py-1 rounded ${activePane === "preview" ? "bg-[#040404] text-white" : "text-[#737982]"}`}
              >
                Live Preview
              </button>
            </div>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Explorer (Left sidebar) */}
          <div className="w-60 border-r border-[#E8EAED] bg-[#F8F9FB] p-3 overflow-y-auto space-y-3 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0A8] px-2">
              Project Explorer
            </p>
            <div className="space-y-0.5">
              {Object.keys(SAMPLE_FILES).map((file) => {
                const isSelected = selectedFile === file
                return (
                  <button
                    key={file}
                    onClick={() => handleSelectFile(file)}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-[#FFFFFF] font-semibold text-[#17191C] shadow-xs border border-[#E8EAED]"
                        : "text-[#737982] hover:bg-[#F2F3F5] hover:text-[#17191C]"
                    }`}
                  >
                    <FileCode className={`h-3.5 w-3.5 ${isSelected ? "text-[#D5222D]" : "text-[#9AA0A8]"}`} />
                    <span className="truncate">{file.split("/").pop()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Pane: Editor or Live Preview */}
          <div className="flex-1 overflow-hidden bg-[#FFFFFF]">
            {activePane === "editor" ? (
              <Editor
                height="100%"
                language={selectedFile.endsWith(".json") ? "json" : "typescript"}
                theme="vs-light"
                value={code}
                onChange={(v) => setCode(v || "")}
                options={{
                  fontSize: 12.5,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: "on",
                  fontFamily: "Geist Mono, JetBrains Mono, monospace",
                }}
              />
            ) : (
              <div className="h-full w-full bg-[#F2F3F5] flex items-center justify-center p-4">
                <div
                  className={`h-full bg-white rounded-lg shadow-md border border-[#E8EAED] overflow-hidden flex flex-col transition-all duration-300 ${
                    viewport === "mobile"
                      ? "w-[375px]"
                      : viewport === "tablet"
                      ? "w-[768px]"
                      : "w-full"
                  }`}
                >
                  <div className="h-8 border-b border-[#E8EAED] bg-[#F8F9FB] px-3 flex items-center gap-2 text-[11px] text-[#737982]">
                    <span className="h-2 w-2 rounded-full bg-[#1F7A4D]" />
                    <span className="font-mono">http://localhost:3001/checkout</span>
                  </div>
                  <div className="flex-1 p-8 text-center space-y-4 flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-xl bg-[#EDF7F1] text-[#1F7A4D] flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-[#17191C]">
                      Fintech Checkout Session Ready
                    </h3>
                    <p className="text-xs text-[#737982] max-w-sm">
                      Idempotency validation active. Live preview running from cloud sandbox container.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
