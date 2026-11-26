(() => {
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const BASE = "site/";
const SITE_FILES = ["index.html", "style.css", "app.js"];
const DEFAULT_BG = "linear-gradient(160deg,#f6a878 0%,#e86a7e 35%,#7a5fc9 70%,#2c3e8f 100%)";
const BG_PRESETS = [
  ["Sonoma", DEFAULT_BG],
  ["Sky", "linear-gradient(180deg,#7fb2ff 0%,#b7d3ff 55%,#f1e6ff 100%)"],
  ["Mint", "linear-gradient(150deg,#b6f0d8 0%,#6fcfb7 45%,#2f8f8a 100%)"],
  ["Night", "radial-gradient(120% 90% at 70% 10%,#3a4a8c 0%,#151a33 60%,#07080f 100%)"],
  ["Gray", "linear-gradient(160deg,#d9dbe0 0%,#a9adb6 100%)"],
  ["Peach", "linear-gradient(160deg,#ffe3d3 0%,#ffb4a2 50%,#e5989b 100%)"]
];
const WIDGET_DEFS = [["photo", "그림 위젯"], ["calendar", "캘린더 위젯"]];
const DEFAULT_ACCENT = "#ff3b30";
const APP_DEFS = [["gallery", "갤러리"], ["calendar", "캘린더"], ["music", "노래"], ["trpg", "TRPG 백업"], ["story", "썰 백업"]];

function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "value") e.value = v;
      else if (k === "checked") e.checked = !!v;
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
  }
  kids.flat(Infinity).forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}

const idb = (() => {
  let p = null;
  const open = () => p || (p = new Promise((ok, no) => {
    const r = indexedDB.open("mh-editor", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("assets"); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  }));
  const run = (store, mode, fn) => open().then(db => new Promise((ok, no) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => ok(req ? req.result : undefined);
    t.onerror = () => no(t.error);
    t.onabort = () => no(t.error);
  }));
  return {
    get: (s, k) => run(s, "readonly", st => st.get(k)),
    set: (s, k, v) => run(s, "readwrite", st => st.put(v, k)),
    del: (s, k) => run(s, "readwrite", st => st.delete(k)),
    entries: s => open().then(db => new Promise((ok, no) => {
      const t = db.transaction(s);
      const st = t.objectStore(s);
      const ks = st.getAllKeys(), vs = st.getAll();
      t.oncomplete = () => ok(ks.result.map((k, i) => [k, vs.result[i]]));
      t.onerror = () => no(t.error);
    }))
  };
})();

const S = {
  data: null,
  assets: new Map(),
  tab: "profile",
  dev: "desktop",
  open: new WeakSet()
};

function toast(msg, bad) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("bad", !!bad);
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), bad ? 6000 : 4200);
}
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const safeName = n => String(n || "file").normalize("NFC").replace(/[\\/:*?"<>|#%&{}^~`]+/g, "_").replace(/\s+/g, "_");
const stemOf = p => { const f = String(p).split("/").pop(); return f.replace(/\.[^.]+$/, ""); };
const dirOf = p => { const i = String(p).lastIndexOf("/"); return i >= 0 ? p.slice(0, i + 1) : ""; };
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(b / 1024)) + "KB";

function normalize(src) {
  const d = clone(src) || {};
  d.profile = Object.assign({ siteTitle: "My Desktop", name: "", bio: "", avatar: "", links: [] }, d.profile || {});
  if (!Array.isArray(d.profile.links)) d.profile.links = [];
  const seenApp = new Set();
  const apps = (Array.isArray(d.apps) ? d.apps : APP_DEFS.map(([id, name]) => ({ id, name, icon: "" })))
    .filter(a => a && APP_DEFS.some(x => x[0] === a.id) && !seenApp.has(a.id) && seenApp.add(a.id));
  apps.forEach(a => { a.name = a.name || (APP_DEFS.find(x => x[0] === a.id) || [])[1]; a.icon = a.icon || ""; });
  d.apps = apps;
  if (!d.background) {
    const old = Array.isArray(d.wallpapers) ? d.wallpapers : [];
    d.background = {
      color: (old.find(w => w && w.css && w.default) || old.find(w => w && w.css) || {}).css || DEFAULT_BG,
      images: old.filter(w => w && w.src).map(w => ({ name: w.name || "", src: w.src }))
    };
  }
  delete d.wallpapers;
  d.background = Object.assign({ color: DEFAULT_BG, images: [], mode: "slideshow", interval: 10, fade: 2 }, d.background);
  if (!Array.isArray(d.background.images)) d.background.images = [];
  let wl;
  if (Array.isArray(d.widgets)) wl = d.widgets;
  else if (d.widgets && typeof d.widgets === "object") wl = WIDGET_DEFS.map(([t]) => d.widgets[t] && d.widgets[t].show !== false ? { type: t, ...d.widgets[t] } : null);
  else wl = WIDGET_DEFS.map(([t]) => ({ type: t }));
  const seenW = new Set();
  d.widgets = wl.filter(w => w && WIDGET_DEFS.some(x => x[0] === w.type) && !seenW.has(w.type) && seenW.add(w.type)).map(w => {
    const o = { ...w };
    delete o.show;
    return o.type === "photo" ? Object.assign({ src: "", caption: "", open: "gallery" }, o) : Object.assign({ open: "calendar", glass: false }, o);
  });
  if (!/^#[0-9a-f]{6}$/i.test(d.calendarAccent || "")) d.calendarAccent = DEFAULT_ACCENT;
  d.dock = { enabled: !d.dock || d.dock.enabled !== false, pinned: !!(d.dock && d.dock.pinned) };
  ["gallery", "calendar", "playlist", "trpg", "story"].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; });
  return d;
}

let saveT = 0, pvT = 0;
function changed(opts = {}) {
  $("#saveState").textContent = "저장 중…";
  clearTimeout(saveT);
  saveT = setTimeout(save, 500);
  if (opts.preview !== false) { clearTimeout(pvT); pvT = setTimeout(pushPreview, opts.now ? 0 : 450); }
}
async function save() {
  try {
    await idb.set("kv", "data", S.data);
    $("#saveState").textContent = "✓ 자동 저장됨";
  } catch {
    $("#saveState").textContent = "이 브라우저에서는 자동 저장이 되지 않습니다";
  }
}

window.MH_PREVIEW = { data: null, assets: {}, open: null };
function pushPreview() {
  window.MH_PREVIEW.data = S.data;
  window.MH_PREVIEW.assets = Object.fromEntries([...S.assets].map(([k, v]) => [k, v.url]));
  window.MH_PREVIEW.open = (TABS.find(t => t.id === S.tab) || {}).open || null;
  const f = $("#pv");
  try {
    if (f.contentWindow && f.contentWindow.location.href !== "about:blank") { f.contentWindow.location.reload(); return; }
  } catch {}
  f.src = BASE + "index.html";
}
function layoutPreview() {
  const body = $("#pvBody"), f = $("#pv");
  const W = body.clientWidth, H = body.clientHeight;
  if (!W || !H) return;
  if (S.dev === "mobile") {
    const vw = 390, vh = 844;
    const s = Math.min(1, (H - 24) / vh, (W - 24) / vw);
    Object.assign(f.style, { width: vw + "px", height: vh + "px", transform: `scale(${s})`, left: Math.round((W - vw * s) / 2) + "px", top: "12px", borderRadius: "18px" });
  } else {
    const vw = Math.max(1100, W), s = W / vw;
    Object.assign(f.style, { width: vw + "px", height: Math.round(H / s) + "px", transform: `scale(${s})`, left: "0px", top: "0px", borderRadius: "0" });
  }
}

function previewUrl(v) {
  if (!v) return "";
  if (S.assets.has(v)) return S.assets.get(v).url;
  if (/^(https?:|data:|blob:)/i.test(v)) return v;
  return BASE + String(v).replace(/^\.\//, "");
}
async function putLocal(path, file) {
  const old = S.assets.get(path);
  if (old) URL.revokeObjectURL(old.url);
  S.assets.set(path, { blob: file, url: URL.createObjectURL(file) });
  try { await idb.set("assets", path, file); } catch {}
}
async function removeLocal(path) {
  const a = S.assets.get(path);
  if (a) URL.revokeObjectURL(a.url);
  S.assets.delete(path);
  try { await idb.del("assets", path); } catch {}
}
async function upload(file, folder, { local } = {}) {
  if (!file) return "";
  if (file.size > 30 * 1024 * 1024) { toast("30MB 이하의 파일만 업로드할 수 있습니다.", true); throw new Error("too big"); }
  const path = `${folder}/${safeName(file.name)}`;
  await putLocal(path, file);
  return path;
}

function row(label, control, hint) {
  return el("div", { class: "row" }, el("span", { class: "lab" }, label), control, hint ? el("div", { class: "hint", html: hint }) : null);
}
function text(obj, key, label, o = {}) {
  const inp = o.long ? el("textarea", { class: "in ta", placeholder: o.placeholder || "" }) : el("input", { class: "in", type: o.type || "text", placeholder: o.placeholder || "", min: o.min, max: o.max, step: o.step });
  const v = obj[key];
  inp.value = o.list ? (Array.isArray(v) ? v.join(", ") : (v || "")) : (v ?? "");
  inp.addEventListener("input", () => {
    let val = inp.value;
    if (o.type === "number") val = val === "" ? "" : +val;
    if (o.list) val = val.split(",").map(s => s.trim()).filter(Boolean);
    obj[key] = val;
    if (o.onInput) o.onInput();
    changed();
  });
  return row(label, inp, o.hint);
}
function check(obj, key, label, caption, hint) {
  const c = el("input", { type: "checkbox", checked: obj[key] !== false, onchange: () => { obj[key] = c.checked; changed(); } });
  return row(label, el("label", { class: "chk" }, c, caption || "보이기"), hint);
}
function select(obj, key, label, options, hint) {
  const s = el("select", { class: "in", onchange: () => { obj[key] = s.value; changed(); } },
    options.map(([v, t]) => el("option", { value: v }, t)));
  s.value = obj[key] ?? options[0][0];
  return row(label, s, hint);
}
function colorInput(value, onChange) {
  const c = el("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#5b8cff" });
  c.addEventListener("input", () => onChange(c.value));
  if (window.ColorPicker) window.ColorPicker.attach(c, { getLang: () => "ko" });
  return c;
}
function imageField(obj, key, label, o = {}) {
  const folder = o.folder || "images";
  const th = el("div", { class: "thumb" });
  const inp = el("input", { class: "in", type: "text", value: obj[key] || "", placeholder: o.placeholder || "images/파일.png 또는 https://…" });
  const paint = () => {
    const u = previewUrl(obj[key]);
    th.style.backgroundImage = u ? `url("${u.replace(/"/g, "%22")}")` : "";
    th.classList.toggle("empty", !u);
  };
  inp.addEventListener("input", () => { obj[key] = inp.value.trim(); paint(); if (o.onInput) o.onInput(); changed(); });
  const file = el("input", { type: "file", accept: o.accept || "image/*", hidden: true });
  file.addEventListener("change", async () => {
    const f = file.files[0];
    file.value = "";
    if (!f) return;
    try {
      obj[key] = await upload(f, folder);
      inp.value = obj[key];
      paint();
      if (o.onInput) o.onInput();
      changed();
    } catch {}
  });
  paint();
  return row(label, el("div", { class: "imgf" }, th, inp, el("button", { class: "btn sm", type: "button", onclick: () => file.click() }, "올리기"), file), o.hint);
}
function fileField(obj, key, label, o = {}) {
  const inp = el("input", { class: "in", type: "text", value: obj[key] || "", placeholder: o.placeholder || "" });
  inp.addEventListener("input", () => { obj[key] = inp.value.trim(); if (o.onInput) o.onInput(); changed(); });
  const file = el("input", { type: "file", accept: o.accept || "", hidden: true });
  file.addEventListener("change", async () => {
    const f = file.files[0];
    file.value = "";
    if (!f) return;
    try {
      obj[key] = await upload(f, o.folder || "files", { local: o.local });
      inp.value = obj[key];
      if (o.onInput) o.onInput();
      changed();
    } catch {}
  });
  return row(label, el("div", { class: "filef" }, inp, el("button", { class: "btn sm", type: "button", onclick: () => file.click() }, o.button || "올리기"), file), o.hint);
}

function listEditor(arr, o) {
  const wrap = el("div", { class: "list" });
  const touched = () => { changed(); if (o.onChange) o.onChange(); };
  const draw = () => {
    wrap.replaceChildren(...arr.map((it, i) => card(it, i)), el("div", { class: "add-row" },
      o.add !== false ? el("button", { class: "btn sm", type: "button", onclick: () => { const n = o.make(); arr.push(n); S.open.add(n); draw(); touched(); } }, o.addLabel || "+ 추가") : null,
      o.extra ? o.extra(draw) : null));
  };
  const card = (it, i) => {
    const ct = el("span", { class: "ct" });
    const retitle = () => { ct.replaceChildren(o.title(it, i)); const s = o.sub && o.sub(it); if (s) ct.append(el("small", null, s)); };
    retitle();
    const mv = (d, e) => {
      e.preventDefault();
      const j = i + d;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      draw();
      touched();
    };
    const sum = el("summary", null, ct,
      el("button", { class: "mini", type: "button", title: "위로", onclick: e => mv(-1, e) }, "↑"),
      el("button", { class: "mini", type: "button", title: "아래로", onclick: e => mv(1, e) }, "↓"),
      o.remove !== false ? el("button", { class: "mini del", type: "button", onclick: e => {
        e.preventDefault();
        if (!confirm(`'${o.title(it, i)}' 항목을 삭제하시겠습니까?`)) return;
        arr.splice(i, 1);
        draw();
        touched();
      } }, "삭제") : null);
    const d = el("details", { class: "card", open: S.open.has(it) }, sum);
    d.addEventListener("toggle", () => {
      if (d.open) {
        S.open.add(it);
        if (!d.querySelector(".card-body")) d.append(el("div", { class: "card-body" }, o.render(it, retitle)));
      } else S.open.delete(it);
    });
    if (d.open) d.append(el("div", { class: "card-body" }, o.render(it, retitle)));
    return d;
  };
  draw();
  return wrap;
}
function multiUpload(label, folder, onFile) {
  return draw => {
    const f = el("input", { type: "file", accept: "image/*", multiple: true, hidden: true });
    f.addEventListener("change", async () => {
      const files = [...f.files];
      f.value = "";
      for (const file of files) { try { onFile(await upload(file, folder), file); } catch {} }
      draw();
      changed();
    });
    return el("span", null, el("button", { class: "btn sm", type: "button", onclick: () => f.click() }, label), f);
  };
}

function parseBg(css) {
  const s = String(css || "").trim();
  const g = s.match(/^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-f]{6})[^,]*,\s*(#[0-9a-f]{6})[^,)]*\)$/i);
  if (g) return { type: "grad", angle: +g[1], c1: g[2], c2: g[3] };
  if (/^#[0-9a-f]{6}$/i.test(s)) return { type: "solid", c1: s, c2: "#7a5fc9", angle: 160 };
  return { type: "preset", c1: "#f6a878", c2: "#7a5fc9", angle: 160 };
}
function bgColorEditor(b) {
  const box = el("div");
  const big = el("div", { class: "bigsw" });
  const css = el("input", { class: "in", type: "text" });
  const st = parseBg(b.color);
  const sws = BG_PRESETS.map(([name, v]) => el("button", { class: "sw", type: "button", title: name, style: `background:${v}`, onclick: () => set(v) }));
  const paint = () => {
    big.style.background = b.color;
    css.value = b.color;
    sws.forEach((s, i) => s.classList.toggle("on", BG_PRESETS[i][1] === b.color));
  };
  const set = v => { b.color = v; paint(); changed(); };
  const build = () => set(st.type === "solid" ? st.c1 : `linear-gradient(${st.angle}deg,${st.c1} 0%,${st.c2} 100%)`);
  const typeSel = el("select", { class: "in", style: "width:auto" }, el("option", { value: "grad" }, "그라데이션"), el("option", { value: "solid" }, "단색"));
  typeSel.value = st.type === "solid" ? "solid" : "grad";
  const c1 = colorInput(st.c1, v => { st.c1 = v; build(); });
  const c2 = colorInput(st.c2, v => { st.c2 = v; build(); });
  const ang = el("input", { type: "range", min: 0, max: 360, value: st.angle });
  const c2wrap = el("span", { class: "colors" }, c2, ang);
  const syncType = () => { c2wrap.style.display = typeSel.value === "solid" ? "none" : ""; };
  typeSel.addEventListener("change", () => { st.type = typeSel.value; syncType(); build(); });
  ang.addEventListener("input", () => { st.angle = +ang.value; build(); });
  css.addEventListener("change", () => set(css.value.trim() || DEFAULT_BG));
  syncType();
  paint();
  box.append(
    big,
    row("추천 색", el("div", { class: "swatches" }, sws)),
    row("직접 만들기", el("div", { class: "colors" }, typeSel, c1, c2wrap), "색 칸을 누르면 스포이드가 있는 색상 선택 창이 열립니다."),
    row("CSS 값", css, "CSS 배경값을 직접 입력할 수도 있습니다. (예: <code>#222</code>, <code>linear-gradient(…)</code>)")
  );
  return box;
}

function appOptions() { return S.data.apps.map(a => [a.id, a.name]); }

const TABS = [
  { id: "profile", label: "기본 정보", open: "profile", render: tabProfile },
  { id: "apps", label: "아이콘", render: tabApps },
  { id: "background", label: "배경화면", open: "wallpaper", render: tabBackground },
  { id: "widgets", label: "위젯", render: tabWidgets },
  { id: "gallery", label: "갤러리", open: "gallery", render: tabGallery, need: () => hasApp("gallery") },
  { id: "calendar", label: "캘린더", open: "calendar", render: tabCalendar, need: () => hasApp("calendar") || hasWidget("calendar") },
  { id: "playlist", label: "노래", open: "music", render: tabPlaylist, need: () => hasApp("music") },
  { id: "trpg", label: "TRPG 백업", open: "trpg", render: () => tabLibrary("trpg"), need: () => hasApp("trpg") },
  { id: "story", label: "썰 백업", open: "story", render: () => tabLibrary("story"), need: () => hasApp("story") },
  { id: "export", label: "내보내기", render: tabExport }
];
function hasApp(id) { return S.data.apps.some(a => a.id === id); }
function hasWidget(t) { return S.data.widgets.some(w => w.type === t); }
function visibleTabs() { return TABS.filter(t => !t.need || t.need()); }
function head(title, lead) { return [el("h2", null, title), lead ? el("p", { class: "lead", html: lead }) : null]; }

function tabProfile() {
  const p = S.data.profile;
  return [
    ...head("기본 정보", "왼쪽 위 홈 메뉴의 <b>프로필</b> 창과 브라우저 탭 제목에 사용됩니다."),
    text(p, "siteTitle", "사이트 제목", { placeholder: "My Desktop" }),
    text(p, "name", "이름"),
    text(p, "bio", "소개", { long: true }),
    imageField(p, "avatar", "프로필 사진"),
    el("h3", null, "링크"),
    listEditor(p.links, {
      title: (l, i) => l.label || `링크 ${i + 1}`,
      make: () => ({ label: "", url: "https://" }),
      addLabel: "+ 링크 추가",
      render: (l, rt) => [text(l, "label", "이름", { onInput: rt }), text(l, "url", "주소", { placeholder: "https://…" })]
    })
  ];
}
function addMissing(defs, arr, key, make) {
  return draw => {
    const miss = defs.filter(([id]) => !arr.some(x => x[key] === id));
    if (!miss.length) return el("span", { class: "sub" }, "모든 항목이 추가된 상태입니다.");
    return el("span", { class: "add-row" }, miss.map(([id, name]) => el("button", {
      class: "btn sm", type: "button",
      onclick: () => { const n = make(id, name); arr.push(n); S.open.add(n); draw(); changed(); renderTabs(); }
    }, "+ " + name)));
  };
}
function tabApps() {
  return [
    ...head("아이콘", "바탕화면과 하단 Dock에 같은 아이콘이 표시됩니다. 필요 없는 아이콘은 삭제하고, 빠진 아이콘은 아래 버튼으로 다시 추가해주세요. 이미지를 비워두면 회색 기본 아이콘으로 보입니다."),
    listEditor(S.data.apps, {
      title: a => a.name || a.id,
      sub: a => (APP_DEFS.find(x => x[0] === a.id) || [])[1],
      add: false,
      onChange: renderTabs,
      extra: addMissing(APP_DEFS, S.data.apps, "id", (id, name) => ({ id, name, icon: "" })),
      render: (a, rt) => [text(a, "name", "이름", { onInput: rt }), imageField(a, "icon", "아이콘 이미지", { folder: "images/icons", hint: "정사각형 이미지를 추천합니다." })]
    }),
    el("h3", null, "메뉴바"),
    check(S.data.dock, "enabled", "메뉴바", "메뉴바 사용"),
    check(S.data.dock, "pinned", "항상 표시", "메뉴바 화면에 고정하기", "메뉴바는 화면 하단에 마우스를 가져다 대면 볼 수 있어요. 항상 표시를 ON 하면 화면에 고정됩니다.")
  ];
}
function tabBackground() {
  const b = S.data.background;
  return [
    ...head("배경화면", "방문자는 <b>여기 등록한 이미지 중 하나를 고르거나 슬라이드쇼를 켜고 끄는 것</b>만 할 수 있습니다. 기본 배경색은 방문자가 바꿀 수 없습니다."),
    el("h3", null, "기본 배경색"),
    bgColorEditor(b),
    el("p", { class: "sub" }, "이미지가 없거나 이미지를 불러오는 동안 보이는 색입니다."),
    el("h3", null, "배경 이미지"),
    listEditor(b.images, {
      title: (w, i) => w.name || `배경 ${i + 1}`,
      make: () => ({ name: "", src: "" }),
      addLabel: "+ 한 장 추가",
      extra: multiUpload("이미지 여러 장 올리기", "images/wallpapers", (src, f) => b.images.push({ name: stemOf(f.name), src })),
      render: (w, rt) => [text(w, "name", "이름", { onInput: rt }), imageField(w, "src", "이미지", { folder: "images/wallpapers" })]
    }),
    el("h3", null, "전환 설정"),
    select(b, "mode", "처음 방문 시", [["slideshow", "슬라이드쇼 (순서대로 페이드 전환)"], ["image", "첫 번째 이미지로 고정"]], "방문자가 직접 바꾸면 그 브라우저에 선택이 저장됩니다."),
    text(b, "interval", "전환 간격(초)", { type: "number", min: 3, max: 600, step: 1 }),
    text(b, "fade", "페이드 시간(초)", { type: "number", min: 0, max: 10, step: 0.5, hint: "0으로 두면 바로 바뀝니다. 슬라이드쇼는 이미지가 2장 이상일 때 동작합니다." })
  ];
}
function tabWidgets() {
  const opts = [["", "아무것도 열지 않음"], ...appOptions()];
  const wname = t => (WIDGET_DEFS.find(x => x[0] === t) || [])[1] || t;
  return [
    ...head("위젯", "바탕화면 왼쪽 위에 표시됩니다. 필요 없는 위젯은 삭제하고, 빠진 위젯은 아래 버튼으로 다시 추가해주세요."),
    listEditor(S.data.widgets, {
      title: w => wname(w.type),
      add: false,
      onChange: renderTabs,
      extra: addMissing(WIDGET_DEFS, S.data.widgets, "type", id => id === "photo" ? { type: id, src: "", caption: "", open: hasApp("gallery") ? "gallery" : "" } : { type: id, open: hasApp("calendar") ? "calendar" : "" }),
      render: w => w.type === "photo" ? [
        imageField(w, "src", "그림"),
        text(w, "caption", "캡션"),
        select(w, "open", "누르면", opts)
      ] : [
        check(w, "glass", "배경 투과", "배경 투과 ON", "ON 하면 위젯이 반투명해지고 뒤의 배경화면이 흐리게 비쳐 보입니다."),
        select(w, "open", "누르면", opts, "오늘 날짜와 <b>캘린더</b> 탭에 등록한 오늘 일정이 표시됩니다. 강조색은 캘린더 탭에서 바꿀 수 있습니다.")
      ]
    })
  ];
}
function tabGallery() {
  const g = S.data.gallery;
  return [
    ...head("갤러리"),
    listEditor(g, {
      title: (it, i) => it.title || `그림 ${i + 1}`,
      sub: it => it.date || "",
      make: () => ({ src: "", title: "", desc: "", date: new Date().toISOString().slice(0, 10) }),
      addLabel: "+ 한 장 추가",
      extra: multiUpload("이미지 여러 장 올리기", "images/gallery", (src, f) => g.push({ src, title: stemOf(f.name), desc: "", date: new Date().toISOString().slice(0, 10) })),
      render: (it, rt) => [imageField(it, "src", "이미지", { folder: "images/gallery" }), text(it, "title", "제목", { onInput: rt }), text(it, "desc", "설명", { long: true }), text(it, "date", "날짜", { type: "date", onInput: rt })]
    })
  ];
}
function tabCalendar() {
  return [
    ...head("캘린더", "여기서 바꾼 내용은 캘린더 앱과 캘린더 위젯에 함께 적용됩니다."),
    row("강조색", el("div", { class: "colors" },
      colorInput(S.data.calendarAccent, v => { S.data.calendarAccent = v; changed(); }),
      el("button", { class: "btn sm", type: "button", onclick: () => { S.data.calendarAccent = DEFAULT_ACCENT; renderPanel(); changed(); } }, "기본색")),
      "오늘 날짜 표시와 요일·월 글자에 쓰이는 색입니다."),
    el("h3", null, "일정"),
    listEditor(S.data.calendar, {
      title: (e, i) => e.title || `일정 ${i + 1}`,
      sub: e => [e.date, e.time].filter(Boolean).join(" "),
      make: () => ({ date: new Date().toISOString().slice(0, 10), time: "", title: "", color: "#5b8cff", memo: "" }),
      addLabel: "+ 일정 추가",
      render: (e, rt) => [
        text(e, "title", "제목", { onInput: rt }),
        text(e, "date", "날짜", { type: "date", onInput: rt }),
        text(e, "time", "시간", { type: "time", onInput: rt }),
        row("색", el("div", { class: "colors" }, colorInput(e.color, v => { e.color = v; changed(); }))),
        text(e, "memo", "메모", { long: true })
      ]
    })
  ];
}
function tabPlaylist() {
  return [
    ...head("노래", "mp3 같은 음원 파일을 올리거나, 음원 주소 또는 유튜브 링크를 입력해주세요."),
    listEditor(S.data.playlist, {
      title: (t, i) => t.title || `노래 ${i + 1}`,
      sub: t => t.artist || "",
      make: () => ({ title: "", artist: "", cover: "", src: "" }),
      addLabel: "+ 노래 추가",
      render: (t, rt) => [
        text(t, "title", "제목", { onInput: rt }),
        text(t, "artist", "아티스트", { onInput: rt }),
        imageField(t, "cover", "커버", { folder: "images/covers" }),
        fileField(t, "src", "음원", { accept: "audio/*", folder: "music", placeholder: "music/노래.mp3 · https://… · 유튜브 링크", button: "음원 올리기" })
      ]
    })
  ];
}
function logField(it, kind) {
  const trpg = kind === "trpg";
  const info = el("span", { class: "sub" });
  const count = () => {
    if (!it.log) { info.textContent = ""; return; }
    const pre = dirOf(it.log) + stemOf(it.log) + "_files/";
    const n = [...S.assets.keys()].filter(k => k.startsWith(pre)).length;
    const here = S.assets.has(it.log);
    info.textContent = (here ? "업로드됨" : "파일 없음 · 다시 업로드해주세요") + (n ? ` · 이미지 ${n}개` : "");
  };
  const imgs = el("input", { type: "file", accept: "image/*", multiple: true, hidden: true });
  const dir = el("input", { type: "file", multiple: true, hidden: true, webkitdirectory: true });
  const addImgs = async files => {
    if (!it.log) { toast("HTML 파일을 먼저 업로드해주세요.", true); return; }
    const pre = dirOf(it.log) + stemOf(it.log) + "_files/";
    let n = 0;
    for (const f of files) {
      if (!/^image\//.test(f.type) && !/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(f.name) && !/^[^.]+$/.test(f.name)) continue;
      await putLocal(pre + safeName(f.name), f);
      n++;
    }
    toast(`이미지 ${n}개를 업로드했습니다.`);
    count();
    changed();
  };
  imgs.addEventListener("change", () => { const f = [...imgs.files]; imgs.value = ""; addImgs(f); });
  dir.addEventListener("change", () => { const f = [...dir.files]; dir.value = ""; addImgs(f); });
  const f = fileField(it, "log", trpg ? "로그 파일" : "HTML 파일", {
    accept: ".html,.htm,text/html",
    folder: "logs",
    local: true,
    button: "HTML 업로드",
    placeholder: trpg ? "logs/세션.html" : "logs/썰.html",
    onInput: count,
    hint: trpg
      ? "Roll20 Chat Archive <b>[Show on One Page]</b>에서 저장한 HTML을 업로드해주세요."
      : "HTML 파일은 이곳에 업로드해주세요.<br>TXT의 경우 <b>본문 / 요약</b>란에 기입해주세요."
  });
  count();
  return [
    f,
    row("이미지", el("div", { class: "filef" },
      el("button", { class: "btn sm", type: "button", onclick: () => imgs.click() }, "이미지 선택"),
      el("button", { class: "btn sm", type: "button", onclick: () => dir.click() }, "_files 폴더 선택"),
      imgs, dir, info),
      "HTML과 함께 저장된 <code>_files</code> 폴더 안의 이미지를 업로드해주세요."),
    text(it, "logAssets", "이미지 폴더", { placeholder: "비워두면 자동", hint: "이미지를 다른 폴더에 따로 올려둔 경우에만 그 폴더 경로를 적어주세요." })
  ];
}
function tabLibrary(kind) {
  const trpg = kind === "trpg";
  return [
    ...head(trpg ? "TRPG 백업" : "썰 백업", trpg
      ? "세션 로그 HTML을 업로드하거나 본문에 직접 기록해주세요. 둘 다 입력하면 본문이 로그 위에 요약으로 표시됩니다."
      : "썰을 HTML 파일로 업로드하거나 본문에 직접 옮겨 적어주세요. 둘 다 입력하면 본문이 HTML 내용 위에 표시됩니다."),
    listEditor(S.data[kind], {
      title: (it, i) => ((it.lock && it.lock.on) || it.locked ? "🔒 " : "") + (it.title || `${trpg ? "세션" : "썰"} ${i + 1}`),
      sub: it => [trpg ? it.system : "", it.date].filter(Boolean).join(" · "),
      make: () => trpg
        ? { title: "", system: "", date: new Date().toISOString().slice(0, 10), gm: "", players: [], tags: [], cover: "", link: "", log: "", logAssets: "", content: "" }
        : { title: "", date: new Date().toISOString().slice(0, 10), tags: [], cover: "", link: "", log: "", logAssets: "", content: "" },
      addLabel: trpg ? "+ 세션 추가" : "+ 썰 추가",
      render: (it, rt) => it.locked && it.enc ? [
        text(it, "date", "날짜", { type: "date", onInput: rt }),
        ...lockSection(it, rt)
      ] : [
        text(it, "title", "제목", { onInput: rt }),
        trpg ? text(it, "system", "룰", { placeholder: "CoC 7판", onInput: rt }) : null,
        text(it, "date", "날짜", { type: "date", onInput: rt }),
        trpg ? text(it, "gm", "GM / KP") : null,
        trpg ? text(it, "players", "PL", { list: true, placeholder: "쉼표로 구분" }) : null,
        text(it, "tags", "태그", { list: true, placeholder: "쉼표로 구분" }),
        imageField(it, "cover", "커버 이미지", { folder: "images/covers" }),
        text(it, "link", "외부 링크", { placeholder: "https://…" }),
        ...logField(it, kind),
        text(it, "content", "본문 / 요약", { long: true, placeholder: trpg ? "세션 요약이나 후기" : "썰 본문" }),
        ...lockSection(it, rt)
      ]
    })
  ];
}

function collectStrings(o, out = new Set()) {
  if (typeof o === "string") out.add(o.replace(/^\.\//, ""));
  else if (Array.isArray(o)) o.forEach(v => collectStrings(v, out));
  else if (o && typeof o === "object") Object.values(o).forEach(v => collectStrings(v, out));
  return out;
}
function usedAssets(data = S.data, hiddenLogs = [], hiddenDirs = []) {
  const strs = collectStrings(data);
  const logs = [...strs].filter(s => /\.html?$/i.test(s)).concat(hiddenLogs);
  const dirs = hiddenDirs.slice();
  [...(data.trpg || []), ...(data.story || [])].forEach(it => { if (it.logAssets) dirs.push(String(it.logAssets)); });
  const pre = dirs.filter(Boolean).map(d => d.replace(/\/?$/, "/"));
  return [...S.assets.keys()].filter(p => strs.has(p)
    || logs.some(l => p.startsWith(dirOf(l) + stemOf(l) + "_files/"))
    || pre.some(x => p.startsWith(x)));
}
function buildDataJs(data) {
  return "/*\n  data.js — My Desktop 편집기에서 만든 파일입니다.\n  편집기의 [사이트 불러오기]로 이 zip을 올리면 이어서 편집할 수 있습니다.\n*/\nwindow.SITE_DATA = " + JSON.stringify(data, null, 2) + ";\n";
}

const ITER = 600000;
const LOCK_META = ["title", "system", "gm", "players", "tags", "cover"];
const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(String(s || "")), c => c.charCodeAt(0));
const randId = () => b64(crypto.getRandomValues(new Uint8Array(9))).replace(/\+/g, "-").replace(/\//g, "_");
const lockErr = code => Object.assign(new Error(code), { code });
async function deriveKey(pw, salt, iter, use) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, use);
}
async function encryptPayload(obj, pw) {
  let bytes = new TextEncoder().encode(JSON.stringify(obj));
  let z = "";
  if (window.CompressionStream) {
    bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
    z = "gzip";
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt, ITER, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
  return { bytes: ct, enc: { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), z } };
}
async function decryptEnc(enc, pw) {
  let buf;
  const local = S.assets.get(enc.file);
  if (local) buf = await local.blob.arrayBuffer();
  else {
    const r = await fetch(BASE + enc.file, { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) throw lockErr("file");
    buf = await r.arrayBuffer();
  }
  const key = await deriveKey(pw, b64d(enc.salt), +enc.iter || ITER, ["decrypt"]);
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(enc.iv) }, key, buf); } catch { throw lockErr("pw"); }
  if (enc.z === "gzip") plain = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(plain));
}
function extractChat(txt) {
  const doc = new DOMParser().parseFromString(String(txt || ""), "text/html");
  const root = doc.querySelector("#textchat .content") || doc.querySelector("#textchat") || doc.querySelector("body > .content") || doc.body;
  root.querySelectorAll("script,style,link,meta,base,iframe,frame,object,embed").forEach(n => n.remove());
  return '<div class="content">' + root.innerHTML + "</div>";
}
function hasLocks() {
  return [...S.data.trpg, ...S.data.story].some(it => it.lock && it.lock.on);
}
async function buildExport() {
  const data = clone(S.data);
  const files = [], hiddenLogs = [], hiddenDirs = [], serverPlain = [];
  let idsAdded = false;
  for (const kind of ["trpg", "story"]) {
    for (let i = 0; i < data[kind].length; i++) {
      const src = S.data[kind][i];
      const L = src.lock;
      if (L && L.on) {
        const name = src.title || "제목 없음";
        if (!L.password) throw new Error(`'${name}'의 비밀번호를 입력해주세요`);
        if (!L.id) { L.id = randId(); idsAdded = true; }
        let html = "";
        if (src.log) {
          const a = S.assets.get(src.log);
          let txt;
          if (a) txt = await a.blob.text();
          else {
            throw new Error(`'${name}'을 잠그려면 로그 HTML 파일을 이 편집기에 올려야 한다 (${src.log})`);
          }
          html = extractChat(txt);
          hiddenLogs.push(src.log);
        }
        if (src.logAssets) hiddenDirs.push(src.logAssets);
        const payload = { v: 1, content: src.content || "", link: src.link || "", html, logPath: src.log || "", logAssets: src.logAssets || "" };
        const pub = { date: src.date || "", locked: true };
        if (L.hint) pub.hint = L.hint;
        const meta = {};
        LOCK_META.forEach(k => { if (src[k] !== undefined) meta[k] = clone(src[k]); });
        if (L.hideInfo) payload.meta = meta; else Object.assign(pub, meta);
        const { bytes, enc } = await encryptPayload(payload, L.password);
        enc.file = `logs/locked/${L.id}.dat`;
        pub.enc = enc;
        files.push({ path: enc.file, bytes });
        data[kind][i] = pub;
      } else {
        delete data[kind][i].lock;
      }
    }
  }
  if (idsAdded) changed({ preview: false });
  return { data, files, hiddenLogs, hiddenDirs, serverPlain };
}
function download(blob, name) {
  const a = el("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function loadScript(src) {
  return new Promise((ok, no) => {
    if ([...document.scripts].some(s => s.src === src)) return ok();
    const s = el("script", { src });
    s.onload = ok;
    s.onerror = () => no(new Error("load failed"));
    document.head.append(s);
  });
}
async function exportZip(btn) {
  if (btn) btn.disabled = true;
  try {
    toast(hasLocks() ? "잠긴 기록을 암호화하고 zip을 만드는 중…" : "zip 만드는 중…");
    await loadScript(JSZIP);
    const ex = await buildExport();
    const zip = new window.JSZip();
    for (const f of SITE_FILES) {
      const r = await fetch(BASE + f, { cache: "no-store" });
      if (!r.ok) throw new Error(f + " 파일을 읽지 못했습니다");
      zip.file(f, await r.blob());
    }
    zip.file("data.js", buildDataJs(ex.data));
    ex.files.forEach(f => zip.file(f.path, f.bytes));
    const used = usedAssets(ex.data, ex.hiddenLogs, ex.hiddenDirs).filter(p => !ex.hiddenLogs.includes(p));
    used.forEach(p => zip.file(p, S.assets.get(p).blob));
    const blob = await zip.generateAsync({ type: "blob" });
    download(blob, "my-desktop.zip");
    toast(`zip을 내보냈습니다. (사이트 파일 ${SITE_FILES.length + 1}개 + 올린 파일 ${used.length}개${ex.files.length ? ` + 잠긴 기록 ${ex.files.length}개` : ""}) 원본 로그를 NARU에 올려둔 적이 있다면 삭제해주세요.`);
  } catch (e) {
    toast("내보내기 실패: " + (e.message || e), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}
function downloadDataJs() {
  if (hasLocks()) {
    toast("잠긴 기록이 있을 때는 [사이트 내보내기 (zip)]를 이용해주세요.", true);
    return;
  }
  const data = clone(S.data);
  ["trpg", "story"].forEach(k => data[k].forEach(it => { delete it.lock; }));
  download(new Blob([buildDataJs(data)], { type: "text/javascript" }), "data.js");
}
async function unlockForEdit(it, pw) {
  const p = await decryptEnc(it.enc, pw);
  const id = String(it.enc.file).split("/").pop().replace(/\.dat$/, "");
  Object.assign(it, clone(p.meta || {}));
  it.content = p.content || "";
  it.link = p.link || "";
  it.logAssets = p.logAssets || "";
  if (p.html) {
    const path = p.logPath || `logs/${id}.html`;
    await putLocal(path, new File([p.html], path.split("/").pop(), { type: "text/html" }));
    it.log = path;
  } else it.log = "";
  it.lock = { on: true, password: pw, hint: it.hint || "", hideInfo: !!p.meta, id };
  delete it.enc;
  delete it.locked;
  delete it.hint;
}
function lockSection(it, retitle) {
  if (it.locked && it.enc) {
    const pw = el("input", { class: "in", type: "password", placeholder: "비밀번호", autocomplete: "off" });
    const go = el("button", { class: "btn sm", type: "button" }, "풀어서 편집");
    go.addEventListener("click", async () => {
      if (!pw.value) { toast("비밀번호를 입력해주세요.", true); return; }
      go.disabled = true;
      try {
        await unlockForEdit(it, pw.value);
        toast("잠금을 해제했습니다. 내보낼 때 같은 비밀번호로 다시 암호화됩니다.");
        renderPanel();
        changed({ now: true });
      } catch (e) {
        go.disabled = false;
        toast(e.code === "pw" ? "비밀번호가 일치하지 않습니다." : e.code === "file" ? "잠긴 기록 파일을 찾지 못했습니다." : "열지 못했습니다: " + (e.message || e), true);
      }
    });
    return [
      el("h3", null, "비밀번호 잠금"),
      el("div", { class: "note warn", html: "이미 암호화된 기록입니다. 내용을 수정하려면 비밀번호로 잠금을 먼저 해제해주세요. 그대로 두면 현재 상태가 유지됩니다." }),
      row("비밀번호", el("div", { class: "filef" }, pw, go))
    ];
  }
  const L = it.lock || (it.lock = { on: false, password: "", hint: "", hideInfo: false });
  const pw = el("input", { class: "in", type: "password", value: L.password || "", placeholder: "비밀번호", autocomplete: "new-password" });
  pw.addEventListener("input", () => { L.password = pw.value; changed(); });
  const eye = el("button", { class: "btn sm", type: "button", onclick: () => { pw.type = pw.type === "password" ? "text" : "password"; eye.textContent = pw.type === "password" ? "보기" : "숨기기"; } }, "보기");
  const onWrap = check(L, "on", "잠그기", "이 기록을 비밀번호로 잠그기");
  onWrap.querySelector("input").addEventListener("change", () => { if (retitle) retitle(); });
  return [
    el("h3", null, "비밀번호 잠금"),
    onWrap,
    row("비밀번호", el("div", { class: "filef" }, pw, eye), "영문과 숫자를 섞어 6자 이상으로 정해주세요."),
    text(L, "hint", "힌트", { placeholder: "선택 · 방문자에게 표시됩니다" }),
    check(L, "hideInfo", "목록 정보", "제목·태그·커버도 숨기기 (날짜만 표시)"),
    el("div", { class: "note warn", html: "<b>비밀번호를 잊으면 복구할 수 없습니다.</b><br>내보낼 때 본문·외부 링크·로그가 암호화되고, 원본 로그 HTML은 포함되지 않으며, 로그 속 이미지(<code>_files</code>)는 암호화되지 않습니다." })
  ];
}
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp", mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", wav: "audio/wav", flac: "audio/flac", html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", json: "application/json", txt: "text/plain" };
function parseDataJs(text) {
  const w = {};
  new Function("window", String(text))(w);
  if (!w.SITE_DATA || typeof w.SITE_DATA !== "object") throw new Error("data.js 안에서 SITE_DATA를 찾지 못했습니다");
  return w.SITE_DATA;
}
function importSite(file) {
  if (/\.zip$/i.test(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed") importZip(file);
  else importDataJs(file);
}
async function importZip(file) {
  try {
    toast("zip을 여는 중…");
    await loadScript(JSZIP);
    const zip = await window.JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter(f => !f.dir && !/(^|\/)(__MACOSX|\.DS_Store)/.test(f.name));
    const dataEntry = entries.filter(f => /(^|\/)data\.js$/i.test(f.name)).sort((a, b) => a.name.length - b.name.length)[0];
    if (!dataEntry) throw new Error("zip 안에 data.js가 없습니다");
    const prefix = dataEntry.name.slice(0, dataEntry.name.length - "data.js".length);
    const data = parseDataJs(await dataEntry.async("string"));
    const skip = new Set([...SITE_FILES, "data.js"].map(n => prefix + n));
    const files = entries.filter(f => f.name.startsWith(prefix) && !skip.has(f.name) && !f.name.startsWith(prefix + "editor/"));
    if (!confirm(`'${file.name}'을(를) 불러오시겠습니까?\n현재 편집 중인 내용은 이 사이트 내용으로 바뀌고, 파일 ${files.length}개를 함께 불러옵니다.`)) return;
    for (const f of files) {
      const rel = f.name.slice(prefix.length);
      const ext = (rel.split(".").pop() || "").toLowerCase();
      const blob = await f.async("blob");
      await putLocal(rel, new File([blob], rel.split("/").pop(), { type: MIME[ext] || "application/octet-stream" }));
    }
    S.data = normalize(data);
    S.open = new WeakSet();
    renderPanel();
    changed({ now: true });
    toast(`사이트를 불러왔습니다. (파일 ${files.length}개)`);
  } catch (e) {
    toast("불러오기 실패: " + (e.message || e), true);
  }
}
function importDataJs(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const w = {};
      new Function("window", String(r.result))(w);
      if (!w.SITE_DATA || typeof w.SITE_DATA !== "object") throw new Error("SITE_DATA를 찾지 못했습니다");
      if (!confirm("현재 편집 중인 내용을 불러온 data.js로 바꾸시겠습니까? (업로드한 파일은 유지됩니다)")) return;
      S.data = normalize(w.SITE_DATA);
      S.open = new WeakSet();
      renderPanel();
      changed({ now: true });
      toast("data.js를 불러왔습니다.");
    } catch (e) {
      toast("data.js 읽기 실패: " + (e.message || e), true);
    }
  };
  r.readAsText(file);
}

function tabExport() {
  const used = new Set(usedAssets(S.data));
  const all = [...S.assets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const unused = all.filter(([p]) => !used.has(p));
  const exp = el("button", { class: "btn primary", type: "button", onclick: e => exportZip(e.currentTarget) }, "사이트 내보내기 (zip)");
  return [
    ...head("내보내기"),
    el("div", { class: "note", html: `<b>NARU에 올리는 방법</b><ol>
      <li><b>사이트 내보내기 (zip)</b>을 눌러 파일을 받아주세요.</li>
      <li>압축을 풀면 <code>index.html</code> <code>style.css</code> <code>app.js</code> <code>data.js</code>와 올린 파일 폴더(<code>images/</code> <code>logs/</code> 등)가 들어 있습니다.</li>
      <li>NARU 사이트 폴더에 <b>폴더 구조 그대로</b> 올려주세요. 같은 이름의 파일은 덮어쓰면 됩니다.</li>
      <li>나중에 이어서 고치려면 이 편집기에서 <b>사이트 불러오기</b>로 받아둔 zip을 다시 올려주세요. <b>zip 파일은 꼭 보관해주세요.</b></li></ol>` }),
    el("div", { class: "btns" },
      exp,
      el("button", { class: "btn", type: "button", onclick: downloadDataJs }, "data.js만 받기"),
      el("button", { class: "btn", type: "button", onclick: () => $("#importFile").click() }, "내보낸 사이트 불러오기 (zip · data.js)"),
      el("button", { class: "btn danger", type: "button", onclick: resetAll }, "처음 템플릿으로 되돌리기")),
    el("h3", null, `이 브라우저에 저장된 파일 (${all.length}개)`),
    all.length
      ? el("ul", { class: "files" }, all.map(([p, a]) => el("li", { class: used.has(p) ? "" : "unused", title: used.has(p) ? "" : "지금 쓰이지 않는 파일" }, el("span", null, p), el("span", { class: "sub" }, fmtSize(a.blob.size)))))
      : el("p", { class: "sub" }, "업로드한 파일이 없습니다."),
    unused.length ? el("div", { class: "btns" }, el("button", { class: "btn sm", type: "button", onclick: async () => {
      if (!confirm(`쓰이지 않는 파일 ${unused.length}개를 삭제하시겠습니까?`)) return;
      for (const [p] of unused) await removeLocal(p);
      renderPanel();
      toast("정리했습니다.");
    } }, `안 쓰는 파일 ${unused.length}개 정리`)) : null,
    el("p", { class: "sub" }, "편집 내용과 올린 파일은 이 브라우저에만 자동 저장됩니다. 다른 기기에서 편집하려면 내보낸 zip을 그 기기의 편집기에서 [사이트 불러오기]로 올려주세요.")
  ];
}
async function resetAll() {
  if (!confirm("편집 중인 내용을 지우고 처음 템플릿으로 되돌리시겠습니까? 필요하면 먼저 [사이트 내보내기]로 zip을 받아두세요.")) return;
  try {
    const r = await fetch(BASE + "data.js", { cache: "no-store" });
    const w = {};
    new Function("window", await r.text())(w);
    S.data = normalize(w.SITE_DATA || {});
  } catch {
    S.data = normalize(window.SITE_DATA || {});
  }
  S.open = new WeakSet();
  renderPanel();
  changed({ now: true });
  toast("처음 템플릿으로 되돌렸습니다.");
}

function renderTabs() {
  const vis = visibleTabs();
  if (!vis.some(t => t.id === S.tab)) { S.tab = "profile"; renderPanel(); }
  $("#tabs").replaceChildren(...vis.map(t => el("button", {
    type: "button", role: "tab", class: t.id === S.tab ? "on" : "", "aria-selected": t.id === S.tab ? "true" : "false",
    onclick: () => selectTab(t.id)
  }, t.label)));
}
function renderPanel() {
  const t = TABS.find(x => x.id === S.tab) || TABS[0];
  const p = $("#panel");
  const top = p.scrollTop;
  p.replaceChildren(...t.render().flat().filter(Boolean));
  p.scrollTop = top;
}
function selectTab(id) {
  if (S.tab === id) return;
  S.tab = id;
  renderTabs();
  $("#panel").scrollTop = 0;
  renderPanel();
  clearTimeout(pvT);
  pushPreview();
}

function checkPreview() {
  const f = $("#pv");
  try {
    const d = f.contentDocument;
    if (!d || d.location.href === "about:blank") return;
    if (!d.getElementById("desktopIcons")) {
      toast("미리보기를 불러오지 못했습니다. site/index.html 파일을 확인해주세요.", true);
    }
  } catch {}
}

async function boot() {
  let nested = false;
  try { nested = window.parent !== window && !!window.parent.MH_PREVIEW; } catch {}
  if (nested) {
    document.body.replaceChildren(el("p", { style: "margin:24px;font:14px/1.6 sans-serif;color:#555" },
      "미리보기를 불러오지 못했습니다. site/index.html 파일을 확인해주세요."));
    return;
  }
  $("#pv").addEventListener("load", checkPreview);
  let saved = null;
  try { saved = await idb.get("kv", "data"); } catch {}
  let site = null;
  if (!saved) {
    try {
      const r = await fetch(BASE + "data.js", { cache: "no-store" });
      if (r.ok) site = parseDataJs(await r.text());
    } catch {}
  }
  S.data = normalize(saved || site || {});
  try {
    for (const [k, v] of await idb.entries("assets")) S.assets.set(k, { blob: v, url: URL.createObjectURL(v) });
  } catch {}

  renderTabs();
  renderPanel();
  $("#saveState").textContent = saved ? "✓ 이전 편집 내용을 불러왔습니다" : site ? "✓ 기본 템플릿" : "템플릿(site/data.js)을 찾지 못했습니다";

  $$(".seg button").forEach(b => b.addEventListener("click", () => {
    S.dev = b.dataset.dev;
    $$(".seg button").forEach(x => x.classList.toggle("on", x === b));
    layoutPreview();
  }));
  $("#btnReload").addEventListener("click", pushPreview);
  $("#btnExport").addEventListener("click", e => exportZip(e.currentTarget));
  $("#btnImport").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) importSite(f); });
  if (window.ResizeObserver) new ResizeObserver(layoutPreview).observe($("#pvBody"));
  window.addEventListener("resize", layoutPreview);
  layoutPreview();
  pushPreview();
  if (location.protocol === "file:") toast("파일을 직접 열면 미리보기가 동작하지 않습니다. Netlify 등에 올린 주소로 열어주세요.", true);
}
boot();
})();
