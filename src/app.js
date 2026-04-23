const table = document.getElementById("data-table");

Papa.parse("../data/inventory.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    console.log("Parsed results:", results);

    const data = results.data;

    if (!data || data.length === 0) {
      table.innerHTML = "<tr><td>No data found.</td></tr>";
      return;
    }

    const headers = Object.keys(data[0]);

    // Build header row
    const headerRow = document.createElement("tr");
    headers.forEach(header => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Only show first 50 rows for now
    data.slice(0, 50).forEach(row => {
      const tr = document.createElement("tr");

      headers.forEach(header => {
        const td = document.createElement("td");
        td.textContent = row[header] ?? "";
        tr.appendChild(td);
      });

      table.appendChild(tr);
    });
  },
  error: function(error) {
    console.error("CSV loading error:", error);
    table.innerHTML = "<tr><td>Error loading CSV.</td></tr>";
  }
});