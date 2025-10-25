"use client";

import { useState, useEffect } from "react";

export default function ShowOutput({ searchParams }: { searchParams: { Key?: string } }) {
  const [transcript, setTranscript] = useState<string>("Loading transcript...");
  const key = searchParams.Key;

  useEffect(() => {
    if (!key) {
      setTranscript("No file specified.");
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
      }
    };

    fetchTranscript();
  }, [key]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          📝 Patient Transcript
        </h1>
        <p className="text-gray-500 text-sm mb-4 text-center">
          Viewing transcript for: <span className="font-medium">{key || "Unknown"}</span>
        </p>
        <textarea
          className="w-full h-[500px] p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 text-gray-800 font-sans shadow-inner"
          value={transcript}
          readOnly
        />
          </div>
           <div className="mt-4 flex gap-3">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => navigator.clipboard.writeText(transcript)}
        >
          Copy
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => {
            const blob = new Blob([transcript], { type: "text/plain" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${key?.split("/").pop() || "transcript"}.txt`;
            a.click();
          }}
        >
          Download
        </button>
      </div>
      <footer className="mt-10 text-gray-400 text-sm">
        Powered by Voice Recorder & AWS Transcribe
      </footer>
    </div>
  );
}
