import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"

export default async function CookiePolicyPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome && store.platformSettings?.legal?.cookies) return <InfoPage title="Cookie Policy" description="A clear explanation of the browser storage used by Nurava HubStores." sections={[{ title: "Current platform cookie policy", content: store.platformSettings.legal.cookies }]} />
	if (!store.isPlatformHome && store.legal?.cookies) return <InfoPage title={`${store.brand.name} Cookie Policy`} description={`A clear explanation of the browser storage used by ${store.brand.name}.`} sections={[{ title: "Current store cookie policy", content: store.legal.cookies }]} />
	return <InfoPage title="Cookie Policy" description={`A clear explanation of the small files and browser storage used by ${store.isPlatformHome ? "Nurava HubStores" : store.brand.name}.`} sections={[
		{ title: "What cookies do", content: "Cookies and similar browser storage help us keep the store reliable, remember your theme preference, keep shopping sessions working, and understand which pages need improvement." },
		{ title: "Essential storage", content: "Some storage is required for core features such as authentication, your shopping cart, security controls, and saved display preferences. These features may not work correctly if essential storage is blocked." },
		{ title: "Managing cookies", content: "You can clear or block cookies through your browser settings. Blocking optional storage will not prevent you from contacting us, but may affect convenience features and saved preferences." },
	]} />
}
