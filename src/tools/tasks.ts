import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../mellow-client"

export function registerTaskTools(server: McpServer, client: MellowClient) {
	server.tool(
		"listTasks",
		"Search and retrieve tasks with filters (pagination, date ranges, price, state, etc.)",
		{
			search: z.string().optional().describe("Search task title/description"),
			workerId: z.number().optional().describe("Filter by worker ID"),
			creatorId: z.number().optional().describe("Filter by creator ID"),
			companyId: z.number().optional().describe("Filter by company ID"),
			state: z
				.array(z.number())
				.optional()
				.describe("Filter by task states (array of state IDs)"),
			groupId: z.number().optional().describe("Filter by task group ID"),
			currencyId: z.number().optional().describe("Filter by currency ID"),
			dateCreatedFrom: z
				.string()
				.optional()
				.describe("Filter tasks created from date (YYYY-MM-DD)"),
			dateCreatedTo: z
				.string()
				.optional()
				.describe("Filter tasks created to date (YYYY-MM-DD)"),
			dateEndFrom: z.string().optional().describe("Filter by end date from"),
			dateEndTo: z.string().optional().describe("Filter by end date to"),
			dateFinishedFrom: z.string().optional().describe("Filter by finished date from"),
			dateFinishedTo: z.string().optional().describe("Filter by finished date to"),
			dateAcceptedFrom: z.string().optional().describe("Filter by accepted date from"),
			dateAcceptedTo: z.string().optional().describe("Filter by accepted date to"),
			datePaidFrom: z.string().optional().describe("Filter by paid date from"),
			datePaidTo: z.string().optional().describe("Filter by paid date to"),
			priceFrom: z.number().optional().describe("Minimum price filter"),
			priceTo: z.number().optional().describe("Maximum price filter"),
			hasPayout: z.boolean().optional().describe("Filter by payout existence"),
			hasCopyright: z.boolean().optional().describe("Filter by copyright flag"),
			hasReport: z.boolean().optional().describe("Filter by report flag"),
			deadlineType: z.number().optional().describe("Filter by deadline type"),
			workerTaxationStatus: z
				.number()
				.optional()
				.describe("Filter by worker taxation status"),
			externalId: z.string().optional().describe("Filter by external ID"),
			payedBy: z.number().optional().describe("Filter by payer ID"),
			sort: z
				.enum(["date_end", "date_finished", "price"])
				.optional()
				.describe("Sort field"),
			direction: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
			page: z.number().optional().describe("Page number"),
			size: z.number().max(500).optional().describe("Page size (max 500)"),
		},
		async (params) => {
			const queryParams: Record<string, string | undefined> = {
				"filter[search]": params.search,
				"filter[workerId]": params.workerId?.toString(),
				"filter[creatorId]": params.creatorId?.toString(),
				"filter[companyId]": params.companyId?.toString(),
				"filter[groupId]": params.groupId?.toString(),
				"filter[currencyId]": params.currencyId?.toString(),
				"filter[dateCreatedFrom]": params.dateCreatedFrom,
				"filter[dateCreatedTo]": params.dateCreatedTo,
				"filter[dateEndFrom]": params.dateEndFrom,
				"filter[dateEndTo]": params.dateEndTo,
				"filter[dateFinishedFrom]": params.dateFinishedFrom,
				"filter[dateFinishedTo]": params.dateFinishedTo,
				"filter[dateAcceptedFrom]": params.dateAcceptedFrom,
				"filter[dateAcceptedTo]": params.dateAcceptedTo,
				"filter[datePaidFrom]": params.datePaidFrom,
				"filter[datePaidTo]": params.datePaidTo,
				"filter[priceFrom]": params.priceFrom?.toString(),
				"filter[priceTo]": params.priceTo?.toString(),
				"filter[hasPayout]": params.hasPayout?.toString(),
				"filter[hasCopyright]": params.hasCopyright?.toString(),
				"filter[hasReport]": params.hasReport?.toString(),
				"filter[deadlineType]": params.deadlineType?.toString(),
				"filter[workerTaxationStatus]": params.workerTaxationStatus?.toString(),
				"filter[externalId]": params.externalId,
				"filter[payedBy]": params.payedBy?.toString(),
				sort: params.sort,
				direction: params.direction,
				page: params.page?.toString(),
				size: params.size?.toString(),
			}

			// Handle state array - needs multiple filter[state][] params
			if (params.state?.length) {
				for (const s of params.state) {
					queryParams[`filter[state][]`] = s.toString()
				}
			}

			const result = await client.get("/customer/tasks", queryParams)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getTask",
		"Get detailed information about a specific task by ID or UUID",
		{
			taskId: z
				.string()
				.describe("Task ID (numeric) or UUID string"),
		},
		async ({ taskId }) => {
			const result = await client.get(`/customer/tasks/${taskId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"createTask",
		"Create a new task for a freelancer",
		{
			title: z.string().describe("Task title"),
			description: z.string().describe("Task description"),
			workerId: z.number().describe("Freelancer worker ID"),
			categoryId: z.number().describe("Task category ID"),
			price: z.number().describe("Task price"),
			deadline: z
				.string()
				.describe("Task deadline (format: 2022-05-19 11:53:03)"),
			uuid: z.string().optional().describe("Optional UUID for the task"),
			attributes: z
				.array(z.object({ id: z.number(), value: z.string() }))
				.optional()
				.describe("Task attributes (id + value pairs)"),
			copyright: z.boolean().optional().describe("Whether copyright transfer is required"),
			needReport: z.boolean().optional().describe("Whether a report is needed"),
			fileIds: z.array(z.number()).optional().describe("Attached file IDs"),
			externalId: z.string().optional().describe("External reference ID"),
			workerCurrency: z
				.string()
				.optional()
				.describe("Currency code for worker payment"),
			shareCommission: z.boolean().optional().describe("Share commission with worker"),
			validateOnly: z
				.boolean()
				.optional()
				.describe("Only validate without creating"),
			acceptanceFileIds: z
				.array(z.number())
				.optional()
				.describe("Acceptance document file IDs"),
			editGroup: z.array(z.number()).optional().describe("Edit group IDs"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"publishDraftTask",
		"Publish a draft task to make it active",
		{
			taskId: z.number().optional().describe("Task ID"),
			uuid: z.string().optional().describe("Task UUID"),
			companyId: z.number().describe("Company ID to publish under"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/publish-draft", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getAllowedCurrencies",
		"Get allowed currencies for multicurrency tasks",
		{
			companyId: z.number().describe("Company ID"),
		},
		async ({ companyId }) => {
			const result = await client.get("/customer/tasks/allowed-currencies", {
				companyId: companyId.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"calculateTotalCost",
		"Calculate total cost for a task including commissions and exchange rates",
		{
			uuid: z.string().describe("Task UUID"),
			price: z.number().describe("Task price"),
			workerCurrency: z.string().describe("Worker currency code"),
			shareCommission: z.boolean().describe("Whether to share commission"),
			workerId: z.number().describe("Worker ID"),
			categoryId: z.number().describe("Category ID"),
			companyId: z.number().describe("Company ID"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/total-cost", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"changeTaskStatus",
		"Change a task's status (start, complete, decline, confirm rejection)",
		{
			taskId: z.string().describe("Task ID or UUID"),
			state: z
				.number()
				.describe("New state: 2=start, 3=complete, 6=decline, 8=confirm rejection"),
		},
		async ({ taskId, state }) => {
			const result = await client.put(`/customer/tasks/${taskId}`, { state })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"changeDeadline",
		"Extend or change a task's deadline",
		{
			taskId: z.number().optional().describe("Task ID"),
			uuid: z.string().optional().describe("Task UUID"),
			deadline: z
				.string()
				.describe("New deadline (ISO 8601 format)"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/prolong-deadline", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"checkTaskRequirements",
		"Check if a freelancer meets task requirements before starting",
		{
			taskUuid: z.string().describe("Task UUID"),
			freelancerUuid: z.string().describe("Freelancer UUID"),
		},
		async ({ taskUuid, freelancerUuid }) => {
			const result = await client.get(
				"/customer/freelancers/check-task-requirements",
				{ taskUuid, freelancerUuid },
			)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"acceptTask",
		"Accept a completed task",
		{
			taskId: z.number().optional().describe("Task ID"),
			uuid: z.string().optional().describe("Task UUID"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/accept", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"payForTask",
		"Pay for a task that is in Pending payment status",
		{
			taskId: z.number().optional().describe("Task ID"),
			uuid: z.string().optional().describe("Task UUID"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/pay", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"quickPayTask",
		"Pay for a task immediately upon creation",
		{
			taskId: z.number().optional().describe("Task ID"),
			uuid: z.string().optional().describe("Task UUID"),
			companyId: z.number().optional().describe("Company ID"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/quick-pay", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"declineTask",
		"Decline/reject a task",
		{
			taskId: z.number().describe("Task ID to decline"),
		},
		async ({ taskId }) => {
			const result = await client.post("/customer/tasks/decline", { taskId })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"resumeTask",
		"Resume a task and return it to work status",
		{
			taskId: z.number().describe("Task ID to resume"),
		},
		async ({ taskId }) => {
			const result = await client.post("/customer/tasks/return-to-work", { taskId })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"getTaskMessages",
		"Get all messages for a specific task",
		{
			taskId: z.number().describe("Task ID"),
		},
		async ({ taskId }) => {
			const result = await client.get(`/tasks/${taskId}/messages`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"addTaskMessage",
		"Add a message to a task",
		{
			taskId: z.number().describe("Task ID"),
			message: z.string().describe("Message text"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/messages", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"addTaskFiles",
		"Add files to a task",
		{
			taskId: z.number().optional().describe("Task ID"),
			uuid: z.string().optional().describe("Task UUID"),
			file: z.string().describe("File path"),
			type: z
				.number()
				.optional()
				.describe("File type (e.g. 5 = transfer of rights)"),
		},
		async (params) => {
			const result = await client.post("/customer/tasks/files", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
