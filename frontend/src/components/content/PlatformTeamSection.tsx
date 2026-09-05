"use client"

import Link from "next/link"
import { FaGithub, FaInstagram, FaLinkedinIn, FaTwitter } from "react-icons/fa"
import { useStoreContext } from "@/lib/store-context"

const socialLinks = [
	{ key: "linkedin", label: "LinkedIn", icon: FaLinkedinIn },
	{ key: "instagram", label: "Instagram", icon: FaInstagram },
	{ key: "x", label: "X", icon: FaTwitter },
	{ key: "github", label: "GitHub", icon: FaGithub },
] as const

function initials(name: string) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NT"
}

export default function PlatformTeamSection() {
	const store = useStoreContext()
	if (!store.isPlatformHome || !store.platformTeam.length) return null

	return (
		<section aria-labelledby="team-heading">
			<div className="mb-8 text-center">
				<p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">The people behind the platform</p>
				<h2 id="team-heading" className="mt-2 text-3xl font-bold sm:text-4xl">Meet our team</h2>
				<p className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-400">Meet the people helping Nurava Tech make store discovery and merchant growth simpler.</p>
			</div>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
				{store.platformTeam.map((member) => (
					<article key={member.id} className="glass-card flex h-full flex-col items-center p-6 text-center">
						<div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-primary/10 text-2xl font-bold text-primary">
							{member.image ? <img src={member.image} alt={`${member.name} profile`} className="h-full w-full object-cover" /> : initials(member.name)}
						</div>
						<h3 className="mt-5 text-xl font-semibold">{member.name}</h3>
						<p className="mt-1 font-medium text-primary">{member.role}</p>
						<p className="mt-4 flex-1 leading-7 text-gray-600 dark:text-gray-400">{member.bio}</p>
						<div className="mt-5 flex items-center justify-center gap-3">
							{socialLinks.map(({ key, label, icon: Icon }) => {
								const href = member.social?.[key]
								return href ? <Link key={key} href={href} target="_blank" rel="noreferrer" aria-label={`${member.name} on ${label}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 text-primary transition hover:bg-primary hover:text-white"><Icon size={16} /></Link> : null
							})}
						</div>
					</article>
				))}
			</div>
		</section>
	)
}
