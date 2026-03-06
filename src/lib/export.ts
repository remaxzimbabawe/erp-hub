/**
 * Reusable CSV & PDF export utilities
 */

export interface ExportColumn {
  header: string;
  accessor: (item: any) => string;
}

// ── CSV ──────────────────────────────────────────────
function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv<T>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  const header = columns.map((c) => escapeCsv(c.header)).join(",");
  const rows = data.map((item) =>
    columns.map((c) => escapeCsv(c.accessor(item))).join(",")
  );
  const csv = [header, ...rows].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

// ── PDF (simple HTML-to-print approach, no deps) ─────
export function exportToPdf<T>(
  data: T[],
  columns: ExportColumn[],
  title: string,
  filename: string
) {
  const headerRow = columns
    .map(
      (c) =>
        `<th style="border:1px solid #ccc;padding:6px 10px;background:#264653;color:#fff;font-size:11px;text-align:left">${c.header}</th>`
    )
    .join("");

  const bodyRows = data
    .map(
      (item) =>
        `<tr>${columns
          .map(
            (c) =>
              `<td style="border:1px solid #eee;padding:5px 10px;font-size:11px">${c.accessor(item)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 24px; color: #264653; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 12px; color: #888; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; }
        tr:nth-child(even) { background: #f9fafb; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Exported on ${new Date().toLocaleString()} · ${data.length} records</p>
      <table>${headerRow}${bodyRows}</table>
      <script>window.onload=()=>{window.print();}</script>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ── Helpers ──────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
