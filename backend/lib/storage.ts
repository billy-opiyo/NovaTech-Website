import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const R2 = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME!

export async function uploadFile(
	file: Buffer,
	key: string,
	contentType: string,
) {
	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		Body: file,
		ContentType: contentType,
	})

	await R2.send(command)

	return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
}

export async function deleteFile(key: string) {
	const command = new DeleteObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
	})

	await R2.send(command)
}

export async function getSignedUploadUrl(
	key: string,
	contentType: string,
	expiresIn = 3600,
) {
	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		ContentType: contentType,
	})

	return getSignedUrl(R2, command, { expiresIn })
}

export function generateFileKey(productId: string, fileName: string): string {
	const extension = fileName.split(".").pop()
	const timestamp = Date.now()
	return `products/${productId}/${timestamp}-${Math.random().toString(36).substring(2, 9)}.${extension}`
}

export function generateTenantFileKey(tenantId: string, storeId: string, productId: string, fileName: string): string {
	const extension = fileName.split(".").pop()?.toLowerCase() || "bin"
	const timestamp = Date.now()
	const scope = productId === "general" ? "assets" : `products/${productId}`
	return `tenants/${tenantId}/stores/${storeId}/${scope}/${timestamp}-${Math.random().toString(36).substring(2, 9)}.${extension}`
}

export function generateProfileFileKey(userId: string, fileName: string): string {
	const extension = fileName.split(".").pop()?.toLowerCase() || "jpg"
	const timestamp = Date.now()
	return `profiles/${userId}/${timestamp}-${Math.random().toString(36).substring(2, 9)}.${extension}`
}
