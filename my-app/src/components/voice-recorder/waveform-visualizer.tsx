"use client"

interface WaveformVisualizerProps {
  audioLevel: number
  isVisible: boolean
}

export function WaveformVisualizer({ audioLevel, isVisible }: WaveformVisualizerProps) {
  if (!isVisible) return null

  return (
    <div className="flex items-center justify-center space-x-1 h-16">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full transition-all duration-150"
          style={{
            height: `${8 + Math.random() * audioLevel * 40}px`,
            opacity: 0.3 + audioLevel * 0.7,
          }}
        />
      ))}
    </div>
  )
}
