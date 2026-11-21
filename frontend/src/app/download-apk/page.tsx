import { Smartphone, ShieldCheck, Settings, Download, CheckCircle2 } from "lucide-react"

const steps = [
	{ icon: Download, title: "Download the APK", text: "Tap Download Android App in the footer and wait for the APK download to finish." },
	{ icon: Settings, title: "Allow this source", text: "Open the downloaded APK. If Android asks for permission, choose Settings and enable Allow from this source for the browser or file manager you used." },
	{ icon: Smartphone, title: "Install the app", text: "Return to the installer, review the prompt, and tap Install. Open Nurava HubStores after installation." },
	{ icon: ShieldCheck, title: "Turn the permission off", text: "For extra security, return to the same Install unknown apps setting and turn off Allow from this source when installation is complete." },
]

export default function DownloadApkGuidePage() {
	return <article className="mx-auto max-w-4xl space-y-8 py-5 sm:py-10">
		<header className="glass-card p-6 sm:p-9">
			<p className="text-sm font-semibold uppercase tracking-wide text-primary">Android app guide</p>
			<h1 className="mt-2 text-3xl font-extrabold text-theme-text sm:text-4xl">How to download APK App</h1>
			<p className="mt-4 max-w-2xl leading-7 text-theme-muted">Install the Nurava HubStores Android app downloaded from this website. Android may ask you to allow installs from the app that downloaded the file; you can switch that permission off again after installing.</p>
		</header>
		<ol className="grid gap-4 sm:grid-cols-2">
			{steps.map(({ icon: Icon, title, text }, index) => <li key={title} className="glass-card flex gap-4 p-5 sm:p-6">
				<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={21} aria-hidden="true" /></span>
				<div><p className="text-xs font-bold uppercase tracking-wide text-primary">Step {index + 1}</p><h2 className="mt-1 text-lg font-bold text-theme-text">{title}</h2><p className="mt-2 text-sm leading-6 text-theme-muted">{text}</p></div>
			</li>)}
		</ol>
		<section className="glass-card p-6 sm:p-8">
			<h2 className="flex items-center gap-2 text-xl font-bold text-theme-text"><CheckCircle2 size={20} className="text-primary" /> Android settings tips</h2>
			<ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-theme-muted">
				<li>On recent Android versions, permission is granted separately to the browser or file manager that opens the APK.</li>
				<li>If the download does not open automatically, find it in your browser downloads or the Files app and tap it there.</li>
				<li>Only install an APK you intentionally downloaded from the official Nurava HubStores website. Android displays the app and permission details before installation.</li>
			</ul>
		</section>
	</article>
}
