import requests
import csv
import random
import time
from datetime import datetime

API_KEY = "d8e33cdc9998b6b507b37b5ffc2b8c04"
CSV_FILE = "weather_data.csv"

# Big sample list of cities (you can extend this list)
city_list = [
    "London", "New York", "Paris", "Tokyo", "Karachi", "Delhi", "Dubai", "Berlin", "Moscow", "Beijing",
    "Rome", "Istanbul", "Los Angeles", "Madrid", "Toronto", "Chicago", "Hong Kong", "Bangkok", "Seoul", "Sydney",
    "Cairo", "Kabul", "Colombo", "Dhaka", "Jakarta", "Tehran", "Baghdad", "Kuwait City", "Doha", "Riyadh",
    "Nairobi", "Lagos", "Cape Town", "Mexico City", "Rio de Janeiro", "Sao Paulo", "Buenos Aires", "Lima", "Santiago", "Bogota"
]

# CSV headers
fields = [
    "datetime", "city", "latitude", "longitude",
    "temperature", "temp_min", "temp_max",
    "humidity", "pressure",
    "wind_speed", "wind_deg",
    "precipitation", "description"
]

def fetch_weather(city):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"API error: {response.status_code}")
    data = response.json()
    
    precipitation = data.get("rain", {}).get("1h", 0)
    
    return {
        "datetime": datetime.utcfromtimestamp(data["dt"]).strftime("%Y-%m-%d %H:%M:%S"),
        "city": data["name"],
        "latitude": data["coord"]["lat"],
        "longitude": data["coord"]["lon"],
        "temperature": data["main"]["temp"],
        "temp_min": data["main"]["temp_min"],
        "temp_max": data["main"]["temp_max"],
        "humidity": data["main"]["humidity"],
        "pressure": data["main"]["pressure"],
        "wind_speed": data["wind"]["speed"],
        "wind_deg": data["wind"]["deg"],
        "precipitation": precipitation,
        "description": data["weather"][0]["description"]
    }

# Write data into CSV
with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()

    records = 0
    while records < 1000:
        city = random.choice(city_list)
        try:
            weather = fetch_weather(city)
            writer.writerow(weather)
            records += 1
            print(f"✅ Record {records} saved ({city})")
        except Exception as e:
            print(f"❌ Failed for {city}: {e}")

        # Sleep to respect API limits
        time.sleep(1)   # adjust if hitting API rate limits
