"use client"

import { Button } from "@/components/ui/button"
import { Mic, StopCircle } from "lucide-react"

interface RecordingButtonProps {
  isRecording: boolean
  audioLevel: number
  onToggleRecording: () => void
}

export function RecordingButton({ isRecording, audioLevel, onToggleRecording }: RecordingButtonProps) {
  return (
    <div className="relative">
      <Button
        onClick={onToggleRecording}
        size="lg"
        className={`w-24 h-24 rounded-full transition-all duration-300 ${
          isRecording ? "bg-destructive hover:bg-destructive/90 animate-pulse" : "bg-primary hover:bg-primary/90"
        }`}
        style={{
          transform: isRecording ? `scale(${1 + audioLevel * 0.3})` : "scale(1)",
          boxShadow: isRecording
            ? `0 0 ${20 + audioLevel * 30}px rgba(239, 68, 68, 0.5)`
            : "0 0 20px rgba(21, 128, 61, 0.3)",
        }}
      >
        {isRecording ? (
          <StopCircle className="w-8 h-8 text-primary-foreground" />
        ) : (
          <Mic className="w-8 h-8 text-primary-foreground" />
        )}
      </Button>

      {/* Audio Level Visualization */}
      {isRecording && <div className="absolute inset-0 rounded-full border-4 border-destructive/30 animate-ping" />}
    </div>
  )
}
