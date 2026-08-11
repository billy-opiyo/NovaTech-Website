import prisma from "../lib/db"

export type ActionResult = {
	ok: boolean
	action: string
	message: string
	createdAt: string
	metadata?: Record<string, unknown>
}

export async function createActionRecord(
	action: string,
	metadata?: Record<string, unknown>,
): Promise<ActionResult> {
	// Persist to AdminLog table
	try {
		await prisma.adminLog.create({
			data: {
				adminId: (metadata?.adminId as string) || "unknown",
				action,
				details: metadata as any,
			},
		})
	} catch (error) {
		console.error("Failed to record admin action:", error)
	}

	return {
		ok: true,
		action,
		message: `${action} recorded successfully.`,
		createdAt: new Date().toISOString(),
		metadata,
	}
}

export async function queueBackgroundTask(
	taskName: string,
	payload?: Record<string, unknown>,
): Promise<ActionResult> {
	// Simple in-memory queue — in a real deployment this would use
	// a job queue like BullMQ, RabbitMQ, or Cloud Tasks.
	// For now we just log and execute lightweight tasks immediately.
	console.log(`[Background Task] Queueing: ${taskName}`, payload || {})

	// Execute lightweight notification tasks immediately
	try {
		if (taskName === "send-email" && payload?.emailData) {
			const { sendEmail } = await import("../lib/email")
			const emailData = payload.emailData as {
				to: string
				subject: string
				html: string
			}
			await sendEmail(emailData)
		} else if (taskName === "send-sms" && payload?.smsData) {
			const { sendSmsMessage } = await import("../lib/sms")
			const smsData = payload.smsData as { to: string; message: string }
			await sendSmsMessage(smsData)
		} else if (taskName === "send-whatsapp" && payload?.whatsappData) {
			const { sendWhatsAppMessage } = await import("../lib/whatsapp")
			const whatsappData = payload.whatsappData as {
				to: string
				message: string
			}
			await sendWhatsAppMessage(whatsappData)
		}
	} catch (error) {
		console.error(`Background task ${taskName} failed:`, error)
	}

	return {
		ok: true,
		action: "queue_background_task",
		message: `${taskName} queued for background processing.`,
		createdAt: new Date().toISOString(),
		metadata: {
			taskName,
			payload,
		},
	}
}