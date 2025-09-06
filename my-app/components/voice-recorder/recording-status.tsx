"use client"

interface RecordingStatusProps {
  isRecording: boolean
  isPaused: boolean
  hasRecording: boolean
  recordingTime: number
}

export function RecordingStatus({ isRecording, isPaused, hasRecording, recordingTime }: RecordingStatusProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusText = () => {
    if (isRecording) {
      return isPaused ? "Recording Paused" : "Recording..."
    }
    return hasRecording ? "Recording Complete" : "Ready to Record"
  }

  return (
    <div className="space-y-2">
      <p className="text-lg font-medium text-foreground">{getStatusText()}</p>
      {(isRecording || hasRecording) && <p className="text-2xl font-mono text-primary">{formatTime(recordingTime)}</p>}
    </div>
  )
}
