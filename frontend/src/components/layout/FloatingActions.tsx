"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FaWhatsapp, FaArrowUp } from "react-icons/fa"
import { clientConfig, getWhatsAppHref } from "@/config/client.config"

export default function FloatingActions() {
	const [showToTop, setShowToTop] = useState(false)

	useEffect(() => {
		const handleScroll = () => {
			setShowToTop(window.scrollY > 320)
		}

		handleScroll()
		window.addEventListener("scroll", handleScroll, { passive: true })
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" })
	}

	return (
		<>
			{clientConfig.features.showWhatsAppButton && <Link
				href={getWhatsAppHref()}
				target="_blank"
				rel="noreferrer"
				aria-label="Chat on WhatsApp"
className="fixed bottom-16 left-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e8e3e] text-white shadow-lg shadow-[#1e8e3e]/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#1e8e3e]/30 focus:outline-none focus:ring-4 focus:ring-[#1e8e3e]/30 md:bottom-5 md:left-5"
			>
				<FaWhatsapp className="h-6 w-6" />
			</Link>}

			{showToTop && (
				<button
					onClick={scrollToTop}
					aria-label="Back to top"
					className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/30 sm:h-14 sm:w-14 md:bottom-6 md:right-6"
				>
					<FaArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
				</button>
			)}
		</>
	)
}
