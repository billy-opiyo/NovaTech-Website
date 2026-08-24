export type CatalogCsvRow = Record<string, string>

export function parseCsv(input: string): CatalogCsvRow[] {
	const rows: string[][] = []
	let row: string[] = []
	let cell = ""
	let quoted = false
	for (let index = 0; index < input.length; index += 1) {
		const character = input[index]
		if (quoted) {
			if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1 }
			else if (character === '"') quoted = false
			else cell += character
		} else if (character === '"' && cell.length === 0) quoted = true
		else if (character === ",") { row.push(cell.trim()); cell = "" }
		else if (character === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = "" }
		else if (character !== "\r") cell += character
	}
	if (cell.length || row.length) { row.push(cell.trim()); rows.push(row) }
	const headers = (rows.shift() || []).map((header) => header.trim().toLowerCase())
	return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])))
}

export function csvCell(value: unknown) {
	const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value)
	return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
