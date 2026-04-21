import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { MellowClient } from "../mellow-client"

export function registerProfileTools(server: McpServer, client: MellowClient) {
	server.tool(
		"getUserProfile",
		"Get the current user's profile information",
		{},
		async () => {
			const result = await client.get("/profile")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
