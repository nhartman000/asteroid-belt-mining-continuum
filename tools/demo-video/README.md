# Demo video tooling (Operation Cosmoform, 29.5 s)

1. Serve the built game: `python3 -m http.server 8765` in the folder holding `asteroid-belt-mining-continuum.html`.
2. `node capture-clips.js <clip>` for each clip (title tap hold zoom studio mix launch solar factory ship panels he3 end). It uses Playwright, headless Chromium with SwiftShader WebGL and a paused virtual clock, so each 1080×1920 frame is captured at exactly 30 fps game time.
3. `node render-music.js` renders the Stage 1 design-screen song (the `calm` track in `src/music.js`) offline with an OfflineAudioContext.
4. Voiceover: edge-tts, voice `en-US-AndrewNeural`, rate +10%, then silence-trimmed and sped up 1.06× (`atempo`). The script is in `script.json`.
5. `python compose.py` composites the clips and draws captions that match the voiceover line by line. Then FFmpeg mixes the voice with the music, ducked by sidechain compression, and encodes H.264 + AAC.
