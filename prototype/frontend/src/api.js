const API_BASE = "http://localhost:8000";

function buildHeaders(apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey?.trim()) {
    headers["X-Anthropic-API-Key"] = apiKey.trim();
  }
  return headers;
}

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

export async function generateMasterBrief(userInput, apiKey = null) {
  const response = await fetch(`${API_BASE}/api/generate-master-brief`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ user_input: userInput }),
  });
  return handleResponse(response);
}

export async function generateNaverBlogOutline(userInput, masterBrief, apiKey = null) {
  const response = await fetch(`${API_BASE}/api/generate-naver-blog-outline`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      user_input: userInput,
      master_brief: masterBrief,
    }),
  });
  return handleResponse(response);
}

export async function generateHomepageMagazineOutline(userInput, masterBrief, apiKey = null) {
  const response = await fetch(`${API_BASE}/api/generate-homepage-magazine-outline`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      user_input: userInput,
      master_brief: masterBrief,
    }),
  });
  return handleResponse(response);
}

export async function generateLinkedinOutline(userInput, masterBrief, apiKey = null) {
  const response = await fetch(`${API_BASE}/api/generate-linkedin-outline`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      user_input: userInput,
      master_brief: masterBrief,
    }),
  });
  return handleResponse(response);
}

export async function generateMetaSocialOutline(userInput, masterBrief, apiKey = null) {
  const response = await fetch(`${API_BASE}/api/generate-meta-social-outline`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      user_input: userInput,
      master_brief: masterBrief,
    }),
  });
  return handleResponse(response);
}
