import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerDocumentTools(server: McpServer, client: MellowClient) {
	server.tool(
		"listDocuments",
		"List all available documents",
		{
			page: z.number().optional().describe("Page number"),
			size: z.number().optional().describe("Page size"),
		},
		async (params) => {
			const result = await client.get("/customer/documents", {
				page: params.page?.toString(),
				size: params.size?.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"downloadDocument",
		"Download a specific document by ID",
		{
			documentId: z.number().describe("Document ID"),
		},
		async ({ documentId }) => {
			const result = await client.get(`/customer/documents/${documentId}/download`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
