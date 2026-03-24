# Website Maintenance Notes

This repository has a hard public boundary:

- only [`public/`](public) is deployable website content
- root files like [`README.md`](README.md) and this file are maintainer-only

Rules for future changes:

- Keep the site static and driven by one payload only: [`public/data/site_payload.json`](public/data/site_payload.json)
- Do not add public dependencies on internal machine names, private paths, raw storage, or legacy operational scripts
- Do not surface alerting/email workflows on the public site
- Prefer adding new public values to the payload rather than hard-coding content in HTML
- If the payload schema changes, update [`public/app.js`](public/app.js), [`public/index.html`](public/index.html), and [`README.md`](README.md) together
- Keep partner logos on a light backing so the dark University of Greenwich mark remains visible
- Treat [`public/assets/mock`](public/assets/mock) as temporary until replaced with final public graphics

Operational intent:

- something running on the operational Windows side should eventually generate the payload
- the public website should consume only the curated payload and static assets
