import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Sample virtual project file tree and content for sandboxed code inspection
const MOCK_PROJECT_FILES: Record<string, { path: string; language: string; content: string; astSummary?: any }> = {
  "src/app/api/checkout/route.ts": {
    path: "src/app/api/checkout/route.ts",
    language: "typescript",
    content: `import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get("Idempotency-Key")
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Missing required Idempotency-Key header" }, { status: 400 })
    }

    const body = await req.json()
    const { amount, currency, customerId } = body

    // Atomic idempotency verification
    const existingTransaction = await prisma.billingRecord.findFirst({
      where: { invoiceNumber: idempotencyKey },
    })

    if (existingTransaction) {
      return NextResponse.json({
        cached: true,
        transactionId: existingTransaction.id,
        status: existingTransaction.status,
      })
    }

    // Process new payment
    const record = await prisma.billingRecord.create({
      data: {
        userId: customerId,
        invoiceNumber: idempotencyKey,
        amount,
        currency: currency || "USD",
        status: "paid",
        periodStart: new Date(),
        periodEnd: new Date(),
      },
    })

    return NextResponse.json({ success: true, record }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}`,
    astSummary: {
      functions: ["POST"],
      imports: ["next/server", "@/lib/db"],
      complexityScore: 4,
      dependencies: ["prisma", "next"],
    },
  },
  "src/lib/services/api-client.ts": {
    path: "src/lib/services/api-client.ts",
    language: "typescript",
    content: `export interface RequestConfig {
  timeoutMs?: number;
  retryAttempts?: number;
  idempotencyKey?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const maxRetries = options.retryAttempts ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
        };
        const res = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
          headers,
          signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
        });
        if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
        return await res.json() as T;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 200));
        }
      }
    }
    throw lastError ?? new Error("Request failed after retries");
  }
}`,
    astSummary: {
      classes: ["ApiClient"],
      methods: ["constructor", "request"],
      complexityScore: 6,
      dependencies: [],
    },
  },
  "src/components/checkout-button.tsx": {
    path: "src/components/checkout-button.tsx",
    language: "typescript",
    content: `"use client"

import { useState } from "react"
import { motion } from "motion/react"

export function CheckoutButton({ amount, planName }: { amount: number; planName: string }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleCheckout = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const idempotencyKey = \`checkout_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ amount, customerId: "user_demo_001" }),
      })
      if (!res.ok) throw new Error("Checkout failed")
      setStatus("success")
    } catch {
      setStatus("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCheckout}
        disabled={loading}
        className="px-4 py-2.5 rounded-lg bg-[#040404] text-white text-sm font-medium hover:bg-black transition-colors"
      >
        {loading ? "Securing Session..." : \`Upgrade to \${planName} ($` + `${"${amount}"}` + `/mo)\`}
      </motion.button>
      {status === "success" && (
        <span className="text-xs text-emerald-600 font-medium">Payment initiated securely!</span>
      )}
    </div>
  )
}`,
    astSummary: {
      components: ["CheckoutButton"],
      hooks: ["useState"],
      complexityScore: 3,
      dependencies: ["motion/react", "react"],
    },
  },
  "package.json": {
    path: "package.json",
    language: "json",
    content: `{
  "name": "acme-trade-engine",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "motion": "^12.0.0"
  }
}`,
    astSummary: {
      type: "manifest",
      dependencyCount: 5,
    },
  },
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get("file")

    let project = await prisma.project.findUnique({
      where: { id },
      include: {
        sources: true,
      },
    })

    if (!project) {
      project = await prisma.project.findFirst({
        include: {
          sources: true,
        },
      })
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // If specific file requested, return its content and AST
    if (filePath) {
      const file = MOCK_PROJECT_FILES[filePath]
      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }
      return NextResponse.json({ data: file })
    }

    // Otherwise return tree structure
    const tree = [
      {
        name: "src",
        type: "directory",
        children: [
          {
            name: "app",
            type: "directory",
            children: [
              {
                name: "api",
                type: "directory",
                children: [
                  {
                    name: "checkout",
                    type: "directory",
                    children: [
                      { name: "route.ts", type: "file", path: "src/app/api/checkout/route.ts", size: 1420 },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: "components",
            type: "directory",
            children: [
              { name: "checkout-button.tsx", type: "file", path: "src/components/checkout-button.tsx", size: 1250 },
            ],
          },
          {
            name: "lib",
            type: "directory",
            children: [
              {
                name: "services",
                type: "directory",
                children: [
                  { name: "api-client.ts", type: "file", path: "src/lib/services/api-client.ts", size: 1100 },
                ],
              },
            ],
          },
        ],
      },
      { name: "package.json", type: "file", path: "package.json", size: 320 },
      { name: "tsconfig.json", type: "file", path: "tsconfig.json", size: 540 },
    ]

    return NextResponse.json({
      data: {
        projectId: project.id,
        projectName: project.name,
        branch: project.defaultBranch,
        tree,
        allFiles: Object.keys(MOCK_PROJECT_FILES),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
