// Shared TypeScript loader for the built-in Node test runner.
// Keeping this in the repository makes `npm test` work on Windows and Unix
// without requiring a shell-specific environment-variable syntax.
process.env.TS_NODE_TRANSPILE_ONLY = "true"
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
	module: "CommonJS",
	moduleResolution: "Node",
	esModuleInterop: true,
})
// Prisma validates the datasource URL while modules are imported. A dummy
// URL lets unit tests exercise no-database branches without opening a socket.
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/novatech_test"
require("ts-node/register")
