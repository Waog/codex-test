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
Follow these steps once to allow the workflow to publish production and preview builds:

1. Open your repository settings in GitHub and navigate to **Pages**.
2. Under **Source**, choose **GitHub Actions** and save. This enables Pages for the repo so `actions/deploy-pages` can create deployments.
3. Still in **Settings → Pages**, confirm that the **Build and deployment** section shows “GitHub Actions” as the source.
4. (Optional) If you use a custom domain, configure it in the same section after the first production deployment completes.

After these steps, the workflow will deploy:

- `main` branch builds to the primary site URL (e.g., `https://<user>.github.io/<repo>/`).
- Pull requests build preview environments at longer URLs listed in the run summary (e.g., `https://<user>.github.io/<repo>/preview-pr-<number>/`).

Each pull request run automatically tears down its preview when the PR is closed or merged.

## Offline & PWA details
- The service worker caches the app shell, generated feedback tones, icons, and the full syllable mapping JSON for offline play after first load.
- `start_url` is `./` so the PWA works from any subpath (e.g., GitHub Pages or a custom domain).
- Positive/negative feedback cues are synthesized on the fly via the Web Audio API. A dedicated manifest and icons enable “Add to Home Screen”.

## Data & privacy
All histories and settings are stored locally in the browser via `localStorage`. Use the **Reset all data** button in the Stats & Settings tab to clear progress and voice selection.
