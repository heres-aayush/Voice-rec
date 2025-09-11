"use client"

import { useEffect, useRef } from "react"

interface WaveformVisualizerProps {
  isRecording: boolean
  isPaused: boolean
  audioLevel: number
  analyser: AnalyserNode | null
}

export function WaveformVisualizer({ isRecording, isPaused, audioLevel, analyser }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const barsRef = useRef<number[]>(new Array(40).fill(0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      if (!isRecording || isPaused) {
        barsRef.current = barsRef.current.map((bar) => Math.max(0, bar * 0.92))
      } else if (analyser) {
        // Get frequency data from analyser
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)

        // Update bars with new frequency data
        const barCount = barsRef.current.length
        const step = Math.floor(dataArray.length / barCount)

        for (let i = 0; i < barCount; i++) {
          const start = i * step
          const end = start + step
          let sum = 0
          for (let j = start; j < end && j < dataArray.length; j++) {
            sum += dataArray[j]
          }
          const average = sum / step
          const normalizedValue = average / 255

          const centerIndex = Math.floor(barCount / 2)
          const distanceFromCenter = Math.abs(i - centerIndex)
          const symmetryFactor = 1 - (distanceFromCenter / centerIndex) * 0.3

          const targetHeight = normalizedValue * 80 * symmetryFactor
          barsRef.current[i] = barsRef.current[i] * 0.6 + targetHeight * 0.4
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = 4
      const barSpacing = 6
      const totalWidth = barsRef.current.length * barSpacing
      const startX = (canvas.width - totalWidth) / 2
      const centerY = canvas.height / 2

      barsRef.current.forEach((height, index) => {
        const x = startX + index * barSpacing
        const centerIndex = Math.floor(barsRef.current.length / 2)
        const distanceFromCenter = Math.abs(index - centerIndex)

        const isActive = height > 2
        const opacity = isActive ? Math.min(1, height / 50) : 0.3

        if (distanceFromCenter > centerIndex * 0.6) {
          ctx.fillStyle = `rgba(34, 211, 238, ${opacity})`
          ctx.beginPath()
          ctx.arc(x + barWidth / 2, centerY, 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const barHeight = Math.max(4, height)
          ctx.fillStyle = `rgba(34, 211, 238, ${opacity})`
          ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight)
        }
      })

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRecording, isPaused, analyser])

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={80}
        className="w-full h-[80px] rounded-lg bg-black/90 border border-border/50"
      />
    </div>
  )
}
