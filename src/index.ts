import OAuthProvider from "@cloudflare/workers-oauth-provider"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpAgent } from "agents/mcp"
import { createMellowClient } from "./mellow-client"
import { MellowHandler } from "./mellow-handler"
import { registerCompanyTools } from "./tools/companies"
import { registerDocumentTools } from "./tools/documents"
import { registerFinanceTools } from "./tools/finances"
import { registerFreelancerTools } from "./tools/freelancers"
import { registerProfileTools } from "./tools/profile"
import { registerReferenceTools } from "./tools/reference"
import { registerTaskGroupTools } from "./tools/task-groups"
import { registerTaskTools } from "./tools/tasks"
import { registerWebhookTools } from "./tools/webhooks"

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
	sub: string
	name: string
	email: string
	accessToken: string
}

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({
		name: "Mellow MCP Server",
		version: "1.0.0",
	})

	async init() {
		try {
			const client = createMellowClient(
				this.env.MELLOW_API_BASE_URL,
				this.props!.accessToken,
			)

			registerTaskTools(this.server, client)
			registerTaskGroupTools(this.server, client)
			registerFreelancerTools(this.server, client)
			registerFinanceTools(this.server, client)
			registerCompanyTools(this.server, client)
			registerDocumentTools(this.server, client)
			registerReferenceTools(this.server, client)
			registerWebhookTools(this.server, client)
			registerProfileTools(this.server, client)
		} catch (error) {
			console.error("MCP init failed:", error)
			throw error
		}
	}
}

export default new OAuthProvider({
	apiHandler: MyMCP.serve("/mcp"),
	apiRoute: "/mcp",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: MellowHandler as any,
	tokenEndpoint: "/token",
})
