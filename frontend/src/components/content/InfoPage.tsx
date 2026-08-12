import Link from "next/link"

export interface InfoSection {
	title: string
	content: string
}

interface InfoPageProps {
	title: string
	description: string
	sections: InfoSection[]
}

export default function InfoPage({
	title,
	description,
	sections,
}: InfoPageProps) {
	return (
		<div className="mx-auto max-w-4xl py-8 sm:py-12">
			<div className="mb-10 text-center">
				<h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
				<p className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-400">
					{description}
				</p>
			</div>

			<div className="space-y-5">
				{sections.map((section) => (
					<section key={section.title} className="glass-card p-6 sm:p-8">
						<h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
						<p className="leading-7 text-gray-600 dark:text-gray-400">
							{section.content}
						</p>
					</section>
				))}
			</div>

			<div className="mt-8 text-center">
				<Link href="/contact" className="btn-primary inline-flex">
					Contact our team
				</Link>
			</div>
		</div>
	)
}
