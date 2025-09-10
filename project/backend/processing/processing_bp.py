from flask import Blueprint, request, jsonify
from db import db
from bson import json_util
import json

processing_bp = Blueprint("processing", __name__)

def parse_json(data):
    return json.loads(json_util.dumps(data))


# Get all datasets (filter by role)
@processing_bp.route("/datasets", methods=["GET"])
def get_datasets():
    user_role = request.args.get("role", "analyst")
    user_id = request.args.get("user_id")

    query = {}
    if user_role != "admin" and user_id:
        query = {"owner_id": user_id}

    datasets = list(db["datasets"].find(query, {"name": 1}))
    return jsonify({"datasets": parse_json(datasets)})


@processing_bp.route("/dataset/<dataset_name>/fields", methods=["GET"])
def get_fields(dataset_name):
    # find the dataset inside the parent docs
    user_doc = db["datasets"].find_one(
        {"datasets.dataset_name": dataset_name},
        {"datasets.$": 1}   # return only the matched dataset
    )

    if not user_doc or "datasets" not in user_doc:
        return jsonify({"error": "Dataset not found"}), 404

    dataset = user_doc["datasets"][0]

    # take first record for fields
    if "records" not in dataset or len(dataset["records"]) == 0:
        return jsonify({"fields": []})

    fields = list(dataset["records"][0].keys())
    return jsonify({"fields": fields})

# Run processing
@processing_bp.route("/dataset/<dataset_name>/process", methods=["POST"])
def process_data_mongo(dataset_name):
    """
    Process climate dataset records stored in MongoDB.
    Supports operations:
      - count: count total records
      - average: compute average of a numeric field
      - group_by: group by a numeric field (rounded) or raw string values
      - pattern: detect temporal patterns (month if date) or group by raw values (e.g. city)
    """

    body = request.json or {}
    operation = body.get("operation")
    field = body.get("field")  # required for average, group_by, pattern

    try:
        # Base pipeline: find the dataset and expand its records
        pipeline = [
            {"$unwind": "$datasets"},
            {"$match": {"datasets.dataset_name": dataset_name}},
            {"$unwind": "$datasets.records"},
        ]

        # ---------- COUNT ----------
        if operation == "count":
            pipeline.append({"$count": "total"})

        # ---------- AVERAGE ----------
        elif operation == "average" and field:
            pipeline.append({
                "$group": {
                    "_id": None,
                    "average": {
                        "$avg": {
                            "$cond": [
                                {
                                    "$regexMatch": {
                                        "input": f"$datasets.records.{field}",
                                        "regex": "^-?\\d+(\\.\\d+)?$"  # only numbers
                                    }
                                },
                                {"$toDouble": f"$datasets.records.{field}"},
                                None
                            ]
                        }
                    }
                }
            })

        # ---------- GROUP BY ----------
        elif operation == "group_by" and field:
            pipeline.append({
                "$group": {
                    "_id": {
                        "$cond": {
                            "if": {
                                "$regexMatch": {
                                    "input": f"$datasets.records.{field}",
                                    "regex": "^-?\\d+(\\.\\d+)?$"  # numeric check
                                }
                            },
                            # numeric -> round to 1 decimal for binning
                            "then": {
                                "$round": [{"$toDouble": f"$datasets.records.{field}"}, 1]
                            },
                            # non-numeric -> use raw string (e.g. city name)
                            "else": f"$datasets.records.{field}"
                        }
                    },
                    "count": {"$sum": 1}
                }
            })
            pipeline.append({"$sort": {"_id": 1}})

        # ---------- PATTERN DETECTION ----------
        elif operation == "pattern" and field:
            pipeline.extend([
                {
                    "$addFields": {
                        "__date": {
                            "$dateFromString": {
                                "dateString": f"$datasets.records.{field}",
                                "onError": None,
                                "onNull": None
                            }
                        }
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$cond": [
                                {"$ne": ["$__date", None]},   # if date conversion worked
                                {"$month": "$__date"},        # group by month (1-12)
                                f"$datasets.records.{field}"  # else group by raw string
                            ]
                        },
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"_id": 1}}
            ])

        else:
            return jsonify({"error": "Invalid operation or missing field"}), 400

        # ---------- Execute ----------
        result = list(db["datasets"].aggregate(pipeline))

        # Post-process averages
        if operation == "average":
            if not result or result[0].get("average") is None:
                return jsonify({
                    "error": f"Field '{field}' is not numeric, cannot calculate average"
                }), 400
            result[0]["average"] = round(result[0]["average"], 2)

        return jsonify(parse_json(result))

    except Exception as e:
        return jsonify({"error": str(e)}), 500
