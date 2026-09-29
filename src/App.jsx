import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Home, Calendar, TrendingUp, Dumbbell, User, Plus, Minus, Check, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Star, Settings2, AlertTriangle, Pencil, Trash2, ArrowLeftRight, Download, Upload, Trophy, Play, RotateCcw, SkipForward, Scale, Info, Timer, Lock, Flame, Target } from "lucide-react";

/* ------------------------------------------------------------------ */
/* THEME                                                               */
/* ------------------------------------------------------------------ */
const BG = "#0B0C0E", SURF = "#141619", SURF2 = "#1C1F23", LINE = "rgba(255,255,255,0.08)";
const TXT = "#F4F5F6", SUB = "#9AA1A9", MUT = "#61686F";
const ACC = "#FF5C2E", ACCSOFT = "rgba(255,92,46,0.13)";
const AMB = "#E3A93E", AMBSOFT = "rgba(227,169,62,0.12)";
const RED = "#E05C5C", REDSOFT = "rgba(224,92,92,0.12)";
const FD = "'Barlow Condensed', 'Barlow', system-ui, sans-serif";
const FB = "'Barlow', system-ui, sans-serif";

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
@keyframes glowp{0%,100%{box-shadow:0 0 0 0 rgba(255,92,46,0)}50%{box-shadow:0 0 0 5px rgba(255,92,46,0.22)}}
.sheet{animation:slideUp .22s cubic-bezier(.2,.8,.25,1)}
.fade{animation:fadeIn .16s ease}
.glow{animation:glowp 1.7s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.sheet,.fade,.glow{animation:none}}
`;

/* ------------------------------------------------------------------ */
/* UTILS                                                               */
/* ------------------------------------------------------------------ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r05 = x => Math.round(x * 2) / 2;
const r25 = x => Math.round(x * 4) / 4;
const fk = x => (x == null || isNaN(x)) ? "—" : String(r25(x)).replace(".", ",");
const fk1 = x => (x == null || isNaN(x)) ? "—" : (Math.round(x * 10) / 10).toString().replace(".", ",");
const pad2 = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const dow = s => (parseISO(s).getDay() || 7);
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_S = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DAYS_FR = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const D2 = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const fmtLong = s => { const d = parseISO(s); return `${DAYS_FR[(d.getDay() || 7) - 1]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
const fmtDM = s => { const d = parseISO(s); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
const fmtDMY = s => { const d = parseISO(s); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)} h ${pad2(m % 60)}` : `${m} min`;
const EPS = (l, r) => (l && r) ? l * (1 + Math.min(r, 12) / 30) : 0;

/* Table %1RM par (reps, RPE) — §6.1 */
const RPE_ROW = [100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9, 57.4, 55.0, 52.6];
function pctOf(reps, rpe) {
  const i = clamp(reps + (10 - rpe) - 1, 0, RPE_ROW.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i), f = i - lo;
  return (RPE_ROW[lo] * (1 - f) + RPE_ROW[hi] * f) / 100;
}
const e1From = (load, reps, rpe) => (load && reps && rpe) ? load / pctOf(reps, clamp(rpe, 6, 10)) : 0;
const rirToRpe = rir => rir == null ? null : clamp(10 - rir, 6, 10);
const roundInc = (x, inc) => Math.round(x / (inc || 2.5)) * (inc || 2.5);
function linregSlope(pts) { // pts: [{x: jours, y}] -> pente par semaine
  if (pts.length < 2) return 0;
  const n = pts.length, sx = pts.reduce((a, p) => a + p.x, 0), sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0), sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const den = n * sxx - sx * sx;
  return den ? ((n * sxy - sx * sy) / den) * 7 : 0;
}
function ma7(weights, date) {
  const win = weights.filter(w => { const g = daysBetween(w.date, date); return g >= 0 && g <= 6; });
  return win.length ? win.reduce((a, w) => a + w.w, 0) / win.length : null;
}

/* ------------------------------------------------------------------ */
/* MUSCLES & VOLUME (MEV / MAV / MRV) — §7.1                           */
/* ------------------------------------------------------------------ */
const MUSCLES = { pectoraux: "Pectoraux", dos: "Dos", deltA: "Épaules avant", deltL: "Épaules côté", deltP: "Épaules arrière", biceps: "Biceps", triceps: "Triceps", quadriceps: "Quadriceps", ischios: "Ischios", fessiers: "Fessiers", mollets: "Mollets", abdos: "Abdos" };
const ML = { pectoraux: "Pecs", dos: "Dos", deltA: "Ép. av.", deltL: "Ép. lat.", deltP: "Ép. arr.", biceps: "Biceps", triceps: "Triceps", quadriceps: "Quadris", ischios: "Ischios", fessiers: "Fessiers", mollets: "Mollets", abdos: "Abdos" };
const MKEYS = Object.keys(MUSCLES);
const VOL = { pectoraux: [8, 12, 18, 22], dos: [10, 14, 20, 25], quadriceps: [8, 12, 16, 20], ischios: [6, 10, 14, 18], fessiers: [4, 8, 12, 16], deltL: [8, 14, 20, 25], deltP: [6, 12, 18, 22], deltA: [0, 4, 8, 12], biceps: [6, 10, 16, 22], triceps: [6, 10, 14, 18], mollets: [6, 10, 14, 18], abdos: [4, 10, 16, 22] };
const UPPER = ["pectoraux", "dos", "deltA", "deltL", "deltP", "biceps", "triceps"];
const LOWER = ["quadriceps", "ischios", "fessiers", "mollets"];
const ZONES = { epaule: "Épaule", genou: "Genou", lombaires: "Lombaires", coude: "Coude", poignet: "Poignet" };
const EQUIP_LIST = [["barre", "Barre + rack"], ["banc", "Banc"], ["halteres", "Haltères"], ["machines", "Machines"], ["poulies", "Poulies / câbles"], ["smith", "Smith machine"], ["assist", "Machine dips/tractions assistées"], ["lest", "Ceinture de lest"]];
const KIND_NEEDS = { barbell: ["barre"], smith: ["smith"], dumbbell: ["halteres"], machine: ["machines"], cable: ["poulies"], bw: [], bwAssist: [] };
const KINDS = { barbell: "Barre", smith: "Smith", dumbbell: "Haltères", machine: "Machine", cable: "Poulie", bw: "Poids du corps", bwAssist: "PDC assisté / lesté" };

const TYPES = { normal: { l: "N", name: "Normale" }, top: { l: "T", name: "Top set" }, warmup: { l: "É", name: "Échauffement" }, backoff: { l: "B", name: "Back-off" }, drop: { l: "D", name: "Drop set" }, amrap: { l: "A", name: "AMRAP" } };
const TYPE_ORDER = ["normal", "top", "backoff", "drop", "amrap", "warmup"];

/* ------------------------------------------------------------------ */
/* BIBLIOTHÈQUE v3 — machines d'abord, haut du corps prioritaire       */
/* ------------------------------------------------------------------ */
const STACK_NOTE = "Incrément estimé ≈ 4,5 kg d’après ton historique (23 → 27 → 32 → 36 → 45). Si ta machine a une plaque d’appoint de 2,25 kg, règle 2,25 : le coach progressera plus finement.";
/* E(nom, pattern, muscles, kind, incrément, fatigueCost, stimulusRatio, options) */
const E = (name, pat, m, kind, inc, fc, sr, o = {}) => ({ name, pat, m, kind, inc, fc, sr, js: {}, len: false, iso: false, ...o });
const EXOS = {
  /* ---- Poussée horizontale ---- */
  chestpress: E("Chest Press", "hpush", { pectoraux: 1, triceps: 0.5, deltA: 0.5 }, "machine", 4.5, 2, 5, { key: true, note: STACK_NOTE }),
  smithbench: E("Couché Smith", "hpush", { pectoraux: 1, triceps: 0.5, deltA: 0.5 }, "smith", 2.5, 3, 4, { needs: ["smith", "banc"] }),
  benchpress: E("Développé couché barre", "hpush", { pectoraux: 1, triceps: 0.5, deltA: 0.5 }, "barbell", 2.5, 4, 3, { js: { epaule: 2 }, needs: ["barre", "banc"] }),
  dbbench: E("Développé couché haltères", "hpush", { pectoraux: 1, triceps: 0.5, deltA: 0.5 }, "dumbbell", 2, 3, 4, { len: true, js: { epaule: 1 }, needs: ["halteres", "banc"] }),
  pushups: E("Pompes", "hpush", { pectoraux: 1, triceps: 0.5, deltA: 0.5 }, "bw", 0, 2, 3, {}),
  /* ---- Pecs haut (incliné) ---- */
  inclinemachine: E("Chest Press incliné", "incline", { pectoraux: 1, deltA: 0.5, triceps: 0.5 }, "machine", 4.5, 2, 5, {}),
  smithincline: E("Incliné Smith", "incline", { pectoraux: 1, deltA: 0.5, triceps: 0.5 }, "smith", 2.5, 3, 4, { needs: ["smith", "banc"] }),
  dbincline: E("Incliné haltères", "incline", { pectoraux: 1, deltA: 0.5, triceps: 0.5 }, "dumbbell", 2, 3, 4, { len: true, js: { epaule: 1 }, needs: ["halteres", "banc"] }),
  inclinepress: E("Développé incliné barre", "incline", { pectoraux: 1, deltA: 0.5, triceps: 0.5 }, "barbell", 2.5, 3, 3, { js: { epaule: 2 }, needs: ["barre", "banc"] }),
  /* ---- Écartés ---- */
  pecfly: E("Pec Fly", "fly", { pectoraux: 1 }, "machine", 4.5, 1, 5, { iso: true, len: true, key: true, note: STACK_NOTE }),
  cablefly: E("Écarté poulies", "fly", { pectoraux: 1 }, "cable", 2.5, 1, 4, { iso: true, len: true }),
  /* ---- Poussée verticale ---- */
  shoulderpress: E("Shoulder Press", "vpush", { deltA: 1, deltL: 0.5, triceps: 0.5 }, "machine", 4.5, 2, 5, { js: { epaule: 1 }, key: true, note: STACK_NOTE }),
  smithohp: E("Militaire Smith", "vpush", { deltA: 1, deltL: 0.5, triceps: 0.5 }, "smith", 2.5, 3, 4, { js: { epaule: 2 } }),
  ohp: E("Développé militaire barre", "vpush", { deltA: 1, deltL: 0.5, triceps: 0.5 }, "barbell", 2.5, 3, 3, { js: { epaule: 2, lombaires: 1 } }),
  dbshoulderpress: E("Développé épaules haltères", "vpush", { deltA: 1, deltL: 0.5, triceps: 0.5 }, "dumbbell", 2, 3, 4, { js: { epaule: 2 } }),
  /* ---- Dips ---- */
  dips: E("Dips", "dip", { pectoraux: 0.75, triceps: 1, deltA: 0.5 }, "bwAssist", 5, 3, 4, { js: { epaule: 2 }, key: true }),
  dipmachine: E("Dips machine", "dip", { triceps: 1, pectoraux: 0.5, deltA: 0.25 }, "machine", 4.5, 2, 4, { js: { epaule: 1 } }),
  /* ---- Épaules : latéraux / arrière ---- */
  lateralraise: E("Lateral Raise", "lateral", { deltL: 1 }, "machine", 4.5, 1, 5, { iso: true, note: STACK_NOTE }),
  cablelateral: E("Élévation latérale poulie", "lateral", { deltL: 1 }, "cable", 2.5, 1, 5, { iso: true, len: true }),
  dblateral: E("Élévation latérale haltères", "lateral", { deltL: 1 }, "dumbbell", 2, 1, 4, { iso: true }),
  reversefly: E("Reverse Fly", "rear", { deltP: 1 }, "machine", 4.5, 1, 5, { iso: true, len: true }),
  facepull: E("Face Pull", "rear", { deltP: 1, dos: 0.25 }, "cable", 2.5, 1, 4, { iso: true }),
  cablerear: E("Oiseau poulie", "rear", { deltP: 1 }, "cable", 2.5, 1, 4, { iso: true, len: true }),
  /* ---- Tirage vertical ---- */
  latpulldown: E("Lat Pull Down", "vpull", { dos: 1, biceps: 0.5, deltP: 0.25 }, "machine", 4.5, 2, 5, { key: true, note: STACK_NOTE }),
  highrow: E("Tirage convergent (High Row)", "vpull", { dos: 1, biceps: 0.5, deltP: 0.25 }, "machine", 4.5, 2, 5, { len: true }),
  pullups: E("Tractions", "vpull", { dos: 1, biceps: 0.5 }, "bwAssist", 5, 3, 4, {}),
  cablepullover: E("Pullover poulie bras tendus", "pullover", { dos: 1 }, "cable", 2.5, 1, 4, { iso: true, len: true }),
  dbpullover: E("Pullover haltère", "pullover", { dos: 1, pectoraux: 0.25 }, "dumbbell", 2, 1, 4, { iso: true, len: true, needs: ["halteres", "banc"] }),
  pullovermachine: E("Pullover machine", "pullover", { dos: 1 }, "machine", 4.5, 1, 5, { iso: true, len: true }),
  /* ---- Tirage horizontal ---- */
  seatedrow: E("Rameur assis", "hpull", { dos: 1, biceps: 0.5, deltP: 0.5 }, "machine", 4.5, 2, 5, { key: true, note: STACK_NOTE }),
  chestrow: E("Rowing buste appuyé", "hpull", { dos: 1, biceps: 0.5, deltP: 0.5 }, "machine", 4.5, 2, 5, {}),
  cablerow: E("Tirage horizontal poulie", "hpull", { dos: 1, biceps: 0.5, deltP: 0.25 }, "cable", 2.5, 2, 4, { len: true }),
  dbrow: E("Rowing haltère unilatéral", "hpull", { dos: 1, biceps: 0.5, deltP: 0.25 }, "dumbbell", 2, 2, 4, { uni: true, len: true, needs: ["halteres", "banc"] }),
  rowing: E("Rowing barre", "hpull", { dos: 1, biceps: 0.5, deltP: 0.5 }, "barbell", 2.5, 4, 3, { js: { lombaires: 2 } }),
  /* ---- Biceps ---- */
  bicepscurl: E("Biceps Curl", "curl", { biceps: 1 }, "machine", 4.5, 1, 4, { iso: true, key: true, note: STACK_NOTE }),
  preachercurl: E("Curl pupitre", "curl_len", { biceps: 1 }, "machine", 4.5, 1, 5, { iso: true, len: true }),
  bayesiancurl: E("Curl bayésien poulie", "curl_len", { biceps: 1 }, "cable", 2.5, 1, 5, { iso: true, len: true }),
  inclinecurl: E("Curl incliné haltères", "curl_len", { biceps: 1 }, "dumbbell", 2, 1, 4, { iso: true, len: true, needs: ["halteres", "banc"] }),
  dbcurl: E("Curl haltères", "curl", { biceps: 1 }, "dumbbell", 2, 1, 3, { iso: true }),
  hammercurl: E("Curl marteau", "curl", { biceps: 1 }, "dumbbell", 2, 1, 3, { iso: true }),
  ezcurl: E("Curl EZ", "curl", { biceps: 1 }, "barbell", 2.5, 1, 3, { iso: true, js: { poignet: 1 } }),
  /* ---- Triceps ---- */
  overheadext: E("Extension nuque poulie", "tri_oh", { triceps: 1 }, "cable", 2.5, 1, 5, { iso: true, len: true, js: { coude: 1 } }),
  dbtriext: E("Extension triceps haltère (nuque)", "tri_oh", { triceps: 1 }, "dumbbell", 2, 1, 4, { iso: true, len: true, js: { coude: 1 } }),
  pushdown: E("Pushdown poulie", "tri_push", { triceps: 1 }, "cable", 2.5, 1, 4, { iso: true }),
  ropeext: E("Extension corde", "tri_push", { triceps: 1 }, "cable", 2.5, 1, 4, { iso: true }),
  tricepsmachine: E("Extension triceps machine", "tri_push", { triceps: 1 }, "machine", 4.5, 1, 4, { iso: true }),
  /* ---- Abdos / gainage ---- */
  absmachine: E("Machine abdominaux", "abs", { abdos: 1 }, "machine", 4.5, 1, 4, { iso: true, note: STACK_NOTE }),
  cablecrunch: E("Crunch poulie", "abs", { abdos: 1 }, "cable", 2.5, 1, 4, { iso: true, len: true }),
  legraises: E("Relevés de jambes", "abs", { abdos: 1 }, "bw", 0, 1, 4, { iso: true }),
  plank: E("Gainage", "abs", { abdos: 1 }, "bw", 0, 1, 2, { iso: true, unit: "s" }),
  /* ---- Jambes (entretien ou complet) ---- */
  hacksquat: E("Hack squat", "squat", { quadriceps: 1, fessiers: 0.5 }, "machine", 4.5, 4, 4, { js: { genou: 2 }, len: true }),
  legpress: E("Presse à cuisses", "squat", { quadriceps: 1, fessiers: 0.5 }, "machine", 4.5, 3, 5, { js: { genou: 1 } }),
  smithsquat: E("Squat Smith", "squat", { quadriceps: 1, fessiers: 0.75 }, "smith", 2.5, 4, 3, { js: { genou: 2 } }),
  backsquat: E("Squat barre", "squat", { quadriceps: 1, fessiers: 0.75, abdos: 0.25 }, "barbell", 2.5, 5, 3, { js: { genou: 2, lombaires: 3 } }),
  bulgarian: E("Fentes bulgares", "lunge", { quadriceps: 1, fessiers: 1 }, "dumbbell", 2, 4, 4, { js: { genou: 2 }, uni: true, len: true }),
  legext: E("Leg extension", "quad_iso", { quadriceps: 1 }, "machine", 4.5, 1, 4, { iso: true, len: true, js: { genou: 1 } }),
  legcurl: E("Leg curl", "ham_iso", { ischios: 1 }, "machine", 4.5, 1, 5, { iso: true, len: true }),
  dbrdl: E("Soulevé roumain haltères", "hinge", { ischios: 1, fessiers: 0.75 }, "dumbbell", 2, 3, 4, { js: { lombaires: 2 }, len: true }),
  rdl: E("Soulevé roumain barre", "hinge", { ischios: 1, fessiers: 0.75, dos: 0.25 }, "barbell", 2.5, 4, 4, { js: { lombaires: 3 }, len: true }),
  hipthrust: E("Hip thrust", "hinge", { fessiers: 1, ischios: 0.25 }, "machine", 4.5, 2, 4, {}),
  calfstand: E("Mollets debout", "calf", { mollets: 1 }, "machine", 4.5, 1, 3, { iso: true, len: true }),
};

/* Mouvements principaux (moteur Force) — la variante suit ton matériel, machine d'abord */
const SLOTS = {
  press: { name: "Développé", long: "Développé (pecs)", vars: ["chestpress", "smithbench", "benchpress", "dbbench"] },
  vpull: { name: "Tirage vertical", long: "Tirage vertical (dos largeur)", vars: ["latpulldown", "highrow"] },
  ohp: { name: "Épaules", long: "Développé épaules", vars: ["shoulderpress", "smithohp", "ohp", "dbshoulderpress"] },
  hpull: { name: "Rowing", long: "Rowing (dos épaisseur)", vars: ["seatedrow", "chestrow", "cablerow", "dbrow", "rowing"] },
  legs: { name: "Jambes", long: "Jambes (quadriceps)", vars: ["hacksquat", "legpress", "smithsquat", "backsquat"] },
};
const SLOT_KEYS = ["press", "vpull", "ohp", "hpull", "legs"];
const UPPER_SLOTS = ["press", "vpull", "ohp", "hpull"];
const LEGS_MODES = { off: "Aucune", maint: "Entretien", full: "Complet" };

/* Journées-types : l'ordre ci-dessous EST l'enchaînement (composé lourd → composé
   complémentaire → angle différent → isolations en alternance → abdos). */
const I = (role, o) => ({ role, ...o });
const BP = {
  PUSH_A: { label: "PUSH A · PECS", items: [I("main", { slot: "press" }), I("secondary", { slot: "ohp", light: true }), I("accessory", { pats: ["incline"], m: "pectoraux" }), I("isolation", { pats: ["lateral"], m: "deltL" }), I("isolation", { pats: ["fly"], m: "pectoraux" }), I("isolation", { pats: ["tri_oh"], m: "triceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  PULL_A: { label: "PULL A · DOS LARGEUR", items: [I("main", { slot: "vpull" }), I("secondary", { slot: "hpull", light: true }), I("isolation", { pats: ["pullover"], m: "dos" }), I("isolation", { pats: ["rear"], m: "deltP" }), I("isolation", { pats: ["curl_len", "curl"], m: "biceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  PUSH_B: { label: "PUSH B · ÉPAULES", items: [I("main", { slot: "ohp" }), I("secondary", { slot: "press", light: true }), I("accessory", { pats: ["dip"], m: "triceps" }), I("isolation", { pats: ["lateral"], m: "deltL" }), I("isolation", { pats: ["fly"], m: "pectoraux" }), I("isolation", { pats: ["tri_push"], m: "triceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  PULL_B: { label: "PULL B · DOS ÉPAISSEUR", items: [I("main", { slot: "hpull" }), I("secondary", { slot: "vpull", light: true }), I("accessory", { pats: ["hpull"], m: "dos" }), I("isolation", { pats: ["rear"], m: "deltP" }), I("isolation", { pats: ["lateral"], m: "deltL" }), I("isolation", { pats: ["curl", "curl_len"], m: "biceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  ARMS: { label: "BRAS & ÉPAULES", items: [I("accessory", { pats: ["dip"], m: "triceps" }), I("isolation", { pats: ["lateral"], m: "deltL" }), I("isolation", { pats: ["curl_len"], m: "biceps" }), I("isolation", { pats: ["tri_oh"], m: "triceps" }), I("isolation", { pats: ["rear"], m: "deltP" }), I("isolation", { pats: ["curl"], m: "biceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  LEGS: { label: "JAMBES", items: [I("main", { slot: "legs" }), I("accessory", { pats: ["hinge"], m: "ischios" }), I("isolation", { pats: ["quad_iso"], m: "quadriceps" }), I("isolation", { pats: ["ham_iso"], m: "ischios" }), I("isolation", { pats: ["calf"], m: "mollets" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  UP_A: { label: "HAUT A · PRESS + TIRAGE", items: [I("main", { slot: "press" }), I("main", { slot: "vpull", second: true }), I("isolation", { pats: ["lateral"], m: "deltL" }), I("isolation", { pats: ["fly"], m: "pectoraux" }), I("isolation", { pats: ["curl_len"], m: "biceps" }), I("isolation", { pats: ["tri_oh"], m: "triceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  UP_B: { label: "HAUT B · ÉPAULES + ROWING", items: [I("main", { slot: "ohp" }), I("main", { slot: "hpull", second: true }), I("accessory", { pats: ["incline"], m: "pectoraux" }), I("isolation", { pats: ["rear"], m: "deltP" }), I("isolation", { pats: ["curl"], m: "biceps" }), I("isolation", { pats: ["tri_push"], m: "triceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
  UP_C: { label: "HAUT C · VOLUME", items: [I("secondary", { slot: "press", light: true }), I("secondary", { slot: "hpull", light: true }), I("accessory", { pats: ["dip"], m: "triceps" }), I("isolation", { pats: ["lateral"], m: "deltL" }), I("isolation", { pats: ["pullover"], m: "dos" }), I("isolation", { pats: ["curl_len"], m: "biceps" }), I("isolation", { pats: ["abs"], m: "abdos" })] },
};
/* Jambes en entretien : ajoutées en fin de séance tirage (avant les abdos) */
const LEGS_MAINT = [I("accessory", { pats: ["squat"], m: "quadriceps", legs: true }), I("isolation", { pats: ["ham_iso"], m: "ischios", legs: true })];

/* ------------------------------------------------------------------ */
/* SEED & MIGRATION v3                                                 */
/* ------------------------------------------------------------------ */
const mk = o => ({ id: uid(), type: "normal", rir: null, rpe: null, ...o });
const rep = (n, o) => Array.from({ length: n }, () => mk({ ...o }));
const USER_EX_DEFAULTS = { fav: false, avoid: false, locked: false, variants: [], curVar: null, seat: "", grip: "", userNote: "", e1: null, e1Hist: [], anchor: null, labels: [] };
const USER_FIELDS = ["fav", "avoid", "locked", "variants", "curVar", "seat", "grip", "userNote", "inc", "e1", "e1Hist", "anchor", "labels"];
function freshExercises() {
  const out = {};
  for (const [id, def] of Object.entries(EXOS)) out[id] = { id, ...def, ...USER_EX_DEFAULTS };
  return out;
}
function buildSeq(goal, level) {
  const w = level === "deb" ? 4 : level === "adv" ? 6 : 5;
  const seq = goal >= 66 ? ["force", "hyper", "force"] : goal <= 35 ? ["hyper", "hyper", "force"] : ["hyper", "force", "hyper"];
  return [...seq.map(type => ({ type, weeks: w })), { type: "test", weeks: 1 }];
}
function initCycle(d) {
  const t0 = todayISO();
  d.cycle = { startDate: t0, seq: buildSeq(d.profile.goal ?? 40, d.profile.level || "int"), bi: 0, blockStart: t0 };
  d.program.templates = null;
}
function mainSlotSeed() { return { variantId: null, e1: null, hist: [], fails: 0, mode: "lin", resets: 0, momentum: 0, linNext: null, linReps: null, linMsg: null, resetP: false }; }
function juneHistory() {
  return [
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
}
const VERIFY_SEED = [
  { id: "vr_row", kind: "date", sid: "h6", title: "Rameur assis — 13/06/2025", desc: "Ta note indique 2025, mais les séances voisines sont en juin 2026. Quelle est la bonne année ?" },
  { id: "vr_dipsdate", kind: "date", sid: "h7", title: "Dips — 13/06/2025", desc: "Même chose : cette séance de dips (1 × 8 au poids du corps, puis 1 × 10 avec 20 kg d’assistance) est notée en 2025. Quelle est la bonne année ?" },
  { id: "vr_dips15", kind: "dips15", sid: "h1", exId: "dips", title: "Dips — note « 1,5 × 8 » (04/06/2026)", desc: "Cette notation est ambiguë. Que signifiait-elle ? En attendant, elle n’est pas comptée dans tes stats." },
  { id: "vr_lat", kind: "lat", sid: "h3", exId: "lateralraise", title: "Lateral Raise — « 5 × 23 kg » (08/06/2026)", desc: "5 reps à 23 kg, ou 5 séries à 23 kg ? En attendant, cette entrée n’est pas comptée dans tes stats." },
];


function buildSeed() {
  return {
    v: 3,
    createdAt: todayISO(),
    profile: { onboarded: false, sex: null, age: null, height: null, weight: null, targetWeight: null,
      level: "int", goal: 40, days: [1, 2, 4, 5], sessionMinutes: 75, legs: "off",
      equipment: ["machines", "poulies", "banc", "halteres", "assist"], weakPoints: [], avoidZones: {},
      pains: "", injuries: "", uncomfortable: "", morpho: {}, phase: "recompo", activity: 1.5,
      resumeDate: null, expYears: null, breakMonths: null },
    exercises: freshExercises(),
    mains: Object.fromEntries(SLOT_KEYS.map(k => [k, mainSlotSeed()])),
    cycle: null,
    program: { templates: null, tplSig: null, changes: [], overrides: {} },
    sessions: juneHistory(),
    verify: JSON.parse(JSON.stringify(VERIFY_SEED)),
    volAdj: {}, goals: {},
    weights: [{ id: uid(), date: "2026-06-08", w: 72 }, { id: uid(), date: "2026-06-10", w: 72 }],
    waist: [], nutrition: [],
    prefs: { deloadUntil: null, deloadDismissed: null, mini: null },
    cloud: { enabled: false, url: "", key: "", room: "moi", table: "coach_muscu" },
  };
}
function migrate(d) {
  if (!d.v || d.v === 1) d = migrateV1(d);
  if (d.v === 2) d = migrateV2(d);
  /* exercices : attributs de la bibliothèque + réglages utilisateur conservés */
  const ex0 = d.exercises || {};
  const ex1 = {};
  for (const [id, def] of Object.entries(EXOS)) {
    const old = ex0[id] || {};
    const keep = {}; for (const f of USER_FIELDS) if (old[f] !== undefined && old[f] !== null) keep[f] = old[f];
    ex1[id] = { id, ...def, ...USER_EX_DEFAULTS, ...keep };
  }
  const used = new Set(); for (const s of d.sessions || []) for (const e of s.entries || []) used.add(e.exerciseId);
  for (const [id, old] of Object.entries(ex0)) {
    if (ex1[id]) continue;
    if (old.custom) ex1[id] = { ...USER_EX_DEFAULTS, ...old, pat: old.pat || "custom", m: old.m || {} };
    else if (used.has(id)) ex1[id] = { ...USER_EX_DEFAULTS, ...old, legacy: true, m: old.m || {} };
  }
  d.exercises = ex1;
  for (const ex of Object.values(d.exercises)) { ex.e1Hist = ex.e1Hist || []; ex.js = ex.js || {}; }
  d.mains = d.mains || {};
  for (const k of SLOT_KEYS) d.mains[k] = { ...mainSlotSeed(), ...(d.mains[k] || {}) };
  const p = d.profile;
  p.avoidZones = p.avoidZones || {}; p.weakPoints = p.weakPoints || []; p.goal = p.goal ?? 40; p.level = p.level || "int";
  p.sessionMinutes = p.sessionMinutes || p.maxTime || 75; p.phase = p.phase || "recompo"; p.activity = p.activity || 1.5;
  p.legs = p.legs || "off"; p.equipment = p.equipment || ["machines", "poulies", "banc", "halteres", "assist"];
  d.program = { templates: null, tplSig: null, changes: [], overrides: {}, ...(d.program || {}) };
  d.volAdj = d.volAdj || {}; d.goals = d.goals || {}; d.waist = d.waist || []; d.nutrition = d.nutrition || [];
  d.prefs = { deloadUntil: null, deloadDismissed: null, mini: null, ...(d.prefs || {}) };
  d.cloud = d.cloud || { enabled: false, url: "", key: "", room: "moi", table: "coach_muscu" };
  initAccessoryE1(d);
  pickMainVariants(d);
  seedMainsFromHistory(d);
  if (!d.cycle && p.onboarded) initCycle(d);
  if (d.cycle) syncCycle(d);
  d.v = 3;
  return d;
}
function migrateV1(old) {
  const d = buildSeed(); d.v = 2;
  d.createdAt = old.createdAt || d.createdAt;
  const p = old.profile || {};
  Object.assign(d.profile, { onboarded: !!p.onboarded, sex: p.sex, age: p.age, height: p.height, weight: p.weight, targetWeight: p.targetWeight,
    days: p.days || d.profile.days, sessionMinutes: p.maxTime || 75, pains: p.pains || "", injuries: p.injuries || "", uncomfortable: p.uncomfortable || "",
    morpho: p.morpho || {}, resumeDate: p.resumeDate, expYears: p.expYears, breakMonths: p.breakMonths,
    level: p.expYears == null ? "int" : p.expYears < 1 ? "deb" : p.expYears <= 3 ? "int" : "adv" });
  d.sessions = (old.sessions || juneHistory()).map(s => ({ ...s, entries: (s.entries || []).map(e => ({ ...e, exerciseId: e.exerciseId === "militarypress" ? "ohp" : e.exerciseId })) }));
  d.verify = old.verify || d.verify;
  d.weights = old.weights || d.weights; d.nutrition = old.nutrition || [];
  d.prefs = { deloadUntil: old.prefs?.deloadUntil || null, deloadDismissed: old.prefs?.deloadDismissed || null, mini: null };
  d.cloud = old.cloud || d.cloud;
  for (const [k, v] of Object.entries(old.program?.overrides || {})) if (v === "rest") d.program.overrides[k] = "rest";
  const exs = {};
  for (const [id0, ex] of Object.entries(old.exercises || {})) {
    const id = id0 === "militarypress" ? "ohp" : id0;
    if (EXOS[id]) exs[id] = { fav: !!ex.fav, avoid: !!ex.avoid, variants: ex.variants || [], curVar: ex.curVar || null, seat: ex.seat || "", grip: ex.grip || "", userNote: ex.userNote || "", ...(ex.inc ? { inc: ex.inc } : {}) };
    else if (ex.custom) {
      const m = {}; for (const [mm, c] of Object.entries(ex.m || {})) m[mm === "epaules" ? "deltL" : mm] = c;
      exs[id] = { ...E(ex.name, ex.pat || "custom", m, ex.kind || "machine", ex.inc || 2.5, 2, 3, { iso: !!ex.iso }), id, custom: true, fav: !!ex.fav, avoid: !!ex.avoid };
    }
  }
  d.exercises = exs;
  return d;
}
function migrateV2(d) {
  const old = d.mains || {};
  const nm = Object.fromEntries(SLOT_KEYS.map(k => [k, mainSlotSeed()]));
  const eq = d.profile?.equipment || [];
  const libOk = id => { const x = EXOS[id]; return x && !(x.needs || KIND_NEEDS[x.kind] || []).some(n => !eq.includes(n)); };
  /* on ne garde un ancien main que s'il correspond à la variante machine-first de la v3 */
  const carry = (from, to) => { const s = old[from]; const pref = SLOTS[to].vars.find(libOk);
    if (s && s.variantId && s.variantId === pref) nm[to] = { ...mainSlotSeed(), variantId: s.variantId, e1: s.e1, hist: s.hist || [], mode: s.mode || "lin" }; };
  carry("bench", "press"); carry("ohp", "ohp"); carry("squat", "legs");
  d.mains = nm;
  d.program = { templates: null, tplSig: null, changes: [], overrides: { ...(d.program?.overrides || {}) } };
  for (const [k, v] of Object.entries(d.program.overrides)) if (v !== "rest") delete d.program.overrides[k];
  if (d.profile) d.profile.legs = d.profile.legs || "off";
  d.v = 3;
  return d;
}
/* Les charges de l'historique initialisent l'e1RM (RPE 8 supposé) et l'échelle de chaque machine */
function initAccessoryE1(d) {
  for (const ex of Object.values(d.exercises)) {
    if (ex.kind === "bw") continue;
    const h = exHistory(d, ex.id);
    if (h.length && ex.anchor == null) { const l = Math.max(...h[h.length - 1].main.map(t => t.load || 0)); if (l) ex.anchor = l; }
    if (h.length && !(ex.labels || []).length) addLabels(ex, h.flatMap(en => en.sets.map(t => t.load || 0)));
    if (ex.e1 != null) continue;
    let best = 0, bd = null;
    for (const en of h) for (const t of en.main) {
      const eff = setEff(ex, t, d, en.date); if (!eff) continue;
      const e = e1From(eff, Math.min(t.reps, 12), t.rpe ?? rirToRpe(t.rir) ?? 8);
      if (e > best) { best = e; bd = en.date; }
    }
    if (best > 0) { ex.e1 = Math.round(best * 10) / 10; ex.e1Hist = [{ date: bd, v: ex.e1, source: "import" }]; }
  }
}
function pickMainVariants(d) {
  for (const k of SLOT_KEYS) {
    const slot = d.mains[k];
    const ok = SLOTS[k].vars.find(id => exAvailable(d, d.exercises[id]));
    if (!slot.variantId || !exAvailable(d, d.exercises[slot.variantId])) { if (slot.variantId && ok !== slot.variantId) setMainVariant(d, k, ok || SLOTS[k].vars[0]); else slot.variantId = ok || SLOTS[k].vars[0]; }
  }
}
/* Un main sans e1RM récupère celui de son exercice (historique de juin) → pas de calibration inutile */
function seedMainsFromHistory(d) {
  for (const k of SLOT_KEYS) {
    const st = d.mains[k]; if (st.e1) continue;
    const ex = d.exercises[st.variantId];
    if (ex?.e1) { st.e1 = ex.e1; st.hist = [{ date: ex.e1Hist?.[ex.e1Hist.length - 1]?.date || todayISO(), v: ex.e1, source: "import" }]; st.mode = "lin"; }
  }
}

/* ------------------------------------------------------------------ */
/* MOTEUR v3 — bases                                                   */
/* ------------------------------------------------------------------ */
function exAvailable(d, ex, extraZones) {
  if (!ex || ex.avoid || ex.legacy) return false;
  const eq = d.profile.equipment || [];
  const needs = ex.needs || KIND_NEEDS[ex.kind] || [];
  if (eq.length && needs.some(n => !eq.includes(n))) return false;
  const zones = { ...(d.profile.avoidZones || {}) };
  if (extraZones) for (const z of extraZones) zones[z] = true;
  for (const [z, on] of Object.entries(zones)) if (on && (ex.js?.[z] || 0) >= 2) return false;
  return true;
}
function nearestBW(data, date) {
  if (!data.weights.length) return null;
  let best = null, bd = Infinity;
  for (const w of data.weights) { const g = Math.abs(daysBetween(w.date, date)); if (g < bd) { bd = g; best = w.w; } }
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
function exHistory(data, exId, opts = {}) {
  const ex = data.exercises[exId]; if (!ex) return [];
  const variant = opts.variant !== undefined ? opts.variant : (ex.curVar || null);
  const out = [];
  for (const s of data.sessions) {
    if (s.status !== "done" || s.verifyDate) continue;
    for (const e of s.entries) {
      if (e.exerciseId !== exId) continue;
      const sets = (e.sets || []).filter(t => t.done !== false && !t.uncertain && t.type !== "warmup" && ((t.variantId || null) === variant));
      if (!sets.length) continue;
      const main = sets.filter(t => t.type === "normal" || t.type === "amrap" || t.type === "top");
      out.push({ date: s.date, sid: s.id, sets, main: main.length ? main : sets });
    }
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}
function realDone(data) { return data.sessions.filter(s => s.status === "done" && s.type !== "historique").sort((a, b) => a.date < b.date ? -1 : 1); }
const primM = ex => Object.entries(ex?.m || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
function legsMode(d) { const l = d.profile.legs || "off"; return l === "full" && (d.profile.days || []).length < 5 ? "maint" : l; }
function activeSlots(d) { return legsMode(d) === "full" ? [...UPPER_SLOTS, "legs"] : UPPER_SLOTS; }

/* ------------------------------------------------------------------ */
/* CYCLE — blocs & semaines                                            */
/* ------------------------------------------------------------------ */
function syncCycle(d) {
  const c = d.cycle; if (!c) return;
  let guard = 0, changed = false;
  while (guard++ < 40) {
    const blk = c.seq[c.bi];
    const wk = Math.floor(daysBetween(c.blockStart, todayISO()) / 7) + 1;
    if (wk <= blk.weeks) break;
    c.blockStart = addDays(c.blockStart, blk.weeks * 7);
    c.bi = (c.bi + 1) % c.seq.length;
    if (c.bi === 0) { c.startDate = c.blockStart; c.seq = buildSeq(d.profile.goal ?? 40, d.profile.level || "int"); }
    changed = true;
  }
  const monday = addDays(todayISO(), -(dow(todayISO()) - 1));
  if (d.lastAdjWeek !== monday) { if (d.lastAdjWeek) weeklyVolumeAdjust(d); d.lastAdjWeek = monday; }
  if (changed) rebuildTemplates(d, "block");
  ensureTemplates(d);
}
function curBlock(d) {
  if (!d.cycle) return { type: "hyper", wk: 1, weeks: 5, loadWeeks: 4, isDeload: false, isTest: false, bi: 0 };
  const c = d.cycle, blk = c.seq[c.bi];
  const wk = clamp(Math.floor(daysBetween(c.blockStart, todayISO()) / 7) + 1, 1, blk.weeks);
  const isTest = blk.type === "test";
  const loadWeeks = isTest ? 1 : blk.weeks - 1;
  return { type: blk.type, wk, weeks: blk.weeks, loadWeeks, isDeload: !isTest && wk > loadWeeks, isTest, bi: c.bi };
}
function blockLabel(b) {
  if (b.isTest) return "SEMAINE DE TEST";
  return `Bloc ${b.type === "force" ? "Force" : "Hypertrophie"} · sem. ${b.wk}/${b.weeks}${b.isDeload ? " · DELOAD" : ""}`;
}

/* Paramètres de la semaine pour les mouvements principaux.
   Machines = stables, sans pareur : on peut viser plus près de l'échec (RPE 9-9,5)
   qu'avec une barre libre → plus de stimulus, progression plus rapide. */
function weekParams(d, rd) {
  const b = curBlock(d);
  if (b.isTest) return { ...b, test: true, R: 5, P: 9 };
  const force = b.type === "force";
  const R = force ? 4 : 6;
  if (b.isDeload || miniDeloadActive(d)) return { ...b, deload: true, R, P: 6, boffN: 0, boffPct: 0.85, boffReps: R + 2, accFactor: 0.5, dropIso: 0 };
  const f = b.loadWeeks > 1 ? (b.wk - 1) / (b.loadWeeks - 1) : 0;
  let P = force ? 8 + 1.5 * f : 7.5 + 1.5 * f;
  let boffN = force ? (b.wk >= b.loadWeeks ? 2 : 3) : 2 + (b.wk >= 2 ? 1 : 0);
  const boffReps = force ? R + 2 : R + (b.wk >= 3 ? 2 : 3);
  const boffPct = force ? (b.wk >= 3 ? 0.9 : 0.88) : (b.wk >= 3 ? 0.87 : 0.85);
  let cap = 9.5;
  if (d.profile.level === "deb") cap = 8.5;
  if ((d.profile.age || 0) > 45) cap = Math.min(cap, 9);
  let dropIso = 0, accFactor = 1, technical = false, strong = false;
  if (rd != null) {
    if (rd < 2.2) technical = true;
    else if (rd < 2.8) { P -= 1; boffN = Math.max(1, boffN - 1); accFactor = 0.7; dropIso = 1; }
    else if (rd < 3.5) { P -= 0.5; dropIso = 1; }
    else if (rd >= 4.2) { P += 0.5; strong = true; }
  }
  P = Math.min(cap, P);
  return { ...b, R, P: Math.round(P * 2) / 2, boffN, boffReps, boffPct, dropIso, accFactor, technical, strong };
}

/* ------------------------------------------------------------------ */
/* VOLUME hebdo cible par muscle (MEV → MRV), haut du corps prioritaire */
/* ------------------------------------------------------------------ */
function weekTargets(d) {
  const b = curBlock(d); const p = d.profile; const legs = legsMode(d);
  const out = {};
  for (const m of MKEYS) {
    const isLeg = LOWER.includes(m);
    if (isLeg && legs === "off") { out[m] = 0; continue; }
    if (isLeg && legs === "maint") { out[m] = { quadriceps: 6, ischios: 4, fessiers: 3, mollets: 0 }[m]; continue; }
    const [mev, , hi, mrv] = VOL[m];
    const start = mev + 0.2 * (hi - mev);
    const base = start + (b.wk - 1) * 1.5 + (d.volAdj[m] || 0);
    let mult = 1;
    if (UPPER.includes(m) && legs !== "full") mult *= 1.1;
    if (p.level === "deb") mult *= 0.8; if (p.level === "adv") mult *= 1.15;
    const weak = p.weakPoints?.includes(m);
    if (weak) mult *= 1.25;
    if (b.type === "force" && !weak) mult *= 0.75;
    if (p.sex === "F" && (m === "fessiers" || m === "ischios")) mult *= 1.1;
    if (p.phase === "seche") mult *= 0.8;
    let v = clamp(base * mult, b.type === "force" ? mev * 0.6 : mev * 0.9, mrv);
    if (b.isDeload || b.isTest) v = start * mult * 0.5;
    out[m] = Math.round(v);
  }
  return out;
}
function muscleVolume(data, wsISO) {
  const acc = {}; MKEYS.forEach(k => acc[k] = 0);
  const we = addDays(wsISO, 7);
  for (const s of data.sessions) {
    if (s.status !== "done" || s.verifyDate || s.date < wsISO || s.date >= we) continue;
    for (const e of s.entries) {
      const ex = data.exercises[e.exerciseId]; if (!ex) continue;
      const n = (e.sets || []).filter(t => t.done !== false && !t.uncertain && t.type !== "warmup").length;
      for (const [m, c] of Object.entries(ex.m || {})) if (acc[m] != null) acc[m] += n * c;
    }
  }
  MKEYS.forEach(k => acc[k] = Math.round(acc[k] * 2) / 2);
  return acc;
}
/* Ajustement hebdo du volume par muscle — courbatures × performance × sensation */
function weeklyVolumeAdjust(d) {
  const ws = addDays(todayISO(), -7 - (dow(todayISO()) - 1));
  const sess = realDone(d).filter(s => s.date >= ws && s.date < addDays(ws, 7));
  if (!sess.length) return;
  const sor = sess.map(s => s.checkin?.soreness).filter(v => v != null);
  const sorAvg = sor.length ? sor.reduce((a, b) => a + b, 0) / sor.length : 2;
  for (const m of MKEYS) {
    let up = 0, down = 0, weak = 0;
    for (const s of sess) for (const e of s.entries) {
      const ex = d.exercises[e.exerciseId]; if (!ex || (ex.m?.[m] || 0) < 0.75) continue;
      if (e.cmp?.v === "up") up++; if (e.cmp?.v === "down") down++; if (e.feeling === "faible") weak++;
    }
    if (!up && !down && !weak) continue;
    const adj = d.volAdj[m] || 0;
    if (sorAvg <= 2.5 && up >= down) d.volAdj[m] = clamp(adj + (weak ? 2 : 1), -3, 5);
    else if (sorAvg >= 4 && down > up) d.volAdj[m] = clamp(adj - 1, -3, 5);
  }
}

/* ------------------------------------------------------------------ */
/* SPLIT & PROGRAMME DU BLOC (exercices stables = progression mesurable) */
/* ------------------------------------------------------------------ */
function splitKeys(d) {
  const n = (d.profile.days || []).length || 4, legs = legsMode(d);
  if (n <= 2) return ["UP_A", "UP_B"];
  if (n === 3) return ["UP_A", "UP_B", "UP_C"];
  if (n === 4) return ["PUSH_A", "PULL_A", "PUSH_B", "PULL_B"];
  if (n === 5) return ["PUSH_A", "PULL_A", legs === "full" ? "LEGS" : "ARMS", "PUSH_B", "PULL_B"];
  return ["PUSH_A", "PULL_A", "ARMS", "PUSH_B", "PULL_B", legs === "full" ? "LEGS" : "ARMS_B"];
}
function splitDayKeys(d) { return splitKeys(d); }
function blueprint(d, key) {
  const bp = key === "ARMS_B" ? { label: "BRAS & ÉPAULES B", items: BP.ARMS.items } : BP[key];
  if (!bp) return { label: key, items: [] };
  let items = [...bp.items];
  const n = (d.profile.days || []).length || 4;
  const maintOn = n <= 2 ? ["UP_B"] : n === 3 ? ["UP_B", "UP_C"] : ["PULL_A", "PULL_B"];
  if (legsMode(d) === "maint" && maintOn.includes(key)) {
    const ai = items.findIndex(x => x.pats?.includes("abs"));
    items.splice(ai < 0 ? items.length : ai, 0, ...LEGS_MAINT);
  }
  return { label: bp.label, items };
}
function dayName(d, key) {
  const b = curBlock(d);
  if (b.isTest) { const s = testSlotFor(d, key); if (s) return `TEST · ${SLOTS[s].name.toUpperCase()}`; }
  return blueprint(d, key).label;
}
function testSlotFor(d, key) {
  if (key === "LEGS") return "legs";
  const withMain = splitKeys(d).filter(k => blueprint(d, k).items.some(x => x.role === "main"));
  const i = withMain.indexOf(key);
  if (i < 0) return null;
  const heavy = blueprint(d, key).items.find(x => x.role === "main");
  return heavy?.slot || UPPER_SLOTS[i % 4];
}
function tplSig(d) {
  return [splitKeys(d).join(","), legsMode(d), (d.profile.equipment || []).join(","),
    Object.entries(d.profile.avoidZones || {}).filter(x => x[1]).map(x => x[0]).join(","),
    (d.profile.weakPoints || []).join(","), SLOT_KEYS.map(k => d.mains[k]?.variantId).join(",")].join("|");
}
function ensureTemplates(d) {
  if (!d.program.templates || d.program.tplSig !== tplSig(d)) rebuildTemplates(d, d.program.templates ? "config" : "init");
}
function responseSlope(d, ex) {
  const h = (ex.e1Hist || []).slice(-6);
  if (h.length < 4 || !ex.e1) return 0;
  const pts = h.map(x => ({ x: daysBetween(h[0].date, x.date), y: x.v }));
  return clamp((linregSlope(pts) / ex.e1) * 100, -2, 2);
}
function isStagnant(d, ex) {
  if ((ex.e1Hist || []).length < 4) return false;
  return responseSlope(d, ex) < 0.25 || !!stagnation(d, ex.id, null);
}
function scoreForItem(d, ex, it, ctx) {
  let s = 2 * (ex.sr || 3) + (ex.len ? 1.5 : 0) - 0.5 * (ex.fc || 2) + (ex.fav ? 1.5 : 0) + (ex.locked ? 8 : 0)
    + (["machine", "cable"].includes(ex.kind) ? 1 : 0)
    + (exHistory(d, ex.id).length ? 2 : 0)
    - 2.5 * (ctx.weekUse[ex.id] || 0)
    + 3 * responseSlope(d, ex)
    + (it.pats.indexOf(ex.pat) === 0 ? 0.5 : 0)
    + (d.profile.weakPoints?.includes(it.m) && ex.len ? 1 : 0);
  if (ex.id === ctx.prevId) {
    if (ctx.reason === "rotate" && !ex.locked) s -= 3;
    else if (ctx.reason === "block" && !ex.locked && isStagnant(d, ex)) s -= 6;
    else s += 4;
  }
  return s;
}
function chooseForItem(d, it, ctx) {
  let best = null, bs = -1e9;
  for (const ex of Object.values(d.exercises)) {
    if (!it.pats.includes(ex.pat) || ctx.dayUsed.has(ex.id) || !exAvailable(d, ex)) continue;
    if (SLOT_KEYS.some(k => d.mains[k]?.variantId === ex.id)) continue;
    const s = scoreForItem(d, ex, it, ctx);
    if (s > bs) { bs = s; best = ex; }
  }
  return best;
}
function rebuildTemplates(d, reason) {
  const prev = d.program.templates || {};
  const out = {}; const weekUse = {}; const changes = [];
  for (const key of splitKeys(d)) {
    const items = []; const dayUsed = new Set();
    const prevNon = (prev[key] || []).filter(p => !p.slot);
    let ni = 0;
    for (const it of blueprint(d, key).items) {
      if (it.slot) {
        const exId = d.mains[it.slot].variantId;
        if (!exId) continue;
        items.push({ ...it, exId }); dayUsed.add(exId); weekUse[exId] = (weekUse[exId] || 0) + 1; continue;
      }
      const prevIt = prevNon[ni++];
      const prevId = prevIt && prevIt.pats?.join() === it.pats.join() ? prevIt.exId : null;
      const pick = chooseForItem(d, it, { dayUsed, weekUse, prevId, reason });
      if (!pick) continue;
      if (prevId && prevId !== pick.id && (reason === "block" || reason === "rotate")) {
        const old = d.exercises[prevId];
        changes.push(`${d.exercises[pick.id].name} remplace ${old?.name || prevId}${old && isStagnant(d, old) ? " (ne progressait plus)" : ""}`);
      }
      items.push({ ...it, exId: pick.id }); dayUsed.add(pick.id); weekUse[pick.id] = (weekUse[pick.id] || 0) + 1;
    }
    out[key] = sequenceItems(d, items);
  }
  d.program.templates = out; d.program.tplSig = tplSig(d); d.program.builtAt = todayISO();
  if (changes.length) d.program.changes = [{ date: todayISO(), msgs: [...new Set(changes)] }, ...(d.program.changes || [])].slice(0, 6);
}
/* Enchaînement : composés d'abord, point faible en tête des isolations, alternance des muscles,
   aucune isolation avant un composé qui sollicite le même muscle, abdos en dernier. */
function sequenceItems(d, items) {
  const comp = items.filter(x => !x.legs && (x.role === "main" || x.role === "secondary" || x.role === "accessory"));
  const legs = items.filter(x => x.legs);
  let isos = items.filter(x => !x.legs && x.role === "isolation" && x.m !== "abdos");
  const abs = items.filter(x => x.role === "isolation" && x.m === "abdos");
  const weak = d.profile.weakPoints || [];
  isos = [...isos.filter(x => weak.includes(x.m)), ...isos.filter(x => !weak.includes(x.m))];
  for (let i = 1; i < isos.length; i++) if (isos[i].m === isos[i - 1].m) {
    const j = isos.findIndex((x, k) => k > i && x.m !== isos[i - 1].m);
    if (j > 0) [isos[i], isos[j]] = [isos[j], isos[i]];
  }
  return [...comp, ...isos, ...legs, ...abs];
}
function coherenceChecks(d, items) {
  const ex = it => d.exercises[it.exId] || {};
  const out = [];
  const first = items[0];
  out.push({ ok: !!first && first.role !== "isolation", t: "Le mouvement le plus lourd ouvre la séance, quand tu es frais" });
  let pre = true;
  items.forEach((it, i) => { if (it.role !== "isolation") return; const m = it.m;
    if (items.slice(i + 1).some(x => x.role !== "isolation" && (ex(x).m?.[m] || 0) >= 0.5)) pre = false; });
  out.push({ ok: pre, t: "Aucune isolation avant un composé du même muscle (pas de pré-fatigue)" });
  let alt = true;
  for (let i = 1; i < items.length; i++) if (items[i].role === "isolation" && items[i - 1].role === "isolation" && items[i].m === items[i - 1].m) alt = false;
  out.push({ ok: alt, t: "Isolations en alternance : jamais deux fois le même muscle d’affilée" });
  const nLen = items.filter(it => ex(it).len).length;
  out.push({ ok: nLen >= 1, t: `${nLen} exercice${nLen > 1 ? "s" : ""} en position étirée (le signal de croissance le plus fort)` });
  const lastAbs = items.findIndex(it => it.m === "abdos");
  out.push({ ok: lastAbs < 0 || lastAbs === items.length - 1, t: "Abdos et gainage en fin de séance (le tronc reste solide pour les charges lourdes)" });
  return out;
}

/* Répartition hebdo des séries : on remplit le muscle le plus en déficit, jamais au-delà du temps dispo */
function repRange(d, it, ex, b) {
  const force = b.type === "force";
  if (it.role === "secondary") return force ? [6, 8] : [8, 10];
  if (ex.pat === "abs") return ex.unit === "s" ? [30, 60] : [10, 15];
  if (it.role === "accessory") return force ? [6, 10] : [8, 12];
  if (["lateral", "rear", "calf"].includes(ex.pat)) return [12, 20];
  return force ? [8, 12] : [10, 15];
}
function restFor(it, ex, b) {
  if (it.role === "main") return b.type === "force" ? 210 : 180;
  if (it.role === "secondary") return 120;
  if (it.role === "accessory") return 90;
  return ex.pat === "abs" ? 45 : 60;
}
function mainSetCount(d, it, wp) {
  const st = d.mains[it.slot];
  if (!effE1(d, it.slot)) return 5;
  if (wp.test) return 1;
  if (wp.deload) return 2;
  if (st.mode === "lin") return 4;
  return 1 + Math.max(1, wp.boffN - (it.second ? 1 : 0));
}
function estMinutes(list) {
  let s = 8; const pairs = new Set();
  for (const e of list) {
    const sets = Array.isArray(e.sets) ? e.sets.filter(t => t.type !== "warmup").length : (e.sets ?? e.plan?.sets ?? 3);
    const rest = e.plan?.rest ?? e.rest ?? 90;
    if (e.ss) { if (pairs.has(e.ss)) { s += (sets * 40) / 60; continue; } pairs.add(e.ss); }
    s += (sets * (40 + rest)) / 60 + (e.role === "main" ? 3 : 0);
  }
  return Math.round(s / 5) * 5;
}
function weekSetPlan(d, wpIn) {
  const b = curBlock(d); const wp = wpIn || weekParams(d, null);
  const keys = splitKeys(d); const tpl = d.program.templates || {}; const T = weekTargets(d);
  const plan = {}; const all = [];
  keys.forEach((k, di) => {
    let items = tpl[k] || [];
    if (wp.test) {
      const s = testSlotFor(d, k);
      const isos = items.filter(x => x.role === "isolation").slice(0, 2);
      items = s ? [{ role: "main", slot: s, exId: d.mains[s].variantId, test: true }, ...isos] : isos;
    }
    plan[k] = items.map(it => {
      const ex = d.exercises[it.exId];
      const [mn, mx] = it.role === "main" ? [wp.R, wp.R] : repRange(d, it, ex, b);
      const sets = it.role === "main" ? mainSetCount(d, it, wp) : it.role === "secondary" ? 3 : 2;
      return { ...it, sets, min: mn, max: mx, rest: restFor(it, ex, b) };
    });
    for (const x of plan[k]) all.push({ x, k });
  });
  if (!wp.test && !wp.deload) {
    const minutes = d.profile.sessionMinutes || 75;
    let guard = 0;
    while (guard++ < 80) {
      const c = {}; MKEYS.forEach(m => c[m] = 0);
      for (const { x } of all) for (const [m, v] of Object.entries(d.exercises[x.exId]?.m || {})) c[m] += x.sets * v;
      let best = null, bs = 0;
      for (const { x, k } of all) {
        if (x.role === "main" || x.role === "secondary") continue;
        if (x.sets >= (x.m === "abdos" ? 3 : 4)) continue;
        const def = (T[x.m] || 0) - c[x.m];
        if (def <= 0.75) continue;
        if (estMinutes(plan[k]) + (x.rest + 40) / 60 > minutes) continue;
        const sc = def * 10 - x.sets;
        if (sc > bs) { bs = sc; best = x; }
      }
      if (!best) break;
      best.sets += 1;
    }
  }
  if (wp.deload) for (const k of keys) for (const x of plan[k]) if (x.role !== "main") x.sets = Math.max(1, Math.ceil(x.sets * 0.5));
  if (wp.test) for (const k of keys) for (const x of plan[k]) if (x.role !== "main") x.sets = 2;
  return plan;
}

/* Rotation : la prochaine séance est celle qui suit la dernière faite — aucune séance sautée */
function nextDayKey(d) {
  const keys = splitKeys(d);
  const last = realDone(d).filter(s => keys.includes(s.dayKey)).pop();
  return last ? keys[(keys.indexOf(last.dayKey) + 1) % keys.length] : keys[0];
}
function plannedMap(data, days = 42) {
  const map = {}; const t0 = todayISO();
  const keys = splitKeys(data);
  const trainDays = data.profile.days || [];
  const doneToday = data.sessions.some(s => s.status === "done" && s.type !== "historique" && s.date === t0);
  let cur = keys.indexOf(nextDayKey(data));
  for (let i = 0; i <= days; i++) {
    const dte = addDays(t0, i);
    if (i === 0 && doneToday) continue;
    const ov = data.program.overrides[dte];
    if (ov === "rest") continue;
    if (ov && keys.includes(ov)) { map[dte] = ov; cur = keys.indexOf(ov) + 1; continue; }
    if (trainDays.includes(dow(dte))) { map[dte] = keys[((cur % keys.length) + keys.length) % keys.length]; cur++; }
  }
  return map;
}
function missedDates(data, back = 21) {
  const first = realDone(data)[0];
  if (!first) return [];
  const out = []; const t0 = todayISO();
  const trainDays = data.profile.days || [];
  for (let i = 1; i <= back; i++) {
    const dte = addDays(t0, -i);
    if (dte < first.date) break;
    const ov = data.program.overrides[dte];
    if (ov === "rest") continue;
    if (!ov && !trainDays.includes(dow(dte))) continue;
    if (!data.sessions.some(s => s.status === "done" && s.type !== "historique" && s.date === dte)) out.push(dte);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* CHARGES RÉELLES — l'échelle de ta machine                           */
/* ------------------------------------------------------------------ */
/* Les machines à plaques avancent par crans (4,5 kg) : toute charge prescrite
   tombe sur un cran réellement disponible, ancré sur ce que tu as déjà chargé. */
function chargeable(d, ex, x) {
  const inc = ex?.inc || 2.5; const a = ex?.anchor || 0;
  let L = a + Math.round((x - a) / inc) * inc;
  if (L < inc * 0.99) L += inc * Math.ceil((inc - L) / inc - 1e-9);
  /* affiche la valeur gravée sur ta machine si tu l'as déjà utilisée (41 plutôt que 40,5) */
  const lab = (ex?.labels || []).find(v => Math.abs(v - L) <= inc * 0.2 + 1e-9);
  return r25(lab ?? L);
}
function addLabels(ex, loads) { ex.labels = [...new Set([...(ex.labels || []), ...loads.filter(v => v > 0)])].sort((a, b) => a - b).slice(-40); }
/* Reps faisables à la charge L pour un RPE donné (inverse de la table §6.1) */
function repsAt(L, e1, P) {
  const f = (L / e1) * 100;
  if (f >= 100) return 1 - (10 - P);
  let i = RPE_ROW.findIndex(v => v < f);
  if (i < 0) return RPE_ROW.length - (10 - P);
  const hi = RPE_ROW[i - 1], lo = RPE_ROW[i];
  const idx = (i - 1) + (hi - f) / (hi - lo);
  return idx + 1 - (10 - P);
}
/* Meilleure combinaison charge × reps réellement chargeable pour viser R reps @ RPE P.
   push = le moteur préfère le cran du dessus dès qu'il reste faisable. */
function fitLoad(d, ex, e1, R, P, opt = {}) {
  const inc = ex.inc || 2.5;
  const c0 = chargeable(d, ex, e1 * pctOf(R, P));
  const cands = [c0 - inc, c0, c0 + inc].filter(L => L >= inc * 0.99).map(L => ({ L: r25(L), r: repsAt(L, e1, P) }));
  let pick = null;
  if (opt.push) pick = cands.filter(c => c.r >= Math.max(2.5, R - 1.5)).sort((a, b) => b.L - a.L)[0];
  if (!pick) pick = cands.sort((a, b) => (Math.abs(a.r - R) - Math.abs(b.r - R)) || (b.L - a.L))[0];
  return { load: pick.L, reps: clamp(Math.round(pick.r - 0.1), 1, R + 4) };
}
function rampsFor(ex, top) {
  const pts = [[0.5, 8], [0.7, 4], [0.85, 2]];
  const out = [];
  for (const [p, r] of pts) {
    const l = chargeable(null, ex, top * p);
    if (top - l >= (ex.inc || 2.5) * 1.5 && (!out.length || l - out[out.length - 1].load >= (ex.inc || 2.5))) out.push({ load: l, reps: r });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* MOTEUR FORCE — mouvements principaux                                */
/* ------------------------------------------------------------------ */
function mainGapWeeks(d, slot) {
  const h = exHistory(d, d.mains[slot].variantId);
  if (!h.length) return null;
  return daysBetween(h[h.length - 1].date, todayISO()) / 7;
}
function effE1(d, slot) {
  const s = d.mains[slot]; if (!s?.e1) return null;
  const gw = mainGapWeeks(d, slot);
  if (gw != null && gw > 3) return s.e1 * (1 - Math.min(0.15, 0.025 * (gw - 2)));
  return s.e1;
}
const P_ = x => String(x).replace(".", ",");
function prescribeMain(d, slot, wp, opts = {}) {
  const st = d.mains[slot]; const ex = d.exercises[st.variantId];
  const e1 = effE1(d, slot); const gw = mainGapWeeks(d, slot);
  const base = { slot, exId: st.variantId };
  if (!e1) return { ...base, calib: true, sets: 5, reps: 6,
    expl: `Calibration : séries de 6 en montant d’un cran à chaque série, jusqu’à sentir ~2 reps en réserve (RPE 8). Note le RPE de la dernière : j’initialise ton e1RM dessus.` };
  if (wp.test) {
    const adv = d.profile.level === "adv";
    const load = chargeable(d, ex, e1 * (adv ? 0.92 : 0.85));
    return { ...base, test: true, load, reps: adv ? 1 : 5, amrap: !adv, ramps: rampsFor(ex, load),
      expl: adv ? `Test : single à RPE 9 (repère ${fk(load)} kg). L’e1RM sera recalé dessus.` : `Test : AMRAP à ${fk(load)} kg (≈ 85 %) — le max de reps propres en gardant 1 en réserve. Ton e1RM est recalé dessus.` };
  }
  if (wp.deload) {
    const f = fitLoad(d, ex, e1, wp.R, 6);
    return { ...base, deload: true, load: f.load, sets: 2, reps: f.reps, P: 6,
      expl: `Deload : 2 × ${f.reps} à ${fk(f.load)} kg (RPE 6). On garde le geste, on recharge.` };
  }
  const reprise = gw != null && gw > 3;
  const force = wp.type === "force";
  if (st.mode === "lin") {
    const baseR = force ? 5 : 6;
    const load = st.linNext != null ? chargeable(d, ex, st.linNext) : fitLoad(d, ex, e1, baseR, reprise ? 7 : 8).load;
    const reps = st.linReps || baseR;
    const boff = chargeable(d, ex, load * 0.85);
    return { ...base, lin: true, load, sets: 3, reps, R: reps, P: 8.5, boff, boffReps: reps + 4, boffPct: 0.85, ramps: rampsFor(ex, load),
      expl: st.linNext != null ? `Progression linéaire : ${st.linMsg || "séance validée"} → 3 × ${reps} à ${fk(load)} kg, puis 1 back-off ${fk(boff)} kg × ${reps + 4}.`
        : `Progression linéaire${reprise ? " (reprise)" : ""} : 3 × ${reps} à ${fk(load)} kg sans dépasser RPE 8,5, puis 1 back-off. Chaque séance réussie, ça monte.` };
  }
  let P = st.resetP ? 7 : wp.P; const why = [];
  if (reprise) { P = Math.min(P, 6.5); why.push(`reprise après ~${Math.round(gw)} sem. : RPE 6,5, je recale aujourd’hui`); }
  const mom = (!reprise && !st.resetP) ? (st.momentum || 0) : 0;
  if (mom) { P = Math.min(9.5, P + mom); why.push("ta dernière top était facile : je monte"); }
  if (wp.strong && !reprise) why.push("forme au top : je te pousse");
  if (st.resetP) why.push("après 2 échecs, on repart à RPE 7 sur un e1RM corrigé");
  const fit = fitLoad(d, ex, e1, wp.R, P, { push: wp.strong || mom > 0 });
  const boffN = Math.max(1, wp.boffN - (opts.second ? 1 : 0));
  const boff = chargeable(d, ex, fit.load * wp.boffPct);
  const boffReps = clamp(Math.floor(repsAt(boff, e1, Math.max(7, P - 0.5)) + 0.3), fit.reps + 1, fit.reps + 5);
  const crans = fit.reps !== wp.R ? ` (cran machine : ${fit.reps} reps au lieu de ${wp.R} pour rester pile à RPE ${P_(P)})` : "";
  return { ...base, top: fit.load, R: fit.reps, P, boffN, boff, boffReps, boffPct: wp.boffPct, ramps: rampsFor(ex, fit.load), e1,
    expl: `Top set ${fk(fit.load)} kg × ${fit.reps} @ RPE ${P_(P)}${crans}, puis ${boffN} back-off${boffN > 1 ? "s" : ""} à ${fk(boff)} kg × ${boffReps}. e1RM ≈ ${fk(e1)} kg${why.length ? " — " + why.join(" ; ") : ""}.` };
}
/* Passage « volume » d'un main dans l'autre séance de la semaine : RPE plus bas, plus de reps, depuis l'e1RM */
function prescribeLight(d, slot, wp) {
  const st = d.mains[slot]; const ex = d.exercises[st.variantId]; const e1 = effE1(d, slot);
  if (!e1 || wp.test) return null;
  const R = wp.type === "force" ? 7 : 9;
  const P = wp.deload ? 6 : Math.min(8, (wp.P || 8) - 0.5);
  const f = fitLoad(d, ex, e1, R, P);
  return { slot, exId: ex.id, light: true, load: f.load, reps: f.reps, sets: wp.deload ? 2 : 3, P,
    expl: `Volume sur ton mouvement principal : ${wp.deload ? 2 : 3} × ${f.reps} à ${fk(f.load)} kg (RPE ${P_(P)}), calculé depuis ton e1RM. Il nourrit la séance lourde de la semaine.` };
}

/* ------------------------------------------------------------------ */
/* AUTORÉGULATION EN DIRECT — le moteur impose plus lourd s'il sent la marge */
/* ------------------------------------------------------------------ */
function liveAdjust(d, ee, si) {
  const ex = d.exercises[ee.exerciseId]; const t = ee.sets[si];
  if (!ex || !t || t.type === "warmup") return null;
  const inc = ex.inc || 2.5;
  const rpe = t.rpe ?? rirToRpe(t.rir);
  const rir = t.rir ?? (t.rpe != null ? 10 - t.rpe : null);
  const rec = ee.rec || {};
  const undone = ee.sets.filter(x => !x.done && x.type !== "warmup");
  const setLoad = (arr, f) => arr.forEach(x => { if (x.load != null) x.load = chargeable(d, ex, f(x.load)); });
  const boffs = undone.filter(x => x.type === "backoff");
  if (ee.role === "main" && rec.top != null) {
    if (t.type === "top") {
      if (rpe == null) return null;
      const P = rec.P, R = rec.R;
      const liveE1 = e1From(t.load, t.reps, rpe);
      const topsDone = ee.sets.filter(x => x.type === "top" && x.done).length;
      if (rpe >= 10 || t.reps < R) { setLoad(boffs, x => x * 0.9); ee.failFlag = true;
        return `Top set manqué : back-offs −10 % pour finir propre. C’est une donnée, pas un échec — l’e1RM s’ajustera.`; }
      if (rpe >= P + 1) { setLoad(boffs, x => x * 0.95); if (boffs.length > 1) ee.sets.splice(ee.sets.indexOf(boffs[boffs.length - 1]), 1);
        return `Plus dur que prévu (RPE ${P_(rpe)} pour ${P_(P)}) : back-offs −5 % et une série en moins.`; }
      if (rpe <= P - 1 && topsDone === 1 && !ee.sets.some(x => x.type === "top" && !x.done)) {
        const nt = Math.max(fitLoad(d, ex, liveE1, R, P, { push: true }).load, r25(t.load + inc));
        ee.sets.splice(si + 1, 0, { id: uid(), type: "top", top: true, load: nt, reps: R, rir: null, rpe: null, done: false, imposed: true });
        const nb = chargeable(d, ex, nt * (rec.boffPct || 0.87));
        boffs.forEach(x => x.load = nb);
        return `RPE ${P_(rpe)} pour ${P_(P)} visé : tu as de la marge. 2ᵉ top set imposé à ${fk(nt)} kg × ${R}, back-offs remontés à ${fk(nb)} kg.`;
      }
      if (topsDone >= 2) {
        const tops = ee.sets.filter(x => x.type === "top" && x.done);
        const best = Math.max(...tops.map(x => x.load || 0));
        let nb = chargeable(d, ex, best * (rec.boffPct || 0.87));
        if (rpe >= P + 1 || t.reps < R) nb = chargeable(d, ex, nb * 0.95);
        boffs.forEach(x => x.load = nb);
        return rpe >= P + 1 || t.reps < R ? `2ᵉ top plus dur : back-offs à ${fk(nb)} kg.` : `2ᵉ top validé à ${fk(t.load)} kg : back-offs à ${fk(nb)} kg. Ton e1RM va monter.`;
      }
      return null;
    }
    if (t.type === "backoff") {
      const nx = boffs[0];
      if (!nx) return null;
      if (t.reps < (rec.boffReps || 0) - 1) { nx.load = chargeable(d, ex, nx.load * 0.95); return `Back-off sous la cible : la suivante à ${fk(nx.load)} kg.`; }
      if (!ee.boffUp && t.reps >= (rec.boffReps || 0) && ((rpe != null && rpe <= 7) || (rir != null && rir >= 3))) {
        ee.boffUp = true; setLoad(boffs, x => x + inc);
        return `Back-off facile : +${fk(inc)} kg sur les suivantes.`;
      }
    }
    return null;
  }
  if (ee.role === "main" && rec.lin && t.type === "normal") {
    const rest = undone.filter(x => x.type === "normal");
    if (!ee.liveUp && rest.length && t.reps >= rec.reps && rpe != null && rpe <= 7) {
      ee.liveUp = true; setLoad(rest, x => x + inc); setLoad(boffs, x => x + inc * 0.85);
      return `RPE ${P_(rpe)} : trop facile pour progresser. +${fk(inc)} kg imposés sur les séries suivantes.`;
    }
    if (!ee.liveDown && rest.length && t.reps < rec.reps - 1) {
      ee.liveDown = true; setLoad(rest, x => x * 0.95);
      return `Reps manquées : −5 % sur la suite pour rester dans la bonne zone.`;
    }
    return null;
  }
  /* secondaires, accessoires, isolations */
  const plan = ee.plan || {};
  if (plan.min == null || ex.kind === "bw" || ex.unit === "s") return null;
  const rest = undone.filter(x => x.type === "normal" || x.type === "amrap");
  if (!rest.length) return null;
  const easy = t.reps >= plan.max + 2 || (t.reps >= plan.max && rir != null && rir >= 3);
  const hard = t.reps < plan.min - 1 && (rir == null || rir <= 1);
  if (easy && !ee.liveUp) {
    ee.liveUp = true;
    if (ex.kind === "bwAssist") { rest.forEach(x => { if ((x.assist || 0) > 0) x.assist = Math.max(0, x.assist - 5); else x.extra = (x.extra || 0) + 2.5; });
      return `Trop facile : ${rest[0].assist ? `assistance −5 kg` : `+2,5 kg de lest`} sur les séries restantes.`; }
    setLoad(rest, x => x + inc);
    return `${t.reps} reps${rir != null ? ` à RIR ${rir}` : ""} : trop léger. +${fk(inc)} kg imposés sur les séries restantes.`;
  }
  if (hard && !ee.liveDown) {
    ee.liveDown = true;
    if (ex.kind === "bwAssist") { rest.forEach(x => { if (x.extra) x.extra = Math.max(0, x.extra - 2.5); else x.assist = (x.assist || 0) + 5; }); return "Sous la plage : un peu d’aide en plus sur la suite."; }
    setLoad(rest, x => Math.max(inc, x - inc));
    return `Sous la plage (${t.reps} reps) : −${fk(inc)} kg sur la suite pour rester entre ${plan.min} et ${plan.max}.`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* FIN DE SÉANCE — e1RM, mode linéaire, élan, échecs                    */
/* ------------------------------------------------------------------ */
function applyMainResults(d, session) {
  const updates = [];
  for (const e of session.entries) {
    if (!e.slot || !(e.role === "main" || e.rec?.light)) continue;
    const st = d.mains[e.slot]; const ex = d.exercises[e.exerciseId];
    if (!st || !ex || st.variantId !== e.exerciseId) continue;
    const work = (e.sets || []).filter(t => t.done !== false && t.type !== "warmup" && t.load);
    if (!work.length) continue;
    const rec = e.rec || {};
    let best = 0;
    for (const t of work) {
      const rpe = t.rpe ?? rirToRpe(t.rir);
      if (t.reps && rpe != null && rpe >= 6.5 && t.reps <= 12) best = Math.max(best, e1From(t.load, t.reps, rpe));
    }
    if (!best && (rec.calib || rec.lin || rec.light)) {
      const heavy = [...work].filter(t => t.type !== "backoff").sort((a, b) => b.load - a.load)[0];
      if (heavy) best = e1From(heavy.load, Math.min(heavy.reps, 12), 8);
    }
    const nm = SLOTS[e.slot].name;
    if (best > 0) {
      const prev = st.e1;
      const alpha = rec.light ? 0.3 : 0.5;
      let next = rec.test || !prev ? best : prev * (1 - alpha) + best * alpha;
      if (prev && !rec.test) next = clamp(next, prev * 0.925, prev * 1.05);
      next = Math.round(next * 10) / 10;
      st.e1 = next; ex.e1 = next;
      st.hist.push({ date: session.date, v: next, source: rec.test ? "test" : "set" });
      ex.e1Hist = [...(ex.e1Hist || []), { date: session.date, v: next, source: "main" }].slice(-60);
      if (prev && Math.abs(next - prev) >= 0.5) updates.push(`${nm} (${ex.name}) : e1RM ${fk(prev)} → ${fk(next)} kg`);
      else if (!prev) updates.push(`${nm} : e1RM initialisé à ${fk(next)} kg`);
    }
    ex.anchor = Math.max(...work.map(t => t.load)); addLabels(ex, work.map(t => t.load));
    if (rec.light) continue;
    /* élan : top set facile → la prochaine séance monte d'un cran de RPE */
    if (rec.top != null) {
      const top = work.find(t => t.type === "top");
      const trpe = top ? (top.rpe ?? rirToRpe(top.rir)) : null;
      st.momentum = trpe != null && trpe <= rec.P - 1 ? 0.5 : 0;
    }
    const failed = !!e.failFlag || work.some(t => { const rpe = t.rpe ?? rirToRpe(t.rir);
      return (t.type === "top" && (rpe >= 10 || t.reps < (rec.R || 0))) || (rec.lin && t.type === "normal" && (rpe >= 10 || t.reps < rec.reps - 1)); });
    if (rec.lin) {
      const baseR = curBlock(d).type === "force" ? 5 : 6;
      const normals = work.filter(t => t.type === "normal");
      const topLoad = Math.max(...normals.map(t => t.load));
      const atTop = normals.filter(t => t.load === topLoad);
      const inc = ex.inc || 2.5;
      const coarse = inc / topLoad > 0.07;
      const rpes = atTop.map(t => t.rpe ?? rirToRpe(t.rir));
      const repsOk = atTop.length >= 2 && atTop.every(t => t.reps >= (rec.reps || baseR));
      const allEasy = rpes.length && rpes.every(r => r != null && r <= 7);
      const hardish = rpes.some(r => r != null && r >= 9);
      if (repsOk && !failed && !hardish) {
        st.fails = 0;
        const curReps = Math.min(...atTop.map(t => t.reps));
        if (coarse && curReps < baseR + 3 && !allEasy) { st.linNext = topLoad; st.linReps = curReps + 1; st.linMsg = `+1 rep (le cran de ${fk(inc)} kg est gros pour cette charge)`; }
        else { const jumps = allEasy && !coarse ? 2 : 1; st.linNext = topLoad + jumps * inc; st.linReps = baseR;
          st.linMsg = jumps === 2 ? `tout à RPE ≤ 7 : +${fk(2 * inc)} kg d’un coup` : `+${fk(inc)} kg validés`; }
      } else if (failed) {
        st.fails = (st.fails || 0) + 1;
        if (st.fails >= 2) { st.linNext = chargeable(d, ex, topLoad * 0.925); st.fails = 0; st.resets = (st.resets || 0) + 1; st.linReps = baseR; st.linMsg = "−7,5 % après 2 échecs, on repart plus vite"; updates.push(`${nm} : −7,5 % après 2 échecs, on reconstruit.`); }
        else { st.linNext = topLoad; st.linMsg = "on retente la même charge"; }
      } else { st.linNext = topLoad; st.linReps = rec.reps; st.linMsg = "RPE 9 atteint : on consolide cette charge"; }
      if ((st.resets || 0) >= 3) { st.mode = "rpe"; updates.push(`${nm} : passage au pilotage par blocs (RPE) — le linéaire a donné ce qu’il pouvait.`); }
    } else if (rec.top != null) {
      if (failed) {
        st.fails = (st.fails || 0) + 1;
        if (st.fails >= 2) { st.e1 = Math.round(st.e1 * 0.95 * 10) / 10; ex.e1 = st.e1; st.resetP = true; st.fails = 0; st.hist.push({ date: session.date, v: st.e1, source: "fail" }); updates.push(`${nm} : e1RM −5 % après 2 échecs — la prochaine repart à RPE 7.`); }
      } else { st.fails = 0; st.resetP = false; }
    }
    if (st.mode === "lin" && st.hist.length >= 6) {
      const h = st.hist.slice(-6); const span = daysBetween(h[0].date, h[5].date);
      if (span >= 21) {
        const slope = (linregSlope(h.map(x => ({ x: daysBetween(h[0].date, x.date), y: x.v }))) / (st.e1 || 1)) * 100;
        if (slope < 0.75) { st.mode = "rpe"; updates.push(`${nm} : progression < 0,75 %/sem → pilotage par blocs (RPE).`); }
      }
    }
  }
  return updates;
}

/* ------------------------------------------------------------------ */
/* MOTEUR HYPERTROPHIE — accessoires (double progression accélérée)    */
/* ------------------------------------------------------------------ */
function defaultPlanFor(data, exId) {
  const plan = weekSetPlan(data);
  for (const k of Object.keys(plan)) { const it = plan[k].find(x => x.exId === exId && x.role !== "main"); if (it) return { sets: it.sets, min: it.min, max: it.max, rest: it.rest }; }
  const ex = data.exercises[exId]; const b = curBlock(data);
  const [min, max] = repRange(data, { role: ex?.iso ? "isolation" : "accessory" }, ex || {}, b);
  return { sets: 3, min, max, rest: ex?.iso ? 60 : 90 };
}
function recommend(data, exId, plan, ctx = {}) {
  const ex = data.exercises[exId];
  const h = exHistory(data, exId);
  const inc = ex.inc || 2.5;
  let sets = plan.sets, note = null;
  const rd = ctx.readiness;
  if (ctx.deload) note = "Deload : volume réduit, garde de la marge.";
  const base = { exId, sets, min: plan.min, max: plan.max, rest: plan.rest, amrap: !!plan.amrap, note };
  const mid = Math.round((plan.min + plan.max) / 2);
  if (!h.length) {
    if (ex.e1 && !["bw", "bwAssist"].includes(ex.kind)) {
      const f = fitLoad(data, ex, ex.e1, mid, 8);
      return { ...base, mode: "e1", load: f.load, pref: Array(sets).fill(clamp(f.reps, plan.min, plan.max)),
        phrase: `Prescrit depuis ton e1RM (≈ ${fk(ex.e1)} kg) : ${fk(f.load)} kg, ~2 reps en réserve.` };
    }
    return { ...base, mode: "discover", load: null, pref: Array(sets).fill(mid),
      phrase: (ex.kind === "bw" || ex.kind === "bwAssist") ? "Premier passage : séries propres avec ~2 reps de marge — je calibre dès aujourd’hui."
        : `Premier passage : prends une charge qui te laisse ~2 reps de marge sur ${plan.min}-${plan.max}. Note le RIR : je m’ajuste dès la 2ᵉ série.` };
  }
  const last = h[h.length - 1];
  const gap = daysBetween(last.date, todayISO());
  if (ex.kind === "bw") {
    const best = Math.max(...last.main.map(t => t.reps));
    if (gap > 28) return { ...base, mode: "recal", load: null, pref: Array(sets).fill(Math.max(plan.min, Math.round(best * 0.7))), phrase: `Reprise : vise ~70 % de ton ancien max (${best}), 2-3 de marge.` };
    return { ...base, mode: "keep", load: null, pref: Array(sets).fill(best), phrase: `Objectif : égaler ou battre ${best}${ex.unit === "s" ? " s" : " reps"} sur ta meilleure série.` };
  }
  if (ex.kind === "bwAssist") {
    const la = last.main;
    const minA = Math.min(...la.map(t => t.assist || 0));
    const bestReps = Math.max(...la.filter(t => (t.assist || 0) === minA).map(t => t.reps));
    const extraMax = Math.max(...la.map(t => t.extra || 0));
    if (gap > 28) {
      const sugA = minA > 0 ? minA : (bestReps < plan.min + 2 ? 10 : 0);
      return { ...base, mode: "recal", assist: sugA, extra: 0, load: null, pref: Array(sets).fill(Math.max(plan.min, Math.ceil(bestReps * 0.7))),
        phrase: sugA ? `Reprise : ~${sugA} kg d’assistance à 2-3 de réserve — je recale aujourd’hui.` : `Reprise : poids du corps à 2-3 de réserve, sans viser ton ancien max (${bestReps}).` };
    }
    const full = la.length >= plan.sets && la.every(t => t.reps >= plan.max);
    const crushed = la.every(t => t.reps >= plan.max + 2);
    if (full && minA > 0) { const na = Math.max(0, minA - (crushed ? 10 : 5));
      return { ...base, mode: "inc", assist: na, extra: 0, load: null, pref: Array(sets).fill(plan.min), phrase: na > 0 ? `Passe à −${na} kg d’assistance : ${plan.max}+ reps validées partout.` : `Essaie au poids du corps : validé avec seulement ${minA} kg d’aide.` }; }
    if (full && minA === 0) { const ne = (extraMax || 0) + (crushed ? 5 : 2.5);
      return { ...base, mode: "inc", assist: 0, extra: ne, load: null, pref: Array(sets).fill(plan.min), phrase: `Lest +${fk(ne)} kg : le poids du corps est validé sur toutes les séries.` }; }
    const tot = la.reduce((a, t) => a + t.reps, 0);
    return { ...base, mode: "keep", assist: minA, extra: extraMax || 0, load: null, targetTotal: tot + 1,
      pref: la.slice(0, sets).map(t => clamp(t.reps, Math.max(1, plan.min - 2), plan.max)).concat(Array(Math.max(0, sets - la.length)).fill(plan.min)),
      phrase: `${minA > 0 ? `Garde −${minA} kg d’aide` : extraMax ? `Garde +${fk(extraMax)} kg` : "Poids du corps"} et vise ≥ ${tot + 1} reps totales (dernière fois : ${tot}).` };
  }
  const top = Math.max(...last.main.map(t => t.load || 0));
  const atTop = last.main.filter(t => t.load === top);
  const lastRange = [Math.min(...last.main.map(t => t.reps)), Math.max(...last.main.map(t => t.reps))];
  if (ex.e1 && gap <= 28 && (lastRange[1] < plan.min - 1 || lastRange[0] > plan.max + 1)) {
    const f = fitLoad(data, ex, ex.e1, mid, 8.5);
    if (Math.abs(f.load - top) >= inc) return { ...base, mode: "e1", load: f.load, pref: Array(sets).fill(clamp(f.reps, plan.min, plan.max)),
      phrase: `Nouvelle plage ${plan.min}-${plan.max} : charge calculée depuis ton e1RM → ${fk(f.load)} kg (au lieu de ${fk(top)}).` };
  }
  if (gap > 28) {
    const rl = chargeable(data, ex, Math.max(inc, top - inc));
    return { ...base, mode: "recal", load: rl, pref: Array(sets).fill(mid), phrase: `Reprise après ~${Math.round(gap / 7)} sem. : 1 cran sous ton ancien ${fk(top)} kg, 2-3 de réserve.` };
  }
  const rirs = atTop.map(t => t.rir ?? (t.rpe != null ? 10 - t.rpe : null)).filter(v => v != null);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const margin = avgRir == null || avgRir >= 1;
  const full = atTop.length >= Math.min(plan.sets, 2) && atTop.every(t => t.reps >= plan.max);
  const crushed = atTop.every(t => t.reps >= plan.max + 2) || (full && avgRir != null && avgRir >= 3);
  const coarse = inc / top > 0.1;
  if (full && margin) {
    if (rd != null && rd < 2.8) return { ...base, mode: "keep", load: top, pref: Array(sets).fill(plan.max), phrase: `Montée gagnée, mais récup basse : garde ${fk(top)} kg aujourd’hui.` };
    if (coarse && !crushed) return { ...base, mode: "keepPlus", load: top, pref: Array(sets).fill(plan.max + 2),
      phrase: `Le cran (${fk(inc)} kg) pèse ${Math.round((inc / top) * 100)} % de la charge : vise d’abord ${plan.max + 2} reps partout à ${fk(top)} kg, puis on saute.` };
    let nl = chargeable(data, ex, top + inc), jumped = false;
    if (crushed && ex.e1) { const f = fitLoad(data, ex, ex.e1, plan.min + 1, 8.5, { push: true }); if (f.load > nl) { nl = Math.min(f.load, chargeable(data, ex, top + 2 * inc)); jumped = nl > top + inc * 1.01; } }
    return { ...base, mode: "inc", load: nl, pref: Array(sets).fill(plan.min + 1),
      phrase: jumped ? `Largement au-dessus (${atTop.map(t => t.reps).join("/")} reps) : +2 crans d’un coup → ${fk(nl)} kg.` : `Passe à ${fk(nl)} kg : ${plan.max}+ reps validées partout à ${fk(top)} kg.` };
  }
  const lows = atTop.filter(t => t.reps < plan.min).length;
  if (atTop.length >= 2 && lows >= Math.ceil(atTop.length / 2)) {
    const prevEn = h.length >= 2 ? h[h.length - 2] : null;
    if (prevEn) {
      const ptop = Math.max(...prevEn.main.map(t => t.load || 0));
      const pat = prevEn.main.filter(t => t.load === ptop);
      if (ptop === top && pat.length >= 2 && pat.filter(t => t.reps < plan.min).length >= Math.ceil(pat.length / 2)) {
        const dl = chargeable(data, ex, Math.max(inc, top - inc));
        return { ...base, mode: "down", load: dl, pref: Array(sets).fill(Math.min(plan.max, plan.min + 1)), phrase: `Deux séances sous ${plan.min} reps à ${fk(top)} kg : ${fk(dl)} kg pour reconstruire, tu remonteras en 2-3 séances.` };
      }
    }
    return { ...base, mode: "hold", load: top, pref: Array(sets).fill(plan.min), phrase: `Garde ${fk(top)} kg : consolide ${sets} × ${plan.min} propres avant de monter.` };
  }
  const tot = atTop.reduce((a, t) => a + t.reps, 0);
  const tgt = Math.min(tot + 1, sets * plan.max);
  return { ...base, mode: "keep", load: top, targetTotal: tgt,
    pref: atTop.slice(0, sets).map(t => clamp(t.reps, plan.min, plan.max)).concat(Array(Math.max(0, sets - atTop.length)).fill(plan.min)),
    phrase: `Garde ${fk(top)} kg : tu progresses en reps — vise ≥ ${tgt} au total (dernière fois : ${tot}).` };
}
function applyAccessoryE1(d, session) {
  for (const e of session.entries) {
    if (e.slot && (e.role === "main" || e.rec?.light)) continue;
    const ex = d.exercises[e.exerciseId]; if (!ex || ex.kind === "bw") continue;
    let best = 0, topL = 0;
    for (const t of (e.sets || [])) {
      if (t.done === false || t.type === "warmup") continue;
      const eff = setEff(ex, t, d, session.date); if (!eff) continue;
      if (t.load) topL = Math.max(topL, t.load);
      const rpe = t.rpe ?? rirToRpe(t.rir) ?? 8;
      best = Math.max(best, e1From(eff, Math.min(t.reps, 15), rpe));
    }
    if (topL) { ex.anchor = topL; addLabels(ex, (e.sets || []).filter(t => t.done !== false && t.load).map(t => t.load)); }
    if (best > 0) {
      ex.e1 = Math.round((ex.e1 ? ex.e1 * 0.5 + best * 0.5 : best) * 10) / 10;
      ex.e1Hist = [...(ex.e1Hist || []), { date: session.date, v: ex.e1, source: "set" }].slice(-60);
    }
  }
}

/* ------------------------------------------------------------------ */
/* FATIGUE, OBJECTIFS, NUTRITION                                       */
/* ------------------------------------------------------------------ */
function readiness(ck) {
  if (!ck || ck.sleep == null) return null;
  return (ck.sleep + ck.energy + ck.motivation + (6 - ck.soreness) + (6 - (ck.stress || 3))) / 5;
}
function readinessTrend(data) {
  const scores = data.sessions.filter(s => s.status === "done" && s.checkin).slice(-5).map(s => readiness(s.checkin)).filter(v => v != null);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}
function deloadTriggers(d) {
  const reasons = []; const t0 = todayISO();
  let drops = 0;
  for (const k of activeSlots(d)) {
    const h = d.mains[k].hist;
    if (h.length >= 3) { const recent = h[h.length - 1].v, peak = Math.max(...h.slice(-6).map(x => x.v)); if (recent < peak * 0.95) drops++; }
  }
  if (drops >= 2) reasons.push("e1RM en baisse de plus de 5 % sur 2 mouvements principaux");
  const tr = readinessTrend(d);
  if (tr != null && tr < 2.8) reasons.push("forme sous 2,8 / 5 sur les dernières séances");
  const fails = new Set();
  for (const s of realDone(d).filter(s => daysBetween(s.date, t0) <= 7)) for (const e of s.entries) if (e.failFlag && e.slot) fails.add(e.slot);
  if (fails.size >= 2) reasons.push("2 échecs sur des mouvements différents cette semaine");
  return reasons;
}
function miniDeloadActive(d) { return !!(d.prefs?.mini && daysBetween(todayISO(), d.prefs.mini) >= 0); }
/* Machines : pas de standards universels (chaque machine a sa courbe) → objectifs personnels + projection */
function strengthGoals(d) {
  const bw = ma7(d.weights, todayISO()) || d.profile.weight;
  return activeSlots(d).map(k => {
    const st = d.mains[k]; const ex = d.exercises[st.variantId];
    const h = st.hist || [];
    const base = h.length ? h[0].v : st.e1;
    const target = d.goals?.[k] || (base ? Math.round(base * 1.25) : null);
    let slope = null, pctWk = null, weeksTo = null;
    const rh = h.filter(x => daysBetween(x.date, todayISO()) <= 56);
    if (rh.length >= 3 && daysBetween(rh[0].date, rh[rh.length - 1].date) >= 10) {
      slope = linregSlope(rh.map(x => ({ x: daysBetween(rh[0].date, x.date), y: x.v })));
      pctWk = st.e1 ? (slope / st.e1) * 100 : null;
      if (slope > 0.05 && target && st.e1 < target) weeksTo = Math.ceil((target - st.e1) / slope);
    }
    return { slot: k, ex, e1: st.e1, base, target, gain: base && st.e1 ? (st.e1 / base - 1) * 100 : null, pctWk, weeksTo: weeksTo && weeksTo < 80 ? weeksTo : null, rel: st.e1 && bw ? st.e1 / bw : null, mode: st.mode };
  });
}
function tdee(d) {
  const p = d.profile; const bw = ma7(d.weights, todayISO()) || p.weight;
  if (!bw || !p.height || !p.age) return null;
  return Math.round((10 * bw + 6.25 * p.height - 5 * p.age + (p.sex === "F" ? -161 : 5)) * (p.activity || 1.5));
}
function kcalTarget(d) {
  const t = tdee(d); if (!t) return null;
  return ({ bulk: t + 250, recompo: t - 150, seche: t - 400 })[d.profile.phase] ?? t;
}
function protTarget(d) {
  const bw = ma7(d.weights, todayISO()) || d.profile.weight; if (!bw) return null;
  return Math.round(bw * (d.profile.phase === "seche" || d.profile.phase === "recompo" ? 2.1 : 1.8));
}
/* Remplacement : même pattern d'abord, puis même muscle — classé par le score du moteur */
function alternativesFor(data, exId, extraZones) {
  const ex = data.exercises[exId]; const prim = primM(ex);
  const fam = { curl: ["curl", "curl_len"], curl_len: ["curl_len", "curl"], tri_oh: ["tri_oh", "tri_push"], tri_push: ["tri_push", "tri_oh"], hpush: ["hpush", "incline"], incline: ["incline", "hpush"], dip: ["dip", "tri_push", "hpush"], vpull: ["vpull", "pullover"], pullover: ["pullover", "vpull"] }[ex.pat] || [ex.pat];
  const it = { pats: fam, m: prim };
  const ctx = { weekUse: {}, prevId: null, reason: "swap" };
  return Object.values(data.exercises)
    .filter(e => e.id !== exId && exAvailable(data, e, extraZones) && (fam.includes(e.pat) || (e.m?.[prim] || 0) >= 0.75))
    .map(e => ({ e, same: fam.indexOf(e.pat), s: scoreForItem(data, e, it, ctx) }))
    .sort((a, b) => ((a.same < 0 ? 9 : a.same) - (b.same < 0 ? 9 : b.same)) || (b.s - a.s))
    .slice(0, 6).map(x => x.e);
}
function setMainVariant(d, k, id) {
  const st = d.mains[k]; if (st.variantId === id) return;
  const ex = d.exercises[id];
  st.variantId = id; st.e1 = ex?.e1 || null; st.hist = st.e1 ? [{ date: todayISO(), v: st.e1, source: "variante" }] : [];
  st.mode = st.e1 ? st.mode : "lin"; st.linNext = null; st.linReps = null; st.fails = 0; st.momentum = 0; st.resetP = false;
}
/* RECORDS / COMPARAISONS / DIVERS                                     */
/* ------------------------------------------------------------------ */
function computeRecords(data, exId, excludeSid = null) {
  const ex = data.exercises[exId];
  const h = exHistory(data, exId).filter(en => en.sid !== excludeSid);
  const R = { rmap: {} };
  for (const en of h) for (const t of en.sets) {
    if (["machine", "cable", "barbell", "dumbbell", "smith"].includes(ex.kind)) {
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
function newRecordsForSession(data, session) {
  const msgs = [];
  for (const e of session.entries) {
    const ex = data.exercises[e.exerciseId]; if (!ex) continue;
    const R = computeRecords(data, e.exerciseId, session.id);
    const work = (e.sets || []).filter(t => t.done !== false && !t.uncertain && t.type !== "warmup");
    let best = null;
    for (const t of work) {
      if (["machine", "cable", "barbell", "dumbbell", "smith"].includes(ex.kind)) {
        if (t.load == null) continue;
        if (t.load > (R.load?.v ?? 0)) best = `${ex.name} : nouvelle charge max — ${fk(t.load)} kg`;
        else if (R.rmap[t.load] != null && t.reps > R.rmap[t.load].v) best = best || `${ex.name} : ${t.reps} reps à ${fk(t.load)} kg (record)`;
      } else if (ex.kind === "bwAssist") {
        const a = t.assist || 0, x = t.extra || 0;
        if (x > (R.maxExtra?.v ?? 0)) best = `${ex.name} : lest record — +${fk(x)} kg`;
        else if (!a && !x && t.reps > (R.bwReps?.v ?? 0)) best = best || `${ex.name} : record au poids du corps — ${t.reps} reps`;
        else if (a && R.minAssist && a < R.minAssist.v) best = best || `${ex.name} : assistance la plus basse — −${a} kg`;
      } else if (t.reps > (R.bwReps?.v ?? 0)) best = `${ex.name} : record — ${t.reps} reps`;
    }
    if (best) msgs.push(best);
  }
  return msgs;
}
function compareEntry(data, ex, prevEn, curSets, dateC) {
  if (!prevEn) return { v: "ref", phrase: "Première référence enregistrée pour cet exercice." };
  const f = (sets, date) => { let e1 = 0, topEff = 0, tot = 0; for (const t of sets) { const eff = setEff(ex, t, data, date) ?? t.load ?? 0; const e = EPS(eff, t.reps); if (e > e1) e1 = e; if (eff > topEff) topEff = eff; tot += t.reps || 0; } return { e1, topEff, tot }; };
  const a = f(prevEn.main, prevEn.date), b = f(curSets, dateC);
  if (ex.kind === "bwAssist") {
    const aA = Math.min(...prevEn.main.map(t => t.assist || 0)), bA = Math.min(...curSets.map(t => t.assist || 0));
    if (bA < aA && b.tot >= a.tot * 0.85) return { v: "up", phrase: `Assistance réduite de ${aA} à ${bA} kg pour un travail équivalent : vraie progression.` };
    if (bA > aA) return { v: "mid", phrase: `Plus d’assistance qu’avant : séance de gestion, pas un recul définitif.` };
  }
  const dd = a.e1 ? ((b.e1 - a.e1) / a.e1) * 100 : 0;
  if (b.topEff > a.topEff && dd >= -0.5) return { v: "up", phrase: `Plus lourd qu’à la dernière séance (${fk(b.topEff)} vs ${fk(a.topEff)} kg).` };
  if (b.topEff === a.topEff && b.tot > a.tot) return { v: "up", phrase: `+${b.tot - a.tot} reps au total à charge égale.` };
  if (dd > 1.5) return { v: "up", phrase: "Force estimée en hausse par rapport à la dernière séance." };
  if (b.tot < a.tot && b.topEff >= a.topEff) return { v: "mid", phrase: "Moins de volume mais une intensité au moins égale : séance comparable." };
  if (dd < -3 && b.tot < a.tot) return { v: "down", phrase: "Un peu en dessous — regarde ta récupération, pas de conclusion sur une seule séance." };
  return { v: "mid", phrase: "Séance similaire à la précédente." };
}
function stagnation(data, exId, plan) {
  const ex = data.exercises[exId];
  const h = exHistory(data, exId).filter(en => daysBetween(en.date, todayISO()) <= 60);
  if (h.length < 4) return null;
  const recent = h.slice(-4);
  const score = en => { let m = 0; for (const t of en.main) { const eff = setEff(ex, t, data, en.date) ?? t.load ?? 0; const e = ex.kind === "bw" ? t.reps : EPS(eff, t.reps); if (e > m) m = e; } return m; };
  const ss = recent.map(score);
  if (Math.max(...ss.slice(-2)) > Math.max(...ss.slice(0, 2)) * 1.005) return null;
  const sug = [
    ex.len ? "Garde la charge et vise +1 rep par séance" : "Passe à une variante à biais étiré du même mouvement",
    plan && plan.max <= 10 ? "Change temporairement de plage : 12-15 un cran plus léger" : "Change temporairement de plage : 8-12 un peu plus lourd",
    "Redescends d’un cran et remonte en 2 séances avec plus de marge",
  ];
  const tr = readinessTrend(data);
  if (tr != null && tr < 3) sug.unshift("Ta récupération récente est basse : dors et mange d’abord, la charge suivra");
  return { n: recent.length, since: recent[0].date, suggestions: sug.slice(0, 4) };
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
      let m = 0; for (const t of en.main) { const eff = setEff(ex, t, data, en.date) ?? t.load; const rpe = t.rpe ?? rirToRpe(t.rir); const e = rpe ? e1From(eff, Math.min(t.reps, 12), rpe) : EPS(eff, t.reps); if (e > m) m = e; }
      v = m || null; if (ex.kind === "bw") v = null;
    } else if (metric === "reps") {
      if (ex.kind !== "bw" && ex.kind !== "bwAssist") {
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
function morphoTips(profile, ex) {
  const m = profile.morpho || {}; const tips = [];
  const longArms = m.arms === "longs" || (m.wingspan && profile.height && m.wingspan - profile.height >= 5);
  const limMob = m.shoulderMob === "limitee";
  if (longArms) {
    if (ex.pat === "hpush" || ex.pat === "incline") tips.push("Bras longs : poignées un peu plus larges, amplitude contrôlée sans forcer l’étirement max.");
    if (ex.pat === "vpull") tips.push("Bras longs : penche légèrement le buste et tire les coudes vers les hanches.");
    if (ex.pat === "dip") tips.push("Bras longs : descends jusqu’à coudes ~90°, pas plus bas si l’épaule tire.");
    if (ex.pat === "hinge") tips.push("Bras longs : avantage au soulevé — garde la barre collée aux jambes.");
  }
  if ((m.femur === "long" || m.torso === "court") && ex.pat === "squat") tips.push("Fémurs longs : talons surélevés ou front squat gardent le buste plus droit.");
  if (limMob) {
    if (ex.pat === "vpush") tips.push("Mobilité d’épaule limitée : préfère une prise neutre ou légèrement inclinée.");
    if (ex.pat === "hpush" || ex.pat === "incline") tips.push("Mobilité limitée : coudes à ~45° du buste plutôt qu’écartés à 90°.");
  }
  return tips.slice(0, 1);
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
    const suff = p.t.type === "backoff" ? " (back-off)" : p.t.type === "top" ? " (top)" : p.t.type === "warmup" ? " (échauff.)" : p.t.type === "drop" ? " (drop)" : p.t.type === "amrap" ? " (AMRAP)" : "";
    const reps = ex.unit === "s" ? `${p.t.reps} s` : `${p.n} × ${p.t.reps}`;
    return base ? `${base} — ${reps}${suff}` : `${reps}${suff}`;
  }).join("  ·  ");
}
function upsertWeight(d, date, w) {
  const ex = d.weights.find(x => x.date === date);
  if (ex) ex.w = w; else d.weights.push({ id: uid(), date, w });
  d.weights.sort((a, b) => a.date < b.date ? -1 : 1);
}
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
  const s = n => set(clamp(r25((v ?? 0) + n), min, max));
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

/* ------------------------------------------------------------------ */
/* MUSCLE CHIPS                                                        */
/* ------------------------------------------------------------------ */
function MuscleChips({ ex, size = 10.5, max = 3 }) {
  const ms = Object.entries(ex?.m || {}).sort((a, b) => b[1] - a[1]).slice(0, max);
  if (!ms.length) return null;
  return <span className="inline-flex flex-wrap align-middle" style={{ gap: 4 }}>
    {ms.map(([m, c]) => <span key={m} style={{ fontFamily: FD, fontWeight: 600, fontSize: size, letterSpacing: 0.6, textTransform: "uppercase", padding: "2px 7px", borderRadius: 99, background: c >= 0.75 ? ACCSOFT : SURF2, color: c >= 0.75 ? ACC : MUT, border: `1px solid ${c >= 0.75 ? "rgba(255,92,46,0.28)" : LINE}` }}>{ML[m] || m}</span>)}
  </span>;
}
function RangeSlider({ v, set }) {
  return <input type="range" min={0} max={100} step={5} value={v ?? 40} onChange={e => set(Number(e.target.value))}
    style={{ width: "100%", accentColor: ACC, height: 26 }} />;
}

/* ------------------------------------------------------------------ */
/* APP SHELL                                                           */
/* ------------------------------------------------------------------ */
export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("today");
  const [detail, setDetail] = useState(null);
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

  const mut = useCallback(fn => setData(p => { const d = JSON.parse(JSON.stringify(p)); fn(d); try { if (d.cycle && d.profile.onboarded) syncCycle(d); } catch (e) {} return d; }), []);

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
  if (detail?.type === "exercise") return shell(<ExerciseDetail data={data} mut={mut} exId={detail.id} onBack={() => setDetail(null)} />);
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
/* ONBOARDING v2                                                       */
/* ------------------------------------------------------------------ */
function Onboarding({ data, mut, boot, restoreBackup, importJson, initStep }) {
  const p = data.profile;
  const [step, setStep] = useState(initStep || 0);
  const [f, setF] = useState({ level: p.level, goal: p.goal, sex: p.sex, age: p.age, height: p.height, weight: p.weight, targetWeight: p.targetWeight,
    days: [...p.days], sessionMinutes: p.sessionMinutes, equipment: [...p.equipment], weakPoints: [...p.weakPoints], avoidZones: { ...p.avoidZones },
    pains: p.pains, injuries: p.injuries, morpho: { ...p.morpho }, legs: p.legs || "off", e1: { press: null, vpull: null, ohp: null, hpull: null } });
  const u = (k, v) => setF(x => ({ ...x, [k]: v }));
  const um = (k, v) => setF(x => ({ ...x, morpho: { ...x.morpho, [k]: v } }));
  const finish = () => mut(d => {
    Object.assign(d.profile, { level: f.level, goal: f.goal, sex: f.sex, age: f.age, height: f.height, weight: f.weight, targetWeight: f.targetWeight,
      days: f.days, sessionMinutes: f.sessionMinutes, equipment: f.equipment, weakPoints: f.weakPoints, avoidZones: f.avoidZones,
      pains: f.pains, injuries: f.injuries, morpho: f.morpho, legs: f.legs, onboarded: true });
    pickMainVariants(d);
    for (const k of UPPER_SLOTS) if (f.e1[k]) { d.mains[k].e1 = f.e1[k]; d.mains[k].hist.push({ date: todayISO(), v: f.e1[k], source: "saisi" }); d.mains[k].mode = f.level === "deb" ? "lin" : "rpe"; }
    seedMainsFromHistory(d);
    if (f.weight) upsertWeight(d, todayISO(), f.weight);
    initCycle(d); syncCycle(d);
  });
  const varFor = k => SLOTS[k].vars.find(v => !(EXOS[v].needs || KIND_NEEDS[EXOS[v].kind] || []).some(n => !f.equipment.includes(n)));
  const mainsPreview = UPPER_SLOTS.map(k => { const id = varFor(k); return { k, name: SLOTS[k].long, ex: id ? EXOS[id].name : "—" }; });
  const nD = f.days.length || 4;
  const splitTxt = nD <= 2 ? "Haut A / Haut B" : nD === 3 ? "Haut A / B / C" : nD === 4 ? "Push A · Pull A · Push B · Pull B" : nD === 5 ? "Push / Pull ×2 + Bras & épaules" : "Push / Pull ×2 + 2 jours bras & épaules";
  const goalTxt = f.goal >= 66 ? "Force dominante : Force → Hyper → Force → Test" : f.goal <= 35 ? "Hypertrophie dominante : Hyper → Hyper → Force → Test" : "Équilibré : Hyper → Force → Hyper → Test";
  const steps = [
    { t: "Ton coach powerbuilding", body: <>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5 }}>Objectif : <b style={{ color: TXT }}>un haut du corps fort et bien dessiné</b>, sur machines. Chaque séance ouvre par un mouvement lourd piloté au <b style={{ color: TXT }}>e1RM et au RPE</b> (top set + back-offs), puis enchaîne le volume d’hypertrophie dans un ordre cohérent.</p>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5, marginTop: 12 }}>Le coach <b style={{ color: TXT }}>t’impose plus lourd dès qu’il sent de la marge</b>, explique chaque charge en une phrase et affiche le muscle travaillé partout. Tes séances de juin sont importées (4 notes à confirmer dans Profil).</p>
      {boot && boot !== "found" && <RestoreBlock boot={boot} restoreBackup={restoreBackup} importJson={importJson} />}
    </> },
    { t: "Mon objectif", body: <div className="flex flex-col gap-5">
      <Field label="Niveau"><Seg opts={[{ v: "deb", l: "Débutant < 1 an" }, { v: "int", l: "Inter. 1-3 ans" }, { v: "adv", l: "Avancé > 3 ans" }]} val={f.level} set={v => u("level", v)} /></Field>
      <Field label="Curseur Hypertrophie ↔ Force" hint={goalTxt}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: FD, fontSize: 13, color: f.goal <= 45 ? ACC : MUT, textTransform: "uppercase" }}>Muscle</span>
          <RangeSlider v={f.goal} set={v => u("goal", v)} />
          <span style={{ fontFamily: FD, fontSize: 13, color: f.goal >= 55 ? ACC : MUT, textTransform: "uppercase" }}>Force</span>
        </div></Field>
    </div> },
    { t: "Mes infos", body: <div className="flex flex-col gap-4">
      <div className="flex gap-3 flex-wrap"><Field label="Âge"><NIn v={f.age} set={v => u("age", v)} suffix="ans" w={52} /></Field>
        <Field label="Sexe"><Seg small opts={[{ v: "H", l: "Homme" }, { v: "F", l: "Femme" }]} val={f.sex} set={v => u("sex", v)} /></Field></div>
      <div className="flex gap-3 flex-wrap"><Field label="Taille"><NIn v={f.height} set={v => u("height", v)} suffix="cm" w={58} /></Field>
        <Field label="Poids"><NIn v={f.weight} set={v => u("weight", v)} suffix="kg" w={58} /></Field>
        <Field label="Poids cible"><NIn v={f.targetWeight} set={v => u("targetWeight", v)} suffix="kg" w={58} /></Field></div>
    </div> },
    { t: "Mes disponibilités", body: <div className="flex flex-col gap-4">
      <Field label="Jours d’entraînement" hint={`${f.days.length} j/sem → ${splitTxt}. Chaque mouvement lourd revient 1× lourd + 1× en volume par semaine.`}>
        <div className="flex flex-wrap gap-2">{D2.map((l, i) => <Chip key={i} small on={f.days.includes(i + 1)}
          onClick={() => u("days", f.days.includes(i + 1) ? f.days.filter(x => x !== i + 1) : [...f.days, i + 1].sort((a, b) => a - b))}>{l}</Chip>)}</div></Field>
      <Field label="Temps par séance"><Seg small opts={[45, 60, 75, 90].map(v => ({ v, l: `${v} min` }))} val={f.sessionMinutes} set={v => u("sessionMinutes", v)} /></Field>
    </div> },
    { t: "Ma salle", body: <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">{EQUIP_LIST.map(([id, l]) => <Chip key={id} small on={f.equipment.includes(id)}
        onClick={() => u("equipment", f.equipment.includes(id) ? f.equipment.filter(x => x !== id) : [...f.equipment, id])}>{l}</Chip>)}</div>
      <Label style={{ marginTop: 6 }}>Tes mouvements principaux (machine d’abord : stable, sans pareur, on peut pousser près de l’échec)</Label>
      <Card style={{ padding: "10px 14px" }}>{mainsPreview.map(x => <div key={x.k} className="flex justify-between" style={{ padding: "5px 0", fontSize: 14.5 }}>
        <span style={{ color: SUB }}>{x.name}</span><span style={{ fontFamily: FD, fontWeight: 600 }}>{x.ex}</span></div>)}</Card>
    </div> },
    { t: "Santé & priorités", body: <div className="flex flex-col gap-4">
      <Field label="Zones à ménager" hint="Les exercices qui les sollicitent fortement seront exclus et remplacés.">
        <div className="flex flex-wrap gap-2">{Object.entries(ZONES).map(([z, l]) => <Chip key={z} small color={RED} on={!!f.avoidZones[z]}
          onClick={() => u("avoidZones", { ...f.avoidZones, [z]: !f.avoidZones[z] })}>{l}</Chip>)}</div></Field>
      <Field label="Points faibles à prioriser (max 2)" hint="Volume +25 % et placés tôt dans la séance.">
        <div className="flex flex-wrap gap-2">{MKEYS.map(m => <Chip key={m} small on={f.weakPoints.includes(m)}
          onClick={() => u("weakPoints", f.weakPoints.includes(m) ? f.weakPoints.filter(x => x !== m) : f.weakPoints.length < 2 ? [...f.weakPoints, m] : f.weakPoints)}>{ML[m]}</Chip>)}</div></Field>
      <Field label="Jambes" hint={f.legs === "off" ? "Focus 100 % haut du corps (tu pourras les activer plus tard)." : f.legs === "maint" ? "Presse + leg curl en fin de 2 séances : ~10 min, de quoi garder des jambes." : "Une vraie séance jambes (5-6 jours/sem), sinon entretien."}>
        <Seg small opts={Object.entries(LEGS_MODES).map(([v, l]) => ({ v, l }))} val={f.legs} set={v => u("legs", v)} /></Field>
      <Field label="Douleurs actuelles"><TIn area v={f.pains} set={v => u("pains", v)} ph="Ex. gêne à l’épaule droite en fin d’amplitude…" /></Field>
    </div> },
    { t: "Mes maxis", body: <div className="flex flex-col gap-4">
      <div style={{ color: SUB, fontSize: 14, lineHeight: 1.55 }}>Si tu connais tes maxis (ou une perf récente convertie), saisis-les. Sinon laisse vide : tes charges de juin servent de point de départ, et un mouvement jamais fait se <b style={{ color: TXT }}>calibre en une séance</b> (séries de 6 en montant jusqu’à RPE 8).</div>
      {UPPER_SLOTS.map(k => <div key={k} className="flex items-center justify-between">
        <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 16 }}>{EXOS[varFor(k)]?.name || SLOTS[k].name} <span style={{ color: MUT, fontSize: 12.5, fontWeight: 400 }}>e1RM</span></span>
        <NIn v={f.e1[k]} set={v => setF(x => ({ ...x, e1: { ...x.e1, [k]: v } }))} suffix="kg" w={58} /></div>)}
    </div> },
    { t: "Ma morphologie", body: <MorphoForm m={f.morpho} um={um} height={f.height} /> },
    { t: "Prêt", body: <>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5 }}>Programme : <b style={{ color: TXT }}>{goalTxt.split(" : ")[1]}</b>, blocs de {f.level === "deb" ? 4 : f.level === "adv" ? 6 : 5} semaines avec deload intégré.</p>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5, marginTop: 12 }}>Semaine type : <b style={{ color: TXT }}>{splitTxt}</b>. Chaque séance enchaîne <b style={{ color: TXT }}>mouvement lourd → volume de l’autre mouvement lourd → angle différent → isolations en alternance → abdos</b>.</p>
      <p style={{ color: SUB, lineHeight: 1.6, fontSize: 15.5, marginTop: 12 }}>Les exercices restent <b style={{ color: TXT }}>fixes pendant tout le bloc</b> pour que chaque kilo gagné soit mesurable ; ceux qui stagnent sont remplacés au bloc suivant.</p>
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
    <Field label="Mes fémurs me semblent" hint="Fémurs longs = squat plus penché : je te proposerai talons surélevés ou front squat."><Seg small opts={[{ v: "long", l: "Longs" }, { v: "moyen", l: "Moyens" }, { v: "court", l: "Courts" }]} val={m.femur} set={v => um("femur", v)} /></Field>
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

/* ------------------------------------------------------------------ */
/* CONSTRUCTION DE LA SÉANCE                                           */
/* ------------------------------------------------------------------ */
const ANTAG = { biceps: "triceps", triceps: "biceps", deltL: "deltP", deltP: "deltL", pectoraux: "dos", dos: "pectoraux" };
function modulatePlan(d, plan, wp) {
  const weak = d.profile.weakPoints || [];
  const isoIdx = () => plan.map((x, i) => ({ x, i })).filter(o => o.x.role === "isolation" && o.x.m !== "abdos" && !weak.includes(o.x.m));
  for (let k = 0; k < (wp.dropIso || 0); k++) { const l = isoIdx().pop(); if (l) plan.splice(l.i, 1); }
  if ((wp.accFactor || 1) < 1) for (const x of plan) if (x.role === "accessory" || x.role === "isolation") x.sets = Math.max(1, Math.round(x.sets * wp.accFactor));
  const minutes = d.profile.sessionMinutes || 75;
  /* peu de temps : supersets antagonistes (jamais sur les mains), puis on retire des isolations */
  if (estMinutes(plan) > minutes + 5) {
    const isos = plan.filter(x => x.role === "isolation" && x.m !== "abdos");
    for (const a of isos) { if (a.ss) continue; const b = isos.find(y => !y.ss && y !== a && ANTAG[a.m] === y.m); if (b) { a.ss = b.ss = "ss_" + a.exId; } }
  }
  let guard = 0; plan.trimmed = [];
  while (estMinutes(plan) > minutes + 5 && guard++ < 8) { const l = isoIdx().pop(); if (!l) break; plan.trimmed.push(d.exercises[l.x.exId]?.name); plan.splice(l.i, 1); }
  return plan;
}
function buildSession(d, dayKey, checkin) {
  syncCycle(d);
  const rd = readiness(checkin);
  const extraZones = (checkin?.pain && (checkin.painLevel || 0) >= 5 && checkin.painZone) ? [checkin.painZone] : [];
  const wp = weekParams(d, rd);
  const b = curBlock(d);
  const plan = modulatePlan(d, (weekSetPlan(d, wp)[dayKey] || []).map(x => ({ ...x })), wp);
  const mkRow = o => ({ id: uid(), type: "normal", rir: null, rpe: null, done: false, ...o });
  let entries = [];
  for (let it of plan) {
    let ex = d.exercises[it.exId]; if (!ex) continue;
    if (extraZones.length && !exAvailable(d, ex, extraZones)) {
      const alt = alternativesFor(d, it.exId, extraZones)[0];
      if (!alt) continue;
      it = { ...it, exId: alt.id, slot: null, light: false, role: it.role === "main" ? "accessory" : it.role, swappedFor: ex.id };
      if (it.role === "accessory") { const [mn, mx] = repRange(d, it, alt, b); it.min = mn; it.max = mx; it.sets = 3; it.rest = 90; }
      ex = alt;
    }
    const pl = { sets: it.sets, min: it.min, max: it.max, rest: it.rest };
    const base = { exerciseId: ex.id, ss: it.ss || null, swappedFrom: it.swappedFor || null, finished: false, cmp: null };
    if (it.role === "main" && it.slot) {
      const rec = prescribeMain(d, it.slot, wp, { second: it.second });
      const rows = [];
      if (rec.calib) for (let i = 0; i < 5; i++) rows.push(mkRow({ load: null, reps: 6 }));
      else if (rec.test) { rec.ramps.forEach(r => rows.push(mkRow({ type: "warmup", ...r }))); rows.push(mkRow({ type: rec.amrap ? "amrap" : "top", top: true, load: rec.load, reps: rec.reps })); }
      else if (rec.lin) { rec.ramps.forEach(r => rows.push(mkRow({ type: "warmup", ...r }))); for (let i = 0; i < 3; i++) rows.push(mkRow({ load: rec.load, reps: rec.reps })); rows.push(mkRow({ type: "backoff", load: rec.boff, reps: rec.boffReps })); }
      else if (rec.deload) for (let i = 0; i < 2; i++) rows.push(mkRow({ load: rec.load, reps: rec.reps }));
      else { rec.ramps.forEach(r => rows.push(mkRow({ type: "warmup", ...r }))); rows.push(mkRow({ type: "top", top: true, load: rec.top, reps: rec.R })); for (let i = 0; i < rec.boffN; i++) rows.push(mkRow({ type: "backoff", load: rec.boff, reps: rec.boffReps })); }
      entries.push({ ...base, role: "main", slot: it.slot, plan: { ...pl, min: rec.R || rec.reps || 6, max: rec.R || rec.reps || 6 }, rec, sets: rows });
      continue;
    }
    if (it.slot && it.light) {
      const rec = prescribeLight(d, it.slot, wp);
      if (rec) { entries.push({ ...base, role: "secondary", slot: it.slot, plan: pl, rec, sets: Array.from({ length: rec.sets }, () => mkRow({ load: rec.load, reps: rec.reps })) }); continue; }
    }
    const rec = recommend(d, ex.id, pl, { readiness: rd, deload: wp.deload });
    const loaded = !["bw", "bwAssist"].includes(ex.kind);
    const rows = Array.from({ length: rec.sets }, (_, i) => mkRow({ type: rec.amrap ? "amrap" : "normal",
      ...(loaded ? { load: rec.load } : { assist: rec.assist || 0, extra: rec.extra || 0 }), reps: rec.pref[i] ?? rec.min }));
    entries.push({ ...base, role: it.role === "main" ? "accessory" : it.role, plan: pl, rec, sets: rows });
  }
  /* Séance technique — forme < 2,2 */
  if (wp.technical) {
    const tech = [];
    const mainE = entries.find(e => e.role === "main");
    if (mainE) {
      const e1 = effE1(d, mainE.slot); const ex = d.exercises[mainE.exerciseId];
      const load = e1 ? chargeable(d, ex, e1 * 0.65) : null;
      mainE.rec = { slot: mainE.slot, exId: ex.id, technical: true, load, sets: 3, reps: 5, expl: `Séance technique : 3 × 5 à ${load ? fk(load) + " kg (65 %)" : "charge légère"} — on entretient le geste sans creuser la fatigue.` };
      mainE.sets = Array.from({ length: 3 }, () => mkRow({ load, reps: 5 }));
      mainE.plan = { ...mainE.plan, min: 5, max: 5 };
      tech.push(mainE);
    }
    for (const e of entries.filter(x => x.role === "isolation" || x.role === "accessory").slice(0, 2)) { e.sets = e.sets.slice(0, 2); tech.push(e); }
    entries = tech;
  }
  const notes = [];
  if (rd != null) {
    if (wp.technical) notes.push(`Forme très basse (${fk1(rd)}/5) : séance technique de ~35 min. C’est le plan, pas un échec — on repart fort à la prochaine.`);
    else if (rd < 2.8) notes.push("Récupération basse : RPE visé −1, back-offs et accessoires réduits. Pas de record aujourd’hui.");
    else if (rd < 3.5) notes.push("Forme moyenne : RPE visé −0,5 et une isolation en moins.");
    else if (wp.strong) notes.push("Forme au top : RPE visé +0,5 et cran du dessus dès qu’il est faisable. Je te pousse aujourd’hui.");
  }
  if (extraZones.length) notes.push(`Douleur signalée (${ZONES[extraZones[0]]}) : les exercices qui la stressent sont remplacés aujourd’hui.`);
  if (entries.some(e => e.ss)) notes.push("Temps serré : isolations antagonistes en supersets (enchaîne les deux, puis repos).");
  if (plan.trimmed?.length) notes.push(`Pour tenir en ${d.profile.sessionMinutes} min : ${plan.trimmed.join(", ")} retiré${plan.trimmed.length > 1 ? "s" : ""} aujourd’hui (jamais le travail lourd).`);
  if (wp.deload) notes.push("Deload : volume −50 %, RPE 6 — on recharge avant le bloc suivant.");
  if (wp.test) notes.push("Semaine de test : une perf propre pour recaler ton e1RM, le reste est léger.");
  return { id: uid(), date: todayISO(), dayKey, name: dayName(d, dayKey), blockType: b.type, weekNo: b.wk,
    status: "inprogress", startedAt: Date.now(), checkin: checkin || null, bwToday: nearestBW(d, todayISO()),
    entries, note: notes.join(" ") || null, records: [], e1Updates: [] };
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
  const [checkinFor, setCheckinFor] = useState(null);
  const [progOpen, setProgOpen] = useState(false);
  const t0 = todayISO();
  const b = curBlock(data);
  const active = data.sessions.find(s => s.status === "inprogress");
  const doneToday = data.sessions.find(s => s.status === "done" && s.type !== "historique" && s.date === t0);
  const pm = plannedMap(data);
  const todayKey = pm[t0] || null;
  const nextDate = Object.keys(pm).sort()[0] || null;
  const previewKey = todayKey || (nextDate ? pm[nextDate] : splitDayKeys(data)[0]);
  const nVerify = data.verify.filter(v => !v.resolved).length;
  const real = realDone(data);
  const lastAny = [...data.sessions].filter(s => s.status === "done" && !s.verifyDate).sort((a, b) => a.date < b.date ? -1 : 1).pop();
  const missed = missedDates(data, 10);
  const weekStart = addDays(t0, -(dow(t0) - 1));
  const doneThisWeek = real.filter(s => s.date >= weekStart).length;
  const tr = readinessTrend(data);
  const triggers = (!b.isDeload && !miniDeloadActive(data) && (!data.prefs.deloadDismissed || daysBetween(data.prefs.deloadDismissed, t0) >= 7)) ? deloadTriggers(data) : [];

  const plan = React.useMemo(() => { try { return buildSession(JSON.parse(JSON.stringify(data)), previewKey, null); } catch (e) { return { entries: [] }; } }, [data, previewKey]);
  const previews = plan.entries.slice(0, 7).map(pe => {
    const ex = data.exercises[pe.exerciseId]; const r = pe.rec || {};
    let val = "—";
    if (pe.role === "main") val = r.calib ? "calibration" : r.test ? `${fk(r.load)} kg${r.amrap ? " AMRAP" : ""}` : r.top != null ? `${fk(r.top)} kg × ${r.R}` : r.load != null ? `${fk(r.load)} × ${r.reps}` : "—";
    else if (r.light) val = `${fk(r.load)} kg × ${r.reps}`;
    else val = ["bw", "bwAssist"].includes(ex.kind) ? (r.assist ? `PDC −${fk(r.assist)}` : r.extra ? `PDC +${fk(r.extra)}` : "PDC") : r.load != null ? `${fk(r.load)} kg` : "à calibrer";
    return { ex, role: pe.role, val, ss: pe.ss };
  });
  const estMin = estMinutes(plan.entries);
  const dayMuscles = {}; for (const pe of plan.entries) { const ex = data.exercises[pe.exerciseId]; const n = pe.sets.filter(t => t.type !== "warmup").length; for (const [m, c] of Object.entries(ex?.m || {})) dayMuscles[m] = (dayMuscles[m] || 0) + c * n; }
  const topMuscles = Object.entries(dayMuscles).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
  const chg = (data.program.changes || [])[0];
  const showChg = chg && daysBetween(chg.date, t0) <= 7;

  const start = key => setCheckinFor(key);
  const launch = ck => { const key = checkinFor; setCheckinFor(null);
    mut(d => { d.sessions.push(buildSession(d, key, ck)); }); onStartSession(); };

  const e1Tot = UPPER_SLOTS.every(k => data.mains[k].e1) ? Math.round(UPPER_SLOTS.reduce((a, k) => a + data.mains[k].e1, 0)) : null;
  const slots = activeSlots(data);

  return <div style={{ padding: "22px 18px 8px" }}>
    <div className="flex items-center justify-between">
      <Label>{fmtLong(t0)}</Label>
      <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: b.isDeload ? AMB : b.isTest ? ACC : SUB, background: SURF, border: `1px solid ${LINE}`, borderRadius: 99, padding: "4px 11px" }}>{blockLabel(b)}</span>
    </div>
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 36, textTransform: "uppercase", letterSpacing: 0.5, margin: "2px 0 16px" }}>Aujourd’hui</h1>

    {nVerify > 0 && <Card onClick={goVerify} className="active:opacity-70 flex items-center gap-3 mb-3" style={{ background: AMBSOFT, borderColor: "rgba(227,169,62,0.35)", padding: "12px 14px" }}>
      <AlertTriangle size={19} color={AMB} />
      <div className="flex-1" style={{ fontSize: 14.5 }}>{nVerify} donnée{nVerify > 1 ? "s" : ""} de ton historique à vérifier</div>
      <ChevronRight size={17} color={AMB} />
    </Card>}

    {triggers.length > 0 && <Card className="mb-3" style={{ borderColor: "rgba(227,169,62,0.3)" }}>
      <Label style={{ color: AMB }}>Fatigue accumulée</Label>
      <div style={{ fontSize: 14, color: SUB, lineHeight: 1.5, margin: "6px 0 10px" }}>{triggers[0].charAt(0).toUpperCase() + triggers[0].slice(1)}. Une décharge semble pertinente.</div>
      <div className="flex gap-2 flex-wrap">
        <Btn small onClick={() => mut(d => { const bb = curBlock(d); if (!bb.isTest) d.cycle.blockStart = addDays(todayISO(), -bb.loadWeeks * 7); })}>Avancer le deload</Btn>
        <Btn small kind="ghost" onClick={() => mut(d => { d.prefs.mini = addDays(todayISO(), 3); })}>Mini-deload 3 j</Btn>
        <Btn small kind="subtle" onClick={() => mut(d => { d.prefs.deloadDismissed = todayISO(); })}>Pas maintenant</Btn>
      </div>
    </Card>}
    {miniDeloadActive(data) && <div className="mb-3" style={{ color: AMB, fontFamily: FD, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Mini-deload actif jusqu’au {fmtDM(data.prefs.mini)}</div>}

    <Card style={{ padding: 18, borderColor: active || todayKey ? "rgba(255,92,46,0.35)" : LINE }}>
      {active ? <>
        <Label style={{ color: ACC }}>Séance en cours</Label>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 30, textTransform: "uppercase", margin: "4px 0 2px" }}>{active.name}</div>
        <div style={{ color: SUB, fontSize: 14, marginBottom: 14 }}>{active.entries.reduce((a, e) => a + e.sets.filter(t => t.done).length, 0)} séries validées</div>
        <Btn full onClick={onStartSession}><Play size={18} /> Reprendre la séance</Btn>
      </> : doneToday ? <>
        <Label style={{ color: ACC }}>C’est fait</Label>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 28, textTransform: "uppercase", margin: "4px 0 6px" }}>{doneToday.name}</div>
        <div style={{ color: SUB, fontSize: 14.5, lineHeight: 1.5 }}>Séance terminée — {doneToday.entries.length} exercices. Récupère bien.</div>
      </> : <>
        <Label style={{ color: todayKey ? ACC : MUT }}>{todayKey ? "Séance du jour" : "Repos prévu"}</Label>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 30, textTransform: "uppercase", lineHeight: 1.05, margin: "4px 0 4px" }}>{dayName(data, previewKey)}</div>
        <div className="flex flex-wrap items-center" style={{ gap: 4, marginBottom: 10 }}>
          {topMuscles.map(m => <span key={m} style={{ fontFamily: FD, fontWeight: 600, fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", padding: "2px 8px", borderRadius: 99, background: ACCSOFT, color: ACC }}>{ML[m]}</span>)}
          <span style={{ color: MUT, fontSize: 12.5, marginLeft: 4 }}>{!todayKey && nextDate ? `${fmtLong(nextDate)} · ` : ""}{plan.entries.length} exercices · ≈ {estMin} min</span>
        </div>
        <div className="flex flex-col mb-4" style={{ gap: 7 }}>
          {previews.map((p, i) => <div key={i} className="flex items-center justify-between" style={{ fontSize: 14.5 }}>
            <span className="truncate" style={{ color: p.role === "main" ? TXT : SUB, fontWeight: p.role === "main" ? 600 : 400 }}>{i + 1}. {p.ex.name}{p.ss ? <span style={{ color: MUT, fontSize: 11 }}> · SS</span> : null}</span>
            <span className="tabular-nums shrink-0" style={{ fontFamily: FD, fontWeight: 600, fontSize: 15.5, color: p.role === "main" ? ACC : TXT }}>{p.val}</span>
          </div>)}
        </div>
        <Btn full onClick={() => start(previewKey)}>{todayKey ? "Commencer la séance" : "Commencer quand même"}</Btn>
        <button onClick={() => setProgOpen(true)} className="w-full active:opacity-60" style={{ marginTop: 10, color: SUB, fontFamily: FD, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Voir le programme du bloc</button>
      </>}
    </Card>

    {showChg && <Card className="mt-3" style={{ padding: "12px 14px" }}>
      <Label style={{ color: ACC }}>Nouveau bloc · programme ajusté</Label>
      <div style={{ fontSize: 13.5, color: SUB, lineHeight: 1.5, marginTop: 5 }}>{chg.msgs.slice(0, 3).join(" · ")}</div>
    </Card>}

    {missed.length > 0 && !doneToday && !active && <div style={{ color: MUT, fontSize: 13, margin: "10px 2px 0", lineHeight: 1.5 }}>
      Séance manquée le {fmtDM(missed[0])} — rien n’est cassé : le programme continue simplement.</div>}

    <div className="flex gap-2.5 mt-4">
      <StatTile label="Récupération" value={tr != null ? fk1(tr) + "/5" : "—"} sub={tr != null ? (tr >= 3.5 ? "bonne" : tr >= 2.8 ? "moyenne" : "basse") : "check-in avant séance"} />
      <StatTile label="Force totale" value={e1Tot ? `${e1Tot}` : "—"} sub={e1Tot ? "kg · 4 mains" : "à calibrer"} accent={!!e1Tot} />
      <StatTile label="Semaine" value={`${doneThisWeek}/${(data.profile.days || []).length}`} sub="séances" />
    </div>

    <div className="mt-6 mb-2 flex items-center justify-between">
      <Label>Mes mains</Label>
      <button onClick={goProg} className="active:opacity-60" style={{ color: ACC, fontFamily: FD, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Progression</button>
    </div>
    <Card style={{ padding: "6px 16px" }}>
      {slots.map((k, ki) => { const st = data.mains[k];
        const h30 = st.hist.filter(x => daysBetween(x.date, t0) <= 30);
        const delta = h30.length >= 2 ? ((h30[h30.length - 1].v - h30[0].v) / h30[0].v) * 100 : null;
        return <button key={k} onClick={() => openEx(st.variantId)} className="w-full flex items-center justify-between active:opacity-60" style={{ padding: "11px 0", borderBottom: ki < slots.length - 1 ? `1px solid ${LINE}` : "none" }}>
          <span style={{ fontSize: 15 }}>{SLOTS[k].name} <span style={{ color: MUT, fontSize: 12.5 }}>· {data.exercises[st.variantId]?.name}</span></span>
          <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 16 }}>
            {st.e1 ? `${fk(st.e1)} kg` : "—"}{delta != null && <span style={{ color: delta > 0.3 ? ACC : delta < -0.3 ? RED : MUT, fontSize: 13, marginLeft: 6 }}>{delta > 0 ? "+" : ""}{fk1(delta)} %</span>}
          </span>
        </button>; })}
    </Card>

    <CheckinSheet open={!!checkinFor} onClose={() => setCheckinFor(null)} onGo={launch} />
    <ProgramSheet data={data} mut={mut} open={progOpen} onClose={() => setProgOpen(false)} />
  </div>;
}

function CheckinSheet({ open, onClose, onGo }) {
  const [c, setC] = useState({ sleep: 3, energy: 3, soreness: 2, motivation: 3, stress: 2, pain: false, painZone: null, painLevel: 5, painNote: "" });
  const row = (label, k, invert) => <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
    <span style={{ fontSize: 15, color: SUB }}>{label}</span>
    <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setC(x => ({ ...x, [k]: n }))}
      className="active:opacity-60 tabular-nums" style={{ width: 35, height: 35, borderRadius: 10, fontFamily: FD, fontWeight: 700, fontSize: 15,
        background: c[k] === n ? (invert && n >= 4 ? REDSOFT : ACCSOFT) : SURF2,
        color: c[k] === n ? (invert && n >= 4 ? RED : ACC) : MUT, border: `1px solid ${c[k] === n ? "transparent" : LINE}` }}>{n}</button>)}</div>
  </div>;
  return <Sheet open={open} onClose={onClose} title="Check-in rapide">
    <div style={{ color: MUT, fontSize: 13.5, marginBottom: 6 }}>15 secondes — la séance s’ajuste à ta forme du jour.</div>
    {row("Sommeil", "sleep")}
    {row("Énergie", "energy")}
    {row("Courbatures", "soreness", true)}
    {row("Motivation", "motivation")}
    {row("Stress", "stress", true)}
    <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
      <span style={{ fontSize: 15, color: SUB }}>Douleur inhabituelle</span>
      <div className="flex gap-2">
        <Chip small on={!c.pain} onClick={() => setC(x => ({ ...x, pain: false }))}>Non</Chip>
        <Chip small on={c.pain} color={RED} onClick={() => setC(x => ({ ...x, pain: true }))}>Oui</Chip>
      </div>
    </div>
    {c.pain && <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">{Object.entries(ZONES).map(([z, l]) => <Chip key={z} small color={RED} on={c.painZone === z} onClick={() => setC(x => ({ ...x, painZone: z }))}>{l}</Chip>)}</div>
      <div className="flex items-center gap-3"><span style={{ color: SUB, fontSize: 14 }}>Intensité</span>
        <Stepper v={c.painLevel} set={v => setC(x => ({ ...x, painLevel: v }))} min={1} max={10} /></div>
      <div style={{ color: MUT, fontSize: 12 }}>À partir de 5/10, les exercices qui stressent la zone sont remplacés.</div>
    </div>}
    <div className="flex gap-3 mt-5">
      <Btn kind="subtle" style={{ flex: 1 }} onClick={() => onGo(null)}>Ignorer</Btn>
      <Btn style={{ flex: 2 }} onClick={() => onGo(c)}>Commencer</Btn>
    </div>
  </Sheet>;
}

/* ------------------------------------------------------------------ */
/* SESSION SCREEN v2 — guidée                                          */
/* ------------------------------------------------------------------ */
function MiniNum({ v, set, step = 1, w = 46, int, size = 19 }) {
  const chg = n => { const nv = (v || 0) + n; set(int ? Math.max(0, Math.round(nv)) : r25(Math.max(0, nv))); };
  return <div className="flex items-center shrink-0" style={{ background: SURF2, borderRadius: 11, border: `1px solid ${LINE}` }}>
    <button className="active:opacity-50" style={{ padding: "11px 9px" }} onClick={() => chg(-step)}><Minus size={14} color={SUB} /></button>
    <input type="number" inputMode="decimal" value={v ?? ""} placeholder="—"
      onChange={e => set(e.target.value === "" ? null : Number(e.target.value))}
      className="tabular-nums text-center" style={{ width: w, fontFamily: FD, fontWeight: 600, fontSize: size }} />
    <button className="active:opacity-50" style={{ padding: "11px 9px" }} onClick={() => chg(step)}><Plus size={14} color={SUB} /></button>
  </div>;
}
function SetRow({ ex, set: t, onPatch, onValidate, onDelete, onBw, useRpe, defP, next }) {
  const loaded = !["bw", "bwAssist"].includes(ex.kind);
  const warm = t.type === "warmup";
  const cycleType = () => { const i = TYPE_ORDER.indexOf(t.type); onPatch({ type: TYPE_ORDER[(i + 1) % TYPE_ORDER.length] }); };
  const cycleRir = () => onPatch({ rir: t.rir == null ? 0 : t.rir >= 4 ? null : t.rir + 1 });
  const cycleRpe = () => onPatch({ rpe: t.rpe == null ? (defP || 8) : t.rpe >= 10 ? null : Math.round((t.rpe + 0.5) * 2) / 2 });
  const bwLabel = t.assist ? `−${fk(t.assist)}` : t.extra ? `+${fk(t.extra)}` : "PDC";
  return <div className="flex items-center gap-2" style={{ padding: "6px 0", opacity: warm && !t.done ? 0.65 : 1,
    ...(next ? { background: "rgba(255,92,46,0.06)", margin: "0 -8px", padding: "6px 8px", borderRadius: 12 } : {}) }}>
    <button onClick={cycleType} className="shrink-0 active:opacity-60 flex items-center justify-center"
      style={{ width: 28, height: 28, borderRadius: 99, fontFamily: FD, fontWeight: 700, fontSize: 12.5,
        background: warm ? SURF2 : t.type === "normal" ? SURF2 : ACCSOFT, color: warm ? MUT : t.type === "normal" ? SUB : ACC, border: `1px solid ${LINE}` }}>
      {TYPES[t.type].l}</button>
    {loaded
      ? <MiniNum v={t.load} set={v => onPatch({ load: v })} step={ex.inc || 2.5} w={48} />
      : <button onClick={onBw} className="active:opacity-60 tabular-nums shrink-0" style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 11, padding: "11px 10px", fontFamily: FD, fontWeight: 600, fontSize: 16, minWidth: 62, color: t.assist ? AMB : t.extra ? ACC : TXT }}>
        {ex.kind === "bw" ? "PDC" : bwLabel}</button>}
    <MiniNum v={t.reps} set={v => onPatch({ reps: v })} step={ex.unit === "s" ? 5 : 1} int w={40} />
    {useRpe
      ? <button onClick={cycleRpe} className="shrink-0 active:opacity-60 tabular-nums" style={{ fontFamily: FD, fontWeight: 600, fontSize: 13, padding: "10px 6px", borderRadius: 10, minWidth: 54, textAlign: "center", background: t.rpe != null ? ACCSOFT : "transparent", color: t.rpe != null ? ACC : MUT, border: `1px solid ${t.rpe != null ? "rgba(255,92,46,0.3)" : "transparent"}` }}>
        {t.rpe == null ? "RPE" : `RPE ${String(t.rpe).replace(".", ",")}`}</button>
      : <button onClick={cycleRir} className="shrink-0 active:opacity-60" style={{ fontFamily: FD, fontWeight: 600, fontSize: 13, letterSpacing: 0.5, padding: "10px 7px", borderRadius: 10, minWidth: 48, textAlign: "center", background: t.rir != null ? SURF2 : "transparent", color: t.rir != null ? TXT : MUT, border: `1px solid ${t.rir != null ? LINE : "transparent"}` }}>
        {t.rir == null ? "RIR" : t.rir >= 4 ? "RIR 4+" : `RIR ${t.rir}`}</button>}
    <div className="flex-1" />
    <button onClick={onValidate} className={`shrink-0 active:opacity-70 flex items-center justify-center ${next ? "glow" : ""}`}
      style={{ width: 46, height: 46, borderRadius: 13, background: t.done ? ACC : SURF2, border: `1px solid ${t.done ? ACC : LINE}` }}>
      <Check size={21} color={t.done ? "#0B0C0E" : MUT} strokeWidth={3} /></button>
    {onDelete && <button onClick={onDelete} className="shrink-0 active:opacity-60 p-1"><X size={15} color={MUT} /></button>}
  </div>;
}

function SessionScreen({ data, mut, session, onClose, onFinished }) {
  const [expanded, setExpanded] = useState(() => {
    const i = session.entries.findIndex(e => !e.finished); return i < 0 ? 0 : i;
  });
  const [timer, setTimer] = useState(null);
  const [swapIdx, setSwapIdx] = useState(null);
  const [bwEdit, setBwEdit] = useState(null);
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
    const e = s.entries[ei]; const t = e.sets[si]; const ex = data.exercises[e.exerciseId];
    if (t.done) { patchSet(ei, si, { done: false }); return; }
    const p = { done: true, variantId: ex.curVar || null };
    if (ex.kind === "bwAssist" || ex.kind === "bw") p.bw = s.bwToday ?? null;
    mut(d => {
      const ss = d.sessions.find(x => x.id === s.id); const ee = ss.entries[ei]; const tt = ee.sets[si];
      Object.assign(tt, p);
      /* autorégulation en direct : le moteur ajuste (et impose plus lourd) dès qu'il sent la marge */
      const msg = liveAdjust(d, ee, si);
      if (msg) { ee.autoMsg = msg; ee.autoUp = /imposé|remonté|\+/.test(msg) && !/−/.test(msg); }
    });
    const partner = e.ss ? s.entries.find((x, i) => i !== ei && x.ss === e.ss) : null;
    const partnerLeft = partner && partner.sets.filter(x => !x.done && x.type !== "warmup").length >= e.sets.filter(x => !x.done && x.type !== "warmup").length;
    const rest = t.type === "warmup" ? 60 : partnerLeft ? 10 : e.role === "main" ? (e.plan.rest || 180) : (e.plan.rest || 90);
    setTimer({ endsAt: Date.now() + rest * 1000, total: rest, ended: false });
  };
  const addSet = ei => mut(d => { const e = d.sessions.find(x => x.id === s.id).entries[ei];
    const last = [...e.sets].reverse().find(t => t.type !== "warmup") || e.sets[e.sets.length - 1];
    e.sets.push({ id: uid(), type: last?.type === "top" ? "backoff" : (last?.type || "normal"), reps: last?.reps ?? e.plan.min, rir: null, rpe: null, done: false,
      ...(last?.load != null ? { load: last.load } : {}), ...(last?.assist != null ? { assist: last.assist } : {}), ...(last?.extra != null ? { extra: last.extra } : {}) }); });
  const delSet = (ei, si) => mut(d => { d.sessions.find(x => x.id === s.id).entries[ei].sets.splice(si, 1); });
  const finishEx = ei => mut(d => {
    const ss = d.sessions.find(x => x.id === s.id); const e = ss.entries[ei];
    const ex = d.exercises[e.exerciseId];
    const main = e.sets.filter(t => t.done && t.type !== "warmup" && t.type !== "backoff");
    const all = e.sets.filter(t => t.done && t.type !== "warmup");
    const prev = exHistory(d, e.exerciseId).filter(en => en.sid !== ss.id).pop() || null;
    e.finished = true;
    e.cmp = all.length ? compareEntry(d, ex, prev, main.length ? main : all, ss.date) : null;
  });
  const endSession = () => mut(d => {
    const ss = d.sessions.find(x => x.id === s.id);
    for (const e of ss.entries) { e.sets = e.sets.filter(t => t.done); }
    ss.entries = ss.entries.filter(e => e.sets.length);
    ss.status = "done";
    ss.duration = Math.max(1, Math.round((Date.now() - ss.startedAt) / 60000));
    for (const e of ss.entries) if (!e.cmp) {
      const ex = d.exercises[e.exerciseId];
      const main = e.sets.filter(t => t.type === "normal" || t.type === "amrap" || t.type === "top");
      const prev = exHistory(d, e.exerciseId).filter(en => en.sid !== ss.id).pop() || null;
      e.cmp = main.length ? compareEntry(d, ex, prev, main, ss.date) : null;
    }
    ss.e1Updates = applyMainResults(d, ss);
    applyAccessoryE1(d, ss);
    ss.records = newRecordsForSession(d, ss);
  });
  const undone = s.entries.reduce((a, e) => a + e.sets.filter(t => !t.done && t.type !== "warmup").length, 0);
  const elapsed = Math.floor((Date.now() - s.startedAt) / 60000);
  const hasBw = s.entries.some(e => ["bw", "bwAssist"].includes(data.exercises[e.exerciseId]?.kind));
  const remain = timer ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)) : 0;
  const nFin = s.entries.filter(e => e.finished).length;

  return <div className="flex flex-col" style={{ minHeight: "100vh" }}>
    <div style={{ position: "sticky", top: 0, background: BG, zIndex: 20, borderBottom: `1px solid ${LINE}` }}>
      <div className="flex items-center gap-3" style={{ padding: "16px 16px 8px" }}>
        <button onClick={onClose} className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 11 }}><ChevronLeft size={19} color={SUB} /></button>
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>{s.name}</div>
          <div className="tabular-nums" style={{ color: MUT, fontSize: 12.5 }}>{blockLabel(curBlock(data))} · {elapsed} min · exercice {Math.min(nFin + 1, s.entries.length)}/{s.entries.length}</div>
        </div>
        {hasBw && <button onClick={() => setBwSheet(true)} className="active:opacity-60 flex items-center gap-1.5" style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 11, padding: "8px 11px" }}>
          <Scale size={15} color={SUB} /><span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 600, fontSize: 15 }}>{s.bwToday != null ? fk(s.bwToday) : "—"} kg</span>
        </button>}
      </div>
      <div style={{ height: 3, background: SURF2 }}><div style={{ height: "100%", width: `${(nFin / Math.max(1, s.entries.length)) * 100}%`, background: ACC, transition: "width .3s" }} /></div>
    </div>

    <div className="flex-1 overflow-y-auto" style={{ padding: "12px 14px 190px" }}>
      {s.note && <div style={{ background: AMBSOFT, border: `1px solid rgba(227,169,62,0.25)`, borderRadius: 14, padding: "11px 13px", fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>{s.note}</div>}
      {s.entries.map((e, ei) => <SessionExCard key={ei} data={data} entry={e} ei={ei} sid={s.id} partner={e.ss ? s.entries.find((x, i) => i !== ei && x.ss === e.ss) : null}
        open={expanded === ei} setOpen={() => setExpanded(expanded === ei ? -1 : ei)}
        patchSet={patchSet} validate={validate} addSet={addSet} delSet={delSet}
        finishEx={() => { finishEx(ei); const nx = s.entries.findIndex((x, i) => i !== ei && !x.finished); if (nx >= 0) setExpanded(nx); }}
        setFeeling={f => mut(d => { d.sessions.find(x => x.id === s.id).entries[ei].feeling = f; })}
        onSwap={() => setSwapIdx(ei)} onBw={si => setBwEdit({ ei, si })} />)}
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
        <div className={undone === 0 ? "glow" : ""} style={{ borderRadius: 14 }}>
          <Btn full onClick={() => undone > 0 ? setConfirmEnd(true) : (endSession(), onFinished(s.id))}>Terminer la séance</Btn>
        </div>
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

function SessionExCard({ data, entry: e, ei, sid, open, setOpen, patchSet, validate, addSet, delSet, finishEx, setFeeling, onSwap, onBw, partner }) {
  const ex = data.exercises[e.exerciseId];
  const doneN = e.sets.filter(t => t.done && t.type !== "warmup").length;
  const totN = e.sets.filter(t => t.type !== "warmup").length;
  const rec = e.rec || {};
  const lastEn = exHistory(data, e.exerciseId).filter(en => en.sid !== sid).pop();
  const tips = morphoTips(data.profile, ex);
  const loaded = !["bw", "bwAssist"].includes(ex.kind);
  const isMain = e.role === "main";
  const roleLab = isMain ? (rec.test ? "TEST" : rec.calib ? "CALIBRATION" : rec.lin ? "LOURD · LINÉAIRE" : rec.technical ? "TECHNIQUE" : "LOURD") : rec.light ? "VOLUME" : e.role === "secondary" ? "SECONDAIRE" : e.role === "isolation" ? "ISOLATION" : "ACCESSOIRE";
  const recVal = isMain
    ? (rec.calib ? "À calibrer" : rec.test ? `${fk(rec.load)} kg × ${rec.amrap ? "max" : rec.reps}` : rec.top ? `${fk(rec.top)} kg × ${rec.R}` : rec.load ? `${fk(rec.load)} kg × ${rec.reps || 5}` : "—")
    : rec.light ? `${fk(rec.load)} kg × ${rec.reps}` : loaded ? (rec.load != null ? `${fk(rec.load)} kg` : "à toi de calibrer")
    : ex.kind === "bwAssist" ? (rec.assist ? `PDC −${fk(rec.assist)} kg` : rec.extra ? `PDC +${fk(rec.extra)} kg` : "Poids du corps") : "Poids du corps";
  const warmups = e.sets.map((t, si) => ({ t, si })).filter(x => x.t.type === "warmup");
  const works = e.sets.map((t, si) => ({ t, si })).filter(x => x.t.type !== "warmup");
  const nextIdx = e.sets.findIndex(t => !t.done);
  const amber = rec.mode === "recal" || rec.mode === "down" || rec.technical || rec.test;
  return <Card className="mb-3" style={{ padding: 0, overflow: "hidden", borderColor: open ? "rgba(255,92,46,0.3)" : LINE }}>
    <button onClick={setOpen} className="w-full flex items-center gap-3" style={{ padding: "13px 15px" }}>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 19, textTransform: "uppercase", letterSpacing: 0.4 }}>{ex.name}</span>
          <span className="shrink-0" style={{ fontFamily: FD, fontSize: 10, letterSpacing: 1, color: isMain ? ACC : MUT }}>{roleLab}</span>
          {e.ss && <span className="shrink-0" style={{ fontFamily: FD, fontSize: 10, letterSpacing: 1, color: AMB }}>SUPERSET</span>}
        </div>
        <div style={{ marginTop: 4 }}><MuscleChips ex={ex} /></div>
        {e.swappedFrom && <div style={{ color: AMB, fontSize: 12 }}>remplace {data.exercises[e.swappedFrom]?.name}</div>}
      </div>
      {e.finished && e.cmp ? <Verdict v={e.cmp.v} /> :
        <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: doneN ? ACC : MUT }}>{doneN}/{totN}</span>}
      {open ? <ChevronUp size={17} color={MUT} /> : <ChevronDown size={17} color={MUT} />}
    </button>
    {open && <div style={{ padding: "0 15px 15px" }}>
      <div style={{ borderLeft: `3px solid ${amber ? AMB : ACC}`, paddingLeft: 12, marginBottom: 10 }}>
        <Label style={{ fontSize: 10.5 }}>{isMain && rec.top != null ? `Top set · RPE ${String(rec.P).replace(".", ",")} visé` : isMain && rec.lin ? "3 séries · RPE ≤ 8,5" : "Recommandé aujourd’hui"}</Label>
        <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 33, lineHeight: 1.05, margin: "2px 0" }}>{recVal}</div>
        <div style={{ color: SUB, fontSize: 13.5, lineHeight: 1.5 }}>{rec.expl || rec.phrase}</div>
        {rec.note && <div style={{ color: AMB, fontSize: 13, marginTop: 4 }}>{rec.note}</div>}
      </div>
      {!isMain && <div style={{ color: MUT, fontSize: 13, marginBottom: 4 }}>
        Objectif : <b style={{ color: TXT }}>{rec.sets ?? e.plan.sets} × {e.plan.min}-{e.plan.max}{rec.amrap ? " (AMRAP)" : ""}</b>
        {rec.targetTotal ? <> · viser ≥ <b style={{ color: TXT }}>{rec.targetTotal} reps totales</b></> : null}</div>}
      {e.ss && partner && <div style={{ color: AMB, fontSize: 13, marginBottom: 6 }}>Superset avec {data.exercises[partner.exerciseId]?.name} : enchaîne les deux, puis repos.</div>}
      {e.autoMsg && <div className="flex gap-2" style={{ background: e.autoUp ? ACCSOFT : AMBSOFT, borderRadius: 10, padding: "8px 10px", color: TXT, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
        {e.autoUp && <Flame size={15} color={ACC} className="shrink-0" style={{ marginTop: 2 }} />}<span>{e.autoMsg}</span></div>}
      {lastEn && <div style={{ color: MUT, fontSize: 13, marginBottom: 8 }}>Dernière ({fmtDM(lastEn.date)}) : {condensedSets(ex, lastEn.sets)}</div>}
      {tips.map((t, i) => <div key={i} style={{ color: SUB, fontSize: 12.5, background: SURF2, borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>{t}</div>)}
      {warmups.length > 0 && <>
        <Label style={{ fontSize: 10.5, marginTop: 4 }}>{rec.calib ? "Montée de calibration" : "Rampes (hors stats)"}</Label>
        {warmups.map(({ t, si }) => <SetRow key={t.id} ex={ex} set={t} next={si === nextIdx}
          onPatch={p => patchSet(ei, si, p)} onValidate={() => validate(ei, si)} onDelete={() => delSet(ei, si)} onBw={() => onBw(si)} />)}
        <Label style={{ fontSize: 10.5, marginTop: 6 }}>Séries de travail</Label>
      </>}
      {works.map(({ t, si }) => <SetRow key={t.id} ex={ex} set={t} next={si === nextIdx} useRpe={isMain} defP={rec.P}
        onPatch={p => patchSet(ei, si, p)} onValidate={() => validate(ei, si)}
        onDelete={works.length > 1 ? () => delSet(ei, si) : null} onBw={() => onBw(si)} />)}
      <div className="flex gap-2 mt-2">
        <Btn small kind="subtle" onClick={() => addSet(ei)} style={{ flex: 1 }}><Plus size={15} /> Série</Btn>
        <Btn small kind="ghost" onClick={onSwap} style={{ flex: 1.3 }}><ArrowLeftRight size={15} /> Remplacer</Btn>
        <Btn small onClick={finishEx} style={{ flex: 1.3 }} disabled={!doneN}>Terminer</Btn>
      </div>
      {e.finished && <div className="mt-3">
        {e.cmp && <div className="flex items-center gap-2"><Verdict v={e.cmp.v} /><span style={{ color: SUB, fontSize: 13, lineHeight: 1.45 }}>{e.cmp.phrase}</span></div>}
        <div className="flex items-center gap-2 mt-2">
          <span style={{ color: MUT, fontSize: 12.5 }}>Sensation :</span>
          {[["faible", "Faible"], ["bonne", "Bonne"], ["forte", "Forte"]].map(([v, l]) => <Chip key={v} small on={e.feeling === v} onClick={() => setFeeling(v)}>{l}</Chip>)}
        </div>
      </div>}
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
    const rec = recommend(d, alt.id, { ...en.plan }, {});
    const loaded = !["bw", "bwAssist"].includes(alt.kind);
    const fresh = { exerciseId: alt.id, swappedFrom: en.swappedFrom || en.exerciseId, role: en.role === "main" ? "secondary" : en.role, plan: { ...en.plan }, rec, finished: false, cmp: null,
      sets: Array.from({ length: rec.sets }, (_, i) => ({ id: uid(), type: rec.amrap ? "amrap" : "normal", reps: rec.pref[i] ?? rec.min, rir: null, rpe: null, done: false,
        ...(loaded ? { load: rec.load } : { assist: rec.assist || 0, extra: rec.extra || 0 }) })) };
    if (doneSets.length) { en.sets = doneSets; en.finished = true; ss.entries.splice(ei + 1, 0, fresh); }
    else ss.entries[ei] = fresh;
  }); onClose(); };
  return <Sheet open onClose={onClose} title="Remplacer l’exercice">
    <div style={{ color: MUT, fontSize: 13.5, marginBottom: 12 }}>Alternatives classées par pertinence (même mouvement, même muscle, matériel dispo) :</div>
    <div className="flex flex-col gap-2">
      {alts.map(a => { const last = exHistory(data, a.id).pop();
        return <button key={a.id} onClick={() => pick(a)} className="flex items-center justify-between active:opacity-60" style={{ background: SURF2, border: `1px solid ${LINE}`, borderRadius: 13, padding: "12px 14px" }}>
          <div className="text-left min-w-0">
            <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 17 }}>{a.name}{a.fav && <Star size={13} color={ACC} fill={ACC} style={{ display: "inline", marginLeft: 6, verticalAlign: -1 }} />}</div>
            <div style={{ marginTop: 3 }}><MuscleChips ex={a} size={9.5} /></div>
            <div className="truncate" style={{ color: MUT, fontSize: 12 }}>{last ? `Dernière : ${condensedSets(a, last.sets)}` : "jamais fait — je calibrerai"}</div>
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
      {mode === "assist" && <div className="mt-4"><Field label="Assistance"><Stepper big v={t.assist} set={v => patchSet(bwEdit.ei, bwEdit.si, { assist: v })} step={5} min={0} max={80} fmt={x => `−${fk(x)} kg`} /></Field>
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
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 32, textTransform: "uppercase", lineHeight: 1.05, margin: "4px 0 18px" }}>{s.name}</h1>
    <div className="flex gap-2.5 mb-4">
      <StatTile label="Durée" value={s.duration ? fmtDur(s.duration) : "—"} />
      <StatTile label="Exercices" value={s.entries.length} />
      <StatTile label="Séries" value={workSets} />
      <StatTile label="Records" value={(s.records || []).length} accent={(s.records || []).length > 0} />
    </div>
    {(s.e1Updates || []).length > 0 && <Card className="mb-3" style={{ borderColor: "rgba(255,92,46,0.35)" }}>
      <div className="flex items-center gap-2 mb-2"><Target size={16} color={ACC} /><Label style={{ color: ACC }}>e1RM mis à jour</Label></div>
      {(s.e1Updates || []).map((r, i) => <div key={i} style={{ fontSize: 14.5, padding: "4px 0", lineHeight: 1.45 }}>{r}</div>)}
    </Card>}
    {(s.records || []).length > 0 && <Card className="mb-3">
      <div className="flex items-center gap-2 mb-2"><Trophy size={17} color={ACC} /><Label style={{ color: ACC }}>Records battus</Label></div>
      {(s.records || []).map((r, i) => <div key={i} style={{ fontSize: 14.5, padding: "5px 0", lineHeight: 1.45 }}>{r}</div>)}
    </Card>}
    <Card style={{ padding: "6px 16px" }}>
      {s.entries.map((e, i) => { const ex = data.exercises[e.exerciseId]; if (!ex) return null;
        return <div key={i} style={{ padding: "12px 0", borderBottom: i < s.entries.length - 1 ? `1px solid ${LINE}` : "none" }}>
          <div className="flex items-center justify-between gap-2">
            <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 16.5 }}>{ex.name} {e.role === "main" && <span style={{ color: ACC, fontSize: 11, letterSpacing: 1 }}>MAIN</span>}</span>
            {e.cmp && <Verdict v={e.cmp.v} />}
          </div>
          <div style={{ marginTop: 3 }}><MuscleChips ex={ex} size={9.5} /></div>
          <div style={{ color: SUB, fontSize: 13, marginTop: 4 }}>{condensedSets(ex, e.sets)}</div>
          {e.cmp && <div style={{ color: MUT, fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{e.cmp.phrase}</div>}
        </div>; })}
    </Card>
    {s.checkin && <div style={{ color: MUT, fontSize: 13, margin: "12px 4px 0" }}>Forme du jour : {fk1(readiness(s.checkin))} / 5{s.checkin.pain ? " · douleur signalée" : ""}</div>}
    <div className="flex-1" />
    <div className="mt-6"><Btn full onClick={onClose}>{readonly ? "Fermer" : "Retour à l’accueil"}</Btn></div>
  </div>;
}
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
                : plan ? <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15.5, color: SUB }}>{dayName(data, plan)}</div>
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
      <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 22, textTransform: "uppercase", marginBottom: 4 }}>{dayName(data, plan)}</div>
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
        <div className="flex flex-wrap gap-2">{splitDayKeys(data).map(k => <Chip key={k} small onClick={() => { mut(d => { d.program.overrides[dte] = k; }); onClose(); }}>{dayName(data, k)}</Chip>)}</div>
      </div>}
    </>}
  </Sheet>;
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* PROGRESSION                                                         */
/* ------------------------------------------------------------------ */
function ProgressScreen({ data, mut, openEx }) {
  const [sub, setSub] = useState("force");
  return <div style={{ padding: "22px 18px 8px" }}>
    <Label>Suivi</Label>
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 36, textTransform: "uppercase", margin: "2px 0 14px" }}>Progression</h1>
    <div className="mb-4"><Seg small val={sub} set={setSub} opts={[{ v: "force", l: "Force" }, { v: "musc", l: "Muscles" }, { v: "corps", l: "Corps" }, { v: "mouv", l: "Mouvements" }]} /></div>
    {sub === "force" && <ForceTab data={data} openEx={openEx} />}
    {sub === "musc" && <MusclesTab data={data} />}
    {sub === "corps" && <CorpsTab data={data} mut={mut} />}
    {sub === "mouv" && <MovementsTab data={data} openEx={openEx} />}
  </div>;
}

function ForceTab({ data, openEx }) {
  const goals = strengthGoals(data);
  const slots = activeSlots(data);
  const e1Tot = UPPER_SLOTS.every(k => data.mains[k].e1) ? Math.round(UPPER_SLOTS.reduce((a, k) => a + data.mains[k].e1, 0)) : null;
  const [sel, setSel] = useState("press");
  const st = data.mains[sel] || data.mains.press;
  const pts = st.hist.filter(h => daysBetween(h.date, todayISO()) <= 180).map(h => ({ d: fmtDM(h.date), v: Math.round(h.v * 10) / 10 }));
  const avgWk = goals.filter(g => g.pctWk != null);
  const mean = avgWk.length ? avgWk.reduce((a, g) => a + g.pctWk, 0) / avgWk.length : null;
  return <>
    <div className="flex gap-2.5 mb-4">
      <StatTile label="Force totale" value={e1Tot ?? "—"} sub={e1Tot ? "kg · 4 mains" : "à calibrer"} accent={!!e1Tot} />
      <StatTile label="Rythme" value={mean != null ? `${mean > 0 ? "+" : ""}${fk1(mean)} %` : "—"} sub="e1RM / semaine" />
      <StatTile label="Poids" value={fk(ma7(data.weights, todayISO()) || data.profile.weight)} sub="kg (7 j)" />
    </div>
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <Label>e1RM</Label>
        <Seg small val={sel} set={setSel} opts={slots.map(k => ({ v: k, l: SLOTS[k].name }))} />
      </div>
      <ChartBox pts={pts} unit="kg" height={170} />
      <button onClick={() => openEx(st.variantId)} className="w-full flex items-center justify-between active:opacity-60 mt-2" style={{ color: MUT, fontSize: 13 }}>
        <span>{data.exercises[st.variantId]?.name} · {st.mode === "lin" ? "progression linéaire" : "pilotage RPE par blocs"}</span><ChevronRight size={15} /></button>
    </Card>
    <Label style={{ marginBottom: 8 }}>Objectifs de force</Label>
    <Card style={{ padding: "8px 16px" }}>
      {goals.map((g, gi) => {
        const pct = g.e1 && g.target && g.base ? clamp(((g.e1 - g.base) / Math.max(1, g.target - g.base)) * 100, 2, 100) : 0;
        return <div key={g.slot} style={{ padding: "12px 0", borderBottom: gi < goals.length - 1 ? `1px solid ${LINE}` : "none" }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 16 }}>{SLOTS[g.slot].name} <span style={{ color: MUT, fontSize: 12, fontWeight: 400 }}>· {g.ex?.name}</span></span>
            <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 16 }}>{g.e1 ? `${fk(g.e1)} kg` : "—"}
              {g.gain != null && Math.abs(g.gain) >= 0.5 && <span style={{ color: g.gain > 0 ? ACC : RED, fontSize: 12.5, marginLeft: 6 }}>{g.gain > 0 ? "+" : ""}{fk1(g.gain)} %</span>}</span>
          </div>
          <div style={{ marginTop: 8 }}><Bar pct={pct} color={ACC} /></div>
          <div className="flex justify-between" style={{ marginTop: 5, color: MUT, fontSize: 11.5 }}>
            <span>{g.e1 ? `Départ ${fk(g.base)} kg${g.rel ? ` · ${fk1(g.rel)} × PDC` : ""}` : "Se calibre à la 1re séance"}</span>
            {g.target && <span>Objectif {fk(g.target)} kg{g.weeksTo ? ` · ~${g.weeksTo} sem.` : g.pctWk != null && g.pctWk <= 0 ? " · en pause" : ""}</span>}
          </div>
        </div>; })}
    </Card>
    <div style={{ color: MUT, fontSize: 12, lineHeight: 1.5, margin: "10px 4px 0" }}>Sur machines il n’existe pas de standards universels (chaque machine a sa propre courbe de résistance) : ton objectif est +25 % d’e1RM depuis ton départ, projeté avec ta pente des 8 dernières semaines.</div>
  </>;
}

function MusclesTab({ data }) {
  const ws = addDays(todayISO(), -(dow(todayISO()) - 1));
  const done = muscleVolume(data, ws);
  const tgt = weekTargets(data);
  const b = curBlock(data);
  return <>
    <div style={{ color: SUB, fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
      Séries efficaces cette semaine vs ta cible du bloc ({b.type === "force" ? "réduite en bloc force" : `montée progressive vers le max récupérable`}). Un exercice secondaire compte 0,5-0,75 série pour les muscles d’assistance.</div>
    <Card style={{ padding: "8px 16px" }}>
      {MKEYS.filter(m => tgt[m] > 0 || done[m] > 0).map(m => {
        const [mev, , , mrv] = VOL[m];
        const t = tgt[m], v = done[m];
        const pct = clamp((v / mrv) * 100, 0, 100);
        const ok = v >= t * 0.85 && v <= mrv;
        const adj = data.volAdj[m] || 0;
        return <div key={m} style={{ padding: "10px 0", borderBottom: m !== "abdos" ? `1px solid ${LINE}` : "none" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 14.5 }}>{MUSCLES[m]}{data.profile.weakPoints?.includes(m) && <span style={{ color: ACC, fontSize: 11, marginLeft: 6, letterSpacing: 1 }}>PRIORITÉ</span>}</span>
            <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 600, fontSize: 14, color: ok ? ACC : v > mrv ? RED : SUB }}>
              {fk(v)} / {t}{adj !== 0 && <span style={{ color: MUT, fontSize: 11 }}> ({adj > 0 ? "+" : ""}{adj} auto)</span>}</span>
          </div>
          <div className="relative">
            <Bar pct={pct} color={v > mrv ? RED : ok ? ACC : SUB} />
            <div style={{ position: "absolute", top: -2, bottom: -2, left: `${(t / mrv) * 100}%`, width: 2, background: TXT, opacity: 0.5, borderRadius: 2 }} />
            <div style={{ position: "absolute", top: -2, bottom: -2, left: `${(mev / mrv) * 100}%`, width: 2, background: MUT, opacity: 0.5, borderRadius: 2 }} />
          </div>
        </div>; })}
    </Card>
    <div style={{ color: MUT, fontSize: 12, lineHeight: 1.5, margin: "10px 4px 0" }}>Trait gris = minimum efficace, trait blanc = cible de la semaine. La cible s’auto-ajuste chaque semaine selon tes courbatures et tes perfs.</div>
  </>;
}

function CorpsTab({ data, mut }) {
  const t0 = todayISO();
  const [w, setW] = useState(null);
  const [wa, setWa] = useState(null);
  const p = data.profile;
  const pts = data.weights.filter(x => daysBetween(x.date, t0) <= 120).map(x => ({ d: fmtDM(x.date), v: x.w }));
  const maNow = ma7(data.weights, t0), maPrev = ma7(data.weights, addDays(t0, -14));
  const slope = maNow && maPrev ? ((maNow - maPrev) / maPrev) * 100 / 2 : null; // %/sem
  const kt = kcalTarget(data), td = tdee(data);
  const prot = protTarget(data);
  let advice = null;
  if (slope != null) {
    if (p.phase === "bulk" && slope < 0.05) advice = "Ta tendance stagne pour une prise de masse : ajoute ~150 kcal/j et re-regarde dans 2 semaines.";
    if (p.phase === "seche" && slope > -0.15) advice = "La sèche n’avance pas assez : retire ~150 kcal/j ou ajoute 2 000 pas quotidiens.";
    if (p.phase === "seche" && slope < -1) advice = "Tu descends très vite (> 1 %/sem) : remonte un peu les calories pour protéger le muscle.";
    if (p.phase === "recompo" && slope > 0.25) advice = "Ton poids monte en recompo : retire ~150 kcal/j pour rester sec en gagnant du muscle.";
    if (p.phase === "recompo" && slope < -0.6) advice = "Tu perds vite pour une recompo : ajoute ~150 kcal/j pour garder ta force qui monte.";
    if (p.phase === "maintien" && Math.abs(slope) > 0.35) advice = `Ton poids ${slope > 0 ? "monte" : "descend"} en phase de maintien : ajuste d’environ 150 kcal.`;
  }
  return <>
    <div className="flex gap-2.5 mb-4">
      <StatTile label="Poids (moy. 7 j)" value={fk(maNow || p.weight)} sub="kg" accent />
      <StatTile label="Tendance" value={slope != null ? `${slope > 0 ? "+" : ""}${fk1(slope)} %` : "—"} sub="par semaine" />
      <StatTile label="Objectif" value={fk(p.targetWeight)} sub="kg" />
    </div>
    <Card className="mb-4">
      <Label style={{ marginBottom: 6 }}>Phase</Label>
      <Seg small val={p.phase} set={v => mut(d => { d.profile.phase = v; })} opts={[{ v: "bulk", l: "Masse" }, { v: "recompo", l: "Recompo" }, { v: "maintien", l: "Maintien" }, { v: "seche", l: "Sèche" }]} />
      {kt && <div className="flex gap-2.5 mt-3">
        <StatTile label="Calories cibles" value={kt} sub={`TDEE ≈ ${td}`} accent />
        <StatTile label="Protéines" value={prot ? `${prot} g` : "—"} sub={`${p.phase === "seche" || p.phase === "recompo" ? "2,1" : "1,8"} g/kg/j`} />
      </div>}
      {p.phase === "recompo" && <div style={{ color: MUT, fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>Recomposition : léger déficit (−150 kcal) et protéines hautes. En reprise, tu peux prendre du muscle en perdant un peu de gras — le tour de taille est ton meilleur indicateur.</div>}
      {p.phase === "seche" && <div style={{ color: MUT, fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>En sèche, le volume d’entraînement est réduit de 20 % automatiquement — la force se maintient, les records attendront la fin.</div>}
      {advice && <div style={{ background: AMBSOFT, borderRadius: 10, padding: "9px 11px", fontSize: 13, lineHeight: 1.5, marginTop: 10 }}>{advice}</div>}
    </Card>
    <Card className="mb-4">
      <Label style={{ marginBottom: 4 }}>Courbe de poids</Label>
      <ChartBox pts={pts} unit="kg" height={160} />
      <div className="flex items-end gap-3 mt-3 flex-wrap">
        <Field label="Poids du jour"><div className="flex gap-2"><NIn v={w} set={setW} suffix="kg" w={56} />
          <Btn small disabled={w == null} onClick={() => { mut(d => upsertWeight(d, t0, w)); setW(null); }}>OK</Btn></div></Field>
        <Field label="Tour de taille"><div className="flex gap-2"><NIn v={wa} set={setWa} suffix="cm" w={56} />
          <Btn small kind="ghost" disabled={wa == null} onClick={() => { mut(d => { d.waist.push({ date: t0, v: wa }); }); setWa(null); }}>OK</Btn></div></Field>
      </div>
      {data.waist.length > 0 && <div style={{ color: MUT, fontSize: 12.5, marginTop: 8 }}>Taille : {fk(data.waist[data.waist.length - 1].v)} cm le {fmtDM(data.waist[data.waist.length - 1].date)}{data.waist.length > 1 ? ` (avant : ${fk(data.waist[data.waist.length - 2].v)} cm)` : ""}</div>}
    </Card>
  </>;
}

function MovementsTab({ data, openEx }) {
  const inProg = new Set(Object.values(data.program.templates || {}).flat().map(x => x.exId));
  const isMain = ex => activeSlots(data).some(k => data.mains[k].variantId === ex.id);
  const ids = Object.values(data.exercises)
    .filter(ex => inProg.has(ex.id) || exHistory(data, ex.id).length > 0)
    .sort((a, b) => (isMain(b) - isMain(a)) || (inProg.has(b.id) - inProg.has(a.id)));
  return <Card style={{ padding: "4px 16px" }}>
    {ids.map((ex, i) => {
      const h = exHistory(data, ex.id); const last = h[h.length - 1];
      const tb = trendBadge(data, ex.id);
      return <button key={ex.id} onClick={() => openEx(ex.id)} className="w-full flex items-center gap-3 active:opacity-60" style={{ padding: "12px 0", borderBottom: i < ids.length - 1 ? `1px solid ${LINE}` : "none" }}>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="truncate" style={{ fontFamily: FD, fontWeight: 600, fontSize: 16.5 }}>{ex.name}</span>
            {ex.e1 && <span className="tabular-nums shrink-0" style={{ color: MUT, fontSize: 12 }}>e1RM {fk(ex.e1)}</span>}
          </div>
          <div className="truncate" style={{ color: MUT, fontSize: 12.5, marginTop: 2 }}>{last ? `${fmtDM(last.date)} · ${condensedSets(ex, last.sets)}` : "Pas encore de séance"}</div>
        </div>
        <span className="shrink-0" style={{ fontFamily: FD, fontWeight: 700, fontSize: 11.5, letterSpacing: 0.8, color: tb.c }}>{tb.t}</span>
        <ChevronRight size={16} color={MUT} className="shrink-0" />
      </button>; })}
  </Card>;
}

/* ------------------------------------------------------------------ */
/* EXERCISES LIBRARY                                                   */
/* ------------------------------------------------------------------ */
function ExercisesScreen({ data, mut, openEx }) {
  const [q, setQ] = useState("");
  const [fm, setFm] = useState(null);
  const [add, setAdd] = useState(false);
  const list = Object.values(data.exercises)
    .filter(ex => !q || ex.name.toLowerCase().includes(q.toLowerCase()))
    .filter(ex => !fm || (ex.m?.[fm] || 0) >= 0.5)
    .sort((a, b) => (b.fav - a.fav) || ((b.m?.[fm || ""] || 0) - (a.m?.[fm || ""] || 0)) || a.name.localeCompare(b.name));
  return <div style={{ padding: "22px 18px 8px" }}>
    <div className="flex items-center justify-between">
      <div><Label>Bibliothèque</Label>
        <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 36, textTransform: "uppercase", margin: "2px 0 0" }}>Exercices</h1></div>
      <button onClick={() => setAdd(true)} className="active:opacity-60 p-3" style={{ background: ACC, borderRadius: 14 }}><Plus size={20} color="#0B0C0E" strokeWidth={2.6} /></button>
    </div>
    <div className="my-4"><TIn v={q} set={setQ} ph="Rechercher…" /></div>
    <div className="flex gap-2 overflow-x-auto pb-2 mb-2" style={{ margin: "0 -18px", padding: "0 18px 8px" }}>
      <Chip small on={!fm} onClick={() => setFm(null)}>Tous</Chip>
      {MKEYS.map(m => <Chip key={m} small on={fm === m} onClick={() => setFm(fm === m ? null : m)}>{ML[m]}</Chip>)}
    </div>
    <Card style={{ padding: "4px 16px" }}>
      {list.map((ex, i) => { const h = exHistory(data, ex.id); const last = h[h.length - 1];
        const isMainVar = activeSlots(data).some(k => data.mains[k].variantId === ex.id);
        return <button key={ex.id} onClick={() => openEx(ex.id)} className="w-full flex items-center gap-3 active:opacity-60" style={{ padding: "12px 0", borderBottom: i < list.length - 1 ? `1px solid ${LINE}` : "none", opacity: ex.avoid ? 0.5 : 1 }}>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate" style={{ fontFamily: FD, fontWeight: 600, fontSize: 16.5 }}>{ex.name}</span>
              {ex.fav && <Star size={13} color={ACC} fill={ACC} className="shrink-0" />}
              {ex.locked && <Lock size={12} color={SUB} className="shrink-0" />}
              {isMainVar && <span className="shrink-0" style={{ color: ACC, fontFamily: FD, fontSize: 10, letterSpacing: 1 }}>MAIN</span>}
            </div>
            <div style={{ marginTop: 3 }}><MuscleChips ex={ex} size={9.5} /></div>
            <div className="truncate" style={{ color: MUT, fontSize: 12.5, marginTop: 2 }}>{last ? `${fmtDM(last.date)} · ${condensedSets(ex, last.sets)}` : KINDS[ex.kind]}</div>
          </div>
          <ChevronRight size={16} color={MUT} className="shrink-0" />
        </button>; })}
      {!list.length && <Empty text="Aucun exercice ne correspond." />}
    </Card>
    <AddExSheet open={add} onClose={() => setAdd(false)} mut={mut} openEx={openEx} />
  </div>;
}
function AddExSheet({ open, onClose, mut, openEx }) {
  const [f, setF] = useState({ name: "", m: "pectoraux", kind: "machine", inc: 2.5, iso: false });
  const create = () => { const id = "c" + uid();
    /* le pattern permet au moteur de l'intégrer au programme (ex. une machine de ta salle) */
    const PAT = { pectoraux: ["hpush", "fly"], dos: ["hpull", "pullover"], deltA: ["vpush", "lateral"], deltL: ["vpush", "lateral"], deltP: ["hpull", "rear"], biceps: ["curl", "curl"], triceps: ["dip", "tri_push"],
      abdos: ["abs", "abs"], quadriceps: ["squat", "quad_iso"], ischios: ["hinge", "ham_iso"], fessiers: ["hinge", "hinge"], mollets: ["calf", "calf"] };
    mut(d => { d.exercises[id] = { ...E(f.name.trim(), PAT[f.m][f.iso ? 1 : 0], { [f.m]: 1 }, f.kind, f.kind === "bw" ? 0 : f.inc, 2, 4, { iso: f.iso }), id, custom: true, ...USER_EX_DEFAULTS }; });
    onClose(); openEx(id); };
  return <Sheet open={open} onClose={onClose} title="Nouvel exercice" tall>
    <div className="flex flex-col gap-4">
      <Field label="Nom"><TIn v={f.name} set={v => setF(x => ({ ...x, name: v }))} ph="Ex. Élévations frontales poulie" /></Field>
      <Field label="Muscle principal"><div className="flex flex-wrap gap-2">{MKEYS.map(m => <Chip key={m} small on={f.m === m} onClick={() => setF(x => ({ ...x, m }))}>{ML[m]}</Chip>)}</div></Field>
      <Field label="Type de charge"><Seg small opts={Object.entries(KINDS).map(([v, l]) => ({ v, l }))} val={f.kind} set={v => setF(x => ({ ...x, kind: v }))} /></Field>
      {!["bw", "bwAssist"].includes(f.kind) && <Field label="Incrément"><Stepper v={f.inc} set={v => setF(x => ({ ...x, inc: v }))} step={0.25} min={0.5} max={10} fmt={x => `${fk(x)} kg`} /></Field>}
      <Field label="Isolation ?"><Seg small opts={[{ v: false, l: "Polyarticulaire" }, { v: true, l: "Isolation" }]} val={f.iso} set={v => setF(x => ({ ...x, iso: v }))} /></Field>
      <Btn full disabled={!f.name.trim()} onClick={create}>Créer</Btn>
    </div>
  </Sheet>;
}

/* ------------------------------------------------------------------ */
/* EXERCISE DETAIL                                                     */
/* ------------------------------------------------------------------ */
function ExerciseDetail({ data, mut, exId, onBack }) {
  const ex = data.exercises[exId];
  const [metric, setMetric] = useState("charge");
  const [period, setPeriod] = useState(90);
  const [settings, setSettings] = useState(false);
  const [editSid, setEditSid] = useState(null);
  if (!ex) return null;
  const h = exHistory(data, exId);
  const R = computeRecords(data, exId);
  const tb = trendBadge(data, exId);
  const plan = defaultPlanFor(data, exId);
  const slotK = activeSlots(data).find(k => data.mains[k].variantId === exId);
  const rec = slotK ? prescribeMain(data, slotK, weekParams(data, null)) : recommend(data, exId, plan, {});
  const stag = !slotK ? stagnation(data, exId, plan) : null;
  const pts = seriesFor(data, exId, metric, addDays(todayISO(), -period));
  const loaded = !["bw", "bwAssist"].includes(ex.kind);
  const recVal = slotK
    ? (rec.calib ? "Calibration" : rec.test ? `${fk(rec.load)} kg` : rec.top != null ? `${fk(rec.top)} kg × ${rec.R}` : rec.load ? `${fk(rec.load)} kg × ${rec.reps}` : "—")
    : loaded ? (rec.load != null ? `${fk(rec.load)} kg` : "à calibrer")
    : ex.kind === "bwAssist" ? (rec.assist ? `PDC −${fk(rec.assist)}` : rec.extra ? `PDC +${fk(rec.extra)}` : "PDC") : "PDC";
  return <div style={{ padding: "18px 18px 40px" }}>
    <div className="flex items-center gap-3 mb-4">
      <button onClick={onBack} className="p-2 active:opacity-60" style={{ background: SURF2, borderRadius: 11 }}><ChevronLeft size={19} color={SUB} /></button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate" style={{ fontFamily: FD, fontWeight: 700, fontSize: 23, textTransform: "uppercase" }}>{ex.name}</span>
          {slotK && <span style={{ color: ACC, fontFamily: FD, fontSize: 10.5, letterSpacing: 1 }}>MAIN {SLOTS[slotK].name.toUpperCase()}</span>}
        </div>
        <div style={{ marginTop: 3 }}><MuscleChips ex={ex} /></div>
      </div>
      <span className="shrink-0" style={{ fontFamily: FD, fontWeight: 700, fontSize: 11.5, letterSpacing: 0.8, color: tb.c }}>{tb.t}</span>
      <button onClick={() => setSettings(true)} className="p-2 active:opacity-60 shrink-0" style={{ background: SURF2, borderRadius: 11 }}><Settings2 size={18} color={SUB} /></button>
    </div>

    <div className="flex gap-2.5 mb-4">
      {(loaded || ex.kind === "bwAssist") && <StatTile label="e1RM" value={slotK && data.mains[slotK].e1 ? fk(data.mains[slotK].e1) : ex.e1 ? fk(ex.e1) : "—"} sub="kg estimé" accent />}
      {loaded && <StatTile label="Charge max" value={R.load ? fk(R.load.v) : "—"} sub={R.load ? `× ${R.load.reps} le ${fmtDM(R.load.date)}` : "—"} />}
      {ex.kind === "bwAssist" && <StatTile label="Record PDC" value={R.bwReps ? R.bwReps.v : "—"} sub={R.maxExtra ? `lest +${fk(R.maxExtra.v)} kg` : R.minAssist ? `assist. −${R.minAssist.v} kg` : "reps"} />}
      {ex.kind === "bw" && <StatTile label="Record" value={R.bwReps ? R.bwReps.v : "—"} sub={ex.unit === "s" ? "secondes" : "répétitions"} accent />}
      <StatTile label="Séances" value={h.length} sub={h.length ? `dern. ${fmtDM(h[h.length - 1].date)}` : "—"} />
    </div>

    <Card className="mb-3" style={{ borderColor: "rgba(255,92,46,0.3)" }}>
      <Label style={{ color: ACC }}>La prochaine fois</Label>
      <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 30, margin: "3px 0" }}>{recVal}</div>
      <div style={{ color: SUB, fontSize: 13.5, lineHeight: 1.5 }}>{rec.expl || rec.phrase}</div>
      {!slotK && <div style={{ color: MUT, fontSize: 12.5, marginTop: 5 }}>Cadre : {rec.sets ?? plan.sets} séries × {plan.min}-{plan.max} reps</div>}
    </Card>

    {stag && <Card className="mb-3" style={{ borderColor: "rgba(227,169,62,0.35)" }}>
      <div className="flex items-center gap-2 mb-1"><AlertTriangle size={15} color={AMB} /><Label style={{ color: AMB }}>Stagnation depuis le {fmtDM(stag.since)}</Label></div>
      <div style={{ color: SUB, fontSize: 13.5, lineHeight: 1.55 }}>{stag.suggestions.map((s, i) => <div key={i} style={{ padding: "3px 0" }}>· {s}</div>)}</div>
    </Card>}

    <Card className="mb-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <Seg small val={metric} set={setMetric} opts={[
          ...(loaded || ex.kind === "bwAssist" ? [{ v: "charge", l: "Charge" }, { v: "e1", l: "e1RM" }] : []),
          { v: "reps", l: "Reps" }, ...(loaded ? [{ v: "vol", l: "Volume" }] : [])]} />
        <Seg small val={period} set={setPeriod} opts={[{ v: 30, l: "1 m" }, { v: 90, l: "3 m" }, { v: 365, l: "1 an" }]} />
      </div>
      <ChartBox pts={pts} unit={metric === "reps" ? (ex.unit === "s" ? "s" : "reps") : "kg"} />
    </Card>

    {Object.keys(R.rmap || {}).length > 0 && <Card className="mb-3" style={{ padding: "8px 16px" }}>
      <Label style={{ padding: "6px 0" }}>Records par charge</Label>
      {Object.entries(R.rmap).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 6).map(([l, r]) => <div key={l} className="flex justify-between tabular-nums" style={{ padding: "6px 0", fontSize: 14.5 }}>
        <span>{fk(Number(l))} kg</span><span style={{ color: SUB }}>{r.v} reps · {fmtDM(r.date)}</span></div>)}
    </Card>}

    <Label style={{ margin: "14px 0 8px" }}>Historique</Label>
    {!h.length && <Empty text="Aucune séance enregistrée avec cette variante." />}
    {[...h].reverse().slice(0, 20).map((en, i) => <Card key={i} className="mb-2" style={{ padding: "11px 14px" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 14.5 }}>{fmtDMY(en.date)}</span>
        <button onClick={() => setEditSid(en.sid)} className="p-1.5 active:opacity-60"><Pencil size={14} color={MUT} /></button>
      </div>
      <div style={{ color: SUB, fontSize: 13.5, marginTop: 3 }}>{condensedSets(ex, en.sets)}</div>
    </Card>)}

    <ExSettingsSheet data={data} mut={mut} exId={exId} open={settings} onClose={() => setSettings(false)} />
    {editSid && <EditEntrySheet data={data} mut={mut} exId={exId} sid={editSid} onClose={() => setEditSid(null)} />}
  </div>;
}

/* ------------------------------------------------------------------ */
/* PROFILE                                                             */
/* ------------------------------------------------------------------ */
function VerifyCard({ data, mut }) {
  const items = data.verify.filter(v => !v.resolved);
  if (!items.length) return null;
  const resolve = (id, fn) => mut(d => { fn && fn(d); const it = d.verify.find(x => x.id === id); if (it) it.resolved = true; });
  return <Card className="mb-4" style={{ borderColor: "rgba(227,169,62,0.35)" }}>
    <div className="flex items-center gap-2 mb-2"><AlertTriangle size={17} color={AMB} /><Label style={{ color: AMB }}>Données à vérifier ({items.length})</Label></div>
    {items.map(it => <div key={it.id} style={{ padding: "10px 0", borderTop: `1px solid ${LINE}` }}>
      <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15.5 }}>{it.title}</div>
      <div style={{ color: SUB, fontSize: 13, lineHeight: 1.5, margin: "4px 0 8px" }}>{it.desc}</div>
      <div className="flex flex-wrap gap-2">
        {it.kind === "date" && <>
          <Btn small onClick={() => resolve(it.id, d => { const s = d.sessions.find(x => x.id === it.sid); if (s) { s.date = "2026-06-13"; s.verifyDate = false; s.name = "Séance importée"; } })}>C’était juin 2026</Btn>
          <Btn small kind="ghost" onClick={() => resolve(it.id, d => { const s = d.sessions.find(x => x.id === it.sid); if (s) s.verifyDate = false; })}>Garder 2025</Btn>
        </>}
        {it.kind === "dips15" && <>
          <Btn small onClick={() => resolve(it.id, d => { const s = d.sessions.find(x => x.id === it.sid); const e = s?.entries.find(x => x.exerciseId === "dips");
            if (e) { e.sets = [mk({ reps: 8, bw: 72, done: true }), mk({ reps: 4, bw: 72, done: true, note: "demi-série" })]; e.pendingNote = null; } })}>1 × 8 puis ~moitié</Btn>
          <Btn small kind="ghost" onClick={() => resolve(it.id, d => { const s = d.sessions.find(x => x.id === it.sid); const e = s?.entries.find(x => x.exerciseId === "dips");
            if (e) { e.sets = [mk({ reps: 8, bw: 72, done: true })]; e.pendingNote = null; } })}>Juste 1 × 8</Btn>
          <Btn small kind="subtle" onClick={() => resolve(it.id, d => { const s = d.sessions.find(x => x.id === it.sid); const e = s?.entries.find(x => x.exerciseId === "dips"); if (e) e.pendingNote = null; })}>Ignorer</Btn>
        </>}
        {it.kind === "lat" && <>
          <Btn small onClick={() => resolve(it.id, d => { const s = d.sessions.find(x => x.id === it.sid); const e = s?.entries.find(x => x.exerciseId === "lateralraise");
            if (e) { e.sets = [mk({ load: 23, reps: 5, done: true })]; e.pendingNote = null; } })}>1 série de 5 à 23 kg</Btn>
          <Btn small kind="ghost" onClick={() => resolve(it.id, d => { const s = d.sessions.find(x => x.id === it.sid); const e = s?.entries.find(x => x.exerciseId === "lateralraise");
            if (e) { e.sets = rep(5, { load: 23, reps: 10 }).map(t => ({ ...t, done: true })); e.pendingNote = null; } })}>5 séries à 23 kg</Btn>
          <Btn small kind="subtle" onClick={() => resolve(it.id)}>Ignorer</Btn>
        </>}
      </div>
    </div>)}
  </Card>;
}

function ObjSheet({ data, mut, open, onClose }) {
  const p = data.profile;
  const up = (k, v) => mut(d => { d.profile[k] = v; });
  const regen = () => mut(d => { pickMainVariants(d); initCycle(d); });
  return <Sheet open={open} onClose={onClose} title="Objectif & programme" tall>
    <div className="flex flex-col gap-4">
      <Field label="Niveau"><Seg small opts={[{ v: "deb", l: "Débutant" }, { v: "int", l: "Inter." }, { v: "adv", l: "Avancé" }]} val={p.level} set={v => up("level", v)} /></Field>
      <Field label="Curseur Hypertrophie ↔ Force" hint={`Blocs à venir : ${buildSeq(p.goal, p.level).map(b => b.type === "test" ? "Test" : b.type === "force" ? "Force" : "Hyper").join(" → ")}`}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: FD, fontSize: 12.5, color: p.goal <= 45 ? ACC : MUT }}>MUSCLE</span>
          <RangeSlider v={p.goal} set={v => up("goal", v)} />
          <span style={{ fontFamily: FD, fontSize: 12.5, color: p.goal >= 55 ? ACC : MUT }}>FORCE</span>
        </div></Field>
      <Field label="Jours d’entraînement"><div className="flex flex-wrap gap-2">{D2.map((l, i) => <Chip key={i} small on={p.days.includes(i + 1)}
        onClick={() => up("days", p.days.includes(i + 1) ? p.days.filter(x => x !== i + 1) : [...p.days, i + 1].sort((a, b) => a - b))}>{l}</Chip>)}</div></Field>
      <Field label="Temps par séance"><Seg small opts={[45, 60, 75, 90].map(v => ({ v, l: `${v}′` }))} val={p.sessionMinutes} set={v => up("sessionMinutes", v)} /></Field>
      <Field label="Jambes" hint={legsMode(data) !== (p.legs || "off") ? "« Complet » demande 5 jours ou plus : entretien en attendant." : "Le haut du corps reste prioritaire dans tous les cas."}>
        <Seg small opts={Object.entries(LEGS_MODES).map(([v, l]) => ({ v, l }))} val={p.legs || "off"} set={v => up("legs", v)} /></Field>
      <div style={{ color: SUB, fontSize: 13, lineHeight: 1.5 }}>Semaine : <b style={{ color: TXT }}>{splitKeys(data).map(k => dayName(data, k).split(" · ")[0]).join(" · ")}</b> (déduite de tes jours).</div>
      <Field label="Points faibles (max 2)"><div className="flex flex-wrap gap-2">{MKEYS.map(m => <Chip key={m} small on={p.weakPoints.includes(m)}
        onClick={() => up("weakPoints", p.weakPoints.includes(m) ? p.weakPoints.filter(x => x !== m) : p.weakPoints.length < 2 ? [...p.weakPoints, m] : p.weakPoints)}>{ML[m]}</Chip>)}</div></Field>
      <Field label="Zones à ménager"><div className="flex flex-wrap gap-2">{Object.entries(ZONES).map(([z, l]) => <Chip key={z} small color={RED} on={!!p.avoidZones[z]}
        onClick={() => up("avoidZones", { ...p.avoidZones, [z]: !p.avoidZones[z] })}>{l}</Chip>)}</div></Field>
      <Field label="Mon matériel"><div className="flex flex-wrap gap-2">{EQUIP_LIST.map(([id, l]) => <Chip key={id} small on={p.equipment.includes(id)}
        onClick={() => up("equipment", p.equipment.includes(id) ? p.equipment.filter(x => x !== id) : [...p.equipment, id])}>{l}</Chip>)}</div></Field>
      <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5 }}>Les variantes de tes mains suivent ton matériel (machine d’abord) et tes zones à ménager ; tu peux les changer dans « Mon programme ». « Repartir de zéro » relance un cycle complet aujourd’hui (tes e1RM et ton historique sont conservés).</div>
      <div className="flex gap-2">
        <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => mut(d => pickMainVariants(d))}>Recalculer les mains</Btn>
        <Btn small kind="subtle" style={{ flex: 1 }} onClick={regen}>Repartir de zéro</Btn>
      </div>
      <Btn full small onClick={onClose}>OK</Btn>
    </div>
  </Sheet>;
}

function ProfileScreen({ data, mut, sys }) {
  const [sheet, setSheet] = useState(null);
  const p = data.profile;
  const b = curBlock(data);
  const kt = kcalTarget(data);
  const today = todayISO();
  const eaten = data.nutrition.filter(n => n.date === today);
  const kcalNow = eaten.reduce((a, n) => a + (n.kcal || 0), 0);
  const Row = ({ icon: I, label, sub, onClick, color }) => <button onClick={onClick} className="w-full flex items-center gap-3 active:opacity-60" style={{ padding: "14px 0", borderBottom: `1px solid ${LINE}` }}>
    <I size={19} color={color || SUB} />
    <div className="flex-1 text-left">
      <div style={{ fontSize: 15.5 }}>{label}</div>
      {sub && <div style={{ color: MUT, fontSize: 12.5 }}>{sub}</div>}
    </div>
    <ChevronRight size={16} color={MUT} />
  </button>;
  return <div style={{ padding: "22px 18px 8px" }}>
    <Label>{p.sex === "F" ? "Athlète" : "Athlète"} · {p.level === "deb" ? "débutant" : p.level === "adv" ? "avancé" : "intermédiaire"}</Label>
    <h1 style={{ fontFamily: FD, fontWeight: 700, fontSize: 36, textTransform: "uppercase", margin: "2px 0 16px" }}>Profil</h1>
    <VerifyCard data={data} mut={mut} />
    <Card className="mb-4" style={{ padding: "12px 16px" }}>
      <div className="flex justify-between items-center">
        <div><Label style={{ fontSize: 10.5 }}>Programme</Label>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>{blockLabel(b)}</div></div>
        <div className="text-right"><Label style={{ fontSize: 10.5 }}>Nutrition du jour</Label>
          <div className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 18 }}>{kcalNow || 0}{kt ? ` / ${kt}` : ""} <span style={{ color: MUT, fontSize: 12 }}>kcal</span></div></div>
      </div>
    </Card>
    <Card style={{ padding: "2px 16px" }}>
      <Row icon={User} label="Mes infos" sub={`${p.age ?? "—"} ans · ${fk(p.height)} cm · ${fk(ma7(data.weights, today) || p.weight)} kg`} onClick={() => setSheet("infos")} />
      <Row icon={Dumbbell} label="Mon programme" sub={`${splitKeys(data).length} séances/sem · exercices, ordre et variantes du bloc`} onClick={() => setSheet("prog")} />
      <Row icon={Target} label="Objectif & réglages" sub={`${(p.days || []).length} jours · jambes ${LEGS_MODES[legsMode(data)].toLowerCase()} · curseur ${p.goal <= 35 ? "muscle" : p.goal >= 66 ? "force" : "équilibré"}`} onClick={() => setSheet("obj")} />
      <Row icon={Scale} label="Ma morphologie" sub="Leviers, mobilité — pour des consignes adaptées" onClick={() => setSheet("morpho")} />
      <Row icon={Download} label="Données & synchro" sub={sys.storageOk ? (data.cloud.enabled ? "Sauvegarde locale + Supabase" : "Sauvegarde locale active") : "Stockage indisponible ici"} onClick={() => setSheet("data")} color={sys.storageOk ? SUB : AMB} />
    </Card>
    <div style={{ color: MUT, fontSize: 12, lineHeight: 1.55, margin: "14px 4px 0" }}>
      Coach v3 « powerbuilding haut du corps sur machines » : mouvements lourds pilotés e1RM/RPE, charges calées sur les crans réels, autorégulation en direct qui impose plus lourd quand tu as de la marge, programme stable par bloc. Je ne remplace pas un professionnel de santé.</div>
    <InfosSheet data={data} mut={mut} open={sheet === "infos"} onClose={() => setSheet(null)} />
    <ObjSheet data={data} mut={mut} open={sheet === "obj"} onClose={() => setSheet(null)} />
    <ProgramSheet data={data} mut={mut} open={sheet === "prog"} onClose={() => setSheet(null)} />
    <Sheet open={sheet === "morpho"} onClose={() => setSheet(null)} title="Ma morphologie" tall>
      <MorphoForm m={p.morpho} um={(k, v) => mut(d => { d.profile.morpho[k] = v; })} height={p.height} />
      <div style={{ marginTop: 16 }}><Btn full small onClick={() => setSheet(null)}>OK</Btn></div>
    </Sheet>
    <DataSheet data={data} mut={mut} open={sheet === "data"} onClose={() => setSheet(null)} sys={sys} />
  </div>;
}

/* ------------------------------------------------------------------ */
/* MON PROGRAMME — le bloc, l'ordre, les règles d'enchaînement         */
/* ------------------------------------------------------------------ */
function ProgramSheet({ data, mut, open, onClose }) {
  const [openDay, setOpenDay] = useState(() => { try { return nextDayKey(data); } catch (e) { return null; } });
  if (!open) return <Sheet open={false} onClose={onClose} title="Mon programme" />;
  const b = curBlock(data);
  const wp = weekParams(data, null);
  const plan = weekSetPlan(data, wp);
  const keys = splitKeys(data);
  const seq = data.cycle?.seq || [];
  const roleTxt = { main: "LOURD", secondary: "VOLUME", accessory: "ACCESS.", isolation: "ISO" };
  const setsTxt = x => x.role === "main" ? (wp.test ? "test" : !effE1(data, x.slot) ? "calibration" : data.mains[x.slot].mode === "lin" ? `3 × ${wp.type === "force" ? 5 : 6} + 1` : `1 top × ${wp.R} + ${x.sets - 1}`) : `${x.sets} × ${x.min}-${x.max}`;
  return <Sheet open={open} onClose={onClose} title="Mon programme" tall>
    <div className="flex flex-col gap-4">
      <div>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>{blockLabel(b)}</div>
        <div className="flex flex-wrap gap-1.5 mt-2">{seq.map((x, i) => <span key={i} style={{ fontFamily: FD, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", padding: "3px 9px", borderRadius: 99,
          background: i === data.cycle.bi ? ACCSOFT : SURF2, color: i === data.cycle.bi ? ACC : MUT }}>{x.type === "test" ? "Test" : x.type === "force" ? `Force ${x.weeks} sem.` : `Hyper ${x.weeks} sem.`}</span>)}</div>
        <div style={{ color: SUB, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>{wp.deload ? "Semaine de décharge : volume −50 %, RPE 6." : wp.test ? "Semaine de test : une perf propre par mouvement lourd." : `Mouvements lourds : top set ${wp.type === "force" ? "de 4" : "de 6"} à RPE ${String(wp.P).replace(".", ",")}, puis back-offs. Le RPE monte chaque semaine jusqu’au deload.`}</div>
      </div>

      <div>
        <Label style={{ marginBottom: 6 }}>Mouvements lourds</Label>
        {activeSlots(data).map(k => { const st = data.mains[k];
          const vars = SLOTS[k].vars.filter(id => exAvailable(data, data.exercises[id]));
          return <div key={k} style={{ padding: "8px 0", borderBottom: `1px solid ${LINE}` }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
              <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15 }}>{SLOTS[k].long}</span>
              <span className="tabular-nums" style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: ACC }}>{st.e1 ? `e1RM ${fk(st.e1)} kg` : "à calibrer"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{vars.map(id => <Chip key={id} small on={st.variantId === id} onClick={() => mut(d => { setMainVariant(d, k, id); })}>{data.exercises[id].name}</Chip>)}</div>
          </div>; })}
        <div style={{ color: MUT, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>Changer de variante repart de l’e1RM connu de cet exercice (sinon une séance de calibration).</div>
      </div>

      <div>
        <Label style={{ marginBottom: 6 }}>Ta semaine</Label>
        {keys.map(k => { const items = plan[k] || []; const checks = coherenceChecks(data, items); const ok = checks.every(c => c.ok);
          return <Card key={k} className="mb-2" style={{ padding: "10px 13px" }}>
            <button className="w-full flex items-center justify-between" onClick={() => setOpenDay(openDay === k ? null : k)}>
              <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>{dayName(data, k)}</span>
              <span style={{ color: MUT, fontSize: 12.5 }}>≈ {estMinutes(items)} min {openDay === k ? <ChevronUp size={14} style={{ display: "inline" }} /> : <ChevronDown size={14} style={{ display: "inline" }} />}</span>
            </button>
            {openDay === k && <div style={{ marginTop: 8 }}>
              {items.map((x, i) => { const ex = data.exercises[x.exId];
                return <div key={i} className="flex items-center gap-2" style={{ padding: "7px 0", borderTop: i ? `1px solid ${LINE}` : "none" }}>
                  <span className="tabular-nums" style={{ color: MUT, fontFamily: FD, width: 16 }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5"><span className="truncate" style={{ fontSize: 14.5, fontWeight: x.role === "main" ? 600 : 400 }}>{ex?.name}</span>
                      <span style={{ fontFamily: FD, fontSize: 9.5, letterSpacing: 0.8, color: x.role === "main" ? ACC : MUT }}>{roleTxt[x.role]}</span>
                      {ex?.len && <span style={{ fontFamily: FD, fontSize: 9.5, letterSpacing: 0.8, color: SUB }}>ÉTIRÉ</span>}</div>
                    <div style={{ marginTop: 2 }}><MuscleChips ex={ex} size={9.5} max={2} /></div>
                  </div>
                  <span className="tabular-nums shrink-0" style={{ fontFamily: FD, fontWeight: 600, fontSize: 13.5 }}>{setsTxt(x)}</span>
                  {!x.slot && <button className="p-1 active:opacity-60" onClick={() => mut(d => { d.exercises[x.exId].locked = !d.exercises[x.exId].locked; })}>
                    <Lock size={14} color={ex?.locked ? ACC : MUT} /></button>}
                </div>; })}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${LINE}` }}>
                {checks.map((c, i) => <div key={i} className="flex gap-2" style={{ fontSize: 12.5, color: c.ok ? SUB : AMB, lineHeight: 1.45, padding: "2px 0" }}>
                  {c.ok ? <Check size={14} color={ACC} className="shrink-0" style={{ marginTop: 2 }} /> : <AlertTriangle size={14} color={AMB} className="shrink-0" style={{ marginTop: 2 }} />}<span>{c.t}</span></div>)}
              </div>
            </div>}
            {openDay !== k && <div style={{ color: ok ? MUT : AMB, fontSize: 12.5, marginTop: 3 }}>{items.slice(0, 3).map(x => data.exercises[x.exId]?.name).join(" → ")}{items.length > 3 ? ` → +${items.length - 3}` : ""}</div>}
          </Card>; })}
        <div style={{ color: MUT, fontSize: 12, lineHeight: 1.5 }}>Les exercices restent fixes tout le bloc pour que ta progression soit mesurable. Au bloc suivant, ceux qui stagnent sont remplacés, ceux qui progressent restent. Le cadenas garde un exercice quoi qu’il arrive.</div>
      </div>

      {(data.program.changes || []).length > 0 && <div>
        <Label style={{ marginBottom: 6 }}>Derniers changements</Label>
        {data.program.changes.slice(0, 3).map((c, i) => <div key={i} style={{ fontSize: 13, color: SUB, lineHeight: 1.5, padding: "3px 0" }}><b style={{ color: TXT }}>{fmtDM(c.date)}</b> · {c.msgs.join(" · ")}</div>)}
      </div>}

      <div className="flex gap-2">
        <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => mut(d => { rebuildTemplates(d, "rotate"); })}><RotateCcw size={15} /> Varier les accessoires</Btn>
        <Btn small style={{ flex: 1 }} onClick={onClose}>OK</Btn>
      </div>
    </div>
  </Sheet>;
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

function ExSettingsSheet({ data, mut, exId, open, onClose }) {
  const ex = data.exercises[exId];
  const [nv, setNv] = useState("");
  if (!ex) return null;
  const up = p => mut(d => Object.assign(d.exercises[exId], p));
  return <Sheet open={open} onClose={onClose} title="Réglages" tall>
    <div className="flex flex-col gap-4">
      <Field label="Incrément de cette machine" hint={ex.note || "Le plus petit saut de charge possible (ex. 45 → 50 kg = incrément 5)."}>
        <Stepper big v={ex.inc} set={v => up({ inc: v })} step={0.25} min={0.5} max={10} fmt={x => `${fk(x)} kg`} /></Field>
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
        <Btn small kind={ex.locked ? "primary" : "ghost"} style={{ flex: 1 }} onClick={() => up({ locked: !ex.locked })}><Lock size={14} /> Fixe</Btn>
      </div>
      {ex.avoid && <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5 }}>Cet exercice sera automatiquement remplacé par une alternative dans tes prochaines séances.</div>}
      {ex.locked && <div style={{ color: MUT, fontSize: 12.5, lineHeight: 1.5 }}>Exercice fixe : il sera inclus en priorité dans chaque séance qui travaille ce muscle.</div>}
      {ex.custom && <Btn small kind="danger" onClick={() => { mut(d => { delete d.exercises[exId]; }); onClose(); }}><Trash2 size={15} /> Supprimer cet exercice</Btn>}
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
