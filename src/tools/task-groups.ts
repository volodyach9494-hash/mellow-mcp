import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerTaskGroupTools(server: McpServer, client: MellowClient) {
	server.tool(
		"listTaskGroups",
		"List all task groups",
		{},
		async () => {
			const result = await client.get("/customer/task-groups")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"createTaskGroup",
		"Create a new task group",
		{
			title: z.string().describe("Group title"),
		},
		async ({ title }) => {
			const result = await client.post("/customer/task-groups", { title })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"renameTaskGroup",
		"Rename an existing task group",
		{
			groupId: z.number().describe("Group ID to rename"),
			title: z.string().describe("New group title"),
		},
		async (params) => {
			const result = await client.put("/customer/task-groups", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"deleteTaskGroup",
		"Delete a task group",
		{
			groupId: z.number().describe("Group ID to delete"),
		},
		async ({ groupId }) => {
			const result = await client.del("/customer/task-groups", { groupId })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
