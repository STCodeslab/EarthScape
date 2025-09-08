# realtime_alerts.py
import time
import queue
import threading
from collections import defaultdict
from flask import Blueprint, Response, request, abort
from bson.json_util import dumps
from bson.objectid import ObjectId
import jwt
from datetime import datetime, timezone
import os

from db import db  # your MongoDB client

alerts_bp = Blueprint("alerts_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGO = os.getenv("JWT_ALGORITHM", "HS256")

# Subscribers per collection
_subscribers = defaultdict(set)
_subs_lock = threading.Lock()


def _add_subscriber(collection_name: str):
    q = queue.Queue(maxsize=1000)
    with _subs_lock:
        _subscribers[collection_name].add(q)
    return q


def _remove_subscriber(collection_name: str, q: queue.Queue):
    with _subs_lock:
        _subscribers[collection_name].discard(q)


def _broadcast(collection_name: str, event: dict):
    with _subs_lock:
        dead = []
        for q in list(_subscribers[collection_name]):
            try:
                q.put_nowait(event)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _subscribers[collection_name].discard(q)


# Watch thread for alerts
_watch_thread_started = False
_watch_lock = threading.Lock()


def start_alerts_watch():
    global _watch_thread_started
    with _watch_lock:
        if _watch_thread_started:
            return

        def watch():
            coll = db.alert_logs
            while True:
                try:
                    # Watch for new inserts
                    pipeline = [{"$match": {"operationType": "insert"}}]
                    with coll.watch(pipeline=pipeline, full_document="updateLookup") as stream:
                        for change in stream:
                            payload = change.get("fullDocument", {})
                            _broadcast("alerts", payload)
                except Exception as e:
                    print("⚠️ Watch thread error:", e)
                    time.sleep(1)

        t = threading.Thread(target=watch, name="watch-alerts", daemon=True)
        t.start()
        _watch_thread_started = True


# SSE endpoint
@alerts_bp.route("/alerts/stream")
def stream_alerts():
    token = request.args.get("token")
    if not token:
        return abort(401)

    # ---- Decode JWT ----
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id_str = decoded.get("user_id")
        role = decoded.get("role", "user")
        if not user_id_str:
            return abort(401)
        user_id = ObjectId(user_id_str)
    except jwt.ExpiredSignatureError:
        return abort(401, description="Token expired")
    except (jwt.InvalidTokenError, Exception):
        return abort(401, description="Invalid token")

    # ---- Start watcher and subscribe ----
    start_alerts_watch()
    q = _add_subscriber("alerts")

    def event_stream():
        try:
            yield ": connected\n\n"
            while True:
                try:
                    alert = q.get(timeout=20)

                    alert_user_id = alert.get("user_id")
                    if isinstance(alert_user_id, str):
                        try:
                            alert_user_id = ObjectId(alert_user_id)
                        except Exception:
                            pass

                    # Non-admins see only their own alerts
                    if role != "admin" and alert_user_id != user_id:
                        continue

                    yield f"data: {dumps(alert)}\n\n"
                except queue.Empty:
                    yield ": heartbeat\n\n"
        finally:
            _remove_subscriber("alerts", q)

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
    }

    return Response(event_stream(), headers=headers)
