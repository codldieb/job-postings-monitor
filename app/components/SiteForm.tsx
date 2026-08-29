"use client";

import { FormEvent, useState } from "react";

interface SiteFormProps {
  onAdded: () => void;
}

export default function SiteForm({ onAdded }: SiteFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add site");
      }

      setName("");
      setUrl("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Company / site name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp Careers"
            required
            className="input-field"
          />
        </label>
        <label className="block">
          <span className="field-label">Careers page URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/careers"
            required
            className="input-field"
          />
        </label>
      </div>

      {error && (
        <p className="alert-banner text-ink-muted">{error}</p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Adding..." : "Add site"}
      </button>
    </form>
  );
}
