"use client"

import { useEffect } from "react"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { App } from "@capacitor/app"

type SystemBarsPlugin = {
	setColors(options: { color: string; lightIcons: boolean }): Promise<void>
}

const SystemBars = registerPlugin<SystemBarsPlugin>("SystemBars")

function readThemeColor() {
	const raw = getComputedStyle(document.documentElement).getPropertyValue("--color-theme-bg").trim()
	const channels = raw.split(/[ ,]+/).map(Number)
	if (channels.length < 3 || channels.some((channel) => !Number.isFinite(channel))) return null
	const [red, green, blue] = channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel))))
	const linear = [red, green, blue].map((channel) => {
		const normalized = channel / 255
		return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
	})
	const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
	return {
		color: `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
		lightIcons: luminance > 0.45,
	}
}

/** Keep Android's status and navigation bars matched to the active site palette. */
export default function AndroidSystemBars() {
	useEffect(() => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android" || !Capacitor.isPluginAvailable("SystemBars")) return
		let lastApplied = ""
		let pending = false
		const applyTheme = () => {
			pending = false
			const theme = readThemeColor()
			if (!theme) return
			const key = `${theme.color}:${theme.lightIcons}`
			if (key === lastApplied) return
			lastApplied = key
			void SystemBars.setColors(theme).catch(() => undefined)
		}
		const scheduleApply = () => {
			if (pending) return
			pending = true
			window.requestAnimationFrame(applyTheme)
		}
		applyTheme()
		const observer = new MutationObserver(scheduleApply)
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] })
		let active = true
		let appStateListener: { remove: () => Promise<void> } | undefined
		void App.addListener("appStateChange", ({ isActive }) => {
			if (active && isActive) scheduleApply()
		}).then((listener) => {
			if (active) appStateListener = listener
			else void listener.remove()
		})
		return () => {
			active = false
			observer.disconnect()
			if (appStateListener) void appStateListener.remove()
		}
	}, [])

	return null
}
