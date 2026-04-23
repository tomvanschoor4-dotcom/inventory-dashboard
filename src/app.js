const statusEl = document.getElementById("status");
const skuCountEl = document.getElementById("skuCount");
const totalInventoryEl = document.getElementById("totalInventory");
const lowInventoryCountEl = document.getElementById("lowInventoryCount");
const skuSearchEl = document.getElementById("skuSearch");
const classFilterEl = document.getElementById("classFilter");
const metricSelectorEl = document.getElementById("metricSelector");
const tableHead = document.querySelector("#skuTable thead");
const tableBody = document.querySelector("#skuTable tbody");

let allRows = [];
let weekColumns = [];

function toNumber(value) {
  if (value === null || value === undefined) return 0;

  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\(/g, "-")
    .replace(/\)/g, "")
    .trim();

  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

function monthNameToNumber(month) {
  const map = {
    JANUARY: 1,
    FEBRUARY: 2,
    MARCH: 3,
    APRIL: 4,
    MAY: 5,
    JUNE: 6,
    JULY: 7,
    AUGUST: 8,
    SEPTEMBER: 9,
    OCTOBER: 10,
    NOVEMBER: 11,
    DECEMBER: 12
  };
  return map[String(month || "").toUpperCase()] || 99;
}

function buildWeekColumns(data) {
  const weeks = data
    .filter(row => monthNameToNumber(row["Fiscal Month Desc"]) <= 12)
    .map(row => ({
      fiscalWeek: Number(row["Fiscal Week"]),
      month: String(row["Fiscal Month Desc"] || "").toUpperCase()
    }))
    .filter(row => !isNaN(row.fiscalWeek));

  const unique = [];
  const seen = new Set();

  weeks.forEach(w => {
    if (!seen.has(w.fiscalWeek)) {
      seen.add(w.fiscalWeek);
      unique.push(w);
    }
  });

  unique.sort((a, b) => a.fiscalWeek - b.fiscalWeek);

  return unique.map(w => ({
    key: String(w.fiscalWeek),
    label: String(w.fiscalWeek)
  }));
}

function getMetricValue(row, weekKey, metric) {
  switch (metric) {
    case "bop":
      return row.weeklyBOP[weekKey] ?? 0;
    case "onOrder":
      return row.weeklyOnOrder[weekKey] ?? 0;
    case "backorder":
      return row.weeklyBackorder[weekKey] ?? 0;
    case "forecast":
      return row.weeklyForecast[weekKey] ?? 0;
    case "recommended":
      return row.weeklyRecommended[weekKey] ?? 0;
    case "projected":
    default:
      return (row.weeklyBOP[weekKey] ?? 0) + (row.weeklyOnOrder[weekKey] ?? 0);
  }
}

function pivotData(rawData) {
  const map = {};

  rawData.forEach(row => {
    const monthDesc = String(row["Fiscal Month Desc"] || "").toUpperCase();
    if (monthNameToNumber(monthDesc) > 12) return;

    const sku = String(row["SKU"] || "").trim();
    if (!sku) return;

    const fiscalWeek = String(row["Fiscal Week"] || "").trim();
    const skuName = String(row["SKU Name"] || "").trim();
    const className = String(row["Class"] || "").trim();
    const collection = String(row["Collection"] || "").trim();

    const bopUnits = toNumber(row["BOP U"]);
    const onOrderUnits = toNumber(row["On Order Units"]);
    const backorderUnits = toNumber(row["Backorder U BOP"]);
    const forecastUnits = toNumber(row["Effective Forecast Units"]);
    const recommendedUnits = toNumber(row["Recommended Order Units DC"]);

    if (!map[sku]) {
      map[sku] = {
        sku,
        skuName,
        className,
        collection,
        size: "—",
        color: "—",
        weeklyBOP: {},
        weeklyOnOrder: {},
        weeklyBackorder: {},
        weeklyForecast: {},
        weeklyRecommended: {}
      };
    }

    // SUM values instead of overwriting, because there can be multiple rows per SKU/week
    map[sku].weeklyBOP[fiscalWeek] = (map[sku].weeklyBOP[fiscalWeek] ?? 0) + bopUnits;
    map[sku].weeklyOnOrder[fiscalWeek] = (map[sku].weeklyOnOrder[fiscalWeek] ?? 0) + onOrderUnits;
    map[sku].weeklyBackorder[fiscalWeek] = (map[sku].weeklyBackorder[fiscalWeek] ?? 0) + backorderUnits;
    map[sku].weeklyForecast[fiscalWeek] = (map[sku].weeklyForecast[fiscalWeek] ?? 0) + forecastUnits;
    map[sku].weeklyRecommended[fiscalWeek] = (map[sku].weeklyRecommended[fiscalWeek] ?? 0) + recommendedUnits;
  });

  return Object.values(map);
}

function renderCards(rows) {
  const selectedMetric = metricSelectorEl.value;
  const firstWeek = weekColumns[0]?.key;

  const totalInventory = rows.reduce((sum, row) => {
    return sum + (firstWeek ? getMetricValue(row, firstWeek, selectedMetric) : 0);
  }, 0);

  const lowInventoryCount = rows.filter(row => {
    const val = firstWeek ? getMetricValue(row, firstWeek, selectedMetric) : 0;
    return val > 0 && val <= 5;
  }).length;

  skuCountEl.textContent = rows.length.toLocaleString();
  totalInventoryEl.textContent = totalInventory.toLocaleString();
  lowInventoryCountEl.textContent = lowInventoryCount.toLocaleString();
}

function renderTable(rows) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const selectedMetric = metricSelectorEl.value;

  const staticHeaders = [
    "SKU",
    "SKU Name",
    "Class",
    "Collection",
    "Size",
    "Color"
  ];

  const headerRow = document.createElement("tr");

  staticHeaders.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  weekColumns.forEach(week => {
    const th = document.createElement("th");
    th.textContent = week.label;
    headerRow.appendChild(th);
  });

  tableHead.appendChild(headerRow);

  rows.forEach(row => {
    const tr = document.createElement("tr");

    const staticValues = [
      row.sku,
      row.skuName,
      row.className,
      row.collection,
      row.size,
      row.color
    ];

    staticValues.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    weekColumns.forEach((week, index) => {
      const value = getMetricValue(row, week.key, selectedMetric);
      const td = document.createElement("td");
      td.textContent = value.toLocaleString();

      if (value < 0) td.classList.add("neg");
      if (value === 0) td.classList.add("zero");
      if (index === 0 && value > 0 && value <= 5) td.classList.add("low");

      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

function applyFilters() {
  const searchTerm = skuSearchEl.value.toLowerCase().trim();
  const classValue = classFilterEl.value;
  const selectedMetric = metricSelectorEl.value;

  let filtered = [...allRows];

  if (searchTerm) {
    filtered = filtered.filter(row => {
      const sku = row.sku.toLowerCase();
      const name = row.skuName.toLowerCase();
      return sku.includes(searchTerm) || name.includes(searchTerm);
    });
  }

  if (classValue) {
    filtered = filtered.filter(row => row.className === classValue);
  }

  const firstWeek = weekColumns[0]?.key;
  filtered.sort((a, b) => {
    const aVal = firstWeek ? getMetricValue(a, firstWeek, selectedMetric) : 0;
    const bVal = firstWeek ? getMetricValue(b, firstWeek, selectedMetric) : 0;
    return bVal - aVal;
  });

  renderCards(filtered);
  renderTable(filtered);
  statusEl.textContent = `Showing ${filtered.length.toLocaleString()} SKUs`;
}

Papa.parse("../data/inventory.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const rawData = results.data;

    if (!rawData || rawData.length === 0) {
      statusEl.textContent = "No data found.";
      return;
    }

    weekColumns = buildWeekColumns(rawData);
    allRows = pivotData(rawData);

    const uniqueClasses = [...new Set(allRows.map(row => row.className).filter(Boolean))].sort();
    uniqueClasses.forEach(className => {
      const option = document.createElement("option");
      option.value = className;
      option.textContent = className;
      classFilterEl.appendChild(option);
    });

    applyFilters();
  },
  error: function(error) {
    console.error(error);
    statusEl.textContent = "Error loading CSV.";
  }
});

skuSearchEl.addEventListener("input", applyFilters);
classFilterEl.addEventListener("change", applyFilters);
metricSelectorEl.addEventListener("change", applyFilters);