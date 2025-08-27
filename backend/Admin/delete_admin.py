from flask import Blueprint, request, jsonify
from db import users_collection
import jwt, os
from bson.objectid import ObjectId

delete_admin_bp = Blueprint("delete_admin_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

@delete_admin_bp.route("/delete-admin/<admin_id>", methods=["DELETE"])
def delete_admin(admin_id):
    # Check token
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            return jsonify({"error": "Only admins can delete other admins"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    try:
        # Convert string _id to ObjectId
        result = users_collection.delete_one({"_id": ObjectId(admin_id), "role": "admin"})
        if result.deleted_count == 0:
            return jsonify({"error": "Admin not found or cannot delete non-admin"}), 404
    except Exception as e:
        return jsonify({"error": "Invalid admin ID"}), 400

    return jsonify({"message": "Admin deleted successfully"}), 200
