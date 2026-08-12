import { NextRequest } from "next/server"
import { updateOrderStatus } from "backend/controllers/orderController"
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) { return updateOrderStatus(req, { params: context.params }) }
