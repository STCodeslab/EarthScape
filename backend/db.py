# db.py
import os
from pymongo import MongoClient

# Use your existing env var, but default to a local replica set so Change Streams work in dev.
# NOTE: Change Streams require a replica set (Atlas already is one).
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/?replicaSet=rs0")

# Your DB name is earthscape (kept as-is), but allow override via env if needed.
DB_NAME = os.getenv("MONGO_DB", "earthscape")

client = MongoClient(MONGO_URL)  # you can add serverSelectionTimeoutMS if you like
db = client[DB_NAME]

# Collections (kept exactly as you have them)
search_collection = db.search_history
users_collection = db.users
feedback_collection = db.feedbacks
datasets_collection = db.datasets
satellite_imagery_collection = db.satellite_imagery
