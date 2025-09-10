from flask import Blueprint, request, jsonify, send_from_directory
from db import db
import jwt
import os
from bson import ObjectId

datasets_bp = Blueprint("datasets_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
DATASET_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")  # folder where CSVs are stored
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:5000")   # backend URL


# 📌 Get datasets
@datasets_bp.route("/datasets", methods=["GET"])
def get_datasets():
    # 1️⃣ Check Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    try:
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = decoded.get("user_id")
        role = decoded.get("role")
        if not user_id or not role:
            return jsonify({"error": "Invalid token payload"}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    try:
        datasets_collection = db.datasets

        # 2️⃣ Fetch datasets based on role
        if role == "admin":
            users_datasets = list(datasets_collection.find({}))
        else:
            users_datasets = list(datasets_collection.find({"user_id": ObjectId(user_id)}))

        # 3️⃣ Format response
        response_data = []
        for user_doc in users_datasets:
            user_dict = {
                "_id": str(user_doc["_id"]),
                "user_id": str(user_doc.get("user_id", "")),
                "datasets": []
            }

            for ds in user_doc.get("datasets", []):
                filename = ds.get("filename")
                download_url = (
                    f"{BASE_URL}/api/datasets/download/{filename}"
                    if filename else None
                )

                user_dict["datasets"].append({
                    "dataset_name": ds.get("dataset_name", "N/A"),
                    "dataset_type": ds.get("dataset_type", "N/A"),
                    "filename": filename or "N/A",
                    "file_path": ds.get("file_path", "N/A"),
                    "uploaded_at": str(ds.get("uploaded_at", "N/A")),
                    "records_count": len(ds.get("records", [])) if ds.get("records") else 0,
                    "uploaded_by": ds.get("uploaded_by", "N/A"),
                    "download_url": download_url
                })

            response_data.append(user_dict)

        return jsonify({"datasets": response_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 📌 Get imagery datasets only
@datasets_bp.route("/datasets/imagery", methods=["GET"])
def get_imagery_datasets():
    # 1️⃣ Check Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    try:
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = decoded.get("user_id")
        role = decoded.get("role")
        if not user_id or not role:
            return jsonify({"error": "Invalid token payload"}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    try:
        satellite_imagery_collection = db.satellite_imagery

        # 2️⃣ Fetch documents
        if role == "admin":
            imagery_docs = list(satellite_imagery_collection.find({}))
        else:
            imagery_docs = list(satellite_imagery_collection.find({"user_id": ObjectId(user_id)}))

        # 3️⃣ Format response
        response_data = []
        for doc in imagery_docs:
            user_id = str(doc.get("user_id", ""))
            datasets = doc.get("satellite_imagery", [])

            for dataset in datasets:  # loop inside nested array
                filename = dataset.get("filename")
                download_url = (
                    f"{BASE_URL}/api/datasets/download/{filename}"
                    if filename else None
                )

                response_data.append({
                    "_id": str(doc["_id"]),
                    "user_id": user_id,
                    "dataset_name": dataset.get("dataset_name", "N/A"),
                    "dataset_type": dataset.get("dataset_type", "N/A"),
                    "filename": filename or "N/A",
                    "file_path": dataset.get("file_path", "N/A"),
                    "uploaded_at": str(dataset.get("uploaded_at", "N/A")),
                    "uploaded_by": dataset.get("uploaded_by", "N/A"),
                    "records_count": dataset.get("records_count", 0) 
                        if "records_count" in dataset else len(dataset.get("records", [])),
                    "gibs_url": dataset.get("gibs_url"),
                    "download_url": download_url,
                    # ✅ Include the full records array
                    "records": dataset.get("records", [])
                })

        return jsonify({"datasets": response_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🗑️ Delete imagery dataset route
@datasets_bp.route("/datasets/imagery/<doc_id>/<filename>", methods=["DELETE"])
def delete_imagery_dataset(doc_id, filename):
    # 1️⃣ Check Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    try:
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = decoded.get("user_id")
        role = decoded.get("role")
        if not user_id or not role:
            return jsonify({"error": "Invalid token payload"}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    try:
        imagery_collection = db.satellite_imagery

        # 2️⃣ Only allow user to delete their own imagery unless admin
        query = {"_id": ObjectId(doc_id)} if role == "admin" else {
            "_id": ObjectId(doc_id),
            "user_id": ObjectId(user_id)
        }

        imagery_doc = imagery_collection.find_one(query)
        if not imagery_doc:
            return jsonify({"error": "Imagery document not found or not authorized"}), 404

        # 3️⃣ Pull from the nested "satellite_imagery" array
        updated = imagery_collection.update_one(
            query,
            {"$pull": {"satellite_imagery": {"filename": filename}}}
        )

        if updated.modified_count == 0:
            return jsonify({"error": "Imagery dataset not found in records"}), 404

        # 4️⃣ Delete actual file if it exists
        file_path = os.path.join(DATASET_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({"message": f"Imagery dataset '{filename}' deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ✅ File download route
@datasets_bp.route("/datasets/download/<filename>", methods=["GET"])
def download_dataset(filename):
    try:
        return send_from_directory(DATASET_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


# 🗑️ Delete dataset route
@datasets_bp.route("/datasets/<dataset_id>/<filename>", methods=["DELETE"])
def delete_dataset(dataset_id, filename):
    # 1️⃣ Check Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    try:
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = decoded.get("user_id")
        role = decoded.get("role")
        if not user_id or not role:
            return jsonify({"error": "Invalid token payload"}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    try:
        datasets_collection = db.datasets

        # 2️⃣ Only allow user to delete their own dataset unless admin
        query = {"_id": ObjectId(dataset_id)} if role == "admin" else {
            "_id": ObjectId(dataset_id),
            "user_id": ObjectId(user_id)
        }

        dataset_doc = datasets_collection.find_one(query)
        if not dataset_doc:
            return jsonify({"error": "Dataset not found or not authorized"}), 404

        # 3️⃣ Remove dataset entry from MongoDB
        updated = datasets_collection.update_one(
            query,
            {"$pull": {"datasets": {"filename": filename}}}
        )

        if updated.modified_count == 0:
            return jsonify({"error": "Dataset not found in user records"}), 404

        # 4️⃣ Delete actual file if it exists
        file_path = os.path.join(DATASET_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({"message": f"Dataset '{filename}' deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
