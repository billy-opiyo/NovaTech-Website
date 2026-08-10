"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FaWhatsapp, FaArrowUp } from "react-icons/fa"

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
			<Link
				href="https://wa.me/254700000000?text=Hello%20NovaTech%20Store%2C%20I%20need%20help%20with%20my%20order."
				target="_blank"
				rel="noreferrer"
				aria-label="Chat on WhatsApp"
				className="fixed bottom-20 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#25D366]/40 focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:h-14 sm:w-14 md:bottom-6 md:left-6"
			>
				<FaWhatsapp className="h-5 w-5 sm:h-6 sm:w-6" />
			</Link>

			{showToTop && (
				<button
					type="button"
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
