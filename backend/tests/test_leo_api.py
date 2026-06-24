"""LEO AI backend regression suite.

Covers: health, session CRUD, chat (single-turn + multi-turn context),
message history, validation/error paths.
"""
import os
import time

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Track created session ids for cleanup
_created_ids: list[str] = []


@pytest.fixture(scope="session", autouse=True)
def cleanup(client):
    yield
    for sid in _created_ids:
        try:
            client.delete(f"{API}/sessions/{sid}", timeout=10)
        except Exception:
            pass


# ---------- Health ----------
class TestHealth:
    def test_health_endpoint(self, client):
        r = client.get(f"{API}/", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert "message" in body


# ---------- Session CRUD ----------
class TestSessions:
    def test_create_session_default_title(self, client):
        r = client.post(f"{API}/sessions", json={}, timeout=15)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["id"] and isinstance(s["id"], str)
        assert s["title"] == "New conversation"
        assert s["created_at"] and s["updated_at"]
        _created_ids.append(s["id"])

    def test_create_session_custom_title(self, client):
        r = client.post(f"{API}/sessions", json={"title": "TEST_custom"}, timeout=15)
        assert r.status_code == 200
        s = r.json()
        assert s["title"] == "TEST_custom"
        _created_ids.append(s["id"])

    def test_list_sessions_sorted_desc(self, client):
        # create two with a small gap
        a = client.post(f"{API}/sessions", json={"title": "TEST_A"}, timeout=15).json()
        time.sleep(1.1)
        b = client.post(f"{API}/sessions", json={"title": "TEST_B"}, timeout=15).json()
        _created_ids.extend([a["id"], b["id"]])

        r = client.get(f"{API}/sessions", timeout=15)
        assert r.status_code == 200
        sessions = r.json()
        assert isinstance(sessions, list) and len(sessions) >= 2
        ids = [s["id"] for s in sessions]
        # newer (b) must appear before older (a)
        assert ids.index(b["id"]) < ids.index(a["id"])
        # ensure no Mongo _id leaked
        assert all("_id" not in s for s in sessions)

    def test_delete_session(self, client):
        s = client.post(f"{API}/sessions", json={"title": "TEST_del"}, timeout=15).json()
        sid = s["id"]
        r = client.delete(f"{API}/sessions/{sid}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # verify gone from list
        listed = client.get(f"{API}/sessions", timeout=15).json()
        assert sid not in [x["id"] for x in listed]


# ---------- Validation / error paths ----------
class TestErrors:
    def test_chat_invalid_session_returns_404(self, client):
        r = client.post(
            f"{API}/sessions/does-not-exist/chat",
            json={"content": "hello"},
            timeout=20,
        )
        assert r.status_code == 404, r.text

    def test_chat_empty_content_returns_400(self, client):
        s = client.post(f"{API}/sessions", json={"title": "TEST_empty"}, timeout=15).json()
        _created_ids.append(s["id"])
        r = client.post(f"{API}/sessions/{s['id']}/chat", json={"content": "   "}, timeout=20)
        assert r.status_code == 400, r.text


# ---------- Chat happy path + persistence + title/preview ----------
class TestChatFlow:
    def test_single_turn_chat_and_persistence(self, client):
        s = client.post(f"{API}/sessions", json={}, timeout=15).json()
        sid = s["id"]
        _created_ids.append(sid)

        r = client.post(
            f"{API}/sessions/{sid}/chat",
            json={"content": "Say the single word: pong"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_message"]["role"] == "user"
        assert body["assistant_message"]["role"] == "assistant"
        assert body["assistant_message"]["content"].strip(), "assistant returned empty"

        # title should now be derived from first user message
        assert body["session"]["title"] != "New conversation"
        assert body["session"]["preview"], "preview should be populated"

        # verify messages are persisted in order
        msgs = client.get(f"{API}/sessions/{sid}/messages", timeout=15).json()
        assert len(msgs) >= 2
        assert msgs[0]["role"] == "user"
        assert msgs[1]["role"] == "assistant"
        assert all("_id" not in m for m in msgs)

    def test_multi_turn_context(self, client):
        s = client.post(f"{API}/sessions", json={}, timeout=15).json()
        sid = s["id"]
        _created_ids.append(sid)

        r1 = client.post(
            f"{API}/sessions/{sid}/chat",
            json={"content": "My favorite color is teal. Please remember it."},
            timeout=90,
        )
        assert r1.status_code == 200, r1.text

        r2 = client.post(
            f"{API}/sessions/{sid}/chat",
            json={"content": "What is my favorite color? Answer in one word."},
            timeout=90,
        )
        assert r2.status_code == 200, r2.text
        reply = r2.json()["assistant_message"]["content"].lower()
        assert "teal" in reply, f"expected 'teal' in reply, got: {reply!r}"
