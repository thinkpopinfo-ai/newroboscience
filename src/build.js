/* newroboscience site builder — runs in Node (writes ./dist) and in a browser (window.NRS.build).
   Input: posts array (oldest first, as stored in _source/posts.json) + asset texts.
   Output: { "path": "file contents", ... } for the whole site. */
(function (root) {
  const SITE = "https://newroboscience.netlify.app";
  const AUTHOR = "Viraj Gajera";
  const ROLE = "Research and Development Engineer";
  const EMAIL = "virajgajera5@gmail.com";
  const PLACE = "New York, USA";
  const ORCID = ""; // e.g. "https://orcid.org/0000-0000-0000-0000"
  const BRAND = "newroboscience";
  const TAGLINE = "Signals from the frontier of robotics, aerospace and biotech";
  const FIELDS = {
    robotics: { name: "Robotics", color: "#ffb547", glyph: "◆", orbit: 1 },
    aerospace: { name: "Aerospace", color: "#5cd3ff", glyph: "▲", orbit: 2 },
    biotech: { name: "Biotech", color: "#79f2b0", glyph: "●", orbit: 3 },
  };
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  const fmtDate = d => { const [y, m, dd] = d.split("-").map(Number); return `${MONTHS[m - 1]} ${dd}, ${y}`; };
  const rfcDate = d => { const [y, m, dd] = d.split("-").map(Number); const w = new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); return `${DAYS[w]}, ${String(dd).padStart(2, "0")} ${MONTHS[m - 1].slice(0, 3)} ${y} 12:00:00 +0000`; };

  function rng(str) { // FNV-1a seed + mulberry32
    let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const f0 = n => Math.round(n);

  function coverSvg(p, w = 800, h = 450) {
    const r = rng(p.slug), c = FIELDS[p.field].color, pick = a => a[Math.floor(r() * a.length)];
    const P = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">`, `<rect width="${w}" height="${h}" fill="#070b14"/>`];
    for (let x = 0; x < w; x += 40) P.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${c}" stroke-opacity=".06"/>`);
    for (let y = 0; y < h; y += 40) P.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${c}" stroke-opacity=".06"/>`);
    const cx = w * (0.45 + r() * 0.1), cy = h * 0.5;
    if (p.field === "aerospace") {
      for (let i = 0; i < 7; i++) {
        const rx = 60 + i * 48 + r() * 20, ry = 20 + i * 16 + r() * 10, rot = (r() * 50 - 25).toFixed(1);
        P.push(`<ellipse cx="${f0(cx)}" cy="${f0(cy)}" rx="${f0(rx)}" ry="${f0(ry)}" fill="none" stroke="${c}" stroke-opacity="${(0.15 + i * 0.08).toFixed(2)}" stroke-dasharray="${pick(["0", "4 6", "1 5"])}" transform="rotate(${rot} ${f0(cx)} ${f0(cy)})"/>`);
        const a = r() * Math.PI * 2;
        P.push(`<circle cx="${f0(cx + rx * Math.cos(a))}" cy="${f0(cy + ry * Math.sin(a))}" r="${pick([2, 3, 4])}" fill="${c}"/>`);
      }
      P.push(`<circle cx="${f0(cx)}" cy="${f0(cy)}" r="26" fill="${c}" fill-opacity=".9"/><circle cx="${f0(cx)}" cy="${f0(cy)}" r="44" fill="none" stroke="${c}" stroke-opacity=".35"/>`);
    } else if (p.field === "biotech") {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), x = 90 + t * (w - 180), ph = t * Math.PI * 2 * 2.2 + r() * 0.2;
        const y1 = cy + 90 * Math.sin(ph), y2 = cy - 90 * Math.sin(ph), k = Math.abs(Math.cos(ph));
        P.push(`<line x1="${f0(x)}" y1="${f0(y1)}" x2="${f0(x)}" y2="${f0(y2)}" stroke="${c}" stroke-opacity=".25"/>`);
        for (const yy of [y1, y2]) P.push(`<circle cx="${f0(x)}" cy="${f0(yy)}" r="${(4 + 3 * k).toFixed(1)}" fill="${c}" fill-opacity="${(0.4 + 0.6 * k).toFixed(2)}"/>`);
      }
      for (let i = 0; i < 14; i++) P.push(`<circle cx="${f0(r() * w)}" cy="${f0(r() * h)}" r="${f0(8 + r() * 32)}" fill="none" stroke="${c}" stroke-opacity=".12"/>`);
    } else {
      let x = 120, y = h - 70, ang = -Math.PI / 2 + (r() * 0.8 - 0.4);
      const pts = [[x, y]];
      for (let i = 0; i < 6; i++) {
        const L = 60 + r() * 50; ang += r() * 2 - 1;
        x = Math.min(Math.max(x + L * Math.cos(ang), 40), w - 40); y = Math.min(Math.max(y + L * Math.sin(ang), 40), h - 40);
        pts.push([x, y]);
      }
      for (let i = 0; i < pts.length - 1; i++) P.push(`<line x1="${f0(pts[i][0])}" y1="${f0(pts[i][1])}" x2="${f0(pts[i + 1][0])}" y2="${f0(pts[i + 1][1])}" stroke="${c}" stroke-width="10" stroke-linecap="round" stroke-opacity=".85"/>`);
      pts.forEach(([px, py], i) => {
        P.push(`<circle cx="${f0(px)}" cy="${f0(py)}" r="${i === 0 ? 13 : 9}" fill="#070b14" stroke="${c}" stroke-width="3"/>`);
        P.push(`<circle cx="${f0(px)}" cy="${f0(py)}" r="${30 + i * 6}" fill="none" stroke="${c}" stroke-opacity=".1" stroke-dasharray="3 6"/>`);
      });
      const [ex, ey] = pts[pts.length - 1];
      P.push(`<path d="M${f0(ex - 14)} ${f0(ey - 18)} L${f0(ex)} ${f0(ey)} L${f0(ex + 14)} ${f0(ey - 18)}" fill="none" stroke="${c}" stroke-width="4"/>`);
    }
    P.push(`<text x="24" y="${h - 22}" font-family="IBM Plex Mono, monospace" font-size="15" fill="${c}" fill-opacity=".8">${p.tx} · ${FIELDS[p.field].name.toUpperCase()}</text>`);
    P.push(`<text x="${w - 24}" y="34" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="13" fill="#ffffff" fill-opacity=".45">${BRAND.toUpperCase()} / ${AUTHOR.toUpperCase()}</text></svg>`);
    return P.join("");
  }

  function head(title, desc, path, extraLd, ogType = "website", ogImage) {
    const url = SITE + path;
    const ld = [
      { "@context": "https://schema.org", "@type": "Person", "@id": SITE + "/#viraj", name: AUTHOR, url: SITE + "/about/", jobTitle: ROLE, alumniOf: [{ "@type": "CollegeOrUniversity", name: "Nirma University", address: "Ahmedabad, India" }], email: "mailto:" + EMAIL, address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY", addressCountry: "US" }, ...(ORCID ? { sameAs: [ORCID], identifier: ORCID } : {}), knowsAbout: ["Robotics", "Aerospace engineering", "Biotechnology", "Science communication"] },
      { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: SITE + "/", author: { "@id": SITE + "/#viraj" }, publisher: { "@id": SITE + "/#viraj" }, description: TAGLINE },
    ];
    if (extraLd) ld.push(extraLd);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${AUTHOR}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${url}">${ogImage ? `\n<meta property="og:image" content="${esc(ogImage)}">` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<meta name="theme-color" content="#05080f">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${BRAND} by ${AUTHOR}" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="logo" href="/" aria-label="${BRAND} home"><span class="logo-dot"></span>${BRAND}</a>
  <nav>
    <a href="/#log">Transmissions</a>
    <a href="/live/">Live Radar</a>
    <a href="/ideas/">Ideas Lab</a>
    <a href="/about/">Meet Viraj</a>
    <a href="/about/#contact">Contact</a>
  </nav>
  <span class="live"><i></i>LIVE · <time id="utc">--:--</time> UTC</span>
</header>
`;
  }

  const foot = year => `
<footer class="foot">
  <div>
    <p class="foot-brand">${BRAND}</p>
    <p>Written and curated by <a href="/about/">${AUTHOR}</a>. Every transmission credits the scientists and sources behind the research it covers.</p>
  </div>
  <div class="foot-links"><a href="mailto:${EMAIL}">${EMAIL}</a><a href="/live/">Live Research Radar</a><a href="/ideas/">Ideas Lab</a><a href="/about/#contact">Contact</a><a href="/feed.xml">RSS feed</a><a href="/about/">About</a><a href="/#log">All transmissions</a></div>
  <p class="foot-copy">© ${year} ${AUTHOR}. Cover art is generated uniquely for each post; photos are credited to their owners.</p>
</footer>
<script src="/assets/app.js" defer></script>
</body></html>`;

  const art = (p, w, h) => p.image
    ? `<img src="${esc(p.image.url)}" alt="${esc(p.image.alt || p.title)}" loading="lazy">`
    : `<img src="/covers/${p.slug}${w ? "-wide" : ""}.svg" alt="" loading="lazy" width="${w || 800}" height="${h || 450}">`;

  function card(p, big) {
    const f = FIELDS[p.field];
    return `<article class="card${big ? " card-big" : ""}" data-field="${p.field}" style="--c:${f.color}">
  <a href="${p.url}" class="card-link">
    <div class="card-art">${art(p)}</div>
    <div class="card-body">
      <p class="meta"><span class="tx">${p.tx}</span><span class="pill">${f.glyph} ${f.name}</span><time datetime="${p.date}">${fmtDate(p.date)}</time></p>
      <h3>${esc(p.title)}</h3>
      <p class="dek">${esc(p.dek)}</p>
      <p class="byline">by ${AUTHOR} · ${p.minutes} min read</p>
    </div>
  </a>
</article>`;
  }

  function renderIndex(posts, ideas, year) {
    const latest = posts[0];
    const counts = Object.fromEntries(Object.keys(FIELDS).map(k => [k, posts.filter(p => p.field === k).length]));
    const orbit = JSON.stringify(posts.slice(0, 40).map(p => ({ t: p.title, u: p.url, f: p.field, tx: p.tx, c: FIELDS[p.field].color, o: FIELDS[p.field].orbit }))).replace(/</g, "\\u003c");
    const fieldCards = Object.entries(FIELDS).map(([k, v]) => `<button class="field" data-filter="${k}" style="--c:${v.color}">
      <span class="field-glyph">${v.glyph}</span><span class="field-name">${v.name}</span>
      <span class="field-count">${String(counts[k]).padStart(2, "0")} transmissions</span></button>`).join("");
    const tick = posts.slice(0, 12);
    const desc = `${BRAND} by ${AUTHOR}: daily research transmissions on robotics, aerospace and biotech, explained clearly and credited to the scientists behind them.`;
    return head(`${BRAND} by ${AUTHOR} | Robotics, Aerospace & Biotech Research`, desc, "/") + `
<main id="main">
<section class="hero">
  <canvas id="orbits" aria-hidden="true"></canvas>
  <div class="hero-copy">
    <p class="kicker">Deep-field research observatory</p>
    <h1><span class="h1-brand">${BRAND}</span><span class="h1-by">by ${AUTHOR}</span></h1>
    <p class="lede">Every day, one new signal from the edge of science. Robots, rockets and living code, decoded into stories anyone can follow.</p>
    <div class="hero-cta">
      <a class="btn" href="${latest.url}">Read today's transmission</a>
      <a class="btn ghost" href="#log">Open the log</a>
    </div>
    <p class="hint">Each light in orbit is a post. Hover to read its signal, click to open it.</p>
  </div>
  <div id="orbit-tip" role="status"></div>
  <script>window.ORBIT=${orbit};</script>
</section>

<section class="ticker" aria-label="Latest headlines"><div class="ticker-track">${tick.concat(tick).map(p => `<a href="${p.url}"><b style="color:${FIELDS[p.field].color}">${p.tx}</b> ${esc(p.title)}</a>`).join("")}</div></section>

<section class="featured wrap" aria-labelledby="ft">
  <h2 id="ft" class="sec-title"><span>Incoming</span> Latest transmission</h2>
  ${card(latest, true)}
</section>

<section id="fields" class="wrap">
  <h2 class="sec-title"><span>Tune in</span> Three frequencies</h2>
  <div class="fields">${fieldCards}</div>
</section>

<section id="log" class="wrap">
  <h2 class="sec-title"><span>Archive</span> Transmission log <button class="clear" data-filter="all">Show all</button></h2>
  <div class="grid">${posts.map(p => card(p)).join("")}</div>
</section>

<section class="wrap" id="radar-home">
  <h2 class="sec-title"><span>Live · updates itself</span> World research radar <a class="clear" href="/live/">Open full radar</a></h2>
  <div id="radar" class="radar radar-mini" data-mini="1" aria-live="polite"><p class="radar-msg">Scanning the world's research…</p></div>
</section>

<section class="wrap">
  <h2 class="sec-title"><span>Ideas Lab</span> Open concepts by ${AUTHOR} <a class="clear" href="/ideas/">All ideas</a></h2>
  <div class="grid">${ideas.slice(0, 3).map(ideaCard).join("")}</div>
</section>

<section class="about-strip wrap">
  <div class="sig">VG</div>
  <div>
    <h2>Who's on the other end of the signal</h2>
    <p><strong>${AUTHOR}</strong> is a ${ROLE} in ${PLACE} working on computational multiphysics, aerospace propulsion, physics-informed prognostics, biomedical engineering and intelligent manufacturing. On ${BRAND} he turns frontier research into clear explainers, always crediting the original researchers, and shares open ideas for others to build on.</p>
    <a class="btn ghost" href="/about/">Meet Viraj</a>
  </div>
</section>
</main>` + foot(year);
  }

  function renderPost(p, posts, year) {
    const f = FIELDS[p.field];
    const body = p.body.map(([k, t]) => k === "h2" ? `<h2>${esc(t)}</h2>` : k === "take" ? `<aside class="take"><p class="take-label">Viraj's take</p><p>${esc(t)}</p></aside>` : `<p>${esc(t)}</p>`).join("");
    const sources = p.sources.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener" target="_blank">${esc(t)}</a></li>`).join("");
    const same = posts.filter(q => q.slug !== p.slug && q.field === p.field), other = posts.filter(q => q.slug !== p.slug && q.field !== p.field);
    const more = same.slice(0, 2).concat(other).slice(0, 3);
    const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.dek, datePublished: p.date, dateModified: p.date, author: { "@type": "Person", name: AUTHOR, url: SITE + "/about/" }, publisher: { "@type": "Person", name: AUTHOR }, mainEntityOfPage: SITE + p.url, keywords: p.tags.join(", "), articleSection: f.name };
    if (p.image) ld.image = p.image.url;
    const hero = p.image
      ? `<figure class="post-art"><img src="${esc(p.image.url)}" alt="${esc(p.image.alt || p.title)}"><figcaption>${esc(p.image.credit || "")}</figcaption></figure>`
      : `<figure class="post-art"><img src="/covers/${p.slug}-wide.svg" alt="Generative cover art for ${esc(p.title)}" width="1200" height="520"></figure>`;
    return head(`${p.title} | ${BRAND} by ${AUTHOR}`, p.dek, p.url, ld, "article", p.image && p.image.url) + `
<div class="progress" style="--c:${f.color}"><span id="bar"></span></div>
<main id="main" class="post" style="--c:${f.color}">
  <header class="post-head wrap-narrow">
    <p class="meta"><span class="tx">${p.tx}</span><span class="pill">${f.glyph} ${f.name}</span><time datetime="${p.date}">${fmtDate(p.date)}</time></p>
    <h1>${esc(p.title)}</h1>
    <p class="post-dek">${esc(p.dek)}</p>
    <p class="byline">Written by <a href="/about/">${AUTHOR}</a> · ${p.minutes} min read</p>
  </header>
  ${hero}
  <article class="prose wrap-narrow">
    ${body}
    <section class="credits">
      <h2>Credit where it's due</h2>
      <p>${esc(p.credit)}</p>
      <h3>Sources</h3>
      <ol>${sources}</ol>
      <p class="tags">${p.tags.map(t => `<span>#${esc(t)}</span>`).join("")}</p>
    </section>
    <div class="share">
      <span>Share this signal</span>
      <a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE + p.url)}&amp;text=${encodeURIComponent(p.title)}">X</a>
      <a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE + p.url)}">LinkedIn</a>
      <button data-copy="${esc(SITE + p.url)}">Copy link</button>
    </div>
  </article>
  <section class="wrap more"><h2 class="sec-title"><span>Keep listening</span> More transmissions</h2><div class="grid">${more.map(q => card(q)).join("")}</div></section>
</main>` + foot(year);
  }

  const doiUrl = d => "https://doi.org/" + d;
  const venue = d => d.startsWith("10.21203/") ? "Research Square preprint" : d.startsWith("10.5281/zenodo") ? "Zenodo" : "Research record";

  function renderAbout(posts, ideas, prof, year) {
    const works = prof.research;
    const ld = [{ "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@id": SITE + "/#viraj" }, description: prof.headline }]
      .concat(works.map(w => ({ "@context": "https://schema.org", "@type": "ScholarlyArticle", name: w.title, author: { "@id": SITE + "/#viraj", "@type": "Person", name: AUTHOR }, about: w.area, ...(w.doi ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: w.doi }, url: doiUrl(w.doi), sameAs: doiUrl(w.doi) } : {}) })));
    const ldOne = { "@context": "https://schema.org", "@graph": ld.map(({ "@context": _, ...x }) => x) };
    return head(`Meet ${AUTHOR}: Research and Development Engineer | ${BRAND}`, `${AUTHOR} is a Research and Development Engineer in New York working on computational multiphysics, aerospace propulsion, physics-informed prognostics, biomedical engineering and intelligent manufacturing.`, "/about/", ldOne, "profile") + `
<main id="main" class="about-page">
  <section class="profile-hero wrap">
    <div class="sig big">VG</div>
    <div>
      <p class="kicker">Meet the author</p>
      <h1>${AUTHOR}</h1>
      <p class="role">${ROLE} · ${PLACE}</p>
      <p class="post-dek">${esc(prof.headline)}</p>
      <div class="hero-cta"><a class="btn" href="mailto:${EMAIL}">Email Viraj</a><a class="btn ghost" href="#research">View research</a><a class="btn ghost" href="/ideas/">Ideas Lab</a></div>
    </div>
  </section>

  <section class="wrap-narrow prose">
    <h2>Introduction</h2>
    ${prof.intro.map(t => `<p>${esc(t)}</p>`).join("")}
  </section>

  <section class="wrap">
    <h2 class="sec-title"><span>Expertise</span> Focus areas</h2>
    <div class="focus">${prof.focus.map(([t, d], i) => `<div class="focus-card"><span class="focus-n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>
  </section>

  <section class="wrap" id="education">
    <h2 class="sec-title"><span>Training</span> Education</h2>
    <div class="edu">${prof.education.map(([deg, where]) => `<div class="edu-row"><h3>${esc(deg)}</h3><p>${esc(where)}</p></div>`).join("")}</div>
  </section>

  <section class="wrap" id="research">
    <h2 class="sec-title"><span>Publications</span> Research by ${AUTHOR}</h2>
    <ol class="pubs">${works.map((w, i) => `<li><span class="pub-n">${String(i + 1).padStart(2, "0")}</span><div><p class="pub-area">${esc(w.area)}</p><h3>${w.doi ? `<a href="${doiUrl(w.doi)}" target="_blank" rel="noopener">${esc(w.title)}</a>` : esc(w.title)}</h3><p class="pub-meta">${AUTHOR}${w.doi ? ` · ${venue(w.doi)} · DOI <a href="${doiUrl(w.doi)}" target="_blank" rel="noopener">${esc(w.doi)}</a>` : " · Completed research study"}</p></div></li>`).join("")}</ol>
  </section>

  <section class="wrap">
    <h2 class="sec-title"><span>Open concepts</span> From the Ideas Lab</h2>
    <div class="grid">${ideas.slice(0, 3).map(ideaCard).join("")}</div>
  </section>

  <section class="wrap-narrow prose">
    <h2>About newroboscience</h2>
    <p>${BRAND} is Viraj's public research notebook. It publishes clear explainers on new work in robotics, aerospace and biotechnology, always crediting the original researchers, alongside a live radar of newly published studies and an Ideas Lab of open concepts. ${posts.length} transmissions and ${ideas.length} open ideas published so far.</p>
    <h2 id="contact">Contact and collaboration</h2>
    <p>Viraj welcomes conversations with researchers, engineers, students and organisations who want to explore these ideas further, collaborate on research, or discuss consulting and speaking.</p>
    <ul class="contact">
      <li><span>Email</span><a href="mailto:${EMAIL}">${EMAIL}</a></li>
      <li><span>Location</span>${PLACE}</li>
      <li><span>Role</span>${ROLE}</li>${ORCID ? `\n      <li><span>ORCID</span><a href="${ORCID}" rel="me noopener" target="_blank">${ORCID.replace("https://orcid.org/", "")}</a></li>` : ""}
    </ul>
  </section>
</main>` + foot(year);
  }

  function ideaCard(d) {
    const f = FIELDS[d.field];
    return `<article class="card idea-card" style="--c:${f.color}"><a class="card-link" href="/ideas/#${d.slug}"><div class="card-body">
      <p class="meta"><span class="pill">${f.glyph} ${f.name}</span><span class="tx">Open concept</span></p>
      <h3>${esc(d.title)}</h3><p class="dek">${esc(d.summary)}</p><p class="byline">Proposed by ${AUTHOR}</p></div></a></article>`;
  }

  function renderIdeas(ideas, year) {
    const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Ideas Lab", author: { "@id": SITE + "/#viraj" },
      hasPart: ideas.map(d => ({ "@type": "CreativeWork", name: d.title, abstract: d.summary, author: { "@type": "Person", name: AUTHOR }, datePublished: d.date, url: SITE + "/ideas/#" + d.slug })) };
    return head(`Ideas Lab: open concepts by ${AUTHOR} | ${BRAND}`, `Open research concepts proposed by ${AUTHOR} across robotics, aerospace and biotech, shared for anyone to think about, challenge and build on.`, "/ideas/", ld) + `
<main id="main" class="wrap-narrow about">
  <p class="kicker">Ideas Lab</p>
  <h1>Open concepts to think on</h1>
  <p class="post-dek">These are early-stage ideas from ${AUTHOR}: not finished results, but starting points. Read them, challenge them, and build on them. If you want to go deeper or collaborate, <a href="mailto:${EMAIL}?subject=Ideas%20Lab">reach out</a>.</p>
  ${ideas.map(d => { const f = FIELDS[d.field]; return `<article class="idea" id="${d.slug}" style="--c:${f.color}">
    <p class="meta"><span class="pill">${f.glyph} ${f.name}</span><time datetime="${d.date}">${fmtDate(d.date)}</time></p>
    <h2>${esc(d.title)}</h2>
    <p class="idea-sum">${esc(d.summary)}</p>
    <div class="prose">${d.concept.map(t => `<p>${esc(t)}</p>`).join("")}</div>
    <h3>Open questions</h3>
    <ul class="qs">${d.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
    <a class="btn ghost" href="mailto:${EMAIL}?subject=${encodeURIComponent("Idea: " + d.title)}">Discuss this idea with Viraj</a>
  </article>`; }).join("")}
  <aside class="take" style="--c:var(--cyan)"><p class="take-label">Have more questions?</p><p>Need more innovative ideas or deeper knowledge on any of these topics? Feel free to reach out at <a href="mailto:${EMAIL}">${EMAIL}</a>.</p></aside>
</main>` + foot(year);
  }

  function renderLive(year) {
    return head(`Live Research Radar | ${BRAND} by ${AUTHOR}`, "A live feed of research papers published around the world in the past two weeks in robotics, aerospace and biotech, refreshed automatically every time you visit.", "/live/") + `
<main id="main" class="wrap live-page">
  <p class="kicker">Live Research Radar</p>
  <h1 class="live-h1">New research from around the world</h1>
  <p class="post-dek">Freshly published studies in robotics, aerospace and biotech, pulled automatically from the open OpenAlex research index every time this page loads. Curated by ${AUTHOR}; every paper belongs to its own authors.</p>
  <div class="tabs" role="tablist">${Object.entries(FIELDS).map(([k, v], i) => `<button role="tab" class="tab${i ? "" : " on"}" data-radar="${k}" style="--c:${v.color}">${v.glyph} ${v.name}</button>`).join("")}</div>
  <div id="radar" class="radar" aria-live="polite"><p class="radar-msg">Scanning the world's research…</p></div>
  <p class="radar-credit">Data: <a href="https://openalex.org" target="_blank" rel="noopener">OpenAlex</a>, an open catalogue of scholarly works. Listings link to the original publishers.</p>
</main>` + foot(year);
  }

  function build(stored, assets) {
    if (!Array.isArray(stored) || !stored.length) throw new Error("no posts");
    const seen = new Set();
    const posts = stored.map((p, i) => {
      for (const k of ["slug", "field", "date", "title", "dek", "body", "sources", "credit", "tags"]) if (!p[k]) throw new Error(`post ${i} missing ${k}`);
      if (!FIELDS[p.field]) throw new Error(`post ${p.slug}: bad field ${p.field}`);
      if (seen.has(p.slug)) throw new Error(`duplicate slug ${p.slug}`); seen.add(p.slug);
      const words = p.body.reduce((n, b) => n + b[1].split(/\s+/).length, 0);
      return { ...p, tx: `TX-${String(i + 1).padStart(4, "0")}`, url: `/posts/${p.slug}/`, minutes: Math.max(2, Math.round(words / 210)) };
    }).sort((a, b) => (a.date === b.date ? (a.tx < b.tx ? 1 : -1) : a.date < b.date ? 1 : -1));
    const year = posts[0].date.slice(0, 4);
    const out = {};
    out["index.html"] = renderIndex(posts, assets.ideas || [], year);
    const ideas = assets.ideas || [], prof = assets.profile;
    out["about/index.html"] = renderAbout(posts, ideas, prof, year);
    out["ideas/index.html"] = renderIdeas(ideas, year);
    out["live/index.html"] = renderLive(year);
    for (const p of posts) {
      out[`posts/${p.slug}/index.html`] = renderPost(p, posts, year);
      out[`covers/${p.slug}.svg`] = coverSvg(p);
      out[`covers/${p.slug}-wide.svg`] = coverSvg(p, 1200, 520);
    }
    out["feed.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
<title>${BRAND} by ${AUTHOR}</title><link>${SITE}/</link><description>${TAGLINE}</description><language>en</language>${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${SITE}${p.url}</link><guid>${SITE}${p.url}</guid>
<pubDate>${rfcDate(p.date)}</pubDate>
<dc:creator>${AUTHOR}</dc:creator><category>${FIELDS[p.field].name}</category><description>${esc(p.dek)}</description></item>`).join("")}
</channel></rss>`;
    const urls = [["/", posts[0].date], ["/about/", posts[0].date], ["/ideas/", posts[0].date], ["/live/", posts[0].date]].concat(posts.map(p => [p.url, p.date]));
    out["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([u, d]) => `<url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod></url>`).join("")}</urlset>`;
    out["robots.txt"] = `User-agent: *\nAllow: /\nDisallow: /_source/\nSitemap: ${SITE}/sitemap.xml\n`;
    out["404.html"] = head(`Signal lost | ${BRAND}`, "Page not found.", "/404") + `<main id="main" class="wrap-narrow about"><p class="kicker">Error 404</p><h1>Signal lost</h1><p class="post-dek">That page drifted out of range.</p><a class="btn" href="/">Return to the observatory</a></main>` + foot(year);
    out["favicon.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#05080f"/><ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="#5cd3ff" stroke-width="2" transform="rotate(-30 16 16)"/><circle cx="16" cy="16" r="4" fill="#ffb547"/><circle cx="26" cy="10" r="2" fill="#79f2b0"/></svg>`;
    out["netlify.toml"] = `[[headers]]\n  for = "/assets/*"\n  [headers.values]\n    Cache-Control = "public, max-age=3600"\n`;
    out["assets/style.css"] = assets.style;
    out["assets/app.js"] = assets.app;
    out["_source/posts.json"] = JSON.stringify(stored, null, 1);
    return out;
  }

  const api = { build, FIELDS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NRS = api;

  // CLI: node build.js <posts.json> <outDir>
  if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
    const fs = require("fs"), path = require("path"), here = __dirname;
    const [postsPath = path.join(here, "../content/posts.json"), outDir = path.join(here, "../dist")] = process.argv.slice(2);
    const files = build(JSON.parse(fs.readFileSync(postsPath, "utf8")), {
      style: fs.readFileSync(path.join(here, "style.css"), "utf8"), app: fs.readFileSync(path.join(here, "app.js"), "utf8"), profile: JSON.parse(fs.readFileSync(path.join(here, "../content/profile.json"), "utf8")), ideas: JSON.parse(fs.readFileSync(path.join(here, "../content/ideas.json"), "utf8")),
    });
    fs.rmSync(outDir, { recursive: true, force: true });
    for (const [rel, txt] of Object.entries(files)) { const p = path.join(outDir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); }
    console.log(`Built ${Object.keys(files).length} files into ${outDir}`);
  }
})(typeof window !== "undefined" ? window : globalThis);
