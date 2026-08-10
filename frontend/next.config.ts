import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	reactStrictMode: true,
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
		typedRoutes: true,
	},
}

export default nextConfig
