import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

const projectRoot = process.cwd()
const buildScript = path.join(projectRoot, "scripts", "android-build.mjs")
const verifierUrl = pathToFileURL(path.join(projectRoot, "scripts", "verify-android-release.mjs")).href

function runNode(source: string, env: NodeJS.ProcessEnv = process.env) {
	return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
		cwd: projectRoot,
		encoding: "utf8",
		env,
	})
}

test("production APK and AAB commands stop before Capacitor sync when signing inputs are missing", () => {
	for (const action of ["release-apk", "release-aab"]) {
		const result = spawnSync(process.execPath, [buildScript, "production", action], {
			cwd: projectRoot,
			encoding: "utf8",
			env: {
				...process.env,
				CAPACITOR_BUILD_TARGET: "",
				CAPACITOR_SERVER_URL: "",
				NURAVA_ANDROID_PRODUCTION_RELEASE_ENABLED: "1",
				NURAVA_ANDROID_KEYSTORE: "",
				NURAVA_ANDROID_STORE_PASSWORD: "",
				NURAVA_ANDROID_KEY_ALIAS: "",
				NURAVA_ANDROID_KEY_PASSWORD: "",
				NURAVA_ANDROID_EXPECTED_CERT_SHA256: "",
			},
		})
		assert.notEqual(result.status, 0)
		assert.match(result.stderr, /Production signing is incomplete/)
		assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /Syncing|Gradle (copyReleaseApk|bundleRelease)/)
		assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /secret-value|another-secret/i)
	}
})

test("production APK and AAB generation stays disabled without explicit process-local approval", () => {
	for (const action of ["release-apk", "release-aab"]) {
		const result = spawnSync(process.execPath, [buildScript, "production", action], {
			cwd: projectRoot,
			encoding: "utf8",
			env: {
				...process.env,
				CAPACITOR_BUILD_TARGET: "",
				CAPACITOR_SERVER_URL: "",
				NURAVA_ANDROID_PRODUCTION_RELEASE_ENABLED: "",
			},
		})
		assert.notEqual(result.status, 0)
		assert.match(result.stderr, /Production APK\/AAB generation is disabled/)
		assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /Syncing|Gradle (copyReleaseApk|bundleRelease)/)
	}
})

test("Gradle release packaging is restricted to the artifact-verifying npm wrapper", () => {
	const launcher = readFileSync(buildScript, "utf8")
	const gradle = readFileSync(path.join(projectRoot, "android", "app", "build.gradle"), "utf8")
	assert.equal((launcher.match(/NURAVA_ANDROID_RELEASE_WRAPPER = "1"/g) || []).length, 2)
	assert.match(gradle, /System\.getenv\('NURAVA_ANDROID_RELEASE_WRAPPER'\) != '1'/)
	assert.match(gradle, /System\.getenv\('NURAVA_ANDROID_PRODUCTION_RELEASE_ENABLED'\) != '1'/)
	assert.match(gradle, /finished artifact is verified before distribution/)
})

test("production release environment rejects a relative keystore and malformed certificate pin", () => {
	const result = runNode(`
		import { validateProductionReleaseEnvironment } from ${JSON.stringify(pathToFileURL(buildScript).href)};
		const common = {
			CAPACITOR_BUILD_TARGET: 'production',
			CAPACITOR_SERVER_URL: 'https://nuravahubstores.com',
			NURAVA_ANDROID_PRODUCTION_RELEASE_ENABLED: '1',
			NURAVA_ANDROID_STORE_PASSWORD: 'secret-value-must-not-be-printed',
			NURAVA_ANDROID_KEY_ALIAS: 'release',
			NURAVA_ANDROID_KEY_PASSWORD: 'another-secret-must-not-be-printed',
			NURAVA_ANDROID_EXPECTED_CERT_SHA256: 'bad-pin',
		};
		for (const env of [
			{ ...common, NURAVA_ANDROID_KEYSTORE: 'relative-keystore.jks' },
			{ ...common, NURAVA_ANDROID_KEYSTORE: ${JSON.stringify(process.execPath)} },
			{ ...common, NURAVA_ANDROID_KEYSTORE: ${JSON.stringify(path.join(projectRoot, "android", "app", "build.gradle"))}, NURAVA_ANDROID_EXPECTED_CERT_SHA256: 'ab'.repeat(32) },
		]) {
			try { validateProductionReleaseEnvironment(env, 'apk'); process.exitCode = 2; }
			catch (error) { console.log(error.message); }
		}
	`)
	assert.equal(result.status, 0, result.stderr)
	assert.match(result.stdout, /absolute path/)
	assert.match(result.stdout, /must be outside the repository/)
	assert.match(result.stdout, /certificate SHA-256 fingerprint/)
	assert.doesNotMatch(result.stdout, /secret-value|another-secret/)
})

test("certificate pin and embedded production config validation fail closed", () => {
	const result = runNode(`
		import { requireExpectedCertificate, validateEmbeddedCapacitorConfig, readZipEntry, requireVerifiedJarSignature } from ${JSON.stringify(verifierUrl)};
		const validPin = 'ab'.repeat(32);
		if (requireExpectedCertificate(validPin, validPin.toUpperCase()) !== validPin) process.exitCode = 1;
		for (const [actual, expected] of [['cd'.repeat(32), validPin], [validPin, 'bad']]) {
			try { requireExpectedCertificate(actual, expected); process.exitCode = 2; }
			catch {}
		}
		const valid = JSON.stringify({ appId: 'com.nurava.hubstores', server: { url: 'https://nuravahubstores.com', cleartext: false } });
		validateEmbeddedCapacitorConfig(valid);
		for (const config of [
			{ appId: 'com.nurava.hubstores', server: { url: 'https://nuravatech-saas-staging.vercel.app', cleartext: false } },
			{ appId: 'com.nurava.hubstores', server: { url: 'http://nuravahubstores.com', cleartext: true } },
		]) {
			try { validateEmbeddedCapacitorConfig(JSON.stringify(config)); process.exitCode = 3; }
			catch {}
		}
		if (typeof readZipEntry !== 'function') process.exitCode = 4;
		requireVerifiedJarSignature('jar verified.');
		for (const output of ['jar is unsigned.', 'jar verified. Signature digest invalid']) {
			try { requireVerifiedJarSignature(output); process.exitCode = 5; }
			catch {}
		}
	`)
	assert.equal(result.status, 0, result.stderr)
})

test("ZIP asset reader extracts stored and deflated Capacitor configs in memory", () => {
	const result = runNode(`
		import { readZipEntry, validateEmbeddedCapacitorConfig } from ${JSON.stringify(verifierUrl)};
		import { deflateRawSync } from 'node:zlib';
		const entryName = 'assets/capacitor.config.json';
		const payload = Buffer.from(JSON.stringify({ appId: 'com.nurava.hubstores', server: { url: 'https://nuravahubstores.com', cleartext: false } }));
		function zip(method) {
			const fileName = Buffer.from(entryName);
			const compressed = method === 8 ? deflateRawSync(payload) : payload;
			const local = Buffer.alloc(30);
			local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8);
			local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(payload.length, 22); local.writeUInt16LE(fileName.length, 26);
			const localBlock = Buffer.concat([local, fileName, compressed]);
			const central = Buffer.alloc(46);
			central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(method, 10);
			central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(payload.length, 24); central.writeUInt16LE(fileName.length, 28);
			const centralBlock = Buffer.concat([central, fileName]);
			const eocd = Buffer.alloc(22);
			eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
			eocd.writeUInt32LE(centralBlock.length, 12); eocd.writeUInt32LE(localBlock.length, 16);
			return Buffer.concat([localBlock, centralBlock, eocd]);
		}
		for (const method of [0, 8]) validateEmbeddedCapacitorConfig(readZipEntry(zip(method), entryName).toString('utf8'));
	`)
	assert.equal(result.status, 0, result.stderr)
})

test("verifier reports only a generic missing-artifact error without inspecting unrelated data", () => {
	const result = runNode(`
		import { verifyAndroidReleaseArtifact } from ${JSON.stringify(verifierUrl)};
		try { verifyAndroidReleaseArtifact({ type: 'apk', artifact: 'missing-release.apk', env: {} }); process.exitCode = 1; }
		catch (error) { console.log(error.message); }
	`)
	assert.equal(result.status, 0, result.stderr)
	assert.match(result.stdout, /Release artifact does not exist/)
})
