import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MellowClient } from "../mellow-client";

export function registerProfileTools(server: McpServer, client: MellowClient) {
  server.tool(
    "getUserProfile",
    "Get the current user's profile information",
    {},
    { title: "Get user profile", readOnlyHint: true },
    async () => {
      const result = await client.get<unknown>("/profile");
      return {
        structuredContent: result as { [key: string]: unknown },
        content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }],
      };
    },
  );
}
