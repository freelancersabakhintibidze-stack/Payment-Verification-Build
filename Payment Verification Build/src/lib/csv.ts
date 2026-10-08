/** RFC 4180 compliant CSV serialization with CRLF row endings. */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(input: string | number | null | undefined): string {
  const s =
    input === null || input === undefined
      ? ""
      : typeof input === "number"
        ? String(input)
        : input;
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(","),
  );
  return [headerLine, ...lines].join("\r\n") + "\r\n";
}
