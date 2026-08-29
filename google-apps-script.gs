/**
 * Приём ответов гостей в Google Таблицу и закрытая выдача для admin.html.
 *
 * 1. Создайте Google Таблицу и откройте Расширения -> Apps Script.
 * 2. Вставьте этот файл и сохраните.
 * 3. Запустите setupWeddingRsvp, выдайте разрешения и придумайте секретный ключ.
 * 4. Разверните как веб-приложение: выполнять от вашего имени, доступ - всем.
 * 5. URL развёртывания вставьте в GOOGLE_APPS_SCRIPT_URL файла script.js.
 */
const SHEET_NAME = "Ответы";
const HEADERS = [
  "ID", "Дата ответа", "ФИО", "Присутствие", "Количество гостей",
  "Телефон", "Комментарий", "Страница"
];

function setupWeddingRsvp() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Откройте Apps Script из нужной Google Таблицы.");
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Ключ для просмотра ответов",
    "Придумайте секретный ключ. Он понадобится на странице admin.html.",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const key = response.getResponseText().trim();
  if (key.length < 8) throw new Error("Ключ должен содержать не менее 8 символов.");
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID: spreadsheet.getId(),
    ADMIN_KEY: key
  });
  ensureSheet_();
  spreadsheet.toast("Сбор ответов настроен. Теперь разверните скрипт как веб-приложение.");
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheet_() {
  const spreadsheet = getSpreadsheet_();
  if (!spreadsheet) throw new Error("Google Таблица не настроена. Запустите setupWeddingRsvp.");
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#6d2435")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 150);
    sheet.setColumnWidth(3, 280);
    sheet.setColumnWidth(7, 320);
  }
  return sheet;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    if (!String(data.names || "").trim() || !String(data.attendance || "").trim()) {
      return json_({ ok: false, error: "Не заполнены ФИО или ответ о присутствии." });
    }
    const sheet = ensureSheet_();
    sheet.appendRow([
      Utilities.getUuid(),
      data.submittedAt ? new Date(data.submittedAt) : new Date(),
      data.names || "",
      data.attendance || "",
      data.guestCount || "",
      data.phone || "",
      data.comment || "",
      data.source || ""
    ]);
    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(event) {
  const action = String((event && event.parameter && event.parameter.action) || "status");
  if (action !== "list") {
    return json_({ ok: true, service: "Pavel & Darina RSVP", sheet: SHEET_NAME });
  }

  const suppliedKey = String((event && event.parameter && event.parameter.key) || "");
  const expectedKey = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY") || "";
  if (!expectedKey || suppliedKey !== expectedKey) {
    return json_({ ok: false, error: "Неверный ключ администратора." });
  }

  const values = ensureSheet_().getDataRange().getDisplayValues();
  const headers = values.shift() || HEADERS;
  const rows = values.reverse().map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
  return json_({ ok: true, count: rows.length, rows: rows });
}
