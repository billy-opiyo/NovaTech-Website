import sharp from "sharp"
import { IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES } from "./file-validation"

const dimensions = [2000, 1600, 1280, 1024, 800]
const qualities = [82, 76, 70, 64, 58, 52]

export class ImageOptimizationTooLargeError extends Error {
	code = "IMAGE_OPTIMIZATION_TOO_LARGE"

	constructor() {
		super(IMAGE_TOO_LARGE_MESSAGE)
	}
}

/** Normalize merchant product images into a responsive-friendly WebP asset. */
export async function optimizeProductImage(input: Buffer): Promise<Buffer> {
	const source = sharp(input, { failOn: "error" })
	const metadata = await source.metadata()
	if (!metadata.width || !metadata.height) throw new Error("The uploaded image dimensions are invalid.")

	for (const dimension of dimensions) {
		for (const quality of qualities) {
			const output = await sharp(input, { failOn: "error" })
				.rotate()
				.resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
				.webp({ quality, effort: 4 })
				.toBuffer()
			if (output.length <= MAX_IMAGE_UPLOAD_BYTES) return output
		}
	}

	throw new ImageOptimizationTooLargeError()
}
