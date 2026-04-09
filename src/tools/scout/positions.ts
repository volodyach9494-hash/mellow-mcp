import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutPositionTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_listPositions",
		"List hiring positions with pagination and sorting",
		{
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async (params) => {
			const result = await client.get("/positions", {
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: "createdAt",
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getPosition",
		"Get a position by UUID or short code",
		{
			id: z.string().describe("Position UUID or 8-character short code"),
			trackView: z.boolean().optional().describe("Whether to track this as a view"),
		},
		async ({ id, trackView }) => {
			const result = await client.get(`/positions/${id}`, {
				trackView: trackView?.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_createPosition",
		"Create a new hiring position",
		{
			title: z.string().describe("Position title"),
			description: z.string().describe("Position description"),
			company: z.object({
				id: z.string().uuid().optional().describe("Existing company UUID"),
				name: z.string().describe("Company name"),
				website: z.string().url().describe("Company website URL"),
			}).describe("Company details"),
			workModel: z.enum(["remote", "onsite"]).describe("Work model"),
			projectDuration: z.enum(["longTerm", "shortTerm"]).describe("Project duration"),
			isBudgetNegotiable: z.boolean().describe("Whether budget is negotiable"),
			projectType: z.enum(["ongoing", "one-time"]).describe("Project type"),
			workload: z.string().describe("Workload. For ongoing: under_20_hrs_per_week, between_20_30_hrs_per_week, over_30_hrs_per_week. For one-time: few_days, one_two_weeks, more_two_weeks"),
			experienceLevel: z.number().min(1).max(4).describe("Experience level: 1=junior, 2=middle, 3=senior, 4=top-tier"),
			skills: z.array(z.string()).min(1).max(20).describe("Required skills (1-20 unique strings)"),
			location: z.string().optional().describe("Location (required if onsite)"),
			paymentType: z.enum(["hourly", "monthly", "fixed"]).optional().describe("Payment type (required if budget not negotiable)"),
			currency: z.enum(["eur", "usd"]).optional().describe("Currency (required if budget not negotiable)"),
			budgetFrom: z.number().optional().describe("Budget lower bound"),
			budgetTo: z.number().optional().describe("Budget upper bound"),
			budget: z.number().optional().describe("Exact budget amount"),
			aiTaskId: z.string().uuid().optional().describe("AI generation task ID that created this position"),
		},
		async (params) => {
			const result = await client.post("/positions", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_updatePosition",
		"Update an existing position",
		{
			id: z.string().uuid().describe("Position UUID"),
			title: z.string().describe("Position title"),
			description: z.string().describe("Position description"),
			company: z.object({
				id: z.string().uuid().optional().describe("Existing company UUID"),
				name: z.string().describe("Company name"),
				website: z.string().url().describe("Company website URL"),
			}).describe("Company details"),
			workModel: z.enum(["remote", "onsite"]).describe("Work model"),
			projectDuration: z.enum(["longTerm", "shortTerm"]).describe("Project duration"),
			isBudgetNegotiable: z.boolean().describe("Whether budget is negotiable"),
			projectType: z.enum(["ongoing", "one-time"]).describe("Project type"),
			workload: z.string().describe("Workload. For ongoing: under_20_hrs_per_week, between_20_30_hrs_per_week, over_30_hrs_per_week. For one-time: few_days, one_two_weeks, more_two_weeks"),
			experienceLevel: z.number().min(1).max(4).describe("Experience level: 1=junior, 2=middle, 3=senior, 4=top-tier"),
			skills: z.array(z.string()).min(1).max(20).describe("Required skills (1-20 unique strings)"),
			location: z.string().optional().describe("Location (required if onsite)"),
			paymentType: z.enum(["hourly", "monthly", "fixed"]).optional().describe("Payment type"),
			currency: z.enum(["eur", "usd"]).optional().describe("Currency"),
			budgetFrom: z.number().optional().describe("Budget lower bound"),
			budgetTo: z.number().optional().describe("Budget upper bound"),
			budget: z.number().optional().describe("Exact budget amount"),
		},
		async ({ id, ...body }) => {
			const result = await client.put(`/positions/${id}`, body)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_closePosition",
		"Close a position so it no longer accepts applications",
		{
			id: z.string().uuid().describe("Position UUID"),
		},
		async ({ id }) => {
			const result = await client.del(`/positions/${id}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_openPosition",
		"Reopen a previously closed position",
		{
			id: z.string().uuid().describe("Position UUID"),
		},
		async ({ id }) => {
			const result = await client.post(`/positions/${id}/open`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_sharePosition",
		"Share a position on social networks",
		{
			id: z.string().uuid().describe("Position UUID"),
			shareTarget: z.string().describe("Social network target to share on"),
		},
		async ({ id, shareTarget }) => {
			const result = await client.post(`/positions/${id}/share`, { shareTarget })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
