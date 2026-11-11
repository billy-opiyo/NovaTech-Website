"use client"

import { useEffect, useId, useRef } from "react"
import { Loader2 } from "lucide-react"

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
	const dialogId = useId()

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
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={`${dialogId}-title`}
				aria-describedby={`${dialogId}-description`}
				className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl"
			>
				<h2 id={`${dialogId}-title`} className="text-theme-text text-xl font-bold">{title}</h2>
				<p id={`${dialogId}-description`} className="text-theme-muted mt-3 text-sm leading-6">{description}</p>
				<div className="mt-6 flex justify-end gap-3">
					<button type="button" ref={cancelRef} onClick={onCancel} disabled={busy} className="rounded-lg border border-[rgb(var(--color-theme-border))] px-4 py-2 font-semibold transition hover:border-primary hover:text-primary disabled:opacity-50">
						{cancelLabel}
					</button>
					<button type="button" onClick={onConfirm} disabled={busy} aria-busy={busy} className="destructive-action inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">
						{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
						{busy ? "Working…" : confirmLabel}
					</button>
				</div>
			</div>
		</div>
	)
}
