import type { CapacitorConfig } from "@capacitor/cli"
import { resolveAndroidBuildTarget } from "./scripts/android-build.mjs"

const { url: appUrl } = resolveAndroidBuildTarget(process.env)
const parsedAppUrl = new URL(appUrl)

const config: CapacitorConfig = {
	appId: "com.nurava.hubstores",
	appName: "Nurava HubStores",
	webDir: "capacitor-shell",
	android: {
		webContentsDebuggingEnabled: false,
		loggingBehavior: "none",
	},
	server: {
		url: parsedAppUrl.origin,
		cleartext: false,
		appStartPath: `${parsedAppUrl.pathname}${parsedAppUrl.search}`,
	},
}

export default config
