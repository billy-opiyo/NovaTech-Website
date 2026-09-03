export const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024

export const IMAGE_TOO_LARGE_MESSAGE = "The uploaded image is more that 1MB please compress it or upload an image that is less than 1MB"

export function isImageTooLarge(file: File) {
	return file.type.startsWith("image/") && file.size > MAX_IMAGE_UPLOAD_BYTES
}
