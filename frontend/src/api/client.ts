const API_URL = import.meta.env.VITE_API_URL;

const getCsrfToken = (): string | null => {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrf_token="));

    return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
};

interface ApiOptions extends RequestInit {
    skipRefresh?: boolean;
}

export const api = async <T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> => {
    const { skipRefresh, ...fetchOptions } = options;
    const method = fetchOptions.method?.toUpperCase() ?? "GET";
    const headers = new Headers(fetchOptions.headers);

    if (fetchOptions.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            headers.set("X-CSRF-Token", csrfToken);
        }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: "include",
    });

    if (
        response.status === 401 &&
        !skipRefresh &&
        endpoint !== "/auth/refresh" &&
        endpoint !== "/auth/login" &&
        endpoint !== "/auth/register" &&
        endpoint !== "/auth/me"
    ) {
        try {
            await api("/auth/refresh", {
                method: "POST",
                skipRefresh: true,
            });

            return await api<T>(endpoint, {
                ...options,
                skipRefresh: true,
            });
        } catch {
            throw new Error("Session expired");
        }
    }

    if (!response.ok) {
        let message = `Request failed with status ${response.status}`;

        try {
            const data = await response.json();

            if (data?.detail) {
                if (Array.isArray(data.detail)) {
                    message = data.detail
                        .map((err: { msg?: string }) => err.msg || "Invalid input")
                        .join(", ");
                } else if (typeof data.detail === "string") {
                    message = data.detail;
                } else {
                    message = JSON.stringify(data.detail);
                }
            } else if (data?.message) {
                message = data.message;
            }
        } catch {

        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
};