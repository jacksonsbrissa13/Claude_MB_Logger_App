const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwg7h1kCcBs9xt1NV5GuoLOvZygDLeSB9EbWfmJXum29FL2W65r8wBdAmGmwxhV4BNX/exec'

/**
 * Fetch the bookie list from column D of the "list/help" sheet tab.
 * Returns an array of strings, or an empty array on failure.
 *
 * Requires the Apps Script to have a doGet handler:
 *
 *   function doGet(e) {
 *     if (e.parameter.action === 'getBookies') {
 *       const ss = SpreadsheetApp.openById(SHEET_ID);
 *       const sheet = ss.getSheetByName('list/help');
 *       const vals = sheet.getRange('D:D').getValues().flat().filter(Boolean);
 *       return ContentService.createTextOutput(JSON.stringify(vals))
 *         .setMimeType(ContentService.MimeType.JSON);
 *     }
 *   }
 */
export async function fetchBookies() {
  try {
    const res = await fetch(`${GAS_URL}?action=getBookies`)
    if (!res.ok) return []
    const data = await res.json()
    if (Array.isArray(data)) return data.filter(Boolean)
    return []
  } catch {
    return []
  }
}
