import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { asStructuredList, type MellowClient } from "../../mellow-client";

export function registerScoutCompanyTools(server: McpServer, client: MellowClient) {
  server.tool(
    "scout_listCompanies",
    "List all companies associated with the current user in AI Scout",
    {},
    { title: "Scout: list companies", readOnlyHint: true },
    async () => {
      const result = await client.get<unknown>("/companies");
      return {
        structuredContent: asStructuredList(result),
        content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }],
      };
    },
  );
}
