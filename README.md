# newroboscience

Source for https://newroboscience.netlify.app — research explainers, Ideas Lab and a Live Research Radar by Viraj Gajera.

- `content/posts.json` — published transmissions (oldest first; append new posts to the end)
- `content/ideas.json` — Ideas Lab concepts
- `content/profile.json` — Meet Viraj page: intro, focus areas, education, research
- `src/build.js` — static site generator (`node src/build.js` writes `dist/`)

Netlify builds and publishes automatically on every push to `main`.
