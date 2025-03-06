export const apiRequest = async (
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
) => {
  // In browser environments, use import.meta.env instead of process.env
  const apiUrl = import.meta.env?.VITE_API_URL || ""; // Use empty string as base if not defined

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // Include cookies for authentication
    });

    // First check if response is ok (status in 200-299 range)
    if (!response.ok) {
      // Try to get error message from response
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json();
        throw new Error(error.message || `API request failed with status ${response.status}`);
      } else {
        // If not JSON, throw generic error with status
        throw new Error(`API request failed with status ${response.status}`);
      }
    }

    // Only try to parse JSON if we have a JSON content type
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return response;
  } catch (error) {
    console.error("API Request failed:", error);
    throw error;
  }
}