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
2. Under **Build and deployment**, choose **Deploy from a branch** and select the `gh-pages` branch with the `/ (root)` folder, then save. This lets GitHub serve the branch populated by the workflow.
3. (Optional) If you use a custom domain, configure it in the same section after the first production deployment completes.

After these steps, the workflow will deploy:

- `main` branch builds to the primary site URL (e.g., `https://<user>.github.io/<repo>/`).
- Pull requests build preview environments at URLs like `https://<user>.github.io/<repo>/pr/<number>/`, and the workflow comments the exact link on each PR for easy access.

Preview folders stay published until you delete them (for example, by removing the corresponding `pr/<number>` directory from the `gh-pages` branch or adding a cleanup workflow).

## Offline & PWA details
- The service worker caches the app shell, generated feedback tones, icons, and the full syllable mapping JSON for offline play after first load.
- `start_url` is `./` so the PWA works from any subpath (e.g., GitHub Pages or a custom domain).
- Positive/negative feedback cues are synthesized on the fly via the Web Audio API. A dedicated manifest and icons enable “Add to Home Screen”.

## Data & privacy
All histories and settings are stored locally in the browser via `localStorage`. Use the **Reset all data** button in the Stats & Settings tab to clear progress and voice selection.
