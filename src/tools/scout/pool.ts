import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutPoolTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_getPool",
		"Get the current user's private freelancer pool",
		{},
		async () => {
			const result = await client.get("/private-pools/")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_listPoolFreelancers",
		"List freelancers in a private pool with search, pagination and sorting",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			search: z.string().optional().describe("Search by name, email, or expertise area"),
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortField: z.string().optional().describe("Sort field (default: createdAt)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async ({ poolId, ...params }) => {
			const result = await client.get(`/private-pools/${poolId}/freelancers/`, {
				search: params.search,
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: params.sortField,
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getPoolFreelancer",
		"Get details of a specific freelancer in a pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			freelancerId: z.string().uuid().describe("Freelancer UUID"),
		},
		async ({ poolId, freelancerId }) => {
			const result = await client.get(`/private-pools/${poolId}/freelancers/${freelancerId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_createPoolFreelancer",
		"Add a freelancer to a private pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			firstName: z.string().describe("First name"),
			lastName: z.string().describe("Last name"),
			email: z.string().email().describe("Email address"),
			expertiseArea: z.string().describe("Area of expertise"),
			experienceYears: z.number().min(0).describe("Years of experience (increments of 0.5)"),
			cvFileId: z.string().uuid().optional().describe("Uploaded CV attachment UUID"),
			notes: z.string().max(5000).optional().describe("Notes about the freelancer"),
			portfolioLinks: z.array(z.string().url()).max(4).optional().describe("Portfolio URLs (max 4)"),
			residenceCountry: z.string().optional().describe("ISO country code"),
		},
		async ({ poolId, ...body }) => {
			const result = await client.post(`/private-pools/${poolId}/freelancers/`, body)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_editPoolFreelancer",
		"Edit a freelancer in a private pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			freelancerId: z.string().uuid().describe("Freelancer UUID"),
			firstName: z.string().describe("First name"),
			lastName: z.string().describe("Last name"),
			email: z.string().email().describe("Email address"),
			expertiseArea: z.string().describe("Area of expertise"),
			experienceYears: z.number().min(0).describe("Years of experience (increments of 0.5)"),
			cvFileId: z.string().uuid().optional().describe("Uploaded CV attachment UUID"),
			notes: z.string().max(5000).optional().describe("Notes about the freelancer"),
			portfolioLinks: z.array(z.string().url()).max(4).optional().describe("Portfolio URLs (max 4)"),
			residenceCountry: z.string().optional().describe("ISO country code"),
		},
		async ({ poolId, freelancerId, ...body }) => {
			const result = await client.put(`/private-pools/${poolId}/freelancers/${freelancerId}`, body)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_deletePoolFreelancer",
		"Remove a freelancer from a private pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			freelancerId: z.string().uuid().describe("Freelancer UUID"),
		},
		async ({ poolId, freelancerId }) => {
			const result = await client.del(`/private-pools/${poolId}/freelancers/${freelancerId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_deletePoolFreelancersBatch",
		"Remove multiple freelancers from a private pool at once",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			ids: z.array(z.string().uuid()).describe("Array of freelancer UUIDs to delete"),
		},
		async ({ poolId, ids }) => {
			const result = await client.del(`/private-pools/${poolId}/freelancers/`, { ids })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
