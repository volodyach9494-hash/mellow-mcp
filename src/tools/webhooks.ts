import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerWebhookTools(server: McpServer, client: MellowClient) {
	server.tool(
		"getWebhook",
		"Get the current webhook configuration",
		{},
		async () => {
			const result = await client.get("/webhooks")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"createOrUpdateWebhook",
		"Create or update a webhook configuration",
		{
			url: z.string().describe("Webhook URL to receive events"),
			events: z
				.array(z.string())
				.describe("List of event types to subscribe to"),
		},
		async (params) => {
			const result = await client.post("/webhooks", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"deleteWebhook",
		"Delete a webhook",
		{
			webhookId: z.number().describe("Webhook ID to delete"),
		},
		async ({ webhookId }) => {
			const result = await client.del(`/webhooks/${webhookId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
