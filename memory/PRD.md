# LEO AI — Product Requirements

## Summary
LEO AI is a calm, thoughtful AI chat companion for mobile (Expo + React Native).
The user did not provide explicit requirements; reasonable defaults were used to
build a complete MVP: a multi-turn chat assistant powered by Claude Sonnet 4.5
via the Emergent LLM key.

## Core features (shipped)
- **Welcome screen** — time-of-day greeting, 5 starter prompt chips, bottom input,
  routes to a new chat session on submit.
- **Chat screen** — full multi-turn conversation with Claude Sonnet 4.5, optimistic
  user message rendering, typing indicator while waiting for response, persistent
  message history per session, error fallback if the model is unreachable.
- **History screen** — lists every session grouped by TODAY / YESTERDAY / EARLIER,
  pull-to-refresh, tap-to-resume, swipe-free delete button per row, empty state
  with "Start a conversation" CTA.
- **Settings screen** — brand card, about, and "Clear all conversations" action.

## Tech & data
- Frontend: Expo Router, React Native, react-native-keyboard-controller,
  SafeAreaProvider, @expo/vector-icons.
- Backend: FastAPI + Motor (MongoDB).
  - Collections: `sessions`, `messages` (UUIDs as IDs, `_id` excluded in responses).
  - Multi-turn context is reconstructed by replaying the full prior transcript
    inside the system prompt for each request (LlmChat instances are stateless
    across HTTP calls).
- LLM: `anthropic / claude-sonnet-4-5-20250929` via `emergentintegrations`.
- Design: earthy light palette (#FDFBF7 bg, #C86A51 terracotta primary, #7E947A
  sage), system serif headings, generous spacing, botanical background tint.

## Routes
- `GET  /api/` — health
- `POST /api/sessions` — create session
- `GET  /api/sessions` — list sessions
- `DELETE /api/sessions/{id}` — delete session + its messages
- `GET  /api/sessions/{id}/messages` — list messages
- `POST /api/sessions/{id}/chat` — send user message, get Claude reply

## Out of scope (for now)
- Auth (no accounts)
- Streaming token output (replies arrive whole; typing dots shown while waiting)
- Voice input/output
- Web search / tool use
- Push notifications

## Known follow-ups
- Long-conversation token cost: transcript replay grows linearly per turn.
  Consider summarizing older turns once conversations exceed ~50 messages.
