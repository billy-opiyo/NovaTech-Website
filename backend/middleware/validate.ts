import { NextRequest, NextResponse } from "next/server"
import { ZodSchema } from "zod"

export function validateBody<T>(
	schema: ZodSchema<T>,
	handler: (req: NextRequest, data: T) => Promise<NextResponse>,
) {
	return async (req: NextRequest) => {
		try {
			const json = await req.json()
			const parsed = schema.parse(json)
			return handler(req, parsed)
		} catch (error: any) {
			return NextResponse.json(
				{ message: "Validation error", details: error.errors || error.message },
				{ status: 400 },
			)
		}
	}
}
