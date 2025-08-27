from flask import Blueprint, request, jsonify
from db import users_collection
import jwt, os
from bson.objectid import ObjectId
from passlib.hash import bcrypt
from datetime import datetime

update_admin_bp = Blueprint("update_admin_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

@update_admin_bp.route("/update-admin/<admin_id>", methods=["PUT"])
def update_admin(admin_id):
    # Check token
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            return jsonify({"error": "Only admins can update other admins"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    data = request.get_json()
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    update_data = {}
    if full_name:
        update_data["full_name"] = full_name
    if email:
        update_data["email"] = email
    if password:
        update_data["password"] = bcrypt.hash(password)

    if not update_data:
        return jsonify({"error": "No data to update"}), 400

    try:
        result = users_collection.update_one(
            {"_id": ObjectId(admin_id), "role": "admin"},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Admin not found"}), 404
    except Exception as e:
        return jsonify({"error": "Invalid admin ID"}), 400

    return jsonify({"message": "Admin updated successfully"}), 200
