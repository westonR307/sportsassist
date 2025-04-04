/**
 * Helper function to make API requests with proper error handling
 * @param url - The API endpoint URL
 * @param options - Request options (method, body, etc.)
 * @returns Promise with the response data
 */
export const apiRequest = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Prepare request with JSON body if needed
  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  // Convert body to JSON string if it's an object
  if (options.body && typeof options.body === 'object') {
    requestOptions.body = JSON.stringify(options.body);
  }

  // Make the request
  const response = await fetch(url, requestOptions);

  // Handle non-successful responses
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // If error response is not valid JSON, use the status text
      console.error('Error parsing error response:', e);
    }
    
    const error = new Error(errorMessage);
    throw error;
  }

  // Return JSON response if there is content, otherwise return empty object
  if (response.status !== 204) {
    return await response.json();
  }
  
  return {} as T;
};