import path from "path"
import NextConfig from "next"

const nextConfig = {
	reactStrictMode: true,
	devIndicators: false,
	outputFileTracingRoot: path.join(__dirname, ".."),
	serverExternalPackages: ["@prisma/client", "prisma"],
	webpack(config, { isServer }) {
		if (isServer) {
			config.externals = config.externals || []
			if (Array.isArray(config.externals)) {
				config.externals.push("@prisma/client", "prisma")
			}
		}
		return config
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "images.pexels.com",
			},
		],
	},
	async headers() {
		return [{
			source: "/(.*)",
			headers: [
				{ key: "X-Content-Type-Options", value: "nosniff" },
				{ key: "X-Frame-Options", value: "DENY" },
				{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
				{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
			],
		}]
	},
	experimental: {
		// typedRoutes: true, // Disabled due to Next.js 15 compatibility
	},
}

export default nextConfig
