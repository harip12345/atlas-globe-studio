# Working in ATLAS Globe Studio

This directory contains the standalone globe video studio. Read `AUTOMATION.md` for commands and scene fields before making videos.

- Keep work inside this project; the parent Motion application is a separate app.
- For video requests, prefer creating or editing project JSON under `projects/` instead of changing the renderer. Use `scene()` and `validateProject()` from `public/model.js` to construct valid scenes.
- Set scene `transition` for camera speed, and `duration` for narration time. Fast transitions are usually 0.5 seconds; preserve narration duration unless the user asks to shorten the video. The supported transition range is 0.25–10 seconds; effective camera travel is capped at 72% of scene duration.
- Use `npm run agent -- validate projects/<name>.json` before rendering. Use a descriptive output path: `npm run agent -- render projects/<name>.json --out output/<name>.mp4 --quality final`.
- If voice-over is provided, pass its local path with `--audio`. Do not claim that voice was generated, facts were researched, or subtitles were speech-aligned unless that work actually happened.
- Models in this project are illustrations. Do not label them as actual buildings, photogrammetry, live satellite data, or accurate terrain.
- Region and color controls are documented in `AUTOMATION.md`. Use country IDs from `public/countries.js` and island IDs from `public/geography.js`; a whole island can cross national borders. Custom polygons use longitude first and must be closed. Geographic boundaries come from the bundled 1:50m dataset and are generalized.
- Extend procedural effects through `public/effects.js` and `EFFECT_TYPES` in `public/model.js`. Keep animations deterministic. Source/import any needed external assets before claiming they are supported. The local D3 bundle can be rebuilt with `npm run build:geo`.
- Confirm real-world factual claims and coordinates with appropriate sources when the video requires factual accuracy. The narrative helper only matches place names and does not research claims.
- After code changes, run relevant unit tests. For camera/editor/render changes, run `npm run check` and inspect affected frame PNGs or the rendered video. Avoid overwriting user-created projects, audio, and videos while doing verification.
- In the final response, give the video path, editable project JSON path, and relevant limitations. A video is complete only after rendering succeeds; do not report merely created JSON as a finished video.
