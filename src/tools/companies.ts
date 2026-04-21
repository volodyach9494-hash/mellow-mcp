import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerCompanyTools(server: McpServer, client: MellowClient) {
	server.tool(
		"listCompanies",
		"List all companies associated with the current user",
		{},
		async () => {
			const result = await client.get("/customer/companies")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"switchCompany",
		"Switch the active company context",
		{
			companyId: z.number().describe("Company ID to switch to"),
		},
		async ({ companyId }) => {
			const result = await client.put(`/user/company/${companyId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getCompanyBalance",
		"Get the balance of the currently active company",
		{},
		async () => {
			const result = await client.get("/customer/balance")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
