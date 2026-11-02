import { mkdirSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(projectRoot, "frontend", "public", "images", "Nurava_HubStores_app_icon_logo.png")
const resourceRoot = path.join(projectRoot, "android", "app", "src", "main", "res")

// Android adaptive icons use a 108 dp layer with a centered 66 dp safe zone.
// Cropping the source canvas to a square removes only its excess side background;
// it keeps the original logo pixels and avoids shrinking the artwork to letterbox it.
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

async function main() {
	const metadata = await sharp(sourcePath).metadata()
	if (!metadata.width || !metadata.height) throw new Error("Launcher logo source has no image dimensions.")
	const squareSize = Math.min(metadata.width, metadata.height)
	const crop = {
		left: Math.floor((metadata.width - squareSize) / 2),
		top: Math.floor((metadata.height - squareSize) / 2),
		width: squareSize,
		height: squareSize,
	}
	const source = await sharp(sourcePath).extract(crop).png().toBuffer()
	console.log(`Source ${metadata.width}x${metadata.height}; centered square crop ${squareSize}x${squareSize} at ${crop.left},${crop.top}.`)

	for (const density of densities) {
		const directory = path.join(resourceRoot, `mipmap-${density.name}`)
		mkdirSync(directory, { recursive: true })

		const legacySize = density.legacy
		const legacyIcon = await sharp(source).resize(legacySize, legacySize, { fit: "fill", kernel: "lanczos3" }).png().toBuffer()
		await sharp(legacyIcon).png().toFile(path.join(directory, "ic_launcher.png"))
		await sharp(legacyIcon).composite([{ input: circleMask(legacySize), blend: "dest-in" }]).png().toFile(path.join(directory, "ic_launcher_round.png"))

		const adaptiveSize = 108 * density.scale
		const safeSize = Math.round(66 * density.scale)
		const inset = Math.round((adaptiveSize - safeSize) / 2)
		const adaptiveArtwork = await sharp(source).resize(safeSize, safeSize, { fit: "fill", kernel: "lanczos3" }).png().toBuffer()
		const foreground = await sharp({ create: { width: adaptiveSize, height: adaptiveSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
			.composite([{ input: adaptiveArtwork, left: inset, top: inset }])
			.png()
			.toBuffer()
		await sharp(foreground).png().toFile(path.join(directory, "ic_launcher_foreground.png"))
		console.log(`${density.name}: legacy ${legacySize}px; adaptive ${adaptiveSize}px canvas with centered ${safeSize}px artwork.`)
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : "Launcher icon generation failed.")
	process.exitCode = 1
})
