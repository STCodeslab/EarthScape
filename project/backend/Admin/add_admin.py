from flask import Blueprint, request, jsonify
from db import users_collection
from passlib.hash import bcrypt
from datetime import datetime
import re, jwt, os

add_admin_bp = Blueprint("add_admin_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

@add_admin_bp.route("/add-admin", methods=["POST"])
def add_admin():
    # Check token
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Missing token"}), 401

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            return jsonify({"error": "Only admins can add other admins"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    data = request.get_json()
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 400

    hashed_pw = bcrypt.hash(password)

    users_collection.insert_one({
        "full_name": full_name,
        "email": email,
        "password": hashed_pw,
        "role": "admin",
        "created_at": datetime.utcnow()
    })

    return jsonify({"message": "New admin created successfully"}), 201
