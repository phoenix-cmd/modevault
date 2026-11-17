import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const name = (formData.get("name") as string) || "Imported Project"
    const workspaceId = (formData.get("workspaceId") as string) || "ws_core_001"

    if (!file) {
      return NextResponse.json({ error: "No ZIP file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    const fileList: string[] = []
    let detectedFramework = "custom"
    let detectedLanguage = "javascript"
    let packageJsonContent: any = null

    // Traverse ZIP file tree
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        fileList.push(relativePath)
      }
    })

    // Inspect files for frameworks and dependencies
    const pkgFile = zip.file("package.json") || zip.file(fileList.find((f) => f.endsWith("package.json")) || "")
    if (pkgFile) {
      try {
        const text = await pkgFile.async("string")
        packageJsonContent = JSON.parse(text)
        const deps = { ...packageJsonContent.dependencies, ...packageJsonContent.devDependencies }

        if (deps["next"]) detectedFramework = "nextjs"
        else if (deps["react"]) detectedFramework = "react"
        else if (deps["vue"]) detectedFramework = "vue"
        else detectedFramework = "node"

        if (deps["typescript"] || fileList.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
          detectedLanguage = "typescript"
        }
      } catch (e) {
        console.warn("Failed to parse package.json from zip", e)
      }
    } else if (fileList.some((f) => f.endsWith(".py") || f.endsWith("requirements.txt"))) {
      detectedFramework = "python"
      detectedLanguage = "python"
    }

    const detectedDependencies = packageJsonContent
      ? Object.keys({ ...packageJsonContent.dependencies, ...packageJsonContent.devDependencies })
      : ["standard-runtime"]

    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-")

    // Create Project, Source, and provision Sandbox Environment in DB
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        slug,
        description: `Imported from archive: ${file.name} (${Math.round(file.size / 1024)} KB, ${fileList.length} files)`,
        framework: detectedFramework,
        language: detectedLanguage,
        status: "ready",
        environments: {
          create: {
            runtime: detectedLanguage === "python" ? "python-3.11" : "nodejs-20",
            buildCommand: detectedLanguage === "python" ? "pip install -r requirements.txt" : "npm install",
            startCommand: detectedLanguage === "python" ? "python main.py" : "npm run dev",
            runPort: 3000 + Math.floor(Math.random() * 500),
            status: "running",
          },
        },
        sources: {
          create: {
            type: "zip_upload",
            fileName: file.name,
            fileSize: file.size,
            branch: "main",
            manifestJson: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              fileCount: fileList.length,
              files: fileList.slice(0, 100),
              detectedFramework,
              detectedLanguage,
              dependencies: detectedDependencies.slice(0, 20),
            }),
          },
        },
      },
      include: {
        environments: true,
        sources: true,
      },
    })

    return NextResponse.json({
      data: {
        project,
        inspection: {
          fileName: file.name,
          fileCount: fileList.length,
          framework: detectedFramework,
          language: detectedLanguage,
          dependencies: detectedDependencies.slice(0, 15),
          previewFiles: fileList.slice(0, 15),
        },
      },
    })
  } catch (err: any) {
    console.error("ZIP upload error:", err)
    return NextResponse.json({ error: err.message || "Failed to process ZIP archive" }, { status: 500 })
  }
}
