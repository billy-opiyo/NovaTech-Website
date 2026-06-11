const menuToggle = document.querySelector(".menu-toggle")
const navLinks = document.querySelector("#navLinks")
const searchInput = document.querySelector("#siteSearch")
const searchForm = document.querySelector(".nav-search")
const searchableCards = [...document.querySelectorAll(".searchable-card")]
const emptyState = document.querySelector("#emptyState")
const cartButtons = document.querySelectorAll(".add-cart")
const contactForm = document.querySelector("#contactForm")
const contactMessageStatus = document.querySelector("#contactMessageStatus")
const countdown = document.querySelector("#dealCountdown")
const copyrightYear = document.querySelector("#copyrightYear")
const backToTopButton = document.querySelector(".back-to-top")
const searchAnimationDuration = 320
const pendingSearchAnimations = new WeakMap()

function setMenuOpen(isOpen) {
	navLinks?.classList.toggle("open", isOpen)
	menuToggle?.classList.toggle("active", isOpen)
	menuToggle?.setAttribute("aria-expanded", String(isOpen))
}

function initRevealAnimations() {
	const revealSelectors = [
		".hero-content > *",
		".hero-showcase",
		".trust-card",
		".section-heading",
		".category-card",
		".product-card",
		".brand-cloud span",
		".testimonial-card",
		".contact-card",
		".footer-grid",
		".copyright",
	]
	const revealElements = [
		...new Set(document.querySelectorAll(revealSelectors.join(", "))),
	]

	if (!revealElements.length) return

	revealElements.forEach((element, index) => {
		element.classList.add("reveal-on-scroll")
		element.style.setProperty("--reveal-delay", `${Math.min(index % 8, 7) * 60}ms`)
	})

	if (!("IntersectionObserver" in window)) {
		revealElements.forEach((element) => element.classList.add("is-visible"))
		return
	}

	const revealObserver = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return

				entry.target.classList.add("is-visible")
				observer.unobserve(entry.target)
			})
		},
		{
			rootMargin: "0px 0px -12% 0px",
			threshold: 0.12,
		},
	)

	revealElements.forEach((element) => revealObserver.observe(element))
}

function toggleBackToTopButton() {
	if (!backToTopButton) return

	const shouldShow = window.scrollY > 0
	backToTopButton.classList.toggle("show", shouldShow)
	backToTopButton.setAttribute("aria-hidden", String(!shouldShow))
}

function setCardVisibility(card, isVisible) {
	const pendingAnimation = pendingSearchAnimations.get(card)

	if (pendingAnimation) {
		clearTimeout(pendingAnimation)
		pendingSearchAnimations.delete(card)
	}

	if (isVisible) {
		card.classList.remove("search-hidden")
		requestAnimationFrame(() => {
			card.classList.remove("search-hiding")
		})
		return
	}

	card.classList.add("search-hiding")
	const timeoutId = setTimeout(() => {
		card.classList.add("search-hidden")
		pendingSearchAnimations.delete(card)
	}, searchAnimationDuration)

	pendingSearchAnimations.set(card, timeoutId)
}

if (copyrightYear) {
	copyrightYear.textContent = new Date().getFullYear()
}

initRevealAnimations()

menuToggle?.addEventListener("click", () => {
	setMenuOpen(!navLinks?.classList.contains("open"))
})

navLinks?.addEventListener("click", (event) => {
	if (event.target.matches("a")) {
		setMenuOpen(false)
	}
})

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		setMenuOpen(false)
	}
})

window.addEventListener("resize", () => {
	if (window.innerWidth > 760) {
		setMenuOpen(false)
	}
})

backToTopButton?.setAttribute("aria-hidden", "true")
toggleBackToTopButton()

window.addEventListener("scroll", toggleBackToTopButton, { passive: true })

backToTopButton?.addEventListener("click", () => {
	const prefersReducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches

	window.scrollTo({
		top: 0,
		behavior: prefersReducedMotion ? "auto" : "smooth",
	})
})

function filterCards(searchTerm) {
	const query = searchTerm.trim().toLowerCase()
	let visibleProductCount = 0

	searchableCards.forEach((card) => {
		const searchableText =
			`${card.textContent} ${card.dataset.keywords || ""}`.toLowerCase()
		const isMatch = !query || searchableText.includes(query)
		setCardVisibility(card, isMatch)

		if (isMatch && card.closest("#trending")) {
			visibleProductCount += 1
		}
	})

	if (emptyState) {
		emptyState.hidden = !query || visibleProductCount > 0
	}
}

searchInput?.addEventListener("input", (event) => {
	filterCards(event.target.value)
})

searchForm?.addEventListener("submit", (event) => {
	event.preventDefault()
	const firstVisibleCard = searchableCards.find(
		(card) => !card.classList.contains("search-hidden"),
	)
	firstVisibleCard?.scrollIntoView({ behavior: "smooth", block: "center" })
})

cartButtons.forEach((button) => {
	button.addEventListener("click", () => {
		const originalText = button.textContent
		button.textContent = "Added ✓"
		button.classList.add("added")

		setTimeout(() => {
			button.textContent = originalText
			button.classList.remove("added")
		}, 1400)
	})
})

contactForm?.addEventListener("submit", (event) => {
	event.preventDefault()
	const name = document.querySelector("#contactName")

	if (contactMessageStatus) {
		contactMessageStatus.textContent = `Thanks, ${name.value}! Our team will contact you shortly.`
		contactMessageStatus.classList.remove("show")
		requestAnimationFrame(() => {
			contactMessageStatus.classList.add("show")
		})
	}

	contactForm.reset()
})

function startCountdown(durationInSeconds) {
	let remaining = durationInSeconds

	const updateCountdown = () => {
		const hours = String(Math.floor(remaining / 3600)).padStart(2, "0")
		const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")
		const seconds = String(remaining % 60).padStart(2, "0")

		if (countdown) {
			countdown.textContent = `${hours}:${minutes}:${seconds}`
		}

		remaining = remaining > 0 ? remaining - 1 : durationInSeconds
	}

	updateCountdown()
	setInterval(updateCountdown, 1000)
}

startCountdown(6 * 60 * 60)
