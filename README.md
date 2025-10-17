# Mandarin Tone Trainer (Tones 2 & 3)

An installable, offline-first React Progressive Web App that trains listening comprehension for Mandarin Tone 2 vs Tone 3 on single syllables. It auto-selects weighted syllables based on performance history, provides swipe/tap controls for quick responses, and records accuracy to surface challenging syllables.

## Tech stack
- [Vite](https://vitejs.dev/) + React + TypeScript
- Web Speech API (`speechSynthesis`) for tone playback
- Service Worker + Web App Manifest for offline support and installability
- LocalStorage persistence for per-syllable histories and voice selection
- GitHub Actions + GitHub Pages for continuous deployment

## Getting started
```bash
npm install
npm run dev
```
Open the local server indicated in the terminal. The Learn tab is active by default and begins a 20-question round using the selected Mandarin (`zh-CN`) voice.

## Building for production
```bash
npm run build
```
The static output is written to `dist/` and automatically deployed to GitHub Pages via the provided workflow on pushes to `main`.

## Configuring GitHub Pages deployments
The repository ships with a GitHub Actions workflow that rebuilds **every** remote branch on each push, then publishes them side by side through GitHub Pages. To enable it:

1. In **Settings → Pages**, set **Build and deployment** to **GitHub Actions**.
2. (Optional) Configure a custom domain once the first deployment finishes.

Once enabled, each push triggers three stages:

1. Discover all remote branches (excluding `gh-pages`).
2. Build each branch in parallel and upload the resulting `dist/` folders as artifacts.
3. Assemble a Pages artifact where the `main` branch populates the root site (`https://<user>.github.io/<repo>/`) and every branch is available under `https://<user>.github.io/<repo>/branches/<branch>/`.

The workflow also publishes a lightweight directory listing at `/branches/` so you can quickly jump between branch builds. Because every branch is rebuilt on every push, the published content always reflects the latest state of the repository—even for branches that did not receive the most recent commit.

## Offline & PWA details
- The service worker caches the app shell, generated feedback tones, icons, and the full syllable mapping JSON for offline play after first load.
- `start_url` is `./` so the PWA works from any subpath (e.g., GitHub Pages or a custom domain).
- Positive/negative feedback cues are synthesized on the fly via the Web Audio API. A dedicated manifest and icons enable “Add to Home Screen”.

## Data & privacy
All histories and settings are stored locally in the browser via `localStorage`. Use the **Reset all data** button in the Stats & Settings tab to clear progress and voice selection.
