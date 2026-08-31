"use client"

import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from "react"
import { useStoreContext } from "./store-context"

export interface CartItem {
	id: string
	productId: string
	name: string
	brand: string
	image: string
	price: number
	quantity: number
	variant?: string
	maxStock: number
	slug: string
}

interface CartContextType {
	items: CartItem[]
	addItem: (item: Omit<CartItem, "id">) => void
	removeItem: (itemId: string) => void
	updateQuantity: (itemId: string, quantity: number) => void
	clearCart: () => void
	itemCount: number
	subtotal: number
	shippingEstimate: number
	total: number
	savedItems: CartItem[]
	saveForLater: (itemId: string) => void
	moveToCart: (itemId: string) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
	const store = useStoreContext()
	const [items, setItems] = useState<CartItem[]>([])
	const [savedItems, setSavedItems] = useState<CartItem[]>([])
	const [mounted, setMounted] = useState(false)
	const cartStorageKey = `cart:${store.storeId}`
	const savedItemsStorageKey = `savedItems:${store.storeId}`

	// Keep carts isolated per merchant store. A shared key would carry products
	// and prices from one storefront into another storefront in the same browser.
	useEffect(() => {
		setMounted(false)
		try {
			const savedCart = localStorage.getItem(cartStorageKey)
			const savedLater = localStorage.getItem(savedItemsStorageKey)
			setItems(savedCart ? JSON.parse(savedCart) : [])
			setSavedItems(savedLater ? JSON.parse(savedLater) : [])
		} catch (error) {
			console.error("Failed to restore store cart:", error)
			setItems([])
			setSavedItems([])
		}
		setMounted(true)
	}, [cartStorageKey, savedItemsStorageKey])

	// Persist cart to localStorage
	useEffect(() => {
		if (mounted) {
			localStorage.setItem(cartStorageKey, JSON.stringify(items))
		}
	}, [cartStorageKey, items, mounted])

	useEffect(() => {
		if (mounted) {
			localStorage.setItem(savedItemsStorageKey, JSON.stringify(savedItems))
		}
	}, [mounted, savedItems, savedItemsStorageKey])

	const addItem = useCallback((newItem: Omit<CartItem, "id">) => {
		setItems((prev) => {
			const existingIndex = prev.findIndex(
				(item) =>
					item.productId === newItem.productId &&
					item.variant === newItem.variant,
			)
			if (existingIndex > -1) {
				const updated = [...prev]
				updated[existingIndex] = {
					...updated[existingIndex],
					quantity: Math.min(
						updated[existingIndex].quantity + newItem.quantity,
						newItem.maxStock,
					),
				}
				return updated
			}
			return [
				...prev,
				{
					...newItem,
					id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				},
			]
		})
	}, [])

	const removeItem = useCallback((itemId: string) => {
		setItems((prev) => prev.filter((item) => item.id !== itemId))
	}, [])

	const updateQuantity = useCallback((itemId: string, quantity: number) => {
		setItems((prev) =>
			prev.map((item) =>
				item.id === itemId
					? {
							...item,
							quantity: Math.min(Math.max(1, quantity), item.maxStock),
						}
					: item,
			),
		)
	}, [])

	const clearCart = useCallback(() => {
		setItems([])
	}, [])

	const saveForLater = useCallback((itemId: string) => {
		setItems((prev) => {
			const item = prev.find((i) => i.id === itemId)
			if (item) {
				setSavedItems((saved) => [
					...saved,
					{ ...item, id: `saved-${Date.now()}` },
				])
				return prev.filter((i) => i.id !== itemId)
			}
			return prev
		})
	}, [])

	const moveToCart = useCallback((itemId: string) => {
		setSavedItems((prev) => {
			const item = prev.find((i) => i.id === itemId)
			if (item) {
				setItems((cart) => [...cart, { ...item, id: `cart-${Date.now()}` }])
				return prev.filter((i) => i.id !== itemId)
			}
			return prev
		})
	}, [])

	const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
	const subtotal = items.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	)
	const shippingEstimate = subtotal >= store.ecommerce.freeShippingThreshold ? 0 : store.ecommerce.defaultShippingCost
	const total = subtotal + shippingEstimate

	return (
		<CartContext.Provider
			value={{
				items,
				addItem,
				removeItem,
				updateQuantity,
				clearCart,
				itemCount,
				subtotal,
				shippingEstimate,
				total,
				savedItems,
				saveForLater,
				moveToCart,
			}}
		>
			{children}
		</CartContext.Provider>
	)
}

export function useCart() {
	const context = useContext(CartContext)
	if (context === undefined) {
		throw new Error("useCart must be used within a CartProvider")
	}
	return context
}
