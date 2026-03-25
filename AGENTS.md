# Website Maintenance Notes

This repository has a hard public boundary:

- only [`public/`](public) is deployable website content
- root files like [`README.md`](README.md) and this file are maintainer-only

Rules for future changes:

- Keep the site static and driven by one payload only: [`public/data/site_payload.json`](public/data/site_payload.json)
- Do not add public dependencies on internal machine names, private paths, raw storage, or legacy operational scripts
- Do not surface operational email workflows on the public site
- Prefer adding new public values to the payload rather than hard-coding content in HTML
- If the payload schema changes, update [`public/app.js`](public/app.js), [`public/index.html`](public/index.html), and [`README.md`](README.md) together
- Keep partner logos on a light backing so the dark University of Greenwich mark remains visible
- Keep the public dashboard limited to defined panels only. Do not add placeholder panels that the data pipeline cannot support.
- Treat `official_alert` as supplementary official Environment Agency warning context, not as an observatory-generated flash-flood alert.
- `panels.rainfall` should reflect Environment Agency station `49149` when the sidecar has data.
- If `panels.rainfall.points` is empty, keep the rainfall panel hidden rather than rendering an empty chart panel.
- The current public site shape is 4 summary cards, 2 notes, 1 official alert banner, and live rainfall plus depth panels when data is available.
- Keep the 24-hour river-level summary cards aligned with the visible chart by treating the cleaned depth series as the source of truth for both.

Operational intent:

- something running on the operational Windows side should generate the payload
- that same sidecar currently syncs a local website repo clone, updates `public/data/site_payload.json`, and pushes back to GitHub
- the public website should consume only the curated payload and static assets
- do not assume the operational Windows machine can auto-update files outside its checked-out sidecar repo
