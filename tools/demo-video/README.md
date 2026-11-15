# Demo video tooling: earlier cut (v2)

> This is the **previous** demo cut, kept for reference. The current video is built by the tools in [`v3/`](v3/README.md). Its live copy is at https://nhartman000.github.io/asteroid-belt-mining-continuum-play/demo/operation-cosmoform-demo.mp4.
> This cut's `script.json` uses the old ship naming. In the current game, **the Marauder** is the crewed Solar System ship and **the Marauder's Daughter** is the uncrewed interstellar ship.

Source repo: https://github.com/nhartman000/operation-cosmoform · Operation Cosmoform is a NASA Space Apps Challenge entry · not affiliated with or endorsed by NASA.


1. Serve the built game: `python3 -m http.server 8765` in the folder holding `asteroid-belt-mining-continuum.html`.
2. `node capture-clips.js <clip>` for each clip (title tap hold zoom studio mix launch solar factory ship panels he3 end). It uses Playwright, headless Chromium with SwiftShader WebGL and a paused virtual clock, so each 1080×1920 frame is captured at exactly 30 fps game time.
3. `node render-music.js` renders the Stage 1 design-screen song (the `calm` track in `src/music.js`) offline with an OfflineAudioContext.
4. Voiceover: edge-tts, voice `en-US-AndrewNeural`, rate +10%, then silence-trimmed and sped up 1.06× (`atempo`). The script is in `script.json`.
5. `python compose.py` composites the clips and draws captions that match the voiceover line by line. Then FFmpeg mixes the voice with the music, ducked by sidechain compression, and encodes H.264 + AAC.
