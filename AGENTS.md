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
- Keep the partner logos as individual white cards without wrapping them in an extra boxed footer panel
- Keep the public dashboard limited to defined panels only. Do not add placeholder panels that the data pipeline cannot support.
- Treat `official_alert` as supplementary official Environment Agency warning context, not as an observatory-generated flash-flood alert.
- Supported `official_alert.state` values are `none`, `flood_alert`, `flood_warning`, `severe_flood_warning`, `warning_no_longer_in_force`, and `unavailable`.
- `panels.rainfall` should reflect Environment Agency station `49149` when the sidecar has data.
- If `panels.rainfall.points` is empty, keep the rainfall panel hidden rather than rendering an empty chart panel.
- The current public site shape is 5 summary cards, 3 notes, 1 official alert section below the notes, a plain single-row partner logo strip, a top operational chart row, a second analysis row, and a full-width historical heatmap panel beneath it.
- Keep the shared `24 hours` / `5 days` chart toggle above the two graphs, not duplicated inside individual panels.
- Keep chart copy payload-driven: rainfall, river-level, and Event Analysis panels can swap description text by window, and Event Analysis plus the historical scatter and heatmap can also render payload-provided footer text below the chart.
- Keep the 24-hour river-level summary cards aligned with the visible chart by treating the cleaned depth series as the source of truth for both, using a trailing 24-hour window ending at the latest observation.
- Keep rainfall and depth charts locked to the same exported window from `reporting_windows` so their x-axes match exactly in both modes.
- Keep `analysis_panels.response` payload-driven. When `response.points` are present, render a real river-flow line against rainfall bars, keep only the yellow panel heading visible, and label the right axis as `Flow Rate`; otherwise show the payload-provided placeholder message.
- Treat `analysis_panels.historical_range` as the only source for the deployment-to-date peak-vs-range scatter chart, with completed-day 24h water depth range on the x-axis and completed-day maximum 24h water depth on the y-axis.
- Treat `analysis_panels.level_heatmap` as the only source for the historical river-level heatmap, including its average label, calendar cells, and legend values.
- Heatmap colours should reflect each completed day's maximum river level as a stepped percent of the observatory-wide average carried in that same payload, with 20-point legend bands up to 450% and a blue-to-purple high-end palette that avoids black.
- The fifth summary card should reflect the all-time max 24h range record from the payload, not a client-side recomputation.

Operational intent:

- something running on the operational Windows side should generate the payload
- that same sidecar currently syncs a local website repo clone, updates `public/data/site_payload.json`, and pushes back to GitHub
- the public website should consume only the curated payload and static assets
- do not assume the operational Windows machine can auto-update files outside its checked-out sidecar repo
