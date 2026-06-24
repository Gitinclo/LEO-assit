from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

SYSTEM_PROMPT = (
    "You are LEO, a wise, calm, and thoughtful AI companion. "
    "Speak clearly and warmly, like a trusted friend who also happens to be deeply knowledgeable. "
    "Keep answers focused and well-structured. Use markdown sparingly: short paragraphs, "
    "occasional bullet lists, and code blocks when sharing code. Avoid filler and corporate jargon."
)

app = FastAPI(title="LEO AI Backend")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New conversation"
    created_at: str = Field(default_factory=utcnow_iso)
    updated_at: str = Field(default_factory=utcnow_iso)
    preview: str = ""


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user" | "assistant"
    content: str
    created_at: str = Field(default_factory=utcnow_iso)


class CreateSessionRequest(BaseModel):
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str


class SendMessageResponse(BaseModel):
    user_message: ChatMessage
    assistant_message: ChatMessage
    session: ChatSession


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "LEO AI is awake.", "ok": True}


@api_router.post("/sessions", response_model=ChatSession)
async def create_session(payload: CreateSessionRequest):
    session = ChatSession(title=payload.title or "New conversation")
    await db.sessions.insert_one(session.model_dump())
    return session


@api_router.get("/sessions", response_model=List[ChatSession])
async def list_sessions():
    cursor = db.sessions.find({}, {"_id": 0}).sort("updated_at", -1)
    docs = await cursor.to_list(1000)
    return [ChatSession(**d) for d in docs]


@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    await db.sessions.delete_one({"id": session_id})
    await db.messages.delete_many({"session_id": session_id})
    return {"ok": True}


@api_router.get("/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_messages(session_id: str):
    cursor = db.messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1)
    docs = await cursor.to_list(5000)
    return [ChatMessage(**d) for d in docs]


@api_router.post("/sessions/{session_id}/chat", response_model=SendMessageResponse)
async def send_chat_message(session_id: str, payload: SendMessageRequest):
    session_doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content is empty")

    # Persist user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=content)
    await db.messages.insert_one(user_msg.model_dump())

    # Load full history (so multi-turn context is preserved across requests)
    prior_cursor = db.messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1)
    prior_docs = await prior_cursor.to_list(5000)

    # Build LlmChat session and replay all prior turns except the last user message,
    # which we send fresh to obtain the assistant reply.
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Replay previous turns (everything except the just-inserted user message)
    history = [m for m in prior_docs if m["id"] != user_msg.id]
    # Send each historical user message and discard intermediate responses so the
    # library's internal history matches what we have stored. To minimize cost,
    # we use a lightweight strategy: just send the latest message and rely on the
    # library to maintain history within this single call.
    # For true persistence across requests we manually craft context by including
    # history in the system message instead.
    if history:
        transcript_lines = []
        for m in history:
            who = "User" if m["role"] == "user" else "LEO"
            transcript_lines.append(f"{who}: {m['content']}")
        transcript = "\n".join(transcript_lines)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=(
                f"{SYSTEM_PROMPT}\n\n"
                f"Prior conversation (for your context only, do not repeat it back verbatim):\n"
                f"{transcript}"
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        assistant_text = await chat.send_message(UserMessage(text=content))
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=str(assistant_text),
    )
    await db.messages.insert_one(assistant_msg.model_dump())

    # Update session title (first user msg) and preview/updated_at
    new_title = session_doc.get("title") or "New conversation"
    if new_title == "New conversation":
        new_title = content[:48] + ("…" if len(content) > 48 else "")
    preview = str(assistant_text)[:120].replace("\n", " ")
    updates = {
        "title": new_title,
        "updated_at": utcnow_iso(),
        "preview": preview,
    }
    await db.sessions.update_one({"id": session_id}, {"$set": updates})

    session_doc.update(updates)
    return SendMessageResponse(
        user_message=user_msg,
        assistant_message=assistant_msg,
        session=ChatSession(**session_doc),
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
