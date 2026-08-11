import { test } from "node:test"
import assert from "node:assert/strict"
import {
	normalizePhone,
	generatePassword,
} from "../../backend/lib/daraja"

test("normalizePhone converts 07XXXXXXXX to 2547XXXXXXXX", () => {
	assert.equal(normalizePhone("0712345678"), "254712345678")
})

test("normalizePhone keeps 254XXXXXXXXX as-is", () => {
	assert.equal(normalizePhone("254712345678"), "254712345678")
})

test("normalizePhone strips non-digit characters", () => {
	assert.equal(normalizePhone("+254 712 345 678"), "254712345678")
})

test("normalizePhone throws on invalid format", () => {
	assert.throws(() => normalizePhone("12345"), /Invalid Kenyan phone number/)
	assert.throws(() => normalizePhone("071234"), /Invalid Kenyan phone number/)
	assert.throws(() => normalizePhone("25471234"), /Invalid Kenyan phone number/)
})

test("generatePassword returns base64 password and 14-digit timestamp", () => {
	const { password, timestamp } = generatePassword("174379", "testpasskey")
	assert.equal(typeof password, "string")
	assert.match(timestamp, /^\d{14}$/)
	assert.ok(password.length > 0)
})

test("generatePassword produces valid base64 output", () => {
	const a = generatePassword("174379", "testpasskey")
	const b = generatePassword("174379", "testpasskey")
	assert.ok(Buffer.from(a.password, "base64").length > 0)
	assert.ok(Buffer.from(b.password, "base64").length > 0)
})