import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerFinanceTools(server: McpServer, client: MellowClient) {
	server.tool(
		"createPayout",
		"Create a payout for a task",
		{
			taskId: z.number().optional().describe("Task ID"),
			uuid: z.string().optional().describe("Task UUID"),
			paymentMethodId: z.number().optional().describe("Payment method ID"),
		},
		async (params) => {
			const result = await client.post("/customer/payouts", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getPayoutStatus",
		"Get payout status for a specific task",
		{
			taskId: z.string().describe("Task ID or UUID"),
		},
		async ({ taskId }) => {
			const result = await client.get(`/customer/payouts/task/${taskId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"listTransactions",
		"List financial transactions with optional filters",
		{
			page: z.number().optional().describe("Page number"),
			size: z.number().optional().describe("Page size"),
			dateFrom: z.string().optional().describe("Filter from date"),
			dateTo: z.string().optional().describe("Filter to date"),
		},
		async (params) => {
			const result = await client.get("/customer/transactions", {
				page: params.page?.toString(),
				size: params.size?.toString(),
				"filter[dateFrom]": params.dateFrom,
				"filter[dateTo]": params.dateTo,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getPaymentMethods",
		"Get payment methods for a specific freelancer",
		{
			freelancerId: z.number().describe("Freelancer ID"),
		},
		async ({ freelancerId }) => {
			const result = await client.get("/customer/freelancers/payout-endpoints", {
				freelancerId: freelancerId.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"addBankCard",
		"Add a bank card as a payment method for a freelancer",
		{
			freelancerId: z.number().describe("Freelancer ID"),
			cardNumber: z.string().describe("Card number"),
			code: z.string().optional().describe("Verification code"),
		},
		async (params) => {
			const result = await client.post("/customer/payment-methods/card", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"addBankAccount",
		"Add a bank account as a payment method for a freelancer",
		{
			freelancerId: z.number().describe("Freelancer ID"),
			accountNumber: z.string().optional().describe("Account number / IBAN"),
			bic: z.string().optional().describe("BIC/SWIFT code"),
			bankName: z.string().optional().describe("Bank name"),
			code: z.string().optional().describe("Verification code"),
		},
		async (params) => {
			const result = await client.post(
				"/customer/payment-methods/bank-account",
				params,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"addEWallet",
		"Add an e-wallet as a payment method for a freelancer",
		{
			freelancerId: z.number().describe("Freelancer ID"),
			walletNumber: z.string().optional().describe("Wallet number/address"),
			walletType: z.string().optional().describe("Wallet type"),
			code: z.string().optional().describe("Verification code"),
		},
		async (params) => {
			const result = await client.post("/customer/payment-methods/ewallet", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"deleteBankCard",
		"Delete a bank card payment method",
		{
			methodId: z.number().describe("Payment method ID"),
		},
		async ({ methodId }) => {
			const result = await client.del(`/customer/payment-methods/card/${methodId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"deleteBankAccount",
		"Delete a bank account payment method",
		{
			methodId: z.number().describe("Payment method ID"),
		},
		async ({ methodId }) => {
			const result = await client.del(
				`/customer/payment-methods/bank-account/${methodId}`,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"deleteEWallet",
		"Delete an e-wallet payment method",
		{
			methodId: z.number().describe("Payment method ID"),
		},
		async ({ methodId }) => {
			const result = await client.del(
				`/customer/payment-methods/ewallet/${methodId}`,
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"requestPaymentMethodCode",
		"Request a verification code for adding a payment method",
		{
			freelancerId: z.number().describe("Freelancer ID"),
		},
		async ({ freelancerId }) => {
			const result = await client.post(
				"/customer/payment-methods/request-code",
				{ freelancerId },
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
