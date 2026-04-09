import { env } from "cloudflare:workers"
import OAuthProvider from "@cloudflare/workers-oauth-provider"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpAgent } from "agents/mcp"
import { createMellowClient } from "./mellow-client"
import { MellowHandler } from "./mellow-handler"
import { registerChatGptTools } from "./tools/chatgpt"
import { registerCompanyTools } from "./tools/companies"
import { registerDocumentTools } from "./tools/documents"
import { registerFinanceTools } from "./tools/finances"
import { registerFreelancerTools } from "./tools/freelancers"
import { registerProfileTools } from "./tools/profile"
import { registerReferenceTools } from "./tools/reference"
import { registerTaskGroupTools } from "./tools/task-groups"
import { registerTaskTools } from "./tools/tasks"
import { registerWebhookTools } from "./tools/webhooks"
import { refreshUpstreamToken, type Props } from "./utils"

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
			registerChatGptTools(this.server, client)
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
	refreshTokenTTL: 2592000, // 30 days
	async tokenExchangeCallback({ grantType, props }) {
		if (grantType !== "refresh_token" || !props.refreshToken) {
			return
		}

		const refreshed = await refreshUpstreamToken({
			client_id: env.MELLOW_CLIENT_ID,
			client_secret: env.MELLOW_CLIENT_SECRET,
			refresh_token: props.refreshToken,
			upstream_url: `${env.MELLOW_BASE_URL}/token`,
		})

		if (!refreshed) {
			return
		}

		return {
			newProps: {
				...props,
				accessToken: refreshed.accessToken,
				refreshToken: refreshed.refreshToken ?? props.refreshToken,
			},
		}
	},
})
