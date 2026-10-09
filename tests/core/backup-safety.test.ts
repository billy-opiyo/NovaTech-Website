import { test } from "node:test"
import assert from "node:assert/strict"

test("backup restore guard rejects the same PostgreSQL database", async () => {
	const { assertDistinctPostgresDatabases } = await import("../../scripts/postgres-database-identity.mjs")
	assert.throws(
		() => assertDistinctPostgresDatabases("postgresql://backup:secret@db.example.com/app", "postgresql://restore:other@db.example.com:5432/app?sslmode=require"),
		/same PostgreSQL database/,
	)
})

test("backup restore guard compares database and connection parameters", async () => {
	const { assertDistinctPostgresDatabases } = await import("../../scripts/postgres-database-identity.mjs")
	assert.throws(
		() => assertDistinctPostgresDatabases("postgres://backup:secret@db.example.com/app", "postgres://restore:other@db.example.com/app?dbname=app"),
		/same PostgreSQL database/,
	)
	assert.doesNotThrow(() => assertDistinctPostgresDatabases("postgres://backup:secret@db.example.com/app", "postgres://restore:other@db.example.com:5433/app"))
})

test("backup restore guard permits distinct database targets", async () => {
	const { assertDistinctPostgresDatabases } = await import("../../scripts/postgres-database-identity.mjs")
	assert.doesNotThrow(() => assertDistinctPostgresDatabases("postgres://backup:secret@db.example.com/app", "postgres://restore:secret@db.example.com/restore"))
	assert.doesNotThrow(() => assertDistinctPostgresDatabases("postgres://backup:secret@db.example.com/app", "postgres://restore:secret@other.example.com/app"))
})

test("backup restore guard fails closed on malformed or non-PostgreSQL URLs", async () => {
	const { assertDistinctPostgresDatabases } = await import("../../scripts/postgres-database-identity.mjs")
	assert.throws(() => assertDistinctPostgresDatabases("not-a-url", "postgres://restore:secret@db.example.com/restore"), /valid PostgreSQL/)
	assert.throws(() => assertDistinctPostgresDatabases("mysql://backup:secret@db.example.com/app", "postgres://restore:secret@db.example.com/restore"), /postgres or postgresql/)
})
