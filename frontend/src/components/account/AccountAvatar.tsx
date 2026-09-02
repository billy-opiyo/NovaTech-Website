"use client"

type AccountAvatarProps = {
	name?: string | null
	email?: string | null
	image?: string | null
	className?: string
}

export default function AccountAvatar({ name, email, image, className = "h-9 w-9" }: AccountAvatarProps) {
	const displayName = name?.trim() || email?.split("@")[0]?.trim() || "Account"
	const initial = displayName.charAt(0).toUpperCase()

	return image ? (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={image} alt={`${displayName} profile`} className={`${className} rounded-full object-cover`} referrerPolicy="no-referrer" />
	) : (
		<span aria-hidden="true" className={`${className} flex items-center justify-center rounded-full bg-primary text-sm font-bold text-white`}>
			{initial}
		</span>
	)
}
