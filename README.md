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
- [`public/v2`](public/v2) is an isolated redesign prototype that reads the same public payload without replacing the production homepage

## Single payload rule

The public site is driven by one file only:

- [`public/data/site_payload.json`](public/data/site_payload.json)

All summary cards, charts, official alert content, notes, and footer partner entries should be inferred from that payload.

## Redesign prototype

The parallel redesign is available at `/v2/`.

It is intentionally isolated:

- the production homepage remains `public/index.html`
- the publisher continues to update only `public/data/site_payload.json`
- `/v2/` reads that same payload using `../data/site_payload.json`
- no redirect or workflow change points public traffic at the prototype
- the prototype can be reviewed and revised independently before any explicit production cutover

### Professor review revision — 7 October 2026

The `/v3/` review now combines the production dark palette (cyan location and water depth, blue rainfall, yellow uppercase category labels) with V2 section bands and compact typography. The production homepage remains unchanged.

- Persistent section navigation and a separate observatory row identify Boscastle and two unconfirmed Cornwall locations. The latter are unavailable labels, not working data tabs; only Boscastle has a payload.
- One main title, an optimized 480px WebP logo (about 29 KB versus the 1.4 MB source), update/timezone metadata and a continuous statistics strip form the first desktop view.
- Both chart pairs use equal columns and stack at full width on narrow screens. Depth retains V1's 0.173 m minimum upper bound; flow retains its payload-provided minimum upper bound when supplied. Neither caps high events. Tooltips explicitly identify date/time, measurement, value and units.
- The heatmap derives calendar positions from the supplied water-year dates. October 2025 and other absent completed days are grey with a diagonal mark. Future dates remain blank. The annual dimensions and month labels remain consistent. Phones use four consecutive blocks of up to fourteen weeks, retaining the complete year without horizontal scrolling. A yellow outline encloses the selected week; the scale and selected-day detail sit below the calendar.
- Eight unboxed speaker controls cover introduction, the entire statistics strip, each of four graphs, heatmap, and all context columns. Narration expands units and 24h and removes repeated colour names. The existing British English audio build collects both homepage and V3 clips; day hover does not invalidate narration. Audio generation is still optional to publishing.
- The context heading is “Why is this catchment being observed?” Official EA status remains separate, with green reserved for the no-alert state and distinct warning/unavailable states.

Design choices for this review: use the existing recognizable blue logo with the cyan Boscastle location treatment. Do not invent location-specific identities before the two new locations are confirmed. Prefer a clear logo and text location over an additional UK map in the compact introduction; a map remains an optional follow-up, not a data or navigation dependency.

Validation: `npm test` includes V3 calendar, selection, scale, tooltip and narration regressions. `npm run audio:text` prepares clips for both variants; `python scripts/build_audio.py` builds them with the dependencies in `scripts/requirements-audio.txt`. Preview from `public/` and open `/v3/`. This revision is not a production cutover.

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
- the first analysis panel becomes a real Event Analysis chart when the sidecar includes flow points; it overlays rainfall bars when rainfall data is available and falls back to a flow-only line when the Environment Agency rainfall feed is temporarily unavailable; its white duplicate title is intentionally hidden so only the yellow heading remains
- the second analysis panel is a deployment-to-date scatter showing each completed day's daily water depth range on the x-axis against its corresponding maximum daily water depth on the y-axis
- that historical scatter should render the full deployment-to-date payload point set, with numeric x/y coercion and axis extents derived from the plotted points so high-event outliers remain visible
- a full-width historical heatmap sits below the analysis row and shows each completed day's maximum daily water depth as a percentage of the observatory-wide average since deployment, using a blue-to-purple high-end palette that avoids black for extreme values and an open-ended top legend band labelled `>450`
- missing heatmap days appear as grey squares with a diagonal line and a `No data` key; null or blank values are never treated as zero measurements
- the heatmap displays one hydrological year at a time (1 October through 30 September), with a selector that preserves access to earlier years without allowing the chart to widen indefinitely
- chart copy is payload-driven: rainfall, river-level, and Event Analysis panels can swap description text by window, and Event Analysis plus the historical scatter and heatmap can also render payload-provided footer text below the chart
- the rainfall panel renders 15-minute rainfall totals across the last 5 days when `panels.rainfall.points` is populated, and should also remain visible with a zero-valued series when the Environment Agency window contains no rainfall readings
- rainfall and depth charts use the selected exported window from `reporting_windows`, so their x-axes and tick spacing stay aligned in both modes
- the depth panel is live from the operational sidecar
- the 24-hour river-level summary cards are intended to align with the plotted depth curve, because they are derived from the same cleaned 1-minute median series using a trailing 24-hour window ending at the latest observation
- the fifth summary card is the all-time maximum recorded trailing 24-hour range from the payload, not a client-side recomputation
- the rainfall panel should remain visible even if `panels.rainfall.points` is empty, using the payload empty-state message when the rainfall feed is temporarily unavailable
- rainfall axes expand automatically for larger events but retain a minimum upper bound of 1 mm in both the observed rainfall and Event Analysis charts
- partner logos render as individual white cards in a single row rather than inside a boxed footer panel
- the footer also renders payload-driven public contact links such as LinkedIn

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
- maximum water depth over the trailing last 24 hours
- minimum water depth over the trailing last 24 hours
- water depth range over the trailing last 24 hours
- maximum recorded trailing 24-hour water-depth range since deployment, with its record date

These trailing 24-hour cards can legitimately differ from completed-day CSV summaries, because the dashboard metrics are rolling windows rather than midnight-to-midnight calendar days.

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
- `response.subtitle`
- `response.descriptions.24h`
- `response.descriptions.5d`
- `response.footer_description`
- `response.footer_descriptions.24h`
- `response.footer_descriptions.5d`
- `response.mode`
- `response.points`
- `response.rainfall_y_axis_label`
- `response.y_axis_label`
- `response.empty_message`
- `historical_range.eyebrow`
- `historical_range.title`
- `historical_range.subtitle`
- `historical_range.description`
- `historical_range.footer_description`
- `historical_range.x_axis_label`
- `historical_range.y_axis_label`
- `historical_range.points`
- `historical_range.empty_message`
- `level_heatmap.eyebrow`
- `level_heatmap.title`
- `level_heatmap.description`
- `level_heatmap.footer_description`
- `level_heatmap.average_label`
- `level_heatmap.average_level_m`
- `level_heatmap.deployment_label`
- `level_heatmap.x_axis_label`
- `level_heatmap.y_axis_label`
- `level_heatmap.weekday_labels`
- `level_heatmap.month_ticks[]`
- `level_heatmap.cells[]`
- `level_heatmap.default_hydrological_year`
- `level_heatmap.hydrological_years[].id`
- `level_heatmap.hydrological_years[].label`
- `level_heatmap.hydrological_years[].period_label`
- `level_heatmap.hydrological_years[].start_date`
- `level_heatmap.hydrological_years[].end_date`
- `level_heatmap.hydrological_years[].month_ticks[]`
- `level_heatmap.hydrological_years[].cells[]`
- `level_heatmap.legend`
- `level_heatmap.value_label`
- `level_heatmap.empty_message`

The website now treats `analysis_panels.response` as a payload-driven Event Analysis chart when `response.points` are present, while `historical_range` and `level_heatmap` both come directly from the sidecar payload. When rainfall points are also available, Event Analysis overlays rainfall bars against the river-flow line; when the rainfall feed is temporarily unavailable, the panel should remain visible as a flow-only line chart rather than disappearing with the rainfall panel. For rainfall itself, a successful Environment Agency query that returns no readings for the requested window should still render a zero-valued rainfall chart rather than hiding the panel, while real feed failures should leave the panel visible with its empty-state message. The historical scatter is deployment-to-date with `x = Daily Water Depth Range (m)` and `y = Maximum Daily Water Depth (m)`, and the frontend should coerce those values to numbers before plotting and derive the linear axis extents from the plotted point set so the largest events remain visible. The heatmap colours represent each day's maximum daily water depth as a stepped percent of the observatory-wide average carried in the same payload, with 20-point legend bands and an open-ended top legend label of `>450`, plus a blue-to-purple high-end palette chosen to avoid confusion with missing-data cells on the dark dashboard.

### `notes`

Array of note cards:

- `label`
- `text`

### `footer`

- `title`
- `text`
- `contact.title`
- `contact.items[]`
- `partners`

Contact item shape:

- `label`
- `value`
- `href`

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

## V1 display scale and read-aloud trial

The optional `panels.depth.minimum_axis_max` is 0.173 metres, a fixed display reference for this trial. `analysis_panels.response.minimum_axis_max` is Q at that same depth, interpolated by the producer using the same local rating curve as the flow series. It is null when the curve is unavailable or does not cover that depth. These are minimum upper bounds, not clipping limits: axes start at zero and expand for larger observations. Older payloads retain the 0.173 m depth fallback; flow stays automatic until the updated producer exports its bound. No discharge is guessed in the browser.

The scientific heatmap average is unchanged: total depth sum divided by total observation count across all completed-day aggregates since deployment. Each completed day's maximum is divided by that average for colouring, including after 1 October. The browser reserves 53 calendar-week columns for every year, preserving the prior full-year dimensions without filling future days with invented data.

V1 megaphone controls play site-owned British-English MP3 narration of visible section text and plain-English chart/colour explanations. The website build generates these assets from the curated payload; no voice installation, speech API key or Windows-side speech dependency is required. Clicking again stops playback; selecting another section or changing the chart window/year cancels previous audio. V2 is unchanged.

### Site-owned British narration

The Pages build renders the trusted v1 HTML, CSS and JavaScript in JSDOM (without external resources), enumerates both time windows and every water year, then generates MP3s from `readAloudText`. The browser uses the same text function. Filenames hash the exact normalised text and voice version, so a recording for older readings cannot be selected for new readings. There is no second scientific data feed and no public speech service or model download.

Voice: **Cori medium, English (Great Britain), female**, generated with Piper 1.3.0. The [voice model card](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/en/en_GB/cori/medium/MODEL_CARD) identifies public-domain LibriVox source recordings. The model is pinned to that revision; Piper is a GPL-3.0 build dependency, not shipped to visitors. LAME encodes the generated PCM as 64 kbps mono MP3. Generation runs locally or on the existing GitHub Actions runner, with no per-request speech API charge (normal Actions/storage usage still applies).

For a local preview, from this repository:

```sh
npm ci --ignore-scripts
python3.12 -m venv .cache/audio-venv
.cache/audio-venv/bin/pip install -r scripts/requirements-audio.txt
npm run audio:text
.cache/audio-venv/bin/python scripts/build_audio.py
npm test
python3 -m http.server 8769 --bind 127.0.0.1 --directory public
```

Only `public/assets/audio/*.mp3` is served; models and synthesis dependencies remain under `.cache/`. Generated audio is ignored by Git and recreated for the Pages artifact. The build caches unchanged clips and the model separately, regenerates changed text, and copies only the current complete clip set into the public artifact. Bump `readAloudAudioVersion` in `public/app.js` and `VERSION` in `scripts/build_audio.py` together when synthesis changes.

Audio generation has a five-minute limit and is optional to publishing: if it fails, the latest observations still deploy, with a CI warning and a clear playback-unavailable message. Never retain a stale scientific payload just to preserve audio. Browsers still need ordinary audio playback support and an internet connection to load clips. Audible voice quality should be reviewed using the local preview before publication.
