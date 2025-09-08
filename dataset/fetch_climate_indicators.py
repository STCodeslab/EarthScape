import csv
import random
from datetime import datetime, timedelta

CSV_FILE = "climate_indicators.csv"

# CSV headers
fields = [
    "date", "latitude", "longitude",
    "co2_ppm", "ndvi", "aerosol_index",
    "sea_surface_temp", "ice_cover"
]

# Generate random realistic values
def generate_record(lat, lon, date):
    return {
        "date": date.strftime("%Y-%m-%d"),
        "latitude": lat,
        "longitude": lon,
        "co2_ppm": round(random.uniform(400, 430), 2),          # ppm (real: ~420 ppm)
        "ndvi": round(random.uniform(-0.1, 0.9), 2),            # NDVI range (-1 to 1)
        "aerosol_index": round(random.uniform(0, 2), 2),        # AI range (0 = clear, >1 = polluted)
        "sea_surface_temp": round(random.uniform(-2, 30), 2),   # °C (polar to tropics)
        "ice_cover": round(random.uniform(0, 100), 2)           # % cover (0–100)
    }

# Write CSV
with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()

    start_date = datetime(2020, 1, 1)
    records = 500   # limit dataset size (can increase)

    for i in range(records):
        lat = round(random.uniform(-90, 90), 2)
        lon = round(random.uniform(-180, 180), 2)
        date = start_date + timedelta(days=random.randint(0, 365 * 3))  # 2020–2022

        row = generate_record(lat, lon, date)
        writer.writerow(row)

print(f"🎉 Dataset 3 saved as {CSV_FILE} with {records} records")
