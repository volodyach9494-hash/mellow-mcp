import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutPromoPostTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_createPromoPosts",
		"Generate promotional social media posts for a position (async). Poll with scout_getPromoPosts for results.",
		{
			positionId: z.string().uuid().describe("Position UUID"),
		},
		async ({ positionId }) => {
			const result = await client.post(`/positions/${positionId}/promo-post`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getPromoPosts",
		"Get generated promotional posts for a position",
		{
			positionId: z.string().uuid().describe("Position UUID"),
		},
		async ({ positionId }) => {
			const result = await client.get(`/positions/${positionId}/promo-post`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
