import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutApplicationTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_listApplications",
		"List all applications across all positions with pagination",
		{
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async (params) => {
			const result = await client.get("/applications", {
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: "createdAt",
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_listPositionApplications",
		"List applications for a specific position",
		{
			positionId: z.string().uuid().describe("Position UUID"),
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async ({ positionId, ...params }) => {
			const result = await client.get(`/positions/${positionId}/applications`, {
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: "createdAt",
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getApplication",
		"Get details of a specific application",
		{
			id: z.string().uuid().describe("Application UUID"),
			trackStatus: z.boolean().optional().describe("If true, changes status to IN_REVIEW"),
		},
		async ({ id, trackStatus }) => {
			const result = await client.get(`/applications/${id}`, {
				trackStatus: trackStatus?.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_changeApplicationStatus",
		"Change the status of an application (in_review, short_list, rejected, accepted)",
		{
			id: z.string().uuid().describe("Application UUID"),
			status: z.enum(["new", "in_review", "short_list", "rejected"]).describe("New application status"),
		},
		async ({ id, status }) => {
			const result = await client.patch(`/applications/${id}/status`, { status })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_inviteApplicant",
		"Send an invitation to an applicant",
		{
			id: z.string().uuid().describe("Application UUID"),
		},
		async ({ id }) => {
			const result = await client.post(`/applications/${id}/invite`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
