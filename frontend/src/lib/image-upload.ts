import { IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES } from "./upload-limits"

const maximumDimension = 2000
const dimensions = [2000, 1600, 1280, 1024, 800]
const qualities = [0.84, 0.76, 0.7, 0.64, 0.58, 0.52]

type DecodedImage = {
	width: number
	height: number
	draw: (context: CanvasRenderingContext2D, width: number, height: number) => void
	close: () => void
}

async function decodeImage(file: File): Promise<DecodedImage> {
	if (typeof createImageBitmap === "function") {
		const bitmap = await createImageBitmap(file)
		return {
			width: bitmap.width,
			height: bitmap.height,
			draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
			close: () => bitmap.close(),
		}
	}

	const objectUrl = URL.createObjectURL(file)
	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const element = new Image()
			element.onload = () => resolve(element)
			element.onerror = () => reject(new Error("Unable to read the uploaded image."))
			element.src = objectUrl
		})
		return {
			width: image.naturalWidth,
			height: image.naturalHeight,
			draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
			close: () => URL.revokeObjectURL(objectUrl),
		}
	} catch (error) {
		URL.revokeObjectURL(objectUrl)
		throw error
	}
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob)
			else reject(new Error("Unable to compress the uploaded image."))
		}, "image/webp", quality)
	})
}

function optimizedName(name: string) {
	const stem = name.replace(/\.[^/.]+$/, "") || "product-image"
	return `${stem}.webp`
}

/** Compress a merchant image before the request so larger source files can still meet the 1 MB limit. */
export async function optimizeImageForUpload(file: File): Promise<File> {
	if (!file.type.startsWith("image/")) return file

	let decoded: DecodedImage | null = null
	try {
		decoded = await decodeImage(file)
		if (file.type === "image/webp" && file.size <= MAX_IMAGE_UPLOAD_BYTES && decoded.width <= maximumDimension && decoded.height <= maximumDimension) return file

		for (const dimension of dimensions) {
			const scale = Math.min(1, dimension / decoded.width, dimension / decoded.height)
			const width = Math.max(1, Math.round(decoded.width * scale))
			const height = Math.max(1, Math.round(decoded.height * scale))
			const canvas = document.createElement("canvas")
			canvas.width = width
			canvas.height = height
			const context = canvas.getContext("2d")
			if (!context) throw new Error("Unable to prepare the uploaded image.")
			context.imageSmoothingEnabled = true
			context.imageSmoothingQuality = "high"
			decoded.draw(context, width, height)

			for (const quality of qualities) {
				const blob = await canvasBlob(canvas, quality)
				if (blob.size <= MAX_IMAGE_UPLOAD_BYTES) return new File([blob], optimizedName(file.name), { type: "image/webp", lastModified: Date.now() })
			}
		}
	} catch (error) {
		if (error instanceof Error && error.message === IMAGE_TOO_LARGE_MESSAGE) throw error
		if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error(IMAGE_TOO_LARGE_MESSAGE)
		return file
	} finally {
		decoded?.close()
	}

	throw new Error(IMAGE_TOO_LARGE_MESSAGE)
}
