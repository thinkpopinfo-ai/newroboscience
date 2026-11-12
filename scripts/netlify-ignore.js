#!/usr/bin/env node
/* Netlify "ignore" command: keeps this site at or under 135 credits a month (15 credits per production deploy).
   Budget per billing cycle (the cycle restarts on the 11th of each month):
     - 8 scheduled publishes: Mon and Thu between 07:30 and 08:59 New York time (the Ideas Lab task pushes ~7:50 AM),
       at most ONE per day, and only the first 8 Mon/Thu of the cycle. Later Mon/Thu in the cycle are skipped.
     - 1 spare: a commit whose message contains "[publish]" deploys immediately, once per cycle.
     => at most 9 deploys = 135 credits per cycle. Everything else is skipped and goes live with the next allowed publish.
   Deploy previews and branch deploys are free and always build.
   Netlify convention: exit 0 = skip this build, exit 1 = build. If a check fails, the build is SKIPPED (protects credits). */
const { execSync } = require("child_process");

const CYCLE_START_DAY = 11;   // Netlify billing cycle restarts on this day of the month
const MAX_SCHEDULED = 8;      // scheduled Mon/Thu publishes per cycle
const MAX_MANUAL = 1;         // "[publish]" deploys per cycle

const skip = why => { console.log(`Skipping production build: ${why}`); process.exit(0); };
const build = why => { console.log(`Building: ${why}`); process.exit(1); };
const git = cmd => execSync(`git ${cmd}`, { encoding: "utf8" }).trim();

// Date parts in New York time
const ny = d => Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).formatToParts(d).map(x => [x.type, x.value]));

try {
  if ((process.env.CONTEXT || "production") !== "production") build(`${process.env.CONTEXT} deploys are free`);

  const now = ny(new Date());
  const today = new Date(Date.UTC(+now.year, +now.month - 1, +now.day));
  const cycleStart = new Date(Date.UTC(+now.year, +now.month - 1 - (+now.day < CYCLE_START_DAY ? 1 : 0), CYCLE_START_DAY));
  const label = `${now.weekday} ${now.year}-${now.month}-${now.day} ${now.hour}:${now.minute} New York time`;

  // Manual "[publish]": allowed once per cycle (count [publish] commits since the cycle started)
  const msg = git("log -1 --format=%B");
  if (msg.includes("[publish]")) {
    const since = cycleStart.toISOString().slice(0, 10);
    const used = git(`log --since=${since}T05:00:00Z --format=%B%x00`).split("\0").filter(m => m.includes("[publish]")).length;
    if (used <= MAX_MANUAL) build(`[publish] #${used} of ${MAX_MANUAL} this cycle`);
    skip(`[publish] limit (${MAX_MANUAL} per cycle) already used; goes live at the next scheduled publish`);
  }

  // Scheduled window: Mon/Thu 07:30-08:59
  if (!["Mon", "Thu"].includes(now.weekday)) skip(`${label} is not a publish day (Mon/Thu)`);
  const minutes = +now.hour * 60 + +now.minute;
  if (minutes < 7 * 60 + 30 || minutes >= 9 * 60) skip(`${label} is outside the 07:30-08:59 publish window`);

  // Only the first MAX_SCHEDULED Mon/Thu of the cycle
  let n = 0;
  for (let d = new Date(cycleStart); d <= today; d.setUTCDate(d.getUTCDate() + 1)) if ([1, 4].includes(d.getUTCDay())) n++;
  if (n > MAX_SCHEDULED) skip(`this is Mon/Thu #${n} of the billing cycle; only ${MAX_SCHEDULED} scheduled publishes per cycle`);

  // At most one scheduled publish per day: skip if an earlier commit today already landed inside the window
  const prev = git("log -2 --format=%cI").split("\n")[1];
  if (prev) {
    const p = ny(new Date(prev)), pm = +p.hour * 60 + +p.minute;
    if (p.year === now.year && p.month === now.month && p.day === now.day && pm >= 7 * 60 + 30 && pm < 9 * 60)
      skip("already published once in today's window");
  }
  build(`${label}: scheduled publish ${n} of ${MAX_SCHEDULED} this cycle`);
} catch (e) {
  skip(`budget check failed (${e.message}); skipping to protect credits`);
}
