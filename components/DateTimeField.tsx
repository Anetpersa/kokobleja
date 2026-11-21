"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { TZ } from "@/lib/time";

// Sopstveni izbor datuma (kalendar) i vremena (sat sa krugom, 24h), u bojama aplikacije.
// Forma i dalje šalje isto polje kao ranije: starts_at = "2026-11-27T19:00" (beogradsko vreme).

const DAYS_SHORT = ["ned", "pon", "uto", "sre", "čet", "pet", "sub"];
const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
const MONTHS_LONG = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];
const WEEK_HEAD = ["P", "U", "S", "Č", "P", "S", "N"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

function weekday(s: string) {
  const { y, m, d } = parseYmd(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// "čet, 27. nov 2026."
function dateLabel(s: string) {
  const { y, m, d } = parseYmd(s);
  return `${DAYS_SHORT[weekday(s)]}, ${d}. ${MONTHS_SHORT[m - 1]} ${y}.`;
}

// Današnji datum po beogradskom vremenu
function todayBelgrade() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );
  return p; // "2026-11-21"
}

// ---------- Sat ----------
const C = 120;
const R_OUT = 96;
const R_IN = 62;

function point(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 100) / 100; // isto na serveru i u browseru
  return { x: round(C + r * Math.sin(a)), y: round(C - r * Math.cos(a)) };
}

export function DateTimeField({ defaultValue }: { defaultValue?: string }) {
  const [dateStr, timeStr] = defaultValue ? defaultValue.split("T") : [null, null];
  const [date, setDate] = useState<string | null>(dateStr);
  const [time, setTime] = useState<{ h: number; m: number } | null>(
    timeStr ? { h: Number(timeStr.slice(0, 2)), m: Number(timeStr.slice(3, 5)) } : null
  );

  const value = date && time ? `${date}T${pad(time.h)}:${pad(time.m)}` : "";
  const hiddenRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    hiddenRef.current?.setCustomValidity(value ? "" : "Izaberi datum i vreme.");
  }, [value]);

  // --- kalendar ---
  const calRef = useRef<HTMLDialogElement>(null);
  const [today, setToday] = useState(() => todayBelgrade());
  const [tmpDate, setTmpDate] = useState<string>(date ?? today);
  const [view, setView] = useState(() => {
    const { y, m } = parseYmd(date ?? today);
    return { y, m };
  });

  function openCalendar() {
    const t = todayBelgrade();
    setToday(t);
    const start = date ?? t;
    setTmpDate(start);
    const { y, m } = parseYmd(start);
    setView({ y, m });
    calRef.current?.showModal();
  }

  function moveMonth(delta: number) {
    setView((v) => {
      const idx = v.y * 12 + (v.m - 1) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });
  }

  const firstWeekday = (weekday(ymd(view.y, view.m, 1)) + 6) % 7; // ponedeljak = 0
  const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();

  // --- sat ---
  const clockRef = useRef<HTMLDialogElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tmpH, setTmpH] = useState(time?.h ?? 19);
  const [tmpM, setTmpM] = useState(time?.m ?? 0);
  const [mode, setMode] = useState<"h" | "m">("h");
  const dragging = useRef(false);

  function openClock() {
    setTmpH(time?.h ?? 19);
    setTmpM(time?.m ?? 0);
    setMode("h");
    clockRef.current?.showModal();
  }

  function pick(e: ReactPointerEvent<SVGSVGElement>, finished: boolean) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const scale = 240 / r.width;
    const dx = (e.clientX - r.left) * scale - C;
    const dy = (e.clientY - r.top) * scale - C;
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const dist = Math.hypot(dx, dy);

    if (mode === "h") {
      const i = Math.round(angle / 30) % 12;
      const inner = dist < (R_OUT + R_IN) / 2;
      setTmpH(inner ? (i === 0 ? 0 : i + 12) : i === 0 ? 12 : i);
      if (finished) setTimeout(() => setMode("m"), 250);
    } else {
      setTmpM(Math.round(angle / 6) % 60);
    }
  }

  const handAngle = mode === "h" ? (tmpH % 12) * 30 : tmpM * 6;
  const handR = mode === "h" && (tmpH === 0 || tmpH > 12) ? R_IN : R_OUT;
  const hand = point(handAngle, handR);

  function closeOnBackdrop(e: ReactMouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) e.currentTarget.close();
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 800 }}>Datum i vreme</span>
      <div className="dt-row">
        <button type="button" className="dt-btn" onClick={openCalendar}>
          <CalendarIcon />
          <span className={date ? "" : "dt-placeholder"}>{date ? dateLabel(date) : "Izaberi datum"}</span>
        </button>
        <button type="button" className="dt-btn" onClick={openClock}>
          <ClockIcon />
          <span className={time ? "" : "dt-placeholder"}>{time ? `${pad(time.h)}:${pad(time.m)}` : "Vreme"}</span>
        </button>
        {/* Nevidljivo polje: šalje vrednost i ne pušta formu bez datuma i vremena */}
        <input
          ref={hiddenRef}
          className="dt-hidden"
          name="starts_at"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* ---------- Kalendar ---------- */}
      <dialog ref={calRef} className="picker" onClick={closeOnBackdrop}>
        <div className="picker-title">Izaberi datum</div>
        <div className="picker-big">{dateLabel(tmpDate).replace(/ \d{4}\.$/, "")}</div>
        <div className="cal-nav">
          <button type="button" className="cal-arrow" onClick={() => moveMonth(-1)} aria-label="Prethodni mesec">
            ‹
          </button>
          <span>
            {MONTHS_LONG[view.m - 1]} {view.y}
          </span>
          <button type="button" className="cal-arrow" onClick={() => moveMonth(1)} aria-label="Sledeći mesec">
            ›
          </button>
        </div>
        <div className="cal-grid">
          {WEEK_HEAD.map((d, i) => (
            <b key={i}>{d}</b>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const s = ymd(view.y, view.m, i + 1);
            const past = s < today && s !== date;
            const cls = ["cal-day", s === tmpDate ? "on" : "", s === today ? "today" : ""].join(" ");
            return (
              <button key={s} type="button" className={cls} disabled={past} onClick={() => setTmpDate(s)}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="picker-actions">
          <button type="button" onClick={() => calRef.current?.close()}>
            Otkaži
          </button>
          <button
            type="button"
            onClick={() => {
              setDate(tmpDate);
              calRef.current?.close();
              if (!time) openClock(); // novi event: posle datuma odmah ponudi vreme
            }}
          >
            U redu
          </button>
        </div>
      </dialog>

      {/* ---------- Sat ---------- */}
      <dialog ref={clockRef} className="picker" onClick={closeOnBackdrop}>
        <div className="picker-title">Izaberi vreme</div>
        <div className="clock-head">
          <button type="button" className={mode === "h" ? "on" : ""} onClick={() => setMode("h")}>
            {pad(tmpH)}
          </button>
          <span>:</span>
          <button type="button" className={mode === "m" ? "on" : ""} onClick={() => setMode("m")}>
            {pad(tmpM)}
          </button>
        </div>
        <svg
          ref={svgRef}
          className="clock-face"
          viewBox="0 0 240 240"
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            pick(e, false);
          }}
          onPointerMove={(e) => dragging.current && pick(e, false)}
          onPointerUp={(e) => {
            if (!dragging.current) return;
            dragging.current = false;
            pick(e, true);
          }}
        >
          <circle cx={C} cy={C} r={116} fill="var(--tint)" />
          <line x1={C} y1={C} x2={hand.x} y2={hand.y} stroke="var(--primary)" strokeWidth={2} />
          <circle cx={C} cy={C} r={4} fill="var(--primary)" />
          <circle cx={hand.x} cy={hand.y} r={17} fill="var(--primary)" />
          {Array.from({ length: 12 }, (_, i) => {
            const o = point(i * 30, R_OUT);
            if (mode === "m") {
              const v = i * 5;
              return (
                <text key={i} x={o.x} y={o.y} className="clock-num" fill={tmpM === v ? "#fff" : "var(--ink)"}>
                  {pad(v)}
                </text>
              );
            }
            const outer = i === 0 ? 12 : i;
            const inner = i === 0 ? 0 : i + 12;
            const n = point(i * 30, R_IN);
            return (
              <g key={i}>
                <text x={o.x} y={o.y} className="clock-num" fill={tmpH === outer ? "#fff" : "var(--ink)"}>
                  {outer}
                </text>
                <text x={n.x} y={n.y} className="clock-num clock-inner" fill={tmpH === inner ? "#fff" : "var(--primary-dark)"}>
                  {pad(inner)}
                </text>
              </g>
            );
          })}
          {mode === "m" && tmpM % 5 !== 0 && <circle cx={hand.x} cy={hand.y} r={3} fill="#fff" />}
        </svg>
        <div className="picker-actions">
          <button type="button" onClick={() => clockRef.current?.close()}>
            Otkaži
          </button>
          <button
            type="button"
            onClick={() => {
              setTime({ h: tmpH, m: tmpM });
              clockRef.current?.close();
            }}
          >
            U redu
          </button>
        </div>
      </dialog>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M4 11h16" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
