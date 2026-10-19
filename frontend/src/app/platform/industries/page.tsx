"use client"

import { useEffect, useState, type FormEvent } from "react"
import { asRecord, normalizeIndustries, normalizeThemes, type AttributeDefinition, type Industry, type Theme } from "@/lib/industry-admin-data"

const initialCategories = "[{\"name\":\"Products\",\"slug\":\"products\",\"description\":\"\",\"displayOrder\":1}]"
const initialAttributes = "[{\"name\":\"Material\",\"key\":\"material\",\"type\":\"TEXT\",\"required\":false,\"options\":[],\"displayOrder\":1}]"

export default function IndustriesPage() {
	const [industries, setIndustries] = useState<Industry[]>([])
	const [themes, setThemes] = useState<Theme[]>([])
	const [selectedId, setSelectedId] = useState("")
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [description, setDescription] = useState("")
	const [icon, setIcon] = useState("")
	const [editIndustryName, setEditIndustryName] = useState("")
	const [editIndustrySlug, setEditIndustrySlug] = useState("")
	const [editIndustryDescription, setEditIndustryDescription] = useState("")
	const [editIndustryIcon, setEditIndustryIcon] = useState("")
	const [homepagePresetJson, setHomepagePresetJson] = useState("{}")
	const [categoriesJson, setCategoriesJson] = useState(initialCategories)
	const [attributesJson, setAttributesJson] = useState(initialAttributes)
	const [themeName, setThemeName] = useState("")
	const [themeSlug, setThemeSlug] = useState("")
	const [editingThemeId, setEditingThemeId] = useState("")
	const [selectedThemeId, setSelectedThemeId] = useState("")
	const [themeIndustryId, setThemeIndustryId] = useState("")
	const [themeColors, setThemeColors] = useState('{"primary":"#2563eb","primaryDark":"#1d4ed8","accent":"#f97316","background":"#f8fafc","surface":"#ffffff","text":"#111827"}')
	const [themeTypography, setThemeTypography] = useState('{"body":"system","heading":"system"}')
	const [message, setMessage] = useState("")
	const [busy, setBusy] = useState(false)

	const selected = industries.find((industry) => industry.id === selectedId)
	const selectedTheme = themes.find((theme) => theme.id === selectedThemeId)
	useEffect(() => {
		if (!selected) return
		setEditIndustryName(selected.name)
		setEditIndustrySlug(selected.slug)
		setEditIndustryDescription(selected.description || "")
		setEditIndustryIcon(selected.icon || "")
		setHomepagePresetJson(JSON.stringify(selected.homepagePreset || {}, null, 2))
	}, [selectedId, industries])
	const reload = async () => {
		const [industryResponse, themeResponse] = await Promise.all([fetch("/api/platform/industries", { cache: "no-store" }), fetch("/api/platform/themes", { cache: "no-store" })])
		const [industryBody, themeBody] = await Promise.all([industryResponse.json().catch(() => null), themeResponse.json().catch(() => null)])
		const industryMessage = asRecord(industryBody).message
		const themeMessage = asRecord(themeBody).message
		if (!industryResponse.ok) throw new Error(typeof industryMessage === "string" ? industryMessage : "Industries are unavailable")
		if (!themeResponse.ok) throw new Error(typeof themeMessage === "string" ? themeMessage : "Themes are unavailable")
		const nextIndustries = normalizeIndustries(asRecord(industryBody).industries)
		const nextThemes = normalizeThemes(asRecord(themeBody).themes)
		setIndustries(nextIndustries)
		setThemes(nextThemes)
		if (!selectedId && nextIndustries[0]) setSelectedId(nextIndustries[0].id)
	}

	useEffect(() => { void reload().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load industry settings")) }, [])

	async function send(url: string, method: string, body?: unknown) {
		const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
		const result = asRecord(await response.json().catch(() => null))
		if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "The change could not be saved")
		return result
	}

	async function createIndustry(event: FormEvent) {
		event.preventDefault(); setBusy(true); setMessage("")
		try {
			const categoryTemplates = JSON.parse(categoriesJson) as unknown
			const attributeDefinitions = JSON.parse(attributesJson) as unknown
			const result = await send("/api/platform/industries", "POST", { name, slug, description, icon, categoryTemplates, attributeDefinitions, active: true })
			const createdIndustry = asRecord(result.industry)
			setMessage(`${typeof createdIndustry.name === "string" ? createdIndustry.name : name} created`); setName(""); setSlug(""); setDescription(""); setIcon(""); await reload()
			if (typeof createdIndustry.id === "string") setSelectedId(createdIndustry.id)
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to create industry") }
		finally { setBusy(false) }
	}

	async function toggleIndustry(industry: Industry) {
		setBusy(true)
		try { await send(`/api/platform/industries/${industry.id}`, "PATCH", { active: !industry.active }); setMessage(`${industry.name} ${industry.active ? "disabled" : "enabled"}`); await reload() }
		catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to update industry") }
		finally { setBusy(false) }
	}

	async function saveIndustry(event: FormEvent) {
		event.preventDefault(); if (!selected) return
		setBusy(true)
		try {
			const homepagePreset = JSON.parse(homepagePresetJson) as Record<string, unknown>
			await send(`/api/platform/industries/${selected.id}`, "PATCH", { name: editIndustryName, slug: editIndustrySlug, description: editIndustryDescription, icon: editIndustryIcon, homepagePreset })
			setMessage("Industry settings saved"); await reload()
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to save industry settings") }
		finally { setBusy(false) }
	}

	async function deleteIndustry(industry: Industry) {
		setBusy(true)
		try { await send(`/api/platform/industries/${industry.id}`, "DELETE"); setMessage(`${industry.name} deleted`); setSelectedId(""); await reload() }
		catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to delete industry") }
		finally { setBusy(false) }
	}

	async function addCategory(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); if (!selected) return
		const formElement = event.currentTarget
		const form = new FormData(formElement); setBusy(true)
		try {
			await send(`/api/platform/industries/${selected.id}/categories`, "POST", { name: String(form.get("categoryName")), slug: String(form.get("categorySlug")), description: String(form.get("categoryDescription") || ""), imageUrl: String(form.get("categoryImageUrl") || "").trim() || null, displayOrder: Number(form.get("categoryOrder") || 0) })
			setMessage("Category preset added"); await reload(); formElement.reset()
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to add category preset") }
		finally { setBusy(false) }
	}

	async function addAttribute(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); if (!selected) return
		const formElement = event.currentTarget
		const form = new FormData(formElement); const type = String(form.get("attributeType")); const options = String(form.get("attributeOptions") || "").split(",").map((item) => item.trim()).filter(Boolean); setBusy(true)
		try {
			await send(`/api/platform/industries/${selected.id}/attributes`, "POST", { name: String(form.get("attributeName")), key: String(form.get("attributeKey")), type, required: form.get("attributeRequired") === "on", options, displayOrder: Number(form.get("attributeOrder") || 0) })
			setMessage("Product attribute added"); await reload(); formElement.reset()
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to add product attribute") }
		finally { setBusy(false) }
	}

	async function setAttributeActive(definition: AttributeDefinition) {
		if (!selected) return
		setBusy(true)
		try { await send(`/api/platform/industries/${selected.id}/attributes/${definition.id}`, "PATCH", { active: !definition.active }); setMessage(`${definition.name} ${definition.active ? "disabled" : "enabled"}`); await reload() }
		catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to update attribute") }
		finally { setBusy(false) }
	}

	async function createTheme(event: FormEvent) {
		event.preventDefault(); setBusy(true)
		try {
			const colors = JSON.parse(themeColors) as Record<string, string>
			const typography = JSON.parse(themeTypography) as Record<string, string>
			await send(editingThemeId ? `/api/platform/themes/${editingThemeId}` : "/api/platform/themes", editingThemeId ? "PATCH" : "POST", { name: themeName, slug: themeSlug, industryId: themeIndustryId || null, colors, typography, active: true })
			setMessage(editingThemeId ? "Theme updated" : "Theme created"); setThemeName(""); setThemeSlug(""); setEditingThemeId(""); await reload()
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to create theme") }
		finally { setBusy(false) }
	}

	function editTheme(theme: Theme) {
		setEditingThemeId(theme.id); setThemeName(theme.name); setThemeSlug(theme.slug)
		setThemeIndustryId(theme.industryId || "")
		setThemeColors(JSON.stringify(theme.colors)); setThemeTypography(JSON.stringify(theme.typography))
	}

	async function setDefaultTheme(theme: Theme) {
		if (!themeIndustryId) { setMessage("Select an industry in the theme form first"); return }
		setBusy(true)
		try { await send(`/api/platform/industries/${themeIndustryId}`, "PATCH", { defaultThemeId: theme.id }); setMessage("Industry default theme updated"); await reload() }
		catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to assign default theme") }
		finally { setBusy(false) }
	}

	async function deleteTheme(theme: Theme) {
		setBusy(true)
		try { await send(`/api/platform/themes/${theme.id}`, "DELETE"); setMessage(`${theme.name} deleted`); await reload() }
		catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to delete theme") }
		finally { setBusy(false) }
	}

	async function setThemeActive(theme: Theme) {
		setBusy(true)
		try { await send(`/api/platform/themes/${theme.id}`, "PATCH", { active: !theme.active }); setMessage(`${theme.name} ${theme.active ? "disabled" : "enabled"}`); await reload() }
		catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to update theme") }
		finally { setBusy(false) }
	}

	const inputClass = "mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:bg-dark-surface"

	return <div className="space-y-8">
		<header><h2 className="text-3xl font-bold">Industries and themes</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Manage the presets merchants use when they create a store. Only active industries appear in onboarding; disabling one prevents new stores without changing existing stores.</p></header>
		{message && <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{message}</p>}
		{selected && <form onSubmit={saveIndustry} className="glass-card space-y-3 p-5"><h3 className="text-lg font-semibold">Edit {selected.name} and its homepage preset</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Name<input required value={editIndustryName} onChange={(event) => setEditIndustryName(event.target.value)} className={inputClass}/></label><label className="text-sm">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={editIndustrySlug} onChange={(event) => setEditIndustrySlug(event.target.value)} className={inputClass}/></label><label className="text-sm">Icon<input value={editIndustryIcon} onChange={(event) => setEditIndustryIcon(event.target.value)} className={inputClass}/></label><label className="text-sm">Description<input value={editIndustryDescription} onChange={(event) => setEditIndustryDescription(event.target.value)} className={inputClass}/></label></div><label className="block text-sm">Homepage configuration JSON<textarea value={homepagePresetJson} onChange={(event) => setHomepagePresetJson(event.target.value)} rows={6} className={`${inputClass} font-mono`}/></label><button disabled={busy} className="rounded-lg border px-3 py-2 text-sm">Save industry settings</button></form>}
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
			<section className="glass-card space-y-4 p-5"><h3 className="text-xl font-semibold">Industries</h3>{industries.map((industry) => <article key={industry.id} className={`rounded-xl border p-4 ${selectedId === industry.id ? "border-primary" : "border-gray-200 dark:border-white/10"}`}><button className="w-full text-left" onClick={() => setSelectedId(industry.id)}><span className="flex items-center justify-between gap-3"><span><strong>{industry.name}</strong><span className="ml-2 text-xs text-gray-500">{industry.slug}</span></span><span className={`text-xs ${industry.active ? "text-green-700" : "text-gray-500"}`}>{industry.active ? "Active" : "Disabled"}</span></span><span className="mt-2 block text-xs text-gray-500">{industry._count.stores} stores · {industry.categoryTemplates.length} category presets · {industry.attributeDefinitions.length} attributes</span></button><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void toggleIndustry(industry)} className="rounded border px-3 py-1.5 text-xs">{industry.active ? "Disable" : "Enable"}</button><button disabled={busy || industry._count.stores > 0} onClick={() => void deleteIndustry(industry)} className="rounded border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40">Delete</button></div></article>)}
				<form onSubmit={createIndustry} className="space-y-3 border-t pt-5"><h4 className="font-semibold">Create industry</h4><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Name<input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass}/></label><label className="text-sm">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} className={inputClass}/></label><label className="text-sm">Icon name<input value={icon} onChange={(event) => setIcon(event.target.value)} className={inputClass}/></label><label className="text-sm sm:col-span-2">Description<input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass}/></label></div><label className="block text-sm">Default categories JSON<textarea value={categoriesJson} onChange={(event) => setCategoriesJson(event.target.value)} rows={4} className={`${inputClass} font-mono`}/></label><label className="block text-sm">Default product attributes JSON<textarea value={attributesJson} onChange={(event) => setAttributesJson(event.target.value)} rows={4} className={`${inputClass} font-mono`}/></label><p className="text-xs text-gray-500">Each attribute uses a name, key, type (TEXT, NUMBER, BOOLEAN, DROPDOWN, MULTI_SELECT), required flag, options array, and displayOrder.</p><button disabled={busy} className="btn-primary rounded-lg px-4 py-2 text-sm">Create industry</button></form>
			</section>
			<section className="space-y-6">
				{selected && <div className="glass-card space-y-5 p-5"><div><h3 className="text-xl font-semibold">{selected.name} preset</h3><p className="text-sm text-gray-500">Changes here affect defaults for stores created in the future.</p></div><div><h4 className="mb-2 font-medium">Category presets</h4>{selected.categoryTemplates.map((category) => <div key={category.id} className="flex items-center justify-between border-b py-2 text-sm"><span>{category.name} <span className="text-xs text-gray-500">/{category.slug}</span></span><button disabled={busy} onClick={() => void send(`/api/platform/industries/${selected.id}/categories/${category.id}`, "PATCH", { active: !category.active }).then(() => reload())} className="text-xs text-primary">{category.active ? "Disable" : "Enable"}</button></div>)}<form onSubmit={addCategory} className="mt-3 grid gap-2 sm:grid-cols-2"><input required name="categoryName" placeholder="Category name" className={inputClass}/><input required name="categorySlug" placeholder="category-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputClass}/><input name="categoryDescription" placeholder="Description" className={inputClass}/><input name="categoryImageUrl" type="url" placeholder="Unsplash / image URL" className={inputClass}/><input name="categoryOrder" type="number" min="0" placeholder="Display order" className={inputClass}/><button disabled={busy} className="rounded-lg border px-3 py-2 text-sm sm:col-span-2">Add category preset</button></form></div><div><h4 className="mb-2 font-medium">Product attributes</h4>{selected.attributeDefinitions.map((definition) => <div key={definition.id} className="flex items-center justify-between border-b py-2 text-sm"><span>{definition.name} <span className="text-xs text-gray-500">{definition.type}{definition.required ? " · required" : ""}</span></span><button disabled={busy} onClick={() => void setAttributeActive(definition)} className="text-xs text-primary">{definition.active ? "Disable" : "Enable"}</button></div>)}<form onSubmit={addAttribute} className="mt-3 grid gap-2 sm:grid-cols-2"><input required name="attributeName" placeholder="Attribute name" className={inputClass}/><input required name="attributeKey" placeholder="attribute_key" pattern="[a-z][a-z0-9_]*" className={inputClass}/><select name="attributeType" className={inputClass}><option>TEXT</option><option>NUMBER</option><option>BOOLEAN</option><option>DROPDOWN</option><option>MULTI_SELECT</option></select><input name="attributeOptions" placeholder="Options, comma separated" className={inputClass}/><label className="inline-flex items-center gap-2 text-sm"><input name="attributeRequired" type="checkbox"/>Required</label><input name="attributeOrder" type="number" min="0" placeholder="Display order" className={inputClass}/><button disabled={busy} className="rounded-lg border px-3 py-2 text-sm sm:col-span-2">Add product attribute</button></form></div></div>}
				<div className="glass-card space-y-4 p-5"><h3 className="text-xl font-semibold">Themes</h3>{themes.map((theme) => <div key={theme.id} className="flex items-center justify-between border-b py-2 text-sm"><span>{theme.name} <span className="text-xs text-gray-500">{theme.slug}</span></span><button disabled={busy} onClick={() => void setThemeActive(theme)} className="text-xs text-primary">{theme.active ? "Disable" : "Enable"}</button></div>)}<form onSubmit={createTheme} className="space-y-3 border-t pt-4"><h4 className="font-semibold">Create theme</h4><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Name<input required value={themeName} onChange={(event) => setThemeName(event.target.value)} className={inputClass}/></label><label className="text-sm">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={themeSlug} onChange={(event) => setThemeSlug(event.target.value)} className={inputClass}/></label><label className="text-sm sm:col-span-2">Assign industry<select value={themeIndustryId} onChange={(event) => setThemeIndustryId(event.target.value)} className={inputClass}><option value="">Shared theme</option>{industries.map((industry) => <option key={industry.id} value={industry.id}>{industry.name}</option>)}</select></label></div><label className="block text-sm">Colors JSON<input value={themeColors} onChange={(event) => setThemeColors(event.target.value)} className={`${inputClass} font-mono`}/></label><label className="block text-sm">Typography JSON<input value={themeTypography} onChange={(event) => setThemeTypography(event.target.value)} className={`${inputClass} font-mono`}/></label><button disabled={busy} className="btn-primary rounded-lg px-4 py-2 text-sm">Create theme</button></form></div>
				<div className="glass-card space-y-3 p-5"><h3 className="font-semibold">Edit, assign, or delete a theme</h3><select value={selectedThemeId} onChange={(event) => setSelectedThemeId(event.target.value)} className={inputClass}><option value="">Select theme</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select><div className="flex flex-wrap gap-2"><button disabled={!selectedTheme || busy} onClick={() => selectedTheme && editTheme(selectedTheme)} className="rounded border px-3 py-2 text-sm">Load into editor</button><button disabled={!selectedTheme || busy} onClick={() => selectedTheme && void deleteTheme(selectedTheme)} className="rounded border border-red-300 px-3 py-2 text-sm text-red-700">Delete</button><button disabled={!selectedTheme || busy} onClick={() => selectedTheme && void setDefaultTheme(selectedTheme)} className="rounded border px-3 py-2 text-sm">Assign selected industry default</button></div></div>
			</section>
		</div>
	</div>
}
