"use client"

import { useEffect, useRef } from "react"

type ConfirmDialogProps = {
	open: boolean
	title: string
	description: string
	confirmLabel?: string
	cancelLabel?: string
	busy?: boolean
	onConfirm: () => void
	onCancel: () => void
}

export default function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	busy = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const cancelRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (!open) return
		cancelRef.current?.focus()
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !busy) onCancel()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [busy, onCancel, open])

	if (!open) return null

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="confirm-dialog-title"
				className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-dark-surface"
			>
				<h2 id="confirm-dialog-title" className="text-xl font-bold">{title}</h2>
				<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</p>
				<div className="mt-6 flex justify-end gap-3">
					<button type="button" ref={cancelRef} onClick={onCancel} disabled={busy} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">
						{cancelLabel}
					</button>
					<button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
						{busy ? "Working…" : confirmLabel}
					</button>
				</div>
			</div>
		</div>
	)
}
