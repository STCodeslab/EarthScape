from flask import Flask
from flask_cors import CORS

from weather import weather_bp
from Auth.login import login_bp
from Auth.register import register_bp
from Auth.profile_bp import profile_bp
from Auth.logout import logout_bp

from Admin.add_admin import add_admin_bp
from Admin.admin_list import admin_list_bp
from Admin.delete_admin import delete_admin_bp
from Admin.update_admin import update_admin_bp
from Feedback.feedback import feedback_bp

from ingestion.upload_csv import upload_csv_bp
from ingestion.datasets import datasets_bp
from ingestion.upload_weather_bp import upload_weather_bp
from ingestion.upload_imagery import upload_imagery_bp

from processing.processing_bp import processing_bp

from realtime.realtime import realtime_bp
from realtime.realtime_alerts import alerts_bp 

from machinelearning.ml_blueprint import ml_bp
from scheduler.scheduler import start_scheduler





app = Flask(__name__)

# Allow all origins & methods (for dev)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Register blueprints
app.register_blueprint(weather_bp, url_prefix="/api")
app.register_blueprint(login_bp, url_prefix="/api")
app.register_blueprint(register_bp, url_prefix="/api")
app.register_blueprint(profile_bp, url_prefix="/api")
app.register_blueprint(logout_bp, url_prefix="/api")

app.register_blueprint(add_admin_bp, url_prefix="/api")
app.register_blueprint(admin_list_bp, url_prefix="/api")
app.register_blueprint(delete_admin_bp, url_prefix="/api")
app.register_blueprint(update_admin_bp, url_prefix="/api")
app.register_blueprint(feedback_bp, url_prefix="/api")

app.register_blueprint(upload_csv_bp, url_prefix="/api")
app.register_blueprint(datasets_bp, url_prefix="/api")
app.register_blueprint(upload_weather_bp, url_prefix="/api")  
app.register_blueprint(upload_imagery_bp, url_prefix="/api")

app.register_blueprint(processing_bp, url_prefix="/api")

app.register_blueprint(realtime_bp, url_prefix="/api")
app.register_blueprint(alerts_bp, url_prefix="/api/ml")

app.register_blueprint(ml_bp, url_prefix="/api/ml")

if __name__ == "__main__":
    start_scheduler()
    app.run(debug=True)
