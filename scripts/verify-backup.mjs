import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"

const source = process.env.BACKUP_DATABASE_URL
const restore = process.env.RESTORE_DATABASE_URL
if (!source || !restore) {
	console.error("BACKUP_DATABASE_URL and RESTORE_DATABASE_URL are required")
	process.exit(1)
}

const run = (command, args) => new Promise((resolve, reject) => {
	const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" })
	child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)))
})

const directory = await mkdtemp(join(tmpdir(), "novatech-backup-"))
const dump = join(directory, "database.dump")
try {
	await run("pg_dump", ["--format=custom", "--no-owner", "--file", dump, source])
	await run("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", restore, dump])
	console.log("Database backup and restore verification passed.")
} finally {
	await rm(directory, { recursive: true, force: true })
}
