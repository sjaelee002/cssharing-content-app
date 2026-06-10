const API_BASE = "http://localhost:8000";

async function handleResponse(response) {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data.detail) {
        message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
  return response.json();
}

export async function getApiKeyStatus() {
  const response = await fetch(`${API_BASE}/api/settings/api-key`);
  return handleResponse(response);
}

export async function setApiKey(apiKey) {
  const response = await fetch(`${API_BASE}/api/settings/api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return handleResponse(response);
}

export async function generateOutline(userInput) {
  const response = await fetch(`${API_BASE}/api/generate-outline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_input: userInput }),
  });
  return handleResponse(response);
}
