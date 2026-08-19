"use client"

import { createContext, useContext } from "react"
import type { StoreContext } from "./store-context.types"

const StoreContextValue = createContext<StoreContext | null>(null)

export function StoreContextProvider({ value, children }: { value: StoreContext; children: React.ReactNode }) {
	return <StoreContextValue.Provider value={value}>{children}</StoreContextValue.Provider>
}

export function useStoreContext() {
	const value = useContext(StoreContextValue)
	if (!value) throw new Error("useStoreContext must be used inside StoreContextProvider")
	return value
}
