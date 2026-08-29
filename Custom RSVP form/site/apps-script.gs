// Google Apps Script bound to the RSVP responses spreadsheet.
// Deploy: Deploy > Manage deployments > New version. Execute as: Me. Access: Anyone.
// Sheet 1 = responses (col K holds the raw UTC timestamp, used for verification).
// Sheet 2 = guest list: col A name/family, col B number of people.

const CACHE = CacheService.getScriptCache();
const SHEET = () => SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
const TZ = "America/Toronto";

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z]/g, "");
}

// ---- reads -----------------------------------------------------------------

function responses() {
  const sh = SHEET();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 11).getValues();
}

function nameExists(first, last) {
  const key = norm(first) + "|" + norm(last);
  return responses().some(r => norm(r[1]) + "|" + norm(r[2]) === key);
}

function usage() {
  return responses()
    .filter(r => String(r[8] || "").trim() && parseInt(r[4], 10))
    .map(r => [String(r[8]).trim(), parseInt(r[4], 10), String(r[1] || ""), String(r[2] || "")]);
}

function guestList() {
  const hit = CACHE.get("guests");
  if (hit) return JSON.parse(hit);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1];
  const vals = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const name = String(vals[i][0] || "").trim();
    const cap = parseInt(vals[i][1], 10);
    if (!name || !cap || /^(name|family|guest)/i.test(name)) continue;
    out.push([name, cap]);
  }
  CACHE.put("guests", JSON.stringify(out), 300);
  return out;
}

// ---- writes ----------------------------------------------------------------

function deleteRows(first, last) {
  const sh = SHEET();
  const rows = sh.getDataRange().getValues();
  const key = norm(first) + "|" + norm(last);
  for (let i = rows.length - 1; i >= 1; i--) {
    if (norm(rows[i][1]) + "|" + norm(rows[i][2]) === key) sh.deleteRow(i + 1);
  }
}

function saveRsvp(p, overwrite) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (overwrite) {
      deleteRows(p.firstName, p.lastName);
    } else if (nameExists(p.firstName, p.lastName)) {
      return { status: "duplicate" };
    }
    const stamp = Utilities.formatDate(new Date(p.submittedAt), TZ, "yyyy-MM-dd h:mm a");
    SHEET().appendRow([
      stamp, p.firstName, p.lastName, p.attending, p.guestCount,
      p.partyNames, p.dietary, p.notes, p.matchedFamily, p.allowance,
      p.submittedAt
    ]);
    return { status: "ok" };
  } finally {
    lock.releaseLock();
  }
}

// ---- entry points ----------------------------------------------------------

function doGet(e) {
  const p = e.parameter;
  const payload = p.save   ? saveRsvp(p, p.overwrite === "1")
                : p.verify ? { seen: responses().some(r =>
                                norm(r[1]) + "|" + norm(r[2]) === norm(p.first) + "|" + norm(p.last) &&
                                String(r[10]) === p.submittedAt) }
                : p.list   ? { guests: guestList(), usage: usage(),
                               names: responses().map(r => [r[1], r[2]]) }
                           : { exists: nameExists(p.first, p.last) };
  const out = JSON.stringify(payload);
  return ContentService
    .createTextOutput(p.callback ? p.callback + "(" + out + ")" : out)
    .setMimeType(p.callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function doPost(e) {
  const out = saveRsvp(e.parameter, e.parameter.overwrite === "1");
  return ContentService.createTextOutput(out.status);
}
