"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, Download, Edit2, ChevronDown, ChevronRight, Home, Loader } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import type { JSX } from "react/jsx-runtime"

interface JsonNode {
  key: string
  value: any
  type: "object" | "array" | "string" | "number" | "boolean" | "null"
  expanded: boolean
}

export default function ShowOutputPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const key = searchParams.get("key")

  const [jsonData, setJsonData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const [editMode, setEditMode] = useState(false)
  const [editedJson, setEditedJson] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchJsonData = async () => {
      if (!key) {
        setError("No key provided. Please upload an audio file first.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/get-s3?key=${encodeURIComponent(key)}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch JSON: ${response.statusText}`)
        }

        const data = await response.json()
        setJsonData(data)
        setEditedJson(JSON.stringify(data, null, 2))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load JSON from output bucket")
      } finally {
        setLoading(false)
      }
    }

    fetchJsonData()
  }, [key])

  const toggleNode = (nodePath: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodePath)) {
      newExpanded.delete(nodePath)
    } else {
      newExpanded.add(nodePath)
    }
    setExpandedNodes(newExpanded)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const downloadJson = () => {
    const element = document.createElement("a")
    const file = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    })
    element.href = URL.createObjectURL(file)
    element.download = `output-${Date.now()}.json`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const saveEdits = () => {
    try {
      const parsed = JSON.parse(editedJson)
      setJsonData(parsed)
      setEditMode(false)
    } catch (err) {
      alert("Invalid JSON format")
    }
  }

  const renderJsonValue = (value: any, path = "root"): JSX.Element => {
    if (value === null) {
      return <span className="text-red-500">null</span>
    }

    if (typeof value === "boolean") {
      return <span className="text-blue-500">{value.toString()}</span>
    }

    if (typeof value === "number") {
      return <span className="text-green-500">{value}</span>
    }

    if (typeof value === "string") {
      return <span className="text-orange-500">"{value}"</span>
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedNodes.has(path)
      return (
        <div className="ml-4">
          <button
            onClick={() => toggleNode(path)}
            className="inline-flex items-center gap-1 text-foreground hover:bg-muted/50 px-2 py-1 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-blue-600 dark:text-blue-400">[{value.length}]</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-border pl-4 space-y-1">
              {value.map((item, index) => (
                <div key={index} className="text-sm">
                  <span className="text-muted-foreground">[{index}]:</span> {renderJsonValue(item, `${path}[${index}]`)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (typeof value === "object") {
      const isExpanded = expandedNodes.has(path)
      const keys = Object.keys(value)
      return (
        <div className="ml-4">
          <button
            onClick={() => toggleNode(path)}
            className="inline-flex items-center gap-1 text-foreground hover:bg-muted/50 px-2 py-1 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-purple-600 dark:text-purple-400">{keys.length}</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-border pl-4 space-y-1">
              {keys.map((key) => (
                <div key={key} className="text-sm">
                  <span className="text-cyan-600 dark:text-cyan-400">"{key}"</span>
                  <span className="text-muted-foreground">: </span>
                  {renderJsonValue(value[key], `${path}.${key}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return <span className="text-foreground">{String(value)}</span>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">JSON</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Output Viewer</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => router.push("/")} variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Back to Recorder
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <Card className="p-12 bg-card/50 backdrop-blur-sm border-2 border-border/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading JSON data...</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-8 bg-card/50 backdrop-blur-sm border-2 border-border/50">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-destructive">Error</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => router.push("/")} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Return to Recorder
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-wrap gap-3 items-center justify-between bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4">
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button onClick={downloadJson} variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
                <Button
                  onClick={() => setEditMode(!editMode)}
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {editMode ? "Viewing" : "Edit"}
                </Button>
              </div>

              {/* JSON Display */}
              {editMode ? (
                <Card className="p-6 bg-card/50 backdrop-blur-sm border-2 border-border/50">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">Edit JSON</h2>
                    <textarea
                      value={editedJson}
                      onChange={(e) => setEditedJson(e.target.value)}
                      className="w-full h-96 p-4 bg-background border border-border rounded-lg font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button onClick={() => setEditMode(false)} variant="outline">
                        Cancel
                      </Button>
                      <Button onClick={saveEdits}>Save Changes</Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 bg-card/50 backdrop-blur-sm border-2 border-border/50">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground mb-4">JSON Output</h2>
                    <div className="bg-background rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto border border-border/50">
                      <div className="text-foreground select-text">{renderJsonValue(jsonData)}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Raw JSON View */}
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-2 border-border/50">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Raw JSON</h2>
                  <pre className="bg-background rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto border border-border/50 text-foreground select-text">
                    {JSON.stringify(jsonData, null, 2)}
                  </pre>
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-background mt-12">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            JSON Output Viewer - View, Edit, and Download your processed data
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
