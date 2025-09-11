"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Scissors } from "lucide-react"

interface AudioTrimmerProps {
  audioBlob: Blob
  onTrimComplete: (trimmedBlob: Blob) => void
  onCancel: () => void
}

export function AudioTrimmer({ audioBlob, onTrimComplete, onCancel }: AudioTrimmerProps) {
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null)
  const [isReady, setIsReady] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const audioUrlRef = useRef<string>("")

  useEffect(() => {
    const url = URL.createObjectURL(audioBlob)
    audioUrlRef.current = url

    const audio = audioRef.current
    if (audio) {
      audio.src = url
      audio.load()
    }

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [audioBlob])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setTrimEnd(audio.duration)
      setIsReady(true)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)

      // Auto-pause at trim end
      if (audio.currentTime >= trimEnd && isPlaying) {
        audio.pause()
        setIsPlaying(false)
        audio.currentTime = trimStart
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      audio.currentTime = trimStart
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
    }
  }, [trimEnd, trimStart, isPlaying])

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !isReady) return

    try {
      if (isPlaying) {
        audio.pause()
      } else {
        // Set position to trim start if outside range
        if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) {
          audio.currentTime = trimStart
        }
        await audio.play()
      }
    } catch (error) {
      console.error("Playback error:", error)
      setIsPlaying(false)
    }
  }, [isPlaying, isReady, trimStart, trimEnd])

  const handleMouseDown = useCallback(
    (type: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(type)
    },
    [],
  )

  const updateTrimPosition = useCallback(
    (clientX: number) => {
      if (!waveformRef.current || !duration) return

      const rect = waveformRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      const time = percentage * duration

      if (isDragging === "start") {
        setTrimStart(Math.max(0, Math.min(time, trimEnd - 0.1)))
      } else if (isDragging === "end") {
        setTrimEnd(Math.max(trimStart + 0.1, Math.min(time, duration)))
      }
    },
    [isDragging, duration, trimStart, trimEnd],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      updateTrimPosition(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, updateTrimPosition])

  const trimAudio = useCallback(async () => {
    try {
      const audioContext = new AudioContext()
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const startSample = Math.floor(trimStart * audioBuffer.sampleRate)
      const endSample = Math.floor(trimEnd * audioBuffer.sampleRate)
      const trimmedLength = endSample - startSample

      if (trimmedLength <= 0) return

      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        audioBuffer.sampleRate,
      )

      // Copy audio data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel)
        const trimmedData = trimmedBuffer.getChannelData(channel)
        for (let i = 0; i < trimmedLength; i++) {
          trimmedData[i] = originalData[startSample + i]
        }
      }

      // Render to WAV
      const offlineContext = new OfflineAudioContext(
        trimmedBuffer.numberOfChannels,
        trimmedBuffer.length,
        trimmedBuffer.sampleRate,
      )

      const source = offlineContext.createBufferSource()
      source.buffer = trimmedBuffer
      source.connect(offlineContext.destination)
      source.start()

      const renderedBuffer = await offlineContext.startRendering()
      const wavBlob = audioBufferToWav(renderedBuffer)

      onTrimComplete(wavBlob)
    } catch (error) {
      console.error("Trim error:", error)
    }
  }, [audioBlob, trimStart, trimEnd, onTrimComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-lg border border-border/50">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Trim Audio</h3>
        <p className="text-sm text-muted-foreground">Drag the cyan handles to select the portion you want to keep</p>
      </div>

      <div
        ref={waveformRef}
        className="relative w-full h-20 bg-black/90 rounded-lg overflow-hidden cursor-pointer border border-border/50"
      >
        {/* Waveform visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center space-x-1">
            {/* Dots on left */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={`left-${i}`} className="w-1 h-1 bg-cyan-400/60 rounded-full" />
            ))}

            {/* Central bars */}
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={`center-${i}`}
                className="bg-cyan-400 rounded-sm"
                style={{
                  width: "2px",
                  height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}px`,
                }}
              />
            ))}

            {/* Dots on right */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={`right-${i}`} className="w-1 h-1 bg-cyan-400/60 rounded-full" />
            ))}
          </div>
        </div>

        {/* Trim selection overlay */}
        {duration > 0 && (
          <div
            className="absolute top-0 h-full bg-cyan-500/20 border-l-2 border-r-2 border-cyan-400"
            style={{
              left: `${(trimStart / duration) * 100}%`,
              width: `${((trimEnd - trimStart) / duration) * 100}%`,
            }}
          />
        )}

        {/* Current time indicator */}
        {duration > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-red-500"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}

        {/* Start handle */}
        {duration > 0 && (
          <div
            className="absolute top-0 w-3 h-full bg-cyan-400 cursor-ew-resize hover:bg-cyan-300 transition-colors flex items-center justify-center"
            style={{ left: `${(trimStart / duration) * 100}%` }}
            onMouseDown={handleMouseDown("start")}
          >
            <div className="w-1 h-8 bg-white rounded-full" />
          </div>
        )}

        {/* End handle */}
        {duration > 0 && (
          <div
            className="absolute top-0 w-3 h-full bg-cyan-400 cursor-ew-resize hover:bg-cyan-300 transition-colors flex items-center justify-center"
            style={{ left: `${(trimEnd / duration) * 100}%`, transform: "translateX(-100%)" }}
            onMouseDown={handleMouseDown("end")}
          >
            <div className="w-1 h-8 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between text-sm">
        <span>Start: {formatTime(trimStart)}</span>
        <span className="font-semibold">Duration: {formatTime(trimEnd - trimStart)}</span>
        <span>End: {formatTime(trimEnd)}</span>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button onClick={togglePlayback} variant="outline" disabled={!isReady}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {!isReady ? "Loading..." : isPlaying ? "Pause" : "Play"}
        </Button>
        <div className="text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center space-x-4">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button
          onClick={trimAudio}
          className="bg-primary hover:bg-primary/90"
          disabled={!isReady || trimEnd - trimStart <= 0}
        >
          <Scissors className="w-4 h-4 mr-2" />
          Apply Trim
        </Button>
      </div>

      <audio ref={audioRef} className="hidden" preload="metadata" />
    </div>
  )
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length
  const numberOfChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + length * numberOfChannels * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numberOfChannels * 2, true)
  view.setUint16(32, numberOfChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, length * numberOfChannels * 2, true)

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" })
}
