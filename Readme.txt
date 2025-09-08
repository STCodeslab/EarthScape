Analyst =>
Saad
Email => Saad@gmail.com
Password => Saad@1234


Admin=>
Tayyaba
Email=> tayyabamuhammadsaleem@gmail.com
Password => Saad@1234

Backend Run : python app.py

Frontend Run : npm start


venv\Scripts\python.exe -m pip install statsmodels

venv\Scripts\python.exe -m pip install metostat

venv\Scripts\python.exe -m pip install celery[redis]

venv\Scripts\python.exe celery -A celery_app.celery worker --loglevel=info

venv\Scripts\python.exe -m pip install apscheduler

Do you want me to also make the alerts push immediately to frontend (via /api/alerts/stream using Server-Sent Events) so you can see alerts live in your presentation?


venv\Scripts\python.exe app.py



venv\Scripts\python.exe -m pip install numpy pandas scikit-learn joblib

Perfect 👌 let’s set up VS Code so it always uses your project’s virtual environment (venv\Scripts\python.exe) automatically.

🔧 Steps to Set VS Code Interpreter

Open VS Code in your project folder
(make sure you open D:\climate-eproject\backend as the root folder in VS Code).

Press Ctrl + Shift + P → type “Python: Select Interpreter” → hit Enter.

You should see a list of Python interpreters.
Look for something like:


I wanted to share the API keys I found:

Weather API Key: d8e33cdc9998b6b507b37b5ffc2b8c04

NASA API Key: KKaQCh3JRSjwRgudTliaFv9offkF5towGJRYQYeY





































# ml_blueprint.py
from flask import Blueprint, request, jsonify
from bson import ObjectId
import os, io, json
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
from statsmodels.tsa.arima.model import ARIMA
import warnings
import datetime as dt

warnings.filterwarnings("ignore")

from statsmodels.tsa.stattools import acf
# Reuse your existing app globals
from db import db
import jwt
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGO = os.getenv("JWT_ALGORITHM", "HS256")

ml_bp = Blueprint("ml_bp", __name__)
MODELS_DIR = os.path.join(os.getcwd(), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def _auth_ok():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return (None, None, ("Authorization header missing", 401))
    try:
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = decoded.get("user_id")
        role = decoded.get("role")
        if not user_id or not role:
            return (None, None, ("Invalid token payload", 401))
        return (user_id, role, None)
    except jwt.ExpiredSignatureError:
        return (None, None, ("Token expired", 401))
    except jwt.InvalidTokenError:
        return (None, None, ("Invalid token", 401))
    except Exception as e:
        return (None, None, (str(e), 401))

def _guess_time_column(df):
    candidates = ["timestamp", "time", "datetime", "date", "uploaded_at"]
    for c in candidates:
        if c in df.columns:
            return c
    return None

def _load_timeseries_from_mongo(user_id, role, dataset_name=None, dataset_id=None, target_field=None):
    """
    Loads records list from your db.datasets collection and returns a tidy DataFrame:
    columns: [ts, value] where ts is datetime64[ns], value is float
    """
    match_stage = {} if role == "admin" else {"user_id": ObjectId(user_id)}
    pipe = [{"$match": match_stage}, {"$unwind": "$datasets"}]
    if dataset_id:
        pipe.append({"$match": {"datasets._id": ObjectId(dataset_id)}})
    elif dataset_name:
        pipe.append({"$match": {"datasets.dataset_name": dataset_name}})

    pipe.append({"$project": {
        "records": "$datasets.records",
        "uploaded_at": "$datasets.uploaded_at",
        "dataset_name": "$datasets.dataset_name"
    }})

    docs = list(db.datasets.aggregate(pipe))
    if not docs:
        raise ValueError("Dataset not found or no access")

    # Combine all records across matches; typical case is 1
    all_records = []
    for d in docs:
        recs = d.get("records") or []
        # ensure it's a list of dicts
        if isinstance(recs, list):
            all_records.extend(recs)

    if not all_records:
        raise ValueError("No records found in the selected dataset")

    df = pd.DataFrame(all_records)
    if df.empty:
        raise ValueError("Records are empty")

    if target_field not in df.columns:
        raise ValueError(f"target_field '{target_field}' not present in dataset")

    # choose time column
    tcol = _guess_time_column(df)
    if tcol is None:
        # fallback: use index order if no timestamp; still construct a pseudo time
        df["_pseudo_time"] = pd.date_range(end=pd.Timestamp.utcnow(), periods=len(df), freq="min")
        tcol = "_pseudo_time"

    # coerce types
    df[tcol] = pd.to_datetime(df[tcol], errors="coerce", utc=True)
    df = df.dropna(subset=[tcol])
    df = df.sort_values(tcol)

    # numeric target
    df[target_field] = pd.to_numeric(df[target_field], errors="coerce")
    df = df.dropna(subset=[target_field])

    # return tidy
    return pd.DataFrame({"ts": df[tcol].values, "value": df[target_field].values})

def _make_features(df, window=5):
    """
    Create simple, robust features for IsolationForest:
    value, 1-lag diff, rolling mean, rolling std (filled)
    """
    s = pd.Series(df["value"])
    lag1 = s.diff().fillna(0.0)
    roll_mean = s.rolling(window, min_periods=1).mean()
    roll_std = s.rolling(window, min_periods=1).std().fillna(0.0)
    X = np.column_stack([s.values, lag1.values, roll_mean.values, roll_std.values])
    return X

def _save_model_artifact(model, meta):
    model_id = str(ObjectId())
    path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    joblib.dump({"model": model, "meta": meta}, path)
    meta_doc = {
        "_id": ObjectId(model_id),
        "type": "anomaly_isoforest",
        "created_at": dt.datetime.utcnow(),
        "path": path,
        **meta
    }
    db.models.insert_one(meta_doc)
    return model_id

def _load_model_artifact(model_id, ensure_type="anomaly_isoforest"):
    doc = db.models.find_one({"_id": ObjectId(model_id)})
    if not doc:
        raise ValueError("Model not found")
    if ensure_type and doc.get("type") != ensure_type:
        raise ValueError(f"Model type mismatch: expected {ensure_type}, got {doc.get('type')}")
    blob = joblib.load(doc["path"])
    return blob["model"], blob["meta"], doc

@ml_bp.route("/models", methods=["GET"])
def list_models():
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    q = {} if role == "admin" else {"user_id": ObjectId(user_id)}
    cur = db.models.find(q).sort("created_at", -1)
    out = []
    for d in cur:
        out.append({
            "model_id": str(d["_id"]),
            "type": d.get("type"),
            "dataset_name": d.get("dataset_name"),
            "target_field": d.get("target_field"),
            "created_at": d.get("created_at").isoformat() if d.get("created_at") else None,
            "metrics": d.get("metrics"),
        })
    return jsonify({"models": out}), 200


@ml_bp.route("/anomaly/train", methods=["POST"])
def anomaly_train():
    """
    JSON body:
    {
      "dataset_name": "karachi_weather",
      "dataset_id": "optional",
      "target_field": "temperature",
      "contamination": 0.02  // optional
    }
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    payload = request.get_json(force=True)
    dataset_name = payload.get("dataset_name")
    dataset_id = payload.get("dataset_id")
    target_field = payload.get("target_field")
    contamination = float(payload.get("contamination", 0.02))

    if not target_field or (not dataset_name and not dataset_id):
        return jsonify({"error": "target_field and (dataset_name or dataset_id) are required"}), 400

    try:
        tsdf = _load_timeseries_from_mongo(user_id, role, dataset_name, dataset_id, target_field)
        if len(tsdf) < 20:
            return jsonify({"error": "Not enough data to train (min 20 rows)"}), 400

        X = _make_features(tsdf)
        model = IsolationForest(n_estimators=200, contamination=contamination, random_state=42)
        model.fit(X)

        # score training set for basic metrics
        raw_scores = model.decision_function(X)  # higher is more normal
        preds = model.predict(X)                 # 1 normal, -1 anomaly
        anomaly_rate = float((preds == -1).mean())

        meta = {
            "user_id": ObjectId(user_id),
            "role": role,
            "dataset_name": dataset_name,
            "dataset_id": ObjectId(dataset_id) if dataset_id else None,
            "target_field": target_field,
            "contamination": contamination,
            "feature_window": 5,
            "metrics": {
                "train_rows": int(len(X)),
                "anomaly_rate": anomaly_rate,
                "score_min": float(np.min(raw_scores)),
                "score_max": float(np.max(raw_scores)),
                "score_mean": float(np.mean(raw_scores)),
            }
        }

        model_id = _save_model_artifact(model, meta)

        return jsonify({
            "model_id": model_id,
            "type": "anomaly_isoforest",
            "metrics": meta["metrics"]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/anomaly/score", methods=["POST"])
def anomaly_score():
    """
    Score latest points or an incoming single point.

    Body options:
    1) Score latest N points from the original dataset:
       { "model_id": "...", "latest_n": 50 }

    2) Score a single new value (real-time):
       { "model_id": "...", "value": 37.4 }
       (Server rebuilds small context window from history for features)
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    payload = request.get_json(force=True)
    model_id = payload.get("model_id")
    latest_n = payload.get("latest_n")
    new_value = payload.get("value")

    if not model_id:
        return jsonify({"error": "model_id is required"}), 400

    try:
        model, meta, model_doc = _load_model_artifact(model_id)

        # permissions: model owner or admin
        if role != "admin" and str(model_doc.get("user_id")) != str(user_id):
            return jsonify({"error": "Forbidden"}), 403

        # Pull history to build features window
        tsdf = _load_timeseries_from_mongo(
            user_id=user_id if role != "admin" else str(model_doc.get("user_id")),
            role=role if role != "admin" else "admin",
            dataset_name=meta.get("dataset_name"),
            dataset_id=str(meta.get("dataset_id")) if meta.get("dataset_id") else None,
            target_field=meta["target_field"]
        )

        if new_value is not None:
            # append the new value with current timestamp
            tsdf = pd.concat([tsdf, pd.DataFrame({"ts": [pd.Timestamp.utcnow()], "value": [float(new_value)]})], ignore_index=True)

        if latest_n:
            tsdf = tsdf.tail(int(latest_n))

        X = _make_features(tsdf)
        scores = model.decision_function(X)  # higher is more normal
        preds = model.predict(X)             # 1 normal, -1 anomaly

        out = []
        for i, row in tsdf.reset_index(drop=True).iterrows():
            out.append({
                "ts": pd.to_datetime(row["ts"]).isoformat(),
                "value": float(row["value"]),
                "score": float(scores[i]),
                "is_anomaly": bool(preds[i] == -1)
            })

        return jsonify({"results": out[-(int(latest_n) if latest_n else len(out)) : ]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500




@ml_bp.route("/models/<model_id>", methods=["DELETE"])
def delete_model(model_id):
    user_id, role, err = _auth_ok()
    if err:
        return jsonify({"error": err[0]}), err[1]

    try:
        # Find the model
        doc = db.models.find_one({"_id": ObjectId(model_id)})
        if not doc:
            return jsonify({"error": "Model not found"}), 404

        # Permissions: only owner or admin
        if role != "admin" and str(doc.get("user_id")) != str(user_id):
            return jsonify({"error": "Forbidden"}), 403

        # Delete model file if exists
        path = doc.get("path")
        if path and os.path.exists(path):
            os.remove(path)

        # Delete from DB
        db.models.delete_one({"_id": ObjectId(model_id)})

        return jsonify({"message": f"Model {model_id} deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500




# ========= STEP 2: FORECASTING =========

def _infer_freq(ts: pd.Series):
    # Try pandas to infer; fallback to median diff in minutes
    freq = pd.infer_freq(ts)
    if freq is None and len(ts) >= 3:
        diffs = pd.Series(ts.sort_values().diff().dropna().values).dt.total_seconds()
        if not diffs.empty:
            med = diffs.median()
            # map common seconds to pandas freq strings
            mapping = {
                60: "T",           # 1 minute
                300: "5T",
                900: "15T",
                1800: "30T",
                3600: "H",
                86400: "D"
            }
            # find closest
            closest = min(mapping.keys(), key=lambda x: abs(x - med))
            freq = mapping[closest]
    return freq  # may still be None; ARIMA can handle but forecasting index will be range

def _to_timeseries(tsdf: pd.DataFrame):
    """Ensure a proper time-indexed series returned as (y, index, freq)."""
    s = pd.Series(tsdf["value"].astype(float).values, index=pd.to_datetime(tsdf["ts"], utc=True))
    s = s.sort_index()

    # 🚀 FIX: handle duplicate timestamps
    if s.index.has_duplicates:
        # Option 1: keep first occurrence
        s = s[~s.index.duplicated(keep="first")]
        # Option 2: OR aggregate duplicates by mean:
        # s = s.groupby(s.index).mean()

    freq = _infer_freq(s.index.to_series())
    if freq:
        s = s.asfreq(freq)
        s = s.interpolate(limit_direction="both")
    return s, freq

@ml_bp.route("/forecast/train", methods=["POST"])
def forecast_train():
    """
    Train ARIMA on a dataset/time-series field.

    Body:
    {
      "dataset_name": "karachi_weather",  // or "dataset_id": "..."
      "target_field": "temperature",
      "p_range": [0, 1, 2],               // optional small grid
      "d_range": [0, 1, 2],               // optional
      "q_range": [0, 1, 2]                // optional
    }
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    body = request.get_json(force=True)
    dataset_name = body.get("dataset_name")
    dataset_id = body.get("dataset_id")
    target_field = body.get("target_field")
    p_range = body.get("p_range", [0, 1, 2])
    d_range = body.get("d_range", [0, 1, 2])
    q_range = body.get("q_range", [0, 1, 2])

    if not target_field or (not dataset_name and not dataset_id):
        return jsonify({"error": "target_field and (dataset_name or dataset_id) are required"}), 400

    try:
        tsdf = _load_timeseries_from_mongo(user_id, role, dataset_name, dataset_id, target_field)
        if len(tsdf) < 20:
            return jsonify({"error": "Not enough data to train (min 20 rows)"}), 400

        y, freq = _to_timeseries(tsdf)
        if y.isna().all():
            return jsonify({"error": "Series is all NaN after preprocessing"}), 400

        # Small grid search for (p,d,q) by AIC
        best = {"aic": float("inf"), "order": None, "model": None}
        for p in p_range:
            for d in d_range:
                for q in q_range:
                    try:
                        m = ARIMA(y, order=(p, d, q))
                        res = m.fit()
                        if res.aic < best["aic"]:
                            best = {"aic": res.aic, "order": (p, d, q), "model": res}
                    except Exception:
                        continue

        if best["model"] is None:
            return jsonify({"error": "Failed to fit ARIMA on any (p,d,q) in the grid"}), 500

        res = best["model"]
        order = best["order"]

        meta = {
            "user_id": ObjectId(user_id),
            "role": role,
            "type": "forecast_arima",
            "dataset_name": dataset_name,
            "dataset_id": ObjectId(dataset_id) if dataset_id else None,
            "target_field": target_field,
            "order": {"p": order[0], "d": order[1], "q": order[2]},
            "freq": freq,
            "metrics": {
                "aic": float(best["aic"]),
                "train_rows": int(len(y)),
            }
        }

        # Save fitted results (statsmodels results object)
        model_id = _save_model_artifact(res, meta)  # stores results + meta

        return jsonify({
            "model_id": model_id,
            "type": "forecast_arima",
            "order": meta["order"],
            "freq": meta["freq"],
            "metrics": meta["metrics"]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/forecast/predict", methods=["POST"])
def forecast_predict():
    """
    Predict next horizon steps and auto-check + log alerts.

    Body:
    {
      "model_id": "...",
      "horizon": 24
    }
    """
    user_id, role, err = _auth_ok()
    if err:
        return jsonify({"error": err[0]}), err[1]

    body = request.get_json(force=True)
    model_id = body.get("model_id")
    horizon = int(body.get("horizon", 24))
    if not model_id:
        return jsonify({"error": "model_id is required"}), 400

    try:
        model, meta, model_doc = _load_model_artifact(model_id, ensure_type="forecast_arima")

        # permissions
        if role != "admin" and str(model_doc.get("user_id")) != str(user_id):
            return jsonify({"error": "Forbidden"}), 403

        # Rebuild series
        tsdf = _load_timeseries_from_mongo(
            user_id=user_id if role != "admin" else str(model_doc.get("user_id")),
            role=role if role != "admin" else "admin",
            dataset_name=meta.get("dataset_name"),
            dataset_id=str(meta.get("dataset_id")) if meta.get("dataset_id") else None,
            target_field=meta["target_field"]
        )
        y, freq = _to_timeseries(tsdf)

        # Refit ARIMA
        order = (meta["order"]["p"], meta["order"]["d"], meta["order"]["q"])
        refit = ARIMA(y, order=order).fit()

        forecast_res = refit.get_forecast(steps=horizon)
        mean = forecast_res.predicted_mean
        conf = forecast_res.conf_int(alpha=0.05)

        if freq:
            idx = pd.date_range(
                start=y.index[-1] + pd.tseries.frequencies.to_offset(freq),
                periods=horizon,
                freq=freq
            )
        else:
            idx = range(1, horizon + 1)

        out = []
        for i in range(horizon):
            ts_val = (idx[i].isoformat() if hasattr(idx[i], "isoformat") else int(idx[i]))
            out.append({
                "ts": ts_val,
                "yhat": float(mean.iloc[i]),
                "yhat_lower": float(conf.iloc[i, 0]),
                "yhat_upper": float(conf.iloc[i, 1])
            })

        # ---- ALERT CHECK + LOG ----
        triggered = []
        if len(out) > 0:
            latest_point = out[-1]
            latest_val = latest_point["yhat"]
            active_alerts = list(db.alerts.find({
                "user_id": ObjectId(user_id),
                "dataset_name": meta["dataset_name"],
                "field": meta["target_field"],
                "active": True
            }))
            for alert in active_alerts:
                trig = None
                if alert["threshold_type"] == "above" and latest_val > alert["threshold_value"]:
                    trig = f">{alert['threshold_value']}"
                elif alert["threshold_type"] == "below" and latest_val < alert["threshold_value"]:
                    trig = f"<{alert['threshold_value']}"

                if trig:
                    trig_doc = {
                        "alert_id": alert["_id"],
                        "user_id": ObjectId(user_id),
                        "dataset_name": meta["dataset_name"],
                        "field": meta["target_field"],
                        "value": latest_val,
                        "ts": latest_point["ts"],
                        "triggered_at": datetime.utcnow()
                    }
                    db.alert_logs.insert_one(trig_doc)

                    triggered.append({
                        "alert_id": str(alert["_id"]),
                        "rule": trig,
                        "value": latest_val,
                        "ts": latest_point["ts"]
                    })

        return jsonify({
            "model_id": model_id,
            "target_field": meta["target_field"],
            "order": meta["order"],
            "freq": freq or meta.get("freq"),
            "forecast": out,
            "alerts_triggered": triggered
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# STEP 3 Correlation Analysis (future)

@ml_bp.route("/correlation/autocorr", methods=["POST"])
def correlation_autocorr():
    """
    Compute autocorrelation (ACF) for a target field.

    Body:
    {
      "dataset_name": "...",
      "target_field": "...",
      "max_lag": 50
    }
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    body = request.get_json(force=True)
    dataset_name = body.get("dataset_name")
    target_field = body.get("target_field")
    max_lag = int(body.get("max_lag", 50))
    if not dataset_name or not target_field:
        return jsonify({"error": "dataset_name and target_field required"}), 400

    try:
        tsdf = _load_timeseries_from_mongo(user_id, role, dataset_name, target_field=target_field)
        y, freq = _to_timeseries(tsdf)

        acf_vals = acf(y, nlags=max_lag, fft=True)
        out = [{"lag": i, "corr": float(acf_vals[i])} for i in range(len(acf_vals))]

        return jsonify({"dataset_name": dataset_name, "target_field": target_field, "acf": out}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/correlation/cross", methods=["POST"])
def correlation_cross():
    """
    Compute correlation between two dataset fields.

    Body:
    {
      "dataset1": {"name": "...", "field": "..."},
      "dataset2": {"name": "...", "field": "..."}
    }
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    body = request.get_json(force=True)
    d1, f1 = body.get("dataset1", {}).get("name"), body.get("dataset1", {}).get("field")
    d2, f2 = body.get("dataset2", {}).get("name"), body.get("dataset2", {}).get("field")
    if not d1 or not f1 or not d2 or not f2:
        return jsonify({"error": "dataset1/dataset2 with name and field required"}), 400

    try:
        ts1 = _load_timeseries_from_mongo(user_id, role, d1, target_field=f1)
        ts2 = _load_timeseries_from_mongo(user_id, role, d2, target_field=f2)

        y1, _ = _to_timeseries(ts1)
        y2, _ = _to_timeseries(ts2)

        df = pd.concat([y1, y2], axis=1).dropna()
        corr = df.iloc[:,0].corr(df.iloc[:,1])

        return jsonify({
            "dataset1": {"name": d1, "field": f1},
            "dataset2": {"name": d2, "field": f2},
            "correlation": float(corr)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/correlation/matrix", methods=["POST"])
def correlation_matrix():
    """
    Compute correlation matrix across multiple dataset fields.

    Body:
    {
      "fields": [
        {"dataset": "...", "field": "..."},
        {"dataset": "...", "field": "..."}
      ]
    }
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    body = request.get_json(force=True)
    fields = body.get("fields", [])
    if not fields or len(fields) < 2:
        return jsonify({"error": "at least 2 dataset fields required"}), 400

    try:
        dfs = []
        names = []
        for f in fields:
            ds, fld = f.get("dataset"), f.get("field")
            ts = _load_timeseries_from_mongo(user_id, role, ds, target_field=fld)
            y, _ = _to_timeseries(ts)
            dfs.append(y.rename(f"{ds}.{fld}"))
            names.append(f"{ds}.{fld}")

        df_all = pd.concat(dfs, axis=1).dropna()
        corr_matrix = df_all.corr().to_dict()

        return jsonify({"matrix": corr_matrix, "fields": names}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500




# --- ALERTS SYSTEM ---

@ml_bp.route("/alerts/create", methods=["POST"])
def create_alert():
    """
    Create a new alert rule.
    Body:
    {
      "dataset_name": "karachi_weather",
      "field": "temperature",
      "threshold_type": "above",   # "above" | "below"
      "threshold_value": 40
    }
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    body = request.get_json(force=True)
    dataset_name = body.get("dataset_name")
    field = body.get("field")
    threshold_type = body.get("threshold_type")
    threshold_value = body.get("threshold_value")

    if not dataset_name or not field or not threshold_type or threshold_value is None:
        return jsonify({"error": "Missing required fields"}), 400

    alert_doc = {
        "user_id": ObjectId(user_id),
        "role": role,
        "dataset_name": dataset_name,
        "field": field,
        "threshold_type": threshold_type,
        "threshold_value": float(threshold_value),
        "active": True,
        "created_at": datetime.utcnow()
    }
    db.alerts.insert_one(alert_doc)

    return jsonify({"message": "✅ Alert created", "alert": str(alert_doc)}), 200


@ml_bp.route("/alerts/fetch", methods=["GET"])
def fetch_alerts():
    """
    Get all alerts for current user.
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    alerts = list(db.alerts.find({"user_id": ObjectId(user_id)}))
    for a in alerts:
        a["_id"] = str(a["_id"])
        a["user_id"] = str(a["user_id"])
    return jsonify({"alerts": alerts}), 200


@ml_bp.route("/alerts/check", methods=["POST"])
def check_alerts():
    """
    Check all active alerts for current user and return triggered ones.
    """
    user_id, role, err = _auth_ok()
    if err: return jsonify({"error": err[0]}), err[1]

    active_alerts = list(db.alerts.find({"user_id": ObjectId(user_id), "active": True}))
    triggered = []

    for alert in active_alerts:
        try:
            tsdf = _load_timeseries_from_mongo(
                user_id, role,
                dataset_name=alert["dataset_name"],
                dataset_id=None,
                target_field=alert["field"]
            )
            if len(tsdf) == 0:
                continue
            latest_val = tsdf["value"].iloc[-1]

            if alert["threshold_type"] == "above" and latest_val > alert["threshold_value"]:
                triggered.append({
                    "alert_id": str(alert["_id"]),
                    "dataset": alert["dataset_name"],
                    "field": alert["field"],
                    "value": float(latest_val),
                    "rule": f">{alert['threshold_value']}"
                })
            elif alert["threshold_type"] == "below" and latest_val < alert["threshold_value"]:
                triggered.append({
                    "alert_id": str(alert["_id"]),
                    "dataset": alert["dataset_name"],
                    "field": alert["field"],
                    "value": float(latest_val),
                    "rule": f"<{alert['threshold_value']}"
                })
        except Exception as e:
            print("Error checking alert:", e)

    return jsonify({"triggered": triggered}), 200

@ml_bp.route("/alerts/logs", methods=["GET"])
def get_alert_logs():
    """
    Fetch triggered alert logs for the authenticated user.

    Query params:
      ?limit=50     → limit number of logs (default 100)
      ?dataset_name=...  → filter by dataset
      ?field=...         → filter by field
      ?alert_id=...      → filter by a specific alert
    """
    user_id, role, err = _auth_ok()
    if err: 
        return jsonify({"error": err[0]}), err[1]

    try:
        limit = int(request.args.get("limit", 100))
        query = {}

        # Admins can view all logs, normal users only theirs
        if role != "admin":
            query["user_id"] = ObjectId(user_id)

        # Optional filters
        if "dataset_name" in request.args:
            query["dataset_name"] = request.args["dataset_name"]
        if "field" in request.args:
            query["field"] = request.args["field"]
        if "alert_id" in request.args:
            try:
                query["alert_id"] = ObjectId(request.args["alert_id"])
            except:
                return jsonify({"error": "Invalid alert_id"}), 400

        logs = list(db.alert_logs.find(query).sort("triggered_at", -1).limit(limit))

        out = []
        for log in logs:
            out.append({
                "log_id": str(log["_id"]),
                "alert_id": str(log["alert_id"]),
                "dataset_name": log["dataset_name"],
                "field": log["field"],
                "value": log["value"],
                "ts": log["ts"].isoformat() if hasattr(log["ts"], "isoformat") else str(log["ts"]),
                "triggered_at": log["triggered_at"].isoformat() if hasattr(log["triggered_at"], "isoformat") else str(log["triggered_at"]),
                "source": log.get("source", "unknown")
            })

        return jsonify({"logs": out}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

