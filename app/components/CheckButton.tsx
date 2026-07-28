"use client";

import { useState } from "react";

interface CheckButtonProps {
  onComplete: () => void;
}

export default function CheckButton({ onComplete }: CheckButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/check", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Check failed");
      }

      setMessage(
        `Checked ${data.sitesChecked} site(s). Found ${data.newJobsFound} new posting(s).`
      );
      onComplete();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheck}
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Checking..." : "Run check now"}
      </button>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
