import { Router } from "express"
import {
	getLowStockProducts,
	getOutOfStockProducts,
	getInventoryOverview,
	getStockAlerts,
	getReorderSuggestions,
	updateProductStock,
	updateVariantStock,
	getStockMovementHistory,
} from "../services/inventory.service"
import adminMiddleware from "../middleware/admin.middleware"

const router = Router()

// All routes require admin access
router.use(adminMiddleware)
