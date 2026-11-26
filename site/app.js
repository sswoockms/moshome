(() => {
"use strict";

const PV = (() => { try { return window.parent !== window && window.parent.MH_PREVIEW || null; } catch { return null; } })();
const D = (PV && PV.data) || window.SITE_DATA || {};
const SITE_ROOT = new URL(".", location.href).href;
const res = u => {
  u = String(u || "");
  const A = PV && PV.assets;
  if (!A || !u) return u;
  const k = u.replace(/^\.\//, "");
  if (A[k]) return A[k];
  if (u.startsWith(SITE_ROOT)) {
    try { const p = decodeURIComponent(u.slice(SITE_ROOT.length).split(/[?#]/)[0]); if (A[p]) return A[p]; } catch {}
  }
  return u;
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = u => /^\s*(javascript|vbscript):/i.test(String(u || "")) ? "#" : res(u);
const cssUrl = u => `url("${safeUrl(u).replace(/["\\\n\r]/g, c => encodeURIComponent(c))}")`;
const h = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isSmall = () => matchMedia("(max-width:700px)").matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem("mh_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("mh_" + k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem("mh_" + k); } catch {} }
};
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
const GLYPH = {
  gallery: SV + '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 3 3 3-3 5 5"/></svg>',
  calendar: SV + '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  music: SV + '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  trpg: SV + '<path d="M12 2.5 20.5 7.3v9.4L12 21.5 3.5 16.7V7.3Z"/><path d="M12 2.5 7.5 15h9ZM3.5 7.3 7.5 15M20.5 7.3 16.5 15M7.5 15l4.5 6.5 4.5-6.5"/></svg>',
  story: SV + '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 7.5h6M9 11h4"/></svg>',
  wallpaper: SV + '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  profile: SV + '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
};
const IC = {
  x: '<svg viewBox="0 0 10 10"><path d="m2.5 2.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.4"/></svg>',
  min: '<svg viewBox="0 0 10 10"><path d="M2 5h6" stroke="currentColor" stroke-width="1.4"/></svg>',
  zoom: '<svg viewBox="0 0 10 10"><path d="M2.5 6.8V2.5h4.3zM7.5 3.2v4.3H3.2z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 4.5v15l12.5-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 4h4.2v16H6zM13.8 4H18v16h-4.2z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M5 5h2.4v14H5zM20 5v14l-11-7z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 5H19v14h-2.4zM4 5v14l11-7z"/></svg>',
  vol: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>'
};

const SPEC = {
  gallery: { w: 760, h: 520, render: renderGallery },
  calendar: { w: 860, h: 580, render: renderCalendar },
  music: { w: 740, h: 470, render: renderMusic },
  trpg: { w: 860, h: 560, render: w => renderLibrary(w, D.trpg || [], "trpg") },
  story: { w: 800, h: 540, render: w => renderLibrary(w, D.story || [], "story") },
  wallpaper: { w: 580, h: 480, render: renderWallpaper, name: "배경화면" },
  profile: { w: 340, h: 420, render: renderProfile, name: "프로필" }
};
const APPS = (D.apps || []).filter(a => SPEC[a.id]);
const appName = id => (APPS.find(a => a.id === id) || {}).name || SPEC[id]?.name || id;

function iconEl(id) {
  const app = APPS.find(a => a.id === id) || {};
  const el = h(`<div class="app-icon" aria-hidden="true"></div>`);
  if (app.icon) {
    const img = new Image();
    img.alt = "";
    img.draggable = false;
    img.src = safeUrl(app.icon);
    img.onerror = () => { el.innerHTML = GLYPH[id] || ""; };
    el.append(img);
  } else {
    el.innerHTML = GLYPH[id] || "";
  }
  return el;
}

function thumb(src, cls = "") {
  return src
    ? `<div class="${cls}"><img src="${esc(safeUrl(src))}" alt="" loading="lazy" draggable="false"></div>`
    : `<div class="${cls} ph"></div>`;
}

const winLayer = $("#windows");
const wins = new Map();
let zTop = 10, cascade = 0;

function flyTransform(el, target) {
  if (!target) return "scale(.88)";
  const r = el.getBoundingClientRect(), t = target.getBoundingClientRect();
  if (!r.width || !t.width) return "scale(.88)";
  const dx = t.left + t.width / 2 - (r.left + r.width / 2);
  const dy = t.top + t.height / 2 - (r.top + r.height / 2);
  return `translate(${dx}px,${dy}px) scale(${Math.max(.04, t.width / r.width)})`;
}
function animIn(el, origin) {
  el.getAnimations().forEach(a => a.cancel());
  if (reduce) return;
  el.animate([{ transform: flyTransform(el, origin), opacity: 0 }, { transform: "none", opacity: 1 }],
    { duration: 520, easing: "cubic-bezier(.3,1.32,.55,1)" });
}
function animOut(el, target, dur = 340) {
  if (reduce) return Promise.resolve();
  return el.animate([{ transform: "none", opacity: 1 }, { transform: flyTransform(el, target), opacity: 0 }],
    { duration: target ? dur : 180, easing: "cubic-bezier(.5,0,.75,.2)", fill: "forwards" }).finished.catch(() => {});
}

function dockItem(id) { return $(`.dock-item[data-app="${id}"]`); }
function deskItem(id) { return $(`.desk-icon[data-app="${id}"]`); }

function openApp(id, origin) {
  if (!SPEC[id]) return;
  if (!SPEC[id].name && !APPS.some(a => a.id === id)) return;
  const ex = wins.get(id);
  if (ex) {
    if (ex.minimized) restore(ex, origin);
    focus(ex);
    return;
  }
  const spec = SPEC[id];
  const el = h(`<section class="win" data-app="${id}" role="dialog" aria-label="${esc(appName(id))}">
    <div class="win-bar">
      <div class="lights">
        <button class="light close" aria-label="닫기">${IC.x}</button>
        <button class="light min" aria-label="최소화">${IC.min}</button>
        <button class="light zoom" aria-label="확대">${IC.zoom}</button>
      </div>
      <div class="win-title">${esc(appName(id))}</div>
    </div>
    <div class="win-body"></div>
    <div class="win-resize"></div>
  </section>`);
  const area = winLayer.getBoundingClientRect();
  const w = Math.min(spec.w, area.width - 24);
  const ht = Math.min(spec.h, area.height - 40);
  const off = (cascade++ % 6) * 26;
  const left = Math.max(12, Math.min(area.width - w - 12, (area.width - w) / 2 - 70 + off));
  const top = Math.max(8, Math.min(area.height - ht - 8, (area.height - ht) / 2 - 40 + off));
  Object.assign(el.style, { left: left + "px", top: top + "px", width: w + "px", height: ht + "px" });
  winLayer.append(el);
  const win = { id, el, body: $(".win-body", el), minimized: false, max: null, cleanup: [], onKey: null };
  wins.set(id, win);
  spec.render(win);
  bindWin(win);
  focus(win);
  animIn(el, origin || deskItem(id) || dockItem(id));
  syncDock();
}

function focus(win) {
  if (!win) {
    $("#activeTitle").textContent = "Finder";
    return;
  }
  win.el.style.zIndex = ++zTop;
  wins.forEach(w => w.el.classList.toggle("inactive", w !== win));
  $("#activeTitle").textContent = appName(win.id);
}
function topWin() {
  let best = null;
  wins.forEach(w => { if (!w.minimized && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w; });
  return best;
}
async function closeWin(win) {
  if (win.closing) return;
  win.closing = true;
  win.cleanup.forEach(fn => { try { fn(); } catch {} });
  await animOut(win.el, null);
  win.el.remove();
  wins.delete(win.id);
  focus(topWin());
  syncDock();
}
async function minimize(win) {
  if (win.minimized) return;
  win.minimized = true;
  await animOut(win.el, dockItem(win.id), 420);
  if (win.minimized) win.el.style.display = "none";
  win.el.classList.add("inactive");
  focus(topWin());
  syncDock();
}
function restore(win, origin) {
  win.minimized = false;
  win.el.style.display = "";
  animIn(win.el, origin || dockItem(win.id));
  syncDock();
}
function toggleZoom(win) {
  if (isSmall()) return;
  const s = win.el.style;
  win.el.classList.add("max");
  if (win.max) {
    Object.assign(s, win.max);
    win.max = null;
  } else {
    win.max = { left: s.left, top: s.top, width: s.width, height: s.height };
    const a = winLayer.getBoundingClientRect();
    Object.assign(s, { left: "0px", top: "0px", width: a.width + "px", height: a.height + "px" });
  }
  setTimeout(() => win.el.classList.remove("max"), 340);
}

function bindWin(win) {
  const { el } = win;
  el.addEventListener("pointerdown", () => focus(win), true);
  $(".close", el).onclick = e => { e.stopPropagation(); closeWin(win); };
  $(".min", el).onclick = e => { e.stopPropagation(); minimize(win); };
  $(".zoom", el).onclick = e => { e.stopPropagation(); toggleZoom(win); };
  const bar = $(".win-bar", el);
  bar.addEventListener("dblclick", e => { if (!e.target.closest(".lights")) toggleZoom(win); });
  bar.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.target.closest(".lights") || isSmall()) return;
    const a = winLayer.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    let ox = el.offsetLeft, oy = el.offsetTop;
    if (win.max) {
      const ratio = (e.clientX - a.left) / a.width;
      Object.assign(el.style, win.max);
      win.max = null;
      ox = Math.round(e.clientX - a.left - el.offsetWidth * ratio);
      oy = 0;
      el.style.left = ox + "px";
      el.style.top = oy + "px";
    }
    bar.setPointerCapture(e.pointerId);
    const move = ev => {
      const nx = Math.min(a.width - 80, Math.max(80 - el.offsetWidth, ox + ev.clientX - sx));
      const ny = Math.min(a.height - 40, Math.max(0, oy + ev.clientY - sy));
      el.style.left = nx + "px";
      el.style.top = ny + "px";
    };
    const up = () => { bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up); bar.removeEventListener("pointercancel", up); };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  });
  const rz = $(".win-resize", el);
  rz.addEventListener("pointerdown", e => {
    e.preventDefault();
    e.stopPropagation();
    rz.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, sw = el.offsetWidth, sh = el.offsetHeight;
    win.max = null;
    const move = ev => {
      el.style.width = Math.max(320, sw + ev.clientX - sx) + "px";
      el.style.height = Math.max(220, sh + ev.clientY - sy) + "px";
    };
    const up = () => { rz.removeEventListener("pointermove", move); rz.removeEventListener("pointerup", up); };
    rz.addEventListener("pointermove", move);
    rz.addEventListener("pointerup", up);
  });
}

function renderDesktop() {
  const box = $("#desktopIcons");
  box.innerHTML = "";
  APPS.forEach(app => {
    const b = h(`<button class="desk-icon" data-app="${app.id}"><span>${esc(app.name)}</span></button>`);
    b.prepend(iconEl(app.id));
    b.onclick = e => {
      e.stopPropagation();
      $$(".desk-icon.selected").forEach(x => x.classList.remove("selected"));
      b.classList.add("selected");
      openApp(app.id, b);
    };
    box.append(b);
  });
  $("#desktop").addEventListener("click", e => {
    if (!e.target.closest(".desk-icon")) $$(".desk-icon.selected").forEach(x => x.classList.remove("selected"));
  });
}

let widgetDay = "";
function renderWidgets() {
  const box = $("#widgets");
  const raw = D.widgets;
  const list = Array.isArray(raw) ? raw
    : raw && typeof raw === "object" ? ["photo", "calendar"].map(t => raw[t] && raw[t].show !== false ? { type: t, ...raw[t] } : null).filter(Boolean)
    : [{ type: "photo", open: "gallery" }, { type: "calendar", open: "calendar" }];
  const now = new Date();
  widgetDay = ymd(now);
  box.innerHTML = "";
  const done = new Set();
  list.forEach(w => {
    if (!w || done.has(w.type)) return;
    done.add(w.type);
    if (w.type === "photo") widgetPhoto(box, w);
    else if (w.type === "calendar") widgetCalendar(box, w, now);
  });
}
function widgetPhoto(box, p) {
  {
    const b = h(`<button class="widget w-photo" aria-label="${esc(p.caption || "그림 위젯")}">${thumb(p.src, "")}${p.caption ? `<span class="cap">${esc(p.caption)}</span>` : ""}</button>`);
    b.onclick = e => { e.stopPropagation(); if (p.open) openApp(p.open, b); };
    box.append(b);
  }
}
function widgetCalendar(box, c, now) {
  {
    const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    const cells = [..."일월화수목금토"].map(d => `<span class="wk">${d}</span>`);
    for (let i = 0; i < first; i++) cells.push("<span></span>");
    for (let d = 1; d <= days; d++) cells.push(`<span class="${d === today ? "t" : ""}">${d}</span>`);
    const evs = (D.calendar || []).filter(e => e.date === widgetDay).sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
    const b = h(`<button class="widget w-cal${c.glass ? " glass" : ""}" aria-label="캘린더 위젯">
      <div class="wc-left">
        <div class="wc-day">${"일월화수목금토"[now.getDay()]}요일</div>
        <div class="wc-num">${today}</div>
        <div class="wc-evs">${evs.length
          ? evs.slice(0, 3).map(e => `<div class="wc-ev"><i style="background:${esc(e.color || "#5b8cff")}"></i><span>${e.time ? esc(e.time) + " " : ""}${esc(e.title)}</span></div>`).join("")
          : "오늘 일정 없음"}</div>
      </div>
      <div class="wc-right">
        <div class="wc-month">${m + 1}월</div>
        <div class="wc-grid">${cells.join("")}</div>
      </div>
    </button>`);
    b.onclick = e => { e.stopPropagation(); if (c.open) openApp(c.open, b); };
    box.append(b);
  }
}

const dockWrap = $("#dockWrap");
const dock = $("#dock");
let hideT = 0;
const BASE = 50, MAG = 80, RANGE = 150;
function renderDock() {
  dock.innerHTML = "";
  APPS.forEach(app => {
    const b = h(`<button class="dock-item" data-app="${app.id}" aria-label="${esc(app.name)}"><span class="tip">${esc(app.name)}</span><i class="dot"></i></button>`);
    b.insertBefore(iconEl(app.id), b.querySelector(".dot"));
    b.onclick = () => {
      if (!wins.has(app.id)) {
        b.classList.remove("bounce");
        void b.offsetWidth;
        b.classList.add("bounce");
        setTimeout(() => b.classList.remove("bounce"), 700);
      }
      openApp(app.id, b);
    };
    dock.append(b);
  });
}
function syncDock() {
  $$(".dock-item").forEach(b => b.classList.toggle("running", wins.has(b.dataset.app)));
}
function showDock() { clearTimeout(hideT); dockWrap.classList.add("show"); }
function hideDock(delay = 380) {
  clearTimeout(hideT);
  if (DOCK.pinned) { resetMag(); return; }
  hideT = setTimeout(() => { dockWrap.classList.remove("show"); resetMag(); }, delay);
}
function resetMag() { $$(".dock-item").forEach(b => { b.style.width = ""; }); }
const DOCK = Object.assign({ enabled: true, pinned: false }, D.dock || {});
function bindDock() {
  if (!DOCK.enabled) {
    dockWrap.hidden = true;
    $("#dockZone").hidden = true;
    return;
  }
  if (DOCK.pinned) { dockWrap.classList.add("show", "pinned"); document.body.classList.add("dock-pinned"); }
  $("#dockZone").addEventListener("mouseenter", showDock);
  document.addEventListener("mousemove", e => { if (e.clientY >= innerHeight - 8) showDock(); });
  dockWrap.addEventListener("mouseenter", showDock);
  dockWrap.addEventListener("mouseleave", () => { hideDock(); resetMag(); });
  dock.addEventListener("mousemove", e => {
    if (isSmall() || reduce) return;
    $$(".dock-item").forEach(b => {
      const r = b.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const k = d < RANGE ? (Math.cos(d / RANGE * Math.PI) + 1) / 2 : 0;
      b.style.width = (BASE + (MAG - BASE) * k).toFixed(1) + "px";
    });
  });
}

function bindMenus() {
  const homeMenu = $("#homeMenu"), ctx = $("#ctxMenu"), homeBtn = $("#homeBtn");
  const closeMenus = () => { homeMenu.hidden = true; ctx.hidden = true; homeBtn.classList.remove("open"); };
  homeBtn.onclick = e => {
    e.stopPropagation();
    const open = homeMenu.hidden;
    closeMenus();
    homeMenu.hidden = !open;
    homeBtn.classList.toggle("open", open);
  };
  $$("[data-menu]").forEach(b => b.onclick = () => openApp(b.dataset.menu));
  $("#desktop").addEventListener("contextmenu", e => {
    if (e.target.closest(".win")) return;
    e.preventDefault();
    closeMenus();
    ctx.hidden = false;
    const r = ctx.getBoundingClientRect();
    ctx.style.left = Math.min(e.clientX, innerWidth - r.width - 6) + "px";
    ctx.style.top = Math.min(e.clientY, innerHeight - r.height - 6) + "px";
  });
  document.addEventListener("click", e => { if (!e.target.closest(".dropdown")) closeMenus(); });
  [homeMenu, ctx].forEach(m => m.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    closeMenus();
    const act = b.dataset.act;
    if (act === "home") wins.forEach(w => minimize(w));
    else if (act === "closeAll") wins.forEach(w => closeWin(w));
    else openApp(act);
  }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeMenus();
    const w = topWin();
    if (w && w.onKey && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) w.onKey(e);
  });
}

function tickClock() {
  const d = new Date();
  const wd = "일월화수목금토"[d.getDay()];
  const hr = d.getHours();
  if (widgetDay && widgetDay !== ymd(d)) renderWidgets();
  $("#clock").textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd}) ${hr < 12 ? "오전" : "오후"} ${hr % 12 || 12}:${pad(d.getMinutes())}`;
}

const DEFAULT_BG = "linear-gradient(160deg,#f6a878 0%,#e86a7e 35%,#7a5fc9 70%,#2c3e8f 100%)";
const BG = (() => {
  const b = D.background || {};
  const old = D.wallpapers || [];
  const imgs = b.images || old.filter(w => w && w.src).map(w => ({ name: w.name, src: w.src }));
  return {
    color: b.color || (old.find(w => w && w.css && w.default) || old.find(w => w && w.css) || {}).css || DEFAULT_BG,
    images: imgs.filter(w => w && w.src),
    mode: b.mode === "image" ? "image" : "slideshow",
    interval: Math.max(3, +b.interval || 10),
    fade: Math.min(10, Math.max(0, b.fade == null || b.fade === "" ? 2 : +b.fade))
  };
})();
const bg = { layers: [], front: 0, idx: -1, timer: 0, token: 0, z: 1 };
let bgMem = null;
const bgPick = () => PV ? bgMem : store.get("bg", null);
const bgSave = v => { if (PV) bgMem = v; else store.set("bg", v); };
function bgChoice() {
  const n = BG.images.length;
  const s = bgPick();
  if (s && s.mode === "slideshow" && n > 1) return { mode: "slideshow" };
  if (s && s.mode === "image" && s.index >= 0 && s.index < n) return { mode: "image", index: s.index };
  return BG.mode === "slideshow" && n > 1 ? { mode: "slideshow" } : { mode: "image", index: 0 };
}
function bgShow(i, instant) {
  const w = BG.images[i];
  if (!w) return;
  bg.idx = i;
  const t = ++bg.token;
  const go = () => {
    if (t !== bg.token) return;
    const next = bg.layers[1 - bg.front], cur = bg.layers[bg.front];
    const dur = instant || reduce ? 0 : BG.fade;
    next.style.transition = "none";
    next.classList.remove("on");
    next.style.backgroundImage = cssUrl(w.src);
    next.style.zIndex = ++bg.z;
    void next.offsetWidth;
    next.style.transition = `opacity ${dur}s ease`;
    next.classList.add("on");
    bg.front = 1 - bg.front;
    setTimeout(() => { if (t === bg.token) { cur.style.transition = "none"; cur.classList.remove("on"); } }, dur * 1000 + 60);
  };
  const img = new Image();
  img.onload = go;
  img.onerror = go;
  img.src = safeUrl(w.src);
}
function bgApply() {
  clearInterval(bg.timer);
  const n = BG.images.length;
  if (!n) { bg.layers.forEach(l => l.classList.remove("on")); bg.idx = -1; return; }
  const c = bgChoice();
  if (c.mode === "image") { if (bg.idx !== c.index) bgShow(c.index, bg.idx < 0); return; }
  if (bg.idx < 0) bgShow(0, true);
  bg.timer = setInterval(() => { if (!document.hidden) bgShow((bg.idx + 1) % n); }, BG.interval * 1000);
}
function initBg() {
  const host = $("#wallpaper");
  host.style.background = BG.color;
  host.innerHTML = '<div class="wp-layer"></div><div class="wp-layer"></div>';
  bg.layers = $$(".wp-layer", host);
  bgApply();
}

function renderWallpaper(win) {
  const n = BG.images.length;
  const draw = () => {
    if (!n) { win.body.innerHTML = `<div class="empty">등록된 배경화면이 없습니다.</div>`; return; }
    const c = bgChoice();
    const slide = c.mode === "slideshow";
    win.body.innerHTML = `<div class="wp">
      ${n > 1 ? `<label class="wp-switch">
        <span><b>슬라이드쇼</b><small>배경화면이 ${BG.interval}초마다 천천히 바뀝니다</small></span>
        <input type="checkbox" ${slide ? "checked" : ""}><i aria-hidden="true"></i>
      </label>` : ""}
      <div><h4>배경화면 고르기</h4><p>${slide ? "하나를 고르면 슬라이드쇼가 꺼지고 그 배경으로 고정됩니다." : "선택한 배경은 이 브라우저에만 저장됩니다."}</p></div>
      <div class="wp-grid">${BG.images.map((w, i) => `<button class="wp-item ${!slide && c.index === i ? "on" : ""} ${slide ? "dim" : ""}" data-i="${i}"><i style="background-image:${esc(cssUrl(w.src))}"></i>${esc(w.name || `배경 ${i + 1}`)}</button>`).join("")}</div>
    </div>`;
  };
  draw();
  win.body.addEventListener("click", e => {
    const it = e.target.closest(".wp-item");
    if (!it) return;
    bgSave({ mode: "image", index: +it.dataset.i });
    bgApply();
    draw();
  });
  win.body.addEventListener("change", e => {
    if (e.target.type !== "checkbox") return;
    bgSave(e.target.checked ? { mode: "slideshow" } : { mode: "image", index: Math.max(0, bg.idx) });
    bgApply();
    draw();
  });
}

function renderProfile(win) {
  const p = D.profile || {};
  win.body.innerHTML = `<div class="prof">
    ${thumb(p.avatar, "av")}
    <h2>${esc(p.name || "")}</h2>
    <p>${esc(p.bio || "")}</p>
    <div class="links">${(p.links || []).map(l => `<a class="btn" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>
  </div>`;
}

function renderGallery(win) {
  const items = D.gallery || [];
  if (!items.length) { win.body.innerHTML = `<div class="empty">등록된 이미지가 없습니다.</div>`; return; }
  win.body.innerHTML = `<div class="gal">${items.map((g, i) => `<button class="gal-item" data-i="${i}">${thumb(g.src, "gal-thumb")}<b>${esc(g.title || "")}</b></button>`).join("")}</div>`;
  let lb = null, cur = 0;
  const show = i => {
    cur = (i + items.length) % items.length;
    const g = items[cur];
    if (!lb) {
      lb = h(`<div class="lightbox"></div>`);
      lb.style.top = "40px";
      win.el.append(lb);
      lb.addEventListener("click", e => {
        if (e.target.closest(".lb-prev")) show(cur - 1);
        else if (e.target.closest(".lb-next")) show(cur + 1);
        else if (e.target.closest(".lb-x") || e.target === lb) hide();
      });
    }
    lb.innerHTML = `
      ${g.src ? `<img class="lb-img" src="${esc(safeUrl(g.src))}" alt="${esc(g.title)}">` : `<div class="lb-ph ph"></div>`}
      <p><b>${esc(g.title || "")}</b>${g.date ? ` · ${esc(g.date)}` : ""}${g.desc ? `<br>${esc(g.desc)}` : ""}</p>
      ${items.length > 1 ? `<button class="lb-nav lb-prev" aria-label="이전">‹</button><button class="lb-nav lb-next" aria-label="다음">›</button>` : ""}
      <button class="lb-x" aria-label="닫기">✕</button>`;
  };
  const hide = () => { lb?.remove(); lb = null; };
  win.body.addEventListener("click", e => { const b = e.target.closest(".gal-item"); if (b) show(+b.dataset.i); });
  win.onKey = e => {
    if (!lb) return;
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
    if (e.key === "Escape") hide();
  };
}

function renderCalendar(win) {
  const today = new Date();
  let y = today.getFullYear(), m = today.getMonth(), sel = ymd(today);
  const evs = (D.calendar || []).slice().sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  const byDate = {};
  evs.forEach(e => (byDate[e.date] = byDate[e.date] || []).push(e));
  const color = e => esc(e.color || "#5b8cff");
  const draw = () => {
    const first = new Date(y, m, 1).getDay();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(y, m, 1 - first + i);
      const key = ymd(d);
      const list = byDate[key] || [];
      cells.push(`<button class="cal-day ${d.getMonth() !== m ? "out" : ""} ${key === ymd(today) ? "today" : ""} ${key === sel ? "sel" : ""}" data-d="${key}">
        <span class="n">${d.getDate()}</span>
        ${list.slice(0, 2).map(e => `<span class="cal-ev" style="background:${color(e)}">${esc(e.title)}</span>`).join("")}
        ${list.length > 2 ? `<span class="cal-ev" style="background:none;color:var(--text-2)">+${list.length - 2}</span>` : ""}
      </button>`);
    }
    const selList = byDate[sel] || [];
    const upcoming = evs.filter(e => e.date >= ymd(today)).slice(0, 6);
    const item = e => `<div class="cal-item"><i style="background:${color(e)}"></i><div><b>${esc(e.title)}</b><br><small>${esc(e.date)}${e.time ? " " + esc(e.time) : ""}</small>${e.memo ? `<br><small>${esc(e.memo)}</small>` : ""}</div></div>`;
    win.body.innerHTML = `<div class="cal">
      <div class="cal-main">
        <div class="cal-head">
          <h3>${m + 1}월 <small>${y}</small></h3>
          <div class="cal-nav"><button class="btn" data-nav="-1">‹</button><button class="btn" data-nav="0">오늘</button><button class="btn" data-nav="1">›</button></div>
        </div>
        <div class="cal-week">${[..."일월화수목금토"].map(d => `<div>${d}</div>`).join("")}</div>
        <div class="cal-grid">${cells.join("")}</div>
      </div>
      <aside class="cal-side">
        <h4>${esc(sel.replace(/^(\d+)-(\d+)-(\d+)$/, (_, a, b, c) => `${+b}월 ${+c}일`))}</h4>
        ${selList.length ? selList.map(item).join("") : `<p style="color:var(--text-2);margin:0 0 18px">일정 없음</p>`}
        <h4 style="margin-top:22px">다가오는 일정</h4>
        ${upcoming.length ? upcoming.map(item).join("") : `<p style="color:var(--text-2);margin:0">없음</p>`}
      </aside>
    </div>`;
  };
  win.body.addEventListener("click", e => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      const v = +nav.dataset.nav;
      if (v === 0) { y = today.getFullYear(); m = today.getMonth(); sel = ymd(today); }
      else { const d = new Date(y, m + v, 1); y = d.getFullYear(); m = d.getMonth(); }
      draw(); return;
    }
    const day = e.target.closest(".cal-day");
    if (day) {
      sel = day.dataset.d;
      const [yy, mm] = sel.split("-").map(Number);
      if (mm - 1 !== m) { y = yy; m = mm - 1; }
      draw();
    }
  });
  win.onKey = e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const d = new Date(y, m + (e.key === "ArrowLeft" ? -1 : 1), 1); y = d.getFullYear(); m = d.getMonth(); draw();
    }
  };
  draw();
}

function ytId(u) { const r = String(u || "").match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/); return r ? r[1] : null; }
function fmt(t) { if (!isFinite(t)) return "0:00"; t = Math.floor(t); return `${Math.floor(t / 60)}:${pad(t % 60)}`; }
function renderMusic(win) {
  const list = D.playlist || [];
  if (!list.length) { win.body.innerHTML = `<div class="empty">플레이리스트가 비어 있음.</div>`; return; }
  const audio = new Audio();
  audio.preload = "metadata";
  audio.volume = store.get("vol", .8);
  let idx = 0, ytOn = false;
  win.body.innerHTML = `<div class="music">
    <div class="np">
      <div class="np-cover paused"></div>
      <div class="np-meta"><b></b><span></span></div>
      <div class="np-bar"><input type="range" min="0" max="1000" value="0" aria-label="재생 위치"><div class="np-time"><span class="t1">0:00</span><span class="t2">0:00</span></div></div>
      <div class="np-ctrl"><button data-c="prev" aria-label="이전 곡">${IC.prev}</button><button class="play" data-c="play" aria-label="재생">${IC.play}</button><button data-c="next" aria-label="다음 곡">${IC.next}</button></div>
      <div class="np-vol">${IC.vol}<input type="range" min="0" max="1" step="0.01" value="${audio.volume}" aria-label="볼륨"></div>
    </div>
    <div class="tracks"><h4>플레이리스트</h4>${list.map((t, i) => `<button class="track" data-i="${i}"><span class="no">${i + 1}</span>${thumb(t.cover, "tc")}<div><b>${esc(t.title)}</b><small>${esc(t.artist || "")}</small></div></button>`).join("")}</div>
  </div>`;
  const cover = $(".np-cover", win.body), seek = $(".np-bar input", win.body), playBtn = $(".play", win.body);
  const t1 = $(".t1", win.body), t2 = $(".t2", win.body);
  const setPlaying = on => { playBtn.innerHTML = on ? IC.pause : IC.play; cover.classList.toggle("paused", !on); };
  const coverDefault = t => { cover.innerHTML = t.cover ? `<img src="${esc(safeUrl(t.cover))}" alt="">` : GLYPH.music; cover.classList.toggle("ph", !t.cover); };
  const load = (i, autoplay) => {
    idx = (i + list.length) % list.length;
    const t = list[idx];
    audio.pause();
    ytOn = false;
    $(".np-meta b", win.body).textContent = t.title || "";
    $(".np-meta span", win.body).textContent = t.artist || "";
    $$(".track", win.body).forEach(b => b.classList.toggle("on", +b.dataset.i === idx));
    seek.value = 0; t1.textContent = "0:00"; t2.textContent = "0:00";
    const yid = ytId(t.src);
    seek.disabled = !!yid || !t.src;
    if (yid) {
      audio.removeAttribute("src");
      coverDefault(t);
      t2.textContent = "YouTube";
      if (autoplay) playYt(yid);
      else setPlaying(false);
      return;
    }
    coverDefault(t);
    if (!t.src) { audio.removeAttribute("src"); setPlaying(false); t2.textContent = "음원 없음"; return; }
    audio.src = safeUrl(t.src);
    if (autoplay) audio.play().catch(() => setPlaying(false));
    else setPlaying(false);
  };
  const playYt = yid => {
    ytOn = true;
    cover.classList.remove("ph");
    cover.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${yid}?autoplay=1&playsinline=1" allow="autoplay; encrypted-media" allowfullscreen title="YouTube"></iframe>`;
    setPlaying(true);
  };
  const toggle = () => {
    const t = list[idx], yid = ytId(t.src);
    if (yid) { if (ytOn) { ytOn = false; coverDefault(t); setPlaying(false); } else playYt(yid); return; }
    if (!t.src) return;
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  };
  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("loadedmetadata", () => { t2.textContent = fmt(audio.duration); });
  audio.addEventListener("timeupdate", () => {
    if (audio.duration) seek.value = Math.round(audio.currentTime / audio.duration * 1000);
    t1.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener("ended", () => load(idx + 1, true));
  seek.addEventListener("input", () => { if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration; });
  $(".np-vol input", win.body).addEventListener("input", e => { audio.volume = +e.target.value; store.set("vol", audio.volume); });
  win.body.addEventListener("click", e => {
    const c = e.target.closest("[data-c]")?.dataset.c;
    if (c === "play") toggle();
    if (c === "prev") load(audio.currentTime > 3 ? idx : idx - 1, true);
    if (c === "next") load(idx + 1, true);
    const tr = e.target.closest(".track");
    if (tr) load(+tr.dataset.i, true);
  });
  win.onKey = e => { if (e.key === " ") { e.preventDefault(); toggle(); } };
  win.cleanup.push(() => { audio.pause(); audio.removeAttribute("src"); audio.load(); cover.innerHTML = ""; });
  load(0, false);
}

const logCache = new Map();
function sanitizeLog(root) {
  root.querySelectorAll("script,style,link,meta,base,iframe,frame,object,embed,form,input,textarea,select,button").forEach(n => n.remove());
  root.querySelectorAll(".hidden-message").forEach(n => n.remove());
  root.querySelectorAll("*").forEach(n => {
    [...n.attributes].forEach(a => {
      const nm = a.name.toLowerCase();
      if (nm.startsWith("on") || nm === "srcdoc" || nm === "id") n.removeAttribute(a.name);
      else if (/^(href|src|xlink:href|action|formaction)$/.test(nm) && /^\s*(javascript|vbscript|data:text)/i.test(a.value)) n.removeAttribute(a.name);
      else if (nm === "title" && a.value.includes("<")) n.setAttribute("title", a.value.replace(/<[^>]*>/g, ""));
    });
    if (n.tagName === "A") { n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener"); }
  });
}
function parseLog(txt, path, assets) {
  const doc = new DOMParser().parseFromString(txt, "text/html");
  const root = doc.querySelector("#textchat .content") || doc.querySelector("#textchat") || doc.querySelector("body > .content") || doc.body;
  sanitizeLog(root);
  const base = new URL(path, location.href);
  const stem = decodeURIComponent(base.pathname.split("/").pop()).replace(/\.html?$/i, "");
  root.querySelectorAll("img").forEach(img => {
    const raw = img.getAttribute("src") || "";
    const cut = raw.lastIndexOf("_files/");
    const file = cut >= 0 ? raw.slice(cut + 7) : "";
    const name = raw.split(/[?#]/)[0].split("/").pop();
    const absolute = /^([a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(raw);
    const c = [];
    const add = (p, b) => { try { c.push(new URL(p, b).href); } catch {} };
    if (assets && (file || name)) add(assets.replace(/\/?$/, "/") + (file || name), location.href);
    if (raw) add(raw, base);
    if (raw && !absolute) add(raw, location.href);
    if (file) add(encodeURIComponent(stem + "_files") + "/" + file, base);
    if (name && !absolute) add(name, base);
    if (name && !absolute) add(encodeURIComponent(stem + "_files") + "/" + name, base);
    img.removeAttribute("src");
    img.setAttribute("loading", "lazy");
    img.setAttribute("alt", "");
    img.dataset.c = JSON.stringify([...new Set(c)]);
  });
  return { html: root.innerHTML, count: root.querySelectorAll(".message").length };
}
function loadLog(path, assets) {
  const key = path + "|" + (assets || "");
  if (!logCache.has(key)) {
    logCache.set(key, fetch(safeUrl(path))
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(t => parseLog(t, path, assets))
      .catch(e => { logCache.delete(key); throw e; }));
  }
  return logCache.get(key);
}
function mountLogImages(box) {
  $$("img[data-c]", box).forEach(img => {
    const c = JSON.parse(img.dataset.c || "[]");
    let i = 0;
    const fail = () => { const av = img.closest(".avatar"); if (av) av.classList.add("noimg"); img.remove(); };
    img.onerror = () => { i++; if (i < c.length) img.src = res(c[i]); else fail(); };
    if (c.length) img.src = res(c[0]); else fail();
  });
}

const unlocked = new Map();
const LOCK_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const b64d = s => Uint8Array.from(atob(String(s || "")), c => c.charCodeAt(0));
const lockErr = code => Object.assign(new Error(code), { code });
async function openLocked(enc, pw) {
  if (!window.crypto || !crypto.subtle) throw lockErr("secure");
  let r;
  try { r = await fetch(safeUrl(enc.file)); } catch { throw lockErr("file"); }
  if (!r.ok) throw lockErr("file");
  const buf = await r.arrayBuffer();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64d(enc.salt), iterations: +enc.iter || 600000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(enc.iv) }, key, buf); } catch { throw lockErr("pw"); }
  if (enc.z === "gzip") {
    if (!window.DecompressionStream) throw lockErr("old");
    plain = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  }
  return JSON.parse(new TextDecoder().decode(plain));
}
function lockKind(it) {
  if (PV && it.lock && it.lock.on && it.lock.password) return "preview";
  if (it.locked && it.enc && it.enc.file) return "enc";
  return "";
}

function renderLibrary(win, raw, kind) {
  const items = raw.map((it, i) => ({ ...it, _i: i })).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (!items.length) { win.body.innerHTML = `<div class="empty">백업된 글이 없습니다.</div>`; return; }
  const ukey = it => kind + ":" + it._i;
  const shown = it => {
    const lk = lockKind(it);
    if (!lk) return it;
    if (unlocked.has(ukey(it))) return unlocked.get(ukey(it));
    if (lk === "preview" && it.lock.hideInfo) return { _i: it._i, date: it.date };
    return it;
  };
  const tags = [...new Set(items.flatMap(it => shown(it).tags || []))];
  let q = "", tag = "", sel = items[0]._i;
  win.body.innerHTML = `<div class="lib">
    <div class="lib-side">
      <div class="lib-search"><input class="field" type="search" placeholder="검색"></div>
      ${tags.length ? `<div class="lib-tags"><button class="on" data-tag="">전체</button>${tags.map(t => `<button data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}
      <div class="lib-list"></div>
    </div>
    <article class="lib-view"></article>
  </div>`;
  const lib = $(".lib", win.body), listEl = $(".lib-list", win.body), view = $(".lib-view", win.body);
  const isLocked = it => !!lockKind(it) && !unlocked.has(ukey(it));
  const match = it => {
    const s = shown(it);
    return (!tag || (s.tags || []).includes(tag)) &&
      (!q || [s.title, isLocked(it) ? "" : s.content, s.system, s.gm, ...(s.players || []), ...(s.tags || [])].join(" ").toLowerCase().includes(q));
  };
  const sub = s => kind === "trpg" ? [s.system, s.date].filter(Boolean).join(" · ") : (s.date || "");
  const drawList = () => {
    const vis = items.filter(match);
    listEl.innerHTML = vis.length
      ? vis.map(it => {
        const s = shown(it);
        const lk = isLocked(it) ? `<span class="lk" aria-label="잠김">${LOCK_SVG}</span>` : "";
        return `<button class="lib-row ${it._i === sel ? "on" : ""}" data-i="${it._i}"><b>${lk}${esc(s.title || (lockKind(it) ? "잠긴 기록" : "제목 없음"))}</b><small>${esc(sub(s))}</small></button>`;
      }).join("")
      : `<p style="color:var(--text-2);padding:10px">결과 없음</p>`;
  };
  const drawLock = it => {
    const s = shown(it);
    const hint = lockKind(it) === "preview" ? it.lock.hint : it.hint;
    view.innerHTML = `
      <button class="btn lib-back">‹ 목록</button>
      <div class="lock">
        <div class="lock-ic">${LOCK_SVG}</div>
        <h2>${esc(s.title || "잠긴 기록")}</h2>
        ${s.date ? `<div class="lib-meta"><span>${esc(s.date)}</span></div>` : ""}
        <p>비밀번호를 입력해주세요.</p>
        ${hint ? `<p class="lock-hint">힌트 · ${esc(hint)}</p>` : ""}
        <form class="lock-form" autocomplete="off">
          <input class="field" type="password" placeholder="비밀번호" aria-label="비밀번호" autocomplete="off">
          <button class="btn primary" type="submit">열기</button>
        </form>
        <p class="lock-msg" role="alert"></p>
      </div>`;
    view.scrollTop = 0;
    const form = $(".lock-form", view), input = $("input", form), msg = $(".lock-msg", view), btn = $("button", form);
    if (!isSmall()) setTimeout(() => input.focus(), 50);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const pw = input.value;
      if (!pw) { msg.textContent = "비밀번호를 입력해주세요."; return; }
      const token = sel;
      btn.disabled = true;
      msg.textContent = "여는 중…";
      try {
        let v;
        if (lockKind(it) === "preview") {
          if (pw !== it.lock.password) throw lockErr("pw");
          v = { ...it };
        } else {
          const p = await openLocked(it.enc, pw);
          v = { ...it, ...(p.meta || {}), content: p.content || "", link: p.link || "", log: p.logPath || "", logAssets: p.logAssets || "", logHtml: p.html || "" };
        }
        unlocked.set(ukey(it), v);
        if (token !== sel) return;
        drawList();
        drawView();
      } catch (err) {
        if (token !== sel) return;
        btn.disabled = false;
        input.select();
        msg.textContent = ({
          pw: "비밀번호가 일치하지 않습니다.",
          file: "잠긴 기록 파일을 찾을 수 없습니다.",
          secure: "https 주소에서만 열 수 있습니다.",
          old: "이 브라우저에서는 열 수 없습니다. 최신 브라우저로 열어주세요."
        })[err.code] || "열지 못했습니다.";
      }
    });
  };
  const showLog = (v, token) => {
    const done = res => {
      if (token !== sel || !view.isConnected) return;
      const box = $(".r20", view);
      box.innerHTML = res.html;
      mountLogImages(box);
      $(".r20-state", view).textContent = `로그 · 메시지 ${res.count.toLocaleString()}개`;
    };
    if (v.logHtml) {
      try { done(parseLog(v.logHtml, v.log || "logs/locked.html", v.logAssets)); }
      catch { $(".r20-state", view).textContent = "로그를 표시하지 못했습니다."; }
      return;
    }
    loadLog(String(v.log), v.logAssets).then(done).catch(() => {
      if (token !== sel) return;
      $(".r20-state", view).textContent = "로그 파일을 불러오지 못했습니다. 경로를 확인해주세요.";
    });
  };
  const drawView = () => {
    const it = items.find(x => x._i === sel);
    if (!it) { view.innerHTML = ""; return; }
    if (isLocked(it)) { drawLock(it); return; }
    const lk = !!lockKind(it);
    const v = lk ? unlocked.get(ukey(it)) : it;
    const hasLog = !!(v.logHtml || v.log);
    const meta = kind === "trpg"
      ? [v.system && `<span>룰 · ${esc(v.system)}</span>`, v.date && `<span>${esc(v.date)}</span>`, v.gm && `<span>GM · ${esc(v.gm)}</span>`, (v.players || []).length && `<span>PL · ${esc(v.players.join(", "))}</span>`]
      : [v.date && `<span>${esc(v.date)}</span>`];
    view.innerHTML = `
      <button class="btn lib-back">‹ 목록</button>
      ${v.cover ? `<img class="cover" src="${esc(safeUrl(v.cover))}" alt="">` : ""}
      <h2>${esc(v.title || "제목 없음")}</h2>
      <div class="lib-meta">${meta.filter(Boolean).join("")}${lk ? `<span class="lk-open">${LOCK_SVG}열림</span>` : ""}</div>
      <div>${(v.tags || []).map(t => `<span class="chip">#${esc(t)}</span>`).join("")}</div>
      ${v.content ? `<div class="lib-text">${esc(v.content)}</div>` : ""}
      ${v.link ? `<a class="lib-link" href="${esc(safeUrl(v.link))}" target="_blank" rel="noopener">원문 / 로그 보기 ↗</a>` : ""}
      ${hasLog ? `<section class="r20-wrap"><div class="r20-head"><span class="r20-state">로그 불러오는 중…</span>${!lk ? `<a href="${esc(safeUrl(v.log))}" target="_blank" rel="noopener">원본 파일 열기 ↗</a>` : ""}</div><div class="r20"></div></section>` : ""}`;
    view.scrollTop = 0;
    if (hasLog) showLog(v, sel);
  };
  $(".lib-search input", win.body).addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); drawList(); });
  win.body.addEventListener("click", e => {
    const t = e.target.closest("[data-tag]");
    if (t) { tag = t.dataset.tag; $$(".lib-tags button", win.body).forEach(b => b.classList.toggle("on", b === t)); drawList(); return; }
    const row = e.target.closest(".lib-row");
    if (row) { sel = +row.dataset.i; drawList(); drawView(); lib.classList.add("detail"); return; }
    if (e.target.closest(".lib-back")) lib.classList.remove("detail");
  });
  drawList();
  drawView();
}

document.title = D.profile?.siteTitle || document.title;
if (/^#[0-9a-f]{3,8}$/i.test(D.calendarAccent || "")) document.documentElement.style.setProperty("--cal-accent", D.calendarAccent);
initBg();
renderDesktop();
renderWidgets();
renderDock();
bindDock();
bindMenus();
tickClock();
setInterval(tickClock, 10000);
if (PV && PV.open && SPEC[PV.open]) openApp(PV.open);
})();
