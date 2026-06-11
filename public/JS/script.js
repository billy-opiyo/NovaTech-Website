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

menuToggle?.addEventListener("click", () => {
	const isOpen = navLinks.classList.toggle("open")
	menuToggle.setAttribute("aria-expanded", String(isOpen))
})

navLinks?.addEventListener("click", (event) => {
	if (event.target.matches("a")) {
		navLinks.classList.remove("open")
		menuToggle?.setAttribute("aria-expanded", "false")
	}
})

function filterCards(searchTerm) {
	const query = searchTerm.trim().toLowerCase()
	let visibleProductCount = 0

	searchableCards.forEach((card) => {
		const searchableText =
			`${card.textContent} ${card.dataset.keywords || ""}`.toLowerCase()
		const isMatch = !query || searchableText.includes(query)
		card.classList.toggle("search-hidden", !isMatch)

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
