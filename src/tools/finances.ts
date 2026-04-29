import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asStructuredList, type MellowClient } from "../mellow-client";

export function registerFinanceTools(server: McpServer, client: MellowClient) {
  server.tool(
    "listTransactions",
    "List financial transactions with optional filters",
    {
      page: z.number().optional().describe("Page number"),
      size: z.number().optional().describe("Page size"),
      dateFrom: z.string().optional().describe("Filter from date"),
      dateTo: z.string().optional().describe("Filter to date"),
    },
    { title: "List transactions", readOnlyHint: true },
    async (params) => {
      const result = await client.get<unknown>("/customer/transactions", {
        page: params.page?.toString(),
        size: params.size?.toString(),
        "filter[dateFrom]": params.dateFrom,
        "filter[dateTo]": params.dateTo,
      });
      return {
        structuredContent: asStructuredList(result),
        content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }],
      };
    },
  );
}
