import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerFreelancerTools(server: McpServer, client: MellowClient) {
	server.tool(
		"listFreelancers",
		"List freelancers with optional filters",
		{
			taxationStatusId: z.number().optional().describe("Filter by taxation status ID"),
			isVerified: z.boolean().optional().describe("Filter by verification status"),
			isInviteEmailSent: z
				.boolean()
				.optional()
				.describe("Filter by invite email sent status"),
			dateInvitedFrom: z.string().optional().describe("Filter by invite date from"),
			dateInvitedTo: z.string().optional().describe("Filter by invite date to"),
			page: z.number().optional().describe("Page number"),
			size: z.number().max(500).optional().describe("Page size (max 500)"),
		},
		async (params) => {
			const result = await client.get("/customer/freelancers", {
				"filter[taxationStatusId]": params.taxationStatusId?.toString(),
				"filter[isVerified]": params.isVerified?.toString(),
				"filter[isInviteEmailSent]": params.isInviteEmailSent?.toString(),
				"filter[dateInvitedFrom]": params.dateInvitedFrom,
				"filter[dateInvitedTo]": params.dateInvitedTo,
				page: params.page?.toString(),
				size: params.size?.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getFreelancer",
		"Get detailed information about a specific freelancer",
		{
			freelancerId: z
				.string()
				.describe("Freelancer ID (numeric) or UUID"),
		},
		async ({ freelancerId }) => {
			const result = await client.get(`/customer/freelancers/${freelancerId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"inviteFreelancer",
		"Invite a new freelancer to join the team",
		{
			email: z.string().describe("Freelancer email address"),
			phone: z.string().optional().describe("Phone number"),
			firstName: z.string().optional().describe("First name"),
			lastName: z.string().optional().describe("Last name"),
			middleName: z.string().optional().describe("Middle name"),
			citizenship: z.string().optional().describe("Citizenship country code"),
			address: z.string().optional().describe("Address"),
			postalCode: z.string().optional().describe("Postal code"),
			city: z.string().optional().describe("City"),
			state: z.string().optional().describe("State/region"),
			country: z.string().optional().describe("Country code"),
			birthdate: z.string().optional().describe("Birth date"),
			birthCountry: z.string().optional().describe("Birth country code"),
			specialization: z.number().optional().describe("Specialization ID"),
			note: z.string().optional().describe("Note about the freelancer"),
			inEnglish: z
				.boolean()
				.optional()
				.describe("Send invitation in English"),
			sendEmail: z
				.boolean()
				.optional()
				.describe("Whether to send invitation email"),
		},
		async (params) => {
			const result = await client.post("/customer/freelancers", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"findFreelancerByEmail",
		"Find a freelancer by their email address",
		{
			email: z.string().describe("Email address to search"),
		},
		async ({ email }) => {
			const result = await client.get(
				`/customer/freelancer-by-email/${encodeURIComponent(email)}`,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"findFreelancerByPhone",
		"Find a freelancer by their phone number",
		{
			phone: z.string().describe("Phone number to search"),
		},
		async ({ phone }) => {
			const result = await client.get(
				`/customer/freelancer-by-phone/${encodeURIComponent(phone)}`,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"editFreelancer",
		"Edit freelancer information (name, note, specialization)",
		{
			freelancerId: z.number().describe("Freelancer ID"),
			firstName: z.string().optional().describe("First name"),
			lastName: z.string().optional().describe("Last name"),
			note: z.string().optional().describe("Note"),
			specialization: z.string().optional().describe("Specialization"),
			freelancerUuid: z.string().optional().describe("Freelancer UUID"),
			companyId: z.number().optional().describe("Company ID"),
		},
		async (params) => {
			const result = await client.put("/customer/freelancers", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"editFreelancerProfile",
		"Edit profile of an unregistered freelancer",
		{
			freelancerId: z.number().optional().describe("Freelancer ID"),
			freelancerUuid: z.string().optional().describe("Freelancer UUID"),
			firstName: z.string().optional().describe("First name"),
			lastName: z.string().optional().describe("Last name"),
			middleName: z.string().optional().describe("Middle name"),
			residenceCountry: z.string().optional().describe("Residence country code"),
			citizenship: z.string().optional().describe("Citizenship country code"),
			birthDate: z.string().optional().describe("Birth date (ISO 8601)"),
			birthCountry: z.string().optional().describe("Birth country code"),
			city: z.string().optional().describe("City"),
			address: z.string().optional().describe("Address"),
			postalCode: z.string().optional().describe("Postal code"),
			state: z.string().optional().describe("State/region"),
			language: z
				.enum(["EN", "RU"])
				.optional()
				.describe("Language preference"),
		},
		async (params) => {
			const result = await client.patch("/customer/freelancers/profile", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"requestContactChangeCode",
		"Request a verification code to change freelancer contact details",
		{
			freelancerId: z.number().describe("Freelancer ID"),
			email: z.string().optional().describe("New email address"),
			phone: z.string().optional().describe("New phone number"),
		},
		async (params) => {
			const result = await client.post(
				"/customer/freelancers/request-code-for-change-contacts",
				params,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"confirmContactChange",
		"Confirm contact details change with verification code",
		{
			freelancerId: z.number().describe("Freelancer ID"),
			code: z.string().describe("Verification code"),
		},
		async (params) => {
			const result = await client.post(
				"/customer/freelancers/change-contacts",
				params,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getVerificationLink",
		"Generate a verification link for a freelancer",
		{
			freelancerId: z.number().describe("Freelancer ID"),
			redirectUrl: z.string().optional().describe("Redirect URL after verification"),
		},
		async ({ freelancerId, redirectUrl }) => {
			const result = await client.get("/customer/freelancers/verification-link", {
				freelancerId: freelancerId.toString(),
				redirectUrl,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"removeFreelancer",
		"Remove a freelancer from the team",
		{
			freelancerId: z.number().describe("Freelancer ID to remove"),
		},
		async ({ freelancerId }) => {
			const result = await client.del(`/customer/freelancers/${freelancerId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"acceptOfferAgreement",
		"Accept an offer agreement on behalf of a freelancer",
		{
			freelancerId: z.number().optional().describe("Freelancer ID"),
			freelancerUuid: z.string().optional().describe("Freelancer UUID"),
			templateUuid: z.string().optional().describe("Template UUID"),
		},
		async (params) => {
			const result = await client.post(
				"/customer/freelancers/accept-offer",
				params,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getFreelancerTaxInfo",
		"Get tax information for a freelancer",
		{
			freelancerId: z.number().describe("Freelancer ID"),
		},
		async ({ freelancerId }) => {
			const result = await client.get(`/customer/freelancers/tax-info/${freelancerId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"addTaxpayerId",
		"Add a taxpayer ID number for a freelancer",
		{
			freelancerId: z.string().optional().describe("Freelancer ID"),
			freelancerUuid: z.string().optional().describe("Freelancer UUID"),
			taxResidenceCountry: z.string().describe("Tax residence country code"),
			type: z.string().describe("Tax ID type"),
			taxNumber: z.string().describe("Tax number"),
			vatNumber: z.string().optional().describe("VAT number"),
			regNumber: z.string().optional().describe("Registration number"),
		},
		async (params) => {
			const result = await client.post("/customer/freelancers/tax-info", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"linkTaxNumber",
		"Link a Russian tax number (INN) to a freelancer",
		{
			freelancerId: z.number().optional().describe("Freelancer ID"),
			freelancerUuid: z.string().optional().describe("Freelancer UUID"),
			taxNumber: z
				.number()
				.describe("Russian tax number (INN, 10 or 12 digits)"),
		},
		async (params) => {
			const result = await client.post(
				"/customer/freelancers/tax-info/link-tax-number",
				params,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"changeTaxationStatus",
		"Change a freelancer's taxation status",
		{
			freelancerId: z.number().optional().describe("Freelancer ID"),
			freelancerUuid: z.string().optional().describe("Freelancer UUID"),
			taxationStatusId: z
				.number()
				.describe("Taxation status: 1=individual, 3=self-employed, 4=entrepreneur"),
		},
		async (params) => {
			const result = await client.post(
				"/customer/freelancers/change-taxation-status",
				params,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
