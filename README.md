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
- the public dashboard currently renders 5 summary cards
- the public dashboard currently renders 3 note cards
- an official alert section below the notes renders Environment Agency flood-warning context when `official_alert` is present
- the rainfall and river-level charts share a single `24 hours` / `5 days` toggle above the dashboard grid
- a second analysis row sits beneath the operational charts
- the first analysis panel is currently a placeholder for future flow-rate event analysis and stays visible with window-specific copy even while it is empty
- the second analysis panel shows the daily maximum rolling 24h river-level range over the last 30 days
- a full-width historical heatmap sits below the analysis row and shows each day's smoothed maximum river level as a percentage difference from the observatory-wide average since deployment
- only the third description line under each chart changes with the selected window
- the rainfall panel renders 15-minute rainfall totals across the last 5 days when `panels.rainfall.points` is populated
- rainfall and depth charts use the selected exported window from `reporting_windows`, so their x-axes and tick spacing stay aligned in both modes
- the depth panel is live from the operational sidecar
- the 24-hour river-level summary cards are intended to align with the plotted depth curve, because they are derived from the same cleaned 1-minute median series
- the rainfall panel stays hidden when `panels.rainfall.points` is empty
- partner logos render as individual white cards in a single row rather than inside a boxed footer panel

## Payload shape

Top-level keys:

- `site`
- `status`
- `official_alert`
- `default_time_window`
- `time_windows`
- `reporting_window`
- `reporting_windows`
- `summary_metrics`
- `panels`
- `analysis_panels`
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

Supported `official_alert.state` values are `none`, `flood_alert`, `flood_warning`, `severe_flood_warning`, `warning_no_longer_in_force`, and `unavailable`.

### `default_time_window`

- string id for the default chart mode, currently `24h`

### `time_windows`

Array of chart toggle options, each with:

- `id`
- `label`

### `reporting_window`

- `start_timestamp`
- `end_timestamp`

This remains the default 24-hour compatibility window.

### `reporting_windows`

Object keyed by window id, currently:

- `24h.start_timestamp`
- `24h.end_timestamp`
- `5d.start_timestamp`
- `5d.end_timestamp`

The website uses these values to keep the rainfall and depth charts on the same x-axis window while switching between 24 hours and 5 days.

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
- current 24h river level range
- maximum recorded 24h river level range

### `panels.rainfall` and `panels.depth`

- `eyebrow`
- `title`
- `description`
- `descriptions.24h`
- `descriptions.5d`
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

### `analysis_panels`

- `response.eyebrow`
- `response.title`
- `response.description`
- `response.rainfall_y_axis_label`
- `response.depth_y_axis_label`
- `response.empty_message`
- `historical_range.eyebrow`
- `historical_range.title`
- `historical_range.description`
- `historical_range.y_axis_label`
- `historical_range.points`
- `historical_range.empty_message`
- `historical_range.window_days`
- `level_heatmap.eyebrow`
- `level_heatmap.title`
- `level_heatmap.description`
- `level_heatmap.average_label`
- `level_heatmap.average_level_m`
- `level_heatmap.deployment_label`
- `level_heatmap.x_axis_label`
- `level_heatmap.y_axis_label`
- `level_heatmap.weekday_labels`
- `level_heatmap.month_ticks[]`
- `level_heatmap.cells[]`
- `level_heatmap.legend`
- `level_heatmap.empty_message`

The website currently treats `analysis_panels.response` as a placeholder panel for future flow-rate work, while `historical_range.points` and `level_heatmap` both come directly from the sidecar payload. The heatmap colours represent each day's smoothed maximum river level as a stepped percent difference from the observatory-wide average carried in the same payload, with 20-point legend bands.

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
