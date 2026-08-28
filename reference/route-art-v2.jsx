// ═══════════════════════════════════════════════════════════════════════════
// ROUTE ART — Canvas 2D Composition Engine v2
// Architecture: Single Canvas renderer shared across preview, PNG export,
// and animated export. Logical coordinate space (px at 1080×1920 base).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback, useMemo, useReducer } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const BASE_W = 1080;
const BASE_H = 1920;
const FPS = 30;

// ─── SAMPLE ACTIVITY DATA ────────────────────────────────────────────────────
function makePt(lat, lng) { return { lat, lng }; }

function genLoop() {
  const pts = [];
  for (let i = 0; i <= 180; i++) {
    const t = i / 180;
    const a = t * Math.PI * 2;
    const r1 = 0.009 + 0.003 * Math.sin(a * 3) + 0.002 * Math.cos(a * 7);
    const r2 = r1 * 0.7;
    pts.push(makePt(51.505 + r1 * Math.cos(a), -0.09 + r2 * Math.sin(a) * 1.4));
  }
  return pts;
}

function genSwitchback() {
  const pts = [makePt(51.50, -0.09)];
  let lat = 51.50, lng = -0.09;
  for (let i = 1; i <= 200; i++) {
    const t = i / 200;
    const dir = Math.floor(i / 12) % 2 === 0 ? 1 : -1;
    lat += 0.0009 * (1 - t * 0.3) + 0.00015 * Math.sin(i * 1.2);
    lng += dir * 0.0007 + 0.0003 * Math.cos(i * 0.6);
    pts.push(makePt(lat, lng));
  }
  return pts;
}

function genNarrowLong() {
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    pts.push(makePt(51.48 + t * 0.06 + 0.003 * Math.sin(t * 20), -0.09 + 0.002 * Math.cos(t * 15)));
  }
  return pts;
}

function genBigRide() {
  const pts = [];
  for (let i = 0; i <= 300; i++) {
    const t = i / 300;
    const a = t * Math.PI * 4;
    const r = 0.04 + 0.015 * Math.sin(a * 0.8) + 0.008 * Math.cos(a * 2.3);
    pts.push(makePt(51.52 + r * Math.cos(a), -0.1 + r * Math.sin(a) * 1.3));
  }
  return pts;
}

const ACTIVITIES = [
  {
    id: "run-loop", name: "Morning 10K", activityType: "Run",
    startDate: "2024-03-15T07:30:00Z", distance: 10240, movingTime: 3180,
    elapsedTime: 3420, averageSpeed: 3.22, maxSpeed: 4.1,
    elevationGain: 87, maxElevation: 142, calories: 612,
    heartRate: { avg: 158, max: 178 }, routeCoordinates: genLoop(),
  },
  {
    id: "hike-switchback", name: "Mountain Trail", activityType: "Hike",
    startDate: "2024-03-10T06:45:00Z", distance: 14200, movingTime: 14400,
    elapsedTime: 16200, averageSpeed: 0.99, maxSpeed: 2.1,
    elevationGain: 1240, maxElevation: 2180, calories: 1050,
    heartRate: { avg: 128, max: 161 }, routeCoordinates: genSwitchback(),
  },
  {
    id: "sprint", name: "Track Sprint", activityType: "Run",
    startDate: "2024-02-20T18:00:00Z", distance: 1200, movingTime: 290,
    elapsedTime: 310, averageSpeed: 4.14, maxSpeed: 7.2,
    elevationGain: 2, maxElevation: 28, calories: 95,
    heartRate: { avg: 172, max: 194 }, routeCoordinates: genNarrowLong(),
  },
  {
    id: "big-ride", name: "Sunday Century", activityType: "Ride",
    startDate: "2024-03-17T09:00:00Z", distance: 80500, movingTime: 10800,
    elapsedTime: 11400, averageSpeed: 7.45, maxSpeed: 12.8,
    elevationGain: 620, maxElevation: 385, calories: 2180,
    heartRate: { avg: 142, max: 172 }, routeCoordinates: genBigRide(),
  },
];

// ─── FORMATTERS ──────────────────────────────────────────────────────────────
const fmt = {
  dist: (m, imp) => {
    if (imp) { const mi = m / 1609.34; return mi.toFixed(2) + " mi"; }
    return (m / 1000).toFixed(2) + " km";
  },
  dur: (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}` : `${m}:${String(ss).padStart(2,"0")}`;
  },
  speed: (mps, imp) => imp ? (mps * 2.237).toFixed(1) + " mph" : (mps * 3.6).toFixed(1) + " km/h",
  pace: (mps, imp, type) => {
    if (type === "Ride") return fmt.speed(mps, imp);
    if (mps <= 0) return "—";
    const spk = imp ? 1609.34 / mps : 1000 / mps;
    return `${Math.floor(spk / 60)}:${String(Math.round(spk % 60)).padStart(2,"0")}${imp ? "/mi" : "/km"}`;
  },
  elev: (m, imp) => imp ? Math.round(m * 3.281) + " ft" : Math.round(m) + " m",
  date: (s) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
};

function getStatValue(act, id, imp) {
  if (!act) return "—";
  switch (id) {
    case "distance": return fmt.dist(act.distance, imp);
    case "duration": return fmt.dur(act.elapsedTime);
    case "movingTime": return fmt.dur(act.movingTime);
    case "avgSpeed": return fmt.speed(act.averageSpeed, imp);
    case "maxSpeed": return fmt.speed(act.maxSpeed, imp);
    case "avgPace": return fmt.pace(act.averageSpeed, imp, act.activityType);
    case "maxElevation": return fmt.elev(act.maxElevation, imp);
    case "elevationGain": return fmt.elev(act.elevationGain, imp) + " ↑";
    case "calories": return act.calories ? act.calories + " cal" : "—";
    case "avgHR": return act.heartRate?.avg ? act.heartRate.avg + " bpm" : "—";
    case "maxHR": return act.heartRate?.max ? act.heartRate.max + " bpm" : "—";
    case "activityType": return act.activityType;
    case "date": return fmt.date(act.startDate);
    default: return "—";
  }
}

function getStatNumeric(act, id, imp) {
  if (!act) return { value: 0, suffix: "", decimals: 0, isDuration: false };
  switch (id) {
    case "distance": return { value: imp ? act.distance / 1609.34 : act.distance / 1000, suffix: imp ? " mi" : " km", decimals: 2 };
    case "duration": return { value: act.elapsedTime, suffix: "", decimals: 0, isDuration: true };
    case "movingTime": return { value: act.movingTime, suffix: "", decimals: 0, isDuration: true };
    case "avgSpeed": return { value: imp ? act.averageSpeed * 2.237 : act.averageSpeed * 3.6, suffix: imp ? " mph" : " km/h", decimals: 1 };
    case "maxSpeed": return { value: imp ? act.maxSpeed * 2.237 : act.maxSpeed * 3.6, suffix: imp ? " mph" : " km/h", decimals: 1 };
    case "elevationGain": return { value: imp ? act.elevationGain * 3.281 : act.elevationGain, suffix: imp ? " ft ↑" : " m ↑", decimals: 0 };
    case "maxElevation": return { value: imp ? act.maxElevation * 3.281 : act.maxElevation, suffix: imp ? " ft" : " m", decimals: 0 };
    case "calories": return { value: act.calories || 0, suffix: " cal", decimals: 0 };
    case "avgHR": return { value: act.heartRate?.avg || 0, suffix: " bpm", decimals: 0 };
    case "maxHR": return { value: act.heartRate?.max || 0, suffix: " bpm", decimals: 0 };
    default: return { value: 0, suffix: "", decimals: 0 };
  }
}

const STAT_LABELS = {
  distance: "DISTANCE", duration: "DURATION", movingTime: "MOVING TIME",
  avgSpeed: "AVG SPEED", maxSpeed: "MAX SPEED", avgPace: "AVG PACE",
  maxElevation: "MAX ELEVATION", elevationGain: "ELEVATION", calories: "CALORIES",
  avgHR: "AVG HEART RATE", maxHR: "MAX HEART RATE", activityType: "ACTIVITY", date: "DATE",
};

// ─── GPS → CANVAS PROJECTION ─────────────────────────────────────────────────
function projectCoords(coords, canvasW, canvasH, scale = 0.78, offX = 0, offY = 0) {
  if (!coords || coords.length < 2) return [];
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = (maxLng - minLng) * cosLat || 1e-6;
  const sx = (canvasW * scale) / spanLng;
  const sy = (canvasH * scale) / spanLat;
  const s = Math.min(sx, sy);
  const cx = canvasW / 2 + offX, cy = canvasH / 2 + offY;
  const midLng = (minLng + maxLng) / 2;
  return coords.map(c => ({
    x: cx + (c.lng - midLng) * cosLat * s,
    y: cy - (c.lat - midLat) * s,
  }));
}

// Smooth path using Catmull-Rom → Bezier conversion
function buildSmoothPath(pts, tension = 0.4) {
  if (pts.length < 2) return [];
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    segs.push({ p1, cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y }, p2 });
  }
  return segs;
}

// Get point along bezier at t
function bezierPt(seg, t) {
  const { p1, cp1, cp2, p2 } = seg;
  const mt = 1 - t;
  return {
    x: mt*mt*mt*p1.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*p2.x,
    y: mt*mt*mt*p1.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*p2.y,
  };
}

// Parameterize path for uniform-speed travel
function parameterizePath(segs, resolution = 200) {
  const pts = [];
  const totalSegs = segs.length;
  for (let s = 0; s < totalSegs; s++) {
    const steps = Math.max(4, Math.floor(resolution / totalSegs));
    for (let i = 0; i <= steps; i++) {
      pts.push(bezierPt(segs[s], i / steps));
    }
  }
  // Build cumulative arc-length table
  const table = [{ t: 0, len: 0 }];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
    total += Math.sqrt(dx*dx + dy*dy);
    table.push({ t: i / (pts.length - 1), len: total });
  }
  return { pts, table, total };
}

function getPtAtFraction(paramData, frac) {
  const target = frac * paramData.total;
  let lo = 0, hi = paramData.table.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (paramData.table[mid].len < target) lo = mid; else hi = mid;
  }
  const a = paramData.table[lo], b = paramData.table[hi];
  const t2 = b.len === a.len ? 0 : (target - a.len) / (b.len - a.len);
  const idx = Math.round(a.t * (paramData.pts.length - 1) + t2 * (b.t - a.t) * (paramData.pts.length - 1));
  return paramData.pts[Math.min(idx, paramData.pts.length - 1)];
}

// ─── EASING ──────────────────────────────────────────────────────────────────
const easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => 1 - (1-t)*(1-t),
  easeInOut: t => t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2,
  easeOutBack: t => { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); },
  easeOutElastic: t => {
    if (t===0||t===1) return t;
    return Math.pow(2,-10*t)*Math.sin((t*10-0.75)*(2*Math.PI)/3)+1;
  },
  easeOutBounce: t => {
    const n1=7.5625,d1=2.75;
    if(t<1/d1) return n1*t*t;
    if(t<2/d1) return n1*(t-=1.5/d1)*t+0.75;
    if(t<2.5/d1) return n1*(t-=2.25/d1)*t+0.9375;
    return n1*(t-=2.625/d1)*t+0.984375;
  },
};

function applyEasing(t, name) {
  return (easing[name] || easing.easeOut)(Math.max(0, Math.min(1, t)));
}

// ─── ANIMATION ENGINE ────────────────────────────────────────────────────────
function getAnimValue(anim, timeS) {
  if (!anim || !anim.type || anim.type === "none") return 1;
  const { type, delay = 0, duration = 1, easeFunc = "easeOut", loop = false } = anim;
  let t = (timeS - delay) / duration;
  if (loop && t > 0) t = t % 1;
  t = Math.max(0, Math.min(1, t));
  const e = applyEasing(t, easeFunc);

  switch (type) {
    case "fadeIn": return e;
    case "fadeOut": return 1 - e;
    case "fadeInOut": return t < 0.5 ? applyEasing(t*2, easeFunc) : 1 - applyEasing((t-0.5)*2, easeFunc);
    case "scaleIn": return e;
    case "pop": return t < 0.7 ? applyEasing(t/0.7, "easeOutBack") : 1;
    case "pulse": return 0.85 + 0.15 * Math.sin(timeS * Math.PI * 2 / (duration || 1));
    case "breathing": {
      const { minS = 0.97, maxS = 1.03 } = anim;
      return minS + (maxS - minS) * (0.5 + 0.5 * Math.sin(timeS * Math.PI * 2 / (duration || 2)));
    }
    case "float": {
      const { amp = 12 } = anim;
      return { offsetY: amp * Math.sin(timeS * Math.PI * 2 / (duration || 3)) };
    }
    case "slideUp": return { offsetY: (1 - e) * 60 };
    case "slideDown": return { offsetY: -(1 - e) * 60 };
    case "slideLeft": return { offsetX: (1 - e) * 80 };
    case "slideRight": return { offsetX: -(1 - e) * 80 };
    default: return 1;
  }
}

function getRouteDrawFrac(anim, timeS) {
  if (!anim || anim.type !== "draw") return 1;
  const { delay = 0, duration = 2, easeFunc = "easeInOut", reverse = false } = anim;
  const t = Math.max(0, Math.min(1, (timeS - delay) / duration));
  const e = applyEasing(t, easeFunc);
  return reverse ? 1 - e : e;
}

function getCountUpValue(stat, timeS, imp) {
  const num = getStatNumeric(stat.activity, stat.id, imp);
  if (!stat.anim || stat.anim.type !== "countUp" || !num.value) {
    return stat.activity ? getStatValue(stat.activity, stat.id, imp) : "—";
  }
  const { delay = 0, duration = 1.5, easeFunc = "easeOut" } = stat.anim;
  // Before delay fires: return null so caller skips rendering this stat entirely
  if (timeS < delay) return null;
  const t = applyEasing(Math.max(0, Math.min(1, (timeS - delay) / duration)), easeFunc);
  const cur = num.value * t;
  if (num.isDuration) {
    return fmt.dur(Math.floor(cur));
  }
  return cur.toFixed(num.decimals) + num.suffix;
}

// ─── CANVAS PRESETS ──────────────────────────────────────────────────────────
const PRESETS = [
  { id: "story", label: "Story / Reel", w: 1080, h: 1920, icon: "📱" },
  { id: "portrait", label: "Portrait Feed", w: 1080, h: 1350, icon: "🖼" },
  { id: "square", label: "Square", w: 1080, h: 1080, icon: "⬜" },
  { id: "landscape", label: "Landscape", w: 1920, h: 1080, icon: "🖥" },
  { id: "custom", label: "Custom", w: 1080, h: 1920, icon: "✏️" },
];

// ─── DEFAULT SCENE ────────────────────────────────────────────────────────────
function makeDefaultScene(activityId = "run-loop") {
  return {
    canvasW: 1080,
    canvasH: 1920,
    canvasPreset: "story",
    duration: 5.0,
    bgColor: null, // transparent
    bgGradient: null,
    objects: [
      {
        id: "route", type: "route", label: "Route",
        visible: true, opacity: 1, zIndex: 10,
        x: 0, y: 0, scale: 1, rotation: 0,
        routeScale: 0.72, routeOffsetX: 0, routeOffsetY: -60,
        color: "#FC4C02", thickness: 5.5, lineStyle: "solid",
        showGlow: true, glowColor: "#FC4C02", glowBlur: 18, glowAlpha: 0.35,
        showGradient: false, gradColorStart: "#FC4C02", gradColor: "#FF6B9D",
        showDots: true, dotStart: true, dotEnd: true,
        showOutline: false, outlineColor: "#000000", outlineWidth: 2,
        anim: { type: "draw", delay: 0.4, duration: 2.2, easeFunc: "easeInOut" },
      },
      {
        id: "stats-group", type: "statsGroup", label: "Stats",
        visible: true, opacity: 1, zIndex: 20,
        x: 80, y: 1520,
        layout: "grid", cols: 2,
        color: "#FFFFFF", labelColor: "rgba(255,255,255,0.55)",
        valueFontSize: 52, labelFontSize: 20,
        rowGap: 28, colGap: 0, lineGap: 8,
        imperial: false,
        stats: [
          { id: "distance", anim: { type: "countUp", delay: 2.8, duration: 1.2, easeFunc: "easeOut" } },
          { id: "duration", anim: { type: "countUp", delay: 2.8, duration: 1.2, easeFunc: "easeOut" } },
          { id: "avgPace", anim: { type: "countUp", delay: 2.8, duration: 1.2, easeFunc: "easeOut" } },
          { id: "elevationGain", anim: { type: "countUp", delay: 2.8, duration: 1.2, easeFunc: "easeOut" } },
        ],
        anim: { type: "slideUp", delay: 2.6, duration: 0.6, easeFunc: "easeOut" },
      },

      {
        id: "activity-label", type: "text", label: "Activity Name",
        visible: true, opacity: 1, zIndex: 25,
        x: 80, y: 130,
        text: "RUN", fontFamily: "system-ui", fontSize: 96, fontWeight: 900,
        color: "#FFFFFF", letterSpacing: 0.12, align: "left",
        anim: { type: "fadeIn", delay: 0.1, duration: 0.7, easeFunc: "easeOut" },
      },
      {
        id: "date-label", type: "text", label: "Date",
        visible: true, opacity: 0.5, zIndex: 25,
        x: 80, y: 238,
        text: "MAR 15, 2024", fontFamily: "system-ui", fontSize: 22, fontWeight: 600,
        color: "#FFFFFF", letterSpacing: 0.18, align: "left",
        anim: { type: "fadeIn", delay: 0.3, duration: 0.6, easeFunc: "easeOut" },
      },
    ],
    activityId,
    selectedId: null,
  };
}

// ─── SCENE REDUCER ────────────────────────────────────────────────────────────
function sceneReducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVITY": {
      const act = ACTIVITIES.find(a => a.id === action.id) || ACTIVITIES[0];
      const txtObj = state.objects.find(o => o.id === "activity-label");
      const dateObj = state.objects.find(o => o.id === "date-label");
      const newObjs = state.objects.map(o => {
        if (o.id === "activity-label") return { ...o, text: act.activityType.toUpperCase() };
        if (o.id === "date-label") return { ...o, text: fmt.date(act.startDate).toUpperCase() };
        if (o.id === "stats-group") return { ...o, stats: o.stats.map(s => ({ ...s, activity: act })) };
        return o;
      });
      return { ...state, activityId: action.id, objects: newObjs };
    }
    case "SET_CANVAS": {
      const p = PRESETS.find(p => p.id === action.preset);
      if (!p) return state;
      return { ...state, canvasPreset: action.preset, canvasW: p.w, canvasH: p.h };
    }
    case "SET_CUSTOM_CANVAS":
      return { ...state, canvasPreset: "custom", canvasW: action.w || state.canvasW, canvasH: action.h || state.canvasH };
    case "UPDATE_OBJ": {
      return { ...state, objects: state.objects.map(o => o.id === action.id ? { ...o, ...action.patch } : o) };
    }
    case "SELECT": return { ...state, selectedId: action.id };
    case "SET_DURATION": {
      const newDur = action.v;
      const objects = state.objects.map(o => {
        if (o.type !== "route" || !o.anim) return o;
        const routeEnd = (o.anim.delay || 0) + (o.anim.duration || 2);
        if (routeEnd <= newDur) return o;
        // Route animation overshoots — clamp duration to newDur - 0.5, minimum 0.5s
        const newAnimDur = Math.max(0.5, newDur - (o.anim.delay || 0) - 0.5);
        return { ...o, anim: { ...o.anim, duration: Math.round(newAnimDur * 10) / 10 } };
      });
      return { ...state, duration: newDur, objects };
    }
    default: return state;
  }
}

// ─── RENDERER ─────────────────────────────────────────────────────────────────
// Core render function — draws entire scene to a canvas at given pixel ratio.
// This is the single source of truth for both preview and export.

function renderScene(canvas, scene, activities, timeS, opts = {}) {
  const { dpr = 1 } = opts;
  const ctx = canvas.getContext("2d");
  const W = scene.canvasW, H = scene.canvasH;
  ctx.clearRect(0, 0, W * dpr, H * dpr);

  const activity = activities.find(a => a.id === scene.activityId) || activities[0];

  // Sort by zIndex
  const sorted = [...scene.objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const obj of sorted) {
    if (!obj.visible) continue;

    ctx.save();
    // Base transform
    const cx = (obj.x || 0) * dpr, cy = (obj.y || 0) * dpr;

    // Compute animation state
    const animVal = getAnimValue(obj.anim, timeS);
    let alpha = obj.opacity ?? 1;
    let extraOffY = 0, extraOffX = 0, animScale = 1;

    if (typeof animVal === "number") {
      alpha *= animVal;
      if (obj.anim?.type === "scaleIn" || obj.anim?.type === "pop") animScale = animVal;
      if (obj.anim?.type === "breathing" || obj.anim?.type === "pulse") animScale = animVal;
    } else if (typeof animVal === "object") {
      if ("offsetY" in animVal) extraOffY = animVal.offsetY * dpr;
      if ("offsetX" in animVal) extraOffX = animVal.offsetX * dpr;
    }

    // Fade alpha for fadeIn/fadeOut types where animVal is returned as opacity
    if (obj.anim?.type === "fadeIn" || obj.anim?.type === "fadeOut" || obj.anim?.type === "fadeInOut") {
      if (typeof animVal === "number") alpha *= animVal;
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(cx + extraOffX, cy + extraOffY);

    if (obj.rotation) ctx.rotate((obj.rotation * Math.PI) / 180);
    if (animScale !== 1 && obj.type !== "route") ctx.scale(animScale, animScale);

    if (obj.type === "route") {
      drawRoute(ctx, obj, activity, timeS, scene, dpr);
    } else if (obj.type === "statsGroup") {
      drawStatsGroup(ctx, obj, activity, timeS, scene, dpr);
    } else if (obj.type === "text") {
      drawText(ctx, obj, scene, dpr);
    } else if (obj.type === "deco") {
      drawDeco(ctx, obj, timeS, scene, dpr, animScale);
    }

    ctx.restore();
  }
}

// Interpolate between two hex colours by fraction t
function lerpColor(hex1, hex2, t) {
  const parse = h => {
    const c = h.replace("#", "");
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  };
  const [r1,g1,b1] = parse(hex1);
  const [r2,g2,b2] = parse(hex2);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${b})`;
}

function drawRoute(ctx, obj, activity, timeS, scene, dpr) {
  if (!activity?.routeCoordinates) return;
  const W = scene.canvasW * dpr, H = scene.canvasH * dpr;

  const pts = projectCoords(
    activity.routeCoordinates, W, H,
    obj.routeScale ?? 0.72,
    (obj.routeOffsetX ?? 0) * dpr,
    (obj.routeOffsetY ?? 0) * dpr
  );

  const segs = buildSmoothPath(pts, 0.35);
  const paramData = parameterizePath(segs, 300);

  const drawFrac = getRouteDrawFrac(obj.anim, timeS);
  const thickness = (obj.thickness || 5) * dpr;

  // Clipped point count
  const totalPts = paramData.pts.length;
  const clipped = paramData.pts.slice(0, Math.max(2, Math.floor(totalPts * drawFrac)));

  // Build path
  const buildPath = (points) => {
    ctx.beginPath();
    if (points.length < 2) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  };

  // Glow layer
  if (obj.showGlow) {
    ctx.save();
    ctx.shadowColor = obj.glowColor || obj.color || "#FC4C02";
    ctx.shadowBlur = (obj.glowBlur || 20) * dpr;
    buildPath(clipped);
    ctx.strokeStyle = obj.glowColor || obj.color || "#FC4C02";
    ctx.lineWidth = thickness * 0.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = (obj.glowAlpha || 0.3) * (ctx.globalAlpha);
    ctx.stroke();
    ctx.restore();
  }

  // Outline layer
  if (obj.showOutline) {
    buildPath(clipped);
    ctx.strokeStyle = obj.outlineColor || "#000";
    ctx.lineWidth = thickness + (obj.outlineWidth || 2) * 2 * dpr;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  // Main stroke — arc-length gradient drawn as short overlapping segments
  // so color maps by position-along-path not screen position.
  // Works correctly for loops, switchbacks, and any route shape.
  if (obj.showGradient && clipped.length >= 2) {
    const colorA = obj.gradColorStart || obj.color || "#FC4C02";
    const colorB = obj.gradColor || "#FF6B9D";
    const n = clipped.length;
    // Draw segments with a slight overlap (extend cap by half lineWidth) to avoid gaps
    for (let i = 0; i < n - 1; i++) {
      const t = i / (n - 1);
      const t2 = (i + 1) / (n - 1);
      const colA = lerpColor(colorA, colorB, t);
      const colB = lerpColor(colorA, colorB, t2);
      // Per-segment linear gradient from this point to the next
      const seg = ctx.createLinearGradient(clipped[i].x, clipped[i].y, clipped[i+1].x, clipped[i+1].y);
      seg.addColorStop(0, colA);
      seg.addColorStop(1, colB);
      ctx.beginPath();
      ctx.moveTo(clipped[i].x, clipped[i].y);
      ctx.lineTo(clipped[i+1].x, clipped[i+1].y);
      ctx.strokeStyle = seg;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  } else {
    buildPath(clipped);
    if (obj.lineStyle === "dashed") {
      ctx.setLineDash([thickness * 2.5, thickness * 2]);
    } else if (obj.lineStyle === "dotted") {
      ctx.setLineDash([1, thickness * 2.5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = obj.color || "#FC4C02";
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Start / end dots
  if (obj.showDots && clipped.length >= 1) {
    const dotR = thickness * 1.6;
    if (obj.dotStart) {
      ctx.beginPath();
      ctx.arc(clipped[0].x, clipped[0].y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = obj.color || "#FC4C02";
      ctx.fill();
    }
    if (obj.dotEnd && drawFrac > 0.95) {
      const ep = clipped[clipped.length - 1];
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, dotR * 1.3, 0, Math.PI * 2);
      ctx.strokeStyle = obj.color || "#FC4C02";
      ctx.lineWidth = dotR * 0.55;
      ctx.stroke();
    }
  }

  // Moving marker
  if (obj.showMarker && drawFrac > 0 && drawFrac < 1) {
    const markerPt = getPtAtFraction(paramData, drawFrac);
    const mr = (obj.markerSize || 8) * dpr;
    ctx.save();
    if (obj.markerGlow) {
      ctx.shadowColor = obj.color || "#FC4C02";
      ctx.shadowBlur = mr * 2.5;
    }
    ctx.beginPath();
    ctx.arc(markerPt.x, markerPt.y, mr, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = obj.color || "#FC4C02";
    ctx.lineWidth = mr * 0.5;
    ctx.stroke();
    ctx.restore();
  }
}

function drawStatsGroup(ctx, obj, activity, timeS, scene, dpr) {
  if (!activity) return;

  // Hide the entire group until its own delay has passed
  const groupDelay = obj.anim?.delay ?? 0;
  if (timeS < groupDelay) return;

  const W = scene.canvasW * dpr;
  const valueFontSize = (obj.valueFontSize || 52) * dpr;
  const labelFontSize = (obj.labelFontSize || 20) * dpr;
  const rowGap = (obj.rowGap || 28) * dpr;
  const lineGap = (obj.lineGap || 8) * dpr;
  const cols = obj.cols || 2;
  const colW = (W - (obj.x || 0) * dpr * 2) / cols;

  const stats = (obj.stats || []).filter(s => s);

  for (let i = 0; i < stats.length; i++) {
    const stat = { ...stats[i], activity };
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = col * colW;
    const sy = row * (valueFontSize + labelFontSize + lineGap + rowGap);

    // Each stat has its own delay — hide it until that delay is reached
    const statDelay = stat.anim?.delay ?? groupDelay;
    if (timeS < statDelay) continue;

    // Resolve display value — countUp returns null before its delay (already handled above,
    // but kept as a safety net for edge cases)
    const value = (stat.anim?.type === "countUp")
      ? getCountUpValue(stat, timeS, obj.imperial)
      : getStatValue(activity, stat.id, obj.imperial);

    if (value === null) continue;

    // Fade-in alpha: ramp from 0→1 over 0.25s after the stat's delay
    const fadeT = Math.min(1, (timeS - statDelay) / 0.25);

    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * fadeT;

    // Label
    ctx.font = `600 ${labelFontSize}px system-ui,-apple-system,sans-serif`;
    ctx.fillStyle = obj.labelColor || "rgba(255,255,255,0.55)";
    ctx.letterSpacing = "0.14em";
    ctx.fillText(STAT_LABELS[stat.id] || stat.id.toUpperCase(), sx, sy + labelFontSize);

    // Value
    ctx.font = `700 ${valueFontSize}px system-ui,-apple-system,sans-serif`;
    ctx.fillStyle = obj.color || "#FFFFFF";
    ctx.letterSpacing = "0em";
    ctx.fillText(value, sx, sy + labelFontSize + lineGap + valueFontSize);

    ctx.restore();
  }
}

function drawText(ctx, obj, scene, dpr) {
  const fs = (obj.fontSize || 48) * dpr;
  ctx.font = `${obj.fontWeight || 700} ${fs}px ${obj.fontFamily || "system-ui"}, sans-serif`;
  ctx.fillStyle = obj.color || "#FFFFFF";
  ctx.textAlign = obj.align || "left";
  if (obj.letterSpacing) ctx.letterSpacing = `${obj.letterSpacing}em`;
  ctx.fillText(obj.text || "", 0, fs);
  ctx.letterSpacing = "0em";
}

function drawDeco(ctx, obj, timeS, scene, dpr, animScale = 1) {
  const s = (obj.size || 40) * dpr * animScale;
  ctx.strokeStyle = obj.fillColor || obj.color || "#FFFFFF";
  ctx.fillStyle = obj.fillColor || obj.color || "#FFFFFF";
  ctx.lineWidth = (obj.lineWidth || 1.5) * dpr;

  if (obj.shape === "ring") {
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (obj.shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (obj.shape === "line") {
    ctx.beginPath();
    ctx.moveTo(-s / 2, 0);
    ctx.lineTo(s / 2, 0);
    ctx.stroke();
  } else if (obj.shape === "dot-grid") {
    const spacing = (obj.spacing || 32) * dpr;
    const count = obj.count || 4;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        ctx.beginPath();
        ctx.arc(c * spacing, r * spacing, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ─── SCENE CANVAS COMPONENT ───────────────────────────────────────────────────
function SceneCanvas({ scene, timeS, width, height, dpr = 1, style }) {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = scene.canvasW * dpr;
    canvas.height = scene.canvasH * dpr;
    renderScene(canvas, scene, ACTIVITIES, timeS, { dpr });
  }, [scene, timeS, dpr]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: width, height: height, display: "block", ...style }}
    />
  );
}

// ─── EXPORT FUNCTIONS ─────────────────────────────────────────────────────────
async function exportStaticPNG(scene, timeS, multiplier = 2) {
  const canvas = document.createElement("canvas");
  const W = scene.canvasW * multiplier, H = scene.canvasH * multiplier;
  canvas.width = W;
  canvas.height = H;
  renderScene(canvas, scene, ACTIVITIES, timeS, { dpr: multiplier });
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

async function exportAnimatedWebM(scene, { duration, fps = 30, multiplier = 1, onProgress }) {
  const W = scene.canvasW * multiplier, H = scene.canvasH * multiplier;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    videoBitsPerSecond: 12_000_000,
  });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType });
      resolve(blob);
    };
    rec.start();

    const totalFrames = Math.floor(duration * fps);
    let frame = 0;

    function tick() {
      if (frame > totalFrames) { rec.stop(); return; }
      const t = frame / fps;
      renderScene(canvas, scene, ACTIVITIES, t, { dpr: multiplier });
      onProgress?.(frame / totalFrames);
      frame++;
      // Use setTimeout 0 to yield to browser between frames
      setTimeout(tick, 0);
    }
    tick();
  });
}

// ─── STYLE PICKER ─────────────────────────────────────────────────────────────
const ROUTE_STYLES = [
  { id: "minimal", label: "Minimal", color: "#FFFFFF", thickness: 3.5, showGlow: false, showGradient: false, lineStyle: "solid" },
  { id: "bold", label: "Bold", color: "#FC4C02", thickness: 7, showGlow: false, showGradient: false, lineStyle: "solid" },
  { id: "neon", label: "Neon", color: "#00FFAA", thickness: 4, showGlow: true, glowColor: "#00FFAA", glowBlur: 24, glowAlpha: 0.5, showGradient: false, lineStyle: "solid" },
  { id: "gradient", label: "Gradient", color: "#FC4C02", thickness: 5, showGlow: true, glowColor: "#FF6B9D", glowBlur: 12, glowAlpha: 0.25, showGradient: true, gradColor: "#FF6B9D", lineStyle: "solid" },
  { id: "dashed", label: "Dashed", color: "#FFFFFF", thickness: 4, showGlow: false, showGradient: false, lineStyle: "dashed" },
  { id: "cyber", label: "Cyber", color: "#00D4FF", thickness: 4, showGlow: true, glowColor: "#00D4FF", glowBlur: 20, glowAlpha: 0.45, showGradient: true, gradColor: "#7B2FFF", lineStyle: "solid" },
];

const ANIMATION_PRESETS = [
  {
    id: "route-first", label: "Route First",
    apply: (scene) => ({
      ...scene,
      duration: 5.5,
      objects: scene.objects.map(o => {
        if (o.type === "route") return { ...o, anim: { type: "draw", delay: 0.3, duration: 2.5, easeFunc: "easeInOut" } };
        if (o.type === "statsGroup") return { ...o, anim: { type: "slideUp", delay: 3.2, duration: 0.5, easeFunc: "easeOut" }, stats: o.stats.map((s) => ({ ...s, anim: { type: "countUp", delay: 3.2, duration: 1.0, easeFunc: "easeOut" } })) };
        if (o.type === "text") return { ...o, anim: { type: "fadeIn", delay: 0.1, duration: 0.6, easeFunc: "easeOut" } };
        if (o.type === "deco") return { ...o, anim: { ...o.anim, delay: 0 } };
        return o;
      }),
    }),
  },
  {
    id: "cinematic", label: "Cinematic",
    apply: (scene) => ({
      ...scene,
      duration: 7.0,
      objects: scene.objects.map(o => {
        if (o.type === "route") return { ...o, anim: { type: "draw", delay: 1.2, duration: 3.5, easeFunc: "easeInOut" } };
        if (o.type === "statsGroup") return { ...o, anim: { type: "fadeIn", delay: 5.0, duration: 1.2, easeFunc: "easeOut" }, stats: o.stats.map((s) => ({ ...s, anim: { type: "countUp", delay: 5.0, duration: 1.5, easeFunc: "easeOut" } })) };
        if (o.type === "text") return { ...o, anim: { type: "fadeIn", delay: 0.3, duration: 1.2, easeFunc: "easeOut" } };
        if (o.type === "deco") return { ...o, anim: { type: "fadeIn", delay: 0, duration: 1.5 } };
        return o;
      }),
    }),
  },
  {
    id: "energetic", label: "Energetic",
    apply: (scene) => ({
      ...scene,
      duration: 4.0,
      objects: scene.objects.map(o => {
        if (o.type === "route") return { ...o, anim: { type: "draw", delay: 0.1, duration: 1.5, easeFunc: "easeIn" } };
        if (o.type === "statsGroup") return { ...o, anim: { type: "slideUp", delay: 1.8, duration: 0.3, easeFunc: "easeOutBack" }, stats: o.stats.map((s) => ({ ...s, anim: { type: "countUp", delay: 1.8, duration: 0.7, easeFunc: "easeOutBounce" } })) };
        if (o.type === "text") return { ...o, anim: { type: "pop", delay: 0, duration: 0.5, easeFunc: "easeOutBack" } };
        return o;
      }),
    }),
  },
];

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A",
  panel: "#111111",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.45)",
  textSub: "rgba(255,255,255,0.65)",
  accent: "#FC4C02",
  accentMuted: "rgba(252,76,2,0.15)",
};

function Label({ children, style }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8, ...style }}>{children}</div>;
}

function Row({ children, style }) {
  return <div style={{ display: "flex", gap: 8, alignItems: "center", ...style }}>{children}</div>;
}

function Sl({ label, value, min, max, step = 1, onChange, fmt: f = v => v, style }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: C.textSub, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{f(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
}

function Tog({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 8 }}>
      <div onClick={() => onChange(!value)} style={{ width: 34, height: 19, borderRadius: 10, background: value ? C.accent : C.border, position: "relative", transition: "background 0.18s", flexShrink: 0, border: `1px solid ${value ? C.accent : C.borderStrong}` }}>
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: value ? 18 : 2, transition: "left 0.18s" }} />
      </div>
      <span style={{ fontSize: 12, color: C.textSub }}>{label}</span>
    </label>
  );
}

function ColorBtn({ color, selected, onClick }) {
  return <div onClick={onClick} style={{ width: 24, height: 24, borderRadius: "50%", background: color, cursor: "pointer", border: selected ? `2px solid #fff` : "1.5px solid rgba(255,255,255,0.2)", boxShadow: selected ? "0 0 0 1px rgba(255,255,255,0.4)" : "none", flexShrink: 0 }} />;
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: "9px 4px", border: "none", background: "transparent", color: active ? C.text : C.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", borderBottom: `2px solid ${active ? C.accent : "transparent"}`, transition: "all 0.15s" }}>
      {children}
    </button>
  );
}

function SectionDivider({ label }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: C.textMuted, textTransform: "uppercase", padding: "12px 0 8px", borderTop: `0.5px solid ${C.border}`, marginTop: 8 }}>{label}</div>;
}

// ─── TIMELINE COMPONENT ───────────────────────────────────────────────────────
function Timeline({ scene, timeS, setTimeS, playing, setPlaying, dispatch }) {
  const barRef = useRef();
  const dur = scene.duration;

  const scrub = useCallback((e) => {
    const rect = barRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setTimeS(t * dur);
  }, [dur, setTimeS]);

  const objects = scene.objects.filter(o => o.anim && o.anim.type !== "none" && o.anim.type !== "breathing");

  const COLOR_MAP = {
    route: C.accent,
    statsGroup: "#00D4FF",
    text: "#A8FF3E",
    deco: "#888",
  };

  return (
    <div style={{ background: "#0D0D0D", borderTop: `0.5px solid ${C.border}`, padding: "10px 16px 12px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <button onClick={() => { setTimeS(0); }} style={{ background: "none", border: `0.5px solid ${C.border}`, color: C.textSub, borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>↺</button>
        <button onClick={() => setPlaying(p => !p)} style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 4, padding: "3px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeS.toFixed(2)}s / {dur.toFixed(1)}s</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: C.textMuted, whiteSpace: "nowrap" }}>DURATION</span>
        <input
          type="range" min={1} max={15} step={0.5} value={dur}
          onChange={e => { dispatch({ type: "SET_DURATION", v: Number(e.target.value) }); setTimeS(t => Math.min(t, Number(e.target.value))); }}
          style={{ width: 80, accentColor: C.accent }}
        />
        <span style={{ fontSize: 11, color: C.textSub, fontVariantNumeric: "tabular-nums", minWidth: 28 }}>{dur.toFixed(1)}s</span>
      </div>
      {/* Scrub bar */}
      <div ref={barRef} onClick={scrub} style={{ height: 6, background: C.border, borderRadius: 3, cursor: "pointer", position: "relative", marginBottom: 8 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(timeS / dur) * 100}%`, background: C.accent, borderRadius: 3 }} />
        <div style={{ position: "absolute", top: "50%", transform: "translate(-50%,-50%)", left: `${(timeS / dur) * 100}%`, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `2px solid ${C.accent}`, boxShadow: "0 0 0 2px rgba(252,76,2,0.3)" }} />
      </div>
      {/* Draggable object lanes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {objects.map(o => {
          const a = o.anim;
          const delay = a.delay || 0;
          // For statsGroup, the visual span runs from the group delay to the
          // last stat's delay + its countUp duration — not obj.anim.duration
          const animDur = o.type === "statsGroup" && o.stats?.length
            ? Math.max(...o.stats.map(s => ((s.anim?.delay || 0) + (s.anim?.duration || 1)))) - delay
            : (a.duration || 1);
          const startPct = (delay / dur) * 100;
          const widthPct = Math.min(100 - startPct, (animDur / dur) * 100);
          const color = COLOR_MAP[o.type] || "#888";

          const handleDrag = (e) => {
            e.preventDefault();
            const track = e.currentTarget.parentElement;
            const rect = track.getBoundingClientRect();
            const startX = e.clientX;
            const startDelay = delay;

            const onMove = (me) => {
              const dx = me.clientX - startX;
              const dtFrac = dx / rect.width;
              const newDelay = Math.max(0, Math.min(dur - 0.1, startDelay + dtFrac * dur));
              const delta = Math.round((newDelay - startDelay) * 10) / 10;
              const patch = { anim: { ...a, delay: Math.round(newDelay * 10) / 10 } };
              // For statsGroup: also shift each individual stat's delay by the same delta
              if (o.type === "statsGroup" && o.stats) {
                patch.stats = o.stats.map(s => ({
                  ...s,
                  anim: s.anim ? { ...s.anim, delay: Math.max(0, Math.round(((s.anim.delay || 0) + delta) * 10) / 10) } : s.anim,
                }));
              }
              dispatch({ type: "UPDATE_OBJ", id: o.id, patch });
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          };

          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: C.textMuted, width: 68, flexShrink: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{o.label || o.id}</span>
              <div style={{ flex: 1, height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 2, position: "relative" }}>
                <div
                  onMouseDown={handleDrag}
                  title={`Drag to shift • delay: ${delay.toFixed(1)}s  dur: ${animDur.toFixed(1)}s`}
                  style={{ position: "absolute", top: 2, height: "calc(100% - 4px)", left: `${startPct}%`, width: `${Math.max(widthPct, 1)}%`, background: color, borderRadius: 2, opacity: 0.82, cursor: "grab", display: "flex", alignItems: "center", paddingLeft: 4, overflow: "hidden", userSelect: "none" }}
                >
                  <span style={{ fontSize: 8, color: "rgba(0,0,0,0.7)", fontWeight: 700, whiteSpace: "nowrap" }}>{delay.toFixed(1)}s</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PANELS ───────────────────────────────────────────────────────────────────
const STAT_IDS = ["distance", "duration", "movingTime", "avgSpeed", "maxSpeed", "avgPace", "elevationGain", "maxElevation", "calories", "avgHR", "maxHR"];
// activityType and date are shown as dedicated text objects above the route
const COLORS_QUICK = ["#FFFFFF", "#FC4C02", "#00FFAA", "#00D4FF", "#A8FF3E", "#FFD700", "#FF6B9D", "#7B2FFF"];

function RoutePanel({ obj, dispatch, sceneDuration }) {
  if (!obj) return <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Select the route object to edit.</div>;

  const upd = p => dispatch({ type: "UPDATE_OBJ", id: obj.id, patch: p });

  return (
    <div style={{ padding: "12px 14px" }}>
      <Label>Style preset</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {ROUTE_STYLES.map(s => (
          <button key={s.id} onClick={() => upd({ color: s.color, thickness: s.thickness, showGlow: s.showGlow, glowColor: s.glowColor, glowBlur: s.glowBlur, glowAlpha: s.glowAlpha, showGradient: s.showGradient, gradColor: s.gradColor, lineStyle: s.lineStyle })}
            style={{ padding: "5px 11px", borderRadius: 20, border: `0.5px solid ${C.border}`, background: obj.color === s.color && obj.lineStyle === s.lineStyle ? C.accentMuted : "transparent", color: C.textSub, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            {s.label}
          </button>
        ))}
      </div>

      <Label>Color</Label>
      <Row style={{ marginBottom: 14 }}>
        {COLORS_QUICK.map(c => <ColorBtn key={c} color={c} selected={obj.color === c} onClick={() => upd({ color: c })} />)}
        <div style={{ position: "relative" }}>
          <ColorBtn color={obj.color} selected={false} onClick={() => {}} />
          <input type="color" value={obj.color} onChange={e => upd({ color: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
        </div>
      </Row>

      <Sl label="Thickness" value={obj.thickness} min={1} max={20} step={0.5} onChange={v => upd({ thickness: v })} fmt={v => v + "px"} />
      <Sl label="Opacity" value={obj.opacity} min={0} max={1} step={0.05} onChange={v => upd({ opacity: v })} fmt={v => Math.round(v * 100) + "%"} />
      <Sl label="Route scale" value={obj.routeScale} min={0.3} max={1.0} step={0.01} onChange={v => upd({ routeScale: v })} fmt={v => Math.round(v * 100) + "%"} />
      <Sl label="Offset X" value={obj.routeOffsetX} min={-400} max={400} step={5} onChange={v => upd({ routeOffsetX: v })} fmt={v => v + "px"} />
      <Sl label="Offset Y" value={obj.routeOffsetY} min={-600} max={600} step={5} onChange={v => upd({ routeOffsetY: v })} fmt={v => v + "px"} />

      <SectionDivider label="Line style" />
      <Row style={{ marginBottom: 12 }}>
        {["solid", "dashed", "dotted"].map(s => (
          <button key={s} onClick={() => upd({ lineStyle: s })} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: `0.5px solid ${obj.lineStyle === s ? C.accent : C.border}`, background: obj.lineStyle === s ? C.accentMuted : "transparent", color: obj.lineStyle === s ? C.text : C.textMuted, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>
            {s}
          </button>
        ))}
      </Row>

      <SectionDivider label="Effects" />
      <Tog label="Glow" value={obj.showGlow} onChange={v => upd({ showGlow: v })} />
      {obj.showGlow && <Sl label="Glow blur" value={obj.glowBlur || 18} min={4} max={60} step={1} onChange={v => upd({ glowBlur: v })} />}
      {obj.showGlow && <Sl label="Glow intensity" value={obj.glowAlpha || 0.35} min={0.05} max={0.8} step={0.05} onChange={v => upd({ glowAlpha: v })} fmt={v => Math.round(v * 100) + "%"} />}
      <Tog label="Gradient" value={obj.showGradient} onChange={v => upd({ showGradient: v })} />
      {obj.showGradient && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <Row>
            <span style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>Start color</span>
            <input type="color" value={obj.gradColorStart || obj.color || "#FC4C02"} onChange={e => upd({ gradColorStart: e.target.value })} style={{ width: 28, height: 22, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
          </Row>
          <Row>
            <span style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>End color</span>
            <input type="color" value={obj.gradColor || "#FF6B9D"} onChange={e => upd({ gradColor: e.target.value })} style={{ width: 28, height: 22, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
          </Row>
        </div>
      )}
      <Tog label="Outline" value={obj.showOutline} onChange={v => upd({ showOutline: v })} />
      <Tog label="Start dot" value={obj.dotStart} onChange={v => upd({ dotStart: v })} />
      <Tog label="End dot" value={obj.dotEnd} onChange={v => upd({ dotEnd: v })} />
      <Tog label="Moving marker" value={obj.showMarker} onChange={v => upd({ showMarker: v })} />
      {obj.showMarker && <Tog label="Marker glow" value={obj.markerGlow} onChange={v => upd({ markerGlow: v })} />}

      <SectionDivider label="Animation" />
      <Label>Type</Label>
      <Row style={{ marginBottom: 10 }}>
        {["draw", "none"].map(t => (
          <button key={t} onClick={() => upd({ anim: { ...obj.anim, type: t } })} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: `0.5px solid ${(obj.anim?.type || "draw") === t ? C.accent : C.border}`, background: (obj.anim?.type || "draw") === t ? C.accentMuted : "transparent", color: (obj.anim?.type || "draw") === t ? C.text : C.textMuted, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>
            {t === "draw" ? "Route Draw" : "None"}
          </button>
        ))}
      </Row>
      {obj.anim?.type === "draw" && <>
        <Sl label="Delay" value={obj.anim?.delay || 0} min={0} max={Math.max(0, sceneDuration - 0.5)} step={0.1} onChange={v => upd({ anim: { ...obj.anim, delay: v } })} fmt={v => v.toFixed(1) + "s"} />
        <Sl label="Duration" value={obj.anim?.duration || 2} min={0.5} max={sceneDuration} step={0.1} onChange={v => upd({ anim: { ...obj.anim, duration: v } })} fmt={v => v.toFixed(1) + "s"} />
      </>}
    </div>
  );
}

function StatsPanel({ obj, dispatch, activityId }) {
  if (!obj) return null;
  const activity = ACTIVITIES.find(a => a.id === activityId);
  const upd = p => dispatch({ type: "UPDATE_OBJ", id: obj.id, patch: p });
  const enabledIds = (obj.stats || []).map(s => s.id);

  return (
    <div style={{ padding: "12px 14px" }}>
      <Row style={{ marginBottom: 14 }}>
        {["metric", "imperial"].map(u => (
          <button key={u} onClick={() => upd({ imperial: u === "imperial" })} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `0.5px solid ${(obj.imperial ? "imperial" : "metric") === u ? C.accent : C.border}`, background: (obj.imperial ? "imperial" : "metric") === u ? C.accentMuted : "transparent", color: C.textSub, fontSize: 11, cursor: "pointer" }}>
            {u.charAt(0).toUpperCase() + u.slice(1)}
          </button>
        ))}
      </Row>

      <SectionDivider label="Active stats" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 8px" }}>
        {STAT_IDS.map(id => {
          const active = enabledIds.includes(id);
          const toggle = () => {
            const newStats = active
              ? (obj.stats || []).filter(s => s.id !== id)
              : [...(obj.stats || []), { id, anim: { type: "countUp", delay: obj.anim?.delay ?? 2.8, duration: obj.stats?.[0]?.anim?.duration ?? 1.0, easeFunc: "easeOut" } }];
            upd({ stats: newStats });
          };
          return (
            <div key={id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "5px 0", borderBottom: `0.5px solid ${C.border}`, userSelect: "none" }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: active ? C.accent : "transparent", border: `1px solid ${active ? C.accent : C.borderStrong}`, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: active ? C.text : C.textSub, transition: "color 0.15s" }}>{STAT_LABELS[id]}</span>
            </div>
          );
        })}
      </div>

      <SectionDivider label="Layout" />
      <Row style={{ marginBottom: 10 }}>
        {[{id:"grid",l:"Grid"},{id:"list",l:"List"}].map(({id,l}) => (
          <button key={id} onClick={() => upd({ layout: id, cols: id === "grid" ? 2 : 1 })} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: `0.5px solid ${obj.layout === id ? C.accent : C.border}`, background: obj.layout === id ? C.accentMuted : "transparent", color: obj.layout === id ? C.text : C.textMuted, fontSize: 11, cursor: "pointer" }}>
            {l}
          </button>
        ))}
      </Row>

      <Sl label="Value size" value={obj.valueFontSize} min={24} max={120} step={2} onChange={v => upd({ valueFontSize: v })} fmt={v => v + "px"} />
      <Sl label="Label size" value={obj.labelFontSize} min={10} max={40} step={1} onChange={v => upd({ labelFontSize: v })} fmt={v => v + "px"} />
      <Sl label="Row gap" value={obj.rowGap} min={8} max={80} step={2} onChange={v => upd({ rowGap: v })} fmt={v => v + "px"} />

      <SectionDivider label="Colors" />
      <Row style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.textMuted }}>Value</span>
        <input type="color" value={obj.color || "#FFFFFF"} onChange={e => upd({ color: e.target.value })} style={{ width: 28, height: 22, border: "none", borderRadius: 4, cursor: "pointer" }} />
      </Row>

      <SectionDivider label="Animation" />
      <Sl
        label="Start delay"
        value={obj.anim?.delay ?? 2.6}
        min={0} max={12} step={0.1}
        onChange={v => {
          const oldDelay = obj.anim?.delay ?? 2.6;
          const delta = v - oldDelay;
          upd({
            anim: { ...obj.anim, delay: Math.round(v * 10) / 10 },
            stats: (obj.stats || []).map(s => ({
              ...s,
              anim: s.anim ? { ...s.anim, delay: Math.max(0, Math.round(((s.anim.delay || 0) + delta) * 10) / 10) } : s.anim,
            })),
          });
        }}
        fmt={v => v.toFixed(1) + "s"}
      />
      <Sl
        label="Count-up duration"
        value={obj.stats?.[0]?.anim?.duration ?? 1.0}
        min={0.2} max={4} step={0.1}
        onChange={v => {
          upd({
            stats: (obj.stats || []).map(s => ({
              ...s,
              anim: s.anim ? { ...s.anim, duration: Math.round(v * 10) / 10 } : s.anim,
            })),
          });
        }}
        fmt={v => v.toFixed(1) + "s"}
      />

      <SectionDivider label="Position (Y)" />
      <Sl label="Y offset" value={obj.y} min={400} max={1800} step={10} onChange={v => upd({ y: v })} fmt={v => v + "px"} />
    </div>
  );
}

function CanvasPanel({ scene, dispatch }) {
  return (
    <div style={{ padding: "12px 14px" }}>
      <Label>Preset</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => dispatch({ type: "SET_CANVAS", preset: p.id })}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, border: `0.5px solid ${scene.canvasPreset === p.id ? C.accent : C.border}`, background: scene.canvasPreset === p.id ? C.accentMuted : "transparent", cursor: "pointer", color: C.text, fontSize: 12, fontWeight: 600 }}>
            <span>{p.icon} {p.label}</span>
            <span style={{ color: C.textMuted, fontSize: 11 }}>{p.w}×{p.h}</span>
          </button>
        ))}
      </div>
      {scene.canvasPreset === "custom" && (
        <>
          <SectionDivider label="Custom size" />
          <Row>
            <div style={{ flex: 1 }}>
              <Label>W</Label>
              <input type="number" value={scene.canvasW} onChange={e => dispatch({ type: "SET_CUSTOM_CANVAS", w: +e.target.value, h: scene.canvasH })} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `0.5px solid ${C.border}`, background: "#181818", color: C.text, fontSize: 13 }} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>H</Label>
              <input type="number" value={scene.canvasH} onChange={e => dispatch({ type: "SET_CUSTOM_CANVAS", w: scene.canvasW, h: +e.target.value })} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `0.5px solid ${C.border}`, background: "#181818", color: C.text, fontSize: 13 }} />
            </div>
          </Row>
        </>
      )}
      <SectionDivider label="Duration" />
      <Sl label="Animation duration" value={scene.duration} min={1} max={12} step={0.5} onChange={v => dispatch({ type: "SET_DURATION", v })} fmt={v => v.toFixed(1) + "s"} />
    </div>
  );
}

function AnimPresetsPanel({ scene, dispatch }) {
  return (
    <div style={{ padding: "12px 14px" }}>
      <Label>Animation presets</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {ANIMATION_PRESETS.map(p => (
          <button key={p.id} onClick={() => {
            const newScene = p.apply(scene);
            // Apply each object update
            newScene.objects.forEach(o => {
              dispatch({ type: "UPDATE_OBJ", id: o.id, patch: o });
            });
            dispatch({ type: "SET_DURATION", v: newScene.duration });
          }}
            style={{ padding: "10px 14px", borderRadius: 8, border: `0.5px solid ${C.border}`, background: "#161616", cursor: "pointer", color: C.text, fontSize: 12, fontWeight: 600, textAlign: "left" }}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExportPanel({ scene, timeS, exportProgress, onExportPNG, onExportVideo }) {
  const [pngMult, setPngMult] = useState(2);
  const [vidFps, setVidFps] = useState(30);

  return (
    <div style={{ padding: "12px 14px" }}>
      <SectionDivider label="Static PNG" />
      <Label>Resolution</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        {[1, 2, 3].map(m => (
          <button key={m} onClick={() => setPngMult(m)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 7, border: `0.5px solid ${pngMult === m ? C.accent : C.border}`, background: pngMult === m ? C.accentMuted : "transparent", cursor: "pointer", color: C.text, fontSize: 12 }}>
            <span>×{m} {m === 1 ? "Standard" : m === 2 ? "Retina" : "Print"}</span>
            <span style={{ color: C.textMuted }}>{scene.canvasW * m}×{scene.canvasH * m}</span>
          </button>
        ))}
      </div>
      <button onClick={() => onExportPNG(pngMult)} style={{ width: "100%", padding: "12px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
        ↓ Download PNG
      </button>

      <SectionDivider label="Animated WebM" />
      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 10 }}>
        Renders {Math.floor(scene.duration * vidFps)} frames at {scene.canvasW}×{scene.canvasH} using the same Canvas renderer as the preview. Output is a transparent-channel WebM optimized for Stories/Reels.
      </div>
      <Row style={{ marginBottom: 10 }}>
        {[24, 30, 60].map(f => (
          <button key={f} onClick={() => setVidFps(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `0.5px solid ${vidFps === f ? C.accent : C.border}`, background: vidFps === f ? C.accentMuted : "transparent", color: C.textSub, fontSize: 11, cursor: "pointer" }}>
            {f} FPS
          </button>
        ))}
      </Row>
      {exportProgress !== null && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${exportProgress * 100}%`, background: C.accent, transition: "width 0.1s" }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>{Math.round(exportProgress * 100)}% — rendering frames…</div>
        </div>
      )}
      <button onClick={() => onExportVideo(vidFps)} style={{ width: "100%", padding: "12px", borderRadius: 9, border: "none", background: exportProgress !== null ? "#333" : "#1A1A1A", color: exportProgress !== null ? C.textMuted : C.text, fontSize: 13, fontWeight: 700, cursor: exportProgress !== null ? "not-allowed" : "pointer", border: `0.5px solid ${C.border}` }}>
        {exportProgress !== null ? "Rendering…" : "↓ Export WebM Animation"}
      </button>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.6 }}>
        For MP4 conversion, run the downloaded WebM through FFmpeg or Handbrake. Most social platforms accept WebM directly.
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const initScene = useMemo(() => {
    const s = makeDefaultScene("run-loop");
    // Attach activity refs to stats
    const act = ACTIVITIES.find(a => a.id === s.activityId);
    return {
      ...s,
      objects: s.objects.map(o => {
        if (o.type === "statsGroup") return { ...o, stats: o.stats.map(st => ({ ...st, activity: act })) };
        return o;
      }),
    };
  }, []);

  const [scene, dispatch] = useReducer(sceneReducer, initScene);
  const [timeS, setTimeS] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("route");
  const [exportProgress, setExportProgress] = useState(null);
  const [showActivities, setShowActivities] = useState(false);
  const rafRef = useRef();
  const lastTRef = useRef();

  // Playback loop
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    const tick = (now) => {
      const dt = lastTRef.current ? (now - lastTRef.current) / 1000 : 0;
      lastTRef.current = now;
      setTimeS(t => {
        const next = t + dt;
        if (next >= scene.duration) { setPlaying(false); return scene.duration; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    lastTRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, scene.duration]);

  // Preview dimensions
  const MAX_H = 560;
  const aspect = scene.canvasW / scene.canvasH;
  const previewH = Math.min(MAX_H, 560);
  const previewW = Math.round(previewH * aspect);
  const dprPreview = scene.canvasW / previewW;

  const routeObj = scene.objects.find(o => o.type === "route");
  const statsObj = scene.objects.find(o => o.type === "statsGroup");

  const handleExportPNG = async (mult) => {
    const blob = await exportStaticPNG(scene, timeS, mult);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "route-art.png"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportVideo = async (fps) => {
    if (exportProgress !== null) return;
    setExportProgress(0);
    try {
      const blob = await exportAnimatedWebM(scene, {
        duration: scene.duration, fps, multiplier: 1,
        onProgress: setExportProgress,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "route-art.webm"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
    setExportProgress(null);
  };

  const checkerBg = {
    backgroundImage: "linear-gradient(45deg,#1e1e1e 25%,transparent 25%),linear-gradient(-45deg,#1e1e1e 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1e1e1e 75%),linear-gradient(-45deg,transparent 75%,#1e1e1e 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0,0 10px,10px -10px,-10px 0px",
    backgroundColor: "#141414",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 720, background: C.bg, color: C.text, fontFamily: "system-ui,-apple-system,sans-serif", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `0.5px solid ${C.border}`, flexShrink: 0, background: "#0D0D0D" }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>R</span>
        </div>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.03em" }}>Route Art</span>
        <span style={{ fontSize: 10, color: C.textMuted, padding: "2px 8px", border: `0.5px solid ${C.border}`, borderRadius: 20 }}>Canvas 2D Engine</span>
        <div style={{ flex: 1 }} />

        {/* Activity picker */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowActivities(a => !a)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 8, border: `0.5px solid ${C.borderStrong}`, background: "#181818", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.text }}>
            {ACTIVITIES.find(a => a.id === scene.activityId)?.name || "Activity"}
            <span style={{ fontSize: 10, color: C.textMuted }}>▾</span>
          </button>
          {showActivities && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#141414", borderRadius: 10, border: `0.5px solid ${C.border}`, minWidth: 220, zIndex: 100, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
              {ACTIVITIES.map(a => (
                <div key={a.id} onClick={() => { dispatch({ type: "SET_ACTIVITY", id: a.id }); setShowActivities(false); setTimeS(0); setPlaying(false); }}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: 12, borderBottom: `0.5px solid ${C.border}`, background: scene.activityId === a.id ? C.accentMuted : "transparent" }}>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{a.activityType} · {fmt.dist(a.distance, false)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Preview area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, gap: 12, overflow: "hidden" }}>
          {/* Canvas */}
          <div style={{ ...checkerBg, borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 48px rgba(0,0,0,0.7)", flexShrink: 0 }}>
            <SceneCanvas
              scene={scene}
              timeS={timeS}
              width={previewW}
              height={previewH}
              dpr={dprPreview}
            />
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em" }}>
            {scene.canvasW}×{scene.canvasH} · {scene.canvasPreset.toUpperCase()} · transparent
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 288, borderLeft: `0.5px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, background: "#0D0D0D" }}>

          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
            {[
              { id: "route", label: "Route" },
              { id: "stats", label: "Stats" },
              { id: "canvas", label: "Canvas" },
              { id: "anim", label: "Anim" },
              { id: "export", label: "Export" },
            ].map(t => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>{t.label}</TabBtn>)}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "route" && <RoutePanel obj={routeObj} dispatch={dispatch} sceneDuration={scene.duration} />}
            {activeTab === "stats" && <StatsPanel obj={statsObj} dispatch={dispatch} activityId={scene.activityId} />}
            {activeTab === "canvas" && <CanvasPanel scene={scene} dispatch={dispatch} />}
            {activeTab === "anim" && <AnimPresetsPanel scene={scene} dispatch={dispatch} />}
            {activeTab === "export" && <ExportPanel scene={scene} timeS={timeS} exportProgress={exportProgress} onExportPNG={handleExportPNG} onExportVideo={handleExportVideo} />}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Timeline scene={scene} timeS={timeS} setTimeS={setTimeS} playing={playing} setPlaying={setPlaying} dispatch={dispatch} />

      <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }`}</style>
    </div>
  );
}
