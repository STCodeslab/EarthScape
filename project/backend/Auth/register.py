from flask import Blueprint, request, jsonify
from db import users_collection
from passlib.hash import bcrypt
from datetime import datetime
import re

register_bp = Blueprint("register_bp", __name__)

@register_bp.route("/register", methods=["POST"])
def register_user():
    data = request.get_json()
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    city = data.get("city", "").strip()

    if not full_name or not email or not password or not city:
        return jsonify({"error": "All fields are required"}), 400

    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    hashed_pw = bcrypt.hash(password)

    users_collection.insert_one({
        "full_name": full_name,
        "email": email,
        "password": hashed_pw,
        "role": "analyst",
         "city": city,
        "created_at": datetime.utcnow()
    })

    return jsonify({"message": "Analyst registered successfully"}), 201
