"use client";

import { useState, useEffect } from "react";
import { Check, Download } from "lucide-react";

export default function ShowOutput({ searchParams }: { searchParams: { Key?: string } }) {
  const [transcript, setTranscript] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const key = searchParams.Key;

  useEffect(() => {
    if (!key) {
      setTranscript("No file specified.");
      setLoading(false);
      return;
    }

    const fetchTranscript = async () => {
      try {
        const res = await fetch(`/api/get-s3?key=${encodeURIComponent(key)}`);
        if (!res.ok) throw new Error("Failed to fetch transcript");

        const data = await res.json();
        const text = data.results?.transcripts?.[0]?.transcript || "Transcript is empty";
        setTranscript(text);
      } catch (err) {
        console.error(err);
        setTranscript("Error loading transcript.");
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [key]);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${key?.split("/").pop() || "transcript"}.txt`;
    a.click();
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-blue-50 to-gray-100 text-gray-900"} min-h-screen flex flex-col items-center py-12 px-4 transition-colors duration-300` }>
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-6 right-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl shadow hover:scale-105 transition-transform"
      >
        {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>

      <div className={`w-full max-w-4xl ${darkMode ? "bg-gray-800/60" : "bg-white/80"} backdrop-blur-md border border-gray-200 shadow-2xl rounded-3xl p-10 animate-fade-in transition-all` }>
        <h1 className="text-4xl font-bold mb-4 text-center drop-shadow-sm">
          📝 Patient Transcript
        </h1>
        <p className="text-sm mb-6 text-center opacity-80">
          Transcript for: <span className="font-semibold">{key || "Unknown"}</span>
        </p>

        {loading ? (
          <div className="w-full h-[520px] rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse" />
        ) : (
          <textarea
            className={`w-full h-[520px] p-5 rounded-2xl resize-none shadow-inner tracking-wide leading-relaxed transition-all duration-200 focus:outline-none border ${darkMode ? "bg-gray-900 text-white border-gray-700" : "bg-gray-50 border-gray-300"}`}
            value={transcript}
            readOnly
          />
        )}
      </div>

      {!loading && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95"
          >
            {copied ? "✅ Copied!" : "Copy"}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition-all active:scale-95"
          >
            ⬇️ Download
          </button>
        </div>
      )}

      <footer className="mt-10 opacity-60 text-xs tracking-wide">
        Tip: You can select, copy, and edit the transcript text. Changes can be downloaded.
      </footer>
    </div>
  );
}