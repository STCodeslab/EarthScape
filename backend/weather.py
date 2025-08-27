from flask import Blueprint, request, jsonify
import requests
from db import search_collection
import os
import datetime

weather_bp = Blueprint("weather_bp", __name__)
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")  # Make sure this is set

@weather_bp.route("/weather")
def get_weather():
    city = request.args.get("city")
    if not city:
        return jsonify({"error": "Please provide a city or country name."}), 400

    try:
        # Capitalize first letter to help OpenWeatherMap
        city = city.strip().title()

        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&units=metric&appid={WEATHER_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        unix_ts = data.get("dt")
        formatted_date = datetime.datetime.utcfromtimestamp(unix_ts).strftime("%Y/%m/%d") if unix_ts else None

        # Save search to MongoDB
        search_collection.insert_one({
            "city": city,
            "timestamp": formatted_date
        })

        result = {
            "city": data.get("name"),
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"]
        }
        return jsonify(result)

    except requests.HTTPError:
        return jsonify({"error": "City not found. Please enter a valid city or country."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
