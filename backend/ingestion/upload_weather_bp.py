import os
import jwt
import math
import pandas as pd
from flask import Blueprint, request, jsonify
from bson import ObjectId
from db import db, users_collection
from datetime import datetime, timezone
from meteostat import Point, Daily

upload_weather_bp = Blueprint("upload_weather", __name__)

DATASET_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")
os.makedirs(DATASET_FOLDER, exist_ok=True)   # make sure folder exists


def clean_value(val):
    """Ensure MongoDB-safe values (replace <NA>, NaN, etc with None)."""
    if val is None:
        return None
    if val is pd.NA:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    return val


def get_user_from_token():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None, None, "Authorization header missing"

    try:
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        user_id = decoded.get("user_id")
        if not user_id:
            return None, None, "user_id not found in token"

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None, None, "User not found"

        return ObjectId(user_id), user["email"], None

    except jwt.ExpiredSignatureError:
        return None, None, "Token expired"
    except jwt.InvalidTokenError:
        return None, None, "Invalid token"
    except Exception as e:
        return None, None, str(e)


@upload_weather_bp.route("/upload-weather", methods=["POST"])
def upload_weather():
    try:
        user_id, user_email, error = get_user_from_token()
        if error:
            return jsonify({"error": error}), 401

        data = request.json
        dataset_name = data.get("dataset_name")
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        city = data.get("city")

        if not dataset_name or not latitude or not longitude or not start_date or not end_date:
            return jsonify({"error": "dataset_name, city, latitude, longitude, start_date, end_date are required"}), 400

        # Meteostat Point
        location = Point(float(latitude), float(longitude))

        # Fetch daily historical weather
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        raw_data = Daily(location, start, end).fetch()

        if raw_data.empty:
            return jsonify({"error": "No historical weather data found"}), 404

        # Build safe records
        records = []
        for date, row in raw_data.iterrows():
            record = {
                "datetime": date.strftime("%Y-%m-%d"),
                "city": city,
                "latitude": float(latitude),
                "longitude": float(longitude),
                "temperature": clean_value(row.get("tavg")),
                "temp_min": clean_value(row.get("tmin")),
                "temp_max": clean_value(row.get("tmax")),
                "humidity": clean_value(row.get("rhum")),
                "pressure": clean_value(row.get("pres")),
                "wind_speed": clean_value(row.get("wspd")),
                "wind_deg": clean_value(row.get("wdir")),
                "precipitation": clean_value(row.get("prcp")),
                "description": None
            }
            records.append(record)

        # ✅ Save CSV file
        df = pd.DataFrame(records)
        filename = f"{city}_historical_weather.csv"
        file_path = os.path.join(DATASET_FOLDER, filename)
        df.to_csv(file_path, index=False)

        # ✅ Save in MongoDB
        db.datasets.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "datasets": {
                        "dataset_name": dataset_name,
                        "filename": filename,   # now CSV
                        "file_path": file_path,
                        "uploaded_at": datetime.now(timezone.utc),
                        "uploaded_by": user_email,
                        "records": records,
                        "records_count": len(records)
                    }
                }
            },
            upsert=True
        )

        return jsonify({
            "message": f"Historical weather data for {city} uploaded successfully.",
            "dataset_name": dataset_name,
            "records_count": len(records),
            "csv_file": filename
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
