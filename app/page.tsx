"use client";
import { useState, ChangeEvent } from "react";

// This defines the structure of the data we expect from our API
interface AnalysisResult {
  exercise: string;
  grade: string;
  feedback: string[];
}

export default function Home() {
  // TypeScript helps us ensure 'file' is either a File object or null
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    // We check if files exist and take the first one
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a video first!");
    
    setLoading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload");

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="text-center">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            AI Gym Coach
          </h1>
          <p className="text-slate-400 mt-4">Professional form analysis powered by Gemini 1.5</p>
        </header>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center space-y-6">
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2.5 file:px-6
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-500 cursor-pointer transition-all"
            />
            
            <button 
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-900/20"
            >
              {loading ? "Coach is analyzing..." : "Upload & Analyze Video"}
            </button>
          </div>
        </div>

        {result && (
  <div className="bg-slate-900 border border-blue-500/50 p-8 rounded-2xl shadow-xl space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-white">{result.exercise}</h2>
      <span className="text-4xl font-black p-4 rounded-lg bg-blue-600 text-white">
        {result.grade}
      </span>
    </div>
    
    <div className="space-y-2">
      <h3 className="text-blue-400 font-semibold uppercase tracking-wider text-sm">Coach's Tips</h3>
      <ul className="list-disc list-inside text-slate-300 space-y-2">
        {result.feedback.map((tip, index) => (
          <li key={index}>{tip}</li>
        ))}
      </ul>
    </div>
  </div>
)}
      </div>
    </main>
  );
}