import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerReferenceTools(server: McpServer, client: MellowClient) {
	server.tool(
		"getCurrencies",
		"Get list of available currencies",
		{},
		async () => {
			const result = await client.get("/lookups/currencies")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getExchangeRate",
		"Get currency exchange/conversion rate",
		async () => {
			const result = await client.get("/exchanges")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getTaxStatuses",
		"Get list of available tax statuses",
		{},
		async () => {
			const result = await client.get("/lookups/taxation-statuses");
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getServices",
		"Get list of services and works",
		{},
		async () => {
			const result = await client.get("/customer/lookups/services")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getTaskAttributes",
		"Get list of task attributes with their types and options",
		{},
		async () => {
			const result = await client.get("/customer/lookups/service-attributes");
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getAcceptanceDocuments",
		"Get list of additional documents for task acceptance",
		{},
		async () => {
			const result = await client.get("/customer/lookups/acceptance-files")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getTaxDocumentTypes",
		"Get list of tax document types",
		{},
		async () => {
			const result = await client.get("/customer/freelancers/get-tax-document-types")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getSpecializations",
		"Get list of freelancer specializations",
		{},
		async () => {
			const result = await client.get("/lookups/specializations")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getCountries",
		"Get list of country codes",
		{},
		async () => {
			const result = await client.get("/lookups/countries")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
