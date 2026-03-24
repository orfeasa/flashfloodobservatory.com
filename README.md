# Flash Flood Observatory Website

Maintainer-facing repository for `flashfloodobservatory.com`.

## Public boundary

Only the [`public/`](public) directory is intended to be published as the website.

Everything at the repository root is for maintenance only and should not be treated as public site content.

## Structure

- [`public/index.html`](public/index.html) defines the page shell
- [`public/styles.css`](public/styles.css) defines the presentation layer
- [`public/app.js`](public/app.js) reads the payload and renders the dashboard
- [`public/data/site_payload.json`](public/data/site_payload.json) is the single public data contract
- [`public/assets/brand`](public/assets/brand) contains static branding and partner imagery
- [`public/assets/mock`](public/assets/mock) contains temporary static imagery for layout/context panels
- [`public/404.html`](public/404.html) is the public not-found page
- [`public/CNAME`](public/CNAME) keeps the custom domain with the site artifact

## Single payload rule

The public site is driven by one file only:

- [`public/data/site_payload.json`](public/data/site_payload.json)

All summary cards, charts, context imagery, notes, and footer partner entries should be inferred from that payload.

## Payload shape

Top-level keys:

- `site`
- `status`
- `summary_metrics`
- `panels`
- `notes`
- `footer`

### `site`

- `eyebrow`
- `name`
- `location`
- `strapline`
- `timezone`
- `logo.src`
- `logo.alt`

### `status`

- `state`
- `message`
- `published_at`

### `summary_metrics`

Array of cards, each with:

- `label`
- `value`
- `unit`
- `decimals`
- `signed`
- `note`

### `panels.rainfall` and `panels.depth`

- `eyebrow`
- `title`
- `description`
- `y_axis_label`
- `points`
- `empty_message`

Point shape:

- `{ "timestamp": "2026-03-24T12:00:00Z", "value": 0.0 }`

### `panels.time_to_peak`

- `eyebrow`
- `title`
- `description`
- `y_axis_label`
- `points`
- `empty_message`

Point shape:

- `{ "label": "Event 01", "value": 1.5 }`

### `panels.context`

- `eyebrow`
- `title`
- `description`
- `image`
- `alt`
- `caption`
- `empty_message`

### `notes`

Array of note cards:

- `label`
- `text`

### `footer`

- `title`
- `text`
- `partners`

Partner shape:

- `name`
- `logo`
- `href`

## Operational boundary

This repository is for curated public outputs only.

Do not expose:

- internal machine names
- Windows drive letters or private paths
- raw or private observatory data
- email or alerting logic
- operational-only implementation details

## Publishing

GitHub Pages should publish only the contents of [`public/`](public), either by using that folder as the publishing source or by uploading it as the Pages artifact in a workflow.
