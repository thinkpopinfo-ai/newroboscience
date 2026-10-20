#!/usr/bin/env node
/* Netlify "ignore" command — keeps production deploys within the Free plan's 300 credits/month.
   Each production deploy costs 15 credits, so the site publishes in batches instead of on every push:
     - Production builds run only on Mon, Wed and Fri between 07:30 and 11:59 New York time
       (the Ideas Lab task pushes around 8 AM on those days, publishing everything committed since).
     - Pushes at other times are skipped; they go live with the next publish window.
     - Put "[publish]" in a commit message to force an immediate deploy.
     - Deploy previews and branch deploys are free and always build.
   Netlify convention: exit 0 = skip this build, exit 1 = build. Any error here exits 1 (build). */
const { execSync } = require("child_process");

const skip = why => { console.log(`Skipping production build: ${why}`); process.exit(0); };
const build = why => { console.log(`Building: ${why}`); process.exit(1); };

try {
  if ((process.env.CONTEXT || "production") !== "production") build(`${process.env.CONTEXT} deploys are free`);

  const msg = execSync("git log -1 --format=%B", { encoding: "utf8" });
  if (msg.includes("[publish]")) build("commit message asks for [publish]");

  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  const label = `${p.weekday} ${p.hour}:${p.minute} New York time`;

  if (!["Mon", "Wed", "Fri"].includes(p.weekday)) skip(`${label} is not a publish day (Mon/Wed/Fri)`);
  if (minutes < 7 * 60 + 30 || minutes >= 12 * 60) skip(`${label} is outside the 07:30-11:59 publish window`);
  build(`${label} is inside the publish window`);
} catch (e) {
  build(`ignore check failed (${e.message})`);
}
