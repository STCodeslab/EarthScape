from flask import Blueprint, request, jsonify
from db import users_collection
from passlib.hash import bcrypt
import jwt
import os
from datetime import datetime, timedelta

login_bp = Blueprint("login_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

@login_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})
    if not user or not bcrypt.verify(password, user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    payload = {
         "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user.get("role", "analyst"),
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    redirect_url = "/" if user["role"] != "admin" else "/add-admin"

    return jsonify({
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
           "email": user["email"],  # optional, for frontend usage
        "user_id": str(user["_id"]),  # ✅ convert ObjectId to string
        "redirect": redirect_url,
        "message": "Login successful"
    })
