/**
 * FINAL SYSTEM (COUNTERPARTY BLOCK UI)
 * Истина: ЛИСТ МЕНЕДЖЕРА
 * БД: хранит все строки
 *
 * ВАЖНО:
 * - Дата баланса/Обновлено не должны меняться из-за скриптовой перерисовки/выгрузки.
 * - В БД нет авто-проставления дат.
 */

const CFG = {
  DB: "БД",

  MANAGER_SHEETS: ["Alpha", "Giba", "Marcus", "Nitish", "Jacob", "Viza", "Hanare Ro", "xssyao"],

  STATUSES: ["● Активно", "◐ Пауза", "⛔ Заблокировано", "⚠ Проблема", "○ Закрыто"],
  HIDE_FROM_MANAGERS_STATUSES: ["○ Закрыто", "⛔ Заблокировано"],

  PROJECTS: [
    "1xBet", "4rabet", "Batery.in", "1win.pro", "Melbet.com", "Cwinz", "Rajbets.com",
    "Pin-up.bet", "Odds96", "Lopebet", "Bluechip.io", "BC.game", "Oppa888.com", "22bet",
    "Glory.bet", "Crickex.com", "9winz.com", "Paripulse", "Vbet10", "Megapari", "Mostbet",
    "12bet.com", "piratespot1.com", "chillbet.net", "Shareus", "Binany", "Maxi",
    "Spinbetter", "Lucky-star", "Bettilt", "Valor.bet", "Easy-X Casino", "Нет проекта",
    "1xslots", "Betandyou", "Betwinner", "DBbet", "Bilbet"
  ],

  RATINGS: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"],
  FLOW_TYPES: ["Старый флоу", "Новый флоу"],
  MONEY_FLOW_STATUSES: ["🟦 Отыгрывается", "🟧 Выводится", "🛑 Проиграно"],

  DB_HEADERS: [
    "ID", "Менеджер", "Контрагент", "Флоу", "Проект", "Логин", "Пароль", "Ссылка",
    "Баланс", "Дата баланса", "Статус", "Оценка контрагента", "Заметка",
    "Отправлено на отыгрыш", "Готово к выводу", "Поставили на вывод",
    "Статус движения средств", "Обновлено"
  ],

  CREATOR_NICK: "Khan",
  PRETTY_ROWS_LIMIT: 1000,
  BALANCE_DATETIME_FORMAT: "dd.MM.yyyy HH:mm:ss",

  // ID, менеджер, контрагент, флоу, проект, логин, пароль, ссылка, баланс, дата, статус, рейтинг, заметка, 3 money, статус money, updated
  COL_WIDTHS: [90, 125, 190, 130, 160, 190, 115, 170, 120, 145, 150, 175, 270, 165, 180, 180, 210, 180],

  TS_MUTE_SECONDS: 120,

  DENSE_MODE: false
};

const THEME = {
  headerBg: "#1f2937",
  headerFg: "#ffffff",
  titleBg: "#f3f4f6",
  titleFg: "#6b7280",
  zebraBg: "#fbfdff",
  blockHeadBg: "#eef2f7",
  blockOldFlowBg: "#f1f5f9",
  blockNewFlowBg: "#ecfeff",
  blockBorder: "#94a3b8",
  regularRowHeight: 30,
  blockHeadRowHeight: 40,
  regularRowHeightDense: 28,
  blockHeadRowHeightDense: 38
};

const LAYOUTS = {
  modern: { mode: "modern", useTitle: true, titleRow: 1, headerRow: 2, startRow: 3, freezeRows: 2, freezeCols: 6 },
  legacy: { mode: "legacy", useTitle: false, titleRow: null, headerRow: 1, startRow: 2, freezeRows: 1, freezeCols: 6 }
};

const LAYOUT_PROP_KEY = "SYS_LAYOUT_MODE";
let __LAYOUT_CACHE = null;

function getLayout_() {
  if (__LAYOUT_CACHE) return __LAYOUT_CACHE;
  const mode = String(PropertiesService.getDocumentProperties().getProperty(LAYOUT_PROP_KEY) || "modern").trim();
  __LAYOUT_CACHE = mode === "legacy" ? LAYOUTS.legacy : LAYOUTS.modern;
  return __LAYOUT_CACHE;
}
function setLayoutMode_(mode) {
  PropertiesService.getDocumentProperties().setProperty(LAYOUT_PROP_KEY, mode === "legacy" ? "legacy" : "modern");
  __LAYOUT_CACHE = null;
}
function headerRow_() { return getLayout_().headerRow; }
function startRow_() { return getLayout_().startRow; }
function useTitle_() { return getLayout_().useTitle; }

const COL0 = (() => {
  const m = {};
  CFG.DB_HEADERS.forEach((h, i) => { m[h] = i; });
  return m;
})();
function idx0_(name) {
  const i = COL0[name];
  if (i === undefined) throw new Error(`Не найдена колонка: ${name}`);
  return i;
}
function idx1_(name) { return idx0_(name) + 1; }


function regularRowHeight_() { return CFG.DENSE_MODE ? THEME.regularRowHeightDense : THEME.regularRowHeight; }
function blockHeadRowHeight_() { return CFG.DENSE_MODE ? THEME.blockHeadRowHeightDense : THEME.blockHeadRowHeight; }

function uiHeaders_() {
  return CFG.DB_HEADERS.map(h => {
    if (h === "Баланс") return "💰 Баланс";
    if (h === "Дата баланса") return "📅 Дата баланса";
    if (h === "Статус") return "🧾 Статус";
    if (h === "Статус движения средств") return "🔄 Статус движения средств";
    return h;
  });
}

function logicalHeader_(headerCell) {
  return String(headerCell || "").replace(/^[^\w\u0400-\u04FF]+\s*/, "").trim();
}

function isTransientSpreadsheetError_(e) {
  const m = String((e && e.message) ? e.message : e).toLowerCase();
  return m.includes("cannot get access") || m.includes("try again") || m.includes("timed out") || m.includes("service spreadsheets") || m.includes("слишком долго");
}
function withSpreadsheetRetry_(fn, tries) {
  const max = tries || 5;
  let lastErr = null;
  for (let i = 0; i < max; i++) {
    try { return fn(); } catch (e) {
      lastErr = e;
      if (!isTransientSpreadsheetError_(e) || i === max - 1) throw e;
      Utilities.sleep(400 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

const TS_MUTE_UNTIL_KEY = "SYS_TS_MUTE_UNTIL_MS";
function muteTimestampRepair_(seconds) {
  const sec = Number(seconds || CFG.TS_MUTE_SECONDS || 120);
  const until = Date.now() + Math.max(10, sec) * 1000;
  PropertiesService.getDocumentProperties().setProperty(TS_MUTE_UNTIL_KEY, String(until));
}
function isTimestampRepairMuted_() {
  const until = Number(PropertiesService.getDocumentProperties().getProperty(TS_MUTE_UNTIL_KEY) || "0");
  return Date.now() < until;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🧩 Система БД")
    .addItem("АДМИН: Построить систему (АКТУАЛЬНЫЙ формат)", "adminBuildSystemModern")
    .addItem("АДМИН: Построить систему (СТАРЫЙ формат)", "adminBuildSystemLegacy")
    .addSeparator()
    .addItem("Менеджер: Отправить данные в БД + перерисовать лист", "managerRefreshMyData")
    .addSeparator()
    .addItem("АДМИН: Отправить данные в БД всех менеджеров", "adminCollectAllManagers")
    .addSeparator()
    .addItem("АДМИН: Защитить ID", "protectIdColumns_")
    .addItem("АДМИН: Включить ремонтёр snapshot", "setupSnapshotRepairTrigger_")
    .addSeparator()
    .addItem("АДМИН: Проставить ID пустым строкам в БД", "adminFillMissingIdsInDB")
    .addItem("АДМИН: Восстановить формат текущего листа", "adminRestoreFormatActiveSheet")
    .addItem("АДМИН: Выгрузить БД → листы (ВСЕ строки)", "adminExportDBToAllManagers")
    .addSeparator()
    .addItem("ВИД: Компактный", "adminApplyViewCompact")
    .addItem("ВИД: Аудит", "adminApplyViewAudit")
    .addItem("ВИД: Финансы", "adminApplyViewFinance")
    .addToUi();
}


function applyViewPreset_(name) {
  const ss = SpreadsheetApp.getActive();
  let widths = CFG.COL_WIDTHS.slice();
  if (name === "compact") widths = [80, 110, 170, 120, 145, 170, 105, 150, 110, 130, 140, 160, 240, 150, 170, 170, 190, 170];
  if (name === "audit") widths = [90, 125, 210, 140, 160, 200, 120, 220, 125, 165, 160, 190, 320, 170, 180, 180, 220, 190];
  if (name === "finance") widths = [90, 115, 170, 120, 145, 170, 110, 160, 130, 150, 155, 165, 240, 200, 210, 210, 230, 200];

  [CFG.DB].concat(CFG.MANAGER_SHEETS).forEach(sheetName => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;
    widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  });

  SpreadsheetApp.getUi().alert(`Готово ✅ Применен вид: ${name}`);
}

function adminApplyViewCompact() { applyViewPreset_("compact"); }
function adminApplyViewAudit() { applyViewPreset_("audit"); }
function adminApplyViewFinance() { applyViewPreset_("finance"); }

function adminBuildSystemModern() { runBuildWithLock_("modern"); }
function adminBuildSystemLegacy() { runBuildWithLock_("legacy"); }
function runBuildWithLock_(mode) {
  const ss = SpreadsheetApp.getActive();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    setLayoutMode_(mode);
    withSpreadsheetRetry_(() => buildSystem_(ss), 5);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function buildSystem_(ss) {
  const layout = getLayout_();
  muteTimestampRepair_(CFG.TS_MUTE_SECONDS);

  ensureDB_(ss);
  buildManagerSheets_(ss);

  const db = getSheetOrThrow_(ss, CFG.DB);
  if (db.getLastRow() < startRow_()) insertSampleData_(db);

  CFG.MANAGER_SHEETS.forEach(name => withSpreadsheetRetry_(() => refreshManagerSheet_(ss, name), 4));

  SpreadsheetApp.getUi().alert(
    `Готово ✅\nФормат: ${layout.mode}\nDB: headerRow=${layout.headerRow}, startRow=${layout.startRow}\n\nОткрой лист менеджера и работай через меню.`
  );
}

function getSheetOrThrow_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error(`Лист не найден: "${name}"`);
  return sh;
}
function isManagerSheetName_(name) { return CFG.MANAGER_SHEETS.includes(name); }
function removeAllBandings_(sh) { sh.getBandings().forEach(b => b.remove()); }

function columnToLetter_(column) {
  let temp = "", letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}
function applyColumnWidths_(sh) { CFG.COL_WIDTHS.forEach((w, i) => sh.setColumnWidth(i + 1, w)); }

function applyStandardFormats_(sh, startRow, rowCount) {
  if (!rowCount || rowCount <= 0) return;
  sh.getRange(startRow, idx1_("Баланс"), rowCount, 1).setNumberFormat("#,##0.00");
  sh.getRange(startRow, idx1_("Дата баланса"), rowCount, 1).setNumberFormat(CFG.BALANCE_DATETIME_FORMAT);
  sh.getRange(startRow, idx1_("Отправлено на отыгрыш"), rowCount, 3).setNumberFormat("#,##0.00");
  sh.getRange(startRow, idx1_("Обновлено"), rowCount, 1).setNumberFormat("dd.MM.yyyy HH:mm:ss");
}

function applyTitleRow_(sh) {
  if (!useTitle_()) return;
  const lastCol = CFG.DB_HEADERS.length;
  const full = sh.getRange(1, 1, 1, lastCol);
  try { full.breakApart(); } catch (e) {}
  full.clearContent();

  let startCol = 1;
  for (let c = 1; c <= lastCol; c++) {
    let hidden = false;
    try { hidden = sh.isColumnHiddenByUser(c) || sh.isColumnHiddenByFilter(c); } catch (e) { hidden = sh.isColumnHiddenByUser(c); }
    if (!hidden) { startCol = c; break; }
  }

  const mergeRange = sh.getRange(1, startCol, 1, lastCol - startCol + 1);
  mergeRange.merge();
  sh.getRange(1, startCol)
    .setValue(`Система БД • by ${CFG.CREATOR_NICK}`)
    .setFontFamily("Inter")
    .setFontSize(10)
    .setFontWeight("normal")
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle")
    .setBackground(THEME.titleBg)
    .setFontColor(THEME.titleFg);
  sh.setRowHeight(1, 26);
}

function ensureDB_(ss) {
  const layout = getLayout_();
  const lastCol = CFG.DB_HEADERS.length;
  let db = ss.getSheetByName(CFG.DB);
  if (!db) db = ss.insertSheet(CFG.DB, 0);

  muteTimestampRepair_(CFG.TS_MUTE_SECONDS);
  db.clear();
  removeAllBandings_(db);
  applyTitleRow_(db);
  db.getRange(layout.headerRow, 1, 1, lastCol).setValues([uiHeaders_()]);

  try { db.setFrozenRows(layout.freezeRows); } catch (e) {}
  try { db.setFrozenColumns(layout.freezeCols); } catch (e) {}

  applyColumnWidths_(db);

  try { const f = db.getFilter(); if (f) f.remove(); } catch (e) {}
  try { db.getRange(layout.headerRow, 1, 1, lastCol).createFilter(); } catch (e) {}

  const maxBodyRows = Math.max(1, db.getMaxRows() - (layout.startRow - 1));
  applyStandardFormats_(db, layout.startRow, maxBodyRows);
  setDBPlainTextColumns_(db);
  applyDBValidations_(db);
  beautifyDB_(db);
  return db;
}

function buildManagerSheets_(ss) {
  const layout = getLayout_();
  const lastCol = CFG.DB_HEADERS.length;
  muteTimestampRepair_(CFG.TS_MUTE_SECONDS);

  CFG.MANAGER_SHEETS.forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    sh.clear();
    removeAllBandings_(sh);
    applyTitleRow_(sh);
    sh.getRange(layout.headerRow, 1, 1, lastCol).setValues([uiHeaders_()]);

    try { sh.setFrozenRows(layout.freezeRows); } catch (e) {}
    try { sh.setFrozenColumns(layout.freezeCols); } catch (e) {}

    applyColumnWidths_(sh);
    try { sh.hideColumn(sh.getRange(1, 1)); } catch (e) {}
    try { sh.hideColumn(sh.getRange(1, 2)); } catch (e) {}

    applyManagerSheetFormatting_(sh);
    applyStatusConditionalFormatting_(sh);
  });
}

function insertSampleData_(db) {
  const layout = getLayout_();
  const now = new Date();
  const r = new Array(CFG.DB_HEADERS.length).fill("");

  r[idx0_("ID")] = nextRowId_();
  r[idx0_("Менеджер")] = CFG.MANAGER_SHEETS[0] || "Alpha";
  r[idx0_("Контрагент")] = "@example";
  r[idx0_("Флоу")] = CFG.FLOW_TYPES[1];
  r[idx0_("Проект")] = CFG.PROJECTS[0] || "1xBet";
  r[idx0_("Логин")] = "alpha@mail.com";
  r[idx0_("Пароль")] = "pass123";
  r[idx0_("Ссылка")] = "https://example.com";
  r[idx0_("Баланс")] = 1200;
  r[idx0_("Дата баланса")] = now;
  r[idx0_("Статус")] = "● Активно";
  r[idx0_("Оценка контрагента")] = "⭐⭐⭐⭐⭐";
  r[idx0_("Заметка")] = "demo";
  r[idx0_("Отправлено на отыгрыш")] = 300;
  r[idx0_("Готово к выводу")] = 150;
  r[idx0_("Поставили на вывод")] = 50;
  r[idx0_("Статус движения средств")] = "🟦 Отыгрывается";
  r[idx0_("Обновлено")] = now;

  db.getRange(layout.startRow, 1, 1, CFG.DB_HEADERS.length).setValues([r]);
  beautifyDB_(db);
}

function managerRefreshMyData() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();
  const managerName = sh.getName();
  if (!isManagerSheetName_(managerName)) return SpreadsheetApp.getUi().alert("Открой лист менеджера.");

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) return SpreadsheetApp.getUi().alert("⏳ Уже выполняется.");

  try {
    muteTimestampRepair_(CFG.TS_MUTE_SECONDS);
    const res = withSpreadsheetRetry_(() => pushManagerEditsToDB_(ss, managerName), 4);
    withSpreadsheetRetry_(() => refreshManagerSheet_(ss, managerName), 4);
    SpreadsheetApp.getUi().alert(`Готово ✅\nОбновлено в БД: ${res.updated}\nПропущено: ${res.skipped}\n\nДата баланса/Обновлено не меняются из-за перерисовки.`);
  } finally {
    lock.releaseLock();
  }
}

function adminCollectAllManagers() {
  const ss = SpreadsheetApp.getActive();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  let totalUpdated = 0;
  let totalSkipped = 0;
  try {
    CFG.MANAGER_SHEETS.forEach(m => {
      const res = withSpreadsheetRetry_(() => pushManagerEditsToDB_(ss, m), 4);
      totalUpdated += res.updated;
      totalSkipped += res.skipped;
    });
  } finally {
    lock.releaseLock();
  }
  SpreadsheetApp.getUi().alert(`Готово ✅\nОбновлено: ${totalUpdated}\nПропущено: ${totalSkipped}`);
}

function refreshManagerSheet_(ss, managerName, opts) {
  opts = opts || {};
  const includeHidden = !!opts.includeHiddenStatuses;
  const layout = getLayout_();

  const db = getSheetOrThrow_(ss, CFG.DB);
  const sh = getSheetOrThrow_(ss, managerName);
  const lastCol = CFG.DB_HEADERS.length;
  muteTimestampRepair_(CFG.TS_MUTE_SECONDS);

  const lastRow = db.getLastRow();
  const data = lastRow >= layout.startRow ? db.getRange(layout.startRow, 1, lastRow - (layout.startRow - 1), lastCol).getValues() : [];

  const iManager = idx0_("Менеджер");
  const iStatus = idx0_("Статус");
  const iCp = idx0_("Контрагент");
  const iFlow = idx0_("Флоу");
  const iProject = idx0_("Проект");
  const iId = idx0_("ID");
  const iRating = idx0_("Оценка контрагента");

  const rows = data
    .filter(r => {
      if (String(r[iManager] || "") !== managerName) return false;
      if (!includeHidden && CFG.HIDE_FROM_MANAGERS_STATUSES.includes(String(r[iStatus] || ""))) return false;
      return true;
    })
    .sort((a, b) =>
      String(a[iCp] || "").localeCompare(String(b[iCp] || "")) ||
      String(a[iProject] || "").localeCompare(String(b[iProject] || "")) ||
      String(a[iId] || "").localeCompare(String(b[iId] || ""))
    );

  const protectedCols = ["Отправлено на отыгрыш", "Готово к выводу", "Поставили на вывод", "Статус движения средств", "Обновлено"];

  // сохранить ручные money-поля по ID перед перерисовкой
  const preserve = new Map();
  const shLast = sh.getLastRow();
  if (shLast >= layout.startRow) {
    const cur = sh.getRange(layout.startRow, 1, shLast - layout.startRow + 1, lastCol).getValues();
    cur.forEach(r => {
      const id = String(r[iId] || "").trim();
      if (!id) return;
      const obj = {};
      protectedCols.forEach(c => { obj[c] = r[idx0_(c)]; });
      preserve.set(id, obj);
    });
  }

  // build display без пустых разделителей + поля блока 1 раз
  const display = [];
  let prevCp = "";
  rows.forEach(r => {
    const out = r.slice();
    const id = String(out[iId] || "").trim();
    if (id && preserve.has(id)) {
      const saved = preserve.get(id);
      protectedCols.forEach(c => { out[idx0_(c)] = saved[c]; });
    }

    const cp = String(out[iCp] || "").trim();
    if (prevCp && cp === prevCp) {
      out[iCp] = "";     // ник только 1 раз
      out[iFlow] = "";   // флоу только 1 раз
      out[iRating] = ""; // рейтинг только 1 раз
    } else if (cp) {
      prevCp = cp;
    }

    display.push(out);
  });

  clearValidationsForTableArea_(sh);
  setManagerSheetDisplaySafely_(sh, display, lastCol);

  if (display.length > 0) {
    const mgrCol = display.map(r => [String(r[iId] || "").trim() ? managerName : ""]);
    sh.getRange(layout.startRow, idx1_("Менеджер"), display.length, 1).setValues(mgrCol);
  }

  applyColumnWidths_(sh);
  if (display.length > 0) {
    applyStandardFormats_(sh, layout.startRow, display.length);
    applyManagerValidationsById_(sh, display.length);
  }

  applyManagerSheetFormatting_(sh);
  applyStatusConditionalFormatting_(sh);
  styleBlocks_(sh, display.length);
}

function pushManagerEditsToDB_(ss, managerName) {
  const layout = getLayout_();
  const db = getSheetOrThrow_(ss, CFG.DB);
  const sh = getSheetOrThrow_(ss, managerName);
  const lastCol = CFG.DB_HEADERS.length;

  const dbLastRow = db.getLastRow();
  if (dbLastRow < layout.startRow) return { updated: 0, skipped: 0 };

  const dbValues = db.getRange(layout.startRow, 1, dbLastRow - (layout.startRow - 1), lastCol).getValues();
  const iId = idx0_("ID");
  const iManager = idx0_("Менеджер");
  const iRating = idx0_("Оценка контрагента");

  const idToRow = new Map();
  for (let i = 0; i < dbValues.length; i++) {
    const id = String(dbValues[i][iId] || "").trim();
    if (id) idToRow.set(id, { sheetRow: i + layout.startRow, rowData: dbValues[i] });
  }

  const shLastRow = sh.getLastRow();
  if (shLastRow < layout.startRow) return { updated: 0, skipped: 0 };

  const rows = sh.getRange(layout.startRow, 1, shLastRow - layout.startRow + 1, lastCol).getValues();
  const keepFromDbIfBlank = ["Контрагент", "Флоу", "Оценка контрагента"];

  let updated = 0;
  let skipped = 0;
  const updates = [];

  for (const row of rows) {
    const id = String(row[iId] || "").trim();
    if (!id) { skipped++; continue; }

    const hit = idToRow.get(id);
    if (!hit) { skipped++; continue; }

    row[iManager] = managerName;

    // не затираем поля блока пустотой из UI
    keepFromDbIfBlank.forEach(colName => {
      const i = idx0_(colName);
      const v = String(row[i] || "").trim();
      if (!v) row[i] = hit.rowData[i];
    });

    const rating = String(row[iRating] || "").trim();
    if (rating && !CFG.RATINGS.includes(rating)) { skipped++; continue; }

    updates.push({ sheetRow: hit.sheetRow, rowValues: row });
  }

  updates.sort((a, b) => a.sheetRow - b.sheetRow);
  let i = 0;
  while (i < updates.length) {
    let j = i;
    const startRow = updates[i].sheetRow;
    const block = [updates[i].rowValues];
    while (j + 1 < updates.length && updates[j + 1].sheetRow === updates[j].sheetRow + 1) {
      j++;
      block.push(updates[j].rowValues);
    }
    db.getRange(startRow, 1, block.length, lastCol).setValues(block);
    updated += block.length;
    i = j + 1;
  }

  if (updated > 0) {
    const bodyRows = Math.max(1, dbLastRow - (layout.startRow - 1));
    db.getRange(layout.startRow, idx1_("Обновлено"), bodyRows, 1).setNumberFormat("dd.MM.yyyy HH:mm:ss");
  }

  return { updated, skipped };
}

function adminExportDBToAllManagers() {
  const ss = SpreadsheetApp.getActive();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return SpreadsheetApp.getUi().alert("⏳ Уже выполняется операция.");
  try {
    muteTimestampRepair_(CFG.TS_MUTE_SECONDS);
    CFG.MANAGER_SHEETS.forEach(name => withSpreadsheetRetry_(() => refreshManagerSheet_(ss, name, { includeHiddenStatuses: true }), 4));
    SpreadsheetApp.getUi().alert("Готово ✅ БД выгружена во все листы менеджеров (ВСЕ строки).\nДата баланса/Обновлено не меняются из-за выгрузки.");
  } finally {
    lock.releaseLock();
  }
}

function dvList_(list, strict) {
  return SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(!strict).build();
}
function applyManagerValidationsById_(sh, displayRowCount) {
  if (displayRowCount <= 0) return;
  const start = startRow_();
  sh.getRange(start, idx1_("Флоу"), displayRowCount, 1).setDataValidation(dvList_(CFG.FLOW_TYPES, true));
  sh.getRange(start, idx1_("Проект"), displayRowCount, 1).setDataValidation(dvList_(CFG.PROJECTS, false));
  sh.getRange(start, idx1_("Статус"), displayRowCount, 1).setDataValidation(dvList_(CFG.STATUSES, true));
  sh.getRange(start, idx1_("Оценка контрагента"), displayRowCount, 1).setDataValidation(dvList_(CFG.RATINGS, false));
  sh.getRange(start, idx1_("Статус движения средств"), displayRowCount, 1).setDataValidation(dvList_(CFG.MONEY_FLOW_STATUSES, true));
}

function clearValidationsForTableArea_(sh) {
  const start = startRow_();
  const maxRows = Math.max(1, sh.getMaxRows() - start + 1);
  sh.getRange(start, 1, maxRows, CFG.DB_HEADERS.length).clearDataValidations();
}
function setManagerSheetDisplaySafely_(sh, display, lastCol) {
  const start = startRow_();
  const hdr = headerRow_();
  muteTimestampRepair_(CFG.TS_MUTE_SECONDS);
  const maxClear = Math.max(display.length, sh.getLastRow() - (start - 1), 1);
  sh.getRange(start, 1, maxClear, lastCol).clearContent();
  applyTitleRow_(sh);
  sh.getRange(hdr, 1, 1, lastCol).setValues([uiHeaders_()]);
  if (display && display.length > 0) sh.getRange(start, 1, display.length, lastCol).setValues(display);
}

function styleBlocks_(sh, displayRowCount) {
  if (displayRowCount <= 0) return;
  const start = startRow_();
  const lastCol = CFG.DB_HEADERS.length;
  const colCp = idx1_("Контрагент");
  const colFlow = idx1_("Флоу");
  const colProject = idx1_("Проект");
  const colStatus = idx1_("Статус");

  const cps = sh.getRange(start, colCp, displayRowCount, 1).getValues();
  const flows = sh.getRange(start, colFlow, displayRowCount, 1).getValues();
  try { sh.getRange(start, 1, displayRowCount, lastCol).setBorder(false, false, false, false, false, false); } catch (e) {}

  for (let i = 0; i < displayRowCount; i++) {
    const row = start + i;
    const cp = String(cps[i][0] || "").trim();
    const isBlockHead = !!cp;

    if (isBlockHead) {
      if (i > 0) {
        try {
          sh.getRange(row, 1, 1, lastCol).setBorder(true, true, null, null, null, null, THEME.blockBorder, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
        } catch (e) {}
      }
      const flow = String(flows[i][0] || "").trim();
      const blockBg = flow === "Новый флоу" ? THEME.blockNewFlowBg : (flow === "Старый флоу" ? THEME.blockOldFlowBg : THEME.blockHeadBg);
      sh.getRange(row, 1, 1, lastCol).setBackground(blockBg);
      sh.getRange(row, colCp).setFontWeight("bold");
      sh.getRange(row, colFlow).setFontWeight("bold");
      sh.getRange(row, colProject).setFontWeight("bold");
      sh.getRange(row, colStatus).setFontWeight("bold");
      try { sh.setRowHeight(row, blockHeadRowHeight_()); } catch (e) {}
    } else {
      try { sh.setRowHeight(row, regularRowHeight_()); } catch (e) {}
    }
  }
}

function nextRowId_() {
  const props = PropertiesService.getDocumentProperties();
  const key = "NEXT_ROW_ID";
  const current = Number(props.getProperty(key) || "1");
  props.setProperty(key, String(current + 1));
  return "R" + String(current).padStart(6, "0");
}

function adminFillMissingIdsInDB() {
  const layout = getLayout_();
  const db = getSheetOrThrow_(SpreadsheetApp.getActive(), CFG.DB);
  const lastCol = CFG.DB_HEADERS.length;
  const lastRow = db.getLastRow();
  if (lastRow < layout.startRow) return SpreadsheetApp.getUi().alert("В БД нет данных (кроме шапки).");

  const values = db.getRange(layout.startRow, 1, lastRow - (layout.startRow - 1), lastCol).getValues();
  let maxNum = 0;
  values.forEach(r => {
    const m = /^R0*(\d+)$/.exec(String(r[idx0_("ID")] || "").trim());
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  });

  let next = maxNum + 1;
  let filled = 0;
  values.forEach(row => {
    const id = String(row[idx0_("ID")] || "").trim();
    if (id) return;
    const hasData = row.slice(1).some(v => String(v || "").trim() !== "");
    if (!hasData) return;
    row[idx0_("ID")] = "R" + String(next).padStart(6, "0");
    next++;
    filled++;
  });

  db.getRange(layout.startRow, 1, values.length, lastCol).setValues(values);
  PropertiesService.getDocumentProperties().setProperty("NEXT_ROW_ID", String(next));
  SpreadsheetApp.getUi().alert(`Готово ✅\nID проставлены: ${filled}\nСледующий ID: R${String(next).padStart(6, "0")}`);
}

function applyDBValidations_(sh) {
  const start = startRow_();
  const maxRows = Math.max(1, sh.getMaxRows() - (start - 1));
  sh.getRange(start, idx1_("Менеджер"), maxRows, 1).setDataValidation(dvList_(CFG.MANAGER_SHEETS, true));
  sh.getRange(start, idx1_("Флоу"), maxRows, 1).setDataValidation(dvList_(CFG.FLOW_TYPES, true));
  sh.getRange(start, idx1_("Проект"), maxRows, 1).setDataValidation(dvList_(CFG.PROJECTS, true));
  sh.getRange(start, idx1_("Статус"), maxRows, 1).setDataValidation(dvList_(CFG.STATUSES, true));
  sh.getRange(start, idx1_("Оценка контрагента"), maxRows, 1).setDataValidation(dvList_(CFG.RATINGS, false));
  sh.getRange(start, idx1_("Статус движения средств"), maxRows, 1).setDataValidation(dvList_(CFG.MONEY_FLOW_STATUSES, true));
}

function setDBPlainTextColumns_(db) {
  const start = startRow_();
  const maxRows = Math.max(1, db.getMaxRows() - (start - 1));
  db.getRange(start, idx1_("Контрагент"), maxRows, 1).setNumberFormat("@");
  db.getRange(start, idx1_("Флоу"), maxRows, 1).setNumberFormat("@");
  db.getRange(start, idx1_("Логин"), maxRows, 1).setNumberFormat("@");
  db.getRange(start, idx1_("Пароль"), maxRows, 1).setNumberFormat("@");
  db.getRange(start, idx1_("Ссылка"), maxRows, 1).setNumberFormat("@");
}

function beautifyDB_(db) {
  if (!db) return;
  const layout = getLayout_();
  const lastCol = CFG.DB_HEADERS.length;
  const maxRows = db.getMaxRows();
  const bodyStart = layout.startRow;
  const bodyRows = Math.max(1, maxRows - (bodyStart - 1));

  db.getBandings().forEach(b => b.remove());
  db.setHiddenGridlines(true);
  applyTitleRow_(db);

  db.getRange(layout.headerRow, 1, 1, lastCol)
    .setFontFamily("Inter").setFontSize(12).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground(THEME.headerBg).setFontColor(THEME.headerFg).setWrap(true);

  db.getRange(bodyStart, 1, bodyRows, lastCol)
    .setFontFamily("Inter").setFontSize(10).setVerticalAlignment("middle")
    .setFontColor("#111827").setBackground("#ffffff").setWrap(false)
    .setHorizontalAlignment("center");

  db.getRange(bodyStart, idx1_("Ссылка"), bodyRows, 1).setHorizontalAlignment("left").setFontColor("#2563eb").setFontLine("underline");
  db.getRange(bodyStart, idx1_("Заметка"), bodyRows, 1).setHorizontalAlignment("left").setWrap(false);
  db.getRange(bodyStart, idx1_("Логин"), bodyRows, 1).setHorizontalAlignment("left");
  db.getRange(bodyStart, idx1_("Пароль"), bodyRows, 1).setHorizontalAlignment("left");
  db.getRange(bodyStart, idx1_("Баланс"), bodyRows, 1).setHorizontalAlignment("right");
  db.getRange(bodyStart, idx1_("Отправлено на отыгрыш"), bodyRows, 1).setHorizontalAlignment("right");
  db.getRange(bodyStart, idx1_("Готово к выводу"), bodyRows, 1).setHorizontalAlignment("right");
  db.getRange(bodyStart, idx1_("Поставили на вывод"), bodyRows, 1).setHorizontalAlignment("right");
  db.getRange(bodyStart, idx1_("Статус"), bodyRows, 1).setFontWeight("bold");

  db.getRange(1, 1, maxRows, lastCol).setBorder(true, true, true, true, false, false, "#e5e7eb", SpreadsheetApp.BorderStyle.SOLID);
  db.getRange(layout.headerRow, 1, 1, lastCol).setBorder(null, null, true, null, null, null, "#334155", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  db.setRowHeight(layout.headerRow, 46);
  const limit = Math.min(maxRows, CFG.PRETTY_ROWS_LIMIT);
  for (let r = bodyStart; r <= limit; r++) db.setRowHeight(r, regularRowHeight_());

  applyDBConditionalFormatting_(db);
}

function applyDBConditionalFormatting_(db) {
  const layout = getLayout_();
  const startRow = layout.startRow;
  const numRows = Math.max(1, db.getMaxRows() - (startRow - 1));
  const lastCol = CFG.DB_HEADERS.length;
  const idxStatus = idx1_("Статус");
  const idxBalDate = idx1_("Дата баланса");
  const colLetter = columnToLetter_(idxStatus);
  const balDateLetter = columnToLetter_(idxBalDate);

  const fullRange = db.getRange(startRow, 1, numRows, lastCol);
  const statusRange = db.getRange(startRow, idxStatus, numRows, 1);
  const r0 = startRow;
  const rules = [];

  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",ISEVEN(ROW()))`).setBackground(THEME.zebraBg).setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${balDateLetter}${r0}<>"",TODAY()-INT($${balDateLetter}${r0})>3)`).setBackground("#fff7ed").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="⛔ Заблокировано")`).setBackground("#fef2f2").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="⚠ Проблема")`).setBackground("#fff7ed").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="◐ Пауза")`).setBackground("#f5f3ff").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="○ Закрыто")`).setBackground("#f3f4f6").setRanges([fullRange]).build());

  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("● Активно").setBackground("#f0fdf4").setFontColor("#166534").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("◐ Пауза").setBackground("#f5f3ff").setFontColor("#5b21b6").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("⛔ Заблокировано").setBackground("#fef2f2").setFontColor("#b91c1c").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("⚠ Проблема").setBackground("#fffbeb").setFontColor("#b45309").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("○ Закрыто").setBackground("#f9fafb").setFontColor("#4b5563").setRanges([statusRange]).build());

  db.setConditionalFormatRules(rules);
}

function applyManagerSheetFormatting_(sh) {
  const layout = getLayout_();
  const lastCol = CFG.DB_HEADERS.length;
  const lastRow = Math.max(sh.getLastRow(), layout.startRow);

  sh.setHiddenGridlines(true);
  sh.getBandings().forEach(b => b.remove());
  applyTitleRow_(sh);

  sh.getRange(layout.headerRow, 1, 1, lastCol)
    .setFontFamily("Inter").setFontSize(12).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground(THEME.headerBg).setFontColor(THEME.headerFg).setWrap(true);

  if (lastRow >= layout.startRow) {
    const bodyRows = lastRow - layout.startRow + 1;
    sh.getRange(layout.startRow, 1, bodyRows, lastCol)
      .setFontFamily("Inter").setFontSize(10).setVerticalAlignment("middle")
      .setFontColor("#111827").setBackground("#ffffff").setWrap(false)
      .setHorizontalAlignment("center");

    sh.getRange(layout.startRow, idx1_("Логин"), bodyRows, 1).setHorizontalAlignment("left");
    sh.getRange(layout.startRow, idx1_("Пароль"), bodyRows, 1).setHorizontalAlignment("left");
    sh.getRange(layout.startRow, idx1_("Ссылка"), bodyRows, 1).setHorizontalAlignment("left").setFontColor("#2563eb").setFontLine("underline");
    sh.getRange(layout.startRow, idx1_("Заметка"), bodyRows, 1).setHorizontalAlignment("left").setWrap(false);
    sh.getRange(layout.startRow, idx1_("Оценка контрагента"), bodyRows, 1).setFontSize(12);
    sh.getRange(layout.startRow, idx1_("Баланс"), bodyRows, 1).setHorizontalAlignment("right");
  }

  sh.getRange(1, 1, lastRow, lastCol).setBorder(true, true, true, true, false, false, "#e5e7eb", SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(layout.headerRow, 1, 1, lastCol).setBorder(null, null, true, null, null, null, "#334155", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.setRowHeight(layout.headerRow, 44);

  const limit = Math.min(Math.max(lastRow, layout.startRow), CFG.PRETTY_ROWS_LIMIT);
  for (let r = layout.startRow; r <= limit; r++) sh.setRowHeight(r, regularRowHeight_());
}

function applyStatusConditionalFormatting_(sh) {
  const layout = getLayout_();
  const startRow = layout.startRow;
  const endRow = Math.max(sh.getLastRow(), startRow);
  const numRows = endRow - startRow + 1;
  if (numRows <= 0) return;

  const idxStatus = idx1_("Статус");
  const idxBalDate = idx1_("Дата баланса");
  const fullRange = sh.getRange(startRow, 1, numRows, CFG.DB_HEADERS.length);
  const statusRange = sh.getRange(startRow, idxStatus, numRows, 1);
  const colLetter = columnToLetter_(idxStatus);
  const balDateLetter = columnToLetter_(idxBalDate);
  const r0 = startRow;

  const rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",ISEVEN(ROW()))`).setBackground(THEME.zebraBg).setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${balDateLetter}${r0}<>"",TODAY()-INT($${balDateLetter}${r0})>3)`).setBackground("#fff7ed").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="⛔ Заблокировано")`).setBackground("#fef2f2").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="⚠ Проблема")`).setBackground("#fff7ed").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="◐ Пауза")`).setBackground("#f5f3ff").setRanges([fullRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${r0}<>"",$${colLetter}${r0}="○ Закрыто")`).setBackground("#f3f4f6").setRanges([fullRange]).build());

  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("● Активно").setBackground("#f0fdf4").setFontColor("#166534").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("◐ Пауза").setBackground("#f5f3ff").setFontColor("#5b21b6").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("⛔ Заблокировано").setBackground("#fef2f2").setFontColor("#b91c1c").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("⚠ Проблема").setBackground("#fffbeb").setFontColor("#b45309").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("○ Закрыто").setBackground("#f9fafb").setFontColor("#4b5563").setRanges([statusRange]).build());

  sh.setConditionalFormatRules(rules);
}

function adminRestoreFormatActiveSheet() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();
  const name = sh.getName();
  const layout = getLayout_();

  if (name === CFG.DB) {
    applyTitleRow_(sh);
    applyColumnWidths_(sh);
    try { sh.setFrozenRows(layout.freezeRows); } catch (e) {}
    try { sh.setFrozenColumns(layout.freezeCols); } catch (e) {}
    applyStandardFormats_(sh, layout.startRow, Math.max(1, sh.getMaxRows() - (layout.startRow - 1)));
    setDBPlainTextColumns_(sh);
    applyDBValidations_(sh);
    beautifyDB_(sh);
    return SpreadsheetApp.getUi().alert("Готово ✅ Формат БД восстановлен.");
  }

  if (CFG.MANAGER_SHEETS.includes(name)) {
    applyTitleRow_(sh);
    applyColumnWidths_(sh);
    try { sh.setFrozenRows(layout.freezeRows); } catch (e) {}
    try { sh.setFrozenColumns(layout.freezeCols); } catch (e) {}
    try { sh.hideColumn(sh.getRange(1, 1)); } catch (e) {}
    try { sh.hideColumn(sh.getRange(1, 2)); } catch (e) {}
    applyManagerSheetFormatting_(sh);
    applyStatusConditionalFormatting_(sh);

    const displayCount = Math.max(0, sh.getLastRow() - layout.startRow + 1);
    if (displayCount > 0) {
      applyStandardFormats_(sh, layout.startRow, displayCount);
      applyManagerValidationsById_(sh, displayCount);
      styleBlocks_(sh, displayCount);
    }
    return SpreadsheetApp.getUi().alert("Готово ✅ Формат листа менеджера восстановлен.");
  }

  SpreadsheetApp.getUi().alert("Открой лист БД или лист менеджера и запусти ещё раз.");
}

function protectIdColumns_() {
  const ss = SpreadsheetApp.getActive();
  const layout = getLayout_();
  const me = Session.getEffectiveUser().getEmail();
  const lastCol = CFG.DB_HEADERS.length;

  [CFG.DB].concat(CFG.MANAGER_SHEETS).forEach(sheetName => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;

    const headers = sh.getRange(layout.headerRow, 1, 1, lastCol).getValues()[0].map(logicalHeader_);
    const idCol0 = headers.indexOf("ID");
    if (idCol0 === -1) return;
    const col = idCol0 + 1;

    sh.getProtections(SpreadsheetApp.ProtectionType.RANGE)
      .filter(p => {
        const r = p.getRange();
        return r.getColumn() === col && r.getNumColumns() === 1;
      })
      .forEach(p => p.remove());

    const start = layout.startRow;
    const range = sh.getRange(start, col, Math.max(1, sh.getMaxRows() - start + 1), 1);
    const protection = range.protect().setDescription("AUTO: ID LOCK (NO MANUAL EDIT)");
    protection.removeEditors(protection.getEditors());
    protection.addEditor(me);
    protection.setWarningOnly(false);
    try { if (protection.canDomainEdit()) protection.setDomainEdit(false); } catch (e) {}
  });

  SpreadsheetApp.getUi().alert("Готово ✅ Колонка ID защищена (только тело таблицы).");
}


function onSelectionChange(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (!CFG.MANAGER_SHEETS.includes(sh.getName())) return;
  const row = e.range.getRow();
  if (row < startRow_()) return;

  const cpCol = idx1_("Контрагент");
  const lastRow = sh.getLastRow();
  if (lastRow < startRow_()) return;

  let head = row;
  while (head >= startRow_()) {
    const cp = String(sh.getRange(head, cpCol).getValue() || "").trim();
    if (cp) break;
    head--;
  }
  if (head < startRow_()) return;

  let tail = head;
  for (let r = head + 1; r <= lastRow; r++) {
    const cp = String(sh.getRange(r, cpCol).getValue() || "").trim();
    if (cp) break;
    tail = r;
  }

  try {
    sh.getRange(head, 1, tail - head + 1, CFG.DB_HEADERS.length).setBorder(null, null, null, true, null, null, "#60a5fa", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  } catch (err) {}
}

function onEdit(e) {
  if (!e || !e.range) return;
  const layout = getLayout_();
  const sh = e.range.getSheet();
  if (!CFG.MANAGER_SHEETS.includes(sh.getName())) return;

  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();
  if (numRows > 20) return;

  const endRow = startRow + numRows - 1;
  if (endRow < layout.startRow) return;

  const startCol = e.range.getColumn();
  const endCol = startCol + e.range.getNumColumns() - 1;

  const colId = idx1_("ID");
  const colBalance = idx1_("Баланс");
  const colBalanceDate = idx1_("Дата баланса");
  const colW1 = idx1_("Отправлено на отыгрыш");
  const colW2 = idx1_("Готово к выводу");
  const colW3 = idx1_("Поставили на вывод");
  const colMoney = idx1_("Статус движения средств");
  const colUpdated = idx1_("Обновлено");

  const balanceEdited = colBalance >= startCol && colBalance <= endCol;
  const moneyEdited = (colW1 >= startCol && colW1 <= endCol) || (colW2 >= startCol && colW2 <= endCol) || (colW3 >= startCol && colW3 <= endCol) || (colMoney >= startCol && colMoney <= endCol);
  if (!balanceEdited && !moneyEdited) return;

  const now = new Date();
  const idVals = sh.getRange(startRow, colId, numRows, 1).getValues();
  if (balanceEdited) sh.getRange(startRow, colBalanceDate, numRows, 1).setValues(idVals.map(([id]) => [String(id || "").trim() ? now : ""]));
  if (moneyEdited) sh.getRange(startRow, colUpdated, numRows, 1).setValues(idVals.map(([id]) => [String(id || "").trim() ? now : ""]));
}

const SNAPSHOT_SHEET = "_SNAPSHOT";
function ensureSnapshotSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SNAPSHOT_SHEET);
  if (!sh) sh = ss.insertSheet(SNAPSHOT_SHEET);
  sh.getRange(1, 1, 1, 8).setValues([["sheet", "id", "balance", "w1", "w2", "w3", "moneyStatus", "lastSeenTs"]]);
  try { sh.hideSheet(); } catch (e) {}
  return sh;
}
function snapshotKey_(sheetName, id) { return `${sheetName}||${id}`; }
function normalizeNumber_(v) {
  if (v === "" || v === null || typeof v === "undefined") return "";
  if (typeof v === "number") return Number.isFinite(v) ? v : "";
  const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
  if (!s) return "";
  const x = Number(s);
  return Number.isFinite(x) ? x : s;
}
function normalizeText_(v) { return String(v === null || typeof v === "undefined" ? "" : v).trim(); }

function repairTimestampsBySnapshot_() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return; }
  try {
    const layout = getLayout_();
    const muted = isTimestampRepairMuted_();
    const ss = SpreadsheetApp.getActive();
    const snapSh = ensureSnapshotSheet_();

    const colId = idx1_("ID");
    const colBalance = idx1_("Баланс");
    const colBalanceDate = idx1_("Дата баланса");
    const colW1 = idx1_("Отправлено на отыгрыш");
    const colW2 = idx1_("Готово к выводу");
    const colW3 = idx1_("Поставили на вывод");
    const colMoney = idx1_("Статус движения средств");
    const colUpdated = idx1_("Обновлено");

    const snapLastRow = snapSh.getLastRow();
    const snapMap = new Map();
    if (snapLastRow >= 2) {
      snapSh.getRange(2, 1, snapLastRow - 1, 8).getValues().forEach(r => {
        const sheetName = normalizeText_(r[0]);
        const id = normalizeText_(r[1]);
        if (!sheetName || !id) return;
        snapMap.set(snapshotKey_(sheetName, id), { balance: r[2], w1: r[3], w2: r[4], w3: r[5], moneyStatus: r[6] });
      });
    }

    const now = new Date();
    const newSnapRows = [];

    CFG.MANAGER_SHEETS.forEach(sheetName => {
      const sh = ss.getSheetByName(sheetName);
      if (!sh) return;
      const lastRow = sh.getLastRow();
      if (lastRow < layout.startRow) return;

      const n = lastRow - layout.startRow + 1;
      const ids = sh.getRange(layout.startRow, colId, n, 1).getValues();
      const balances = sh.getRange(layout.startRow, colBalance, n, 1).getValues();
      const balDates = muted ? null : sh.getRange(layout.startRow, colBalanceDate, n, 1).getValues();
      const w1 = sh.getRange(layout.startRow, colW1, n, 1).getValues();
      const w2 = sh.getRange(layout.startRow, colW2, n, 1).getValues();
      const w3 = sh.getRange(layout.startRow, colW3, n, 1).getValues();
      const money = sh.getRange(layout.startRow, colMoney, n, 1).getValues();
      const updated = muted ? null : sh.getRange(layout.startRow, colUpdated, n, 1).getValues();

      let balDatesChanged = false;
      let updatedChanged = false;

      for (let i = 0; i < n; i++) {
        const id = normalizeText_(ids[i][0]);
        if (!id) continue;

        const key = snapshotKey_(sheetName, id);
        const curBalance = normalizeNumber_(balances[i][0]);
        const curW1 = normalizeNumber_(w1[i][0]);
        const curW2 = normalizeNumber_(w2[i][0]);
        const curW3 = normalizeNumber_(w3[i][0]);
        const curMoney = normalizeText_(money[i][0]);
        const prev = snapMap.get(key) || { balance: "", w1: "", w2: "", w3: "", moneyStatus: "" };

        if (!muted) {
          if (String(prev.balance) !== String(curBalance)) {
            balDates[i][0] = now;
            balDatesChanged = true;
          }
          if (String(prev.w1) !== String(curW1) || String(prev.w2) !== String(curW2) || String(prev.w3) !== String(curW3) || String(prev.moneyStatus) !== String(curMoney)) {
            updated[i][0] = now;
            updatedChanged = true;
          }
        }

        newSnapRows.push([sheetName, id, curBalance, curW1, curW2, curW3, curMoney, now]);
      }

      if (!muted && balDatesChanged) sh.getRange(layout.startRow, colBalanceDate, n, 1).setValues(balDates);
      if (!muted && updatedChanged) sh.getRange(layout.startRow, colUpdated, n, 1).setValues(updated);
    });

    const clearTo = Math.max(snapLastRow, newSnapRows.length + 1, 2);
    snapSh.getRange(2, 1, clearTo - 1, 8).clearContent();
    if (newSnapRows.length > 0) snapSh.getRange(2, 1, newSnapRows.length, 8).setValues(newSnapRows);

  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function setupSnapshotRepairTrigger() { return setupSnapshotRepairTrigger_(); }
function repairTimestampsBySnapshot() { return repairTimestampsBySnapshot_(); }
function setupSnapshotRepairTrigger_() {
  ensureSnapshotSheet_();
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === "repairTimestampsBySnapshot_") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("repairTimestampsBySnapshot_").timeBased().everyMinutes(1).create();
  SpreadsheetApp.getUi().alert("Готово ✅ Ремонтёр по snapshot включен (раз в минуту).\nОн не меняет даты после скриптовых перерисовок.");
}
