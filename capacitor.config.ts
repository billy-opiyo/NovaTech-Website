import type { CapacitorConfig } from "@capacitor/cli"
const appEntryUrl = "https://nuravahubstores.com/"
const config: CapacitorConfig = {
	appId: "com.nurava.hubstores",
	appName: "Nurava HubStores",
	webDir: "capacitor-shell",
	android: {
		webContentsDebuggingEnabled: false,
		loggingBehavior: "none",
	},
	server: {
		url: "https://nuravahubstores.com",
		cleartext: false,
		errorPath: `offline.html?url=${encodeURIComponent(appEntryUrl)}`,
	},
	plugins: {
		App: {
			disableBackButtonHandler: true,
		},
	},
}

export default config
