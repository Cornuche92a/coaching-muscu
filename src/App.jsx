import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Home, Calendar, TrendingUp, Dumbbell, User, Plus, Minus, Check, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Star, Settings2, AlertTriangle, Pencil, Trash2, ArrowLeftRight, Download, Upload, Trophy, Play, RotateCcw, SkipForward, Scale, Info, Timer } from "lucide-react";

/* ------------------------------------------------------------------ */
/* THEME                                                               */
/* ------------------------------------------------------------------ */
const BG = "#0B0C0E", SURF = "#141619", SURF2 = "#1C1F23", LINE = "rgba(255,255,255,0.08)";
const TXT = "#F4F5F6", SUB = "#9AA1A9", MUT = "#61686F";
const ACC = "#FF5C2E", ACCSOFT = "rgba(255,92,46,0.13)";
const AMB = "#E3A93E", AMBSOFT = "rgba(227,169,62,0.12)";
const RED = "#E05C5C", REDSOFT = "rgba(224,92,92,0.12)";
const FD = "'Barlow Condensed', 'Barlow', system-ui, sans-serif"; // display / numbers
const FB = "'Barlow', system-ui, sans-serif"; // body

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body,#root{background:${BG};margin:0}
.app{font-family:${FB};-webkit-font-smoothing:antialiased}
.app ::-webkit-scrollbar{display:none}
.app input,.app textarea,.app select{outline:none;border:none;background:transparent;color:inherit;font:inherit;padding:0}
.app input[type=number]::-webkit-inner-spin-button,.app input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.app button{border:none;background:none;color:inherit;font:inherit;padding:0;cursor:pointer;text-align:inherit}
@keyframes slideUp{from{transform:translateY(26px);opacity:.4}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.sheet{animation:slideUp .22s cubic-bezier(.2,.8,.25,1)}
.fade{animation:fadeIn .16s ease}
@media (prefers-reduced-motion: reduce){.sheet,.fade{animation:none}}
`;

/* ------------------------------------------------------------------ */
/* UTILS                                                               */
/* ------------------------------------------------------------------ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r05 = x => Math.round(x * 2) / 2;
const fk = x => (x == null || isNaN(x)) ? "—" : String(r05(x)).replace(".", ",");
const fk1 = x => (x == null || isNaN(x)) ? "—" : (Math.round(x * 10) / 10).toString().replace(".", ",");
const pad2 = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const dow = s => (parseISO(s).getDay() || 7); // 1 = lundi … 7 = dimanche
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_S = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DAYS_FR = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const D2 = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const fmtLong = s => { const d = parseISO(s); return `${DAYS_FR[(d.getDay() || 7) - 1]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
const fmtDM = s => { const d = parseISO(s); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
const fmtDMY = s => { const d = parseISO(s); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)} h ${pad2(m % 60)}` : `${m} min`;
const EPS = (l, r) => (l && r) ? l * (1 + Math.min(r, 12) / 30) : 0;

const MUSCLES = { dos: "Dos", pectoraux: "Pectoraux", epaules: "Épaules", biceps: "Biceps", triceps: "Triceps", abdos: "Abdos" };
const MKEYS = Object.keys(MUSCLES);
const VTARGETS = { dos: [10, 20], pectoraux: [10, 20], epaules: [8, 18], biceps: [6, 14], triceps: [6, 14], abdos: [6, 14] };

const TYPES = { normal: { l: "N", name: "Normale" }, warmup: { l: "É", name: "Échauffement" }, backoff: { l: "B", name: "Back-off" }, drop: { l: "D", name: "Drop set" }, amrap: { l: "A", name: "AMRAP" } };
const TYPE_ORDER = ["normal", "backoff", "drop", "amrap", "warmup"];

/* ------------------------------------------------------------------ */
/* EXERCISE LIBRARY                                                    */
/* ------------------------------------------------------------------ */
const STACK_NOTE = "Incrément estimé ≈ 4,5 kg d’après ton historique (23 → 27 → 32 → 36 → 41 → 45). Ajuste-le si cette machine est différente.";
const EXOS = {
  latpulldown: { name: "Lat Pull Down", pat: "vpull", m: { dos: 1, biceps: 0.5 }, kind: "machine", inc: 4.5, key: true, note: STACK_NOTE },
  pullups: { name: "Tractions", pat: "vpull", m: { dos: 1, biceps: 0.5 }, kind: "bwAssist", inc: 5, key: false },
  seatedrow: { name: "Rameur assis", pat: "hpull", m: { dos: 1, biceps: 0.5 }, kind: "machine", inc: 4.5, key: true, note: STACK_NOTE },
  rowing: { name: "Rowing barre", pat: "hpull", m: { dos: 1, biceps: 0.5 }, kind: "free", inc: 2.5 },
  chestrow: { name: "Chest Supported Row", pat: "hpull", m: { dos: 1, biceps: 0.5 }, kind: "machine", inc: 2.5 },
  benchpress: { name: "Développé couché", pat: "hpush", m: { pectoraux: 1, triceps: 0.5, epaules: 0.5 }, kind: "free", inc: 2.5 },
  inclinepress: { name: "Développé incliné", pat: "hpush", m: { pectoraux: 1, epaules: 0.5, triceps: 0.5 }, kind: "free", inc: 2.5 },
  chestpress: { name: "Chest Press", pat: "hpush", m: { pectoraux: 1, triceps: 0.5, epaules: 0.5 }, kind: "machine", inc: 4.5, key: true },
  pecfly: { name: "Pec Fly", pat: "fly", m: { pectoraux: 1 }, kind: "machine", inc: 4.5, key: true, iso: true, note: STACK_NOTE },
  cablefly: { name: "Cable Fly", pat: "fly", m: { pectoraux: 1 }, kind: "cable", inc: 2.5, iso: true },
  pushups: { name: "Pompes", pat: "hpush", m: { pectoraux: 1, triceps: 0.5, epaules: 0.5 }, kind: "bw" },
  dips: { name: "Dips", pat: "dip", m: { pectoraux: 1, triceps: 1, epaules: 0.5 }, kind: "bwAssist", inc: 5, key: true },
  shoulderpress: { name: "Shoulder Press", pat: "vpush", m: { epaules: 1, triceps: 0.5 }, kind: "machine", inc: 4.5, key: true, note: STACK_NOTE },
  militarypress: { name: "Développé militaire", pat: "vpush", m: { epaules: 1, triceps: 0.5 }, kind: "free", inc: 2.5 },
  lateralraise: { name: "Lateral Raise", pat: "lateral", m: { epaules: 1 }, kind: "machine", inc: 4.5, iso: true, note: STACK_NOTE },
  reversefly: { name: "Reverse Fly", pat: "rear", m: { epaules: 1, dos: 0.5 }, kind: "machine", inc: 4.5, iso: true },
  facepull: { name: "Face Pull", pat: "rear", m: { epaules: 1, dos: 0.5 }, kind: "cable", inc: 2.5, iso: true },
  bicepscurl: { name: "Biceps Curl machine", pat: "curl", m: { biceps: 1 }, kind: "machine", inc: 4.5, key: true, iso: true, note: STACK_NOTE },
  barcurl: { name: "Curl barre", pat: "curl", m: { biceps: 1 }, kind: "free", inc: 2.5, iso: true },
  ezcurl: { name: "Curl EZ", pat: "curl", m: { biceps: 1 }, kind: "free", inc: 2.5, iso: true },
  dbcurl: { name: "Curl haltères", pat: "curl", m: { biceps: 1 }, kind: "free", inc: 2, iso: true },
  inclinecurl: { name: "Curl incliné", pat: "curl", m: { biceps: 1 }, kind: "free", inc: 2, iso: true },
  hammercurl: { name: "Curl marteau", pat: "curl", m: { biceps: 1 }, kind: "free", inc: 2, iso: true },
  pushdown: { name: "Pushdown", pat: "tri", m: { triceps: 1 }, kind: "cable", inc: 2.5, iso: true },
  ropeext: { name: "Extension corde", pat: "tri", m: { triceps: 1 }, kind: "cable", inc: 2.5, iso: true },
  overheadext: { name: "Extension au-dessus de la tête", pat: "tri", m: { triceps: 1 }, kind: "cable", inc: 2.5, iso: true },
  absmachine: { name: "Machine abdominaux", pat: "abs", m: { abdos: 1 }, kind: "machine", inc: 4.5, iso: true, note: STACK_NOTE },
  cablecrunch: { name: "Crunch câble", pat: "abs", m: { abdos: 1 }, kind: "cable", inc: 2.5, iso: true },
  plank: { name: "Gainage", pat: "abs", m: { abdos: 1 }, kind: "bw", unit: "s", iso: true },
  legraises: { name: "Relevés de jambes", pat: "abs", m: { abdos: 1 }, kind: "bw", iso: true },
};

const TEMPLATES = {
  A: { id: "A", name: "PUSH — FORCE", type: "force", ex: [
    { ex: "chestpress", sets: 4, min: 4, max: 6, rest: 180 },
    { ex: "shoulderpress", sets: 4, min: 5, max: 7, rest: 180 },
    { ex: "dips", sets: 3, min: 4, max: 8, rest: 150 },
    { ex: "pushdown", sets: 3, min: 8, max: 10, rest: 90 },
    { ex: "absmachine", sets: 3, min: 10, max: 12, rest: 75 } ] },
  B: { id: "B", name: "PULL — FORCE", type: "force", ex: [
    { ex: "latpulldown", sets: 4, min: 5, max: 7, rest: 180 },
    { ex: "seatedrow", sets: 4, min: 6, max: 8, rest: 150 },
    { ex: "pullups", sets: 3, min: 4, max: 6, rest: 150 },
    { ex: "bicepscurl", sets: 3, min: 6, max: 8, rest: 90 },
    { ex: "cablecrunch", sets: 3, min: 10, max: 12, rest: 75 } ] },
  C: { id: "C", name: "PUSH — HYPERTROPHIE", type: "hyper", ex: [
    { ex: "inclinepress", sets: 3, min: 8, max: 12, rest: 105 },
    { ex: "pecfly", sets: 3, min: 10, max: 15, rest: 90 },
    { ex: "lateralraise", sets: 4, min: 12, max: 15, rest: 75 },
    { ex: "ropeext", sets: 3, min: 10, max: 15, rest: 75 },
    { ex: "pushups", sets: 2, min: 8, max: 20, rest: 90, amrap: true },
    { ex: "legraises", sets: 3, min: 10, max: 15, rest: 60 } ] },
  D: { id: "D", name: "PULL — HYPERTROPHIE", type: "hyper", ex: [
    { ex: "latpulldown", sets: 3, min: 8, max: 12, rest: 105 },
    { ex: "chestrow", sets: 3, min: 10, max: 12, rest: 90 },
    { ex: "facepull", sets: 3, min: 12, max: 15, rest: 60 },
    { ex: "reversefly", sets: 3, min: 12, max: 15, rest: 60 },
    { ex: "hammercurl", sets: 3, min: 10, max: 12, rest: 75 },
    { ex: "cablecrunch", sets: 3, min: 12, max: 15, rest: 60 } ] },
};

/* ------------------------------------------------------------------ */
/* SEED : real June 2026 history                                       */
/* ------------------------------------------------------------------ */
const mk = o => ({ id: uid(), type: "normal", rir: null, ...o });
const rep = (n, o) => Array.from({ length: n }, () => mk({ ...o }));

function buildSeed() {
  const exercises = {};
  for (const [id, def] of Object.entries(EXOS)) {
    exercises[id] = { id, ...def, fav: false, avoid: false, variants: [], curVar: null, seat: "", grip: "", userNote: "" };
  }
  const sessions = [
    { id: "h1", date: "2026-06-04", name: "Séance importée", type: "historique", status: "done", entries: [
      { exerciseId: "latpulldown", sets: rep(8, { load: 45, reps: 10 }) },
      { exerciseId: "shoulderpress", sets: rep(3, { load: 23, reps: 10 }) },
      { exerciseId: "seatedrow", sets: rep(10, { load: 45, reps: 10 }) },
      { exerciseId: "dips", sets: [], pendingNote: "1,5 × 8" },
      { exerciseId: "bicepscurl", sets: rep(1, { load: 32, reps: 10 }) },
      { exerciseId: "pushups", sets: [mk({ reps: 10 }), mk({ reps: 10 })] } ] },
    { id: "h2", date: "2026-06-06", name: "Séance importée", type: "historique", status: "done", entries: [
      { exerciseId: "latpulldown", sets: rep(5, { load: 45, reps: 10 }) },
      { exerciseId: "absmachine", sets: rep(3, { load: 72, reps: 10 }) },
      { exerciseId: "seatedrow", sets: rep(6, { load: 45, reps: 10 }) },
      { exerciseId: "dips", sets: [mk({ reps: 5 })] },
      { exerciseId: "bicepscurl", sets: rep(1, { load: 32, reps: 10 }) },
      { exerciseId: "pushups", sets: [mk({ reps: 10 }), mk({ reps: 10 })] } ] },
    { id: "h3", date: "2026-06-08", name: "Séance importée", type: "historique", status: "done", entries: [
      { exerciseId: "latpulldown", sets: [...rep(6, { load: 45, reps: 10 }), mk({ load: 39, reps: 10, type: "backoff" })] },
      { exerciseId: "shoulderpress", sets: rep(1, { load: 27, reps: 10 }) },
      { exerciseId: "seatedrow", sets: [...rep(7, { load: 45, reps: 10 }), mk({ load: 41, reps: 10, type: "backoff" })] },
      { exerciseId: "dips", sets: rep(3, { reps: 8, bw: 72 }) },
      { exerciseId: "lateralraise", sets: [], pendingNote: "5 × 23 kg" },
      { exerciseId: "pecfly", sets: [mk({ load: 41, reps: 5 }), mk({ load: 36, reps: 5 }), mk({ load: 32, reps: 5 }), mk({ load: 32, reps: 8 })] } ] },
    { id: "h4", date: "2026-06-10", name: "Séance importée", type: "historique", status: "done", entries: [
      { exerciseId: "latpulldown", sets: rep(7, { load: 45, reps: 10 }) },
      { exerciseId: "absmachine", sets: rep(2, { load: 63, reps: 10 }) },
      { exerciseId: "seatedrow", sets: rep(8, { load: 45, reps: 10 }) },
      { exerciseId: "dips", sets: [mk({ reps: 10, bw: 72 }), mk({ reps: 10, bw: 72 }), mk({ reps: 7, bw: 72, note: "série mitigée" }), mk({ reps: 5, bw: 72 })] },
      { exerciseId: "bicepscurl", sets: rep(2, { load: 32, reps: 10 }) } ] },
    { id: "h5", date: "2026-06-13", name: "Séance importée", type: "historique", status: "done", entries: [
      { exerciseId: "latpulldown", sets: rep(7, { load: 45, reps: 10 }) },
      { exerciseId: "shoulderpress", sets: [...rep(4, { load: 27, reps: 10 }), mk({ load: 27, reps: 5 })] },
      { exerciseId: "bicepscurl", sets: [...rep(3, { load: 32, reps: 10 }), mk({ load: 27, reps: 7, type: "backoff" }), mk({ load: 23, reps: 10, type: "backoff" })] } ] },
    { id: "h6", date: "2025-06-13", name: "Séance importée — date à confirmer", type: "historique", status: "done", verifyDate: true, entries: [
      { exerciseId: "seatedrow", sets: rep(6, { load: 45, reps: 10 }) } ] },
    { id: "h7", date: "2025-06-13", name: "Séance importée — date à confirmer", type: "historique", status: "done", verifyDate: true, entries: [
      { exerciseId: "dips", sets: [mk({ reps: 8, bw: 72 }), mk({ reps: 10, bw: 72, assist: 20 })] } ] },
  ];
  const verify = [
    { id: "vr_row", kind: "date", sid: "h6", title: "Rameur assis — 13/06/2025", desc: "Ta note indique 2025, mais les séances voisines sont en juin 2026. Quelle est la bonne année ?" },
    { id: "vr_dipsdate", kind: "date", sid: "h7", title: "Dips — 13/06/2025", desc: "Même chose : cette séance de dips (1 × 8 au poids du corps, puis 1 × 10 avec 20 kg d’assistance) est notée en 2025. Quelle est la bonne année ?" },
    { id: "vr_dips15", kind: "dips15", sid: "h1", exId: "dips", title: "Dips — note « 1,5 × 8 » (04/06/2026)", desc: "Cette notation est ambiguë. Que signifiait-elle ? En attendant, elle n’est pas comptée dans tes stats." },
    { id: "vr_lat", kind: "lat", sid: "h3", exId: "lateralraise", title: "Lateral Raise — « 5 × 23 kg » (08/06/2026)", desc: "5 reps à 23 kg, ou 5 séries à 23 kg ? En attendant, cette entrée n’est pas comptée dans tes stats." },
  ];
  return {
    v: 1,
    createdAt: todayISO(),
    profile: { onboarded: false, age: null, sex: null, height: null, weight: null, targetWeight: null, expYears: null, breakMonths: null, resumeDate: null, sessionsPerWeek: 4, days: [1, 2, 4, 5], maxTime: 75, dipsMax: null, pullupsMax: null, pains: "", injuries: "", uncomfortable: "", equipment: [], morpho: {} },
    exercises, sessions, verify,
    weights: [{ id: uid(), date: "2026-06-08", w: 72 }, { id: uid(), date: "2026-06-10", w: 72 }],
    nutrition: [],
    prefs: { deloadUntil: null, deloadDismissed: null },
    cloud: { enabled: false, url: "", key: "", room: "moi", table: "coach_muscu" },
    program: { order: ["A", "B", "C", "D"], templates: JSON.parse(JSON.stringify(TEMPLATES)), overrides: {} },
  };
}

function migrate(d) {
  for (const [id, def] of Object.entries(EXOS)) {
    if (!d.exercises[id]) d.exercises[id] = { id, ...def, fav: false, avoid: false, variants: [], curVar: null, seat: "", grip: "", userNote: "" };
  }
  d.prefs = d.prefs || { deloadUntil: null, deloadDismissed: null };
  d.cloud = d.cloud || { enabled: false, url: "", key: "", room: "moi", table: "coach_muscu" };
  d.nutrition = d.nutrition || [];
  d.program.overrides = d.program.overrides || {};
  return d;
}

/* ------------------------------------------------------------------ */
/* ENGINE                                                              */
/* ------------------------------------------------------------------ */
function nearestBW(data, date) {
  if (!data.weights.length) return null;
  let best = null, bd = Infinity;
  for (const w of data.weights) { const d = Math.abs(daysBetween(w.date, date)); if (d < bd) { bd = d; best = w.w; } }
  return best;
}
function setEff(ex, t, data, date) {
  if (ex.kind === "bw") return null;
  if (ex.kind === "bwAssist") {
    const bw = t.bw != null ? t.bw : nearestBW(data, date);
    if (bw == null) return null;
    return bw - (t.assist || 0) + (t.extra || 0);
  }
  return t.load != null ? t.load : null;
}
// Certified working entries for one exercise (excludes warmups, unverified data, unfinished rows, other machine variants)
function exHistory(data, exId, opts = {}) {
  const ex = data.exercises[exId];
  const variant = opts.variant !== undefined ? opts.variant : (ex.curVar || null);
  const out = [];
  for (const s of data.sessions) {
    if (s.status !== "done" || s.verifyDate) continue;
    for (const e of s.entries) {
      if (e.exerciseId !== exId) continue;
      const sets = (e.sets || []).filter(t => t.done !== false && !t.uncertain && t.type !== "warmup" && ((t.variantId || null) === variant));
      if (!sets.length) continue;
      const main = sets.filter(t => t.type === "normal" || t.type === "amrap");
      out.push({ date: s.date, sid: s.id, sets, main: main.length ? main : sets });
    }
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}
function computeRecords(data, exId, excludeSid = null) {
  const ex = data.exercises[exId];
  const h = exHistory(data, exId).filter(en => en.sid !== excludeSid);
  const R = { rmap: {} };
  for (const en of h) for (const t of en.sets) {
    if (ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free") {
      if (t.load == null) continue;
      if (!R.load || t.load > R.load.v) R.load = { v: t.load, reps: t.reps, date: en.date };
      const e1 = EPS(t.load, t.reps);
      if (e1 && (!R.e1 || e1 > R.e1.v)) R.e1 = { v: e1, load: t.load, reps: t.reps, date: en.date };
      if (!R.rmap[t.load] || t.reps > R.rmap[t.load].v) R.rmap[t.load] = { v: t.reps, date: en.date };
      if (!R.best || EPS(t.load, t.reps) > EPS(R.best.load, R.best.reps)) R.best = { load: t.load, reps: t.reps, date: en.date };
    } else if (ex.kind === "bwAssist") {
      const a = t.assist || 0, x = t.extra || 0;
      if (!a && !x && (!R.bwReps || t.reps > R.bwReps.v)) R.bwReps = { v: t.reps, date: en.date };
      if (a && (!R.minAssist || a < R.minAssist.v || (a === R.minAssist.v && t.reps > R.minAssist.reps))) R.minAssist = { v: a, reps: t.reps, date: en.date };
      if (x && (!R.maxExtra || x > R.maxExtra.v || (x === R.maxExtra.v && t.reps > R.maxExtra.reps))) R.maxExtra = { v: x, reps: t.reps, date: en.date };
      const eff = setEff(ex, t, data, en.date), e1 = EPS(eff, t.reps);
      if (e1 && (!R.e1 || e1 > R.e1.v)) R.e1 = { v: e1, date: en.date };
    } else {
      if (!R.bwReps || t.reps > R.bwReps.v) R.bwReps = { v: t.reps, date: en.date };
    }
  }
  return R;
}
function readiness(ck) {
  if (!ck || ck.sleep == null) return null;
  return (ck.sleep + ck.energy + ck.motivation + (6 - ck.soreness)) / 4;
}
function readinessTrend(data) {
  const scores = data.sessions.filter(s => s.status === "done" && s.checkin).slice(-4).map(s => readiness(s.checkin)).filter(v => v != null);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
function defaultPlanFor(data, exId) {
  for (const k of data.program.order) {
    const t = data.program.templates[k];
    const e = t.ex.find(x => x.ex === exId);
    if (e) return { ...e };
  }
  return { ex: exId, sets: 3, min: 8, max: 12, rest: 90 };
}
function recommend(data, exId, plan, ctx = {}) {
  const ex = data.exercises[exId];
  const h = exHistory(data, exId);
  let sets = plan.sets, note = null;
  const rd = ctx.readiness;
  if (ctx.deload) { sets = Math.max(2, Math.round(plan.sets * 0.6)); note = "Mode allégé : volume réduit cette semaine, garde de la marge."; }
  else if (rd != null) {
    if (rd < 2.6 && (ctx.trend == null || ctx.trend < 3.2)) { sets = Math.max(2, Math.round(plan.sets * 0.7)); note = "Récupération basse : volume réduit aujourd’hui, garde 2-3 reps de marge."; }
    else if (rd < 3.3 && ex.iso && plan.sets > 2) { sets = plan.sets - 1; note = "Forme moyenne : une série d’isolation en moins, charges maintenues."; }
  }
  const base = { exId, sets, min: plan.min, max: plan.max, rest: plan.rest, amrap: !!plan.amrap, note };
  const mid = Math.round((plan.min + plan.max) / 2);
  if (!h.length) {
    return { ...base, mode: "discover", load: null, pref: Array(sets).fill(mid),
      phrase: (ex.kind === "bw" || ex.kind === "bwAssist")
        ? "Premier passage : vise des séries propres en gardant ~2 reps de marge — je calibre à partir d’aujourd’hui."
        : `Premier passage : choisis une charge qui te laisse ~2 reps de marge sur ${plan.min}-${plan.max} reps. Je calibre la suite.` };
  }
  const last = h[h.length - 1];
  const gap = daysBetween(last.date, todayISO());
  if (ex.kind === "bw") {
    const best = Math.max(...last.main.map(t => t.reps));
    if (gap > 28) return { ...base, mode: "recal", load: null, pref: Array(sets).fill(Math.max(plan.min, Math.round(best * 0.7))),
      phrase: `Reprise après ~${Math.round(gap / 7)} semaines : vise environ 70 % de ton ancien max (${best} reps), technique propre, 2-3 reps de marge.` };
    return { ...base, mode: "keep", load: null, pref: Array(sets).fill(best),
      phrase: plan.amrap ? `Max de reps propres en gardant 1 de marge. Référence : ${best} reps.` : `Objectif : égaler ou battre ${best} reps sur ta meilleure série.` };
  }
  if (ex.kind === "bwAssist") {
    const la = last.main;
    const minA = Math.min(...la.map(t => t.assist || 0));
    const atBest = la.filter(t => (t.assist || 0) === minA);
    const bestReps = Math.max(...atBest.map(t => t.reps));
    const extraMax = Math.max(...la.map(t => t.extra || 0));
    if (gap > 28) {
      const sugA = minA > 0 ? minA : (bestReps < plan.min + 2 ? 10 : 0);
      return { ...base, mode: "recal", assist: sugA, extra: 0, load: null, pref: Array(sets).fill(Math.max(plan.min, Math.ceil(bestReps * 0.7))),
        phrase: sugA ? `Reprise : repars avec ~${sugA} kg d’assistance et des séries à 2-3 RIR — on recalibre aujourd’hui.` : `Reprise : séries au poids du corps à 2-3 RIR, sans viser ton ancien max (${bestReps} reps) dès aujourd’hui.` };
    }
    const full = la.length >= plan.sets && la.every(t => t.reps >= plan.max);
    if (full && minA > 0) {
      const na = Math.max(0, minA - (ex.inc || 5));
      return { ...base, mode: "inc", assist: na, extra: 0, load: null, pref: Array(sets).fill(plan.min),
        phrase: na > 0 ? `Passe à −${na} kg d’assistance : tu as validé ${plan.sets} × ${plan.max} à −${minA} kg. Moins d’aide = progression.` : `Essaie au poids du corps : tu as validé ${plan.sets} × ${plan.max} avec seulement ${minA} kg d’aide.` };
    }
    if (full && minA === 0) {
      const ne = (extraMax || 0) + 2.5;
      return { ...base, mode: "inc", assist: 0, extra: ne, load: null, pref: Array(sets).fill(plan.min),
        phrase: `Ajoute +${fk(ne)} kg de lest : le poids du corps est validé sur ${plan.sets} × ${plan.max}.` };
    }
    const badNow = la.length >= 2 && la.filter(t => t.reps < plan.min).length >= Math.ceil(la.length / 2);
    const prevB = h.length >= 2 ? h[h.length - 2].main : null;
    const badPrev = prevB && prevB.length >= 2 && Math.min(...prevB.map(t => t.assist || 0)) === minA
      && prevB.filter(t => t.reps < plan.min).length >= Math.ceil(prevB.length / 2);
    if (badNow && badPrev && !extraMax) {
      const na = minA + (ex.inc || 5);
      return { ...base, mode: "down", assist: na, extra: 0, load: null, pref: Array(sets).fill(plan.min),
        phrase: `Deux séances difficiles d’affilée : reprends ${minA ? "un peu plus" : "un peu"} d’assistance (−${fk(na)} kg) pour retravailler proprement dans la fourchette ${plan.min}-${plan.max}.` };
    }
    const tot = la.reduce((a, t) => a + t.reps, 0);
    return { ...base, mode: "keep", assist: minA, extra: extraMax || 0, load: null, targetTotal: tot + 1,
      pref: la.slice(0, sets).map(t => clamp(t.reps, Math.max(1, plan.min - 2), plan.max)).concat(Array(Math.max(0, sets - la.length)).fill(plan.min)),
      phrase: minA > 0 ? `Garde −${minA} kg d’assistance et vise ≥ ${tot + 1} reps totales (dernière fois : ${tot}).` : `Au poids du corps : vise ≥ ${tot + 1} reps totales (dernière fois : ${tot}).` };
  }
  // loaded exercises
  const top = Math.max(...last.main.map(t => t.load || 0));
  const atTop = last.main.filter(t => t.load === top);
  if (gap > 28) {
    const rl = r05(Math.max(ex.inc || 2.5, top - (ex.inc || 2.5)));
    return { ...base, mode: "recal", load: rl, pref: Array(sets).fill(mid),
      phrase: `Reprise après ~${Math.round(gap / 7)} sem. : repars ≈ 1 cran sous ton ancien ${fk(top)} kg et recalibre à 2-3 RIR. Pas de record aujourd’hui.` };
  }
  const rirs = atTop.map(t => t.rir).filter(v => v != null);
  const margin = rirs.length ? (rirs.reduce((a, b) => a + b, 0) / rirs.length >= 1) : true;
  const full = atTop.length >= plan.sets && atTop.every(t => t.reps >= plan.max);
  if (full && margin) {
    if (rd != null && rd < 2.8) return { ...base, mode: "keep", load: top, pref: Array(sets).fill(plan.max),
      phrase: `L’incrément est gagné, mais ta récup est basse : garde ${fk(top)} kg aujourd’hui, l’augmentation attendra la prochaine séance.` };
    const nl = r05(top + (ex.inc || 2.5));
    return { ...base, mode: "inc", load: nl, pref: Array(sets).fill(plan.min + (plan.max - plan.min > 2 ? 1 : 0)),
      phrase: `Passe à ${fk(nl)} kg : tu as validé ${plan.sets} × ${plan.max} à ${fk(top)} kg avec assez de marge.` };
  }
  const lows = atTop.filter(t => t.reps < plan.min).length;
  if (atTop.length >= 2 && lows >= Math.ceil(atTop.length / 2)) {
    const prevEn = h.length >= 2 ? h[h.length - 2] : null;
    if (prevEn) {
      const ptop = Math.max(...prevEn.main.map(t => t.load || 0));
      const pat = prevEn.main.filter(t => t.load === ptop);
      const pbad = pat.length >= 2 && pat.filter(t => t.reps < plan.min).length >= Math.ceil(pat.length / 2);
      if (pbad && ptop === top) {
        const dl = r05(Math.max(ex.inc || 2.5, top - (ex.inc || 2.5)));
        return { ...base, mode: "down", load: dl, pref: Array(sets).fill(Math.min(plan.max, plan.min + 1)),
          phrase: `Deux séances de suite sous ${plan.min} reps à ${fk(top)} kg : redescends à ${fk(dl)} kg pour reconstruire proprement — tu remonteras en 2-3 séances.` };
      }
    }
    return { ...base, mode: "hold", load: top, pref: Array(sets).fill(plan.min),
      phrase: `Garde ${fk(top)} kg : consolide d’abord ${sets} × ${plan.min} reps propres avant de monter.` };
  }
  const tot = atTop.reduce((a, t) => a + t.reps, 0);
  const tgt = Math.min(tot + 1, sets * plan.max);
  if (tgt < tot) return { ...base, mode: "keep", load: top,
    pref: Array(sets).fill(plan.max),
    phrase: `Nouvelle plage de travail (${plan.min}-${plan.max} reps) : garde ${fk(top)} kg et vise ${sets} × ${plan.max} reps propres.` };
  return { ...base, mode: "keep", load: top, targetTotal: tgt,
    pref: atTop.slice(0, sets).map(t => clamp(t.reps, plan.min, plan.max)).concat(Array(Math.max(0, sets - atTop.length)).fill(plan.min)),
    phrase: `Garde ${fk(top)} kg : tu progresses encore en répétitions — vise ≥ ${tgt} reps totales (dernière fois : ${tot}).` };
}
function compareEntry(data, ex, prevEn, curSets, dateC) {
  if (!prevEn) return { v: "ref", phrase: "Première référence enregistrée pour cet exercice." };
  const f = (sets, date) => { let e1 = 0, topEff = 0, tot = 0; for (const t of sets) { const eff = setEff(ex, t, data, date) ?? t.load ?? 0; const e = EPS(eff, t.reps); if (e > e1) e1 = e; if (eff > topEff) topEff = eff; tot += t.reps || 0; } return { e1, topEff, tot }; };
  const a = f(prevEn.main, prevEn.date), b = f(curSets, dateC);
  if (ex.kind === "bwAssist") {
    const aA = Math.min(...prevEn.main.map(t => t.assist || 0)), bA = Math.min(...curSets.map(t => t.assist || 0));
    if (bA < aA && b.tot >= a.tot * 0.85) return { v: "up", phrase: `Assistance réduite de ${aA} à ${bA} kg pour un travail équivalent : vraie progression.` };
    if (bA > aA) return { v: "mid", phrase: `Plus d’assistance qu’avant (−${bA} vs −${aA} kg) : séance de gestion, pas un recul définitif.` };
  }
  const d = a.e1 ? ((b.e1 - a.e1) / a.e1) * 100 : 0;
  if (b.topEff > a.topEff && d >= -0.5) return { v: "up", phrase: `Plus lourd qu’à la dernière séance (${fk(b.topEff)} vs ${fk(a.topEff)} kg).` };
  if (b.topEff === a.topEff && b.tot > a.tot) return { v: "up", phrase: `+${b.tot - a.tot} reps au total à charge égale.` };
  if (d > 1.5) return { v: "up", phrase: "Force estimée en hausse par rapport à la dernière séance." };
  if (b.tot < a.tot && b.topEff >= a.topEff) return { v: "mid", phrase: "Moins de volume mais une intensité au moins égale : séance comparable." };
  if (d < -3 && b.tot < a.tot) return { v: "down", phrase: "Un peu en dessous de la dernière fois — regarde ta récupération, pas de conclusion sur une seule séance." };
  return { v: "mid", phrase: "Séance similaire à la précédente." };
}
function newRecordsForSession(data, session) {
  const msgs = [];
  for (const e of session.entries) {
    const ex = data.exercises[e.exerciseId];
    if (!ex) continue;
    const R = computeRecords(data, e.exerciseId, session.id);
    const work = (e.sets || []).filter(t => t.done !== false && !t.uncertain && t.type !== "warmup");
    let best = null;
    for (const t of work) {
      if (ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free") {
        if (t.load == null) continue;
        if (t.load > (R.load?.v ?? 0)) best = `${ex.name} : nouvelle charge max — ${fk(t.load)} kg`;
        else if (R.rmap[t.load] != null && t.reps > R.rmap[t.load].v) best = best || `${ex.name} : ${t.reps} reps à ${fk(t.load)} kg (record)`;
        else if (R.e1 && EPS(t.load, t.reps) > R.e1.v * 1.01) best = best || `${ex.name} : force estimée record`;
      } else if (ex.kind === "bwAssist") {
        const a = t.assist || 0, x = t.extra || 0;
        if (x > (R.maxExtra?.v ?? 0)) best = `${ex.name} : lest record — +${fk(x)} kg`;
        else if (!a && !x && t.reps > (R.bwReps?.v ?? 0)) best = best || `${ex.name} : record au poids du corps — ${t.reps} reps`;
        else if (a && R.minAssist && a < R.minAssist.v) best = best || `${ex.name} : assistance la plus basse — −${a} kg`;
        else if (a && !R.minAssist && !R.bwReps) best = best;
      } else {
        if (t.reps > (R.bwReps?.v ?? 0)) best = `${ex.name} : record — ${t.reps} reps`;
      }
    }
    if (best) msgs.push(best);
  }
  return msgs;
}
function stagnation(data, exId, plan) {
  const ex = data.exercises[exId];
  const h = exHistory(data, exId).filter(en => daysBetween(en.date, todayISO()) <= 60);
  if (h.length < 4) return null;
  const recent = h.slice(-4);
  const score = en => { let m = 0; for (const t of en.main) { const eff = setEff(ex, t, data, en.date) ?? t.load ?? 0; const e = ex.kind === "bw" ? t.reps : EPS(eff, t.reps); if (e > m) m = e; } return m; };
  const ss = recent.map(score);
  const lastBest = Math.max(...ss.slice(-2)), prevBest = Math.max(...ss.slice(0, 2));
  if (lastBest > prevBest * 1.005) return null;
  const sug = [
    "Garde la charge et vise +1 rep par séance sur ta meilleure série",
    plan && plan.max <= 8 ? "Change temporairement de plage : 3 × 8-10 un cran plus léger" : "Change temporairement de plage : 4-5 reps un peu plus lourd",
    "Redescends d’un cran et remonte en 2 séances avec plus de marge",
    "Réduis le volume de ~20 % une semaine en gardant l’intensité",
  ];
  const tr = readinessTrend(data);
  if (tr != null && tr < 3) sug.unshift("Ta récupération récente est basse : dors et mange d’abord, la charge suivra");
  return { n: recent.length, since: recent[0].date, suggestions: sug.slice(0, 4) };
}
function deloadSuggested(data) {
  if (data.prefs.deloadUntil && daysBetween(todayISO(), data.prefs.deloadUntil) >= 0) return false;
  if (data.prefs.deloadDismissed && daysBetween(data.prefs.deloadDismissed, todayISO()) < 10) return false;
  const real = data.sessions.filter(s => s.status === "done" && s.type !== "historique" && daysBetween(s.date, todayISO()) <= 30);
  if (real.length < 6) return false;
  const keys = Object.values(data.exercises).filter(e => e.key).map(e => e.id);
  const stag = keys.filter(id => stagnation(data, id, defaultPlanFor(data, id))).length;
  const tr = readinessTrend(data);
  return stag >= 3 && (tr == null || tr < 3.2);
}
function deloadActive(data) { return !!(data.prefs.deloadUntil && daysBetween(todayISO(), data.prefs.deloadUntil) >= 0); }
function muscleVolume(data, wsISO) {
  const acc = {}; MKEYS.forEach(k => acc[k] = 0);
  const we = addDays(wsISO, 7);
  for (const s of data.sessions) {
    if (s.status !== "done" || s.verifyDate || s.date < wsISO || s.date >= we) continue;
    for (const e of s.entries) {
      const ex = data.exercises[e.exerciseId]; if (!ex) continue;
      const n = (e.sets || []).filter(t => t.done !== false && !t.uncertain && t.type !== "warmup").length;
      for (const [m, c] of Object.entries(ex.m || {})) acc[m] += n * c;
    }
  }
  MKEYS.forEach(k => acc[k] = Math.round(acc[k] * 2) / 2);
  return acc;
}
function seriesFor(data, exId, metric, fromISO) {
  const ex = data.exercises[exId];
  const h = exHistory(data, exId).filter(en => en.date >= fromISO);
  const pts = [];
  for (const en of h) {
    let v = null;
    if (metric === "charge") {
      const effs = en.sets.map(t => setEff(ex, t, data, en.date) ?? t.load).filter(x => x != null);
      v = effs.length ? Math.max(...effs) : null;
      if (ex.kind === "bw") v = Math.max(...en.sets.map(t => t.reps));
    } else if (metric === "e1") {
      let m = 0; for (const t of en.main) { const eff = setEff(ex, t, data, en.date) ?? t.load; const e = EPS(eff, t.reps); if (e > m) m = e; }
      v = m || null;
      if (ex.kind === "bw") v = null;
    } else if (metric === "reps") {
      if (ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free") {
        const top = Math.max(...en.main.map(t => t.load || 0));
        v = Math.max(...en.main.filter(t => t.load === top).map(t => t.reps));
      } else v = Math.max(...en.main.map(t => t.reps));
    } else if (metric === "vol") {
      let s = 0; for (const t of en.sets) { const eff = setEff(ex, t, data, en.date) ?? t.load ?? 0; s += (ex.kind === "bw" ? t.reps : eff * t.reps); }
      v = Math.round(s);
    }
    if (v != null) pts.push({ d: fmtDM(en.date), date: en.date, v: Math.round(v * 10) / 10 });
  }
  return pts;
}
function trendBadge(data, exId) {
  const h = exHistory(data, exId);
  if (!h.length) return { t: "—", c: MUT };
  const gap = daysBetween(h[h.length - 1].date, todayISO());
  if (gap > 28) return { t: "REPRISE", c: AMB };
  if (h.length < 2) return { t: "NOUVEAU", c: SUB };
  const ex = data.exercises[exId];
  const score = en => { let m = 0; for (const t of en.main) { const eff = setEff(ex, t, data, en.date) ?? t.load ?? 0; const e = ex.kind === "bw" ? t.reps : EPS(eff, t.reps); if (e > m) m = e; } return m; };
  const l = score(h[h.length - 1]), p = score(h[h.length - 2]);
  if (l > p * 1.01) return { t: "↗ EN HAUSSE", c: ACC };
  if (l < p * 0.97) return { t: "↘ EN BAISSE", c: RED };
  return { t: "→ STABLE", c: SUB };
}
/* Planning */
function realDone(data) { return data.sessions.filter(s => s.status === "done" && s.type !== "historique").sort((a, b) => a.date < b.date ? -1 : 1); }
function nextTemplateId(data) {
  const done = realDone(data).filter(s => s.templateId);
  if (!done.length) return data.program.order[0];
  const last = done[done.length - 1].templateId;
  const i = data.program.order.indexOf(last);
  return data.program.order[(i + 1) % data.program.order.length];
}
function plannedMap(data, days = 42) {
  const map = {}; const t0 = todayISO();
  let cursor = nextTemplateId(data);
  const doneToday = data.sessions.some(s => s.status === "done" && s.type !== "historique" && s.date === t0);
  const adv = c => data.program.order[(data.program.order.indexOf(c) + 1) % data.program.order.length];
  for (let i = 0; i <= days; i++) {
    const dte = addDays(t0, i);
    if (i === 0 && doneToday) continue;
    const ov = data.program.overrides[dte];
    if (ov === "rest") continue;
    if (ov) { map[dte] = ov; cursor = adv(ov); continue; }
    if (data.profile.days.includes(dow(dte))) { map[dte] = cursor; cursor = adv(cursor); }
  }
  return map;
}
function missedDates(data, back = 21) {
  const first = realDone(data)[0];
  if (!first) return [];
  const out = []; const t0 = todayISO();
  for (let i = 1; i <= back; i++) {
    const dte = addDays(t0, -i);
    if (dte < first.date) break;
    const ov = data.program.overrides[dte];
    if (ov === "rest") continue;
    const trainDay = ov || data.profile.days.includes(dow(dte));
    if (!trainDay) continue;
    if (!data.sessions.some(s => s.status === "done" && s.type !== "historique" && s.date === dte)) out.push(dte);
  }
  return out;
}
function estMinutes(entriesLike) {
  let s = 6;
  for (const e of entriesLike) s += (e.sets * (45 + (e.rest || 90))) / 60;
  return Math.round(s / 5) * 5;
}
function morphoTips(profile, ex) {
  const m = profile.morpho || {}; const tips = [];
  const longArms = m.arms === "longs" || (m.wingspan && profile.height && m.wingspan - profile.height >= 5);
  const limMob = m.shoulderMob === "limitee";
  if (longArms) {
    if (ex.pat === "hpush") tips.push("Bras longs : prise un peu plus large que les épaules, amplitude contrôlée sans forcer l’étirement max.");
    if (ex.pat === "vpull") tips.push("Bras longs : penche légèrement le buste et tire les coudes vers les hanches — grand dorsal mieux ciblé.");
    if (ex.pat === "dip") tips.push("Bras longs : descends jusqu’à coudes ~90°, pas plus bas si l’épaule tire.");
  }
  if (limMob) {
    if (ex.pat === "vpush") tips.push("Mobilité d’épaule limitée : préfère une prise neutre ou légèrement inclinée si la machine le permet.");
    if (ex.pat === "hpush") tips.push("Mobilité limitée : coudes à ~45° du buste plutôt qu’écartés à 90°.");
  }
  if (m.torso === "court" && ex.pat === "hpull") tips.push("Cale bien la poitrine sur le support et règle le siège pour tirer à hauteur du bas des pectoraux.");
  return tips.slice(0, 1);
}
function alternativesFor(data, exId) {
  const ex = data.exercises[exId];
  const prim = Object.entries(ex.m || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const all = Object.values(data.exercises).filter(e => e.id !== exId && !e.avoid);
  const same = all.filter(e => e.pat === ex.pat);
  const mus = all.filter(e => e.pat !== ex.pat && Object.entries(e.m || {}).sort((a, b) => b[1] - a[1])[0]?.[0] === prim);
  return [...same, ...mus].slice(0, 6);
}
function upsertWeight(d, date, w) {
  const ex = d.weights.find(x => x.date === date);
  if (ex) ex.w = w; else d.weights.push({ id: uid(), date, w });
  d.weights.sort((a, b) => a.date < b.date ? -1 : 1);
}
function condensedSets(ex, sets) {
  const parts = []; let cur = null;
  const lab = t => {
    if (ex.kind === "bwAssist") {
      const bw = t.bw != null ? `PDC ${fk(t.bw)}` : "PDC";
      if (t.assist) return `${bw} −${fk(t.assist)} kg`;
      if (t.extra) return `${bw} +${fk(t.extra)} kg`;
      return bw;
    }
    if (ex.kind === "bw") return ex.unit === "s" ? "" : "PDC";
    return `${fk(t.load)} kg`;
  };
  for (const t of sets) {
    const k = lab(t) + "|" + t.reps + "|" + t.type;
    if (cur && cur.k === k) cur.n++;
    else { cur = { k, n: 1, t }; parts.push(cur); }
  }
  return parts.map(p => {
    const base = lab(p.t);
    const suff = p.t.type === "backoff" ? " (back-off)" : p.t.type === "warmup" ? " (échauff.)" : p.t.type === "drop" ? " (drop)" : p.t.type === "amrap" ? " (AMRAP)" : "";
    const reps = ex.unit === "s" ? `${p.t.reps} s` : `${p.n} × ${p.t.reps}`;
    return base ? `${base} — ${reps}${suff}` : `${reps}${suff}`;
  }).join("  ·  ");
}

/* ------------------------------------------------------------------ */
/* UI ATOMS                                                            */
/* ------------------------------------------------------------------ */
function Label({ children, style }) {
  return <div className="uppercase" style={{ fontFamily: FD, fontWeight: 600, fontSize: 12, letterSpacing: 1.6, color: MUT, ...style }}>{children}</div>;
}
function Card({ children, style, onClick, className }) {
  return <div onClick={onClick} className={className} style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 18, padding: 16, ...style }}>{children}</div>;
}
function Btn({ children, onClick, kind = "primary", full, small, disabled, style }) {
  const base = { borderRadius: 14, fontFamily: FD, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.4 : 1, ...style };
  const kinds = {
    primary: { background: ACC, color: "#0B0C0E" },
    ghost: { background: SURF2, color: TXT, border: `1px solid ${LINE}` },
    subtle: { background: "transparent", color: SUB, border: `1px solid ${LINE}` },
    danger: { background: REDSOFT, color: RED, border: `1px solid rgba(224,92,92,0.3)` },
  };
  return <button disabled={disabled} onClick={onClick} className={`active:opacity-70 transition ${full ? "w-full" : ""}`}
    style={{ ...base, ...kinds[kind], padding: small ? "9px 14px" : "15px 18px", fontSize: small ? 14 : 17 }}>{children}</button>;
}
function Chip({ on, children, onClick, small, color }) {
  return <button onClick={onClick} className="active:opacity-70 transition"
    style={{ padding: small ? "6px 11px" : "9px 14px", borderRadius: 999, fontFamily: FD, fontWeight: 600, letterSpacing: 0.6, fontSize: small ? 13 : 15, textTransform: "uppercase", whiteSpace: "nowrap",
      background: on ? (color || ACC) : SURF2, color: on ? "#0B0C0E" : SUB, border: `1px solid ${on ? (color || ACC) : LINE}` }}>{children}</button>;
}
function Seg({ opts, val, set, small }) {
  return <div className="flex flex-wrap gap-2">{opts.map(o => <Chip key={o.v} small={small} on={val === o.v} onClick={() => set(o.v)}>{o.l}</Chip>)}</div>;
}
function Stepper({ v, set, step = 1, min = 0, max = 999, fmt = x => (x == null ? "—" : x), big }) {
  const s = n => set(clamp(r05((v ?? 0) + n), min, max));
  return <div className="flex items-center shrink-0" style={{ background: SURF2, borderRadius: 12, border: `1px solid ${LINE}` }}>
    <button className="px-3 active:opacity-50" style={{ paddingTop: big ? 12 : 8, paddingBottom: big ? 12 : 8 }} onClick={() => s(-step)}><Minus size={big ? 18 : 15} color={SUB} /></button>
    <div className="tabular-nums text-center" style={{ minWidth: big ? 58 : 42, fontFamily: FD, fontWeight: 600, fontSize: big ? 24 : 17 }}>{fmt(v)}</div>
    <button className="px-3 active:opacity-50" style={{ paddingTop: big ? 12 : 8, paddingBottom: big ? 12 : 8 }} onClick={() => s(step)}><Plus size={big ? 18 : 15} color={SUB} /></button>
  </div>;
}
function NIn({ v, set, ph = "—", w = 88, suffix, size = 20 }) {
  return <div className="flex items-center gap-1" style={{ background: SURF2, borderRadius: 12, border: `1px solid ${LINE}`, padding: "8px 12px" }}>
    <input type="number" inputMode="decimal" value={v ?? ""} placeholder={ph}
      onChange={e => set(e.target.value === "" ? null : Number(e.target.value))}
      style={{ width: w, textAlign: "center", fontFamily: FD, fontWeight: 600, fontSize: size }} className="tabular-nums" />
    {suffix && <span style={{ color: MUT, fontSize: 13 }}>{suffix}</span>}
  </div>;
}
function TIn({ v, set, ph, area }) {
  const st = { width: "100%", background: SURF2, borderRadius: 12, border: `1px solid ${LINE}`, padding: "11px 13px", fontSize: 15, color: TXT };
  return area
    ? <textarea rows={2} value={v ?? ""} placeholder={ph} onChange={e => set(e.target.value)} style={{ ...st, resize: "none", fontFamily: FB }} />
    : <input value={v ?? ""} placeholder={ph} onChange={e => set(e.target.value)} style={st} />;
}
function Field({ label, children, hint }) {
  return <div className="flex flex-col gap-2">
    <Label>{label}</Label>
    {children}
    {hint && <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.45 }}>{hint}</div>}
  </div>;
}
function Sheet({ open, onClose, title, children, tall }) {
  if (!open) return null;
  return <div className="fixed inset-0 fade" style={{ zIndex: 60, background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
    <div className="absolute bottom-0 left-0 right-0 sheet overflow-y-auto" onClick={e => e.stopPropagation()}
      style={{ background: SURF, borderTop: `1px solid ${LINE}`, borderRadius: "22px 22px 0 0", padding: "18px 18px 34px", maxHeight: tall ? "92vh" : "80vh", maxWidth: 448, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 21, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</div>
        <button onClick={onClose} className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 10 }}><X size={17} color={SUB} /></button>
      </div>
      {children}
    </div>
  </div>;
}
function StatTile({ label, value, sub, accent }) {
  return <div className="flex-1" style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 16, padding: "12px 13px", minWidth: 0 }}>
    <Label style={{ fontSize: 10.5 }}>{label}</Label>
    <div className="tabular-nums truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 23, marginTop: 3, color: accent ? ACC : TXT }}>{value}</div>
    {sub && <div className="truncate" style={{ color: MUT, fontSize: 12 }}>{sub}</div>}
  </div>;
}
function Verdict({ v }) {
  const map = { up: { t: "Mieux", c: ACC, bg: ACCSOFT }, mid: { t: "Similaire", c: SUB, bg: SURF2 }, down: { t: "Moins bien", c: RED, bg: REDSOFT }, ref: { t: "Référence", c: SUB, bg: SURF2 } };
  const m = map[v] || map.mid;
  return <span style={{ background: m.bg, color: m.c, borderRadius: 999, padding: "4px 11px", fontFamily: FD, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.8 }}>{m.t}</span>;
}
function Bar({ pct, color }) {
  return <div style={{ height: 6, borderRadius: 99, background: SURF2, overflow: "hidden" }}>
    <div style={{ width: `${clamp(pct, 3, 100)}%`, height: "100%", background: color || ACC, borderRadius: 99 }} />
  </div>;
}
function Empty({ text }) {
  return <div className="text-center" style={{ color: MUT, fontSize: 14, padding: "26px 14px", lineHeight: 1.5 }}>{text}</div>;
}
function ChartBox({ pts, unit, height = 190 }) {
  if (!pts.length) return <Empty text="Pas encore de données sur cette période." />;
  return <div style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={pts} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="d" tick={{ fill: MUT, fontSize: 11, fontFamily: FB }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: MUT, fontSize: 11, fontFamily: FB }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={44} />
        <Tooltip contentStyle={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, fontFamily: FB, fontSize: 13 }} labelStyle={{ color: SUB }} itemStyle={{ color: TXT }} formatter={val => [`${String(val).replace(".", ",")}${unit ? " " + unit : ""}`, ""]} separator="" />
        <Line type="monotone" dataKey="v" stroke={ACC} strokeWidth={2.4} dot={{ r: 3, fill: ACC, strokeWidth: 0 }} activeDot={{ r: 4.5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

/* ------------------------------------------------------------------ */
/* APP SHELL                                                           */
/* ------------------------------------------------------------------ */
const KEY = "coach-muscu-v1", BKEY = "coach-muscu-v1-bak";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const KV = (() => {
  try { if (typeof window !== "undefined" && window.storage) return {
    type: "claude",
    get: async k => { const r = await window.storage.get(k); return r && r.value != null ? r.value : null; },
    set: async (k, v) => { const r = await window.storage.set(k, v); return !!r; },
  }; } catch (e) {}
  try {
    const ls = window.localStorage; const t = "__cm_probe"; ls.setItem(t, "1"); ls.removeItem(t);
    return { type: "local", get: async k => ls.getItem(k), set: async (k, v) => { ls.setItem(k, v); return true; } };
  } catch (e) {}
  return null;
})();
const fetchT = (url, opts = {}, ms = 8000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
};
const cloudBase = c => (c.url || "").trim().replace(/\/+$/, "");
const cloudTable = c => ((c.table || "coach_muscu").replace(/[^a-zA-Z0-9_]/g, "") || "coach_muscu");
const cloudHead = c => ({ apikey: (c.key || "").trim(), Authorization: `Bearer ${(c.key || "").trim()}`, "Content-Type": "application/json" });
const cloudErrMsg = e => e?.name === "AbortError" ? "délai dépassé"
  : (e?.message === "Failed to fetch" || e?.name === "TypeError") ? "requête bloquée (réseau, CORS ou bac à sable de l’artéfact)"
  : (e?.message || "erreur inconnue");
const rawPull = async c => {
  const r = await fetchT(`${cloudBase(c)}/rest/v1/${cloudTable(c)}?id=eq.${encodeURIComponent(c.room || "moi")}&select=payload`, { headers: cloudHead(c) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  return Array.isArray(j) && j[0]?.payload ? j[0].payload : null;
};
const rawPush = async (c, payload) => {
  const r = await fetchT(`${cloudBase(c)}/rest/v1/${cloudTable(c)}?on_conflict=id`, {
    method: "POST", headers: { ...cloudHead(c), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ id: c.room || "moi", payload, updated_at: new Date().toISOString() }]) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return true;
};

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("today");
  const [detail, setDetail] = useState(null); // {type:'exercise'|'session', id}
  const [sessionOpen, setSessionOpen] = useState(false);
  const [summaryId, setSummaryId] = useState(null);
  const [storageOk, setStorageOk] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [cloudSt, setCloudSt] = useState({ status: "off", t: null, msg: null });
  const [bootInfo, setBootInfo] = useState(null);
  const saveT = useRef(null); const cloudT = useRef(null); const ready = useRef(false);
  const dataRef = useRef(null); const lastBak = useRef(0);
  useEffect(() => { dataRef.current = data; }, [data]);

  const tryGet = async k => { const raw = await KV.get(k); return raw ? JSON.parse(raw) : null; };
  const cloudPush = useCallback(async d => {
    const c = d?.cloud; if (!c?.enabled || !c.url || !c.key) return false;
    try { await rawPush(c, d); setCloudSt({ status: "ok", t: Date.now(), msg: null }); return true; }
    catch (e) { setCloudSt({ status: "err", t: Date.now(), msg: cloudErrMsg(e) }); return false; }
  }, []);
  const persist = useCallback(async d => {
    if (KV) {
      try {
        const okr = await KV.set(KEY, JSON.stringify(d));
        if (!okr) throw new Error("échec d’écriture");
        setStorageOk(true); setLastSaved(Date.now());
        if (Date.now() - lastBak.current > 120000) {
          lastBak.current = Date.now();
          try { await KV.set(BKEY, JSON.stringify(d)); } catch (e) {}
        }
      } catch (e) { setStorageOk(false); }
    } else setStorageOk(false);
    if (d?.cloud?.enabled && d.cloud.url && d.cloud.key) {
      clearTimeout(cloudT.current);
      cloudT.current = setTimeout(() => cloudPush(dataRef.current || d), 2500);
    }
  }, [cloudPush]);
  const saveNow = useCallback(async () => { clearTimeout(saveT.current); if (dataRef.current) await persist(dataRef.current); }, [persist]);
  const restoreBackup = useCallback(async () => {
    try { if (KV) { const b = await tryGet(BKEY); if (b) { setData(migrate(b)); return true; } } } catch (e) {}
    return false;
  }, []);
  const pullNow = useCallback(async () => {
    const c = dataRef.current?.cloud; if (!c?.enabled || !c.url || !c.key) return { ok: false, msg: "configuration incomplète" };
    try { const remote = await rawPull(c);
      if (!remote) return { ok: false, msg: "aucune donnée trouvée pour cet identifiant" };
      setData(migrate(remote)); setCloudSt({ status: "ok", t: Date.now(), msg: null }); return { ok: true };
    } catch (e) { const m = cloudErrMsg(e); setCloudSt({ status: "err", t: Date.now(), msg: m }); return { ok: false, msg: m }; }
  }, []);
  const testNow = useCallback(async () => {
    const c = dataRef.current?.cloud; if (!c?.url || !c.key) return { ok: false, msg: "renseigne l’URL et la clé anon" };
    try { const r = await fetchT(`${cloudBase(c)}/rest/v1/${cloudTable(c)}?select=id&limit=1`, { headers: cloudHead(c) });
      if (!r.ok) throw new Error("HTTP " + r.status + (r.status === 404 ? " — table introuvable (exécute le SQL fourni)" : r.status === 401 || r.status === 403 ? " — clé refusée" : ""));
      return { ok: true, msg: "connexion OK, table accessible" };
    } catch (e) { return { ok: false, msg: cloudErrMsg(e) }; }
  }, []);
  const importJson = useCallback(txt => {
    try { const d = JSON.parse(txt); if (!d || !d.sessions || !d.profile) return false; setData(migrate(d)); return true; }
    catch (e) { return false; }
  }, []);

  useEffect(() => { (async () => {
    let d = null, binfo = "found";
    if (!KV) { setStorageOk(false); binfo = "nostore"; }
    else {
      try { d = await tryGet(KEY); } catch (e) {}
      if (!d) { await sleep(700); try { d = await tryGet(KEY); } catch (e) {} }
      if (!d) { try { d = await tryGet(BKEY); } catch (e) {} }
      if (!d) binfo = "empty";
    }
    if (!d) d = buildSeed();
    d = migrate(d);
    if (d.cloud?.enabled && d.cloud.url && d.cloud.key) {
      try { const remote = await rawPull(d.cloud); if (remote) { d = migrate(remote); binfo = "found"; setCloudSt({ status: "ok", t: Date.now(), msg: null }); } }
      catch (e) { setCloudSt({ status: "err", t: Date.now(), msg: cloudErrMsg(e) }); }
    }
    lastBak.current = Date.now();
    setBootInfo(binfo);
    setData(d); ready.current = true;
  })(); }, []);

  useEffect(() => {
    if (!ready.current || !data) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => persist(data), 500);
  }, [data, persist]);

  useEffect(() => {
    const flush = () => { if (ready.current && dataRef.current) {
      clearTimeout(saveT.current); persist(dataRef.current);
      if (dataRef.current.cloud?.enabled) { clearTimeout(cloudT.current); cloudPush(dataRef.current); }
    } };
    const vh = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", vh);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => { document.removeEventListener("visibilitychange", vh); window.removeEventListener("pagehide", flush); window.removeEventListener("beforeunload", flush); };
  }, [persist, cloudPush]);

  const mut = useCallback(fn => setData(p => { const d = JSON.parse(JSON.stringify(p)); fn(d); return d; }), []);

  if (!data) return <div className="app flex items-center justify-center min-h-screen" style={{ background: BG, color: MUT }}>
    <style>{CSS}</style>
    <div style={{ fontFamily: FD, letterSpacing: 3, textTransform: "uppercase", fontSize: 15 }}>Chargement…</div>
  </div>;

  const active = data.sessions.find(s => s.status === "inprogress");
  const shell = children => <div className="app" style={{ background: BG, color: TXT, minHeight: "100vh" }}>
    <style>{CSS}</style>
    <div className="mx-auto relative" style={{ maxWidth: 448, minHeight: "100vh" }}>{children}</div>
  </div>;

  if (!data.profile.onboarded) return shell(<Onboarding data={data} mut={mut} boot={bootInfo} restoreBackup={restoreBackup} importJson={importJson} />);

  if (sessionOpen && active) return shell(
    <SessionScreen data={data} mut={mut} session={active}
      onClose={() => setSessionOpen(false)}
      onFinished={id => { setSessionOpen(false); setSummaryId(id); }} />);

  if (summaryId) {
    const s = data.sessions.find(x => x.id === summaryId);
    if (s) return shell(<SummaryScreen data={data} session={s} onClose={() => setSummaryId(null)} />);
  }

  if (detail?.type === "exercise") return shell(
    <ExerciseDetail data={data} mut={mut} exId={detail.id} onBack={() => setDetail(null)} />);
  if (detail?.type === "session") {
    const s = data.sessions.find(x => x.id === detail.id);
    if (s) return shell(<SummaryScreen data={data} session={s} onClose={() => setDetail(null)} readonly />);
  }

  const tabs = [
    { id: "today", l: "Aujourd’hui", I: Home },
    { id: "cal", l: "Calendrier", I: Calendar },
    { id: "prog", l: "Progression", I: TrendingUp },
    { id: "exos", l: "Exercices", I: Dumbbell },
    { id: "profile", l: "Profil", I: User },
  ];
  const nVerify = data.verify.filter(v => !v.resolved).length;
  const sys = { storageOk, lastSaved, saveNow, restoreBackup, cloud: { st: cloudSt, push: () => cloudPush(dataRef.current), pull: pullNow, test: testNow } };

  return shell(<>
    <div className="overflow-y-auto" style={{ paddingBottom: 96, minHeight: "100vh" }}>
      {!storageOk && <div style={{ background: AMBSOFT, color: AMB, padding: "9px 16px", fontSize: 13 }}>
        {data.cloud?.enabled ? "Stockage local indisponible ici — la synchro Supabase sert de mémoire." : "Sauvegarde automatique indisponible ici — pense à exporter tes données (Profil → Données)."}
      </div>}
      {tab === "today" && <TodayScreen data={data} mut={mut} onStartSession={() => setSessionOpen(true)} goVerify={() => setTab("profile")} goProg={() => setTab("prog")} openEx={id => setDetail({ type: "exercise", id })} />}
      {tab === "cal" && <CalendarScreen data={data} mut={mut} onStartSession={() => setSessionOpen(true)} openSession={id => setDetail({ type: "session", id })} />}
      {tab === "prog" && <ProgressScreen data={data} mut={mut} openEx={id => setDetail({ type: "exercise", id })} />}
      {tab === "exos" && <ExercisesScreen data={data} mut={mut} openEx={id => setDetail({ type: "exercise", id })} />}
      {tab === "profile" && <ProfileScreen data={data} mut={mut} sys={sys} />}
    </div>
    <div className="fixed bottom-0 left-0 right-0" style={{ zIndex: 40 }}>
      <div className="mx-auto flex" style={{ maxWidth: 448, background: "rgba(15,16,18,0.92)", backdropFilter: "blur(14px)", borderTop: `1px solid ${LINE}`, padding: "8px 6px calc(10px + env(safe-area-inset-bottom))" }}>
        {tabs.map(t => {
          const on = tab === t.id;
          return <button key={t.id} onClick={() => { setTab(t.id); setDetail(null); }} className="flex-1 flex flex-col items-center gap-1 active:opacity-60 relative" style={{ padding: "5px 0" }}>
            <t.I size={21} color={on ? ACC : MUT} strokeWidth={on ? 2.4 : 2} />
            <span style={{ fontFamily: FD, fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase", color: on ? TXT : MUT, fontWeight: 600 }}>{t.l}</span>
            {t.id === "profile" && nVerify > 0 && <span className="absolute" style={{ top: 0, right: "26%", width: 8, height: 8, borderRadius: 99, background: AMB }} />}
          </button>;
        })}
      </div>
    </div>
  </>);
}

/* ------------------------------------------------------------------ */
/* ONBOARDING                                                          */
/* ------------------------------------------------------------------ */
function Onboarding({ data, mut, boot, restoreBackup, importJson }) {
  const p = data.profile;
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ age: p.age, sex: p.sex, height: p.height, weight: p.weight, targetWeight: p.targetWeight,
    expYears: p.expYears, breakMonths: p.breakMonths, resumeDate: p.resumeDate,
    sessionsPerWeek: p.sessionsPerWeek, days: [...p.days], maxTime: p.maxTime,
    dipsMax: p.dipsMax, pullupsMax: p.pullupsMax, pains: p.pains, injuries: p.injuries, uncomfortable: p.uncomfortable,
    equipment: [...p.equipment], morpho: { ...p.morpho } });
  const u = (k, v) => setF(x => ({ ...x, [k]: v }));
  const um = (k, v) => setF(x => ({ ...x, morpho: { ...x.morpho, [k]: v } }));
  const finish = () => mut(d => {
    Object.assign(d.profile, f, { onboarded: true });
    if (f.weight) upsertWeight(d, todayISO(), f.weight);
  });
  const EQUIP = ["Machines guidées", "Poulies / câbles", "Haltères", "Barres", "Banc réglable", "Machine dips / tractions assistées", "Rack / Smith machine"];
  const steps = [
    { t: "Ton coach de muscu", body: <>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5 }}>Cette application est construite autour d’un seul objectif : <b style={{ color: TXT }}>te rendre plus fort et plus musclé</b>, surtout sur le haut du corps.</p>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5, marginTop: 12 }}>Tes <b style={{ color: TXT }}>9 séances de juin 2026</b> sont déjà importées (Lat Pull Down, rameur, dips, shoulder press…). 4 notes ambiguës t’attendent dans <b style={{ color: TXT }}>Profil → Données à vérifier</b>.</p>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5, marginTop: 12 }}>Quelques questions rapides pour personnaliser ton programme — tout est facultatif et modifiable plus tard.</p>
      {boot && boot !== "found" && <RestoreBlock boot={boot} restoreBackup={restoreBackup} importJson={importJson} />}
    </> },
    { t: "Mes infos de base", body: <div className="flex flex-col gap-4">
      <div className="flex gap-3"><Field label="Âge"><NIn v={f.age} set={v => u("age", v)} suffix="ans" w={60} /></Field>
        <Field label="Sexe"><Seg small opts={[{ v: "H", l: "Homme" }, { v: "F", l: "Femme" }, { v: "A", l: "Autre" }]} val={f.sex} set={v => u("sex", v)} /></Field></div>
      <div className="flex gap-3 flex-wrap"><Field label="Taille"><NIn v={f.height} set={v => u("height", v)} suffix="cm" w={64} /></Field>
        <Field label="Poids actuel"><NIn v={f.weight} set={v => u("weight", v)} suffix="kg" w={64} /></Field>
        <Field label="Objectif de poids" hint="Facultatif"><NIn v={f.targetWeight} set={v => u("targetWeight", v)} suffix="kg" w={64} /></Field></div>
    </div> },
    { t: "Mon expérience", body: <div className="flex flex-col gap-4">
      <Field label="Expérience en musculation"><NIn v={f.expYears} set={v => u("expYears", v)} suffix="année(s)" w={64} /></Field>
      <Field label="Durée de mon dernier arrêt"><NIn v={f.breakMonths} set={v => u("breakMonths", v)} suffix="mois" w={64} /></Field>
      <Field label="Date de ma reprise actuelle">
        <input type="date" value={f.resumeDate ?? ""} onChange={e => u("resumeDate", e.target.value || null)}
          style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: "10px 13px", colorScheme: "dark", fontSize: 15 }} />
      </Field>
    </div> },
    { t: "Mes disponibilités", body: <div className="flex flex-col gap-4">
      <Field label="Séances par semaine"><Stepper v={f.sessionsPerWeek} set={v => u("sessionsPerWeek", v)} min={2} max={6} big /></Field>
      <Field label="Jours préférés"><div className="flex flex-wrap gap-2">{D2.map((l, i) => <Chip key={i} small on={f.days.includes(i + 1)}
        onClick={() => u("days", f.days.includes(i + 1) ? f.days.filter(x => x !== i + 1) : [...f.days, i + 1].sort())}>{l}</Chip>)}</div></Field>
      <Field label="Temps max par séance"><Stepper v={f.maxTime} set={v => u("maxTime", v)} step={15} min={30} max={150} fmt={x => `${x} min`} big /></Field>
    </div> },
    { t: "Mon niveau actuel", body: <div className="flex flex-col gap-4">
      <Field label="Dips d’affilée aujourd’hui" hint="Ton meilleur set actuel, au poids du corps. Laisse vide si tu ne sais pas."><Stepper v={f.dipsMax} set={v => u("dipsMax", v)} min={0} max={50} big /></Field>
      <Field label="Tractions d’affilée aujourd’hui"><Stepper v={f.pullupsMax} set={v => u("pullupsMax", v)} min={0} max={50} big /></Field>
    </div> },
    { t: "Douleurs & blessures", body: <div className="flex flex-col gap-4">
      <Field label="Douleurs actuelles"><TIn area v={f.pains} set={v => u("pains", v)} ph="Ex. gêne à l’épaule droite en fin d’amplitude…" /></Field>
      <Field label="Anciennes blessures"><TIn area v={f.injuries} set={v => u("injuries", v)} ph="Ex. entorse du poignet en 2023…" /></Field>
      <Field label="Exercices qui me gênent"><TIn area v={f.uncomfortable} set={v => u("uncomfortable", v)} ph="Ex. développé militaire derrière la nuque…" /></Field>
      <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5 }}>Tu pourras aussi marquer n’importe quel exercice « à éviter » depuis ses réglages : le programme proposera alors une alternative.</div>
    </div> },
    { t: "Ma salle", body: <div className="flex flex-col gap-3">
      <Label>Équipements disponibles</Label>
      <div className="flex flex-wrap gap-2">{EQUIP.map(e => <Chip key={e} small on={f.equipment.includes(e)}
        onClick={() => u("equipment", f.equipment.includes(e) ? f.equipment.filter(x => x !== e) : [...f.equipment, e])}>{e}</Chip>)}</div>
      <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>Chaque machine a son propre incrément (45 → 50 kg, ou 45 → 47,5 kg…). Tu peux le régler exercice par exercice dans l’onglet Exercices.</div>
    </div> },
    { t: "Ma morphologie", body: <MorphoForm m={f.morpho} um={um} height={f.height} /> },
    { t: "Prêt", body: <>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5 }}>Ton programme démarre sur <b style={{ color: TXT }}>4 séances haut du corps</b> par semaine : Push force, Pull force, Push hypertrophie, Pull hypertrophie — adaptées à tes jours, ta récupération et tes performances.</p>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5, marginTop: 12 }}>Tes données de juin datent d’environ 2 mois : ta <b style={{ color: TXT }}>première séance sera une séance de reprise</b>, ~1 cran sous tes anciennes charges, pour recalibrer ton niveau réel.</p>
    </> },
  ];
  const last = step === steps.length - 1;
  return <div className="flex flex-col min-h-screen" style={{ padding: "26px 20px 24px" }}>
    <div className="flex gap-1.5 mb-8">{steps.map((_, i) => <div key={i} className="flex-1" style={{ height: 3, borderRadius: 99, background: i <= step ? ACC : SURF2 }} />)}</div>
    <Label style={{ color: ACC }}>{step === 0 ? "Bienvenue" : `Étape ${step} / ${steps.length - 1}`}</Label>
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 34, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.05, margin: "6px 0 20px" }}>{steps[step].t}</h1>
    <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 12 }}>{steps[step].body}</div>
    <div className="flex gap-3 mt-5">
      {step > 0 && <Btn kind="ghost" onClick={() => setStep(step - 1)} style={{ flex: 0.6 }}><ChevronLeft size={18} /></Btn>}
      {!last && step > 0 && <Btn kind="subtle" onClick={() => setStep(step + 1)} style={{ flex: 1 }}>Passer</Btn>}
      <Btn onClick={() => last ? finish() : setStep(step + 1)} style={{ flex: 2 }}>{last ? "Créer mon programme" : step === 0 ? "C’est parti" : "Continuer"}</Btn>
    </div>
  </div>;
}
function MorphoForm({ m, um, height }) {
  const [hint, setHint] = useState(false);
  return <div className="flex flex-col gap-4">
    <div style={{ color: SUB, fontSize: 14, lineHeight: 1.55 }}>Pas de catégories « ectomorphe / mésomorphe » ici : uniquement des mesures concrètes, utilisées pour choisir prises, amplitudes et variantes qui te vont. Tout est facultatif.</div>
    <button onClick={() => setHint(!hint)} className="flex items-center gap-2 active:opacity-60" style={{ color: ACC, fontFamily: FD, fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
      <Info size={15} /> Comment mesurer ? {hint ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
    </button>
    {hint && <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 14, padding: 13, color: SUB, fontSize: 13.5, lineHeight: 1.6 }}>
      Envergure : bras en croix, d’un bout de majeur à l’autre. Tour de bras : bras fléchi et contracté, au point le plus large. Tour de poitrine : mètre sous les aisselles, respiration normale. Tour de taille : au niveau du nombril, relâché. Largeur d’épaules : d’un deltoïde externe à l’autre.
    </div>}
    <div className="flex gap-3 flex-wrap">
      <Field label="Envergure" hint={height && m.wingspan ? (m.wingspan - height >= 5 ? "Bras plutôt longs par rapport à ta taille." : m.wingspan - height <= -3 ? "Bras plutôt courts par rapport à ta taille." : "Proportions standard.") : null}>
        <NIn v={m.wingspan} set={v => um("wingspan", v)} suffix="cm" w={64} /></Field>
      <Field label="Largeur d’épaules"><NIn v={m.shoulders} set={v => um("shoulders", v)} suffix="cm" w={64} /></Field>
    </div>
    <Field label="Mes bras me semblent"><Seg small opts={[{ v: "longs", l: "Longs" }, { v: "moyens", l: "Moyens" }, { v: "courts", l: "Courts" }]} val={m.arms} set={v => um("arms", v)} /></Field>
    <Field label="Mon torse me semble"><Seg small opts={[{ v: "long", l: "Long" }, { v: "moyen", l: "Moyen" }, { v: "court", l: "Court" }]} val={m.torso} set={v => um("torso", v)} /></Field>
    <div className="flex gap-3 flex-wrap">
      <Field label="Tour de bras"><NIn v={m.armGirth} set={v => um("armGirth", v)} suffix="cm" w={58} /></Field>
      <Field label="Tour de poitrine"><NIn v={m.chestGirth} set={v => um("chestGirth", v)} suffix="cm" w={58} /></Field>
      <Field label="Tour de taille"><NIn v={m.waistGirth} set={v => um("waistGirth", v)} suffix="cm" w={58} /></Field>
    </div>
    <Field label="Mobilité des épaules"><Seg small opts={[{ v: "bonne", l: "Bonne" }, { v: "moyenne", l: "Moyenne" }, { v: "limitee", l: "Limitée" }]} val={m.shoulderMob} set={v => um("shoulderMob", v)} /></Field>
    <Field label="Amplitude confortable" hint="Ex. « je descends bas aux dips sans gêne », ou l’inverse.">
      <TIn area v={m.rom} set={v => um("rom", v)} ph="Notes libres sur ton amplitude…" /></Field>
  </div>;
}

function RestoreBlock({ boot, restoreBackup, importJson }) {
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState("");
  const [msg, setMsg] = useState(null);
  return <div style={{ marginTop: 16, background: AMBSOFT, border: "1px solid rgba(227,169,62,0.3)", borderRadius: 14, padding: "12px 13px" }}>
    <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase", color: AMB }}>Tu avais déjà rempli tes infos ?</div>
    <div style={{ color: SUB, fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>
      {boot === "nostore"
        ? "Le stockage n’est pas disponible dans cet environnement : ici, l’app repart de zéro à chaque ouverture. Restaure un export ci-dessous, ou ouvre l’app là où le stockage fonctionne."
        : "Aucune sauvegarde n’a été trouvée dans cet espace. C’est typiquement ce qui arrive après une mise à jour de l’app : la nouvelle version reçoit un espace de stockage vierge. Tente la copie de secours, ou colle un export."}
    </div>
    <div className="flex gap-2 mt-3">
      {boot !== "nostore" && <Btn small kind="ghost" style={{ flex: 1 }} onClick={async () => { setMsg(null); const ok = await restoreBackup(); if (!ok) setMsg("Aucune copie de secours trouvée ici non plus."); }}>Copie de secours</Btn>}
      <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => setOpen(!open)}>Coller un export</Btn>
    </div>
    {open && <>
      <textarea rows={4} value={txt} onChange={e => setTxt(e.target.value)} placeholder="Colle ici le contenu d’un export JSON…"
        style={{ width: "100%", marginTop: 10, background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: 10, fontSize: 11, color: SUB, fontFamily: "monospace", resize: "vertical" }} />
      <div className="mt-2"><Btn small disabled={!txt.trim()} onClick={() => { const ok = importJson(txt); setMsg(ok ? null : "Export invalide — vérifie que tout le texte a bien été collé."); }}>Restaurer</Btn></div>
    </>}
    {msg && <div style={{ color: RED, fontSize: 12.5, marginTop: 8 }}>{msg}</div>}
  </div>;
}

/* ------------------------------------------------------------------ */
/* SESSION BUILD                                                       */
/* ------------------------------------------------------------------ */
function buildSession(d, tplId, checkin) {
  const tpl = d.program.templates[tplId];
  const rd = readiness(checkin); const tr = readinessTrend(d); const del = deloadActive(d);
  const ctx = { readiness: rd, trend: tr, deload: del };
  const entries = []; let warmDone = 0, recalCount = 0, nEx = 0;
  for (const pe of tpl.ex) {
    let exId = pe.ex, swappedFrom = null;
    if (d.exercises[exId]?.avoid) { const alt = alternativesFor(d, exId)[0]; if (alt) { swappedFrom = exId; exId = alt.id; } }
    const ex = d.exercises[exId]; if (!ex) continue;
    const rec = recommend(d, exId, pe, ctx);
    if (rec.mode === "recal") recalCount++; nEx++;
    const rows = [];
    const loaded = ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free";
    if (loaded && rec.load != null && rec.load >= 25 && pe.rest >= 120 && warmDone < 2) {
      rows.push({ id: uid(), type: "warmup", load: r05(rec.load * 0.5), reps: 8, rir: null, done: false });
      rows.push({ id: uid(), type: "warmup", load: r05(rec.load * 0.75), reps: 4, rir: null, done: false });
      warmDone++;
    }
    for (let i = 0; i < rec.sets; i++) {
      rows.push({ id: uid(), type: rec.amrap ? "amrap" : "normal",
        ...(loaded ? { load: rec.load } : { assist: rec.assist || 0, extra: rec.extra || 0 }),
        reps: rec.pref[i] ?? rec.min, rir: null, done: false });
    }
    entries.push({ exerciseId: exId, swappedFrom, plan: { ...pe }, rec, sets: rows, finished: false, cmp: null });
  }
  const isRecal = recalCount > 0 && recalCount >= Math.ceil(nEx * 0.6);
  let note = null;
  if (rd != null) {
    if (rd < 2.6 && (tr == null || tr < 3.2)) note = "Récupération basse : séance allégée — charges maintenues, mais pas de volume inutile ni de record aujourd’hui.";
    else if (rd < 2.6) note = "Nuit difficile mais tendance correcte : une seule mauvaise nuit ne change pas le plan. Écoute-toi sur les dernières séries.";
    else if (rd < 3.3) note = "Forme moyenne : charges maintenues, volume légèrement ajusté.";
  }
  if (checkin?.pain) note = (note ? note + " " : "") + "Douleur signalée : ne va pas à l’échec dessus, réduis l’amplitude ou remplace l’exercice (bouton « Machine indispo »).";
  if (deloadActive(d)) note = (note ? note + " " : "") + "Mode allégé actif : volume réduit cette semaine.";
  return { id: uid(), date: todayISO(), templateId: tplId, name: tpl.name + (isRecal ? " · REPRISE" : ""), type: tpl.type,
    status: "inprogress", startedAt: Date.now(), checkin: checkin || null, bwToday: nearestBW(d, todayISO()), entries, note, records: [] };
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const g = ctx.createGain(); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 880;
    o.connect(g); o.start(); o.stop(ctx.currentTime + 0.55);
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([160, 90, 160]); } catch (e) {}
}

/* ------------------------------------------------------------------ */
/* TODAY                                                               */
/* ------------------------------------------------------------------ */
function TodayScreen({ data, mut, onStartSession, goVerify, goProg, openEx }) {
  const [checkinFor, setCheckinFor] = useState(null); // tplId
  const t0 = todayISO();
  const active = data.sessions.find(s => s.status === "inprogress");
  const doneToday = data.sessions.find(s => s.status === "done" && s.type !== "historique" && s.date === t0);
  const pm = plannedMap(data);
  const todayTpl = pm[t0] || null;
  const nextDate = Object.keys(pm).sort()[0] || null;
  const nVerify = data.verify.filter(v => !v.resolved).length;
  const real = realDone(data);
  const lastReal = real[real.length - 1];
  const lastAny = [...data.sessions].filter(s => s.status === "done" && !s.verifyDate).sort((a, b) => a.date < b.date ? -1 : 1).pop();
  const isReprise = !real.length;
  const missed = missedDates(data, 10);
  const weekStart = addDays(t0, -((dow(t0)) - 1));
  const doneThisWeek = real.filter(s => s.date >= weekStart).length;
  const tr = readinessTrend(data);
  const suggestDel = deloadSuggested(data);
  const delActive = deloadActive(data);

  const start = tplId => setCheckinFor(tplId);
  const launch = ck => { const tplId = checkinFor; setCheckinFor(null);
    mut(d => { d.sessions.push(buildSession(d, tplId, ck)); }); onStartSession(); };

  const previewTpl = data.program.templates[todayTpl || (nextDate ? pm[nextDate] : "A")] || data.program.templates.A;
  const previews = previewTpl.ex.slice(0, 6).map(pe => {
    const exId = data.exercises[pe.ex]?.avoid ? (alternativesFor(data, pe.ex)[0]?.id || pe.ex) : pe.ex;
    const ex = data.exercises[exId];
    const rec = recommend(data, exId, pe, {});
    let val = "—";
    if (ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free") val = rec.load != null ? `${fk(rec.load)} kg` : "à calibrer";
    else if (ex.kind === "bwAssist") val = rec.assist ? `PDC −${fk(rec.assist)}` : rec.extra ? `PDC +${fk(rec.extra)}` : "PDC";
    else val = "PDC";
    return { name: ex.name, val, recal: rec.mode === "recal" };
  });
  const estMin = Math.min(estMinutes(previewTpl.ex), data.profile.maxTime + 15);

  // recent progression (real sessions only)
  const movers = [];
  for (const ex of Object.values(data.exercises).filter(e => e.key)) {
    const h = exHistory(data, ex.id).filter(en => daysBetween(en.date, t0) <= 30 && data.sessions.find(s => s.id === en.sid)?.type !== "historique");
    if (h.length < 2) continue;
    const score = en => { let m = 0; for (const s of en.main) { const eff = setEff(ex, s, data, en.date) ?? s.load ?? 0; const e = ex.kind === "bw" ? s.reps : EPS(eff, s.reps); if (e > m) m = e; } return m; };
    const a = score(h[h.length - 2]), b = score(h[h.length - 1]);
    if (a > 0) movers.push({ id: ex.id, name: ex.name, d: ((b - a) / a) * 100 });
  }
  movers.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));

  return <div style={{ padding: "22px 18px 8px" }}>
    <Label>{fmtLong(t0)}</Label>
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 36, textTransform: "uppercase", letterSpacing: 0.5, margin: "2px 0 16px" }}>Aujourd’hui</h1>

    {nVerify > 0 && <Card onClick={goVerify} className="active:opacity-70 flex items-center gap-3 mb-3" style={{ background: AMBSOFT, borderColor: "rgba(227,169,62,0.35)", padding: "12px 14px" }}>
      <AlertTriangle size={19} color={AMB} />
      <div className="flex-1" style={{ fontSize: 14.5, color: TXT }}>{nVerify} donnée{nVerify > 1 ? "s" : ""} de ton historique à vérifier</div>
      <ChevronRight size={17} color={AMB} />
    </Card>}

    {suggestDel && <Card className="mb-3" style={{ borderColor: "rgba(227,169,62,0.3)" }}>
      <Label style={{ color: AMB }}>Fatigue accumulée</Label>
      <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.5, margin: "6px 0 10px" }}>Plusieurs exercices stagnent et ta récupération est basse : une semaine allégée (volume −40 %) semble pertinente.</div>
      <div className="flex gap-2">
        <Btn small onClick={() => mut(d => { d.prefs.deloadUntil = addDays(todayISO(), 7); })}>Activer 7 jours</Btn>
        <Btn small kind="subtle" onClick={() => mut(d => { d.prefs.deloadDismissed = todayISO(); })}>Pas maintenant</Btn>
      </div>
    </Card>}
    {delActive && <div className="mb-3" style={{ color: AMB, fontFamily: FD, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Mode allégé actif jusqu’au {fmtDM(data.prefs.deloadUntil)}</div>}

    <Card style={{ padding: 18, borderColor: active || todayTpl ? "rgba(255,92,46,0.35)" : LINE }}>
      {active ? <>
        <Label style={{ color: ACC }}>Séance en cours</Label>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 32, textTransform: "uppercase", margin: "4px 0 2px" }}>{active.name}</div>
        <div style={{ color: SUB, fontSize: 14, marginBottom: 14 }}>{active.entries.reduce((a, e) => a + e.sets.filter(t => t.done).length, 0)} séries validées</div>
        <Btn full onClick={onStartSession}><Play size={18} /> Reprendre la séance</Btn>
      </> : doneToday ? <>
        <Label style={{ color: ACC }}>C’est fait</Label>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 30, textTransform: "uppercase", margin: "4px 0 6px" }}>{doneToday.name}</div>
        <div style={{ color: SUB, fontSize: 14.5, lineHeight: 1.5 }}>Séance du jour terminée — {doneToday.entries.length} exercices, {doneToday.entries.reduce((a, e) => a + e.sets.filter(t => t.type !== "warmup").length, 0)} séries de travail. Récupère bien.</div>
      </> : <>
        <Label style={{ color: todayTpl ? ACC : MUT }}>{todayTpl ? "Séance du jour" : "Repos prévu"}</Label>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 32, textTransform: "uppercase", lineHeight: 1.05, margin: "4px 0 2px" }}>
          {previewTpl.name}{isReprise ? " · Reprise" : ""}</div>
        <div style={{ color: SUB, fontSize: 14, marginBottom: 12 }}>
          {todayTpl ? "" : nextDate ? `Prévue ${fmtLong(nextDate)} · ` : ""}{previewTpl.ex.length} exercices · ≈ {estMin} min</div>
        <div className="flex flex-col mb-4" style={{ gap: 7 }}>
          {previews.map((p, i) => <div key={i} className="flex items-center justify-between" style={{ fontSize: 14.5 }}>
            <span style={{ color: SUB }}>{p.name}</span>
            <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 600, fontSize: 16, color: p.recal ? AMB : TXT }}>{p.val}</span>
          </div>)}
        </div>
        {isReprise && <div style={{ background: SURF2, borderRadius: 12, padding: "10px 12px", color: SUB, fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
          Environ {Math.round(daysBetween(lastAny?.date || "2026-06-13", t0) / 7)} semaines depuis tes dernières séances : charges de reprise ≈ 1 cran sous tes anciennes marques, pour recalibrer ton niveau réel sans te cramer.</div>}
        <Btn full onClick={() => start(todayTpl || (nextDate ? pm[nextDate] : nextTemplateId(data)))}>{todayTpl ? "Commencer la séance" : "Commencer quand même"}</Btn>
      </>}
    </Card>

    {missed.length > 0 && !doneToday && !active && <div style={{ color: MUT, fontSize: 13, margin: "10px 2px 0", lineHeight: 1.5 }}>
      Séance manquée le {fmtDM(missed[0])} — rien n’est cassé : le cycle continue simplement avec la séance ci-dessus.</div>}

    <div className="flex gap-2.5 mt-4">
      <StatTile label="Récupération" value={tr != null ? fk1(tr) + " / 5" : "—"} sub={tr != null ? (tr >= 3.5 ? "bonne tendance" : tr >= 2.8 ? "moyenne" : "basse") : "check-in avant séance"} />
      <StatTile label="Dernière séance" value={lastAny ? fmtDM(lastAny.date) : "—"} sub={lastReal ? lastReal.name.split(" · ")[0] : lastAny ? "historique importé" : ""} />
      <StatTile label="Semaine" value={`${doneThisWeek}/${data.profile.sessionsPerWeek}`} sub="séances" />
    </div>

    <div className="mt-6 mb-2 flex items-center justify-between">
      <Label>Progression récente</Label>
      <button onClick={goProg} className="active:opacity-60" style={{ color: ACC, fontFamily: FD, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Tout voir</button>
    </div>
    {movers.length ? <Card style={{ padding: "6px 16px" }}>
      {movers.slice(0, 3).map(m => <button key={m.id} onClick={() => openEx(m.id)} className="w-full flex items-center justify-between active:opacity-60" style={{ padding: "11px 0", borderBottom: `1px solid ${LINE}` }}>
        <span style={{ fontSize: 15 }}>{m.name}</span>
        <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: m.d > 0.5 ? ACC : m.d < -0.5 ? RED : SUB }}>
          {m.d > 0 ? "+" : ""}{fk1(m.d)} %</span>
      </button>)}
    </Card> : <Card><div style={{ color: MUT, fontSize: 14, lineHeight: 1.55 }}>Ta reprise commence : les comparaisons apparaîtront après tes premières séances. Ton historique de juin sert de référence, pas de niveau imposé.</div></Card>}

    <CheckinSheet open={!!checkinFor} onClose={() => setCheckinFor(null)} onGo={launch} />
  </div>;
}

function CheckinSheet({ open, onClose, onGo }) {
  const [c, setC] = useState({ sleep: 3, energy: 3, soreness: 2, motivation: 3, pain: false, painNote: "" });
  const row = (label, k, invert) => <div className="flex items-center justify-between" style={{ padding: "9px 0" }}>
    <span style={{ fontSize: 15, color: SUB }}>{label}</span>
    <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setC(x => ({ ...x, [k]: n }))}
      className="active:opacity-60 tabular-nums" style={{ width: 36, height: 36, borderRadius: 10, fontFamily: FD, fontWeight: 700, fontSize: 15,
        background: c[k] === n ? (invert ? (n >= 4 ? REDSOFT : ACCSOFT) : ACCSOFT) : SURF2,
        color: c[k] === n ? (invert && n >= 4 ? RED : ACC) : MUT, border: `1px solid ${c[k] === n ? "transparent" : LINE}` }}>{n}</button>)}</div>
  </div>;
  return <Sheet open={open} onClose={onClose} title="Check-in rapide">
    <div style={{ color: MUT, fontSize: 13.5, marginBottom: 6 }}>10 secondes — pour ajuster la séance à ta forme du jour.</div>
    {row("Sommeil", "sleep")}
    {row("Énergie", "energy")}
    {row("Courbatures", "soreness", true)}
    {row("Motivation", "motivation")}
    <div className="flex items-center justify-between" style={{ padding: "9px 0" }}>
      <span style={{ fontSize: 15, color: SUB }}>Douleur inhabituelle</span>
      <div className="flex gap-2">
        <Chip small on={!c.pain} onClick={() => setC(x => ({ ...x, pain: false }))}>Non</Chip>
        <Chip small on={c.pain} color={RED} onClick={() => setC(x => ({ ...x, pain: true }))}>Oui</Chip>
      </div>
    </div>
    {c.pain && <TIn v={c.painNote} set={v => setC(x => ({ ...x, painNote: v }))} ph="Où, et dans quel mouvement ?" />}
    <div className="flex gap-3 mt-5">
      <Btn kind="subtle" style={{ flex: 1 }} onClick={() => onGo(null)}>Ignorer</Btn>
      <Btn style={{ flex: 2 }} onClick={() => onGo(c)}>Commencer</Btn>
    </div>
  </Sheet>;
}

/* ------------------------------------------------------------------ */
/* SESSION SCREEN                                                      */
/* ------------------------------------------------------------------ */
function MiniNum({ v, set, step = 1, w = 46, int, size = 19 }) {
  const chg = n => { const nv = (v || 0) + n; set(int ? Math.max(0, Math.round(nv)) : r05(Math.max(0, nv))); };
  return <div className="flex items-center shrink-0" style={{ background: SURF2, borderRadius: 11, border: `1px solid ${LINE}` }}>
    <button className="active:opacity-50" style={{ padding: "11px 9px" }} onClick={() => chg(-step)}><Minus size={14} color={SUB} /></button>
    <input type="number" inputMode="decimal" value={v ?? ""} placeholder="—"
      onChange={e => set(e.target.value === "" ? null : Number(e.target.value))}
      className="tabular-nums text-center" style={{ width: w, fontFamily: FD, fontWeight: 600, fontSize: size }} />
    <button className="active:opacity-50" style={{ padding: "11px 9px" }} onClick={() => chg(step)}><Plus size={14} color={SUB} /></button>
  </div>;
}
function SetRow({ ex, set: t, onPatch, onValidate, onDelete, onBw }) {
  const loaded = ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free";
  const warm = t.type === "warmup";
  const cycleType = () => { const i = TYPE_ORDER.indexOf(t.type); onPatch({ type: TYPE_ORDER[(i + 1) % TYPE_ORDER.length] }); };
  const cycleRir = () => { onPatch({ rir: t.rir == null ? 0 : t.rir >= 4 ? null : t.rir + 1 }); };
  const bwLabel = t.assist ? `−${fk(t.assist)}` : t.extra ? `+${fk(t.extra)}` : "PDC";
  return <div className="flex items-center gap-2" style={{ padding: "6px 0", opacity: warm && !t.done ? 0.65 : 1 }}>
    <button onClick={cycleType} className="shrink-0 active:opacity-60 flex items-center justify-center"
      style={{ width: 28, height: 28, borderRadius: 99, fontFamily: FD, fontWeight: 700, fontSize: 12.5,
        background: warm ? SURF2 : t.type === "normal" ? SURF2 : ACCSOFT, color: warm ? MUT : t.type === "normal" ? SUB : ACC, border: `1px solid ${LINE}` }}>
      {TYPES[t.type].l}</button>
    {loaded
      ? <MiniNum v={t.load} set={v => onPatch({ load: v })} step={ex.inc || 2.5} w={48} />
      : <button onClick={onBw} className="active:opacity-60 tabular-nums shrink-0" style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 11, padding: "11px 10px", fontFamily: FD, fontWeight: 600, fontSize: 16, minWidth: 62, color: t.assist ? AMB : t.extra ? ACC : TXT }}>
        {ex.kind === "bw" ? "PDC" : bwLabel}</button>}
    <MiniNum v={t.reps} set={v => onPatch({ reps: v })} step={ex.unit === "s" ? 5 : 1} int w={40} />
    <button onClick={cycleRir} className="shrink-0 active:opacity-60" style={{ fontFamily: FD, fontWeight: 600, fontSize: 13, letterSpacing: 0.5, padding: "10px 7px", borderRadius: 10, minWidth: 48, textAlign: "center", background: t.rir != null ? SURF2 : "transparent", color: t.rir != null ? TXT : MUT, border: `1px solid ${t.rir != null ? LINE : "transparent"}` }}>
      {t.rir == null ? "RIR" : t.rir >= 4 ? "RIR 4+" : `RIR ${t.rir}`}</button>
    <div className="flex-1" />
    <button onClick={onValidate} className="shrink-0 active:opacity-70 flex items-center justify-center"
      style={{ width: 46, height: 46, borderRadius: 13, background: t.done ? ACC : SURF2, border: `1px solid ${t.done ? ACC : LINE}` }}>
      <Check size={21} color={t.done ? "#0B0C0E" : MUT} strokeWidth={3} /></button>
    {onDelete && <button onClick={onDelete} className="shrink-0 active:opacity-60 p-1"><X size={15} color={MUT} /></button>}
  </div>;
}

function SessionScreen({ data, mut, session, onClose, onFinished }) {
  const [expanded, setExpanded] = useState(() => {
    const i = session.entries.findIndex(e => !e.finished); return i < 0 ? 0 : i;
  });
  const [timer, setTimer] = useState(null); // {endsAt,total,ended}
  const [swapIdx, setSwapIdx] = useState(null);
  const [bwEdit, setBwEdit] = useState(null); // {ei,si}
  const [bwSheet, setBwSheet] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [, force] = useState(0);
  useEffect(() => { const iv = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => {
    if (!timer || timer.ended) return;
    if (timer.endsAt - Date.now() <= 0) { beep(); setTimer(t => t ? { ...t, ended: true } : t); }
  });
  const s = data.sessions.find(x => x.id === session.id) || session;
  const patchSet = (ei, si, p) => mut(d => { const ss = d.sessions.find(x => x.id === s.id); Object.assign(ss.entries[ei].sets[si], p); });
  const validate = (ei, si) => {
    const t = s.entries[ei].sets[si]; const ex = data.exercises[s.entries[ei].exerciseId];
    if (t.done) { patchSet(ei, si, { done: false }); return; }
    const p = { done: true, variantId: ex.curVar || null };
    if (ex.kind === "bwAssist" || ex.kind === "bw") p.bw = s.bwToday ?? null;
    patchSet(ei, si, p);
    const rest = t.type === "warmup" ? 60 : (s.entries[ei].plan.rest || 90);
    setTimer({ endsAt: Date.now() + rest * 1000, total: rest, ended: false });
  };
  const addSet = ei => mut(d => { const e = d.sessions.find(x => x.id === s.id).entries[ei];
    const last = [...e.sets].reverse().find(t => t.type !== "warmup") || e.sets[e.sets.length - 1];
    e.sets.push({ id: uid(), type: "normal", reps: last?.reps ?? e.plan.min, rir: null, done: false,
      ...(last?.load != null ? { load: last.load } : {}), ...(last?.assist != null ? { assist: last.assist } : {}), ...(last?.extra != null ? { extra: last.extra } : {}) }); });
  const delSet = (ei, si) => mut(d => { d.sessions.find(x => x.id === s.id).entries[ei].sets.splice(si, 1); });
  const finishEx = ei => mut(d => {
    const ss = d.sessions.find(x => x.id === s.id); const e = ss.entries[ei];
    const ex = d.exercises[e.exerciseId];
    const work = e.sets.filter(t => t.done && t.type !== "warmup");
    const main = work.filter(t => t.type === "normal" || t.type === "amrap");
    const prev = exHistory(d, e.exerciseId).filter(en => en.sid !== ss.id).pop() || null;
    e.finished = true;
    e.cmp = main.length ? compareEntry(d, ex, prev, main, ss.date) : null;
  });
  const endSession = () => mut(d => {
    const ss = d.sessions.find(x => x.id === s.id);
    for (const e of ss.entries) { e.sets = e.sets.filter(t => t.done); delete e.rec; }
    ss.entries = ss.entries.filter(e => e.sets.length);
    ss.status = "done";
    ss.duration = Math.max(1, Math.round((Date.now() - ss.startedAt) / 60000));
    for (const e of ss.entries) if (!e.cmp) {
      const ex = d.exercises[e.exerciseId];
      const main = e.sets.filter(t => t.type === "normal" || t.type === "amrap");
      const prev = exHistory(d, e.exerciseId).filter(en => en.sid !== ss.id).pop() || null;
      e.cmp = main.length ? compareEntry(d, ex, prev, main, ss.date) : null;
    }
    ss.records = newRecordsForSession(d, ss);
  });
  const undone = s.entries.reduce((a, e) => a + e.sets.filter(t => !t.done && t.type !== "warmup").length, 0);
  const elapsed = Math.floor((Date.now() - s.startedAt) / 60000);
  const hasBw = s.entries.some(e => ["bw", "bwAssist"].includes(data.exercises[e.exerciseId]?.kind));
  const remain = timer ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)) : 0;

  return <div className="flex flex-col" style={{ minHeight: "100vh" }}>
    <div className="flex items-center gap-3" style={{ padding: "16px 16px 10px", borderBottom: `1px solid ${LINE}`, position: "sticky", top: 0, background: BG, zIndex: 20 }}>
      <button onClick={onClose} className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 11 }}><ChevronLeft size={19} color={SUB} /></button>
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 21, textTransform: "uppercase" }}>{s.name}</div>
        <div className="tabular-nums" style={{ color: MUT, fontSize: 12.5 }}>{elapsed} min · {s.entries.reduce((a, e) => a + e.sets.filter(t => t.done && t.type !== "warmup").length, 0)} séries validées</div>
      </div>
      {hasBw && <button onClick={() => setBwSheet(true)} className="active:opacity-60 flex items-center gap-1.5" style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 11, padding: "8px 11px" }}>
        <Scale size={15} color={SUB} /><span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 600, fontSize: 15 }}>{s.bwToday != null ? fk(s.bwToday) : "—"} kg</span>
      </button>}
    </div>

    <div className="flex-1 overflow-y-auto" style={{ padding: "12px 14px 190px" }}>
      {s.note && <div style={{ background: AMBSOFT, border: `1px solid rgba(227,169,62,0.25)`, borderRadius: 14, padding: "11px 13px", color: TXT, fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>{s.note}</div>}
      {s.entries.map((e, ei) => <SessionExCard key={ei} data={data} entry={e} ei={ei} sid={s.id}
        open={expanded === ei} setOpen={() => setExpanded(expanded === ei ? -1 : ei)}
        patchSet={patchSet} validate={validate} addSet={addSet} delSet={delSet}
        finishEx={() => { finishEx(ei); const nx = s.entries.findIndex((x, i) => i !== ei && !x.finished); if (nx >= 0) setExpanded(nx); }}
        onSwap={() => setSwapIdx(ei)} onBw={(si) => setBwEdit({ ei, si })} />)}
    </div>

    {timer && <div className="fixed left-0 right-0" style={{ bottom: 86, zIndex: 45 }}>
      <div className="mx-auto" style={{ maxWidth: 448, padding: "0 14px" }}>
        <div className="flex items-center gap-3 sheet" style={{ background: timer.ended ? ACC : SURF2, border: `1px solid ${timer.ended ? ACC : LINE}`, borderRadius: 16, padding: "10px 14px" }}>
          <Timer size={19} color={timer.ended ? "#0B0C0E" : ACC} />
          <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 30, color: timer.ended ? "#0B0C0E" : TXT, minWidth: 76 }}>
            {timer.ended ? "GO" : `${Math.floor(remain / 60)}:${pad2(remain % 60)}`}</div>
          <div className="flex-1" />
          {!timer.ended && <>
            <button onClick={() => setTimer(t => ({ ...t, endsAt: t.endsAt + 30000 }))} className="active:opacity-60" style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, padding: "8px 10px" }}>+30 s</button>
            <button onClick={() => setTimer(t => ({ ...t, endsAt: Date.now() + t.total * 1000 }))} className="active:opacity-60 p-2" style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10 }}><RotateCcw size={16} color={SUB} /></button>
          </>}
          <button onClick={() => setTimer(null)} className="active:opacity-60 p-2" style={{ background: timer.ended ? "rgba(0,0,0,0.15)" : SURF, border: `1px solid ${timer.ended ? "transparent" : LINE}`, borderRadius: 10 }}>
            <SkipForward size={16} color={timer.ended ? "#0B0C0E" : SUB} /></button>
        </div>
      </div>
    </div>}

    <div className="fixed bottom-0 left-0 right-0" style={{ zIndex: 44 }}>
      <div className="mx-auto" style={{ maxWidth: 448, background: "rgba(15,16,18,0.94)", backdropFilter: "blur(14px)", borderTop: `1px solid ${LINE}`, padding: "12px 14px calc(14px + env(safe-area-inset-bottom))" }}>
        <Btn full onClick={() => undone > 0 ? setConfirmEnd(true) : (endSession(), onFinished(s.id))}>Terminer la séance</Btn>
      </div>
    </div>

    <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} title="Terminer ?">
      <div style={{ color: SUB, fontSize: 15, lineHeight: 1.55, marginBottom: 16 }}>Il reste {undone} série{undone > 1 ? "s" : ""} non validée{undone > 1 ? "s" : ""}. Elles ne seront pas comptées.</div>
      <div className="flex gap-3">
        <Btn kind="subtle" style={{ flex: 1 }} onClick={() => setConfirmEnd(false)}>Continuer</Btn>
        <Btn style={{ flex: 1.4 }} onClick={() => { setConfirmEnd(false); endSession(); onFinished(s.id); }}>Terminer</Btn>
      </div>
    </Sheet>

    <SwapSheet data={data} mut={mut} sid={s.id} ei={swapIdx} onClose={() => setSwapIdx(null)} />
    <BwSetSheet data={data} s={s} bwEdit={bwEdit} patchSet={patchSet} onClose={() => setBwEdit(null)} />
    <Sheet open={bwSheet} onClose={() => setBwSheet(false)} title="Poids du jour">
      <div style={{ color: MUT, fontSize: 13.5, marginBottom: 12 }}>Utilisé pour analyser dips, tractions et pompes d’aujourd’hui.</div>
      <Stepper big v={s.bwToday} set={v => mut(d => { const ss = d.sessions.find(x => x.id === s.id); ss.bwToday = v; upsertWeight(d, ss.date, v); })} step={0.5} min={30} max={200} fmt={x => `${fk(x)} kg`} />
      <div style={{ marginTop: 16 }}><Btn full small onClick={() => setBwSheet(false)}>OK</Btn></div>
    </Sheet>
  </div>;
}

function SessionExCard({ data, entry: e, ei, sid, open, setOpen, patchSet, validate, addSet, delSet, finishEx, onSwap, onBw }) {
  const ex = data.exercises[e.exerciseId];
  const doneN = e.sets.filter(t => t.done && t.type !== "warmup").length;
  const totN = e.sets.filter(t => t.type !== "warmup").length;
  const rec = e.rec || {};
  const lastEn = exHistory(data, e.exerciseId).filter(en => en.sid !== sid).pop();
  const tips = morphoTips(data.profile, ex);
  const loaded = ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free";
  const recVal = loaded ? (rec.load != null ? `${fk(rec.load)} kg` : "à toi de calibrer")
    : ex.kind === "bwAssist" ? (rec.assist ? `PDC −${fk(rec.assist)} kg` : rec.extra ? `PDC +${fk(rec.extra)} kg` : "Poids du corps")
    : "Poids du corps";
  const warmups = e.sets.map((t, si) => ({ t, si })).filter(x => x.t.type === "warmup");
  const works = e.sets.map((t, si) => ({ t, si })).filter(x => x.t.type !== "warmup");
  return <Card className="mb-3" style={{ padding: 0, overflow: "hidden", borderColor: open ? "rgba(255,92,46,0.3)" : LINE }}>
    <button onClick={setOpen} className="w-full flex items-center gap-3" style={{ padding: "14px 15px" }}>
      <div className="flex-1 min-w-0 text-left">
        <div className="truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 20, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {ex.name}{ex.curVar ? <span style={{ color: MUT, fontSize: 14 }}> · {ex.variants.find(v => v.id === ex.curVar)?.name}</span> : null}</div>
        {e.swappedFrom && <div style={{ color: AMB, fontSize: 12.5 }}>remplace {data.exercises[e.swappedFrom]?.name}</div>}
      </div>
      {e.finished && e.cmp ? <Verdict v={e.cmp.v} /> :
        <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: doneN ? ACC : MUT }}>{doneN}/{totN}</span>}
      {open ? <ChevronUp size={17} color={MUT} /> : <ChevronDown size={17} color={MUT} />}
    </button>
    {open && <div style={{ padding: "0 15px 15px" }}>
      <div style={{ borderLeft: `3px solid ${rec.mode === "recal" || rec.mode === "down" ? AMB : ACC}`, paddingLeft: 12, marginBottom: 10 }}>
        <Label style={{ fontSize: 10.5 }}>{rec.mode === "recal" ? "Reprise · recommandé aujourd’hui" : rec.mode === "down" ? "Ajustement · recommandé aujourd’hui" : "Recommandé aujourd’hui"}</Label>
        <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 34, lineHeight: 1.05, margin: "2px 0" }}>{recVal}</div>
        <div style={{ color: SUB, fontSize: 13.5, lineHeight: 1.5 }}>{rec.phrase}</div>
        {rec.note && <div style={{ color: AMB, fontSize: 13, marginTop: 4 }}>{rec.note}</div>}
      </div>
      <div style={{ color: MUT, fontSize: 13, marginBottom: 4 }}>
        Objectif : <b style={{ color: TXT }}>{rec.sets ?? e.plan.sets} × {e.plan.min}-{e.plan.max}{rec.amrap ? " (AMRAP)" : ""}</b>
        {rec.targetTotal ? <> · viser ≥ <b style={{ color: TXT }}>{rec.targetTotal} reps totales</b></> : null}</div>
      {lastEn && <div style={{ color: MUT, fontSize: 13, marginBottom: 8 }}>Dernière ({fmtDM(lastEn.date)}) : {condensedSets(ex, lastEn.sets)}</div>}
      {tips.map((t, i) => <div key={i} style={{ color: SUB, fontSize: 12.5, background: SURF2, borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>{t}</div>)}
      {warmups.length > 0 && <>
        <Label style={{ fontSize: 10.5, marginTop: 4 }}>Échauffement (hors stats)</Label>
        {warmups.map(({ t, si }) => <SetRow key={t.id} ex={ex} set={t}
          onPatch={p => patchSet(ei, si, p)} onValidate={() => validate(ei, si)} onDelete={() => delSet(ei, si)} onBw={() => onBw(si)} />)}
        <Label style={{ fontSize: 10.5, marginTop: 6 }}>Séries de travail</Label>
      </>}
      {works.map(({ t, si }, k) => <SetRow key={t.id} ex={ex} set={t}
        onPatch={p => patchSet(ei, si, p)} onValidate={() => validate(ei, si)}
        onDelete={works.length > 1 ? () => delSet(ei, si) : null} onBw={() => onBw(si)} />)}
      <div className="flex gap-2 mt-2">
        <Btn small kind="subtle" onClick={() => addSet(ei)} style={{ flex: 1 }}><Plus size={15} /> Série</Btn>
        <Btn small kind="ghost" onClick={onSwap} style={{ flex: 1.3 }}><ArrowLeftRight size={15} /> Machine indispo</Btn>
        <Btn small onClick={finishEx} style={{ flex: 1.3 }} disabled={!doneN}>Terminer</Btn>
      </div>
      {e.finished && e.cmp && <div style={{ color: SUB, fontSize: 13.5, marginTop: 10, lineHeight: 1.5 }}>{e.cmp.phrase}</div>}
    </div>}
  </Card>;
}

function SwapSheet({ data, mut, sid, ei, onClose }) {
  const s = data.sessions.find(x => x.id === sid);
  const e = ei != null ? s?.entries[ei] : null;
  if (!e) return null;
  const alts = alternativesFor(data, e.exerciseId);
  const pick = alt => { mut(d => {
    const ss = d.sessions.find(x => x.id === sid); const en = ss.entries[ei];
    const doneSets = en.sets.filter(t => t.done);
    const rec = recommend(d, alt.id, { ...en.plan, ex: alt.id }, {});
    const loaded = alt.kind === "machine" || alt.kind === "cable" || alt.kind === "free";
    const fresh = { exerciseId: alt.id, swappedFrom: en.swappedFrom || en.exerciseId, plan: { ...en.plan, ex: alt.id }, rec, finished: false, cmp: null,
      sets: Array.from({ length: rec.sets }, (_, i) => ({ id: uid(), type: rec.amrap ? "amrap" : "normal", reps: rec.pref[i] ?? rec.min, rir: null, done: false,
        ...(loaded ? { load: rec.load } : { assist: rec.assist || 0, extra: rec.extra || 0 }) })) };
    if (doneSets.length) { en.sets = doneSets; en.finished = true; ss.entries.splice(ei + 1, 0, fresh); }
    else ss.entries[ei] = fresh;
  }); onClose(); };
  return <Sheet open onClose={onClose} title="Remplacer l’exercice">
    <div style={{ color: MUT, fontSize: 13.5, marginBottom: 12 }}>Même mouvement ou même groupe musculaire que {data.exercises[e.exerciseId].name} :</div>
    <div className="flex flex-col gap-2">
      {alts.map(a => { const last = exHistory(data, a.id).pop();
        return <button key={a.id} onClick={() => pick(a)} className="flex items-center justify-between active:opacity-60" style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 13, padding: "13px 14px" }}>
          <div className="text-left">
            <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 17 }}>{a.name}{a.fav && <Star size={13} color={ACC} fill={ACC} style={{ display: "inline", marginLeft: 6, verticalAlign: -1 }} />}</div>
            <div style={{ color: MUT, fontSize: 12.5 }}>{last ? `Dernière : ${condensedSets(a, last.sets)}` : "jamais fait — je calibrerai"}</div>
          </div>
          <ChevronRight size={16} color={MUT} /></button>; })}
    </div>
  </Sheet>;
}
function BwSetSheet({ data, s, bwEdit, patchSet, onClose }) {
  if (!bwEdit) return null;
  const e = s.entries[bwEdit.ei]; const t = e?.sets[bwEdit.si];
  if (!t) return null;
  const ex = data.exercises[e.exerciseId];
  const mode = t.assist ? "assist" : t.extra ? "extra" : "pdc";
  return <Sheet open onClose={onClose} title={ex.name + " — série"}>
    {ex.kind === "bwAssist" ? <>
      <Seg opts={[{ v: "pdc", l: "Poids du corps" }, { v: "assist", l: "Assisté" }, { v: "extra", l: "Lesté" }]} val={mode}
        set={v => patchSet(bwEdit.ei, bwEdit.si, v === "pdc" ? { assist: 0, extra: 0 } : v === "assist" ? { assist: t.assist || 15, extra: 0 } : { assist: 0, extra: t.extra || 2.5 })} />
      {mode === "assist" && <div className="mt-4"><Field label="Assistance"><Stepper big v={t.assist} set={v => patchSet(bwEdit.ei, bwEdit.si, { assist: v })} step={ex.inc || 5} min={0} max={80} fmt={x => `−${fk(x)} kg`} /></Field>
        <div style={{ color: MUT, fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>Ton poids ({s.bwToday != null ? fk(s.bwToday) : "?"} kg) et l’assistance sont conservés séparément — moins d’assistance = progression.</div></div>}
      {mode === "extra" && <div className="mt-4"><Field label="Lest ajouté"><Stepper big v={t.extra} set={v => patchSet(bwEdit.ei, bwEdit.si, { extra: v })} step={2.5} min={0} max={80} fmt={x => `+${fk(x)} kg`} /></Field></div>}
    </> : <div style={{ color: SUB, fontSize: 14.5 }}>Exercice au poids du corps : renseigne simplement tes répétitions{ex.unit === "s" ? " (en secondes)" : ""}.</div>}
    <div className="mt-5"><Btn full small onClick={onClose}>OK</Btn></div>
  </Sheet>;
}

/* ------------------------------------------------------------------ */
/* SUMMARY                                                             */
/* ------------------------------------------------------------------ */
function SummaryScreen({ data, session: s, onClose, readonly }) {
  const workSets = s.entries.reduce((a, e) => a + e.sets.filter(t => t.type !== "warmup" && t.done !== false).length, 0);
  return <div style={{ padding: "26px 18px 30px", minHeight: "100vh" }} className="flex flex-col">
    <Label style={{ color: ACC }}>{readonly ? fmtDMY(s.date) : "Séance terminée"}</Label>
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 34, textTransform: "uppercase", lineHeight: 1.05, margin: "4px 0 18px" }}>{s.name}</h1>
    <div className="flex gap-2.5 mb-4">
      <StatTile label="Durée" value={s.duration ? fmtDur(s.duration) : "—"} />
      <StatTile label="Exercices" value={s.entries.length} />
      <StatTile label="Séries" value={workSets} />
      <StatTile label="Records" value={(s.records || []).length} accent={(s.records || []).length > 0} />
    </div>
    {(s.records || []).length > 0 && <Card className="mb-3" style={{ borderColor: "rgba(255,92,46,0.35)" }}>
      <div className="flex items-center gap-2 mb-2"><Trophy size={17} color={ACC} /><Label style={{ color: ACC }}>Records battus</Label></div>
      {(s.records || []).map((r, i) => <div key={i} style={{ fontSize: 14.5, padding: "5px 0", lineHeight: 1.45 }}>{r}</div>)}
    </Card>}
    <Card style={{ padding: "6px 16px" }}>
      {s.entries.map((e, i) => { const ex = data.exercises[e.exerciseId]; if (!ex) return null;
        return <div key={i} style={{ padding: "12px 0", borderBottom: i < s.entries.length - 1 ? `1px solid ${LINE}` : "none" }}>
          <div className="flex items-center justify-between gap-2">
            <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 17 }}>{ex.name}</span>
            {e.cmp && <Verdict v={e.cmp.v} />}
          </div>
          <div style={{ color: SUB, fontSize: 13, marginTop: 3 }}>{condensedSets(ex, e.sets)}</div>
          {e.cmp && <div style={{ color: MUT, fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{e.cmp.phrase}</div>}
        </div>; })}
    </Card>
    {s.checkin && <div style={{ color: MUT, fontSize: 13, margin: "12px 4px 0" }}>Forme du jour : {fk1(readiness(s.checkin))} / 5{s.checkin.pain ? " · douleur signalée" : ""}</div>}
    <div className="flex-1" />
    <div className="mt-6"><Btn full onClick={onClose}>{readonly ? "Fermer" : "Retour à l’accueil"}</Btn></div>
  </div>;
}

/* ------------------------------------------------------------------ */
/* CALENDAR                                                            */
/* ------------------------------------------------------------------ */
function CalendarScreen({ data, mut, onStartSession, openSession }) {
  const [view, setView] = useState("month");
  const [mOff, setMOff] = useState(0);
  const [wOff, setWOff] = useState(0);
  const [daySel, setDaySel] = useState(null);
  const t0 = todayISO();
  const pm = plannedMap(data, 70);
  const missed = new Set(missedDates(data, 30));
  const doneBy = {};
  for (const s of data.sessions) if (s.status === "done" && !s.verifyDate) (doneBy[s.date] = doneBy[s.date] || []).push(s);

  const now = new Date(); const ref = new Date(now.getFullYear(), now.getMonth() + mOff, 1);
  const y = ref.getFullYear(), m = ref.getMonth();
  const nDays = new Date(y, m + 1, 0).getDate();
  const off = (new Date(y, m, 1).getDay() || 7) - 1;
  const cells = [...Array(off).fill(null), ...Array.from({ length: nDays }, (_, i) => iso(new Date(y, m, i + 1)))];

  const weekStart = addDays(addDays(t0, -(dow(t0) - 1)), wOff * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dot = dte => {
    const done = doneBy[dte];
    if (done) return { bg: done.some(s => s.type === "historique") && !done.some(s => s.type !== "historique") ? SUB : ACC, fill: true };
    if (missed.has(dte)) return { bg: RED, fill: true, dim: true };
    if (pm[dte]) return { bg: ACC, fill: false };
    return null;
  };

  return <div style={{ padding: "22px 18px 8px" }}>
    <div className="flex items-center justify-between mb-3">
      <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 32, textTransform: "uppercase" }}>Calendrier</h1>
      <Seg small opts={[{ v: "week", l: "Semaine" }, { v: "month", l: "Mois" }]} val={view} set={setView} />
    </div>

    {view === "month" ? <>
      <div className="flex items-center justify-between mb-3">
        <button className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 10 }} onClick={() => setMOff(mOff - 1)}><ChevronLeft size={17} color={SUB} /></button>
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 19, textTransform: "capitalize" }}>{MONTHS_FR[m]} {y}</div>
        <button className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 10 }} onClick={() => setMOff(mOff + 1)}><ChevronRight size={17} color={SUB} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">{D2.map(d => <div key={d} className="text-center" style={{ color: MUT, fontFamily: FD, fontSize: 12, letterSpacing: 1 }}>{d}</div>)}</div>
      <div className="grid grid-cols-7" style={{ gap: 4 }}>
        {cells.map((dte, i) => {
          if (!dte) return <div key={i} />;
          const d = dot(dte); const isT = dte === t0;
          return <button key={i} onClick={() => setDaySel(dte)} className="active:opacity-60 flex flex-col items-center justify-center"
            style={{ height: 48, borderRadius: 12, background: isT ? SURF2 : "transparent", border: `1px solid ${isT ? "rgba(255,92,46,0.4)" : "transparent"}` }}>
            <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: dte > t0 ? SUB : TXT }}>{Number(dte.slice(8))}</span>
            <span style={{ width: 7, height: 7, borderRadius: 99, marginTop: 3, opacity: d?.dim ? 0.7 : 1,
              background: d ? (d.fill ? d.bg : "transparent") : "transparent", border: d && !d.fill ? `1.5px solid ${d.bg}` : "none" }} />
          </button>; })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4" style={{ color: MUT, fontSize: 12 }}>
        <span className="flex items-center gap-1.5"><span style={{ width: 7, height: 7, borderRadius: 99, background: ACC }} />Faite</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 7, height: 7, borderRadius: 99, border: `1.5px solid ${ACC}` }} />Prévue</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 7, height: 7, borderRadius: 99, background: RED, opacity: 0.7 }} />Manquée</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 7, height: 7, borderRadius: 99, background: SUB }} />Historique</span>
      </div>
    </> : <>
      <div className="flex items-center justify-between mb-3">
        <button className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 10 }} onClick={() => setWOff(wOff - 1)}><ChevronLeft size={17} color={SUB} /></button>
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 17 }}>{fmtDM(weekDays[0])} → {fmtDM(weekDays[6])}</div>
        <button className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 10 }} onClick={() => setWOff(wOff + 1)}><ChevronRight size={17} color={SUB} /></button>
      </div>
      <div className="flex flex-col gap-2">
        {weekDays.map(dte => {
          const done = doneBy[dte]; const plan = pm[dte]; const isT = dte === t0;
          return <button key={dte} onClick={() => setDaySel(dte)} className="active:opacity-60 flex items-center gap-3 text-left"
            style={{ background: SURF, border: `1px solid ${isT ? "rgba(255,92,46,0.4)" : LINE}`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ width: 46 }}>
              <div style={{ fontFamily: FD, fontSize: 12, color: MUT, textTransform: "uppercase" }}>{D2[dow(dte) - 1]}</div>
              <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 21 }}>{Number(dte.slice(8))}</div>
            </div>
            <div className="flex-1 min-w-0">
              {done ? done.map((s, i) => <div key={i} className="truncate" style={{ fontFamily: FD, fontWeight: 600, fontSize: 15.5, color: ACC }}>{s.name}</div>)
                : plan ? <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15.5, color: SUB }}>{data.program.templates[plan]?.name}</div>
                : missed.has(dte) ? <div style={{ fontSize: 14, color: RED, opacity: 0.85 }}>Manquée — le cycle continue</div>
                : <div style={{ fontSize: 14, color: MUT }}>Repos</div>}
            </div>
            <ChevronRight size={15} color={MUT} />
          </button>; })}
      </div>
    </>}

    <DaySheet data={data} mut={mut} dte={daySel} onClose={() => setDaySel(null)} pm={pm} doneBy={doneBy} missed={missed} onStartSession={onStartSession} openSession={openSession} />
  </div>;
}

function DaySheet({ data, mut, dte, onClose, pm, doneBy, missed, onStartSession, openSession }) {
  const [moving, setMoving] = useState(false);
  const [newDate, setNewDate] = useState("");
  useEffect(() => { setMoving(false); setNewDate(""); }, [dte]);
  if (!dte) return null;
  const t0 = todayISO();
  const done = doneBy[dte] || [];
  const plan = pm[dte];
  const restOv = data.program.overrides[dte] === "rest";
  const hasActive = data.sessions.some(s => s.status === "inprogress");
  const startNow = tplId => { mut(d => { d.sessions.push(buildSession(d, tplId, null)); }); onClose(); onStartSession(); };
  return <Sheet open onClose={onClose} title={fmtLong(dte)}>
    {done.map((s, i) => <button key={i} onClick={() => { onClose(); openSession(s.id); }} className="w-full flex items-center justify-between active:opacity-60 mb-2"
      style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 13, padding: "13px 14px" }}>
      <div className="text-left">
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 16.5, color: ACC }}>{s.name}</div>
        <div style={{ color: MUT, fontSize: 12.5 }}>{s.entries.length} exercices{s.duration ? ` · ${fmtDur(s.duration)}` : ""}{s.type === "historique" ? " · importée" : ""}</div>
      </div><ChevronRight size={15} color={MUT} /></button>)}
    {!done.length && plan && <>
      <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 22, textTransform: "uppercase", marginBottom: 4 }}>{data.program.templates[plan]?.name}</div>
      <div style={{ color: MUT, fontSize: 13.5, marginBottom: 14 }}>{dte < t0 ? "Cette séance n’a pas été faite — le cycle a simplement continué." : "Séance prévue ce jour-là."}</div>
      {dte >= t0 && !moving && <div className="flex flex-col gap-2">
        {dte === t0 && !hasActive && <Btn onClick={() => startNow(plan)}><Play size={17} /> Commencer maintenant</Btn>}
        {dte === t0 && hasActive && <div style={{ color: MUT, fontSize: 13 }}>Une séance est déjà en cours — reprends-la depuis l’onglet Aujourd’hui.</div>}
        <div className="flex gap-2">
          <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => setMoving(true)}>Déplacer</Btn>
          <Btn small kind="subtle" style={{ flex: 1 }} onClick={() => { mut(d => { d.program.overrides[dte] = "rest"; }); onClose(); }}>Marquer repos</Btn>
        </div>
      </div>}
      {moving && <div className="flex flex-col gap-3">
        <Field label="Nouvelle date"><input type="date" min={t0} value={newDate} onChange={e => setNewDate(e.target.value)}
          style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: "10px 13px", colorScheme: "dark", fontSize: 15 }} /></Field>
        <Btn small disabled={!newDate} onClick={() => { mut(d => { d.program.overrides[dte] = "rest"; d.program.overrides[newDate] = plan; }); onClose(); }}>Confirmer le déplacement</Btn>
      </div>}
    </>}
    {!done.length && !plan && <>
      <div style={{ color: MUT, fontSize: 14.5, marginBottom: 14 }}>{missed.has(dte) ? "Séance manquée ce jour-là — rien de grave, le programme a continué son cycle." : restOv ? "Jour marqué comme repos." : "Jour de repos."}</div>
      {dte >= t0 && <div className="flex flex-col gap-2">
        {restOv && <Btn small kind="ghost" onClick={() => { mut(d => { delete d.program.overrides[dte]; }); onClose(); }}>Annuler le repos forcé</Btn>}
        <Label>Programmer une séance ici</Label>
        <div className="flex flex-wrap gap-2">{data.program.order.map(k => <Chip key={k} small onClick={() => { mut(d => { d.program.overrides[dte] = k; }); onClose(); }}>{data.program.templates[k].name}</Chip>)}</div>
      </div>}
    </>}
  </Sheet>;
}

/* ------------------------------------------------------------------ */
/* PROGRESS                                                            */
/* ------------------------------------------------------------------ */
function Spark({ pts }) {
  if (pts.length < 2) return null;
  return <div style={{ width: 84, height: 34 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={pts} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={ACC} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
function ProgressScreen({ data, mut, openEx }) {
  const [sub, setSub] = useState("mov");
  return <div style={{ padding: "22px 18px 8px" }}>
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 32, textTransform: "uppercase", marginBottom: 12 }}>Progression</h1>
    <div className="mb-4"><Seg small opts={[{ v: "mov", l: "Mouvements" }, { v: "bilan", l: "Bilan" }, { v: "vol", l: "Volume" }]} val={sub} set={setSub} /></div>
    {sub === "mov" && <MovementsTab data={data} openEx={openEx} />}
    {sub === "bilan" && <BilanTab data={data} mut={mut} />}
    {sub === "vol" && <VolumeTab data={data} />}
  </div>;
}
function MovementsTab({ data, openEx }) {
  const keys = Object.values(data.exercises).filter(e => e.key);
  return <div className="flex flex-col gap-2.5">
    {keys.map(ex => {
      const R = computeRecords(data, ex.id);
      const tb = trendBadge(data, ex.id);
      const pts = seriesFor(data, ex.id, ex.kind === "bwAssist" ? "e1" : "charge", addDays(todayISO(), -180)).slice(-10);
      let head = "—", sub2 = "";
      if (ex.kind === "bwAssist") {
        if (R.maxExtra) { head = `PDC +${fk(R.maxExtra.v)} kg`; sub2 = `${R.maxExtra.reps} reps`; }
        else if (R.bwReps) { head = `${R.bwReps.v} reps`; sub2 = "au poids du corps"; }
        else if (R.minAssist) { head = `−${fk(R.minAssist.v)} kg`; sub2 = `assistance · ${R.minAssist.reps} reps`; }
      } else if (ex.kind === "bw") { if (R.bwReps) { head = `${R.bwReps.v} reps`; sub2 = "record"; } }
      else if (R.best) { head = `${fk(R.best.load)} kg`; sub2 = `× ${R.best.reps} · e1RM ≈ ${fk(R.e1?.v)} kg`; }
      return <button key={ex.id} onClick={() => openEx(ex.id)} className="active:opacity-60 flex items-center gap-3 text-left"
        style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 16, padding: "13px 15px" }}>
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.3 }}>{ex.name}</div>
          <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 22, color: TXT, margin: "1px 0" }}>{head} <span style={{ fontSize: 13, color: MUT, fontWeight: 500 }}>{sub2}</span></div>
          <div style={{ fontFamily: FD, fontSize: 11.5, letterSpacing: 1, color: tb.c }}>{tb.t}</div>
        </div>
        <Spark pts={pts} />
        <ChevronRight size={16} color={MUT} />
      </button>; })}
    <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5, padding: "4px 4px 0" }}>Mouvements clés suivis en priorité. Tous les autres sont dans l’onglet Exercices.</div>
  </div>;
}
function BilanTab({ data, mut }) {
  const t0 = todayISO();
  const ws = addDays(t0, -(dow(t0) - 1));
  const real = realDone(data);
  const wk = real.filter(s => s.date >= ws);
  const lastWk = real.filter(s => s.date >= addDays(ws, -7) && s.date < ws);
  const wkSets = ss => ss.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.filter(t => t.type !== "warmup").length, 0), 0);
  const wkRecs = wk.reduce((a, s) => a + (s.records || []).length, 0);
  // month strength check on key movements
  const deltas = [];
  for (const ex of Object.values(data.exercises).filter(e => e.key)) {
    const h = exHistory(data, ex.id);
    const scoreBest = ens => { let m = 0; for (const en of ens) for (const s of en.main) { const eff = setEff(ex, s, data, en.date) ?? s.load ?? 0; const e = ex.kind === "bw" ? s.reps : EPS(eff, s.reps); if (e > m) m = e; } return m; };
    const recent = h.filter(en => daysBetween(en.date, t0) <= 14);
    const before = h.filter(en => { const g = daysBetween(en.date, t0); return g > 15 && g <= 50; });
    if (!recent.length || !before.length) continue;
    const a = scoreBest(before), b = scoreBest(recent);
    if (a > 0) deltas.push({ name: ex.name, d: ((b - a) / a) * 100 });
  }
  deltas.sort((a, b) => b.d - a.d);
  const wNow = data.weights.length ? data.weights[data.weights.length - 1] : null;
  const w30 = data.weights.filter(w => daysBetween(w.date, t0) >= 25).pop();
  const wPts = data.weights.filter(w => daysBetween(w.date, t0) <= 90).map(w => ({ d: fmtDM(w.date), v: w.w }));
  const [wIn, setWIn] = useState(null);
  const recentRecs = [...real].reverse().flatMap(s => (s.records || []).map(r => ({ r, date: s.date }))).slice(0, 5);
  return <div className="flex flex-col gap-3">
    <Card>
      <Label>Cette semaine</Label>
      <div className="flex gap-2.5 mt-2">
        <StatTile label="Séances" value={`${wk.length}/${data.profile.sessionsPerWeek}`} />
        <StatTile label="Séries" value={wkSets(wk)} sub={lastWk.length ? `vs ${wkSets(lastWk)} sem. passée` : ""} />
        <StatTile label="Records" value={wkRecs} accent={wkRecs > 0} />
      </div>
    </Card>
    <Card>
      <Label>Plus fort qu’il y a un mois ?</Label>
      {deltas.length ? <div className="mt-2">
        {deltas.map((x, i) => <div key={i} className="flex items-center justify-between" style={{ padding: "7px 0", borderBottom: i < deltas.length - 1 ? `1px solid ${LINE}` : "none" }}>
          <span style={{ fontSize: 14.5 }}>{x.name}</span>
          <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: x.d > 0.5 ? ACC : x.d < -0.5 ? RED : SUB }}>{x.d > 0 ? "+" : ""}{fk1(x.d)} %</span>
        </div>)}
        <div style={{ color: MUT, fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>Force estimée (charge × reps) sur les 2 dernières semaines vs le mois précédent.</div>
      </div> : <div style={{ color: MUT, fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>Pas encore assez de données depuis ta reprise — le bilan mensuel se remplira après quelques semaines de séances.</div>}
    </Card>
    <Card>
      <div className="flex items-center justify-between">
        <Label>Poids corporel</Label>
        {data.profile.targetWeight && <span style={{ color: MUT, fontSize: 12.5 }}>objectif {fk(data.profile.targetWeight)} kg</span>}
      </div>
      <div className="flex items-end gap-3 mt-1 mb-1">
        <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 30 }}>{wNow ? `${fk(wNow.w)} kg` : "—"}</div>
        {wNow && w30 && <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: wNow.w > w30.w ? ACC : wNow.w < w30.w ? AMB : SUB, paddingBottom: 4 }}>
          {wNow.w - w30.w > 0 ? "+" : ""}{fk1(wNow.w - w30.w)} kg / 30 j</div>}
      </div>
      {wPts.length >= 2 && <ChartBox pts={wPts} unit="kg" height={130} />}
      <div className="flex items-center gap-2 mt-3">
        <NIn v={wIn} set={setWIn} ph={wNow ? fk(wNow.w) : "72"} suffix="kg" w={58} size={18} />
        <Btn small disabled={wIn == null} onClick={() => { mut(d => upsertWeight(d, t0, wIn)); setWIn(null); }}>Noter aujourd’hui</Btn>
      </div>
      {data.profile.targetWeight && wNow && <div style={{ color: MUT, fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>
        Prise de masse légère : ~0,2 à 0,4 kg par mois suffisent — la performance à l’entraînement reste le vrai indicateur.</div>}
    </Card>
    {recentRecs.length > 0 && <Card>
      <div className="flex items-center gap-2 mb-1"><Trophy size={15} color={ACC} /><Label>Records récents</Label></div>
      {recentRecs.map((x, i) => <div key={i} style={{ fontSize: 14, padding: "5px 0" }}><span style={{ color: MUT, fontSize: 12.5 }}>{fmtDM(x.date)}</span>  {x.r}</div>)}
    </Card>}
  </div>;
}
function VolumeTab({ data }) {
  const t0 = todayISO();
  const ws = addDays(t0, -(dow(t0) - 1));
  const cur = muscleVolume(data, ws);
  const prev = muscleVolume(data, addDays(ws, -7));
  const notes = [];
  for (const k of MKEYS) {
    const [lo, hi] = VTARGETS[k];
    if (cur[k] > 0 && cur[k] < lo * 0.6 && MKEYS.some(o => cur[o] >= lo)) notes.push(`${MUSCLES[k]} un peu délaissé cette semaine (${fk(cur[k])} séries).`);
    if (cur[k] > hi * 1.25) notes.push(`Beaucoup de volume ${MUSCLES[k].toLowerCase()} (${fk(cur[k])} séries) — la qualité des séries compte plus que leur nombre.`);
  }
  return <div className="flex flex-col gap-3">
    <Card>
      <Label>Séries efficaces · semaine en cours</Label>
      <div className="flex flex-col mt-3" style={{ gap: 11 }}>
        {MKEYS.map(k => { const [lo, hi] = VTARGETS[k]; const v = cur[k];
          const st = v === 0 ? { t: "—", c: MUT } : v < lo ? { t: "FAIBLE", c: AMB } : v <= hi ? { t: "OK", c: ACC } : { t: "ÉLEVÉ", c: AMB };
          return <div key={k}>
            <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
              <span style={{ fontSize: 14.5 }}>{MUSCLES[k]}</span>
              <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 15 }}>
                {fk(v)} <span style={{ color: MUT, fontWeight: 500, fontSize: 12 }}>/ {lo}-{hi}</span>  <span style={{ color: st.c, fontSize: 11.5, letterSpacing: 1 }}>{st.t}</span></span>
            </div>
            <Bar pct={(v / hi) * 100} color={st.c === MUT ? SURF2 : st.c} />
          </div>; })}
      </div>
      <div style={{ color: MUT, fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>Les polyarticulaires comptent en fractions : une série de dips = 1 triceps + 1 pectoraux + 0,5 épaules. Semaine passée : {MKEYS.map(k => fk(prev[k])).join(" · ")}.</div>
    </Card>
    {notes.length > 0 && <Card>
      <Label>Équilibre</Label>
      {notes.map((n, i) => <div key={i} style={{ fontSize: 14, color: SUB, lineHeight: 1.5, marginTop: 7 }}>{n}</div>)}
    </Card>}
  </div>;
}

/* ------------------------------------------------------------------ */
/* EXERCISE DETAIL                                                     */
/* ------------------------------------------------------------------ */
function ExerciseDetail({ data, mut, exId, onBack }) {
  const ex = data.exercises[exId];
  const [metric, setMetric] = useState("charge");
  const [period, setPeriod] = useState(180);
  const [settings, setSettings] = useState(false);
  const [edit, setEdit] = useState(null); // sid
  if (!ex) return null;
  const R = computeRecords(data, exId);
  const tb = trendBadge(data, exId);
  const plan = defaultPlanFor(data, exId);
  const rec = recommend(data, exId, plan, {});
  const stag = stagnation(data, exId, plan);
  const from = addDays(todayISO(), -period);
  const pts = seriesFor(data, exId, metric, period === 9999 ? "2000-01-01" : from);
  const hist = [];
  for (const s of [...data.sessions].sort((a, b) => a.date < b.date ? 1 : -1)) {
    for (const e of s.entries) if (e.exerciseId === exId && (e.sets?.length || e.pendingNote)) hist.push({ s, e });
  }
  const loaded = ex.kind === "machine" || ex.kind === "cable" || ex.kind === "free";
  const metrics = loaded ? [{ v: "charge", l: "Charge" }, { v: "reps", l: "Reps" }, { v: "e1", l: "e1RM" }, { v: "vol", l: "Volume" }]
    : ex.kind === "bwAssist" ? [{ v: "charge", l: "Charge eff." }, { v: "reps", l: "Reps" }, { v: "e1", l: "e1RM" }] : [{ v: "charge", l: "Reps" }, { v: "vol", l: "Volume" }];
  const recVal = loaded ? (rec.load != null ? `${fk(rec.load)} kg` : "à calibrer")
    : ex.kind === "bwAssist" ? (rec.assist ? `PDC −${fk(rec.assist)} kg` : rec.extra ? `PDC +${fk(rec.extra)} kg` : "PDC") : "PDC";
  return <div style={{ padding: "18px 16px 30px" }}>
    <div className="flex items-center gap-2.5 mb-4">
      <button onClick={onBack} className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 11 }}><ChevronLeft size={19} color={SUB} /></button>
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 25, textTransform: "uppercase" }}>{ex.name}</div>
        <div style={{ fontFamily: FD, fontSize: 11.5, letterSpacing: 1, color: tb.c }}>{tb.t}{ex.curVar ? ` · ${ex.variants.find(v => v.id === ex.curVar)?.name}` : ""}</div>
      </div>
      <button onClick={() => mut(d => { d.exercises[exId].fav = !ex.fav; })} className="p-2 active:opacity-60"><Star size={20} color={ex.fav ? ACC : MUT} fill={ex.fav ? ACC : "none"} /></button>
      <button onClick={() => setSettings(true)} className="p-2 active:opacity-60"><Settings2 size={20} color={MUT} /></button>
    </div>
    <div className="flex gap-2.5 mb-3">
      {loaded && <><StatTile label="Charge max" value={R.load ? `${fk(R.load.v)}` : "—"} sub={R.load ? `kg · ${fmtDM(R.load.date)}` : ""} accent={!!R.load} />
        <StatTile label="Meilleure série" value={R.best ? `${fk(R.best.load)}×${R.best.reps}` : "—"} />
        <StatTile label="e1RM est." value={R.e1 ? fk(R.e1.v) : "—"} sub="indicatif" /></>}
      {ex.kind === "bwAssist" && <><StatTile label="Max PDC" value={R.bwReps ? `${R.bwReps.v}` : "—"} sub="reps" accent={!!R.bwReps} />
        <StatTile label="Assist. mini" value={R.minAssist ? `−${fk(R.minAssist.v)}` : "—"} sub={R.minAssist ? "kg" : ""} />
        <StatTile label="Lest max" value={R.maxExtra ? `+${fk(R.maxExtra.v)}` : "—"} sub={R.maxExtra ? "kg" : ""} /></>}
      {ex.kind === "bw" && <StatTile label="Record" value={R.bwReps ? `${R.bwReps.v} ${ex.unit === "s" ? "s" : "reps"}` : "—"} accent={!!R.bwReps} />}
    </div>
    <Card className="mb-3" style={{ borderLeft: `3px solid ${rec.mode === "recal" || rec.mode === "down" ? AMB : ACC}` }}>
      <Label style={{ fontSize: 10.5 }}>{rec.mode === "recal" ? "Reprise · prochaine séance" : rec.mode === "down" ? "Ajustement · prochaine séance" : "Prochaine séance"}</Label>
      <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 27, margin: "2px 0" }}>{recVal} <span style={{ fontSize: 15, color: MUT, fontWeight: 500 }}>· {rec.sets} × {plan.min}-{plan.max}</span></div>
      <div style={{ color: SUB, fontSize: 13.5, lineHeight: 1.5 }}>{rec.phrase}</div>
    </Card>
    {stag && <Card className="mb-3" style={{ borderColor: "rgba(227,169,62,0.3)" }}>
      <Label style={{ color: AMB }}>Stagnation détectée</Label>
      <div style={{ color: SUB, fontSize: 13.5, margin: "5px 0 4px", lineHeight: 1.5 }}>Pas de progrès net sur {stag.n} passages depuis le {fmtDM(stag.since)}. Pistes :</div>
      {stag.suggestions.map((x, i) => <div key={i} style={{ fontSize: 13.5, color: TXT, lineHeight: 1.55, padding: "3px 0" }}>— {x}</div>)}
    </Card>}
    <Card className="mb-3">
      <div className="flex flex-wrap gap-2 mb-2">{metrics.map(mm => <Chip key={mm.v} small on={metric === mm.v} onClick={() => setMetric(mm.v)}>{mm.l}</Chip>)}</div>
      <ChartBox pts={pts} unit={metric === "reps" || ex.kind === "bw" ? "" : "kg"} />
      <div className="flex gap-2 mt-2">{[[30, "30 j"], [90, "3 mois"], [180, "6 mois"], [9999, "Tout"]].map(([v, l]) => <Chip key={v} small on={period === v} onClick={() => setPeriod(v)}>{l}</Chip>)}</div>
      {metric === "e1" && <div style={{ color: MUT, fontSize: 12, marginTop: 8 }}>e1RM estimé (formule d’Epley) : indicateur de tendance, comparable uniquement sur cette même machine.</div>}
    </Card>
    {loaded && Object.keys(R.rmap).length > 1 && <Card className="mb-3" style={{ padding: "10px 16px" }}>
      <Label>Records de reps par charge</Label>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">{Object.entries(R.rmap).sort((a, b) => b[0] - a[0]).slice(0, 6).map(([l, o]) =>
        <span key={l} className="tabular-nums" style={{ fontSize: 14 }}><b style={{ fontFamily: FD }}>{fk(Number(l))} kg</b> <span style={{ color: SUB }}>× {o.v}</span></span>)}</div>
    </Card>}
    {(ex.seat || ex.grip || ex.userNote || ex.note) && <Card className="mb-3" style={{ padding: "11px 16px" }}>
      {ex.seat && <div style={{ fontSize: 13.5, color: SUB }}>Réglage siège : <b style={{ color: TXT }}>{ex.seat}</b></div>}
      {ex.grip && <div style={{ fontSize: 13.5, color: SUB }}>Prise : <b style={{ color: TXT }}>{ex.grip}</b></div>}
      {ex.userNote && <div style={{ fontSize: 13.5, color: SUB, lineHeight: 1.5 }}>{ex.userNote}</div>}
      {ex.note && <div style={{ fontSize: 12.5, color: MUT, lineHeight: 1.5, marginTop: 4 }}>{ex.note}</div>}
    </Card>}
    <Label style={{ marginBottom: 8 }}>Historique</Label>
    {!hist.length && <Empty text="Aucune séance enregistrée pour cet exercice." />}
    <div className="flex flex-col gap-2">
      {hist.map(({ s, e }, i) => <div key={i} style={{ background: SURF, border: `1px solid ${s.verifyDate || e.pendingNote ? "rgba(227,169,62,0.3)" : LINE}`, borderRadius: 14, padding: "11px 13px" }}>
        <div className="flex items-center gap-2">
          <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 15 }}>{fmtDMY(s.date)}</span>
          {s.type === "historique" && <span style={{ color: MUT, fontSize: 11.5 }}>importée</span>}
          {(s.verifyDate || e.pendingNote) && <span style={{ color: AMB, fontSize: 11.5, fontFamily: FD, letterSpacing: 0.6 }}>À VÉRIFIER</span>}
          <div className="flex-1" />
          {!e.pendingNote && <button onClick={() => setEdit(s.id)} className="p-1.5 active:opacity-60"><Pencil size={14} color={MUT} /></button>}
        </div>
        <div style={{ color: SUB, fontSize: 13.5, marginTop: 3, lineHeight: 1.5 }}>{e.pendingNote ? `Note d’origine : « ${e.pendingNote} » — à résoudre dans Profil → Données à vérifier.` : condensedSets(ex, e.sets)}</div>
      </div>)}
    </div>
    <ExSettingsSheet data={data} mut={mut} exId={exId} open={settings} onClose={() => setSettings(false)} />
    <EditEntrySheet data={data} mut={mut} exId={exId} sid={edit} onClose={() => setEdit(null)} />
  </div>;
}

function ExSettingsSheet({ data, mut, exId, open, onClose }) {
  const ex = data.exercises[exId];
  const [nv, setNv] = useState("");
  if (!ex) return null;
  const up = p => mut(d => Object.assign(d.exercises[exId], p));
  return <Sheet open={open} onClose={onClose} title="Réglages" tall>
    <div className="flex flex-col gap-4">
      <Field label="Incrément de cette machine" hint={ex.note || "Le plus petit saut de charge possible (ex. 45 → 50 kg = incrément 5)."}>
        <Stepper big v={ex.inc} set={v => up({ inc: v })} step={0.5} min={0.5} max={10} fmt={x => `${fk(x)} kg`} /></Field>
      <Field label="Variantes de machine" hint="Chaque variante garde ses propres records et recommandations — les charges ne sont jamais mélangées.">
        <div className="flex flex-wrap gap-2">
          <Chip small on={!ex.curVar} onClick={() => up({ curVar: null })}>Standard</Chip>
          {ex.variants.map(v => <Chip key={v.id} small on={ex.curVar === v.id} onClick={() => up({ curVar: v.id })}>{v.name}</Chip>)}
        </div>
        <div className="flex gap-2 mt-2">
          <TIn v={nv} set={setNv} ph="Ex. machine B, salle 2…" />
          <Btn small kind="ghost" disabled={!nv.trim()} onClick={() => { const id = uid(); mut(d => { d.exercises[exId].variants.push({ id, name: nv.trim() }); d.exercises[exId].curVar = id; }); setNv(""); }}><Plus size={15} /></Btn>
        </div></Field>
      <div className="flex gap-3">
        <Field label="Réglage siège"><TIn v={ex.seat} set={v => up({ seat: v })} ph="Ex. 4" /></Field>
        <Field label="Prise"><TIn v={ex.grip} set={v => up({ grip: v })} ph="Ex. neutre serrée" /></Field>
      </div>
      <Field label="Mes notes"><TIn area v={ex.userNote} set={v => up({ userNote: v })} ph="Sensations, consignes techniques…" /></Field>
      <div className="flex gap-2">
        <Btn small kind={ex.fav ? "primary" : "ghost"} style={{ flex: 1 }} onClick={() => up({ fav: !ex.fav })}><Star size={15} /> Favori</Btn>
        <Btn small kind={ex.avoid ? "danger" : "ghost"} style={{ flex: 1 }} onClick={() => up({ avoid: !ex.avoid })}>À éviter</Btn>
      </div>
      {ex.avoid && <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5 }}>Cet exercice sera automatiquement remplacé par une alternative dans tes prochaines séances.</div>}
      {ex.custom && <Btn small kind="danger" onClick={() => { mut(d => { delete d.exercises[exId]; for (const t of Object.values(d.program.templates)) t.ex = t.ex.filter(x => x.ex !== exId); }); onClose(); }}><Trash2 size={15} /> Supprimer cet exercice</Btn>}
    </div>
  </Sheet>;
}

function EditEntrySheet({ data, mut, exId, sid, onClose }) {
  const s = data.sessions.find(x => x.id === sid);
  const e = s?.entries.find(x => x.exerciseId === exId);
  if (!s || !e) return null;
  const ex = data.exercises[exId];
  const ei = s.entries.indexOf(e);
  const patch = (si, p) => mut(d => { const en = d.sessions.find(x => x.id === sid).entries[ei]; Object.assign(en.sets[si], p); });
  const shared = s.entries.length > 1;
  return <Sheet open onClose={onClose} title={`${ex.name} — ${fmtDM(s.date)}`} tall>
    <Field label="Date de la séance" hint={shared ? "Attention : cette date s’applique à toute la séance (tous ses exercices)." : null}>
      <input type="date" value={s.date} onChange={ev => ev.target.value && mut(d => { d.sessions.find(x => x.id === sid).date = ev.target.value; })}
        style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: "10px 13px", colorScheme: "dark", fontSize: 15 }} /></Field>
    <div className="mt-4"><Label>Séries</Label></div>
    <div className="flex flex-col mt-1">
      {e.sets.map((t, si) => <div key={t.id || si} className="flex items-center gap-2" style={{ padding: "5px 0" }}>
        <button onClick={() => { const i = TYPE_ORDER.indexOf(t.type || "normal"); patch(si, { type: TYPE_ORDER[(i + 1) % TYPE_ORDER.length] }); }}
          className="shrink-0 active:opacity-60" style={{ width: 27, height: 27, borderRadius: 99, fontFamily: FD, fontWeight: 700, fontSize: 12, background: SURF2, color: (t.type || "normal") === "normal" ? SUB : ACC, border: `1px solid ${LINE}` }}>{TYPES[t.type || "normal"].l}</button>
        {ex.kind === "bwAssist" ? <>
          <MiniNum v={t.bw} set={v => patch(si, { bw: v })} step={0.5} w={46} size={16} />
          <span style={{ color: MUT, fontSize: 12 }}>PDC</span>
          <MiniNum v={t.assist} set={v => patch(si, { assist: v, extra: v ? 0 : t.extra })} step={ex.inc || 5} w={38} size={16} />
          <span style={{ color: MUT, fontSize: 12 }}>−assist</span>
        </> : ex.kind === "bw" ? null : <MiniNum v={t.load} set={v => patch(si, { load: v })} step={ex.inc || 2.5} w={50} size={16} />}
        <MiniNum v={t.reps} set={v => patch(si, { reps: v })} step={1} int w={38} size={16} />
        <div className="flex-1" />
        <button onClick={() => mut(d => { d.sessions.find(x => x.id === sid).entries[ei].sets.splice(si, 1); })} className="p-1.5 active:opacity-60"><X size={15} color={MUT} /></button>
      </div>)}
    </div>
    <div className="flex gap-2 mt-3">
      <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => mut(d => { const en = d.sessions.find(x => x.id === sid).entries[ei];
        const last = en.sets[en.sets.length - 1] || {}; en.sets.push({ id: uid(), type: "normal", reps: last.reps ?? 8, rir: null, load: last.load, bw: last.bw, assist: last.assist, extra: last.extra }); })}><Plus size={15} /> Série</Btn>
      <Btn small kind="danger" style={{ flex: 1.2 }} onClick={() => { mut(d => { const ss = d.sessions.find(x => x.id === sid); ss.entries.splice(ei, 1); if (!ss.entries.length) d.sessions = d.sessions.filter(x => x.id !== sid); }); onClose(); }}><Trash2 size={15} /> Supprimer l’entrée</Btn>
    </div>
    <div className="mt-4"><Btn full small onClick={onClose}>OK</Btn></div>
  </Sheet>;
}

/* ------------------------------------------------------------------ */
/* EXERCISES                                                           */
/* ------------------------------------------------------------------ */
const PATTERNS = { vpull: "Tirage vertical", hpull: "Tirage horizontal", hpush: "Poussée horizontale", vpush: "Poussée verticale", fly: "Écarté", lateral: "Élévation latérale", rear: "Arrière d’épaule", curl: "Curl", tri: "Triceps", dip: "Dips", abs: "Abdos" };
const KINDS = { machine: "Machine", cable: "Poulie", free: "Charge libre", bw: "Poids du corps", bwAssist: "PDC assisté / lesté" };

function ExercisesScreen({ data, mut, openEx }) {
  const [filt, setFilt] = useState("all");
  const [add, setAdd] = useState(false);
  const list = Object.values(data.exercises)
    .filter(ex => filt === "all" || (ex.m && ex.m[filt]))
    .sort((a, b) => (b.fav - a.fav) || (b.key || 0) - (a.key || 0) || a.name.localeCompare(b.name));
  return <div style={{ padding: "22px 18px 8px" }}>
    <div className="flex items-center justify-between mb-3">
      <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 32, textTransform: "uppercase" }}>Exercices</h1>
      <Btn small kind="ghost" onClick={() => setAdd(true)}><Plus size={16} /> Créer</Btn>
    </div>
    <div className="flex gap-2 overflow-x-auto mb-4" style={{ margin: "0 -18px", padding: "0 18px 4px" }}>
      <Chip small on={filt === "all"} onClick={() => setFilt("all")}>Tous</Chip>
      {MKEYS.map(k => <Chip key={k} small on={filt === k} onClick={() => setFilt(k)}>{MUSCLES[k]}</Chip>)}
    </div>
    <div className="flex flex-col gap-2">
      {list.map(ex => { const last = exHistory(data, ex.id).pop();
        return <button key={ex.id} onClick={() => openEx(ex.id)} className="active:opacity-60 flex items-center gap-3 text-left"
          style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 14px", opacity: ex.avoid ? 0.55 : 1 }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate" style={{ fontFamily: FD, fontWeight: 600, fontSize: 17 }}>{ex.name}</span>
              {ex.fav && <Star size={13} color={ACC} fill={ACC} className="shrink-0" />}
              {ex.avoid && <span className="shrink-0" style={{ color: RED, fontSize: 10.5, fontFamily: FD, letterSpacing: 0.8 }}>ÉVITÉ</span>}
            </div>
            <div className="truncate" style={{ color: MUT, fontSize: 12.5 }}>
              {KINDS[ex.kind]}{last ? ` · ${fmtDM(last.date)} : ${condensedSets(ex, last.sets)}` : " · jamais fait"}</div>
          </div>
          <ChevronRight size={15} color={MUT} />
        </button>; })}
    </div>
    <AddExSheet data={data} mut={mut} open={add} onClose={() => setAdd(false)} />
  </div>;
}
function AddExSheet({ data, mut, open, onClose }) {
  const [f, setF] = useState({ name: "", muscle: "dos", pat: "hpull", kind: "machine", inc: 2.5 });
  const u = (k, v) => setF(x => ({ ...x, [k]: v }));
  return <Sheet open={open} onClose={onClose} title="Nouvel exercice" tall>
    <div className="flex flex-col gap-4">
      <Field label="Nom"><TIn v={f.name} set={v => u("name", v)} ph="Ex. Tirage poitrine machine C" /></Field>
      <Field label="Muscle principal"><div className="flex flex-wrap gap-2">{MKEYS.map(k => <Chip key={k} small on={f.muscle === k} onClick={() => u("muscle", k)}>{MUSCLES[k]}</Chip>)}</div></Field>
      <Field label="Type de mouvement"><div className="flex flex-wrap gap-2">{Object.entries(PATTERNS).map(([k, l]) => <Chip key={k} small on={f.pat === k} onClick={() => u("pat", k)}>{l}</Chip>)}</div></Field>
      <Field label="Matériel"><div className="flex flex-wrap gap-2">{Object.entries(KINDS).map(([k, l]) => <Chip key={k} small on={f.kind === k} onClick={() => u("kind", k)}>{l}</Chip>)}</div></Field>
      {f.kind !== "bw" && <Field label="Incrément"><Stepper v={f.inc} set={v => u("inc", v)} step={0.5} min={0.5} max={10} fmt={x => `${fk(x)} kg`} /></Field>}
      <Btn disabled={!f.name.trim()} onClick={() => { const id = "c" + uid();
        mut(d => { d.exercises[id] = { id, name: f.name.trim(), pat: f.pat, m: { [f.muscle]: 1 }, kind: f.kind, inc: f.inc, custom: true,
          iso: ["curl", "tri", "abs", "fly", "lateral", "rear"].includes(f.pat), fav: false, avoid: false, variants: [], curVar: null, seat: "", grip: "", userNote: "" }; });
        setF({ name: "", muscle: "dos", pat: "hpull", kind: "machine", inc: 2.5 }); onClose(); }}>Créer l’exercice</Btn>
    </div>
  </Sheet>;
}

/* ------------------------------------------------------------------ */
/* PROFILE                                                             */
/* ------------------------------------------------------------------ */
function ProfileScreen({ data, mut, sys }) {
  const p = data.profile;
  const [sheet, setSheet] = useState(null); // 'infos' | 'morpho' | 'program' | 'data'
  const pending = data.verify.filter(v => !v.resolved);
  const nut7 = data.nutrition.filter(n => daysBetween(n.date, todayISO()) <= 6);
  const avg = k => nut7.length ? Math.round(nut7.reduce((a, n) => a + (n[k] || 0), 0) / nut7.length) : null;
  const tn = data.nutrition.find(n => n.date === todayISO());
  const [kc, setKc] = useState(null); const [pr, setPr] = useState(null);
  const Row = ({ icon: I, title, sub, onClick, warn }) => <button onClick={onClick} className="w-full flex items-center gap-3 active:opacity-60"
    style={{ background: SURF, border: `1px solid ${warn ? "rgba(227,169,62,0.35)" : LINE}`, borderRadius: 15, padding: "14px 15px" }}>
    <I size={19} color={warn ? AMB : SUB} />
    <div className="flex-1 text-left min-w-0">
      <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 16.5 }}>{title}</div>
      {sub && <div className="truncate" style={{ color: MUT, fontSize: 12.5 }}>{sub}</div>}
    </div>
    <ChevronRight size={16} color={MUT} />
  </button>;
  return <div style={{ padding: "22px 18px 8px" }} className="flex flex-col gap-2.5">
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 32, textTransform: "uppercase", marginBottom: 6 }}>Profil</h1>
    {pending.length > 0 && <VerifyCard data={data} mut={mut} pending={pending} />}
    <Row icon={User} title="Mes infos" sub={`${p.age ?? "—"} ans · ${p.height ?? "—"} cm · ${p.weight != null ? fk(p.weight) : "—"} kg${p.targetWeight ? ` → ${fk(p.targetWeight)} kg` : ""}`} onClick={() => setSheet("infos")} />
    <Row icon={Scale} title="Ma morphologie" sub={p.morpho?.wingspan ? `Envergure ${p.morpho.wingspan} cm · bras ${p.morpho.arms || "?"}` : "Mesures concrètes pour adapter prises et amplitudes"} onClick={() => setSheet("morpho")} />
    <Row icon={Settings2} title="Mon programme" sub={`${data.program.order.map(k => k).join(" → ")} · ${p.sessionsPerWeek} séances/sem · jours ${p.days.map(d => D2[d - 1]).join(", ")}`} onClick={() => setSheet("program")} />
    <Card>
      <Label>Nutrition (facultatif)</Label>
      <div style={{ color: MUT, fontSize: 12.5, margin: "4px 0 10px", lineHeight: 1.5 }}>Prise de masse légère : un léger surplus et ~1,6-2 g de protéines / kg suffisent. La performance reste le vrai juge.</div>
      <div className="flex items-center gap-2 flex-wrap">
        <NIn v={kc ?? tn?.kcal ?? null} set={setKc} ph="kcal" w={58} size={17} suffix="kcal" />
        <NIn v={pr ?? tn?.prot ?? null} set={setPr} ph="prot" w={44} size={17} suffix="g prot" />
        <Btn small kind="ghost" disabled={kc == null && pr == null && !tn} onClick={() => { mut(d => {
          const ex = d.nutrition.find(n => n.date === todayISO());
          const kcal = kc ?? tn?.kcal ?? null, prot = pr ?? tn?.prot ?? null;
          if (ex) { ex.kcal = kcal; ex.prot = prot; } else d.nutrition.push({ id: uid(), date: todayISO(), kcal, prot });
        }); setKc(null); setPr(null); }}>Noter</Btn>
      </div>
      {nut7.length > 0 && <div style={{ color: SUB, fontSize: 13, marginTop: 9 }}>Moyenne 7 j : <b className="tabular-nums" style={{ color: TXT }}>{avg("kcal") ?? "—"} kcal</b> · <b className="tabular-nums" style={{ color: TXT }}>{avg("prot") ?? "—"} g</b> de protéines</div>}
    </Card>
    <Row icon={Download} title="Données" sub="Exporter, importer, réinitialiser" onClick={() => setSheet("data")} />
    <div style={{ color: MUT, fontSize: 12, lineHeight: 1.55, padding: "4px 4px 0" }}>Tout est stocké localement dans cet espace — aucun compte, aucun serveur. Sauvegarde automatique à chaque modification et à la fermeture, avec copie de secours. L’export régulier reste ta ceinture de sécurité.</div>

    <InfosSheet data={data} mut={mut} open={sheet === "infos"} onClose={() => setSheet(null)} />
    <Sheet open={sheet === "morpho"} onClose={() => setSheet(null)} title="Ma morphologie" tall>
      <MorphoForm m={p.morpho || {}} um={(k, v) => mut(d => { d.profile.morpho = { ...d.profile.morpho, [k]: v }; })} height={p.height} />
      <div className="mt-5"><Btn full small onClick={() => setSheet(null)}>OK</Btn></div>
    </Sheet>
    <ProgramSheet data={data} mut={mut} open={sheet === "program"} onClose={() => setSheet(null)} />
    <DataSheet data={data} mut={mut} sys={sys} open={sheet === "data"} onClose={() => setSheet(null)} />
  </div>;
}

function VerifyCard({ data, mut, pending }) {
  const [openId, setOpenId] = useState(null);
  const [manual, setManual] = useState({ sets: 5, reps: 10, load: 23 });
  const resolve = (v, sets, dateYear) => mut(d => {
    const item = d.verify.find(x => x.id === v.id); item.resolved = true;
    const s = d.sessions.find(x => x.id === v.sid);
    if (!s) return;
    if (v.kind === "date") { s.verifyDate = false; s.name = "Séance importée"; if (dateYear === 2026) s.date = "2026-06-13"; }
    else { const e = s.entries.find(x => x.exerciseId === v.exId); if (e) { e.sets = sets; delete e.pendingNote; } }
  });
  return <Card style={{ borderColor: "rgba(227,169,62,0.35)" }}>
    <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} color={AMB} /><Label style={{ color: AMB }}>Données à vérifier · {pending.length}</Label></div>
    <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5, marginBottom: 6 }}>Ces notes de ton carnet sont ambiguës. Elles sont exclues des stats et des recommandations tant qu’elles ne sont pas confirmées.</div>
    {pending.map(v => <div key={v.id} style={{ borderTop: `1px solid ${LINE}`, padding: "11px 0" }}>
      <button onClick={() => setOpenId(openId === v.id ? null : v.id)} className="w-full flex items-center justify-between text-left active:opacity-60">
        <div>
          <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15.5 }}>{v.title}</div>
          {openId !== v.id && <div style={{ color: MUT, fontSize: 12.5, marginTop: 2 }}>Toucher pour résoudre</div>}
        </div>
        {openId === v.id ? <ChevronUp size={15} color={MUT} /> : <ChevronDown size={15} color={MUT} />}
      </button>
      {openId === v.id && <div className="mt-2">
        <div style={{ color: SUB, fontSize: 13.5, lineHeight: 1.5, marginBottom: 10 }}>{v.desc}</div>
        {v.kind === "date" && <div className="flex gap-2">
          <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => resolve(v, null, 2026)}>C’était en 2026</Btn>
          <Btn small kind="subtle" style={{ flex: 1 }} onClick={() => resolve(v, null, 2025)}>C’était bien 2025</Btn>
        </div>}
        {v.kind === "dips15" && <div className="flex flex-col gap-2">
          <Btn small kind="ghost" onClick={() => resolve(v, [mk({ reps: 8 }), mk({ reps: 4, note: "demi-série" })])}>1 × 8 + une demi-série (~4 reps)</Btn>
          <Btn small kind="ghost" onClick={() => resolve(v, [mk({ reps: 8 })])}>Une seule série de 8</Btn>
          <div className="flex items-center gap-2 flex-wrap">
            <MiniNum v={manual.sets} set={x => setManual(m => ({ ...m, sets: x }))} int w={34} size={16} /><span style={{ color: MUT, fontSize: 13 }}>séries ×</span>
            <MiniNum v={manual.reps} set={x => setManual(m => ({ ...m, reps: x }))} int w={34} size={16} /><span style={{ color: MUT, fontSize: 13 }}>reps</span>
            <Btn small onClick={() => resolve(v, rep(manual.sets || 1, { reps: manual.reps || 8 }))}>Valider</Btn>
          </div>
        </div>}
        {v.kind === "lat" && <div className="flex flex-col gap-2">
          <Btn small kind="ghost" onClick={() => resolve(v, [mk({ load: 23, reps: 5 })])}>1 série de 5 reps à 23 kg</Btn>
          <div className="flex items-center gap-2 flex-wrap">
            <MiniNum v={manual.sets} set={x => setManual(m => ({ ...m, sets: x }))} int w={34} size={16} /><span style={{ color: MUT, fontSize: 13 }}>séries ×</span>
            <MiniNum v={manual.reps} set={x => setManual(m => ({ ...m, reps: x }))} int w={34} size={16} /><span style={{ color: MUT, fontSize: 13 }}>reps à</span>
            <MiniNum v={manual.load} set={x => setManual(m => ({ ...m, load: x }))} step={4.5} w={44} size={16} /><span style={{ color: MUT, fontSize: 13 }}>kg</span>
            <Btn small onClick={() => resolve(v, rep(manual.sets || 1, { load: manual.load ?? 23, reps: manual.reps || 10 }))}>Valider</Btn>
          </div>
        </div>}
      </div>}
    </div>)}
  </Card>;
}

function InfosSheet({ data, mut, open, onClose }) {
  const p = data.profile;
  const up = (k, v) => mut(d => { d.profile[k] = v; if (k === "weight" && v != null) upsertWeight(d, todayISO(), v); });
  return <Sheet open={open} onClose={onClose} title="Mes infos" tall>
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 flex-wrap">
        <Field label="Âge"><NIn v={p.age} set={v => up("age", v)} suffix="ans" w={52} /></Field>
        <Field label="Taille"><NIn v={p.height} set={v => up("height", v)} suffix="cm" w={56} /></Field>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Field label="Poids actuel"><NIn v={p.weight} set={v => up("weight", v)} suffix="kg" w={56} /></Field>
        <Field label="Objectif de poids"><NIn v={p.targetWeight} set={v => up("targetWeight", v)} suffix="kg" w={56} /></Field>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Field label="Expérience"><NIn v={p.expYears} set={v => up("expYears", v)} suffix="ans" w={48} /></Field>
        <Field label="Arrêt"><NIn v={p.breakMonths} set={v => up("breakMonths", v)} suffix="mois" w={48} /></Field>
      </div>
      <Field label="Date de reprise"><input type="date" value={p.resumeDate ?? ""} onChange={e => up("resumeDate", e.target.value || null)}
        style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: "10px 13px", colorScheme: "dark", fontSize: 15 }} /></Field>
      <Field label="Douleurs actuelles"><TIn area v={p.pains} set={v => up("pains", v)} ph="—" /></Field>
      <Field label="Blessures passées"><TIn area v={p.injuries} set={v => up("injuries", v)} ph="—" /></Field>
      <Field label="Exercices qui me gênent"><TIn area v={p.uncomfortable} set={v => up("uncomfortable", v)} ph="—" /></Field>
      <div style={{ color: MUT, fontSize: 12, lineHeight: 1.5 }}>Rappel : je ne pose aucun diagnostic. Si une douleur est vive, persistante ou s’aggrave, consulte un professionnel de santé.</div>
      <Btn full small onClick={onClose}>OK</Btn>
    </div>
  </Sheet>;
}

function ProgramSheet({ data, mut, open, onClose }) {
  const [openTpl, setOpenTpl] = useState(null);
  const [picker, setPicker] = useState(null); // tplId
  const p = data.profile;
  const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
  return <Sheet open={open} onClose={onClose} title="Mon programme" tall>
    <Field label="Séances par semaine"><Stepper v={p.sessionsPerWeek} set={v => mut(d => { d.profile.sessionsPerWeek = v; })} min={2} max={6} /></Field>
    <div className="mt-4"><Field label="Jours d’entraînement"><div className="flex flex-wrap gap-2">{D2.map((l, i) => <Chip key={i} small on={p.days.includes(i + 1)}
      onClick={() => mut(d => { const ds = d.profile.days; d.profile.days = ds.includes(i + 1) ? ds.filter(x => x !== i + 1) : [...ds, i + 1].sort(); })}>{l}</Chip>)}</div></Field></div>
    <div className="mt-4 mb-2"><Label>Rotation des séances</Label>
      <div style={{ color: MUT, fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>Le cycle avance à chaque séance faite — une séance manquée ne casse rien, elle décale simplement la suite.</div></div>
    <div className="flex flex-col gap-2">
      {data.program.order.map((k, oi) => { const t = data.program.templates[k]; const isO = openTpl === k;
        return <div key={k} style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 14, padding: "11px 13px" }}>
          <div className="flex items-center gap-2">
            <button className="flex-1 text-left active:opacity-60" onClick={() => setOpenTpl(isO ? null : k)}>
              <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>{k} · {t.name}</div>
              <div style={{ color: MUT, fontSize: 12 }}>{t.ex.length} exercices</div>
            </button>
            <button className="p-1.5 active:opacity-50" onClick={() => mut(d => move(d.program.order, oi, -1))}><ChevronUp size={15} color={MUT} /></button>
            <button className="p-1.5 active:opacity-50" onClick={() => mut(d => move(d.program.order, oi, 1))}><ChevronDown size={15} color={MUT} /></button>
          </div>
          {isO && <div className="mt-2 flex flex-col gap-2.5">
            {t.ex.map((pe, i) => <div key={i} style={{ borderTop: `1px solid ${LINE}`, paddingTop: 9 }}>
              <div className="flex items-center gap-1.5">
                <span className="flex-1 truncate" style={{ fontSize: 14.5, fontWeight: 600 }}>{data.exercises[pe.ex]?.name || pe.ex}</span>
                <button className="p-1 active:opacity-50" onClick={() => mut(d => move(d.program.templates[k].ex, i, -1))}><ChevronUp size={14} color={MUT} /></button>
                <button className="p-1 active:opacity-50" onClick={() => mut(d => move(d.program.templates[k].ex, i, 1))}><ChevronDown size={14} color={MUT} /></button>
                <button className="p-1 active:opacity-50" onClick={() => mut(d => d.program.templates[k].ex.splice(i, 1))}><X size={14} color={MUT} /></button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5" style={{ color: MUT, fontSize: 12 }}>
                <MiniNum v={pe.sets} set={v => mut(d => { d.program.templates[k].ex[i].sets = clamp(v || 1, 1, 8); })} int w={26} size={14} /><span>×</span>
                <MiniNum v={pe.min} set={v => mut(d => { d.program.templates[k].ex[i].min = clamp(v || 1, 1, 30); })} int w={26} size={14} /><span>-</span>
                <MiniNum v={pe.max} set={v => mut(d => { d.program.templates[k].ex[i].max = clamp(v || 1, 1, 30); })} int w={26} size={14} /><span>reps ·</span>
                <MiniNum v={pe.rest} set={v => mut(d => { d.program.templates[k].ex[i].rest = clamp(v || 30, 30, 300); })} int step={15} w={34} size={14} /><span>s repos</span>
              </div>
            </div>)}
            <Btn small kind="ghost" onClick={() => setPicker(k)}><Plus size={15} /> Ajouter un exercice</Btn>
          </div>}
        </div>; })}
    </div>
    <div className="mt-5"><Btn full small onClick={onClose}>OK</Btn></div>
    <Sheet open={!!picker} onClose={() => setPicker(null)} title="Ajouter à la séance" tall>
      <div className="flex flex-col gap-1.5">
        {Object.values(data.exercises).sort((a, b) => a.name.localeCompare(b.name)).map(ex =>
          <button key={ex.id} className="flex items-center justify-between active:opacity-60" style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: "11px 13px" }}
            onClick={() => { mut(d => { d.program.templates[picker].ex.push({ ex: ex.id, sets: 3, min: 8, max: 12, rest: 90 }); }); setPicker(null); }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{ex.name}</span>
            <span style={{ color: MUT, fontSize: 12 }}>{KINDS[ex.kind]}</span>
          </button>)}
      </div>
    </Sheet>
  </Sheet>;
}

function DataSheet({ data, mut, open, onClose, sys }) {
  const [txt, setTxt] = useState("");
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [confirmR, setConfirmR] = useState(false);
  const [confirmPull, setConfirmPull] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [cMsg, setCMsg] = useState(null);
  const c = data.cloud || {};
  const upc = (k, v) => mut(d => { d.cloud = { ...d.cloud, [k]: v }; });
  const fmtT = t => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
  const bad = msg && (msg.startsWith("Import impossible") || msg.startsWith("Aucune"));
  const doExport = () => {
    const json = JSON.stringify(data, null, 1);
    setTxt(json); setMsg("Export prêt ci-dessous — copie-le ou télécharge le fichier.");
    try {
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `coach-muscu-${todayISO()}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {}
  };
  const doImport = () => {
    try {
      const d = JSON.parse(txt);
      if (!d || !d.sessions || !d.profile) throw new Error("format");
      mut(cur => { for (const k of Object.keys(cur)) delete cur[k]; Object.assign(cur, migrate(d)); });
      setMsg("Import réussi — tes données ont été restaurées."); setTxt("");
    } catch (e) { setMsg("Import impossible : le texte collé n’est pas un export valide."); }
  };
  return <Sheet open={open} onClose={onClose} title="Mes données" tall>
    <div className="flex flex-col gap-3">
      <div style={{ background: sys?.storageOk ? SURF2 : AMBSOFT, borderRadius: 12, padding: "10px 12px", fontSize: 13, color: sys?.storageOk ? SUB : AMB, lineHeight: 1.55 }}>
        {sys?.storageOk
          ? <>Mémoire persistante active : chaque modification est enregistrée dans le stockage local de l’app (à la saisie et à la fermeture), avec une copie de secours régulière.{sys.lastSaved ? <> Dernière sauvegarde : <b className="tabular-nums" style={{ color: TXT }}>{fmtT(sys.lastSaved)}</b>.</> : null}</>
          : "Stockage local indisponible ici : tes données ne vivent qu’en mémoire — pense à exporter avant de fermer."}
      </div>
      <div className="flex gap-2">
        <Btn small kind="ghost" style={{ flex: 1 }} onClick={async () => { await sys.saveNow(); setMsg("Sauvegarde forcée effectuée."); }}>Sauvegarder maintenant</Btn>
        {!confirmR
          ? <Btn small kind="subtle" style={{ flex: 1 }} onClick={() => setConfirmR(true)}><RotateCcw size={15} /> Copie de secours</Btn>
          : <Btn small kind="danger" style={{ flex: 1 }} onClick={async () => { setConfirmR(false); const ok = await sys.restoreBackup(); setMsg(ok ? "Copie de secours restaurée." : "Aucune copie de secours trouvée."); }}>Confirmer la restauration</Btn>}
      </div>
      {confirmR && <div style={{ color: AMB, fontSize: 12.5, lineHeight: 1.5 }}>La restauration remplace l’état actuel par la dernière copie de secours (écrite au plus toutes les 2 minutes) : les toutes dernières modifications peuvent être perdues.</div>}
      <div className="flex gap-2">
        <Btn small kind="ghost" style={{ flex: 1 }} onClick={doExport}><Download size={15} /> Exporter</Btn>
        <Btn small kind="ghost" style={{ flex: 1 }} onClick={doImport} disabled={!txt.trim()}><Upload size={15} /> Importer le texte collé</Btn>
      </div>
      <textarea rows={7} value={txt} onChange={e => setTxt(e.target.value)} placeholder="Colle ici un export précédent pour le réimporter…"
        style={{ width: "100%", background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, fontSize: 11.5, color: SUB, fontFamily: "monospace", resize: "vertical" }} />
      {msg && <div style={{ color: bad ? RED : ACC, fontSize: 13.5 }}>{msg}</div>}
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14 }} className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <Label>Cloud personnel · Supabase</Label>
          <Chip small on={!!c.enabled} onClick={() => upc("enabled", !c.enabled)}>{c.enabled ? "Activé" : "Désactivé"}</Chip>
        </div>
        <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.55 }}>
          Facultatif : recopie l’intégralité de tes données dans ta propre base Supabase (offre gratuite), en plus de la mémoire intégrée. À l’intérieur de Claude, le bac à sable de l’artéfact bloque en principe les appels vers des domaines externes — le bouton « Tester » te le dira. Ce réglage devient pleinement utile si tu fais tourner ce fichier en dehors de Claude.
        </div>
        {c.enabled && <>
          <TIn v={c.url} set={v => upc("url", v)} ph="URL du projet — https://xxxx.supabase.co" />
          <TIn v={c.key} set={v => upc("key", v)} ph="Clé « anon » (publique)" />
          <div className="flex gap-2">
            <TIn v={c.room} set={v => upc("room", v)} ph="Identifiant (ex. moi)" />
            <TIn v={c.table} set={v => upc("table", v)} ph="Table (coach_muscu)" />
          </div>
          <div className="flex gap-2">
            <Btn small kind="ghost" style={{ flex: 1 }} onClick={async () => { setCMsg("Test en cours…"); const r = await sys.cloud.test(); setCMsg((r.ok ? "✓ " : "✗ ") + (r.msg || "")); }}>Tester</Btn>
            <Btn small kind="ghost" style={{ flex: 1 }} onClick={async () => { setCMsg("Envoi…"); const ok = await sys.cloud.push(); setCMsg(ok ? "✓ Données envoyées vers Supabase." : "✗ Envoi impossible — voir l’état ci-dessous."); }}>Envoyer</Btn>
            {!confirmPull
              ? <Btn small kind="subtle" style={{ flex: 1 }} onClick={() => setConfirmPull(true)}>Récupérer</Btn>
              : <Btn small kind="danger" style={{ flex: 1 }} onClick={async () => { setConfirmPull(false); setCMsg("Récupération…"); const r = await sys.cloud.pull(); setCMsg(r.ok ? "✓ Données récupérées depuis Supabase." : "✗ " + (r.msg || "récupération impossible")); }}>Confirmer</Btn>}
          </div>
          {confirmPull && <div style={{ color: AMB, fontSize: 12.5, lineHeight: 1.5 }}>La récupération remplace l’état actuel de l’app par la version stockée dans Supabase.</div>}
          {cMsg && <div style={{ color: cMsg.startsWith("✗") ? RED : cMsg.startsWith("✓") ? ACC : SUB, fontSize: 13 }}>{cMsg}</div>}
          {sys.cloud?.st?.status === "ok" && sys.cloud.st.t && <div style={{ color: MUT, fontSize: 12.5 }}>Dernière synchro cloud : <b className="tabular-nums" style={{ color: TXT }}>{fmtT(sys.cloud.st.t)}</b></div>}
          {sys.cloud?.st?.status === "err" && <div style={{ color: AMB, fontSize: 12.5, lineHeight: 1.5 }}>Synchro automatique en échec : {sys.cloud.st.msg}.</div>}
          <button onClick={() => setShowSql(!showSql)} className="active:opacity-60 flex items-center gap-1.5" style={{ color: ACC, fontFamily: FD, fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
            <Info size={14} /> SQL à exécuter une fois dans Supabase {showSql ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showSql && <div style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, fontFamily: "monospace", fontSize: 11, color: SUB, whiteSpace: "pre-wrap", lineHeight: 1.6, userSelect: "text" }}>
{`create table coach_muscu (
  id text primary key,
  payload jsonb,
  updated_at timestamptz default now()
);
alter table coach_muscu enable row level security;
create policy "acces_libre" on coach_muscu
  for all using (true) with check (true);`}
          </div>}
          {showSql && <div style={{ color: MUT, fontSize: 12, lineHeight: 1.5 }}>Dans ton projet Supabase : SQL Editor → colle → Run. La politique ci-dessus ouvre la table à quiconque a ta clé anon : garde-la pour toi (base strictement personnelle), et l’identifiant permet plusieurs sauvegardes dans la même table.</div>}
        </>}
      </div>
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
        {!confirm ? <Btn small kind="danger" onClick={() => setConfirm(true)}><Trash2 size={15} /> Réinitialiser l’application</Btn>
          : <div className="flex flex-col gap-2">
            <div style={{ color: RED, fontSize: 13.5, lineHeight: 1.5 }}>Tout sera effacé (historique de juin compris) et l’accueil de départ reviendra. Irréversible sans export.</div>
            <div className="flex gap-2">
              <Btn small kind="subtle" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Annuler</Btn>
              <Btn small kind="danger" style={{ flex: 1 }} onClick={() => { mut(cur => { const fresh = buildSeed(); for (const k of Object.keys(cur)) delete cur[k]; Object.assign(cur, fresh); }); setConfirm(false); onClose(); }}>Tout effacer</Btn>
            </div>
          </div>}
      </div>
    </div>
  </Sheet>;
}
