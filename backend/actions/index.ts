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
