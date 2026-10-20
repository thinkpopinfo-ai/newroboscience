# newroboscience

Source for https://newroboscience.netlify.app — research explainers, Ideas Lab and a Live Research Radar by Viraj Gajera.

- `content/posts.json` — published transmissions (oldest first; append new posts to the end)
- `content/ideas.json` — Ideas Lab concepts
- `content/profile.json` — Meet Viraj page: intro, focus areas, education, research
- `src/build.js` — static site generator (`node src/build.js` writes `dist/`)

Netlify publishes `main` in batches to stay within the Free plan's 300 credits/month (15 credits per production deploy): production builds run only on Mon, Wed and Fri between 07:30 and 11:59 New York time, and pushes at other times go live with the next window. Add `[publish]` to a commit message to deploy immediately. See `scripts/netlify-ignore.js`.
