// Gmail OAuth configuration
export const GMAIL_CONFIG = {
  clientId: "38736441433-87ile2jpf8cri88639f0tq43katj9mlm.apps.googleusercontent.com",
  scopes: "https://www.googleapis.com/auth/gmail.readonly",
  discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
};

export async function initGoogleAuth() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function getGmailToken() {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GMAIL_CONFIG.clientId,
      scope: GMAIL_CONFIG.scopes,
      callback: (response) => {
        if (response.error) reject(response);
        else resolve(response.access_token);
      },
    });
    client.requestAccessToken();
  });
}

export async function fetchGmailAlerts(accessToken) {
  const query = encodeURIComponent("from:googlealerts-noreply@google.com newer_than:30d");
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();
  if (!listData.messages) return [];

  const threads = [];
  for (const msg of listData.messages.slice(0, 20)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const msgData = await msgRes.json();
    const subject = msgData.payload?.headers?.find(h => h.name === "Subject")?.value || "";
    const date = msgData.payload?.headers?.find(h => h.name === "Date")?.value || "";
    const snippet = msgData.snippet || "";
    const parsedDate = new Date(date).toISOString().split("T")[0];
    threads.push({ id: msg.id, subject, date: parsedDate, snippet });
    await new Promise(r => setTimeout(r, 100));
  }
  return threads;
}
