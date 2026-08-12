import path from "path"
import NextConfig from "next"

const nextConfig = {
	reactStrictMode: true,
	devIndicators: false,
	outputFileTracingRoot: path.join(__dirname, ".."),
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
	experimental: {
		// typedRoutes: true, // Disabled due to Next.js 15 compatibility
	},
}

export default nextConfig
