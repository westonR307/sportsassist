export const apiRequest = async (
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
) => {
  const apiUrl = import.meta.env?.VITE_API_URL || "";

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json();
        if (response.status >= 500) {
          throw new Error(`Server error: ${error.message || response.statusText}`);
        } else if (response.status >= 400) {
          throw new Error(`Client error: ${error.message || response.statusText}`);
        }
      } else {
        throw new Error(`API request failed with status ${response.status}`);
      }
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return response;
  } catch (error) {
    console.error("API Request failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("NetworkError")) {
        throw new Error("Network error: Please check your internet connection.");
      } else {
        throw new Error(`API request failed: ${error.message}`);
      }
    } else {
      throw new Error("API request failed with an unknown error");
    }
  }
}
