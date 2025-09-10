# realtime.py
import os
import threading
import queue
import time
from collections import defaultdict
from flask import Blueprint, Response, request,jsonify, abort
from bson.json_util import dumps
from bson.objectid import ObjectId
import jwt


from db import db

realtime_bp = Blueprint("realtime_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGO = os.getenv("JWT_ALGORITHM", "HS256")

# ---- Subscribers per collection ----
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


# ---- Watcher threads (one per collection) ----
_watch_threads_started = {}
_watch_threads_lock = threading.Lock()


def start_watch_thread(collection_name: str):
    with _watch_threads_lock:
        if _watch_threads_started.get(collection_name):
            return

        def watch():
            coll = db[collection_name]
            pipeline = [
                {"$match": {"operationType": {
                    "$in": ["insert", "update", "replace"]}}}
            ]
            while True:
                try:
                    # Full document on updates so we can read user_id, datasets, etc.
                    with coll.watch(pipeline=pipeline, full_document="updateLookup") as stream:
                        for change in stream:
                            payload = {
                                "collection": collection_name,
                                "op": change.get("operationType"),
                                "ts": time.time(),
                                "document": change.get("fullDocument"),
                                "documentKey": change.get("documentKey"),
                                "updateDescription": change.get("updateDescription"),
                            }
                            _broadcast(collection_name, payload)
                except Exception:
                    # Replica stepdown / transient errors → backoff then retry
                    time.sleep(1)

        t = threading.Thread(
            target=watch, name=f"watch-{collection_name}", daemon=True)
        t.start()
        _watch_threads_started[collection_name] = True

# ---- Helper: find owner of globally-latest dataset (by embedded uploaded_at) ----


def get_owner_of_global_latest_dataset():
    """
    Returns {'user_id': ObjectId, 'parent_id': ObjectId} of the document
    that contains the globally latest dataset by datasets.uploaded_at.
    """
    pipe = [
        {"$unwind": "$datasets"},
        {"$sort": {"datasets.uploaded_at": -1}},
        {"$limit": 1},
        {"$project": {"user_id": 1}}
    ]
    doc = next(db["datasets"].aggregate(pipe), None)
    if not doc:
        return None
    return {"user_id": doc["user_id"]}

# ---- SSE endpoint ----


@realtime_bp.route("/stream/<collection_name>")
def stream_collection(collection_name):
   
    token = request.args.get("token")
    if not token:
        return abort(401)

    # Decode token
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id_str = decoded.get("user_id")
        # e.g., 'analyst' will be treated as user
        role = decoded.get("role", "user")
        if not user_id_str:
            return abort(401)
        user_id = ObjectId(user_id_str)
    except Exception:
        return abort(401)

    # Determine which parent document(s) to allow
    # (Each user has one doc in 'datasets' with an embedded 'datasets' array)
    allowed_user_id = None

    if role == "admin":
        owner = get_owner_of_global_latest_dataset()
        if not owner:
            return abort(404, "No dataset found")
        allowed_user_id = owner["user_id"]
    else:
        # Any non-admin role (e.g., 'analyst', 'user', etc.)
        allowed_user_id = user_id

    # Ensure a watcher is running
    start_watch_thread(collection_name)

    q = _add_subscriber(collection_name)

    def event_stream():
        try:
            yield ": connected\n\n"
            while True:
                try:
                    event = q.get(timeout=20)

                    doc = event.get("document") or {}
                    doc_user_id = doc.get("user_id")
                    # doc_user_id might be string or ObjectId depending on how it's stored
                    if isinstance(doc_user_id, str):
                        try:
                            doc_user_id = ObjectId(doc_user_id)
                        except Exception:
                            pass

                    # Filter: only forward events for the allowed user's document
                    if doc_user_id != allowed_user_id:
                        continue

               # 🔹 Detect if dataset array was updated
                    update_desc = event.get("updateDescription", {})
                    updated_fields = update_desc.get("updatedFields", {})
                    new_dataset = None
                    for field, value in updated_fields.items():
                        if field.startswith("datasets.") and isinstance(value, dict):
                         new_dataset = value  # this is the newly pushed dataset
                        break

                 
                    if new_dataset:
                         yield f"data: {dumps(new_dataset)}\n\n"
                    else:
            # fallback small payload instead of whole doc
                      yield f"data: {dumps({'_id': str(doc.get('_id')), 'op': event.get('operationType')})}\n\n"
                except queue.Empty:
                    yield ": heartbeat\n\n"
        finally:
            _remove_subscriber(collection_name, q)

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
    }
    return Response(event_stream(), headers=headers)


@realtime_bp.route("/stream/health")
def stream_health():
    with _subs_lock, _watch_threads_lock:
        return {
            "subscribers": {k: len(v) for k, v in _subscribers.items()},
            "watchers": list(_watch_threads_started.keys()),
            "db": str(db),
        }, 200


@realtime_bp.route("/datasets/latest", methods=["GET"])
def get_latest_datasets():
    """
    Returns the most recent datasets (for the allowed user).
    """
    token = request.args.get("token")
    if not token:
        return abort(401)

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id_str = decoded.get("user_id")
        role = decoded.get("role", "user")
        if not user_id_str:
            return abort(401)
        user_id = ObjectId(user_id_str)
    except Exception:
        return abort(401)

    allowed_user_id = None
    if role == "admin":
        owner = get_owner_of_global_latest_dataset()
        if not owner:
            return abort(404, "No dataset found")
        allowed_user_id = owner["user_id"]
    else:
        allowed_user_id = user_id

    doc = db["datasets"].find_one({"user_id": allowed_user_id})
    if not doc:
        return []

    return dumps(doc.get("datasets", [])), 200


@realtime_bp.route("/datasets/livefeed", methods=["GET"])
def get_datasets():
    # 1️⃣ Check Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    try:
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = decoded.get("user_id")
        role = decoded.get("role")
        if not user_id or not role:
            return jsonify({"error": "Invalid token payload"}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    try:
        datasets_collection = db.datasets

        # 2️⃣ Aggregation to fetch top 10 latest datasets
        match_stage = {} if role == "admin" else {"user_id": ObjectId(user_id)}

        pipeline = [
            {"$match": match_stage},
            {"$unwind": "$datasets"},
            {"$sort": {"datasets.uploaded_at": -1}},
            {"$limit": 10},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "user_id": {"$toString": "$user_id"},
                    "dataset_name": "$datasets.dataset_name",
                    "dataset_type": "$datasets.dataset_type",
                    "filename": "$datasets.filename",
                    "file_path": "$datasets.file_path",
                    "uploaded_at": "$datasets.uploaded_at",
                    "records_count": {"$size": {"$ifNull": ["$datasets.records", []]}},
                    "uploaded_by": "$datasets.uploaded_by"
                }
            }
        ]

        latest_datasets = list(datasets_collection.aggregate(pipeline))

        # 3️⃣ Format dates
        for ds in latest_datasets:
            ds["uploaded_at"] = str(ds.get("uploaded_at", "N/A"))

        return jsonify({"datasets": latest_datasets}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
