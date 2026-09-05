"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { getThemePreset, themeToCssVariables } from "@/config/theme-presets"
import { getStoreRouteHref } from "@/lib/store-home"
import type { StoreContext } from "./store-context.types"

const StoreContextValue = createContext<StoreContext | null>(null)

export const STORE_SETTINGS_CHANNEL = "nurava:site-settings"
const STORE_SETTINGS_STORAGE_KEY = "nurava:site-settings-updated"

type StoreSettingsPublishedEvent = {
	scope: "platform" | "store"
	storeSlug?: string
	publishedAt?: string
}

export function notifyStoreSettingsPublished(event: StoreSettingsPublishedEvent) {
	if (typeof window === "undefined") return
	const message = { ...event, nonce: Date.now() }
	try {
		if (typeof BroadcastChannel !== "undefined") {
			const channel = new BroadcastChannel(STORE_SETTINGS_CHANNEL)
			channel.postMessage(message)
			channel.close()
		}
	} catch {
		// Storage remains as the compatibility fallback for browsers without channels.
	}
	try {
		window.localStorage.setItem(STORE_SETTINGS_STORAGE_KEY, JSON.stringify(message))
	} catch {
		// Public pages still refresh when they regain visibility or on the next poll.
	}
}

export function StoreContextProvider({ value, children }: { value: StoreContext; children: React.ReactNode }) {
	const [currentValue, setCurrentValue] = useState(value)
	const scopeKey = `${value.isPlatformHome ? "platform" : "store"}:${value.storeId}:${value.storeSlug}`
	const endpoint = getStoreRouteHref(value, "/api/public/site-context")
	const isPlatformHome = value.isPlatformHome
	const storeSlug = value.storeSlug

	useEffect(() => {
		setCurrentValue(value)
	}, [value])

	useEffect(() => {
		let active = true

		const refresh = async () => {
			try {
				const response = await fetch(endpoint, { cache: "no-store" })
				if (!response.ok) return
				const data = await response.json()
				if (active && data.context) setCurrentValue(data.context as StoreContext)
			} catch {
				// Keep the last known published context when a background refresh fails.
			}
		}

		const isRelevant = (event: StoreSettingsPublishedEvent) => {
			if (isPlatformHome) return event.scope === "platform"
			return event.scope === "store" && event.storeSlug === storeSlug
		}
		const handleMessage = (event: MessageEvent<StoreSettingsPublishedEvent>) => {
			if (isRelevant(event.data)) void refresh()
		}
		const handleStorage = (event: StorageEvent) => {
			if (event.key !== STORE_SETTINGS_STORAGE_KEY || !event.newValue) return
			try {
				const message = JSON.parse(event.newValue) as StoreSettingsPublishedEvent
				if (isRelevant(message)) void refresh()
			} catch {
				// Ignore malformed compatibility messages.
			}
		}
		const handleVisibility = () => {
			if (document.visibilityState === "visible") void refresh()
		}
		let channel: BroadcastChannel | null = null
		try {
			if (typeof BroadcastChannel !== "undefined") {
				channel = new BroadcastChannel(STORE_SETTINGS_CHANNEL)
				channel.addEventListener("message", handleMessage)
			}
		} catch {
			channel = null
		}
		window.addEventListener("storage", handleStorage)
		document.addEventListener("visibilitychange", handleVisibility)
		const interval = window.setInterval(() => void refresh(), 10000)

		return () => {
			active = false
			channel?.removeEventListener("message", handleMessage)
			channel?.close()
			window.removeEventListener("storage", handleStorage)
			document.removeEventListener("visibilitychange", handleVisibility)
			window.clearInterval(interval)
		}
	}, [endpoint, isPlatformHome, scopeKey, storeSlug])

	useEffect(() => {
		const cssVariables = themeToCssVariables(getThemePreset(currentValue.themePreset))
		for (const [name, cssValue] of Object.entries(cssVariables)) {
			document.documentElement.style.setProperty(name, String(cssValue))
		}
		if (currentValue.brand.favicon) {
			let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
			if (!favicon) {
				favicon = document.createElement("link")
				favicon.rel = "icon"
				document.head.appendChild(favicon)
			}
			favicon.href = currentValue.brand.favicon
		}
	}, [currentValue])

	return <StoreContextValue.Provider value={currentValue}>{children}</StoreContextValue.Provider>
}

export function useStoreContext() {
	const value = useContext(StoreContextValue)
	if (!value) throw new Error("useStoreContext must be used inside StoreContextProvider")
	return value
}
