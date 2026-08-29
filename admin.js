const endpointInput = document.querySelector("#endpoint");
const keyInput = document.querySelector("#adminKey");
const loadButton = document.querySelector("#loadResponses");
const downloadButton = document.querySelector("#downloadResponses");
const statusBox = document.querySelector("#adminStatus");
const body = document.querySelector("#responsesBody");
let loadedRows = [];

endpointInput.value = localStorage.getItem("weddingRsvpEndpoint") || "";

function setStatus(text) {
  statusBox.textContent = text;
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text || "—";
  return td;
}

function renderRows(rows) {
  body.replaceChildren();
  if (!rows.length) {
    const row = document.createElement("tr");
    const empty = cell("Пока никто не ответил.");
    empty.colSpan = 6;
    empty.className = "responses-empty";
    row.append(empty);
    body.append(row);
    return;
  }
  rows.forEach(item => {
    const row = document.createElement("tr");
    row.append(
      cell(item["Дата ответа"]), cell(item["ФИО"]), cell(item["Присутствие"]),
      cell(item["Количество гостей"]), cell(item["Телефон"]), cell(item["Комментарий"])
    );
    body.append(row);
  });
}

loadButton.addEventListener("click", async () => {
  const endpoint = endpointInput.value.trim();
  const key = keyInput.value.trim();
  if (!endpoint || !key) return setStatus("Укажите URL Apps Script и секретный ключ.");
  localStorage.setItem("weddingRsvpEndpoint", endpoint);
  loadButton.disabled = true;
  setStatus("Получаем ответы…");
  try {
    const url = new URL(endpoint);
    url.searchParams.set("action", "list");
    url.searchParams.set("key", key);
    url.searchParams.set("t", Date.now());
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Сервис не вернул ответы.");
    loadedRows = data.rows || [];
    renderRows(loadedRows);
    downloadButton.disabled = !loadedRows.length;
    setStatus(`Получено ответов: ${data.count || 0}.`);
  } catch (error) {
    setStatus(`Не удалось получить ответы: ${error.message}`);
  } finally {
    loadButton.disabled = false;
  }
});

downloadButton.addEventListener("click", () => {
  if (!loadedRows.length) return;
  const headers = ["Дата ответа", "ФИО", "Присутствие", "Количество гостей", "Телефон", "Комментарий"];
  const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = "\uFEFF" + [headers, ...loadedRows.map(row => headers.map(header => row[header] || ""))]
    .map(row => row.map(quote).join(";"))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = "pavel-darina-rsvp.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});
