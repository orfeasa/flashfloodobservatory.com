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
- [`public/404.html`](public/404.html) is the public not-found page
- [`public/CNAME`](public/CNAME) keeps the custom domain with the site artifact

## Single payload rule

The public site is driven by one file only:

- [`public/data/site_payload.json`](public/data/site_payload.json)

All summary cards, charts, official alert content, notes, and footer partner entries should be inferred from that payload.

## Current public behaviour

The current site shell assumes:

- the observatory logo is used as the browser tab icon
- only `Last updated` and `Timezone` appear in the hero metadata
- published timestamps and chart axes are rendered in `site.timezone`
- the public dashboard currently renders 4 summary cards
- the public dashboard currently renders 2 note cards
- an official alert section below the notes renders Environment Agency flood-warning context when `official_alert` is present
- the rainfall panel renders 15-minute rainfall totals across the last 24 hours when `panels.rainfall.points` is populated
- rainfall and depth charts share the same exported start and end timestamps via `reporting_window`, so their x-axes and tick spacing stay aligned
- the depth panel is live from the operational sidecar
- the 24-hour river-level summary cards are intended to align with the plotted depth curve, because they are derived from the same cleaned 1-minute median series
- the rainfall panel stays hidden when `panels.rainfall.points` is empty
- partner logos render as individual white cards in a single row rather than inside a boxed footer panel

## Payload shape

Top-level keys:

- `site`
- `status`
- `official_alert`
- `reporting_window`
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

### `official_alert`

- `eyebrow`
- `state`
- `label`
- `message`
- `severity_level`
- `severity`
- `updated_at`
- `source_name`
- `source_url`
- `api_url`
- `disclaimer`
- `count`
- optional `area_label`

This banner is supplementary official Environment Agency flood-warning context. It should not be presented as a bespoke flash-flood warning produced by the observatory.

### `reporting_window`

- `start_timestamp`
- `end_timestamp`

This aligns the rainfall and depth charts to the same x-axis window.

### `summary_metrics`

Array of cards, each with:

- `label`
- `value`
- `unit`
- `decimals`
- `signed`
- `note`

Current live meaning:

- current river level
- maximum 24h river level
- minimum 24h river level
- river level 24h range

### `panels.rainfall` and `panels.depth`

- `eyebrow`
- `title`
- `description`
- `y_axis_label`
- `points`
- `empty_message`

Rainfall also currently carries:

- `source_name`
- `source_url`
- `data_url`
- `station_id`
- `last_updated`

Point shape:

- `{ "timestamp": "2026-03-24T12:00:00Z", "value": 0.0 }`

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

GitHub Pages is configured in-repo via [`/.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

That workflow uploads only the contents of [`public/`](public) as the Pages artifact, so repository-root maintainer files are never part of the published site.

Operationally, the Wales PC sidecar updates this repository by syncing the local website clone, replacing `public/data/site_payload.json`, committing the payload change, and pushing it back to `main`.

Repository setting required:

- GitHub Pages -> Build and deployment -> Source -> `GitHub Actions`
