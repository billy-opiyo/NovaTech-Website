import { test } from "node:test"
import assert from "node:assert/strict"
import { hasAllowedFileSignature } from "../../backend/lib/file-validation"

test("file validation requires matching magic bytes", () => {
	assert.equal(hasAllowedFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), ["JPEG"]), true)
	assert.equal(hasAllowedFileSignature(Buffer.from("<svg></svg>"), ["PNG", "JPEG", "WEBP", "GIF"]), false)
	assert.equal(hasAllowedFileSignature(Buffer.from("%PDF-1.7"), ["PDF"]), true)
})
