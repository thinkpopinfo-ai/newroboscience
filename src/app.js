// newroboscience — orbital signal map, filters, reading progress, live clock
(() => {
  const clock = document.getElementById("utc");
  let fmt;
  try { fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }); } catch (e) { fmt = null; }
  const tick = () => { if (clock) clock.textContent = fmt ? fmt.format(new Date()) : new Date().toLocaleTimeString(); };
  tick(); setInterval(tick, 1000);

  // Reading progress
  const bar = document.getElementById("bar");
  if (bar) {
    const upd = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
    };
    addEventListener("scroll", upd, { passive: true }); upd();
  }

  // Copy link
  document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied!"; } catch { b.textContent = b.dataset.copy; }
  }));

  // Field filters
  const filters = document.querySelectorAll("[data-filter]");
  filters.forEach(btn => btn.addEventListener("click", () => {
    const f = btn.dataset.filter;
    filters.forEach(b => b.classList.toggle("on", b === btn && f !== "all"));
    document.querySelectorAll("#log .card").forEach(c => c.classList.toggle("hide", f !== "all" && c.dataset.field !== f));
    document.getElementById("log").scrollIntoView({ behavior: "smooth" });
  }));

  // Orbital signal map: every post is a satellite on its field's orbit
  const cv = document.getElementById("orbits");
  if (!cv || !window.ORBIT) return;
  const ctx = cv.getContext("2d"), tip = document.getElementById("orbit-tip");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, dpr, cx, cy, base, mouse = { x: -1, y: -1 }, hover = null;
  const stars = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3, p: Math.random() * 6 }));
  const byOrbit = {};
  ORBIT.forEach(s => (byOrbit[s.o] = byOrbit[s.o] || []).push(s));
  const sats = ORBIT.map(s => {
    const peers = byOrbit[s.o], i = peers.indexOf(s);
    return { ...s, a0: (i / peers.length) * Math.PI * 2 + s.o * 1.7, speed: 0.00012 / s.o + 0.00004, x: 0, y: 0 };
  });

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W > 820;
    cx = wide ? W * 0.72 : W * 0.5; cy = wide ? H * 0.5 : H * 0.36;
    base = Math.min(wide ? W * 0.13 : W * 0.16, H * 0.17);
  }
  size(); addEventListener("resize", size);

  const ring = o => ({ rx: base * (0.9 + o * 0.85), ry: base * (0.9 + o * 0.85) * 0.42, rot: -0.35 + o * 0.12 });
  function pos(rg, a) {
    const x = rg.rx * Math.cos(a), y = rg.ry * Math.sin(a), c = Math.cos(rg.rot), s = Math.sin(rg.rot);
    return [cx + x * c - y * s, cy + x * s + y * c];
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t / 900 + s.p);
      ctx.fillStyle = "#cfe0ff"; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // core
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.8);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.15, "#9fdcff"); g.addColorStop(0.5, "#2a5aa055"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, base * 0.8, 0, 7); ctx.fill();
    // rings
    const cols = { 1: "#ffb547", 2: "#5cd3ff", 3: "#79f2b0" };
    [1, 2, 3].forEach(o => {
      const rg = ring(o);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rg.rot);
      ctx.strokeStyle = cols[o] + "40"; ctx.setLineDash([2, 6]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, rg.rx, rg.ry, 0, 0, 7); ctx.stroke(); ctx.restore();
    });
    ctx.setLineDash([]);
    hover = null;
    sats.forEach(s => {
      const a = s.a0 + (reduce ? 0 : t * s.speed);
      [s.x, s.y] = pos(ring(s.o), a);
      const d = Math.hypot(mouse.x - s.x, mouse.y - s.y);
      if (d < 18) hover = s;
    });
    sats.forEach(s => {
      const on = hover === s, r = on ? 9 : 5.5;
      ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = on ? 30 : 16;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      // pulse ring
      const p = ((t / 1600 + s.a0) % 1);
      ctx.strokeStyle = s.c; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(s.x, s.y, r + p * 22, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      if (on) { ctx.strokeStyle = s.c + "88"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(s.x, s.y); ctx.stroke(); }
    });
    cv.style.cursor = hover ? "pointer" : "default";
    if (hover) {
      tip.innerHTML = `<b style="color:${hover.c}">${hover.tx}</b>${hover.t.replace(/</g, "&lt;")}`;
      tip.style.left = Math.min(hover.x + 16, W - 290) + "px"; tip.style.top = (hover.y + 16) + "px"; tip.style.opacity = 1;
    } else tip.style.opacity = 0;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const hero = cv.parentElement;
  hero.addEventListener("mousemove", e => { const r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  hero.addEventListener("mouseleave", () => (mouse = { x: -1, y: -1 }));
  hero.addEventListener("click", e => { if (hover && !e.target.closest("a")) location.href = hover.u; });
  // touch: tap a satellite
  hero.addEventListener("touchstart", e => { const r = cv.getBoundingClientRect(), t = e.touches[0]; mouse = { x: t.clientX - r.left, y: t.clientY - r.top }; }, { passive: true });
})();

// Live Research Radar: fresh papers from OpenAlex, fetched in the visitor's browser
(() => {
  const box = document.getElementById("radar");
  if (!box) return;
  const Q = {
    robotics: "robot OR robotics OR \"robotic manipulation\"",
    aerospace: "rocket OR spacecraft OR aerospace OR satellite OR hypersonic",
    biotech: "CRISPR OR \"gene therapy\" OR biotechnology OR \"synthetic biology\"",
  };
  const COL = { robotics: "#ffb547", aerospace: "#5cd3ff", biotech: "#79f2b0" };
  const mini = box.dataset.mini === "1";
  const day = d => d.toISOString().slice(0, 10);
  const now = new Date(), from = new Date(now - 14 * 864e5);
  const escH = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cache = {};
  async function load(field, n) {
    const key = field + n;
    if (cache[key]) return cache[key];
    const url = "https://api.openalex.org/works?search=" + encodeURIComponent(Q[field]) +
      "&filter=from_publication_date:" + day(from) + ",to_publication_date:" + day(now) + ",type:article,has_doi:true,language:en" +
      "&sort=publication_date:desc&per-page=" + n +
      "&select=title,publication_date,doi,authorships,primary_location";
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    return (cache[key] = (j.results || []).filter(w => w.title).map(w => ({ ...w, field })));
  }
  function item(w) {
    const a = (w.authorships || []).map(x => x.author && x.author.display_name).filter(Boolean);
    const who = a.length ? escH(a.slice(0, 3).join(", ")) + (a.length > 3 ? " et al." : "") : "";
    const src = w.primary_location && w.primary_location.source && w.primary_location.source.display_name;
    const href = /^https:\/\/doi\.org\//.test(w.doi || "") ? w.doi : "#";
    return `<a class="radar-item" href="${escH(href)}" target="_blank" rel="noopener" style="--c:${COL[w.field]}">
      <span class="radar-date">${escH(w.publication_date)}</span>
      <span class="radar-title">${escH(w.title.replace(/<[^>]+>/g, ""))}</span>
      <span class="radar-meta">${who}${src ? " · " + escH(src) : ""}</span></a>`;
  }
  async function show(field) {
    box.innerHTML = '<p class="radar-msg">Scanning the world\'s research…</p>';
    try {
      let list;
      if (mini) {
        const all = await Promise.all(Object.keys(Q).map(f => load(f, 3)));
        list = all.flat();
      } else list = await load(field, 25);
      box.innerHTML = list.length ? list.map(item).join("") : '<p class="radar-msg">No new papers found in the last two weeks. Check back soon.</p>';
    } catch (e) {
      box.innerHTML = '<p class="radar-msg">The live research feed is temporarily unavailable. Please try again shortly.</p>';
    }
  }
  document.querySelectorAll("[data-radar]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("[data-radar]").forEach(x => x.classList.toggle("on", x === b));
    show(b.dataset.radar);
  }));
  show("robotics");
})();
