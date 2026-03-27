const payloadPath = "data/site_payload.json";
const fallbackWindowOption = { id: "24h", label: "24 hours" };

const chartPalette = {
  cyan: "#77e8ff",
  cyanFill: "rgba(119, 232, 255, 0.12)",
  blue: "#46a7ff",
  blueFill: "rgba(70, 167, 255, 0.18)",
  green: "#57d18b",
  amber: "#f7de5e",
  red: "#ff7b79",
  grid: "rgba(119, 232, 255, 0.08)",
  text: "#f4f8fb",
  muted: "#9db0be",
};

let rainfallChart;
let depthChart;
let responseChart;
let historicalRangeChart;
let displayTimeZone = "UTC";
let dashboardPayload;
let timeWindowState;
let selectedTimeWindowId = fallbackWindowOption.id;

async function main() {
  try {
    const response = await fetch(payloadPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${payloadPath}: ${response.status}`);
    }

    const payload = await response.json();
    dashboardPayload = payload;
    timeWindowState = buildTimeWindowState(payload, payload.panels || {});
    selectedTimeWindowId = timeWindowState.defaultId;

    applyHero(payload.site || {}, payload.status || {});
    renderOfficialAlert(payload.official_alert || {});
    renderSummaryMetrics(payload.summary_metrics || []);
    renderTimeWindowSwitcher(timeWindowState);
    renderDashboardPanels();
    renderAnalysisPanels();
    renderNotes(payload.notes || []);
    renderFooter(payload.footer || {});
  } catch (error) {
    console.error(error);
    applyErrorState(error);
  }
}

function applyHero(site, status) {
  text("heroEyebrow", site.eyebrow || "Flash Flood Observatory");
  text("siteNameLine", site.name || "Flash Flood Observatory");
  text("siteLocationLine", site.location || "");
  text("heroStrapline", site.strapline || "Public dashboard");

  const locationLine = document.getElementById("siteLocationLine");
  locationLine.hidden = !site.location;

  const titleBits = [site.name, site.location].filter(Boolean);
  document.title = titleBits.length ? titleBits.join(" | ") : "Flash Flood Observatory";

  const siteMark = document.getElementById("siteMark");
  if (site.logo?.src) {
    siteMark.src = site.logo.src;
  }
  if (site.logo?.alt) {
    siteMark.alt = site.logo.alt;
  }

  displayTimeZone = site.timezone || "UTC";

  const badges = [
    {
      label: "Last updated",
      value: status.published_at ? formatDate(status.published_at) : "Not yet published",
    },
    {
      label: "Timezone",
      value: site.timezone || "UTC",
    },
  ];

  const heroMeta = document.getElementById("heroMeta");
  heroMeta.replaceChildren(...badges.map(renderMetaChip));
}

function renderOfficialAlert(alert) {
  const banner = document.getElementById("officialAlert");
  if (!alert || (!alert.state && !alert.label)) {
    banner.hidden = true;
    banner.className = "official-alert";
    return;
  }

  const state = typeof alert.state === "string" ? alert.state : "unavailable";
  banner.hidden = false;
  banner.className = `official-alert official-alert--${state.replaceAll("_", "-")}`;

  text("officialAlertEyebrow", alert.eyebrow || "Official EA Flood Alerts and Warnings");
  text("officialAlertTitle", alert.label || "Official EA flood alerts and warnings unavailable");
  text("officialAlertMessage", alert.message || alert.disclaimer || "");
  text(
    "officialAlertUpdated",
    alert.updated_at ? `Updated ${formatDate(alert.updated_at)}` : ""
  );

  const sourceLink = document.getElementById("officialAlertSource");
  if (alert.source_url) {
    sourceLink.hidden = false;
    sourceLink.href = alert.source_url;
    sourceLink.textContent = alert.source_name || "View official flood status";
  } else {
    sourceLink.hidden = true;
    sourceLink.removeAttribute("href");
    sourceLink.textContent = "";
  }
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

function renderSummaryMetrics(metrics) {
  const strip = document.getElementById("summaryStrip");
  const cards = metrics.length ? metrics.map(renderSummaryCard) : [renderSummaryCard({
    label: "Public feed",
    value: null,
    note: "No published metrics are available yet."
  })];
  strip.style.setProperty("--summary-columns", String(Math.min(cards.length || 1, 5)));
  strip.replaceChildren(...cards);
}

function renderSummaryCard(metric) {
  const card = document.createElement("article");
  card.className = "summary-card";

  const label = document.createElement("p");
  label.className = "panel-label";
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
  if (metric.value === null || metric.value === undefined || metric.value === "") {
    return "Awaiting data";
  }

  const decimals = Number.isFinite(metric.decimals) ? metric.decimals : 0;
  const numeric = Number(metric.value);
  if (Number.isNaN(numeric)) {
    return String(metric.value);
  }

  const unit = metric.unit ? ` ${metric.unit}` : "";
  const sign = metric.signed && numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(decimals)}${unit}`;
}

function renderTimeWindowSwitcher(state) {
  const switcher = document.getElementById("windowSwitcher");
  const controls = document.getElementById("windowSwitcherControls");

  if (!switcher || !controls) {
    return;
  }

  if (!state.options.length || state.options.length === 1) {
    switcher.hidden = true;
    controls.replaceChildren();
    return;
  }

  switcher.hidden = false;
  controls.replaceChildren(...state.options.map(renderTimeWindowButton));
  updateTimeWindowButtons();
}

function renderTimeWindowButton(option) {
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
}

function updateTimeWindowButtons() {
  const buttons = document.querySelectorAll(".window-button");
  buttons.forEach((button) => {
    const isActive = button.dataset.windowId === selectedTimeWindowId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderDashboardPanels() {
  const panels = dashboardPayload?.panels || {};
  const reportingWindow = timeWindowState.windows[selectedTimeWindowId];
  const rainfallPanel = buildPanelForWindow(panels.rainfall || {}, selectedTimeWindowId, reportingWindow);
  const depthPanel = buildPanelForWindow(panels.depth || {}, selectedTimeWindowId, reportingWindow);

  applyPanelVisibility(rainfallPanel, depthPanel);
  renderPanelCopy("rainfall", rainfallPanel);
  renderPanelCopy("depth", depthPanel);
  renderContextChip("rainfallContextChip", currentWindowLabel());
  renderContextChip("depthContextChip", currentWindowLabel());
  renderRainfallChart(rainfallPanel, reportingWindow);
  renderDepthChart(depthPanel, reportingWindow);
}

function renderAnalysisPanels() {
  const panels = dashboardPayload?.panels || {};
  const analysisPanels = dashboardPayload?.analysis_panels || {};
  const reportingWindow = timeWindowState.windows[selectedTimeWindowId];
  const rainfallPanel = buildPanelForWindow(panels.rainfall || {}, selectedTimeWindowId, reportingWindow);
  const depthPanel = buildPanelForWindow(panels.depth || {}, selectedTimeWindowId, reportingWindow);
  const responsePanel = buildPanelForWindow(analysisPanels.response || {}, selectedTimeWindowId, reportingWindow);
  const historicalRangePanel = analysisPanels.historical_range || {};
  const levelHeatmapPanel = analysisPanels.level_heatmap || {};

  renderPanelCopy("response", responsePanel);
  renderPanelCopy("historicalRange", historicalRangePanel);
  renderContextChip("responseContextChip", currentWindowLabel());
  applyAnalysisVisibility(responsePanel, historicalRangePanel, rainfallPanel);
  renderResponseChart(responsePanel, rainfallPanel, reportingWindow);
  renderHistoricalRangeChart(historicalRangePanel);
  renderLevelHeatmap(levelHeatmapPanel);
}

function buildPanelForWindow(panel, windowId, reportingWindow) {
  return {
    ...panel,
    description: panel.descriptions?.[windowId] || panel.description || "",
    points: filterPointsForWindow(panel.points || [], reportingWindow),
  };
}

function filterPointsForWindow(points, reportingWindow) {
  if (!reportingWindow) {
    return points;
  }

  return points.filter((point) => {
    const timestamp = toEpochMs(point.timestamp);
    return Number.isFinite(timestamp) && timestamp >= reportingWindow.start && timestamp <= reportingWindow.end;
  });
}

function setOptionalText(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  const content = value || "";
  element.textContent = content;
  element.hidden = !content;
}

function renderPanelCopy(prefix, panel) {
  setOptionalText(`${prefix}Eyebrow`, panel.eyebrow || "");
  setOptionalText(`${prefix}Title`, panel.title || "");
  setOptionalText(`${prefix}Subtitle`, panel.subtitle || "");
  setOptionalText(`${prefix}Description`, panel.description || "");
}

function renderContextChip(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.textContent = value || "";
  element.hidden = !value;
}

function currentWindowLabel() {
  const option = timeWindowState?.options?.find((item) => item.id === selectedTimeWindowId);
  return option?.label || fallbackWindowOption.label;
}

function applyPanelVisibility(rainfallPanel, depthPanel) {
  const rainfallPoints = rainfallPanel.points || [];
  const depthPoints = depthPanel.points || [];

  togglePanel("rainfallPanel", rainfallPoints.length > 0);
  togglePanel("depthPanel", depthPoints.length > 0);

  const visiblePanelCount = [rainfallPoints, depthPoints].filter((points) => points.length > 0).length;
  const dashboardGrid = document.getElementById("dashboardGrid");
  dashboardGrid.classList.toggle("dashboard-grid--single", visiblePanelCount <= 1);
}

function applyAnalysisVisibility(responsePanel, historicalRangePanel, rainfallPanel) {
  const responsePlaceholder = responsePanel.mode === "placeholder";
  const responseVisible = responsePlaceholder
    ? Boolean(responsePanel.title || responsePanel.subtitle || responsePanel.description || responsePanel.empty_message || responsePanel.eyebrow)
    : (rainfallPanel.points || []).length > 0 && (responsePanel.points || []).length > 0;
  const historicalVisible = (historicalRangePanel.points || []).length > 0;

  togglePanel("responsePanel", responseVisible);
  togglePanel("historicalRangePanel", historicalVisible);

  const visiblePanelCount = [responseVisible, historicalVisible].filter(Boolean).length;
  const analysisGrid = document.getElementById("analysisGrid");
  analysisGrid.hidden = visiblePanelCount === 0;
  analysisGrid.classList.toggle("analysis-grid--single", visiblePanelCount <= 1);

  if (!responseVisible || responsePlaceholder) {
    showEmptyChart("response", responsePanel.empty_message || "River flow event analysis will appear here once the rating curve has been generated.");
  }
  if (!historicalVisible) {
    showEmptyChart("historicalRange", historicalRangePanel.empty_message || "Historical range data is not available yet.");
  }
}

function buildRainfallDataset(points, label, yAxisID = "y") {
  return {
    type: "bar",
    label,
    data: points.map((point) => ({ x: toEpochMs(point.timestamp), y: point.value })),
    parsing: false,
    yAxisID,
    borderRadius: 6,
    backgroundColor: chartPalette.blueFill,
    borderColor: chartPalette.blue,
    borderWidth: 1.4,
    barThickness: "flex",
    maxBarThickness: 34,
    inflateAmount: 0,
  };
}

function renderRainfallChart(panel, reportingWindow) {
  const points = panel.points || [];
  if (!points.length) {
    rainfallChart?.destroy();
    return;
  }

  hideEmptyChart("rainfall");
  rainfallChart?.destroy();
  rainfallChart = new Chart(document.getElementById("rainfallChart"), {
    type: "bar",
    data: {
      datasets: [buildRainfallDataset(points, panel.y_axis_label || "Rainfall")],
    },
    options: chartOptions(reportingWindow, panel.y_axis_label || "Rainfall"),
  });
}

function renderDepthChart(panel, reportingWindow) {
  const points = panel.points || [];
  if (!points.length) {
    showEmptyChart("depth", panel.empty_message || "No depth data has been published yet.");
    depthChart?.destroy();
    return;
  }

  hideEmptyChart("depth");
  depthChart?.destroy();
  depthChart = new Chart(document.getElementById("depthChart"), {
    type: "line",
    data: {
      datasets: [
        {
          label: panel.y_axis_label || "Depth",
          data: points.map((point) => ({ x: toEpochMs(point.timestamp), y: point.value })),
          parsing: false,
          borderColor: chartPalette.cyan,
          backgroundColor: chartPalette.cyanFill,
          borderWidth: 2.5,
          fill: true,
          tension: 0.28,
          pointRadius: 0,
        },
      ],
    },
    options: chartOptions(reportingWindow, panel.y_axis_label || "Depth"),
  });
}

function renderResponseChart(panel, rainfallPanel, reportingWindow) {
  if (panel.mode === "placeholder") {
    responseChart?.destroy();
    showEmptyChart("response", panel.empty_message || "River flow event analysis will appear here once the rating curve has been generated.");
    return;
  }

  const rainfallPoints = rainfallPanel.points || [];
  const flowPoints = panel.points || [];
  if (!rainfallPoints.length || !flowPoints.length) {
    responseChart?.destroy();
    showEmptyChart("response", panel.empty_message || "River flow event analysis is temporarily unavailable.");
    return;
  }

  hideEmptyChart("response");
  responseChart?.destroy();
  responseChart = new Chart(document.getElementById("responseChart"), {
    data: {
      datasets: [
        buildRainfallDataset(
          rainfallPoints,
          panel.rainfall_y_axis_label || rainfallPanel.y_axis_label || "Rainfall (mm)",
          "yRain"
        ),
        {
          type: "line",
          label: panel.y_axis_label || "Flow Rate",
          data: flowPoints.map((point) => ({ x: toEpochMs(point.timestamp), y: point.value })),
          parsing: false,
          yAxisID: "yFlow",
          borderColor: chartPalette.cyan,
          backgroundColor: chartPalette.cyanFill,
          borderWidth: 2.2,
          tension: 0.28,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: responseChartOptions(
      reportingWindow,
      panel.rainfall_y_axis_label || rainfallPanel.y_axis_label || "Rainfall (mm)",
      panel.y_axis_label || "Flow Rate"
    ),
  });
}

function renderHistoricalRangeChart(panel) {
  const points = panel.points || [];
  if (!points.length) {
    showEmptyChart("historicalRange", panel.empty_message || "Historical range data is not available yet.");
    historicalRangeChart?.destroy();
    return;
  }

  const scatterMode = points.some((point) => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)));

  hideEmptyChart("historicalRange");
  historicalRangeChart?.destroy();
  historicalRangeChart = new Chart(document.getElementById("historicalRangeChart"), scatterMode
    ? {
        type: "scatter",
        data: {
          datasets: [
            {
              label: panel.subtitle || panel.y_axis_label || "Daily Range and Peak Levels",
              data: points.map((point) => ({
                x: point.x,
                y: point.y,
                date: point.date,
                timestamp: toEpochMs(point.timestamp),
              })),
              parsing: false,
              pointBackgroundColor: chartPalette.green,
              pointBorderColor: "rgba(9, 19, 31, 0.92)",
              pointBorderWidth: 1,
              pointRadius: 4,
              pointHoverRadius: 5,
            },
          ],
        },
        options: historicalScatterOptions(
          panel.x_axis_label || "Maximum 24h Water Depth (m)",
          panel.y_axis_label || "24h Range (m)"
        ),
      }
    : {
        type: "line",
        data: {
          datasets: [
            {
              label: panel.y_axis_label || "24h Range (m)",
              data: points.map((point) => ({ x: toEpochMs(point.timestamp), y: point.value })),
              parsing: false,
              borderColor: chartPalette.green,
              backgroundColor: "rgba(87, 209, 139, 0.12)",
              borderWidth: 2.2,
              fill: true,
              tension: 0.25,
              pointRadius: 2.5,
              pointHoverRadius: 4,
            },
          ],
        },
        options: historicalTimeSeriesOptions(points, panel.y_axis_label || "24h Range (m)"),
      });
}

function renderLevelHeatmap(panel) {
  const wrapper = document.getElementById("levelHeatmapPanel");
  const description = document.getElementById("levelHeatmapDescription");
  const average = document.getElementById("levelHeatmapAverage");
  const mount = document.getElementById("levelHeatmapMount");
  const empty = document.getElementById("levelHeatmapEmpty");
  const cells = Array.isArray(panel?.cells) ? panel.cells : [];
  const hasPanel = Boolean(panel?.title || panel?.eyebrow || panel?.empty_message || cells.length);

  wrapper.hidden = !hasPanel;
  if (!hasPanel) {
    mount.innerHTML = "";
    mount.hidden = true;
    empty.hidden = true;
    return;
  }

  text("levelHeatmapEyebrow", panel.eyebrow || "River Levels");
  text("levelHeatmapTitle", panel.title || "% of Flash Flood Observatory Average");
  description.textContent = panel.description || "";
  average.textContent = panel.average_label || "";
  average.hidden = !panel.average_label;

  if (!cells.length) {
    mount.innerHTML = "";
    mount.hidden = true;
    empty.hidden = false;
    empty.textContent = panel.empty_message || "Daily maximum river-level heatmap data will appear here after the historical record is built.";
    return;
  }

  mount.hidden = false;
  empty.hidden = true;
  mount.setAttribute("aria-label", panel.title || "River-level difference heatmap");
  mount.innerHTML = buildLevelHeatmapSvg(panel);
}

function buildLevelHeatmapSvg(panel) {
  const cells = (panel.cells || []).filter(
    (cell) => Number.isFinite(Number(cell.week_index)) && Number.isFinite(Number(cell.weekday_index))
  );
  if (!cells.length) {
    return "";
  }

  const weekdayLabels = Array.isArray(panel.weekday_labels) && panel.weekday_labels.length
    ? panel.weekday_labels
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const monthTicks = Array.isArray(panel.month_ticks) ? panel.month_ticks : [];
  const legend = panel.legend || {};
  const legendEdges = Array.isArray(legend.tick_values) && legend.tick_values.length
    ? legend.tick_values.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230, 250, 270, 290, 310, 330, 350, 370, 390, 410];
  const defaultBandColors = [
    "#5B2F05",
    "#7A4710",
    "#A36B2B",
    "#F4F5F1",
    "#EEF3FF",
    "#E3EBFF",
    "#D7E2FF",
    "#CAD8FF",
    "#BCD0FF",
    "#A7BCFF",
    "#91AAFF",
    "#7C98F8",
    "#6281F0",
    "#4B71E4",
    "#3D66D6",
    "#2B56BF",
    "#1F4AA8",
    "#081F63",
    "#020813",
  ];
  const legendBandColors = Array.isArray(legend.band_colors) && legend.band_colors.length === Math.max(legendEdges.length - 1, 0)
    ? legend.band_colors
    : defaultBandColors;
  const maxWeekIndex = Math.max(...cells.map((cell) => Number(cell.week_index)));
  const cellSize = 18;
  const cellGap = 2;
  const step = cellSize + cellGap;
  const gridWidth = (maxWeekIndex + 1) * step - cellGap;
  const gridHeight = 7 * step - cellGap;
  const gridX = 98;
  const gridY = 14;
  const legendWidth = 30;
  const legendX = gridX + gridWidth + 44;
  const legendY = gridY;
  const legendHeight = gridHeight;
  const bandHeight = legendHeight / legendBandColors.length;
  const monthLabelY = gridY + gridHeight + 26;
  const axisLabelY = monthLabelY + 26;
  const svgWidth = legendX + legendWidth + 130;
  const svgHeight = axisLabelY + 24;
  const legendTitleX = legendX + legendWidth + 56;
  const legendTitleY = legendY + legendHeight / 2;
  const xAxisLabel = panel.x_axis_label || "Week of Year";

  const gridOutline = `<rect class="level-heatmap-grid-outline" x="${gridX - 1}" y="${gridY - 1}" width="${gridWidth + 2}" height="${gridHeight + 2}" rx="10" fill="none"></rect>`;

  const rects = cells.map((cell) => {
    const x = gridX + Number(cell.week_index) * step;
    const y = gridY + Number(cell.weekday_index) * step;
    const percentOfAverage = Number.isFinite(Number(cell.percent_of_average))
      ? Number(cell.percent_of_average)
      : (Number.isFinite(Number(cell.percent_difference_from_average)) ? Number(cell.percent_difference_from_average) + 100 : NaN);
    const maxLevel = Number(cell.max_level_m);
    const fallbackMeanLevel = Number(cell.mean_level_m);
    const plottedLevel = Number.isFinite(maxLevel) ? maxLevel : fallbackMeanLevel;
    const plottedLabel = Number.isFinite(maxLevel) ? "Maximum level" : "Mean level";
    const missingLabel = Number.isFinite(maxLevel) ? "No daily maximum available" : "No daily mean available";
    const difference = Number(cell.difference_from_average_m);
    const fill = Number.isFinite(percentOfAverage)
      ? heatmapColor(percentOfAverage, { edges: legendEdges, colors: legendBandColors })
      : "rgba(157, 176, 190, 0.08)";
    const extraClass = Number.isFinite(percentOfAverage) ? "" : " level-heatmap-cell--missing";
    const tooltip = [
      cell.date_label || cell.date || "",
      Number.isFinite(plottedLevel) ? `${plottedLabel}: ${plottedLevel.toFixed(3)} m` : missingLabel,
      Number.isFinite(percentOfAverage) ? `${percentOfAverage.toFixed(1)}% of observatory average` : "",
      Number.isFinite(difference) ? `Difference from average: ${formatSignedValue(difference, 3)} m` : "",
    ].filter(Boolean).join("\n");
    return `<rect class="level-heatmap-cell${extraClass}" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fill}"><title>${escapeHtml(tooltip)}</title></rect>`;
  }).join("");

  const yLabels = weekdayLabels.map((label, index) => {
    const y = gridY + index * step + cellSize / 2 + 4;
    return `<text class="level-heatmap-axis" x="${gridX - 14}" y="${y}" text-anchor="end">${escapeHtml(label)}</text>`;
  }).join("");

  const monthLabels = monthTicks.map((tick) => {
    const weekIndex = Number(tick.week_index);
    if (!Number.isFinite(weekIndex)) {
      return "";
    }
    const x = gridX + weekIndex * step + cellSize / 2;
    return `<text class="level-heatmap-month" x="${x}" y="${monthLabelY}" text-anchor="middle">${escapeHtml(tick.label || "")}</text>`;
  }).join("");

  const legendBands = legendBandColors.map((color, index) => {
    const y = legendY + (legendBandColors.length - index - 1) * bandHeight;
    return `<rect class="level-heatmap-legend-band" x="${legendX}" y="${y}" width="${legendWidth}" height="${bandHeight}" fill="${color}"></rect>`;
  }).join("");

  const legendTicks = selectHeatmapLegendLabelValues(legendEdges).reverse().map((value) => {
    const edgeIndex = legendEdges.indexOf(value);
    const y = legendY + (legendEdges.length - edgeIndex - 1) * bandHeight;
    return `<g><line class="level-heatmap-grid-outline" x1="${legendX + legendWidth + 6}" y1="${y}" x2="${legendX + legendWidth + 14}" y2="${y}"></line><text class="level-heatmap-tick" x="${legendX + legendWidth + 20}" y="${y + 4}">${escapeHtml(String(Math.round(value)))}</text></g>`;
  }).join("");

  return `
    <svg class="level-heatmap-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMinYMin meet" style="min-width:${svgWidth}px" role="img" aria-label="${escapeHtml(panel.title || "River-level difference heatmap")}">
      ${gridOutline}
      ${rects}
      ${yLabels}
      ${monthLabels}
      <text class="level-heatmap-axis-label" x="${gridX + gridWidth / 2}" y="${axisLabelY}" text-anchor="middle">${escapeHtml(xAxisLabel)}</text>
      ${legendBands}
      ${legendTicks}
      <text class="level-heatmap-legend-title" x="${legendTitleX}" y="${legendTitleY}" text-anchor="middle" transform="rotate(90 ${legendTitleX} ${legendTitleY})">${escapeHtml(legend.label || "% of Average")}</text>
    </svg>`;
}

function selectHeatmapLegendLabelValues(edges) {
  if (!Array.isArray(edges) || !edges.length) {
    return [];
  }

  const preferred = [30, 90, 150, 210, 270, 330, 410];
  const selected = preferred.filter((value) => edges.includes(value));
  return selected.length ? selected : edges;
}


function heatmapColor(percentValue, legendScale) {
  const edges = Array.isArray(legendScale?.edges) ? legendScale.edges : [30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230, 250, 270, 290, 310, 330, 350, 370, 390, 410];
  const colors = Array.isArray(legendScale?.colors) ? legendScale.colors : [
    "#5B2F05",
    "#7A4710",
    "#A36B2B",
    "#F4F5F1",
    "#EEF3FF",
    "#E3EBFF",
    "#D7E2FF",
    "#CAD8FF",
    "#BCD0FF",
    "#A7BCFF",
    "#91AAFF",
    "#7C98F8",
    "#6281F0",
    "#4B71E4",
    "#3D66D6",
    "#2B56BF",
    "#1F4AA8",
    "#081F63",
    "#020813",
  ];
  if (!edges.length || !colors.length) {
    return "#F4F5F1";
  }
  if (percentValue <= edges[0]) {
    return colors[0];
  }
  for (let index = 0; index < colors.length; index += 1) {
    const upperEdge = edges[index + 1];
    if (!Number.isFinite(upperEdge) || percentValue <= upperEdge) {
      return colors[index];
    }
  }
  return colors[colors.length - 1];
}

function formatSignedValue(value, decimals = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(decimals)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderNotes(notes) {
  const grid = document.getElementById("notesGrid");
  const cards = notes.length ? notes.map(renderNoteCard) : [renderNoteCard({
    label: "Public dashboard",
    text: "Curated public notes will appear here when available."
  })];
  grid.replaceChildren(...cards);
}

function renderNoteCard(note) {
  const card = document.createElement("article");
  card.className = "note-panel";

  const label = document.createElement("p");
  label.className = "panel-label";
  label.textContent = note.label || "Note";

  const body = document.createElement("p");
  body.textContent = note.text || "";

  card.append(label, body);
  return card;
}

function renderFooter(footer) {
  text("footerTitle", footer.title || "Observatory Partners");
  const footerText = document.getElementById("footerText");
  footerText.textContent = footer.text || "";
  footerText.hidden = !footer.text;

  const contact = footer.contact || {};
  const contactSection = document.getElementById("footerContact");
  const contactItems = Array.isArray(contact.items) ? contact.items : [];
  contactSection.hidden = !contact.title && !contactItems.length;
  text("footerContactTitle", contact.title || "Contact");
  const contactList = document.getElementById("footerContactList");
  contactList.replaceChildren(...contactItems.map(renderContactItem));

  const strip = document.getElementById("partnerStrip");
  strip.replaceChildren(...(footer.partners || []).map(renderPartner));
}

function renderContactItem(item) {
  const row = document.createElement("p");
  row.className = "footer-contact-item";

  const label = document.createElement("span");
  label.className = "footer-contact-label";
  label.textContent = `${item.label}:`;

  const value = item.href ? document.createElement("a") : document.createElement("span");
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
  const image = document.createElement("img");
  image.src = partner.logo;
  image.alt = partner.name || "Partner logo";

  const wrapperTag = partner.href ? "a" : "div";
  const wrapper = document.createElement(wrapperTag);
  wrapper.className = partner.href ? "partner-link" : "partner-badge";

  if (partner.href) {
    wrapper.href = partner.href;
    wrapper.target = "_blank";
    wrapper.rel = "noreferrer";
  }

  wrapper.append(image);
  return wrapper;
}

function togglePanel(panelId, isVisible) {
  const panel = document.getElementById(panelId);
  panel.hidden = !isVisible;
}

function showEmptyChart(prefix, message) {
  const canvas = document.getElementById(`${prefix}Chart`);
  const empty = document.getElementById(`${prefix}Empty`);
  canvas.hidden = true;
  empty.hidden = false;
  empty.textContent = message;
}

function hideEmptyChart(prefix) {
  const canvas = document.getElementById(`${prefix}Chart`);
  const empty = document.getElementById(`${prefix}Empty`);
  canvas.hidden = false;
  empty.hidden = true;
}

function chartOptions(reportingWindow, yTitle) {
  const durationHours = (reportingWindow.end - reportingWindow.start) / (60 * 60 * 1000);
  const maxTicksLimit = durationHours > 30 ? 8 : 6;

  return {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartPalette.text,
        },
      },
      tooltip: {
        backgroundColor: "rgba(5, 10, 16, 0.96)",
        borderColor: "rgba(119, 232, 255, 0.22)",
        borderWidth: 1,
        titleColor: chartPalette.text,
        bodyColor: chartPalette.muted,
        callbacks: {
          title(items) {
            const xValue = items?.[0]?.parsed?.x;
            return Number.isFinite(xValue) ? formatTooltipTime(xValue) : "";
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        min: reportingWindow.start,
        max: reportingWindow.end,
        offset: false,
        grid: {
          color: chartPalette.grid,
        },
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
          color: chartPalette.text,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.muted,
        },
        title: {
          display: true,
          text: yTitle,
          color: chartPalette.text,
        },
      },
    },
  };
}

function formatIsoDateLabel(value) {
  if (!value) {
    return "";
  }
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function responseChartOptions(reportingWindow, rainfallTitle, flowTitle) {
  const durationHours = (reportingWindow.end - reportingWindow.start) / (60 * 60 * 1000);
  const maxTicksLimit = durationHours > 30 ? 8 : 6;

  return {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartPalette.text,
        },
      },
      tooltip: {
        backgroundColor: "rgba(5, 10, 16, 0.96)",
        borderColor: "rgba(119, 232, 255, 0.22)",
        borderWidth: 1,
        titleColor: chartPalette.text,
        bodyColor: chartPalette.muted,
        callbacks: {
          title(items) {
            const xValue = items?.[0]?.parsed?.x;
            return Number.isFinite(xValue) ? formatTooltipTime(xValue) : "";
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        min: reportingWindow.start,
        max: reportingWindow.end,
        offset: false,
        grid: {
          color: chartPalette.grid,
        },
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
          color: chartPalette.text,
        },
      },
      yRain: {
        type: "linear",
        position: "left",
        beginAtZero: true,
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.muted,
        },
        title: {
          display: true,
          text: rainfallTitle,
          color: chartPalette.text,
        },
      },
      yFlow: {
        type: "linear",
        position: "right",
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: chartPalette.muted,
        },
        title: {
          display: true,
          text: flowTitle,
          color: chartPalette.text,
        },
      },
    },
  };
}

function historicalTimeSeriesOptions(points, yTitle) {
  const timestamps = points.map((point) => toEpochMs(point.timestamp)).filter((value) => Number.isFinite(value));
  const fallbackEnd = Date.now();
  const min = timestamps.length ? Math.min(...timestamps) : fallbackEnd - 30 * 24 * 60 * 60 * 1000;
  const max = timestamps.length ? Math.max(...timestamps) : fallbackEnd;

  return {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartPalette.text,
        },
      },
      tooltip: {
        backgroundColor: "rgba(5, 10, 16, 0.96)",
        borderColor: "rgba(119, 232, 255, 0.22)",
        borderWidth: 1,
        titleColor: chartPalette.text,
        bodyColor: chartPalette.muted,
        callbacks: {
          title(items) {
            const xValue = items?.[0]?.parsed?.x;
            return Number.isFinite(xValue) ? formatTooltipDate(xValue) : "";
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        min,
        max,
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.muted,
          autoSkip: true,
          maxTicksLimit: 8,
          callback(value) {
            return formatAxisDateTick(Number(value));
          },
        },
        title: {
          display: true,
          text: "Date",
          color: chartPalette.text,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.muted,
        },
        title: {
          display: true,
          text: yTitle,
          color: chartPalette.text,
        },
      },
    },
  };
}

function historicalScatterOptions(xTitle, yTitle) {
  return {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartPalette.text,
        },
      },
      tooltip: {
        backgroundColor: "rgba(5, 10, 16, 0.96)",
        borderColor: "rgba(119, 232, 255, 0.22)",
        borderWidth: 1,
        titleColor: chartPalette.text,
        bodyColor: chartPalette.muted,
        callbacks: {
          title(items) {
            return formatIsoDateLabel(items?.[0]?.raw?.date);
          },
          label(context) {
            const raw = context.raw || {};
            return [
              `Maximum 24h water depth: ${Number(raw.x).toFixed(3)} m`,
              `24h range: ${Number(raw.y).toFixed(3)} m`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        beginAtZero: true,
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.muted,
        },
        title: {
          display: true,
          text: xTitle,
          color: chartPalette.text,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.muted,
        },
        title: {
          display: true,
          text: yTitle,
          color: chartPalette.text,
        },
      },
    },
  };
}

function applyErrorState(error) {
  text("heroEyebrow", "Flash Flood Observatory");
  text("siteNameLine", "Public dashboard");
  text("siteLocationLine", "");
  document.getElementById("siteLocationLine").hidden = true;
  text("heroStrapline", "The public payload could not be loaded.");
  document.getElementById("officialAlert").hidden = true;
  document.getElementById("windowSwitcher").hidden = true;
  document.getElementById("analysisGrid").hidden = true;
  document.getElementById("levelHeatmapPanel").hidden = true;

  const heroMeta = document.getElementById("heroMeta");
  heroMeta.replaceChildren(
    renderMetaChip({ label: "Last updated", value: "Unavailable" }),
    renderMetaChip({ label: "Detail", value: error.message })
  );

  renderSummaryMetrics([]);
  renderNotes([]);
  renderFooter({});
}

function buildTimeWindowState(payload, panels) {
  const windows = buildReportingWindows(payload.reporting_windows || {}, payload.reporting_window || {}, panels);
  const requestedOptions = Array.isArray(payload.time_windows) && payload.time_windows.length
    ? payload.time_windows
    : [fallbackWindowOption];
  const options = requestedOptions.filter((option) => windows[option.id]);
  const fallbackWindow = buildFallbackReportingWindow(panels);

  if (!options.length) {
    windows[fallbackWindowOption.id] = fallbackWindow;
    return {
      options: [fallbackWindowOption],
      windows,
      defaultId: fallbackWindowOption.id,
    };
  }

  const requestedDefault = payload.default_time_window;
  const defaultId = options.some((option) => option.id === requestedDefault)
    ? requestedDefault
    : options[0].id;

  return {
    options,
    windows,
    defaultId,
  };
}

function buildReportingWindows(explicitWindows, legacyWindow, panels) {
  const windows = {};

  Object.entries(explicitWindows || {}).forEach(([id, window]) => {
    const parsed = parseReportingWindow(window);
    if (parsed) {
      windows[id] = parsed;
    }
  });

  if (!windows[fallbackWindowOption.id]) {
    const parsedLegacy = parseReportingWindow(legacyWindow);
    if (parsedLegacy) {
      windows[fallbackWindowOption.id] = parsedLegacy;
    }
  }

  return windows;
}

function parseReportingWindow(reportingWindow) {
  const explicitStart = toEpochMs(reportingWindow.start_timestamp);
  const explicitEnd = toEpochMs(reportingWindow.end_timestamp);
  if (Number.isFinite(explicitStart) && Number.isFinite(explicitEnd) && explicitStart < explicitEnd) {
    return { start: explicitStart, end: explicitEnd };
  }
  return null;
}

function buildFallbackReportingWindow(panels) {
  const timestamps = [
    ...(panels.rainfall?.points || []).map((point) => toEpochMs(point.timestamp)),
    ...(panels.depth?.points || []).map((point) => toEpochMs(point.timestamp)),
  ].filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    const now = Date.now();
    return { start: now - 24 * 60 * 60 * 1000, end: now };
  }

  return {
    start: Math.min(...timestamps),
    end: Math.max(...timestamps),
  };
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
  if (!Number.isFinite(timestampMs)) {
    return "";
  }

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

function formatAxisDateTick(timestampMs) {
  if (!Number.isFinite(timestampMs)) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: displayTimeZone,
  }).format(new Date(timestampMs));
}

function formatTooltipTime(timestampMs) {
  const date = new Date(timestampMs);
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
    timeZoneName: "short",
  }).format(date);
}

function formatTooltipDate(timestampMs) {
  const date = new Date(timestampMs);
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: displayTimeZone,
  }).format(date);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
    timeZoneName: "short",
  }).format(date);
}

main();
