const path = require("path")

/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "placehold.co" },
			{ protocol: "https", hostname: "your-r2-bucket.example.com" },
		],
	},
	transpilePackages: ["backend"], // allow frontend to import from backend workspace
	outputFileTracingRoot: path.join(__dirname, ".."),
}

module.exports = nextConfig
