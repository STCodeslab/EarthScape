from flask import Blueprint, request, jsonify
from db import feedback_collection
import jwt, os
from datetime import datetime
from bson.objectid import ObjectId

feedback_bp = Blueprint("feedback_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Submit feedback (for all users)
@feedback_bp.route("/feedback", methods=["POST"])
def submit_feedback():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    data = request.get_json()
    user_email = payload.get("email")
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Feedback message is required"}), 400

    feedback_collection.insert_one({
        "user_email": user_email,
        "message": message,
        "status": "pending",
        "created_at": datetime.utcnow()
    })

    return jsonify({"message": "Feedback submitted successfully"}), 201

# Get all feedback (admin only)
@feedback_bp.route("/admin-feedback", methods=["GET"])
def admin_feedback_list():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            return jsonify({"error": "Only admins can view feedback"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    feedbacks = list(feedback_collection.find({}, {
        "_id": 1,
        "user_email": 1,
        "message": 1,
        "status": 1,
        "created_at": 1
    }))
    for f in feedbacks:
        f["_id"] = str(f["_id"])

    return jsonify(feedbacks), 200

# Get feedback for logged-in user (analyst)
@feedback_bp.route("/feedback-list", methods=["GET"])
def feedback_list():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_email = payload.get("email")
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    feedbacks = list(feedback_collection.find({"user_email": user_email}, {
        "_id": 1,
        "user_email": 1,
        "message": 1,
        "status": 1,
        "created_at": 1
    }))
    for f in feedbacks:
        f["_id"] = str(f["_id"])

    return jsonify(feedbacks), 200

# Update feedback status (admin only)
@feedback_bp.route("/admin-feedback/<feedback_id>", methods=["PATCH"])
def update_feedback_status(feedback_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            return jsonify({"error": "Only admins can update feedback"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    data = request.get_json()
    status = data.get("status", "").lower()
    if status not in ["pending", "in-progress", "resolved"]:
        return jsonify({"error": "Invalid status"}), 400

    try:
        result = feedback_collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": {"status": status}}
        )
    except Exception:
        return jsonify({"error": "Invalid feedback ID"}), 400

    if result.matched_count == 0:
        return jsonify({"error": "Feedback not found"}), 404

    return jsonify({"message": "Feedback status updated successfully"}), 200

# Delete feedback (admin only)
@feedback_bp.route("/admin-feedback/<feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            return jsonify({"error": "Only admins can delete feedback"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    try:
        result = feedback_collection.delete_one({"_id": ObjectId(feedback_id)})
    except Exception:
        return jsonify({"error": "Invalid feedback ID"}), 400

    if result.deleted_count == 0:
        return jsonify({"error": "Feedback not found"}), 404

    return jsonify({"message": "Feedback deleted successfully"}), 200
