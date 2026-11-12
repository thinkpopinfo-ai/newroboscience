# newroboscience

Source for https://newroboscience.netlify.app — research explainers, Ideas Lab and a Live Research Radar by Viraj Gajera.

- `content/posts.json` — published transmissions (oldest first; append new posts to the end)
- `content/ideas.json` — Ideas Lab concepts
- `content/profile.json` — Meet Viraj page: intro, focus areas, education, research
- `content/research.json` — written weekly from ORCID by `scripts/orcid_sync.py` (GitHub Action `ORCID sync`, Mondays 7:20 AM New York); merged with `profile.json` research to build `/research/` pages with Google Scholar citation tags. Don't edit by hand; edit ORCID instead.
- `src/build.js` — static site generator (`node src/build.js` writes `dist/`)

Netlify publishes `main` within a budget of 135 credits per billing cycle (cycle restarts on the 11th; 15 credits per production deploy): up to 8 scheduled publishes on Mon/Thu between 07:30 and 08:59 New York time (one per day), plus one `[publish]` commit per cycle. Everything else waits for the next allowed publish. See `scripts/netlify-ignore.js`.
