# Demo video v3 (29.5 s, 1080×1920, H.264 + AAC)

Output: `operation-cosmoform-demo.mp4` in the play repo at `demo/operation-cosmoform-demo.mp4`.

## Pipeline
1. **Gameplay capture** (`capture-clips-v3.js`). Playwright drives the built game under a virtual clock: `clock.install`, then `runFor` once per frame, with CSS animations stepped by hand. A camera director hooks `World.camUpdate` to shoot:
   - an orbit-and-rack into the swarm
   - a push-out from the surface of Ceres, which is the match cut
   - low tracking on the Marauder
   - a solar zoom-out
   - a log-scale flight from 0.004 ly to the galaxy
   - follow-cam on the uncrewed Marauder's Daughter servicing at a relay depot
   - the end card

   Usage: `node capture-clips-v3.js <clip> <seconds>`, with the game served on :8765.
2. **Cartoon interlude (5.85 s)**. This is an original design, AI-generated in a 1980s hand-painted laserdisc-cartoon style:
   - GenerateImage made a turnaround design sheet (`daughter-design-sheet.jpg`).
   - GenerateImage then made a painted 9:16 launch key frame (`daughter-launch-key.jpg`).
   - GenerateVideo turned the key frame into a 6 s clip (`daughter-cartoon-source.mp4`, with its audio dropped).

   The design has no text, insignia, or agency logos. No NASA or Space Apps logos appear anywhere.
3. **Compose** (`compose.py`, using ffmpeg):
   - per-clip encodes with a Ken Burns push on the title and studio
   - xfade transitions: zoom-through ×3, white flash, a 0.15 s match-cut dissolve, horizontal-blur whip pans ×2, and dissolves
   - a contrast/saturation/teal–orange grade and a vignette
   - caption PNGs whose text exactly matches the voiceover
4. **Audio**:
   - voiceover is edge-tts `en-US-AndrewNeural` at `--rate=+10%` (`vo/*.wav`)
   - the only music is the game's Stage 1 design-screen song, rendered from the game (see `../render-music.js`)
   - the music is sidechain-ducked under the voice, then loudnorm brings the mix to about −16 LUFS, true peak ≤ −1.5 dB

## Notes
- "NASA" appears only as plain text. The end card reads: "NASA Space Apps Challenge entry · not affiliated with or endorsed by NASA".
- The Marauder is the crewed belt ship. The Marauder's Daughter is the uncrewed interstellar ship, which is FUTURE TECH.
