#!/usr/bin/env node
/* Netlify build for the OLD address newroboscience.netlify.app.
   The real site now lives on GitHub Pages. This tiny build:
     - sends every old page to the same page on the new address (301 redirect, keeps Google ranking),
     - keeps the newsletter/unsubscribe forms registered so Netlify keeps collecting signups,
     - shows thank-you pages that point back to the new site. */
const fs = require("fs"), path = require("path");
const NEW = "https://thinkpopinfo-ai.github.io/newroboscience";
const out = path.join(__dirname, "../dist-netlify");
fs.rmSync(out, { recursive: true, force: true });
const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} | newroboscience</title><style>body{font-family:system-ui,sans-serif;background:#05080f;color:#e8eefc;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}a{color:#5cd3ff}</style></head><body><main>${body}</main></body></html>`;
const files = {
  "_redirects": `/*  ${NEW}/:splat  301\n`,
  // Hidden copies of the forms so Netlify Forms keeps accepting submissions sent from the new site
  "forms/index.html": page("Forms", `<form name="newsletter" method="POST" action="/subscribed/" data-netlify="true" netlify-honeypot="bot-field" hidden><input name="bot-field"><input name="name"><input type="email" name="email"></form><form name="unsubscribe" method="POST" action="/unsubscribed/" data-netlify="true" netlify-honeypot="bot-field" hidden><input name="bot-field"><input type="email" name="email"></form><p><a href="${NEW}/">newroboscience</a></p>`),
  "subscribed/index.html": page("You're subscribed", `<h1>You're on the list</h1><p>Thanks for subscribing to the newroboscience newsletter by Viraj Gajera.</p><p><a href="${NEW}/">Back to newroboscience</a></p>`),
  "unsubscribed/index.html": page("Unsubscribed", `<h1>You're unsubscribed</h1><p>You won't receive the newsletter any more.</p><p><a href="${NEW}/">Back to newroboscience</a></p>`),
};
for (const [rel, txt] of Object.entries(files)) { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); }
console.log(`Built Netlify redirect site (${Object.keys(files).length} files) -> ${NEW}`);
