import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"

const projectRoot = process.cwd()
const buildScript = path.join(projectRoot, "scripts", "android-build.mjs")
const capacitorCli = path.join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor")

function runBuildTarget(target: string | undefined, action = "validate", overrides: NodeJS.ProcessEnv = {}) {
	const args = [buildScript]
	if (target !== undefined) args.push(target)
	args.push(action)
	return spawnSync(process.execPath, args, {
		cwd: projectRoot,
		encoding: "utf8",
		env: { ...process.env, ...overrides },
	})
}

function readCapacitorConfig(target: "staging" | "production") {
	const expectedUrl = target === "staging"
		? "https://nuravatech-saas-staging.vercel.app"
		: "https://nuravahubstores.com"
	const result = spawnSync(process.execPath, [capacitorCli, "config", "--json"], {
		cwd: projectRoot,
		encoding: "utf8",
		env: {
			...process.env,
			CAPACITOR_BUILD_TARGET: target,
			CAPACITOR_SERVER_URL: expectedUrl,
		},
	})
	assert.equal(result.status, 0, result.stderr || result.stdout)
	return JSON.parse(result.stdout) as {
		app: {
			extConfig: {
				server: { url: string; cleartext: boolean }
				webDir: string
			}
		}
	}
}

test("Android staging command resolves only to the staging origin", () => {
	const result = runBuildTarget("staging")
	assert.equal(result.status, 0, result.stderr)
	assert.deepEqual(JSON.parse(result.stdout), {
		target: "staging",
		url: "https://nuravatech-saas-staging.vercel.app",
	})
	const config = readCapacitorConfig("staging")
	assert.equal(config.app.extConfig.server.url, "https://nuravatech-saas-staging.vercel.app")
	assert.equal(config.app.extConfig.server.cleartext, false)
	assert.equal(config.app.extConfig.webDir, "capacitor-shell")
})

test("Android production release command resolves only to the approved production origin", () => {
	const result = runBuildTarget("production")
	assert.equal(result.status, 0, result.stderr)
	assert.deepEqual(JSON.parse(result.stdout), {
		target: "production",
		url: "https://nuravahubstores.com",
	})
	const config = readCapacitorConfig("production")
	assert.equal(config.app.extConfig.server.url, "https://nuravahubstores.com")
	assert.equal(config.app.extConfig.server.cleartext, false)
	assert.equal(config.app.extConfig.webDir, "capacitor-shell")
})

test("direct Capacitor config evaluation rejects a missing, invalid, or mismatched target", () => {
	for (const env of [
		{ CAPACITOR_BUILD_TARGET: "", CAPACITOR_SERVER_URL: "" },
		{ CAPACITOR_BUILD_TARGET: "preview", CAPACITOR_SERVER_URL: "" },
		{ CAPACITOR_BUILD_TARGET: "staging", CAPACITOR_SERVER_URL: "https://nuravahubstores.com" },
	]) {
		const result = spawnSync(process.execPath, [capacitorCli, "config", "--json"], {
			cwd: projectRoot,
			encoding: "utf8",
			env: { ...process.env, ...env },
		})
		assert.notEqual(result.status, 0)
	}
})

test("Android build launcher rejects missing, invalid, and inherited conflicting selections", () => {
	assert.notEqual(runBuildTarget(undefined).status, 0)
	assert.notEqual(runBuildTarget("preview").status, 0)
	assert.notEqual(runBuildTarget("staging", "validate", { CAPACITOR_BUILD_TARGET: "production" }).status, 0)
	assert.notEqual(runBuildTarget("production", "validate", { CAPACITOR_SERVER_URL: "https://nuravatech-saas-staging.vercel.app" }).status, 0)
})

test("npm Android commands bind staging workflows and production releases to their named targets", () => {
	const scripts = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")).scripts as Record<string, string>
	assert.equal(scripts["android:add"], "node scripts/android-build.mjs staging add")
	assert.equal(scripts["android:sync"], "node scripts/android-build.mjs staging sync")
	assert.equal(scripts["android:open"], "node scripts/android-build.mjs staging open")
	assert.equal(scripts["android:debug"], "node scripts/android-build.mjs staging debug")
	assert.equal(scripts["android:staging:update"], "node scripts/android-build.mjs staging staging-update")
	assert.equal(scripts["android:sync:production"], "node scripts/android-build.mjs production sync")
	assert.equal(scripts["android:open:production"], "node scripts/android-build.mjs production open")
	assert.equal(scripts["android:release:apk"], "node scripts/android-build.mjs production release-apk")
	assert.equal(scripts["android:release:aab"], "node scripts/android-build.mjs production release-aab")
})
