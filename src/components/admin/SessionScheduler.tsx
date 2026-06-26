"use client";

import { useEffect, useState } from "react";

interface MovieOpt { id: string; title: string; }
interface HallOpt { id: string; name: string; _count: { seats: number }; }
interface SessionRow {
  id: string;
  movieTitle: string;
  hallName: string;
  date: string;
  time: string;
  price: number;
  booked: number;
  capacity: number;
}

export default function SessionScheduler({ secret }: { secret: string }) {
  const [movies, setMovies] = useState<MovieOpt[]>([]);
  const [halls, setHalls] = useState<HallOpt[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const [movieId, setMovieId] = useState("");
  const [hallId, setHallId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    fetch(`/api/admin/sessions?secret=${encodeURIComponent(secret)}`)
      .then((r) => r.json())
      .then((d) => { setMovies(d.movies ?? []); setHalls(d.halls ?? []); setSessions(d.sessions ?? []); })
      .catch(() => {});
  }
  useEffect(load, [secret]);

  async function create() {
    setErr(null); setMsg(null);
    if (!movieId || !hallId || !date || !time || price === "") {
      setErr("Fill in every field"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, movieId, hallId, date, time, price: Number(price) }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Failed"); return; }
      setMsg("Session scheduled");
      setTime(""); setPrice(""); // keep movie/hall/date for quick multi-add
      load();
    } catch {
      setErr("Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: SessionRow) {
    if (!confirm(`Delete ${s.movieTitle} on ${fmt(s.date)} ${s.time}?`)) return;
    const res = await fetch("/api/admin/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, id: s.id }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Delete failed"); return; }
    load();
  }

  const noHalls = halls.length === 0;
  const noMovies = movies.length === 0;


  const [editingId, setEditingId] = useState<string | null>(null);

  function toDateInput(iso: string) {
  // format the stored instant as YYYY-MM-DD in Tashkent for <input type="date">
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
  return parts; // en-CA gives YYYY-MM-DD
}

  function startEdit(s: SessionRow) {
    setEditingId(s.id);
    // find the movie by title->id from the loaded list
    const m = movies.find((x) => x.title === s.movieTitle);
    const h = halls.find((x) => x.name === s.hallName);
    setMovieId(m?.id ?? "");
    setHallId(h?.id ?? "");
    setDate(toDateInput(s.date)); // YYYY-MM-DD in Tashkent
    setTime(s.time);
    setPrice(String(s.price));
    setErr(null); setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setMovieId(""); setHallId(""); setDate(""); setTime(""); setPrice("");
    setErr(null); setMsg(null);
  }

  async function submit() {
    setErr(null); setMsg(null);
    if (!movieId || !hallId || !date || !time || price === "") { setErr("Fill in every field"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, id: editingId ?? undefined, movieId, hallId, date, time, price: Number(price) }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Failed"); return; }
      setMsg(editingId ? "Session updated" : "Session scheduled");
      if (editingId) cancelEdit(); else { setTime(""); setPrice(""); }
      load();
    } catch {
      setErr("Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Create form */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5">
        <h2 className="mb-4 text-lg font-semibold">Schedule a session</h2>

        {(noHalls || noMovies) && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            You need at least one {noMovies ? "movie" : ""}{noMovies && noHalls ? " and " : ""}{noHalls ? "hall" : ""} first.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Movie">
            <select value={movieId} onChange={(e) => setMovieId(e.target.value)} className={selCls}>
              <option value="">Select movie…</option>
              {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </Field>
          <Field label="Hall">
            <select value={hallId} onChange={(e) => setHallId(e.target.value)} className={selCls}>
              <option value="">Select hall…</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name} ({h._count.seats} seats)</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selCls} />
          </Field>
          <Field label="Time">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={selCls} />
          </Field>
          <Field label="Price (UZS)">
            <input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="130000" className={selCls} />
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-4">
<button onClick={submit} disabled={saving || noHalls || noMovies}
            className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400">
            {saving ? "Saving…" : editingId ? "Update session" : "Schedule"}
          </button>
          {editingId && <button onClick={cancelEdit} className="text-sm text-gray-400 hover:text-white">Cancel</button>}
          {msg && <span className="text-sm text-green-400">{msg}</span>}
          {err && <span className="text-sm text-red-400">{err}</span>}
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Upcoming sessions ({sessions.length})</h2>
        {sessions.length === 0 && <p className="text-sm text-gray-400">No upcoming sessions.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-gray-900/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.movieTitle}</p>
              <p className="text-xs text-gray-400">
                {fmt(s.date)} · {s.time} · {s.hallName}
              </p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p className="text-white text-sm font-semibold">{s.price.toLocaleString("en-US").replace(/,/g, " ")} UZS</p>
              <p>{s.booked}/{s.capacity} booked</p>
            </div>
            <button onClick={() => startEdit(s)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">
              Edit
            </button>
            <button onClick={() => remove(s)}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const selCls = "w-full rounded-lg bg-gray-950 border border-white/10 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}