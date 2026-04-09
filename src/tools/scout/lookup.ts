import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutLookupTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_getCountries",
		"Get list of available countries with codes",
		{},
		async () => {
			const result = await client.get("/lookup/countries")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getShortLink",
		"Get a short link by reference type and ID",
		{
			referenceType: z.string().describe("Reference type (e.g. POSITION)"),
			referenceId: z.string().uuid().describe("Reference UUID"),
		},
		async ({ referenceType, referenceId }) => {
			const result = await client.get("/short-link/", {
				referenceType,
				referenceId,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
