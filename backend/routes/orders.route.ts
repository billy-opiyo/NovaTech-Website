import { Router } from "express"
import * as orderController from "../controllers/order.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/orders - List user's orders
router.get("/", orderController.getOrders)

// GET /api/orders/stats - Get order statistics (admin only)
router.get("/stats", authorize("ADMIN", "SUPERADMIN"), orderController.getOrderStats)

// GET /api/orders/all - List all orders (admin only)
router.get("/all", authorize("ADMIN", "SUPERADMIN"), orderController.getAllOrders)

// GET /api/orders/:id - Get single order
router.get("/:id", orderController.getOrder)

// POST /api/orders - Create order
router.post("/", orderController.createOrder)

// PATCH /api/orders/:id - Update order status (admin only)
router.patch("/:id", authorize("ADMIN", "SUPERADMIN"), orderController.updateOrder)

export default router