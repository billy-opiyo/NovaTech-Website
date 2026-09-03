export type ValidatedFileKind = "PDF" | "JPEG" | "PNG" | "WEBP" | "GIF"

export const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024
export const IMAGE_TOO_LARGE_MESSAGE = "The uploaded image is more that 1MB please compress it or upload an image that is less than 1MB"

const signatures: Record<ValidatedFileKind, (bytes: Uint8Array) => boolean> = {
	PDF: (bytes) => String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-",
	JPEG: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
	PNG: (bytes) => bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10",
	WEBP: (bytes) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
	GIF: (bytes) => ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6))),
}

export function hasAllowedFileSignature(buffer: Buffer, allowed: readonly ValidatedFileKind[]) {
	const bytes = new Uint8Array(buffer.subarray(0, 16))
	return allowed.some((kind) => signatures[kind](bytes))
}
