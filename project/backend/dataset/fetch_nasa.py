import requests
import csv
import random
import time

CSV_FILE = "nasa_power.csv"

# NASA POWER base URL
BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# Parameters we want (Climate Indicators)
PARAMETERS = [
    "T2M",                # Temperature at 2m (°C)
    "PRECTOTCORR",        # Precipitation (mm/day)
    "RH2M",               # Relative Humidity at 2m (%)
    "WS2M",               # Wind Speed at 2m (m/s)
    "ALLSKY_SFC_SW_DWN"   # Solar Radiation (MJ/m²/day)
]

# CSV headers
fields = [
    "datetime", "latitude", "longitude",
    "temperature", "precipitation",
    "humidity", "wind_speed", "solar_radiation"
]

def fetch_climate(lat, lon):
    url = (
        f"{BASE_URL}?parameters={','.join(PARAMETERS)}"
        f"&community=RE"
        f"&longitude={lon}&latitude={lat}"
        f"&start=20200101&end=20200103&format=JSON"
    )
    response = requests.get(url, timeout=10)
    if response.status_code != 200:
        raise Exception(f"API error: {response.status_code}")

    data = response.json()
    # Pick first day available
    date_key = list(data["properties"]["parameter"]["T2M"].keys())[0]

    return {
        "datetime": date_key,
        "latitude": lat,
        "longitude": lon,
        "temperature": data["properties"]["parameter"]["T2M"][date_key],
        "precipitation": data["properties"]["parameter"]["PRECTOTCORR"][date_key],
        "humidity": data["properties"]["parameter"]["RH2M"][date_key],
        "wind_speed": data["properties"]["parameter"]["WS2M"][date_key],
        "solar_radiation": data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"][date_key]
    }

# Write CSV
with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()

    records = 0
    while records < 500:   # Limit to 500 records
        lat = round(random.uniform(-60, 60), 2)   # POWER valid range
        lon = round(random.uniform(-180, 180), 2)

        try:
            climate = fetch_climate(lat, lon)
            writer.writerow(climate)
            records += 1
            print(f"✅ Record {records} saved (Lat: {lat}, Lon: {lon})")
        except Exception as e:
            print(f"❌ Failed for ({lat}, {lon}): {e}")

        time.sleep(0.1)  # Faster requests (100ms delay)

print("🎉 Climate Indicators dataset (500 records) saved to", CSV_FILE)
