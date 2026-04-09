import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutAttachmentTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_getAttachmentMetadata",
		"Get metadata for an uploaded attachment (file name, type, size)",
		{
			id: z.string().uuid().describe("Attachment UUID"),
		},
		async ({ id }) => {
			const result = await client.get(`/attachments/${id}/metadata`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
