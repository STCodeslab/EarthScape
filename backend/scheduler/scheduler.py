# scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from scheduler.tasks import retrain_models

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run every 1 minute for demo
    scheduler.add_job(retrain_models, "interval", minutes=1)

    # Example: run daily at midnight
    # scheduler.add_job(retrain_models, "cron", hour=0, minute=0)

    scheduler.start()
    atexit.register(lambda: scheduler.shutdown())
