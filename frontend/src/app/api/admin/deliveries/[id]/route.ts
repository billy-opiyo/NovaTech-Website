import { NextRequest } from "next/server"
import { updateOrderStatus } from "backend/controllers/orderController"
import { withApiError } from "backend/lib/api-handler"
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) { return withApiError(updateOrderStatus, req, { params: context.params }) }
