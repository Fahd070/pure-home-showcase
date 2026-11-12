/** RFC 4180 CSV with a UTF-8 BOM so Arabic text opens correctly in spreadsheet apps. */
export function toCSV(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let s = String(v);
    // Neutralise spreadsheet formula injection for text cells.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
