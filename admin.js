// Paste the published CSV URL for your Google Sheet Orders tab here.
const ORDERS_CSV_URL = "";

let rows = [];
let headers = [];

function parseCSV(text) {
  const result = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(value); value = "";
      if (row.some(cell => cell !== "")) result.push(row);
      row = [];
    } else value += char;
  }
  if (value || row.length) { row.push(value); result.push(row); }
  return result;
}

function render() {
  const q = document.getElementById("search").value.toLowerCase();
  const status = document.getElementById("statusFilter").value.toLowerCase();
  const statusIndex = headers.findIndex(h => h.toLowerCase() === "status");

  const filtered = rows.filter(row => {
    const matchesSearch = !q || row.join(" ").toLowerCase().includes(q);
    const matchesStatus = !status || (statusIndex >= 0 && String(row[statusIndex] || "").toLowerCase() === status);
    return matchesSearch && matchesStatus;
  });

  document.getElementById("tableHead").innerHTML = headers.map(h => `<th>${h}</th>`).join("");
  document.getElementById("tableBody").innerHTML = filtered.length
    ? filtered.map(row => `<tr>${headers.map((h,i) => {
        const val = row[i] || "";
        return `<td>${h.toLowerCase()==="status" ? `<span class="status">${val}</span>` : val}</td>`;
      }).join("")}</tr>`).join("")
    : '<tr><td colspan="20">No matching orders.</td></tr>';

  document.getElementById("totalOrders").textContent = rows.length;
  document.getElementById("newOrders").textContent =
    statusIndex >= 0 ? rows.filter(r => String(r[statusIndex] || "").toLowerCase() === "new").length : 0;
}

async function loadOrders() {
  if (!ORDERS_CSV_URL) return;
  try {
    const response = await fetch(ORDERS_CSV_URL + (ORDERS_CSV_URL.includes("?") ? "&" : "?") + "t=" + Date.now());
    const parsed = parseCSV(await response.text());
    headers = parsed.shift() || [];
    rows = parsed;
    render();
  } catch (error) {
    document.getElementById("tableBody").innerHTML = `<tr><td>Could not load orders: ${error.message}</td></tr>`;
  }
}

document.getElementById("search").addEventListener("input", render);
document.getElementById("statusFilter").addEventListener("change", render);
document.getElementById("refresh").addEventListener("click", loadOrders);
loadOrders();
