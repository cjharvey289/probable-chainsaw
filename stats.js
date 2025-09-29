let allRows = [];
let mealsChart, drinkChart, symptomsChart;

async function loadSheet() {
  const sheetID = "16j6tMO_QqXk5y9CiJXOVvvasrQZAEUkNQr4sYJMVJgw";
  const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&headers=1`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substr(47).slice(0, -2));
    allRows = json.table.rows.slice(1); // skip header
    console.log("Loaded rows:", allRows.length);
    updateCharts("all");
  } catch (err) {
    console.error("Error loading sheet:", err);
    alert("Error loading data. Check console for details.");
  }
}

// --- Helpers ---
function parseSheetDate(cell) {
  if (!cell) return null;
  if (cell.f) return new Date(cell.f); // formatted date string
  if (typeof cell.v === "string") return new Date(cell.v);
  if (typeof cell.v === "number") {
    // Google serial date (days since 1899-12-30)
    return new Date(1899, 11, 30 + cell.v);
  }
  return null;
}

function parseWater(str) {
  if (!str) return 0;
  const nums = String(str).match(/[\d.]+/g);
  if (!nums) return 0;
  return Math.max(...nums.map(Number));
}

function normalize(str) {
  if (!str) return "";
  const map = {
    sandwhich: "sandwich",
    cerial: "cereal",
    headace: "headache",
    nasea: "nausea",
  };
  let key = str.trim().toLowerCase();
  return map[key] || key;
}

// --- Charts ---
function updateCharts(period) {
  let cutoff = new Date(0);
  const today = new Date();
  if (period === "week") cutoff = new Date(Date.now() - 7 * 86400000);
  if (period === "month")
    cutoff = new Date(today.setMonth(today.getMonth() - 1));
  if (period === "year")
    cutoff = new Date(today.setFullYear(today.getFullYear() - 1));

  let mealCounts = { Breakfast: {}, Lunch: {}, Dinner: {} };
  let totalWater = 0,
    waterCount = 0;
  let symptomCounts = {};

  allRows.forEach((r) => {
    if (!r.c) return;
    const date = parseSheetDate(r.c[0]);
    if (!date || date < cutoff) return;

    const breakfast = r.c[1]?.v || "";
    const lunch = r.c[2]?.v || "";
    const dinner = r.c[3]?.v || "";
    let water = parseWater(r.c[4]?.v || "");
    const symptoms = r.c[5]?.v || "";

    [
      ["Breakfast", breakfast],
      ["Lunch", lunch],
      ["Dinner", dinner],
    ].forEach(([meal, item]) => {
      if (item) {
        const key = normalize(item);
        mealCounts[meal][key] = (mealCounts[meal][key] || 0) + 1;
      }
    });

    if (water > 0) {
      totalWater += water;
      waterCount++;
    }

    if (
      symptoms &&
      symptoms.toLowerCase() !== "n/a" &&
      symptoms.toLowerCase() !== "none"
    ) {
      symptoms.split(",").forEach((sym) => {
        const key = normalize(sym);
        if (key) symptomCounts[key] = (symptomCounts[key] || 0) + 1;
      });
    }
  });

  updateMealChart(mealCounts);
  updateWaterChart(totalWater, waterCount);
  updateSymptomsChart(symptomCounts);
}

function updateMealChart(mealCounts) {
  const labels = Array.from(
    new Set([
      ...Object.keys(mealCounts.Breakfast),
      ...Object.keys(mealCounts.Lunch),
      ...Object.keys(mealCounts.Dinner),
    ])
  );

  if (mealsChart) mealsChart.destroy();
  mealsChart = new Chart(document.getElementById("mealsChart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Breakfast",
          data: labels.map((l) => mealCounts.Breakfast[l] || 0),
          backgroundColor: "#FF6384",
        },
        {
          label: "Lunch",
          data: labels.map((l) => mealCounts.Lunch[l] || 0),
          backgroundColor: "#36A2EB",
        },
        {
          label: "Dinner",
          data: labels.map((l) => mealCounts.Dinner[l] || 0),
          backgroundColor: "#4CAF50",
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } },
  });
}

function updateWaterChart(totalWater, waterCount) {
  const avgWater = waterCount ? (totalWater / waterCount).toFixed(2) : 0;
  if (drinkChart) drinkChart.destroy();
  drinkChart = new Chart(document.getElementById("drinkChart"), {
    type: "doughnut",
    data: {
      labels: ["Avg Water (L)", "Remaining (to 3L)"],
      datasets: [
        {
          data: [avgWater, Math.max(0, 3 - avgWater)],
          backgroundColor: ["#FFCE56", "#e0e0e0"],
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });
}

function updateSymptomsChart(symptomCounts) {
  if (symptomsChart) symptomsChart.destroy();
  symptomsChart = new Chart(document.getElementById("symptomsChart"), {
    type: "bar",
    data: {
      labels: Object.keys(symptomCounts),
      datasets: [
        {
          label: "Occurrences",
          data: Object.values(symptomCounts),
          backgroundColor: "#9966FF",
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });
}

loadSheet();
