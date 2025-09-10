# tasks.py
from datetime import datetime, timezone
from bson import ObjectId
from db import db
from machinelearning.ml_blueprint import train_anomaly_model, _save_model_artifact

def retrain_models():
    print(f"[{datetime.now(timezone.utc)}] Starting scheduled retraining...")

    try:
        models = db.models.find({"type": "anomaly_isoforest"})
    except Exception as e:
        print(f"❌ Could not fetch models from MongoDB: {e}")
        return

    for m in models:
        try:
            # Defensive checks
            if not m.get("target_field"):
                print(f"⚠️ Skipping model {m['_id']} (no target_field)")
                continue

            user_id = str(m["user_id"])
            role = m.get("role", "user")
            dataset_name = m.get("dataset_name")
            dataset_id = str(m["dataset_id"]) if m.get("dataset_id") else None
            target_field = m["target_field"]
            contamination = float(m.get("contamination", 0.02))

            # retrain and overwrite the same doc
            model_id, meta = train_anomaly_model(
                user_id=user_id,
                role=role,
                dataset_name=dataset_name,
                dataset_id=dataset_id,
                target_field=target_field,
                contamination=contamination,
                model_id=str(m["_id"])  # 🔑 ensures overwrite
            )

            print(f"✅ Retrained model {model_id} for dataset {dataset_name}")

        except Exception as e:
            print(f"❌ Failed to retrain model {m.get('_id')}: {e}")

    print(f"[{datetime.now(timezone.utc)}] Retraining completed.")
