"use client"

import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from "react"
import { DEFAULT_SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from "../constants"

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
	const [items, setItems] = useState<CartItem[]>([])
	const [savedItems, setSavedItems] = useState<CartItem[]>([])
	const [mounted, setMounted] = useState(false)

	// Load cart from localStorage on mount
	useEffect(() => {
		setMounted(true)
		const savedCart = localStorage.getItem("cart")
		const savedLater = localStorage.getItem("savedItems")
		if (savedCart) {
			try {
				setItems(JSON.parse(savedCart))
			} catch (e) {
				console.error("Failed to parse cart:", e)
			}
		}
		if (savedLater) {
			try {
				setSavedItems(JSON.parse(savedLater))
			} catch (e) {
				console.error("Failed to parse saved items:", e)
			}
		}
	}, [])

	// Persist cart to localStorage
	useEffect(() => {
		if (mounted) {
			localStorage.setItem("cart", JSON.stringify(items))
		}
	}, [items, mounted])

	useEffect(() => {
		if (mounted) {
			localStorage.setItem("savedItems", JSON.stringify(savedItems))
		}
	}, [savedItems, mounted])

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
	const shippingEstimate = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST
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
