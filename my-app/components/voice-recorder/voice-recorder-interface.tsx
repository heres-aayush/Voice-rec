"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { RecordingButton } from "./recording-button"
import { RecordingControls } from "./recording-controls"
import { RecordingStatus } from "./recording-status"
import { WaveformVisualizer } from "./waveform-visualizer"
import { SavedRecordings } from "./saved-recordings"
import { SaveDialog } from "./save-dialog"

interface Recording {
  id: string
  name: string
  blob: Blob
  url: string
  duration: number
}

export function VoiceRecorderInterface() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [fileName, setFileName] = useState("")
  const [tempRecordings, setTempRecordings] = useState<Recording[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const timerRef = useRef<NodeJS.Timeout>()
  const chunksRef = useRef<BlobPart[]>([])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      source.connect(analyser)
      analyser.fftSize = 256
      analyserRef.current = analyser

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
        setShowSaveDialog(true)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      monitorAudioLevel()
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
  }

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    const updateLevel = () => {
      if (!analyserRef.current || !isRecording || isPaused) return

      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      setAudioLevel(average / 255)

      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      setAudioLevel(0)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  const saveRecording = () => {
    if (!audioBlob || !fileName.trim()) return

    const recordingId = Date.now().toString()
    const newRecording = {
      id: recordingId,
      name: fileName.trim(),
      blob: audioBlob,
      url: audioUrl!,
      duration: recordingTime,
    }

    setTempRecordings((prev) => [...prev, newRecording])
    setShowSaveDialog(false)
    setFileName("")

    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
  }

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const playTempRecording = (recording: Recording) => {
    if (audioRef.current) {
      audioRef.current.src = recording.url
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleUploadToDrive = () => {
    console.log("Uploading to Google Drive...", audioBlob)
    alert("Upload to Google Drive functionality will be implemented on the backend")
  }

  const handleDownload = (recording?: Recording) => {
    const blob = recording ? recording.blob : audioBlob
    const name = recording ? recording.name : `recording-${new Date().toISOString().slice(0, 19)}`

    if (!blob) return

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setIsPlaying(false)
    setRecordingTime(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const deleteTempRecording = (id: string) => {
    setTempRecordings((prev) => prev.filter((rec) => rec.id !== id))
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
        <div className="text-center space-y-8">
          <RecordingButton
            isRecording={isRecording}
            audioLevel={audioLevel}
            onToggleRecording={handleToggleRecording}
          />

          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            isPlaying={isPlaying}
            hasRecording={!!audioBlob}
            onPauseResume={handlePauseResume}
            onTogglePlayback={togglePlayback}
            onDownload={() => handleDownload()}
            onUpload={handleUploadToDrive}
            onClear={clearRecording}
          />

          <RecordingStatus
            isRecording={isRecording}
            isPaused={isPaused}
            hasRecording={!!audioBlob}
            recordingTime={recordingTime}
          />

          <WaveformVisualizer audioLevel={audioLevel} isVisible={isRecording && !isPaused} />
        </div>
      </Card>

      <SavedRecordings
        recordings={tempRecordings}
        onPlay={playTempRecording}
        onDownload={handleDownload}
        onDelete={deleteTempRecording}
      />

      <SaveDialog
        isOpen={showSaveDialog}
        fileName={fileName}
        onFileNameChange={setFileName}
        onSave={saveRecording}
        onCancel={() => setShowSaveDialog(false)}
      />

      {(audioUrl || tempRecordings.length > 0) && (
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
      )}
    </div>
  )
}
