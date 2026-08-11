import { Request, Response } from "express"
import * as orderService from "../services/order.service"

export async function getOrders(req: Request, res: Response) {
	try {
		const userId = req.user?.id
		const page = parseInt(req.query.page as string) || 1
		const limit = parseInt(req.query.limit as string) || 20

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized" })
		}

		const result = await orderService.getOrdersByUserId(userId, page, limit)
		return res.json(result)
	} catch (error: any) {
		return res.status(500).json({ message: error.message })
	}
}

export async function createOrder(req: Request, res: Response) {
	try {
		const userId = req.user?.id
		const data = { ...req.body, userId }

		const order = await orderService.createOrder(data)
		return res.status(201).json(order)
	} catch (error: any) {
		return res.status(400).json({ message: error.message })
	}
}

export async function getOrder(req: Request, res: Response) {
	try {
		const { id } = req.params
		const userId = req.user?.id

		const order = await orderService.getOrderById(id, userId)
		return res.json(order)
	} catch (error: any) {
		return res.status(404).json({ message: error.message })
	}
}

export async function updateOrder(req: Request, res: Response) {
	try {
		const { id } = req.params
		const { status, trackingNumber } = req.body

		if (!status) {
			return res.status(400).json({ message: "Status is required" })
		}

		const order = await orderService.updateOrderStatus(id, status, trackingNumber)
		return res.json(order)
	} catch (error: any) {
		return res.status(404).json({ message: error.message })
	}
}

export async function getAllOrders(req: Request, res: Response) {
	try {
		const page = parseInt(req.query.page as string) || 1
		const limit = parseInt(req.query.limit as string) || 20
		const status = req.query.status as string | undefined

		const result = await orderService.getAllOrders(page, limit, status)
		return res.json(result)
	} catch (error: any) {
		return res.status(500).json({ message: error.message })
	}
}

export async function getOrderStats(req: Request, res: Response) {
	try {
		const stats = await orderService.getOrderStats()
		return res.json(stats)
	} catch (error: any) {
		return res.status(500).json({ message: error.message })
	}
}