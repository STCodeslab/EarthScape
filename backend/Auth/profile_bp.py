from flask import Blueprint, request, jsonify
from db import users_collection
from passlib.hash import bcrypt
import jwt, os
from functools import wraps
from bson import ObjectId



profile_bp = Blueprint("profile_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Middleware to require token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token missing"}), 401

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated


# GET profile
@profile_bp.route("/profile", methods=["GET"])
@token_required
def get_profile():
    user = users_collection.find_one({"_id": ObjectId(request.user["user_id"])})

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "full_name": user.get("full_name"),
        "email": user.get("email"),
        "city": user.get("city"),
    })


# UPDATE profile
@profile_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json()
    update_fields = {}

    if "full_name" in data:
        update_fields["full_name"] = data["full_name"].strip()

    if "email" in data:
        update_fields["email"] = data["email"].strip().lower()

    if "city" in data:
        update_fields["city"] = data["city"].strip()

    if "password" in data and data["password"]:
        if len(data["password"]) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        update_fields["password"] = bcrypt.hash(data["password"])

    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400

    result = users_collection.update_one(
        {"_id": ObjectId(request.user["user_id"])},   # ✅ FIXED
        {"$set": update_fields}
    )

    if result.modified_count == 0:
        return jsonify({"message": "No changes made"}), 200

    return jsonify({"message": "Profile updated successfully"})


import requests

API_KEY = "d8e33cdc9998b6b507b37b5ffc2b8c04"  # test key

@profile_bp.route("/profile/weather", methods=["GET"])
@token_required
def get_weather():
    # If ?city= is passed, override user city
    city = request.args.get("city")

    if not city:
        user = users_collection.find_one({"_id": ObjectId(request.user["user_id"])})
        if not user or not user.get("city"):
            return jsonify({"error": "User city not set"}), 400
        city = user["city"]

    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"

    try:
        res = requests.get(url)
        data = res.json()

        if res.status_code != 200:
            return jsonify({"error": data.get("message", "Weather API failed")}), res.status_code

        weather_data = {
            "temperature": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "temp_min": data["main"]["temp_min"],
            "temp_max": data["main"]["temp_max"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "visibility": data.get("visibility", 0),
            "cloudiness": data["clouds"]["all"],
            "wind_speed": data["wind"]["speed"],
            "wind_deg": data["wind"]["deg"],
            "weather_condition": data["weather"][0]["description"],
            "sunrise": data["sys"]["sunrise"],
            "sunset": data["sys"]["sunset"],
            "rain": data.get("rain", {}).get("1h", 0),
            "snow": data.get("snow", {}).get("1h", 0),
        }

        return jsonify({
            "city": city,
            "weather": weather_data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


    user = users_collection.find_one({"_id": ObjectId(request.user["user_id"])})
    if not user or not user.get("city"):
        return jsonify({"error": "User city not set"}), 400

    city = user["city"]
    # API_KEY = os.getenv("WEATHER_API_KEY") 
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"

    try:
        res = requests.get(url)
        data = res.json()

        if res.status_code != 200:
            return jsonify({"error": data.get("message", "Weather API failed")}), res.status_code

        weather_data = {
            "temperature": data["main"]["temp"],
            "temp_min": data["main"]["temp_min"],
            "temp_max": data["main"]["temp_max"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "wind_speed": data["wind"]["speed"],
            "wind_deg": data["wind"]["deg"],
        }

        return jsonify({"city": city, "weather": weather_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500