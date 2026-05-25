"""Backend API tests for Voice Hub app.

Covers:
  - Auth endpoints (/api/auth/session, /api/auth/me, /api/auth/logout)
  - Passenger endpoints (/api/passengers CRUD)
  - Socket.IO server reachability and basic events
"""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

import socketio

from conftest import BASE_URL


# ============= AUTH TESTS =============

class TestAuthSession:
    """POST /api/auth/session"""

    def test_missing_session_token_returns_400(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/session", json={})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        body = r.json()
        assert "detail" in body
        assert "session_token" in body["detail"].lower()

    def test_invalid_session_token_returns_401(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/session",
            json={"session_token": f"invalid_token_{uuid.uuid4().hex}"},
        )
        # Emergent OAuth verification should fail -> 401
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        body = r.json()
        assert "detail" in body

    def test_empty_session_token_string_returns_400(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/session", json={"session_token": ""})
        assert r.status_code == 400


class TestAuthMe:
    """GET /api/auth/me"""

    def test_no_auth_header_returns_401(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401
        assert r.json().get("detail") == "Not authenticated"

    def test_malformed_authorization_returns_401(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "NotBearer xyz"},
        )
        assert r.status_code == 401

    def test_invalid_bearer_token_returns_401(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer invalid_{uuid.uuid4().hex}"},
        )
        assert r.status_code == 401


class TestAuthLogout:
    """POST /api/auth/logout"""

    def test_logout_without_auth_returns_401(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 401

    def test_logout_with_invalid_token_still_returns_200(self, api_client):
        # Implementation deletes a non-existing token; returns success.
        r = api_client.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer ghost_{uuid.uuid4().hex}"},
        )
        assert r.status_code == 200
        assert "message" in r.json()


# ============= PASSENGER TESTS =============
# These require auth. We seed a session directly in MongoDB to bypass OAuth.

@pytest.fixture(scope="module")
def seeded_session():
    """Seed a user + session in Mongo so we can exercise authed endpoints."""
    from pymongo import MongoClient
    from pathlib import Path
    from dotenv import load_dotenv

    load_dotenv(Path('/app/backend/.env'))
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']

    client = MongoClient(mongo_url)
    db = client[db_name]

    user_id = f"user_TEST_{uuid.uuid4().hex[:8]}"
    token = f"TEST_session_{uuid.uuid4().hex}"

    db.users.insert_one({
        "user_id": user_id,
        "email": f"TEST_{user_id}@example.com",
        "name": "TEST User",
        "picture": None,
        "created_at": datetime.now(timezone.utc),
    })
    db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })

    yield {"token": token, "user_id": user_id}

    # Cleanup
    db.passengers.delete_many({"user_id": user_id})
    db.user_sessions.delete_many({"user_id": user_id})
    db.users.delete_many({"user_id": user_id})
    client.close()


class TestPassengers:
    """CRUD for /api/passengers"""

    def test_list_passengers_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/passengers")
        assert r.status_code == 401

    def test_create_passenger_requires_auth(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/passengers",
            json={"name": "John", "date": datetime.now(timezone.utc).isoformat()},
        )
        assert r.status_code == 401

    def test_delete_passenger_requires_auth(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/passengers/pass_anything")
        assert r.status_code == 401

    def test_auth_me_with_seeded_session(self, api_client, seeded_session):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {seeded_session['token']}"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_id"] == seeded_session["user_id"]
        assert body["email"].startswith("TEST_")

    def test_create_then_list_then_delete_passenger(self, api_client, seeded_session):
        headers = {"Authorization": f"Bearer {seeded_session['token']}"}

        # Initially empty (or no entries for this fresh user)
        r0 = api_client.get(f"{BASE_URL}/api/passengers", headers=headers)
        assert r0.status_code == 200
        initial = r0.json()
        assert isinstance(initial, list)

        # Create
        payload = {
            "name": "TEST Passenger Alice",
            "date": datetime.now(timezone.utc).isoformat(),
        }
        r1 = api_client.post(f"{BASE_URL}/api/passengers", json=payload, headers=headers)
        assert r1.status_code == 200, r1.text
        created = r1.json()
        assert created["name"] == payload["name"]
        assert created["passenger_id"].startswith("pass_")
        assert created["user_id"] == seeded_session["user_id"]
        passenger_id = created["passenger_id"]

        # List - verify persistence
        r2 = api_client.get(f"{BASE_URL}/api/passengers", headers=headers)
        assert r2.status_code == 200
        ids = [p["passenger_id"] for p in r2.json()]
        assert passenger_id in ids

        # Delete
        r3 = api_client.delete(
            f"{BASE_URL}/api/passengers/{passenger_id}", headers=headers
        )
        assert r3.status_code == 200
        assert "message" in r3.json()

        # Verify deletion
        r4 = api_client.get(f"{BASE_URL}/api/passengers", headers=headers)
        assert r4.status_code == 200
        ids_after = [p["passenger_id"] for p in r4.json()]
        assert passenger_id not in ids_after

    def test_delete_nonexistent_passenger_returns_404(self, api_client, seeded_session):
        headers = {"Authorization": f"Bearer {seeded_session['token']}"}
        r = api_client.delete(
            f"{BASE_URL}/api/passengers/pass_does_not_exist_xyz", headers=headers
        )
        assert r.status_code == 404

    def test_create_passenger_invalid_payload_returns_422(self, api_client, seeded_session):
        headers = {"Authorization": f"Bearer {seeded_session['token']}"}
        # Missing 'date'
        r = api_client.post(
            f"{BASE_URL}/api/passengers",
            json={"name": "Missing date"},
            headers=headers,
        )
        assert r.status_code == 422


# ============= SOCKET.IO TESTS =============

class TestSocketIO:
    """Socket.IO server reachability and events."""

    def test_socket_io_endpoint_reachable(self, api_client):
        # The handshake endpoint should respond on /socket.io/ path
        r = api_client.get(f"{BASE_URL}/socket.io/?EIO=4&transport=polling")
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:200]}"
        # First byte should indicate engine.io open packet
        assert r.text.startswith("0") or '"sid"' in r.text

    def test_socket_io_connect_and_join_group(self):
        sio = socketio.Client(reconnection=False, logger=False, engineio_logger=False)
        events = {"connected": None, "users_list": None}

        @sio.event
        def connect():
            events["connected"] = True

        @sio.on("connected")
        def _on_connected(data):
            events["connected_event"] = data

        @sio.on("users_list")
        def _on_users_list(data):
            events["users_list"] = data

        try:
            sio.connect(BASE_URL, transports=["polling"], wait_timeout=10)
            assert sio.connected, "Socket.IO did not connect"

            sio.emit("join_group", {
                "user_id": f"TEST_user_{uuid.uuid4().hex[:6]}",
                "user_name": "TEST Tester",
                "user_picture": None,
            })

            # Wait briefly for server-side broadcast
            deadline = time.time() + 5
            while events["users_list"] is None and time.time() < deadline:
                sio.sleep(0.2)

            assert events["users_list"] is not None, "Did not receive users_list event"
            assert "users" in events["users_list"]
            assert isinstance(events["users_list"]["users"], list)
        finally:
            if sio.connected:
                sio.disconnect()

    def test_socket_io_send_message_broadcast(self):
        """Two clients: one sends, both should receive new_message."""
        sender = socketio.Client(reconnection=False, logger=False, engineio_logger=False)
        receiver = socketio.Client(reconnection=False, logger=False, engineio_logger=False)
        received = {"sender": None, "receiver": None}

        @sender.on("new_message")
        def _s(data):
            received["sender"] = data

        @receiver.on("new_message")
        def _r(data):
            received["receiver"] = data

        try:
            sender.connect(BASE_URL, transports=["polling"], wait_timeout=10)
            receiver.connect(BASE_URL, transports=["polling"], wait_timeout=10)

            uid_s = f"TEST_s_{uuid.uuid4().hex[:6]}"
            uid_r = f"TEST_r_{uuid.uuid4().hex[:6]}"
            sender.emit("join_group", {"user_id": uid_s, "user_name": "Sender"})
            receiver.emit("join_group", {"user_id": uid_r, "user_name": "Receiver"})
            time.sleep(0.5)

            sender.emit("send_message", {
                "user_id": uid_s,
                "user_name": "Sender",
                "text": "hello TEST",
            })

            deadline = time.time() + 5
            while (received["sender"] is None or received["receiver"] is None) and time.time() < deadline:
                sender.sleep(0.2)

            assert received["sender"] is not None, "Sender did not receive own message broadcast"
            assert received["receiver"] is not None, "Receiver did not receive message"
            assert received["receiver"]["text"] == "hello TEST"
            assert "message_id" in received["receiver"]
            assert "timestamp" in received["receiver"]
        finally:
            if sender.connected:
                sender.disconnect()
            if receiver.connected:
                receiver.disconnect()

    def test_socket_io_walkie_talkie_events(self):
        a = socketio.Client(reconnection=False, logger=False, engineio_logger=False)
        b = socketio.Client(reconnection=False, logger=False, engineio_logger=False)
        talking_events = []
        voice_events = []

        @b.on("user_talking")
        def _t(data):
            talking_events.append(data)

        @b.on("voice_stream")
        def _v(data):
            voice_events.append(data)

        try:
            a.connect(BASE_URL, transports=["polling"], wait_timeout=10)
            b.connect(BASE_URL, transports=["polling"], wait_timeout=10)

            uid_a = f"TEST_a_{uuid.uuid4().hex[:6]}"
            uid_b = f"TEST_b_{uuid.uuid4().hex[:6]}"
            a.emit("join_group", {"user_id": uid_a, "user_name": "A"})
            b.emit("join_group", {"user_id": uid_b, "user_name": "B"})
            time.sleep(0.5)

            a.emit("start_talking", {"user_id": uid_a, "user_name": "A"})
            a.emit("voice_data", {"user_id": uid_a, "audio_data": "base64fakeaudio"})
            a.emit("stop_talking", {"user_id": uid_a})

            deadline = time.time() + 5
            while (len(talking_events) < 2 or len(voice_events) < 1) and time.time() < deadline:
                a.sleep(0.2)

            assert len(talking_events) >= 2, f"Expected start+stop talking events, got {talking_events}"
            assert any(e.get("talking") is True for e in talking_events)
            assert any(e.get("talking") is False for e in talking_events)
            assert len(voice_events) >= 1
            assert voice_events[0]["audio_data"] == "base64fakeaudio"
        finally:
            if a.connected:
                a.disconnect()
            if b.connected:
                b.disconnect()
