import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutQuizTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_createQuizAnswer",
		"Submit an answer to a quiz associated with an AI task",
		{
			aiTaskId: z.string().uuid().describe("AI task UUID"),
			answer: z.number().describe("Quiz answer option (integer enum value)"),
		},
		async (params) => {
			const result = await client.post("/quiz/answers", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_linkQuizAnswerWithPosition",
		"Link a quiz answer to a position",
		{
			quizAnswerId: z.string().uuid().describe("Quiz answer UUID"),
			positionId: z.string().uuid().describe("Position UUID"),
		},
		async (params) => {
			const result = await client.post("/quiz/answers/link-with-position", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getQuizSettings",
		"Get quiz settings for the current user",
		{},
		async () => {
			const result = await client.get("/quiz/settings")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_disableQuiz",
		"Disable quiz for the current user",
		{},
		async () => {
			const result = await client.post("/quiz/settings/disable")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
