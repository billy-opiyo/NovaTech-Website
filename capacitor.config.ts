import type { CapacitorConfig } from "@capacitor/cli"

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
	},
	plugins: {
		App: {
			disableBackButtonHandler: true,
		},
	},
}

export default config
