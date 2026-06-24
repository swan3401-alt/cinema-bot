"use client";

import { useEffect, useState } from "react";

type SeatType = "WIDE" | "STANDARD";
type CellState = "EMPTY" | "STANDARD" | "WIDE";

interface HallListItem {
  id: string;
  name: string;
  _count: { seats: number; sessions: number };
}

const MAX_ROWS = 12;
const MAX_COLS = 16;

// click cycles: EMPTY -> STANDARD -> WIDE -> EMPTY
const NEXT: Record<CellState, CellState> = { EMPTY: "STANDARD", STANDARD: "WIDE", WIDE: "EMPTY" };

const CELL_STYLE: Record<CellState, string> = {
  EMPTY: "bg-gray-800/40 border-gray-700 hover:bg-gray-700/60",
  STANDARD: "bg-blue-600 border-blue-400",
  WIDE: "bg-amber-500 border-amber-300",
};

export default function HallBuilder({ secret }: { secret: string }) {
  const [rows, setRows] = useState(7);
  const [cols, setCols] = useState(11);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // grid[r][c] holds the state of each cell
  const [grid, setGrid] = useState<CellState[][]>(() => makeGrid(7, 11));

  const [halls, setHalls] = useState<HallListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function makeGridSafe(r: number, c: number) { return makeGrid(r, c); }

  // Resize grid while preserving existing cells
  useEffect(() => {
    setGrid((prev) => {
      const next = makeGrid(rows, cols);
      for (let r = 0; r < Math.min(rows, prev.length); r++)
        for (let c = 0; c < Math.min(cols, prev[r].length); c++) next[r][c] = prev[r][c];
      return next;
    });
  }, [rows, cols]);

  // Load hall list
  useEffect(() => {
    fetch(`/api/admin/halls?secret=${encodeURIComponent(secret)}`)
      .then((r) => r.json())
      .then((d) => setHalls(d.halls ?? []))
      .catch(() => {});
  }, [secret, msg]); // refresh after a save

  function cycle(r: number, c: number) {
    if (locked) return;
    setGrid((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = NEXT[next[r][c]];
      return next;
    });
  }

  async function loadHall(id: string) {
    setErr(null); setMsg(null);
    const res = await fetch(`/api/admin/halls/${id}?secret=${encodeURIComponent(secret)}`);
    if (!res.ok) { setErr("Couldn't load hall"); return; }
    const { hall, locked } = await res.json();

    const maxRow = Math.max(...hall.seats.map((s: { row: number }) => s.row), 1);
    const maxCol = Math.max(...hall.seats.map((s: { number: number }) => s.number), 1);
    const r = Math.min(Math.max(maxRow, 1), MAX_ROWS);
    const c = Math.min(Math.max(maxCol, 1), MAX_COLS);

    const g = makeGrid(r, c);
    for (const s of hall.seats as { row: number; number: number; type: SeatType }[]) {
      if (s.row <= r && s.number <= c) g[s.row - 1][s.number - 1] = s.type;
    }
    setRows(r); setCols(c); setGrid(g);
    setName(hall.name); setEditingId(hall.id); setLocked(locked);
  }

  function newHall() {
    setEditingId(null); setLocked(false); setName("");
    setRows(7); setCols(11); setGrid(makeGrid(7, 11));
    setErr(null); setMsg(null);
  }

  const seatCount = grid.flat().filter((s) => s !== "EMPTY").length;

  async function save() {
    setErr(null); setMsg(null);
    if (!name.trim()) { setErr("Give the hall a name"); return; }
    if (seatCount === 0) { setErr("Add at least one seat"); return; }

    // Convert grid → seat list (1-indexed row/number)
    const seats: { row: number; number: number; type: SeatType }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (grid[r][c] !== "EMPTY")
          seats.push({ row: r + 1, number: c + 1, type: grid[r][c] as SeatType });

    setSaving(true);
    try {
      const res = await fetch("/api/admin/halls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, id: editingId ?? undefined, name: name.trim(), seats }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Save failed"); return; }
      setEditingId(data.id);
      setMsg("Saved");
    } catch {
      setErr("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Load / new */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={editingId ?? ""}
          onChange={(e) => (e.target.value ? loadHall(e.target.value) : newHall())}
          className="rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-sm"
        >
          <option value="">+ New hall</option>
          {halls.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h._count.seats} seats{h._count.sessions ? `, ${h._count.sessions} sessions` : ""})
            </option>
          ))}
        </select>
        <button onClick={newHall} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5">
          New
        </button>
      </div>

      {locked && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This hall has bookings, so its layout is locked. You can still rename it, or use “New” to build a fresh one.
        </div>
      )}

      {/* Name + dimensions */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">Hall name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            // placeholder="Enter"
            className="w-64 rounded-lg bg-gray-900 border border-white/10 px-3 py-2"
          />
        </label>
        <Dim label="Rows" value={rows} setValue={setRows} max={MAX_ROWS} disabled={locked} />
        <Dim label="Columns" value={cols} setValue={setCols} max={MAX_COLS} disabled={locked} />
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
        <Swatch className="bg-blue-600 border-blue-400" label="Standard" />
        <Swatch className="bg-amber-500 border-amber-300" label="Wide" />
        <Swatch className="bg-gray-800/40 border-gray-700" label="Gap (click to add)" />
      </div>

      {/* Grid */}
      <div className="overflow-x-auto scrollbar-themed pb-2">
        <div className="inline-flex flex-col gap-1.5">
          {/* column numbers */}
          <div className="flex gap-1.5 pl-7">
            {Array.from({ length: cols }, (_, c) => (
              <span key={c} className="w-8 text-center text-[10px] text-gray-600">{c + 1}</span>
            ))}
          </div>
          {grid.map((rowCells, r) => (
            <div key={r} className="flex items-center gap-1.5">
              <span className="w-5 text-right text-[10px] text-gray-600">{r + 1}</span>
              <div className="flex gap-1.5">
                {rowCells.map((cell, c) => (
                  <button
                    key={c}
                    onClick={() => cycle(r, c)}
                    title={`Row ${r + 1}, Seat ${c + 1}`}
                    className={`h-8 w-8 rounded-md border transition-colors ${CELL_STYLE[cell]} ${
                      locked ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving || locked}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400"
        >
          {saving ? "Saving…" : editingId ? "Update hall" : "Create hall"}
        </button>
        <span className="text-sm text-gray-400">{seatCount} seats</span>
        {msg && <span className="text-sm text-green-400">{msg}</span>}
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>
    </div>
  );
}

function makeGrid(rows: number, cols: number): CellState[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => "EMPTY" as CellState));
}

function Dim({
  label, value, setValue, max, disabled,
}: { label: string; value: number; setValue: (n: number) => void; max: number; disabled: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-400">{label}</span>
      <input
        type="number" min={1} max={max} value={value} disabled={disabled}
        onChange={(e) => setValue(Math.min(Math.max(1, Number(e.target.value) || 1), max))}
        className="w-20 rounded-lg bg-gray-900 border border-white/10 px-3 py-2 disabled:opacity-50"
      />
    </label>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-4 w-4 rounded-sm border ${className}`} />
      <span>{label}</span>
    </div>
  );
}