export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      current.push(cell.trim());
      cell = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i += 1;
      current.push(cell.trim());
      cell = "";
      if (current.some((x) => x.length > 0)) {
        rows.push(current);
      }
      current = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || current.length > 0) {
    current.push(cell.trim());
    if (current.some((x) => x.length > 0)) {
      rows.push(current);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((line) => {
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      const key = headers[i];
      if (!key) continue;
      record[key] = (line[i] ?? "").trim();
    }
    return record;
  });
}

export function splitMulti(value: string): string[] {
  return value
    .split(/[|;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
}
