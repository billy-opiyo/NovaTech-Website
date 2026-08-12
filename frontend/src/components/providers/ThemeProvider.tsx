"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
	theme: Theme
	toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	// The head script applies the saved theme before the first paint. Keep the
	// initial React value dark as well so hydration does not briefly render light mode.
	const [theme, setTheme] = useState<Theme>("dark")

	useEffect(() => {
		const stored = localStorage.getItem("theme")
		const next: Theme = stored === "light" ? "light" : "dark"

		setTheme(next)
		document.documentElement.classList.toggle("dark", next === "dark")
		document.documentElement.style.colorScheme = next
	}, [])

	const toggleTheme = () => {
		const next = theme === "dark" ? "light" : "dark"
		setTheme(next)
		localStorage.setItem("theme", next)
		document.documentElement.classList.toggle("dark", next === "dark")
		document.documentElement.style.colorScheme = next
	}

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
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
