"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Play, Download, Trash2 } from "lucide-react"

interface Recording {
  id: string
  name: string
  blob: Blob
  url: string
  duration: number
}

interface SavedRecordingsProps {
  recordings: Recording[]
  onPlay: (recording: Recording) => void
  onDownload: (recording: Recording) => void
  onDelete: (id: string) => void
}

export function SavedRecordings({ recordings, onPlay, onDownload, onDelete }: SavedRecordingsProps) {
  if (recordings.length === 0) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="mt-8 p-6 bg-card/50 backdrop-blur-sm border-border/50">
      <h3 className="text-xl font-semibold text-foreground mb-4">Saved Recordings</h3>
      <div className="space-y-3">
        {recordings.map((recording) => (
          <div key={recording.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Button onClick={() => onPlay(recording)} variant="outline" size="sm" className="rounded-full">
                <Play className="w-4 h-4" />
              </Button>
              <div>
                <p className="font-medium text-foreground">{recording.name}</p>
                <p className="text-sm text-muted-foreground">{formatTime(recording.duration)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => onDownload(recording)} variant="outline" size="sm" className="rounded-full">
                <Download className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => onDelete(recording.id)}
                variant="outline"
                size="sm"
                className="rounded-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
