export const apiRequest = async (
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  retries = 3 // Add retries parameter with default value
) => {
  const apiUrl = import.meta.env?.VITE_API_URL || "";
  console.log(`Making ${method} request to ${path}`);

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // Always include credentials
      cache: "no-cache" // Prevent caching of authenticated requests
    });

    // Log response details for debugging
    console.log(`Response status for ${path}:`, response.status);
    console.log(`Response headers for ${path}:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = `Request failed with status ${response.status}`;

      if (contentType?.includes("application/json")) {
        const error = await response.json();
        console.error(`API error response for ${path}:`, error);

        if (response.status === 401) {
          errorMessage = "Session expired. Please log in again.";
          // Trigger a page reload to reset the app state
          window.location.href = "/auth";
          return null;
        } else if (response.status >= 500) {
          errorMessage = `Server error: ${error.message || response.statusText}`;
        } else if (response.status >= 400) {
          errorMessage = `Request error: ${error.message || response.statusText}`;
        }
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = await response.json();
      console.log(`API response data for ${path}:`, data);
      return data;
    }

    return response;
  } catch (error) {
    console.error(`API Request to ${path} failed:`, {
      error,
      requestBody: body ? JSON.stringify(body) : undefined,
      method,
      path
    });

    if (error instanceof Error) {
      if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
        if (retries > 0) {
          console.warn(`Retrying request to ${path} (${retries} retries left)`);
          return apiRequest(method, path, body, retries - 1);
        } else {
          throw new Error("Network error: Please check your internet connection.");
        }
      } else {
        throw error;
      }
    } else {
      throw new Error("An unexpected error occurred");
    }
  }
};