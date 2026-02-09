export type MellowClient = ReturnType<typeof createMellowClient>

export function createMellowClient(baseUrl: string, accessToken: string) {
	async function request<T>(
		method: string,
		path: string,
		opts?: { body?: object; params?: Record<string, string | undefined> },
	): Promise<T> {
		const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
		const normalizedPath = path.startsWith("/") ? path : `/${path}`
		const url = new URL(`${base}${normalizedPath}`)

		if (opts?.params) {
			for (const [key, value] of Object.entries(opts.params)) {
				if (value !== undefined) {
					url.searchParams.set(key, value)
				}
			}
		}

		const headers: Record<string, string> = {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/json",
		}

		let requestBody: string | undefined
		if (opts?.body) {
			headers["Content-Type"] = "application/json"
			requestBody = JSON.stringify(opts.body)
		}

		const response = await fetch(url.toString(), {
			method,
			headers,
			body: requestBody,
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Mellow API ${method} ${path} failed (${response.status}): ${text}`)
		}

		const contentType = response.headers.get("content-type") ?? ""
		if (contentType.includes("application/json")) {
			return response.json() as Promise<T>
		}

		return response.text() as unknown as T
	}

	return {
		get: <T>(path: string, params?: Record<string, string | undefined>) =>
			request<T>("GET", path, { params }),
		post: <T>(path: string, body?: object) => request<T>("POST", path, { body }),
		put: <T>(path: string, body?: object) => request<T>("PUT", path, { body }),
		patch: <T>(path: string, body?: object) => request<T>("PATCH", path, { body }),
		del: <T>(path: string, body?: object) => request<T>("DELETE", path, { body }),
	}
}
