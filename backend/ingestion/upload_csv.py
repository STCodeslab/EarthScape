import os
import csv
import jwt
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from bson import ObjectId
from db import db, users_collection
from datetime import datetime, timezone

upload_csv_bp = Blueprint("upload_csv", __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), "dataset")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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

@upload_csv_bp.route("/upload-csv", methods=["POST"])
def upload_csv():
    try:
        user_id, user_email, error = get_user_from_token()
        if error:
            return jsonify({"error": error}), 401

        dataset_name = request.form.get("dataset_name")
        if not dataset_name:
            return jsonify({"error": "dataset_name is required"}), 400

        file = request.files.get("file")
        if not file:
            return jsonify({"error": "CSV file is required"}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        # Read CSV rows
        with open(file_path, mode="r", encoding="utf-8") as f:
            csv_input = csv.DictReader(f)
            records = [row for row in csv_input]

        if not records:
            return jsonify({"error": "CSV file is empty"}), 400

        # Insert dataset with uploader email
        db.datasets.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "datasets": { 
                        "dataset_name": dataset_name,
                        "filename": filename,
                        "file_path": file_path,
                        "uploaded_at": datetime.now(timezone.utc),
                        "uploaded_by": user_email,  # ✅ store uploader email
                        "records": records,
                        "records_count": len(records)
                    }
                }
            },
            upsert=True
        )

        return jsonify({
            "message": f"CSV uploaded and nested under user {user_email}",
            "dataset_name": dataset_name,
            "inserted_count": len(records)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
