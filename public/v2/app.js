const payloadPath = "../data/site_payload.json";
const fallbackWindowOption = { id: "24h", label: "24 hours" };

const chartPalette = {
  river: "#00838a",
  riverFill: "rgba(0, 131, 138, 0.12)",
  rain: "#2f6fd6",
  rainFill: "rgba(47, 111, 214, 0.24)",
  moss: "#6a49b8",
  ink: "#17263d",
  muted: "#5b6b80",
  grid: "#d6deea",
  paper: "#ffffff",
};

let dashboardPayload;
let timeWindowState;
let selectedTimeWindowId = fallbackWindowOption.id;
let selectedHydrologicalYearId;
let rainfallChart;
let depthChart;
let responseChart;
let historicalRangeChart;
let displayTimeZone = "UTC";

async function main() {
  try {
    const response = await fetch(payloadPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`The public data feed returned ${response.status}.`);
    }

    dashboardPayload = await response.json();
    timeWindowState = buildTimeWindowState(
      dashboardPayload,
      dashboardPayload.panels || {}
    );
    selectedTimeWindowId = timeWindowState.defaultId;

    applyHero(dashboardPayload.site || {}, dashboardPayload.status || {});
    renderOfficialAlert(dashboardPayload.official_alert || {});
    renderSummaryMetrics(dashboardPayload.summary_metrics || []);
    renderTimeWindowSwitcher(timeWindowState);
    renderDashboardPanels();
    renderAnalysisPanels();
    renderNotes(dashboardPayload.notes || []);
    renderFooter(dashboardPayload.footer || {});
    restoreAnchorAfterRender();
  } catch (error) {
    console.error(error);
    applyErrorState(error);
  }
}

function restoreAnchorAfterRender() {
  const anchorId = window.location.hash.slice(1);
  if (!anchorId) {
    return;
  }
  const target = document.getElementById(anchorId);
  if (!target) {
    return;
  }
  const restore = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    });
  };
  if (document.fonts?.ready) {
    document.fonts.ready.then(restore);
  } else {
    restore();
  }
}

function applyHero(site, status) {
  text("heroEyebrow", site.eyebrow || "Flash Flood Observatory");
  text("siteNameLine", site.name || "Flash Flood Observatory");
  text("siteLocationLine", site.location || "");
  text("headerSiteNameLine", site.name || "Flash Flood Observatory");
  text("headerSiteLocationLine", site.location || "");
  text("heroStrapline", site.strapline || "Public dashboard");

  document.getElementById("siteLocationLine").hidden = !site.location;
  document.getElementById("headerSiteLocationLine").hidden = !site.location;

  displayTimeZone = site.timezone || "UTC";
  const titleBits = [site.name, site.location].filter(Boolean);
  document.title = titleBits.join(" — ");

  const mark = document.getElementById("siteMark");
  if (site.logo?.src) {
    mark.src = publicAssetPath(site.logo.src);
  }
  if (site.logo?.alt) {
    mark.alt = site.logo.alt;
  }

  const badges = [
    {
      label: "Last updated",
      value: status.published_at
        ? formatDate(status.published_at)
        : "Not yet published",
    },
    {
      label: "Timezone",
      value: site.timezone || "UTC",
    },
  ];
  document
    .getElementById("heroMeta")
    .replaceChildren(...badges.map(renderMetaChip));
}

function renderMetaChip(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "meta-chip";

  const label = document.createElement("span");
  label.className = "chip-label";
  label.textContent = item.label;

  const value = document.createElement("strong");
  value.textContent = item.value;

  wrapper.append(label, value);
  return wrapper;
}

function renderOfficialAlert(alert) {
  const banner = document.getElementById("officialAlert");
  if (!alert || (!alert.state && !alert.label)) {
    banner.hidden = true;
    return;
  }

  const state =
    typeof alert.state === "string" ? alert.state : "unavailable";
  banner.hidden = false;
  banner.className = `official-alert official-alert--${state.replaceAll("_", "-")}`;

  text(
    "officialAlertEyebrow",
    alert.eyebrow || "Official Environment Agency status"
  );
  text(
    "officialAlertTitle",
    alert.label || "Official flood status is temporarily unavailable."
  );
  text(
    "officialAlertMessage",
    alert.message || alert.disclaimer || ""
  );
  text(
    "officialAlertUpdated",
    alert.updated_at ? `Updated ${formatDate(alert.updated_at)}` : ""
  );

  const source = document.getElementById("officialAlertSource");
  if (alert.source_url) {
    source.hidden = false;
    source.href = alert.source_url;
    source.textContent =
      alert.source_name || "View the official flood status";
  } else {
    source.hidden = true;
    source.removeAttribute("href");
    source.textContent = "";
  }
}

function renderSummaryMetrics(metrics) {
  const strip = document.getElementById("summaryStrip");
  const safeMetrics = metrics.length
    ? metrics
    : [
        {
          label: "Public feed",
          value: null,
          note: "No published metrics are available yet.",
        },
      ];

  strip.replaceChildren(...safeMetrics.map(renderSummaryCard));

  const current =
    metrics.find((metric) => metric.label === "Current River Level") ||
    metrics[0];
  text("currentReadingValue", formatMetricValue(current));
  text(
    "currentReadingNote",
    current?.note || "The latest river observation from the public feed."
  );
}

function renderSummaryCard(metric) {
  const card = document.createElement("article");
  card.className = "summary-card";
  if (metric.label === "Current River Level") {
    card.classList.add("summary-card--current");
  }

  const label = document.createElement("p");
  label.className = "section-label";
  label.textContent = metric.label || "Metric";

  const value = document.createElement("p");
  value.className = "summary-value";
  value.textContent = formatMetricValue(metric);

  const note = document.createElement("p");
  note.className = "summary-note";
  note.textContent = metric.note || "";

  card.append(label, value, note);
  return card;
}

function formatMetricValue(metric) {
  if (
    !metric ||
    metric.value === null ||
    metric.value === undefined ||
    metric.value === ""
  ) {
    return "Awaiting data";
  }

  const numeric = Number(metric.value);
  if (!Number.isFinite(numeric)) {
    return String(metric.value);
  }

  const decimals = Number.isFinite(metric.decimals) ? metric.decimals : 0;
  const sign = metric.signed && numeric > 0 ? "+" : "";
  const unit = metric.unit ? ` ${metric.unit}` : "";
  return `${sign}${numeric.toFixed(decimals)}${unit}`;
}

function renderTimeWindowSwitcher(state) {
  const switcher = document.getElementById("windowSwitcher");
  const controls = document.getElementById("windowSwitcherControls");

  if (!state.options.length || state.options.length === 1) {
    switcher.hidden = true;
    controls.replaceChildren();
    return;
  }

  switcher.hidden = false;
  controls.replaceChildren(
    ...state.options.map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "window-button";
      button.dataset.windowId = option.id;
      button.textContent = option.label;
      button.addEventListener("click", () => {
        if (selectedTimeWindowId === option.id) {
          return;
        }
        selectedTimeWindowId = option.id;
        updateTimeWindowButtons();
        renderDashboardPanels();
        renderAnalysisPanels();
      });
      return button;
    })
  );
  updateTimeWindowButtons();
}

function updateTimeWindowButtons() {
  document.querySelectorAll(".window-button").forEach((button) => {
    const active = button.dataset.windowId === selectedTimeWindowId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderDashboardPanels() {
  const panels = dashboardPayload?.panels || {};
  const reportingWindow = timeWindowState.windows[selectedTimeWindowId];
  const rainfall = panelForWindow(
    panels.rainfall || {},
    selectedTimeWindowId,
    reportingWindow
  );
  const depth = panelForWindow(
    panels.depth || {},
    selectedTimeWindowId,
    reportingWindow
  );

  renderPanelCopy("rainfall", rainfall);
  renderPanelCopy("depth", depth);
  renderContextChip("rainfallContextChip", currentWindowLabel());
  renderContextChip("depthContextChip", currentWindowLabel());
  togglePanel(
    "rainfallPanel",
    Boolean(
      rainfall.points?.length ||
        rainfall.title ||
        rainfall.description ||
        rainfall.empty_message
    )
  );
  togglePanel("depthPanel", Boolean(depth.points?.length));
  renderRainfallChart(rainfall, reportingWindow);
  renderDepthChart(depth, reportingWindow);
}

function renderAnalysisPanels() {
  const panels = dashboardPayload?.panels || {};
  const analysis = dashboardPayload?.analysis_panels || {};
  const reportingWindow = timeWindowState.windows[selectedTimeWindowId];
  const rainfall = panelForWindow(
    panels.rainfall || {},
    selectedTimeWindowId,
    reportingWindow
  );
  const response = panelForWindow(
    analysis.response || {},
    selectedTimeWindowId,
    reportingWindow
  );
  const historical = analysis.historical_range || {};
  const heatmap = analysis.level_heatmap || {};

  renderPanelCopy("response", response);
  renderPanelCopy("historicalRange", historical);
  renderContextChip("responseContextChip", currentWindowLabel());

  const responseVisible =
    response.mode === "placeholder"
      ? Boolean(
          response.title ||
            response.subtitle ||
            response.description ||
            response.empty_message
        )
      : Boolean(response.points?.length);
  const historicalVisible = Boolean(historical.points?.length);

  togglePanel("responsePanel", responseVisible);
  togglePanel("historicalRangePanel", historicalVisible);
  document.getElementById("analysisGrid").hidden =
    !responseVisible && !historicalVisible;

  renderResponseChart(response, rainfall, reportingWindow);
  renderHistoricalRangeChart(historical);
  renderLevelHeatmap(heatmap);
}

function panelForWindow(panel, windowId, reportingWindow) {
  return {
    ...panel,
    description: panel.descriptions?.[windowId] || panel.description || "",
    footer_description:
      panel.footer_descriptions?.[windowId] ||
      panel.footer_description ||
      "",
    points: filterPoints(panel.points || [], reportingWindow),
  };
}

function filterPoints(points, reportingWindow) {
  if (!reportingWindow) {
    return points;
  }
  return points.filter((point) => {
    const timestamp = toEpochMs(point.timestamp);
    return (
      Number.isFinite(timestamp) &&
      timestamp >= reportingWindow.start &&
      timestamp <= reportingWindow.end
    );
  });
}

function renderPanelCopy(prefix, panel) {
  optionalText(`${prefix}Eyebrow`, panel.eyebrow);
  optionalText(`${prefix}Title`, panel.title);
  optionalText(`${prefix}Subtitle`, panel.subtitle);
  optionalText(`${prefix}Description`, panel.description);
  optionalText(`${prefix}FooterDescription`, panel.footer_description);
}

function optionalText(id, value) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }
  node.textContent = value || "";
  node.hidden = !value;
}

function renderContextChip(id, value) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }
  node.textContent = value || "";
  node.hidden = !value;
}

function currentWindowLabel() {
  return (
    timeWindowState.options.find(
      (option) => option.id === selectedTimeWindowId
    )?.label || fallbackWindowOption.label
  );
}

function renderRainfallChart(panel, reportingWindow) {
  const points = panel.points || [];
  if (!points.length) {
    rainfallChart?.destroy();
    showEmptyChart(
      "rainfall",
      panel.empty_message || "Rainfall data is temporarily unavailable."
    );
    return;
  }

  hideEmptyChart("rainfall");
  rainfallChart?.destroy();
  rainfallChart = new Chart(document.getElementById("rainfallChart"), {
    type: "bar",
    data: {
      datasets: [
        rainfallDataset(
          points,
          panel.y_axis_label || "Rainfall (mm)"
        ),
      ],
    },
    options: standardChartOptions(
      reportingWindow,
      panel.y_axis_label || "Rainfall (mm)",
      1
    ),
  });
}

function rainfallDataset(points, label, axis = "y") {
  return {
    type: "bar",
    label,
    data: points.map((point) => ({
      x: toEpochMs(point.timestamp),
      y: Number(point.value),
    })),
    parsing: false,
    yAxisID: axis,
    backgroundColor: chartPalette.rainFill,
    borderColor: chartPalette.rain,
    borderWidth: 1.2,
    borderRadius: 2,
    barThickness: "flex",
    maxBarThickness: 30,
    inflateAmount: 0,
  };
}

function renderDepthChart(panel, reportingWindow) {
  const points = panel.points || [];
  if (!points.length) {
    depthChart?.destroy();
    showEmptyChart(
      "depth",
      panel.empty_message || "No river-level data has been published yet."
    );
    return;
  }

  hideEmptyChart("depth");
  depthChart?.destroy();
  depthChart = new Chart(document.getElementById("depthChart"), {
    type: "line",
    data: {
      datasets: [
        {
          label: panel.y_axis_label || "Water depth (m)",
          data: points.map((point) => ({
            x: toEpochMs(point.timestamp),
            y: Number(point.value),
          })),
          parsing: false,
          borderColor: chartPalette.river,
          backgroundColor: chartPalette.riverFill,
          borderWidth: 2.4,
          fill: true,
          tension: 0.22,
          pointRadius: 0,
        },
      ],
    },
    options: standardChartOptions(
      reportingWindow,
      panel.y_axis_label || "Water depth (m)"
    ),
  });
}

function renderResponseChart(panel, rainfallPanel, reportingWindow) {
  if (panel.mode === "placeholder") {
    responseChart?.destroy();
    showEmptyChart(
      "response",
      panel.empty_message ||
        "Event analysis will appear after a rating curve is available."
    );
    return;
  }

  const flowPoints = panel.points || [];
  if (!flowPoints.length) {
    responseChart?.destroy();
    showEmptyChart(
      "response",
      panel.empty_message || "Event analysis is temporarily unavailable."
    );
    return;
  }

  hideEmptyChart("response");
  responseChart?.destroy();
  const rainfallPoints = rainfallPanel.points || [];
  const hasRainfall = rainfallPoints.length > 0;
  const datasets = [];

  if (hasRainfall) {
    datasets.push(
      rainfallDataset(
        rainfallPoints,
        panel.rainfall_y_axis_label || "Rainfall (mm)",
        "yRain"
      )
    );
  }

  datasets.push({
    type: "line",
    label: panel.y_axis_label || "Flow rate (m³/s)",
    data: flowPoints.map((point) => ({
      x: toEpochMs(point.timestamp),
      y: Number(point.value),
    })),
    parsing: false,
    yAxisID: "yFlow",
    borderColor: chartPalette.river,
    borderWidth: 2.3,
    pointRadius: 0,
    tension: 0.22,
  });

  responseChart = new Chart(document.getElementById("responseChart"), {
    data: { datasets },
    options: responseChartOptions(
      reportingWindow,
      panel.rainfall_y_axis_label || "Rainfall (mm)",
      panel.y_axis_label || "Flow rate (m³/s)",
      hasRainfall
    ),
  });
}

function renderHistoricalRangeChart(panel) {
  const points = (panel.points || [])
    .map((point) => ({
      x: Number(point.x),
      y: Number(point.y),
      date: point.date,
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (!points.length) {
    historicalRangeChart?.destroy();
    showEmptyChart(
      "historicalRange",
      panel.empty_message || "Historical context is not available yet."
    );
    return;
  }

  hideEmptyChart("historicalRange");
  historicalRangeChart?.destroy();
  historicalRangeChart = new Chart(
    document.getElementById("historicalRangeChart"),
    {
      type: "scatter",
      data: {
        datasets: [
          {
            label:
              panel.subtitle || "Daily range and peak levels",
            data: points,
            parsing: false,
            pointBackgroundColor: chartPalette.moss,
            pointBorderColor: chartPalette.paper,
            pointBorderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 5,
          },
        ],
      },
      options: scatterOptions(
        points,
        panel.x_axis_label || "Daily water-depth range (m)",
        panel.y_axis_label || "Maximum daily water depth (m)"
      ),
    }
  );
}

function renderLevelHeatmap(panel) {
  const wrapper = document.getElementById("levelHeatmapPanel");
  const yearState = hydrologicalYearState(panel);
  const selectedYear =
    yearState.years.find(
      (year) => year.id === selectedHydrologicalYearId
    ) ||
    yearState.years.find((year) => year.id === yearState.defaultId) ||
    yearState.years[0];
  const selectedPanel = selectedYear
    ? {
        ...panel,
        cells: selectedYear.cells,
        month_ticks: selectedYear.month_ticks,
      }
    : panel;
  const cells = Array.isArray(selectedPanel?.cells)
    ? selectedPanel.cells
    : [];
  const hasPanel = Boolean(
    panel?.title || panel?.eyebrow || panel?.empty_message || cells.length
  );

  wrapper.hidden = !hasPanel;
  renderHydrologicalYearControl(yearState, selectedYear);
  if (!hasPanel) {
    return;
  }

  optionalText(
    "levelHeatmapEyebrow",
    panel.eyebrow || "River-level history"
  );
  optionalText(
    "levelHeatmapTitle",
    panel.title || "% of Flash Flood Observatory average"
  );
  optionalText("levelHeatmapDescription", panel.description);
  optionalText(
    "levelHeatmapFooterDescription",
    panel.footer_description
  );
  optionalText("levelHeatmapAverage", panel.average_label);

  const mount = document.getElementById("levelHeatmapMount");
  const empty = document.getElementById("levelHeatmapEmpty");
  if (!cells.length) {
    mount.innerHTML = "";
    mount.hidden = true;
    empty.hidden = false;
    empty.textContent =
      panel.empty_message ||
      "Historical heatmap data will appear after the record is built.";
    return;
  }

  mount.hidden = false;
  empty.hidden = true;
  mount.innerHTML = heatmapSvg(selectedPanel);
}

function hydrologicalYearState(panel) {
  const explicit = Array.isArray(panel?.hydrological_years)
    ? panel.hydrological_years.filter(
        (year) => year?.id && Array.isArray(year.cells)
      )
    : [];
  const years = explicit.length
    ? explicit
    : Array.isArray(panel?.cells) && panel.cells.length
      ? [
          {
            id: "all",
            label: "All available data",
            period_label: "",
            cells: panel.cells,
            month_ticks: panel.month_ticks || [],
          },
        ]
      : [];
  const defaultId = years.some(
    (year) => year.id === panel?.default_hydrological_year
  )
    ? panel.default_hydrological_year
    : years[years.length - 1]?.id;

  if (
    !years.some((year) => year.id === selectedHydrologicalYearId)
  ) {
    selectedHydrologicalYearId = defaultId;
  }
  return { years, defaultId };
}

function renderHydrologicalYearControl(state, selectedYear) {
  const control = document.getElementById("heatmapPeriodControl");
  const select = document.getElementById("heatmapPeriodSelect");
  const label = document.getElementById("heatmapPeriodLabel");

  control.hidden = !state.years.length;
  if (!state.years.length) {
    select.replaceChildren();
    label.textContent = "";
    return;
  }

  select.replaceChildren(
    ...state.years.map((year) => {
      const option = document.createElement("option");
      option.value = year.id;
      option.textContent = year.label || year.id;
      return option;
    })
  );
  select.value = selectedYear?.id || state.defaultId || "";
  select.disabled = state.years.length <= 1;
  label.textContent = selectedYear?.period_label || "";
  select.onchange = () => {
    selectedHydrologicalYearId = select.value;
    renderLevelHeatmap(
      dashboardPayload?.analysis_panels?.level_heatmap || {}
    );
  };
}

function heatmapSvg(panel) {
  const cells = (panel.cells || []).filter(
    (cell) =>
      Number.isFinite(Number(cell.week_index)) &&
      Number.isFinite(Number(cell.weekday_index))
  );
  if (!cells.length) {
    return "";
  }

  const weekdays =
    Array.isArray(panel.weekday_labels) && panel.weekday_labels.length
      ? panel.weekday_labels
      : [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
  const ticks = Array.isArray(panel.month_ticks)
    ? panel.month_ticks
    : [];
  const legend = panel.legend || {};
  const edges =
    Array.isArray(legend.tick_values) && legend.tick_values.length
      ? legend.tick_values
          .map(Number)
          .filter((value) => Number.isFinite(value))
      : [30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230, 250, 270, 290, 310, 330, 350, 370, 390, 410, 430, 450];
  const fallbackColors = [
    "#6B3A09", "#8B5618", "#B9823A", "#F4F5F1", "#EEF3FF",
    "#E4ECFF", "#D9E4FF", "#CDD9FF", "#BFCFFF", "#B0C3FF",
    "#A0B6FF", "#8FA6FF", "#7A92F5", "#647BEA", "#4C65DE",
    "#3550D2", "#5147C8", "#6C4DCD", "#8757D8", "#A26BE6",
    "#BC82F2",
  ];
  const colors =
    Array.isArray(legend.band_colors) &&
    legend.band_colors.length === edges.length - 1
      ? legend.band_colors
      : fallbackColors;

  const maxWeek = Math.max(
    ...cells.map((cell) => Number(cell.week_index))
  );
  const size = 18;
  const gap = 2;
  const step = size + gap;
  const gridWidth = (maxWeek + 1) * step - gap;
  const gridHeight = 7 * step - gap;
  const gridX = 98;
  const gridY = 14;
  const legendWidth = 30;
  const legendX = gridX + gridWidth + 44;
  const legendHeight = gridHeight;
  const bandHeight = legendHeight / colors.length;
  const monthY = gridY + gridHeight + 26;
  const axisY = monthY + 26;
  const width = legendX + legendWidth + 130;
  const height = axisY + 24;

  const cellMarkup = cells
    .map((cell) => {
      const x = gridX + Number(cell.week_index) * step;
      const y = gridY + Number(cell.weekday_index) * step;
      const percent = Number(cell.percent_of_average);
      const level = Number(cell.max_level_m);
      const difference = Number(cell.difference_from_average_m);
      const fill = Number.isFinite(percent)
        ? heatmapColor(percent, edges, colors)
        : "#e6e3da";
      const missing = Number.isFinite(percent)
        ? ""
        : " level-heatmap-cell--missing";
      const tooltip = [
        cell.date_label || cell.date || "",
        Number.isFinite(level)
          ? `Maximum level: ${level.toFixed(3)} m`
          : "No daily maximum available",
        Number.isFinite(percent)
          ? `${percent.toFixed(1)}% of observatory average`
          : "",
        Number.isFinite(difference)
          ? `Difference from average: ${signed(difference, 3)} m`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      return `<rect class="level-heatmap-cell${missing}" x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="${fill}"><title>${escapeHtml(tooltip)}</title></rect>`;
    })
    .join("");

  const weekdayMarkup = weekdays
    .map((label, index) => {
      const y = gridY + index * step + size / 2 + 4;
      return `<text class="level-heatmap-axis" x="${gridX - 14}" y="${y}" text-anchor="end">${escapeHtml(label)}</text>`;
    })
    .join("");

  const monthMarkup = ticks
    .map((tick) => {
      const week = Number(tick.week_index);
      if (!Number.isFinite(week)) {
        return "";
      }
      const x = gridX + week * step + size / 2;
      return `<text class="level-heatmap-month" x="${x}" y="${monthY}" text-anchor="middle">${escapeHtml(tick.label || "")}</text>`;
    })
    .join("");

  const bands = colors
    .map((color, index) => {
      const y = gridY + (colors.length - index - 1) * bandHeight;
      return `<rect class="level-heatmap-legend-band" x="${legendX}" y="${y}" width="${legendWidth}" height="${bandHeight}" fill="${color}"></rect>`;
    })
    .join("");

  const preferred = [30, 90, 150, 210, 270, 330, 390, 450];
  const labels = preferred
    .filter((value) => edges.includes(value))
    .reverse()
    .map((value) => {
      const index = edges.indexOf(value);
      const y = gridY + (edges.length - index - 1) * bandHeight;
      const label =
        value === edges[edges.length - 1] ? `>${value}` : String(value);
      return `<g><line class="level-heatmap-grid-outline" x1="${legendX + legendWidth + 6}" y1="${y}" x2="${legendX + legendWidth + 14}" y2="${y}"></line><text class="level-heatmap-tick" x="${legendX + legendWidth + 20}" y="${y + 4}">${label}</text></g>`;
    })
    .join("");

  return `
    <svg class="level-heatmap-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" style="min-width:${width}px" role="img" aria-label="${escapeHtml(panel.title || "River-level heatmap")}">
      <rect class="level-heatmap-grid-outline" x="${gridX - 1}" y="${gridY - 1}" width="${gridWidth + 2}" height="${gridHeight + 2}" fill="none"></rect>
      ${cellMarkup}
      ${weekdayMarkup}
      ${monthMarkup}
      <text class="level-heatmap-axis-label" x="${gridX + gridWidth / 2}" y="${axisY}" text-anchor="middle">${escapeHtml(panel.x_axis_label || "Week of year")}</text>
      ${bands}
      ${labels}
      <text class="level-heatmap-legend-title" x="${legendX + legendWidth + 58}" y="${gridY + legendHeight / 2}" text-anchor="middle" transform="rotate(90 ${legendX + legendWidth + 58} ${gridY + legendHeight / 2})">${escapeHtml(legend.label || "% of average")}</text>
    </svg>`;
}

function heatmapColor(value, edges, colors) {
  if (value <= edges[0]) {
    return colors[0];
  }
  for (let index = 0; index < colors.length; index += 1) {
    const upper = edges[index + 1];
    if (!Number.isFinite(upper) || value <= upper) {
      return colors[index];
    }
  }
  return colors[colors.length - 1];
}

function renderNotes(notes) {
  const grid = document.getElementById("notesGrid");
  const safeNotes = notes.length
    ? notes
    : [
        {
          label: "Observatory context",
          text: "Project context will appear when it is available in the public feed.",
        },
      ];
  grid.replaceChildren(
    ...safeNotes.map((note) => {
      const card = document.createElement("article");
      card.className = "note-panel";

      const label = document.createElement("p");
      label.className = "section-label";
      label.textContent = note.label || "Note";

      const body = document.createElement("p");
      body.textContent = note.text || "";

      card.append(label, body);
      return card;
    })
  );
}

function renderFooter(footer) {
  text("footerTitle", footer.title || "Observatory partners");
  optionalText("footerText", footer.text);

  const contact = footer.contact || {};
  const contactItems = Array.isArray(contact.items)
    ? contact.items
    : [];
  const contactSection = document.getElementById("footerContact");
  contactSection.hidden = !contact.title && !contactItems.length;
  text("footerContactTitle", contact.title || "Contact");
  document
    .getElementById("footerContactList")
    .replaceChildren(...contactItems.map(renderContactItem));

  document
    .getElementById("partnerStrip")
    .replaceChildren(
      ...(footer.partners || []).map(renderPartner)
    );
}

function renderContactItem(item) {
  const row = document.createElement("p");
  row.className = "footer-contact-item";

  const label = document.createElement("span");
  label.className = "footer-contact-label";
  label.textContent = `${item.label}:`;

  const value = item.href
    ? document.createElement("a")
    : document.createElement("span");
  value.className = "footer-contact-value";
  value.textContent = item.value || "";
  if (item.href) {
    value.href = item.href;
    value.rel = "noreferrer";
    if (!item.href.startsWith("mailto:")) {
      value.target = "_blank";
    }
  }

  row.append(label, value);
  return row;
}

function renderPartner(partner) {
  const wrapper = document.createElement(partner.href ? "a" : "div");
  wrapper.className = partner.href ? "partner-link" : "partner-badge";
  if (partner.href) {
    wrapper.href = partner.href;
    wrapper.target = "_blank";
    wrapper.rel = "noreferrer";
  }

  const image = document.createElement("img");
  image.src = publicAssetPath(partner.logo);
  image.alt = partner.name || "Partner logo";
  wrapper.append(image);
  return wrapper;
}

function standardChartOptions(reportingWindow, yTitle, suggestedMax = null) {
  const durationHours =
    (reportingWindow.end - reportingWindow.start) / 3_600_000;
  return {
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : { duration: 280 },
    interaction: { intersect: false, mode: "nearest" },
    plugins: chartPlugins(),
    scales: {
      x: timeScale(reportingWindow, durationHours > 30 ? 8 : 6),
      y: {
        beginAtZero: true,
        ...(Number.isFinite(suggestedMax) ? { suggestedMax } : {}),
        grid: { color: chartPalette.grid },
        ticks: { color: chartPalette.muted },
        title: {
          display: true,
          text: yTitle,
          color: chartPalette.ink,
          font: { weight: "600" },
        },
      },
    },
  };
}

function responseChartOptions(
  reportingWindow,
  rainfallTitle,
  flowTitle,
  hasRainfall
) {
  const durationHours =
    (reportingWindow.end - reportingWindow.start) / 3_600_000;
  return {
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : { duration: 280 },
    interaction: { intersect: false, mode: "nearest" },
    plugins: chartPlugins(),
    scales: {
      x: timeScale(reportingWindow, durationHours > 30 ? 8 : 6),
      yFlow: {
        type: "linear",
        position: hasRainfall ? "right" : "left",
        beginAtZero: true,
        grid: hasRainfall
          ? { drawOnChartArea: false }
          : { color: chartPalette.grid },
        ticks: { color: chartPalette.muted },
        title: {
          display: true,
          text: flowTitle,
          color: chartPalette.ink,
          font: { weight: "600" },
        },
      },
      ...(hasRainfall
        ? {
            yRain: {
              type: "linear",
              position: "left",
              beginAtZero: true,
              suggestedMax: 1,
              grid: { color: chartPalette.grid },
              ticks: { color: chartPalette.muted },
              title: {
                display: true,
                text: rainfallTitle,
                color: chartPalette.ink,
                font: { weight: "600" },
              },
            },
          }
        : {}),
    },
  };
}

function scatterOptions(points, xTitle, yTitle) {
  const maxX = Math.max(...points.map((point) => point.x), 0);
  const maxY = Math.max(...points.map((point) => point.y), 0);
  return {
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : { duration: 280 },
    plugins: {
      ...chartPlugins(),
      tooltip: {
        ...chartPlugins().tooltip,
        callbacks: {
          title(items) {
            return formatIsoDateLabel(items?.[0]?.raw?.date);
          },
          label(context) {
            return [
              `Daily range: ${Number(context.raw?.x).toFixed(3)} m`,
              `Maximum depth: ${Number(context.raw?.y).toFixed(3)} m`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        min: 0,
        max: maxX + Math.max(maxX * 0.08, 0.01),
        grid: { color: chartPalette.grid },
        ticks: { color: chartPalette.muted },
        title: {
          display: true,
          text: xTitle,
          color: chartPalette.ink,
          font: { weight: "600" },
        },
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: maxY + Math.max(maxY * 0.08, 0.05),
        grid: { color: chartPalette.grid },
        ticks: { color: chartPalette.muted },
        title: {
          display: true,
          text: yTitle,
          color: chartPalette.ink,
          font: { weight: "600" },
        },
      },
    },
  };
}

function chartPlugins() {
  return {
    legend: {
      labels: {
        color: chartPalette.ink,
        boxWidth: 14,
        boxHeight: 8,
        font: { family: "IBM Plex Sans", weight: "600" },
      },
    },
    tooltip: {
      backgroundColor: "#071a33",
      titleColor: "#ffffff",
      bodyColor: "#dce8f8",
      borderColor: "#6f8aab",
      borderWidth: 1,
      padding: 12,
      callbacks: {
        title(items) {
          const value = items?.[0]?.parsed?.x;
          return Number.isFinite(value) ? formatTooltipTime(value) : "";
        },
      },
    },
  };
}

function timeScale(reportingWindow, maxTicksLimit) {
  return {
    type: "linear",
    min: reportingWindow.start,
    max: reportingWindow.end,
    offset: false,
    grid: { color: chartPalette.grid },
    ticks: {
      color: chartPalette.muted,
      autoSkip: true,
      maxTicksLimit,
      callback(value) {
        return formatAxisTick(Number(value));
      },
    },
    title: {
      display: true,
      text: "Date & Time",
      color: chartPalette.ink,
      font: { weight: "600" },
    },
  };
}

function buildTimeWindowState(payload, panels) {
  const windows = buildReportingWindows(
    payload.reporting_windows || {},
    payload.reporting_window || {}
  );
  const requested =
    Array.isArray(payload.time_windows) && payload.time_windows.length
      ? payload.time_windows
      : [fallbackWindowOption];
  const options = requested.filter((option) => windows[option.id]);
  const fallback = fallbackReportingWindow(panels);

  if (!options.length) {
    windows[fallbackWindowOption.id] = fallback;
    return {
      options: [fallbackWindowOption],
      windows,
      defaultId: fallbackWindowOption.id,
    };
  }

  const defaultId = options.some(
    (option) => option.id === payload.default_time_window
  )
    ? payload.default_time_window
    : options[0].id;
  return { options, windows, defaultId };
}

function buildReportingWindows(explicit, legacy) {
  const windows = {};
  Object.entries(explicit).forEach(([id, window]) => {
    const parsed = parseReportingWindow(window);
    if (parsed) {
      windows[id] = parsed;
    }
  });
  if (!windows[fallbackWindowOption.id]) {
    const parsed = parseReportingWindow(legacy);
    if (parsed) {
      windows[fallbackWindowOption.id] = parsed;
    }
  }
  return windows;
}

function parseReportingWindow(window) {
  const start = toEpochMs(window.start_timestamp);
  const end = toEpochMs(window.end_timestamp);
  return Number.isFinite(start) &&
    Number.isFinite(end) &&
    start < end
    ? { start, end }
    : null;
}

function fallbackReportingWindow(panels) {
  const timestamps = [
    ...(panels.rainfall?.points || []).map((point) =>
      toEpochMs(point.timestamp)
    ),
    ...(panels.depth?.points || []).map((point) =>
      toEpochMs(point.timestamp)
    ),
  ].filter(Number.isFinite);
  if (!timestamps.length) {
    const now = Date.now();
    return { start: now - 86_400_000, end: now };
  }
  return {
    start: Math.min(...timestamps),
    end: Math.max(...timestamps),
  };
}

function applyErrorState(error) {
  text("heroEyebrow", "Flash Flood Observatory");
  text("siteNameLine", "Public dashboard");
  text("siteLocationLine", "");
  document.getElementById("siteLocationLine").hidden = true;
  text("heroStrapline", "The public payload could not be loaded.");
  text("currentReadingValue", "Unavailable");
  text(
    "currentReadingNote",
    "Refresh this page or open the current dashboard."
  );
  document.getElementById("windowSwitcher").hidden = true;
  document.getElementById("officialAlert").hidden = true;
  document.getElementById("analysisGrid").hidden = true;
  document.getElementById("levelHeatmapPanel").hidden = true;

  document
    .getElementById("heroMeta")
    .replaceChildren(
      renderMetaChip({ label: "Feed", value: "Unavailable" }),
      renderMetaChip({
        label: "Detail",
        value: error.message || "The request failed.",
      })
    );
  renderSummaryMetrics([]);
  renderNotes([]);
  renderFooter({});
}

function showEmptyChart(prefix, message) {
  const canvas = document.getElementById(`${prefix}Chart`);
  const empty = document.getElementById(`${prefix}Empty`);
  canvas.hidden = true;
  empty.hidden = false;
  empty.textContent = message;
}

function hideEmptyChart(prefix) {
  document.getElementById(`${prefix}Chart`).hidden = false;
  document.getElementById(`${prefix}Empty`).hidden = true;
}

function togglePanel(id, visible) {
  document.getElementById(id).hidden = !visible;
}

function publicAssetPath(path) {
  if (!path) {
    return "";
  }
  if (
    /^(?:[a-z]+:)?\/\//i.test(path) ||
    path.startsWith("/") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  return `../${path.replace(/^\.\//, "")}`;
}

function toEpochMs(timestamp) {
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) ? value : NaN;
}

function text(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function formatAxisTick(timestampMs) {
  const date = new Date(timestampMs);
  return [
    new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "numeric",
      timeZone: displayTimeZone,
    }).format(date),
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: displayTimeZone,
    }).format(date),
  ];
}

function formatTooltipTime(timestampMs) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
    timeZoneName: "short",
  }).format(new Date(timestampMs));
}

function formatDate(timestamp) {
  return formatTooltipTime(toEpochMs(timestamp));
}

function formatIsoDateLabel(value) {
  if (!value) {
    return "";
  }
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function signed(value, decimals = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(decimals)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

main();
