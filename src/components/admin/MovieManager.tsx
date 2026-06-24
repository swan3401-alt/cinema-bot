"use client";

import { useEffect, useRef, useState } from "react";

interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  _count: { sessions: number };
}

export default function MovieManager({ secret }: { secret: string }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadMovies() {
    fetch(`/api/admin/movies?secret=${encodeURIComponent(secret)}`)
      .then((r) => r.json())
      .then((d) => setMovies(d.movies ?? []))
      .catch(() => {});
  }
  useEffect(loadMovies, [secret]);

  function resetForm() {
    setEditingId(null); setTitle(""); setDescription(""); setPosterUrl("");
    setErr(null); setMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function edit(m: Movie) {
    setEditingId(m.id); setTitle(m.title); setDescription(m.description); setPosterUrl(m.posterUrl);
    setErr(null); setMsg(null);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("secret", secret);
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Upload failed"); return; }
      setPosterUrl(data.url);
    } catch {
      setErr("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setErr(null); setMsg(null);
    if (!title.trim()) { setErr("Title is required"); return; }
    if (!posterUrl) { setErr("Upload a poster"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, id: editingId ?? undefined, title: title.trim(), description, posterUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Save failed"); return; }
      setMsg(editingId ? "Updated" : "Created");
      resetForm();
      loadMovies();
    } catch {
      setErr("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: Movie) {
    if (!confirm(`Delete "${m.title}"? This can't be undone.`)) return;
    const res = await fetch("/api/admin/movies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, id: m.id }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Delete failed"); return; }
    if (editingId === m.id) resetForm();
    loadMovies();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Form */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5">
        <h2 className="mb-4 text-lg font-semibold">{editingId ? "Edit movie" : "Add movie"}</h2>
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Poster column */}
          <div className="flex flex-col gap-2">
            <div className="h-48 w-32 overflow-hidden rounded-xl border border-white/10 bg-gray-950 flex items-center justify-center">
              {posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl} alt="poster" className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center text-xs text-gray-600">No poster</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : posterUrl ? "Replace" : "Upload poster"}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="hidden" />
          </div>

          {/* Fields */}
          <div className="flex flex-1 flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg bg-gray-950 border border-white/10 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                className="resize-none rounded-lg bg-gray-950 border border-white/10 px-3 py-2" />
            </label>
            <div className="flex items-center gap-4">
              <button onClick={save} disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400">
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
              {editingId && (
                <button onClick={resetForm} className="text-sm text-gray-400 hover:text-white">Cancel</button>
              )}
              {msg && <span className="text-sm text-green-400">{msg}</span>}
              {err && <span className="text-sm text-red-400">{err}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">All movies ({movies.length})</h2>
        {movies.length === 0 && <p className="text-sm text-gray-400">No movies yet.</p>}
        {movies.map((m) => (
          <div key={m.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-gray-900/40 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.posterUrl} alt={m.title} className="h-16 w-11 shrink-0 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.title}</p>
              <p className="text-xs text-gray-400">{m._count.sessions} session{m._count.sessions === 1 ? "" : "s"}</p>
            </div>
            <button onClick={() => edit(m)} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">Edit</button>
            <button onClick={() => remove(m)} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}