const payloadPath = "data/site_payload.json";

const chartPalette = {
  cyan: "#77e8ff",
  cyanFill: "rgba(119, 232, 255, 0.12)",
  blue: "#46a7ff",
  blueFill: "rgba(70, 167, 255, 0.18)",
  grid: "rgba(119, 232, 255, 0.08)",
  text: "#f4f8fb",
  muted: "#9db0be",
};

let rainfallChart;
let depthChart;

async function main() {
  try {
    const response = await fetch(payloadPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${payloadPath}: ${response.status}`);
    }

    const payload = await response.json();
    applyHero(payload.site || {}, payload.status || {});
    renderSummaryMetrics(payload.summary_metrics || []);
    applyPanelVisibility(payload.panels || {});
    renderPanelCopy("rainfall", payload.panels?.rainfall || {});
    renderPanelCopy("depth", payload.panels?.depth || {});
    renderRainfallChart(payload.panels?.rainfall || {});
    renderDepthChart(payload.panels?.depth || {});
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

  const badges = [
    {
      label: "Status",
      value: status.state || "Awaiting publication",
    },
    {
      label: "Last updated",
      value: status.published_at ? formatDate(status.published_at) : "Not yet published",
    },
    {
      label: "Timezone",
      value: site.timezone || "UTC",
    },
  ];

  if (status.message) {
    badges.push({
      label: "Summary",
      value: status.message,
    });
  }

  const heroMeta = document.getElementById("heroMeta");
  heroMeta.replaceChildren(...badges.map(renderMetaChip));
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

  const prefix = metric.signed && numeric > 0 ? "+" : "";
  const unit = metric.unit ? ` ${metric.unit}` : "";
  return `${prefix}${numeric.toFixed(decimals)}${unit}`;
}

function renderPanelCopy(prefix, panel) {
  text(`${prefix}Eyebrow`, panel.eyebrow || "");
  text(`${prefix}Title`, panel.title || "");
  text(`${prefix}Description`, panel.description || "");
}

function applyPanelVisibility(panels) {
  const rainfallPoints = panels.rainfall?.points || [];
  const depthPoints = panels.depth?.points || [];

  togglePanel("rainfallPanel", rainfallPoints.length > 0);
  togglePanel("depthPanel", depthPoints.length > 0);

  const visiblePanelCount = [rainfallPoints, depthPoints].filter((points) => points.length > 0).length;
  const dashboardGrid = document.getElementById("dashboardGrid");
  dashboardGrid.classList.toggle("dashboard-grid--single", visiblePanelCount <= 1);
}

function renderRainfallChart(panel) {
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
      labels: points.map((point) => formatAxisTime(point.timestamp)),
      datasets: [
        {
          label: panel.y_axis_label || "Rainfall",
          data: points.map((point) => point.value),
          borderRadius: 6,
          backgroundColor: chartPalette.blueFill,
          borderColor: chartPalette.blue,
          borderWidth: 1.4,
        },
      ],
    },
    options: chartOptions(panel.y_axis_label || "Rainfall"),
  });
}

function renderDepthChart(panel) {
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
      labels: points.map((point) => formatAxisTime(point.timestamp)),
      datasets: [
        {
          label: panel.y_axis_label || "Depth",
          data: points.map((point) => point.value),
          borderColor: chartPalette.cyan,
          backgroundColor: chartPalette.cyanFill,
          borderWidth: 2.5,
          fill: true,
          tension: 0.28,
          pointRadius: 0,
        },
      ],
    },
    options: chartOptions(panel.y_axis_label || "Depth"),
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
  text("footerTitle", footer.title || "Observatory partners");
  text("footerText", footer.text || "");

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

function chartOptions(yTitle) {
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
      },
    },
    scales: {
      x: {
        grid: {
          color: chartPalette.grid,
        },
        ticks: {
          color: chartPalette.muted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
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

  const heroMeta = document.getElementById("heroMeta");
  heroMeta.replaceChildren(
    renderMetaChip({ label: "Status", value: "Unavailable" }),
    renderMetaChip({ label: "Detail", value: error.message })
  );

  renderSummaryMetrics([]);
  renderNotes([]);
  renderFooter({});
}

function text(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function formatAxisTime(timestamp) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
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
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

main();
