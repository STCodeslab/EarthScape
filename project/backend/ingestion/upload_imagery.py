import os
import jwt
import math
import pandas as pd
from flask import Blueprint, request, jsonify
from bson import ObjectId
from db import db, users_collection
from datetime import datetime, timezone

upload_imagery_bp = Blueprint("upload_imagery", __name__)

DATASET_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")
os.makedirs(DATASET_FOLDER, exist_ok=True)


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


def latlon_to_tile(lat, lon, z):
    """Convert latitude/longitude to WMTS tile coordinates (EPSG:4326)."""
    n = 2 ** (z - 1)  # EPSG:4326 has half the rows compared to EPSG:3857
    x = int((lon + 180.0) / 360.0 * (2 ** z))
    y = int((90.0 - lat) / 180.0 * n)
    return x, y



@upload_imagery_bp.route("/upload-imagery", methods=["POST"])
def upload_imagery():
    try:
        # ✅ Auth check
        user_id, user_email, error = get_user_from_token()
        if error:
            return jsonify({"error": error}), 401

        data = request.json
        dataset_name = data.get("dataset_name")
        city = data.get("city")
        lat = data.get("latitude")
        lon = data.get("longitude")
        z = int(data.get("zoom", 6))
        date = data.get("date", datetime.now().strftime("%Y-%m-%d"))

        if not dataset_name or not city or lat is None or lon is None:
            return jsonify({"error": "dataset_name, city, latitude, longitude are required"}), 400

        # ✅ Convert lat/lon to x/y
        x, y = latlon_to_tile(float(lat), float(lon), z)

        # ✅ Construct GIBS WMTS URL
        gibs_url = (
            f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/"
            f"MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/250m/{z}/{y}/{x}.jpg"
        )

        # ✅ Record
        records = [{
            "datetime": datetime.now(timezone.utc).isoformat(),
            "city": city,
            "latitude": float(lat),
            "longitude": float(lon),
            "zoom": z,
            "x": x,
            "y": y,
            "date": date,
            "gibs_url": gibs_url,
        }]

        # ✅ Save CSV file
        df = pd.DataFrame(records)
        filename = f"{city}_imagery.csv"
        file_path = os.path.join(DATASET_FOLDER, filename)
        df.to_csv(file_path, index=False)

        # ✅ Save in MongoDB
        db.satellite_imagery.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "satellite_imagery": {
                        "dataset_name": dataset_name,
                         "dataset_type": "imagery",
                        "filename": filename,
                        "file_path": file_path,
                        "uploaded_at": datetime.now(timezone.utc),
                        "uploaded_by": user_email,
                        "records": records,
                        "records_count": len(records),
                    }
                }
            },
            upsert=True
        )

        return jsonify({
            "message": f"Imagery for {city} uploaded successfully.",
            "dataset_name": dataset_name,
            "dataset_type": "imagery",
            "records_count": len(records),
            "csv_file": filename,
            "preview_url": gibs_url
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
