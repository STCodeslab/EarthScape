from flask import Blueprint, jsonify, request
from db import users_collection
import jwt, os

admin_list_bp = Blueprint("admin_list_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

@admin_list_bp.route("/admin-list", methods=["GET"])
def get_admin_list():
    # Check token
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            return jsonify({"error": "Only admins can view the list"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    # Fetch only admins
    admins = list(users_collection.find({"role": "admin"}))

    # Convert ObjectId to string for React usage
    for admin in admins:
        admin["_id"] = str(admin["_id"])

    return jsonify(admins), 200
