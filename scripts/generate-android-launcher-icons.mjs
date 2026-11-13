import { mkdirSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(projectRoot, "frontend", "public", "images", "nuravahubsoreslogo.png")
const resourceRoot = path.join(projectRoot, "android", "app", "src", "main", "res")

const densities = [
	{ name: "mdpi", scale: 1, legacy: 48 },
	{ name: "hdpi", scale: 1.5, legacy: 72 },
	{ name: "xhdpi", scale: 2, legacy: 96 },
	{ name: "xxhdpi", scale: 3, legacy: 144 },
	{ name: "xxxhdpi", scale: 4, legacy: 192 },
]

function circleMask(size) {
	return Buffer.from(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`)
}

async function getArtworkBounds(sourcePath) {
	const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
	let left = info.width
	let top = info.height
	let right = -1
	let bottom = -1
	for (let y = 0; y < info.height; y += 1) {
		for (let x = 0; x < info.width; x += 1) {
			if (data[(y * info.width + x) * info.channels + 3] > 8) {
				left = Math.min(left, x)
				top = Math.min(top, y)
				right = Math.max(right, x)
				bottom = Math.max(bottom, y)
			}
		}
	}
	if (right < left || bottom < top) throw new Error("Launcher logo source contains no visible artwork.")
	return { left, top, right: right + 1, bottom: bottom + 1, width: right - left + 1, height: bottom - top + 1 }
}

function centeredFitScale(bounds, safeSize, padding) {
	// Fit visible pixels, not the uneven transparent source canvas, to Android's
	// mask-safe area. The whole source bitmap is still retained in the output layer.
	return (safeSize - padding * 2) / Math.max(bounds.width, bounds.height)
}

async function makeCenteredLayer(sourcePath, metadata, bounds, canvasSize, safeSize, padding) {
	const scale = centeredFitScale(bounds, safeSize, padding)
	const width = Math.round(metadata.width * scale)
	const height = Math.round(metadata.height * scale)
	const artworkCenterX = ((bounds.left + bounds.right) / 2) * scale
	const artworkCenterY = ((bounds.top + bounds.bottom) / 2) * scale
	const left = Math.round(canvasSize / 2 - artworkCenterX)
	const top = Math.round(canvasSize / 2 - artworkCenterY)
	if (left < 0 || top < 0 || left + width > canvasSize || top + height > canvasSize) {
		throw new Error("The complete launcher logo source does not fit on the output canvas.")
	}
	const image = await sharp(sourcePath).resize(width, height, { fit: "fill", kernel: "lanczos3" }).png().toBuffer()
	const output = await sharp({ create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.composite([{ input: image, left, top }])
		.png()
		.toBuffer()
	return { output, left, top, width, height, scale }
}

async function main() {
	const metadata = await sharp(sourcePath).metadata()
	if (!metadata.width || !metadata.height) throw new Error("Launcher logo source has no image dimensions.")
	const bounds = await getArtworkBounds(sourcePath)
	console.log(`Source ${metadata.width}x${metadata.height}; visible artwork ${bounds.width}x${bounds.height} at ${bounds.left},${bounds.top}. No source crop or trim is applied.`)

	for (const density of densities) {
		const directory = path.join(resourceRoot, `mipmap-${density.name}`)
		mkdirSync(directory, { recursive: true })

		const legacySize = density.legacy
		const legacy = await makeCenteredLayer(sourcePath, metadata, bounds, legacySize, Math.round(legacySize * 0.7), Math.max(1, Math.round(legacySize * 0.025)))
		await sharp(legacy.output).png().toFile(path.join(directory, "ic_launcher.png"))
		await sharp(legacy.output).composite([{ input: circleMask(legacySize), blend: "dest-in" }]).png().toFile(path.join(directory, "ic_launcher_round.png"))

		const adaptiveSize = 108 * density.scale
		const safeSize = Math.round(66 * density.scale)
		const adaptive = await makeCenteredLayer(sourcePath, metadata, bounds, adaptiveSize, safeSize, Math.max(1, Math.round(2 * density.scale)))
		await sharp(adaptive.output).png().toFile(path.join(directory, "ic_launcher_foreground.png"))
		console.log(`${density.name}: legacy artwork ${Math.round(legacy.width * bounds.width / metadata.width)}x${Math.round(legacy.height * bounds.height / metadata.height)}px centered; adaptive ${adaptiveSize}px layer, ${safeSize}px safe area, centered full artwork.`)
	}

	const nativeLaunchSize = 512
	const nativeLaunch = await makeCenteredLayer(sourcePath, metadata, bounds, nativeLaunchSize, Math.round(nativeLaunchSize * 0.7), Math.round(nativeLaunchSize * 0.025))
	await sharp(nativeLaunch.output).png().toFile(path.join(resourceRoot, "drawable-nodpi", "launch_icon.png"))
	console.log(`Native Android splash/launch artwork: ${nativeLaunchSize}px transparent canvas, centered visible bounds, no clipping.`)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : "Launcher icon generation failed.")
	process.exitCode = 1
})
