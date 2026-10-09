"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { FONT_SIZE_CSS_VALUE, isFontSizePreference, type FontSizePreference } from "@/lib/font-size-preference"

type Theme = "light" | "dark"

interface ThemeContextValue {
	theme: Theme
	toggleTheme: () => void
	setTheme: (theme: Theme) => void
	fontSizePreference: FontSizePreference
	setFontSizePreference: (preference: FontSizePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const { status } = useSession()
	// The head script applies the saved theme before the first paint. Keep the
	// initial React value dark as well so hydration does not briefly render light mode.
	const [theme, setTheme] = useState<Theme>("dark")
	const [fontSizePreference, setFontSizePreferenceState] = useState<FontSizePreference>("site")
	const setFontSizePreference = useCallback((preference: FontSizePreference) => {
		setFontSizePreferenceState(preference)
		if (preference === "site") document.documentElement.style.removeProperty("--account-font-size")
		else document.documentElement.style.setProperty("--account-font-size", FONT_SIZE_CSS_VALUE[preference])
	}, [])

	useEffect(() => {
		const stored = localStorage.getItem("theme")
		const next: Theme = stored === "light" ? "light" : "dark"

		setTheme(next)
		document.documentElement.classList.toggle("dark", next === "dark")
		document.documentElement.style.colorScheme = next
	}, [])

	useEffect(() => {
		let active = true
		if (status !== "authenticated") {
			setFontSizePreference("site")
			return () => { active = false }
		}

		fetch("/api/account/settings", { cache: "no-store" })
			.then(async (response) => response.ok ? response.json() : null)
			.then((data) => {
				if (!active || !isFontSizePreference(data?.user?.preferredFontSize)) return
				setFontSizePreference(data.user.preferredFontSize)
			})
			.catch(() => undefined)
		return () => { active = false }
	}, [status, setFontSizePreference])

	const applyTheme = (next: Theme) => {
		setTheme(next)
		localStorage.setItem("theme", next)
		document.documentElement.classList.toggle("dark", next === "dark")
		document.documentElement.style.colorScheme = next
	}

	return (
		<ThemeContext.Provider
			value={{
				theme,
				toggleTheme: () => applyTheme(theme === "dark" ? "light" : "dark"),
				setTheme: applyTheme,
				fontSizePreference,
				setFontSizePreference,
			}}
		>
			{children}
		</ThemeContext.Provider>
	)
}

export function useTheme() {
	const context = useContext(ThemeContext)
	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider")
	return context
}
