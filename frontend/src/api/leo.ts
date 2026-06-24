// LEO AI API client. All requests go through the public backend URL with /api prefix.
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  preview: string;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type SendMessageResponse = {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  session: ChatSession;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const leoApi = {
  health: () => http<{ ok: boolean }>("/"),
  createSession: (title?: string) =>
    http<ChatSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({ title: title ?? null }),
    }),
  listSessions: () => http<ChatSession[]>("/sessions"),
  deleteSession: (id: string) =>
    http<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" }),
  getMessages: (id: string) => http<ChatMessage[]>(`/sessions/${id}/messages`),
  sendMessage: (id: string, content: string) =>
    http<SendMessageResponse>(`/sessions/${id}/chat`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
