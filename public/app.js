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
  renderRainfallChart(rainfallPanel, reportingWindow);
  renderDepthChart(depthPanel, reportingWindow);
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

function renderPanelCopy(prefix, panel) {
  text(`${prefix}Eyebrow`, panel.eyebrow || "");
  text(`${prefix}Title`, panel.title || "");
  text(`${prefix}Description`, panel.description || "");
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
      datasets: [
        {
          label: panel.y_axis_label || "Rainfall",
          data: points.map((point) => ({ x: toEpochMs(point.timestamp), y: point.value })),
          parsing: false,
          borderRadius: 6,
          backgroundColor: chartPalette.blueFill,
          borderColor: chartPalette.blue,
          borderWidth: 1.4,
          barThickness: "flex",
          maxBarThickness: 18,
        },
      ],
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

  const strip = document.getElementById("partnerStrip");
  strip.replaceChildren(...(footer.partners || []).map(renderPartner));
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

function applyErrorState(error) {
  text("heroEyebrow", "Flash Flood Observatory");
  text("siteNameLine", "Public dashboard");
  text("siteLocationLine", "");
  document.getElementById("siteLocationLine").hidden = true;
  text("heroStrapline", "The public payload could not be loaded.");
  document.getElementById("officialAlert").hidden = true;
  document.getElementById("windowSwitcher").hidden = true;

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
