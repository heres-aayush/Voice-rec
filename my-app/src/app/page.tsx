"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mic,
  Play,
  Upload,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  LogOut,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/components/auth-context";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { AudioTrimmer } from "./../components/audio-trimmer";

function VoiceRecorderApp() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTrimDialog, setShowTrimDialog] = useState(false); // Added trim dialog state
  const [fileName, setFileName] = useState("");
  const [tempRecordings, setTempRecordings] = useState<
    Array<{
      id: string;
      name: string;
      blob: Blob;
      url: string;
      duration: number;
      fileId: string;
    }>
  >([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const chunksRef = useRef<BlobPart[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(true);
  const [showTranscriptButton, setShowTranscriptButton] = useState(false);
  const [uploadedFileKey, setUploadedFileKey] = useState<string | null>(null);


  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentPlayingId(null);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    const fetchDriveFiles = async () => {
      const token = sessionStorage.getItem("google_access_token");
      if (!token) {
        setLoadingDriveFiles(false);
        return;
      }

      try {
        const res = await fetch("/api/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (res.ok) {
          setDriveFiles(data.files);
        } else {
          console.error("Error fetching Drive files:", data);
        }
      } catch (err) {
        console.error("Network error fetching Drive files:", err);
      }
      setLoadingDriveFiles(false);
    };

    fetchDriveFiles();
  }, []);

  const startRecording = async () => {
    if (!isAuthenticated) {
      alert("Please sign in to start recording");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        handleRecordingComplete(blob); // Use new handler
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start audio level monitoring
      monitorAudioLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current || !isRecording || isPaused) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevel(0);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
    setAudioUrl(URL.createObjectURL(blob));
    setShowTrimDialog(true);
  };

  const handleTrimComplete = (trimmedBlob: Blob) => {
    setAudioBlob(trimmedBlob);
    setAudioUrl(URL.createObjectURL(trimmedBlob));
    setShowTrimDialog(false);
    setShowSaveDialog(true);
  };

  const handleSkipTrim = () => {
    setShowTrimDialog(false);
    setShowSaveDialog(true);
  };

  const saveRecording = () => {
    if (!audioBlob) return;

    // Build final name: user name (optional) + timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = fileName.trim()
      ? `${fileName.trim()}-${timestamp}`
      : `recording-${timestamp}`;

    const recordingId = Date.now().toString();
    const newRecording = {
      id: recordingId,
      name: baseName,
      blob: audioBlob,
      url: audioUrl!,
      duration: recordingTime,
      fileId: "",
    };

    setTempRecordings((prev) => [...prev, newRecording]);
    setShowSaveDialog(false);
    setFileName("");

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const playTempRecording = (recording: any) => {
    if (audioRef.current) {
      if (currentPlayingId === recording.id && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setCurrentPlayingId(null);
      } else {
        setCurrentTime(0);
        setDuration(0);
        audioRef.current.src = recording.url;
        audioRef.current.load();
        audioRef.current.play();
        setIsPlaying(true);
        setCurrentPlayingId(recording.id);
      }
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      seekTo(newTime);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(duration, audioRef.current.currentTime + 10);
      seekTo(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatTimeDetailed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleUploadToDrive = async (recording?: any) => {
    const blob = recording ? recording.blob : audioBlob;
    const nameInput = recording ? recording.name : fileName.trim();

    if (!blob) {
      alert("❌ No recording to upload.");
      return;
    }

    try {
      const token = sessionStorage.getItem("google_access_token");
      if (!token) {
        alert("❌ Please sign in with Google first.");
        return;
      }

      // Generate final filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = nameInput
        ? `${nameInput}-${timestamp}.webm`
        : `recording-${timestamp}.webm`;

      const formData = new FormData();
      formData.append("file", blob, safeName);
      formData.append("token", token);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        alert(`✅ Uploaded successfully!`);


        if (recording) {
          setTempRecordings((prev) =>
            prev.map((rec) =>
              rec.id === recording.id
                ? { ...rec, name: safeName, fileId: result.file.id }
                : rec
            )
          );
        }
      } else {
        alert(`❌ Upload failed: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Upload failed due to network/server error.");
    }
  };

  const handleUploadToS3 = async (recording?: any) => {
    const blob = recording ? recording.blob : audioBlob;
    const nameInput = recording ? recording.name : fileName.trim();

    if (!blob) {
      alert("❌ No recording to upload.");
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileKey = nameInput
        ? `${nameInput}-${timestamp}.webm`
        : `recording-${timestamp}.webm`;

      const formData = new FormData();
      formData.append("file", blob, fileKey); 

      const res = await fetch("/api/s3-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Uploaded to S3 successfully!`);
        const uploadedKey = `medical/${fileKey.replace(/\.webm$/, ".json")}`; 
        setShowTranscriptButton(true);
        setUploadedFileKey(uploadedKey); 
      } else {
        alert(`❌ S3 upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("S3 upload error:", err);
      alert("❌ Upload to S3 failed due to network/server error.");
    }
  };

  const handleDownload = (recording?: any) => {
    const blob = recording ? recording.blob : audioBlob;
    const name = recording
      ? recording.name
      : `recording-${new Date().toISOString().slice(0, 19)}`;

    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteTempRecording = async (id: string) => {
    const recording = tempRecordings.find((rec) => rec.id === id);
    if (!recording) return;

    setTempRecordings((prev) => prev.filter((rec) => rec.id !== id));

    try {
      const token = sessionStorage.getItem("google_access_token");
      if (!token) {
        alert("❌ Please sign in with Google first.");
        return;
      }

      if (!recording.fileId) {
        alert("❌ This recording does not have a Google Drive ID yet.");
        return;
      }

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fileId: recording.fileId }),
      });

      const result = await res.json();
      if (!res.ok) {
        alert(
          `❌ Could not delete on Drive: ${result.error || "Unknown error"}`
        );
      } else {
        alert(`✅ Deleted on Drive (file ID: ${result.deletedFileId})`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Delete failed due to network/server error.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                VoiceCapture Pro
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button
                onClick={login}
                className="bg-[#000000] border border-white text-white hover:bg-[#ff2e63] hover:border-white"
              >
                Sign in with Google
              </Button>
            </div>
          </div>
        </header>

        {/* Login Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Professional Voice Recording
              <span className="text-primary block">Made Simple</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto text-pretty">
              Record high-quality audio with seamless Google Drive integration.
              Sign in to get started.
            </p>
            <Button
              onClick={login}
              size="lg"
              className="bg-[#000000] border border-white hover:bg-[#ff2e63] hover:border-white text-white px-8 py-4 text-lg"
            >
              Sign in with Google to Start Recording
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              VoiceCapture Pro
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{user?.name || user?.email}</span>
            </div>
            <ThemeToggle />
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Recording Interface */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 bg-card/50 backdrop-blur-sm border-2 border-border/50">
            <div className="text-center space-y-8">
              {(isRecording || audioLevel > 0) && (
                <WaveformVisualizer
                  isRecording={isRecording}
                  isPaused={isPaused}
                  audioLevel={audioLevel}
                  analyser={analyserRef.current}
                />
              )}

              {/* Recording Button with Animation */}
              <div className="flex justify-center">
                <div className="relative">
                  {isRecording && (
                    <div
                      className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping"
                      style={{
                        animationDuration: "2s",
                        transform: `scale(${1 + audioLevel * 0.5})`,
                      }}
                    />
                  )}
                  {isRecording && (
                    <div
                      className="absolute inset-0 rounded-full bg-cyan-300/20 animate-pulse"
                      style={{
                        animationDuration: "1.5s",
                        transform: `scale(${1 + audioLevel * 0.3})`,
                      }}
                    />
                  )}
                  <Button
                    onClick={
                      isRecording
                        ? isPaused
                          ? resumeRecording
                          : pauseRecording
                        : startRecording
                    }
                    size="lg"
                    className={`w-24 h-24 rounded-full text-white font-semibold transition-all duration-300 ${
                      isRecording
                        ? isPaused
                          ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25"
                          : "bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/25"
                        : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    }`}
                    style={{
                      transform: isRecording
                        ? `scale(${1 + audioLevel * 0.1})`
                        : "scale(1)",
                    }}
                  >
                    {isRecording ? (
                      isPaused ? (
                        <Play className="w-8 h-8" />
                      ) : (
                        <Pause className="w-8 h-8" />
                      )
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Recording Status */}
              {isRecording && (
                <div className="space-y-4">
                  <div className="text-2xl font-mono text-foreground">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isPaused ? "Recording Paused" : "Recording..."}
                  </div>

                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={stopRecording}
                      variant="destructive"
                      size="lg"
                      className="px-8 py-3 text-lg font-semibold"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Stop & Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Audio Playback Controls */}
              {audioUrl && !isRecording && (
                <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground">
                    Recording Complete
                  </h3>
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={togglePlayback}
                      variant="outline"
                      size="lg"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                    <Button
                      onClick={() => handleDownload()}
                      variant="outline"
                      size="lg"
                    >
                      Download
                    </Button>
                    <Button onClick={handleUploadToDrive} size="lg">
                      <Upload className="w-5 h-5 mr-2" />
                      Upload to Drive
                    </Button>
                    <Button onClick={handleUploadToS3} size="lg">
                      <Upload className="w-5 h-5 mr-2" />
                      Upload to S3
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Duration: {formatTime(recordingTime)}
                  </div>
                </div>
              )}

              {/* Temporary Recordings */}
              {tempRecordings.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Saved Recordings
                  </h3>
                  <div className="space-y-2">
                    {tempRecordings.map((recording) => (
                      <div
                        key={recording.id}
                        className="p-4 bg-muted/20 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Button
                              onClick={() => playTempRecording(recording)}
                              variant="ghost"
                              size="sm"
                              className={
                                currentPlayingId === recording.id && isPlaying
                                  ? "bg-primary/10"
                                  : ""
                              }
                            >
                              {currentPlayingId === recording.id &&
                              isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <div>
                              <div className="font-medium text-foreground">
                                {recording.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatTime(recording.duration)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleDownload(recording)}
                              variant="outline"
                              size="sm"
                            >
                              Download
                            </Button>
                            <Button
                              onClick={() => deleteTempRecording(recording.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                            <Button
                              onClick={() => handleUploadToDrive(recording)}
                              variant="default"
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Drive
                            </Button>
                            <Button
                              onClick={() => handleUploadToS3(recording)}
                              variant="default"
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              S3
                            </Button>
                          </div>
                        </div>

                        {showTranscriptButton && uploadedFileKey && (
                          <Button
                            onClick={() => {
                              const encodedKey = encodeURIComponent(uploadedFileKey);
                              window.location.href = `/show-output?key=${encodedKey}`;
                            }}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Show Transcript
                          </Button>
                        )}



                        {currentPlayingId === recording.id && (
                          <div className="space-y-2 p-3 bg-background/50 rounded-md">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatTimeDetailed(currentTime)}</span>
                              <span>{formatTimeDetailed(duration || 0)}</span>
                            </div>

                            {/* Timeline/Progress Bar */}
                            <div
                              className="relative w-full h-2 bg-muted rounded-full cursor-pointer group"
                              onClick={(e) => {
                                if (!audioRef.current || !duration) return;
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percentage = Math.max(
                                  0,
                                  Math.min(1, clickX / rect.width)
                                );
                                const newTime = percentage * duration;
                                seekTo(newTime);
                              }}
                            >
                              <div
                                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-150"
                                style={{
                                  width: `${
                                    duration > 0
                                      ? Math.min(
                                          100,
                                          (currentTime / duration) * 100
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-sm transition-all duration-150 opacity-0 group-hover:opacity-100"
                                style={{
                                  left: `${
                                    duration > 0
                                      ? Math.min(
                                          100,
                                          (currentTime / duration) * 100
                                        )
                                      : 0
                                  }%`,
                                  marginLeft: "-6px",
                                }}
                              />
                            </div>

                            {/* Playback Controls */}
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                onClick={skipBackward}
                                variant="ghost"
                                size="sm"
                                disabled={!duration}
                              >
                                <SkipBack className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => playTempRecording(recording)}
                                variant="outline"
                                size="sm"
                              >
                                {currentPlayingId === recording.id &&
                                isPlaying ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                onClick={skipForward}
                                variant="ghost"
                                size="sm"
                                disabled={!duration}
                              >
                                <SkipForward className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Google Drive Recordings */}
              <div className="space-y-4 mt-8">
                <h3 className="text-lg font-semibold text-foreground">
                  Previously Saved Recordings
                </h3>
                {loadingDriveFiles ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : driveFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recordings found in Drive.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {driveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-4 bg-muted/20 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-foreground">
                            {file.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created:{" "}
                            {new Date(file.createdTime).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`https://drive.google.com/uc?export=download&id=${file.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm border rounded hover:bg-muted"
                          >
                            Download
                          </a>
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm border rounded hover:bg-muted"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Dialog open={showTrimDialog} onOpenChange={setShowTrimDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Trim Audio Recording</DialogTitle>
          </DialogHeader>
          {audioBlob && (
            <AudioTrimmer
              audioBlob={audioBlob}
              onTrimComplete={handleTrimComplete}
              onCancel={() => setShowTrimDialog(false)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleSkipTrim}>
              Skip Trimming
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Enter a name for your recording:
            </p>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="My Recording"
              className="w-full"
              onKeyDown={(e) => e.key === "Enter" && saveRecording()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveRecording}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-background">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">
              VoiceCapture Pro
            </span>
          </div>
          <p className="text-muted-foreground mb-4">
            Professional voice recording made simple and accessible.
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

      {/* Hidden audio element for playback */}
      {(audioUrl || tempRecordings.length > 0) && (
        <audio ref={audioRef} className="hidden" />
      )}
    </div>
  );
}

export default function VoiceRecorderLanding() {
  return (
    <AuthProvider>
      <VoiceRecorderApp />
    </AuthProvider>
  );
}
