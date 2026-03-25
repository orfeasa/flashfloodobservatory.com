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

All summary cards, charts, notes, and footer partner entries should be inferred from that payload.

## Current public behaviour

The current site shell assumes:

- the observatory logo is used as the browser tab icon
- only `Last updated` and `Timezone` appear in the hero metadata
- the public dashboard currently renders 4 summary cards
- the public dashboard currently renders 2 note cards
- the depth panel is live from the operational sidecar
- the rainfall panel stays hidden when `panels.rainfall.points` is empty

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

Current live meaning:

- current river depth
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

## Current known gap

The rainfall panel is part of the public payload contract, but it is not live yet.

Current state:

- `panels.depth.points` is populated from the operational sidecar
- `panels.rainfall.points` is still empty
- the next data integration task is to populate rainfall for station `49149` from the operational exporter
- when `panels.rainfall.points` is empty, the website hides the rainfall panel instead of showing an empty placeholder chart

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
