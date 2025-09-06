"use client"

import { Button } from "@/components/ui/button"
import { Play, Pause, Download, Upload, Trash2 } from "lucide-react"

interface RecordingControlsProps {
  isRecording: boolean
  isPaused: boolean
  isPlaying: boolean
  hasRecording: boolean
  onPauseResume: () => void
  onTogglePlayback: () => void
  onDownload: () => void
  onUpload: () => void
  onClear: () => void
}

export function RecordingControls({
  isRecording,
  isPaused,
  isPlaying,
  hasRecording,
  onPauseResume,
  onTogglePlayback,
  onDownload,
  onUpload,
  onClear,
}: RecordingControlsProps) {
  return (
    <>
      {/* Pause/Resume Controls */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-4">
          <Button onClick={onPauseResume} variant="outline" size="lg" className="rounded-full bg-transparent">
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>
        </div>
      )}

      {/* Playback Controls */}
      {hasRecording && (
        <div className="flex items-center justify-center space-x-4">
          <Button onClick={onTogglePlayback} variant="outline" size="lg" className="rounded-full bg-transparent">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>

          <Button onClick={onDownload} variant="outline" size="lg" className="rounded-full bg-transparent">
            <Download className="w-5 h-5" />
          </Button>

          <Button
            onClick={onUpload}
            variant="default"
            size="lg"
            className="rounded-full bg-secondary hover:bg-secondary/90"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload to Drive
          </Button>

          <Button
            onClick={onClear}
            variant="outline"
            size="lg"
            className="rounded-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      )}
    </>
  )
}
