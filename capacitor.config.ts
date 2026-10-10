import type { CapacitorConfig } from "@capacitor/cli"

const appUrl = process.env.CAPACITOR_SERVER_URL?.trim() || "https://nuravatech-saas-staging.vercel.app"
const parsedAppUrl = new URL(appUrl)
if (parsedAppUrl.protocol !== "https:") {
	throw new Error("CAPACITOR_SERVER_URL must use HTTPS")
}

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
