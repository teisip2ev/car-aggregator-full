import urllib.request
import json
import time
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

FUEL_MAP = {
    'petrol': 'Bensiin', 'diesel': 'Diisel', 'hybrid': 'Hübriid',
    'electric': 'Elekter', 'plug_in_hybrid': 'Hübriid', 'gas': 'Gaasbensiin',
    'ethanol': 'Bensiin'
}
TRANSMISSION_MAP = {
    'automatic': 'Automaat', 'manual': 'Käsitsi'
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_page(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
    })
    response = urllib.request.urlopen(req, timeout=15)
    return json.loads(response.read().decode())

def parse_listing(item):
    try:
        vehicle_id = item.get('id')
        url = f"https://autodiiler.ee/et/vehicles/{vehicle_id}"
        name = item.get('name', '')
        model = item.get('brandModel', {}).get('name', '')
        price = item.get('price')
        if not price:
            return None
        year = None
        reg_date = item.get('registered_date', '')
        if reg_date:
            year = int(reg_date[:4])
        mileage = item.get('mileage')
        fuel_raw = item.get('fuel_type', {}).get('value', '')
        fuel = FUEL_MAP.get(fuel_raw, fuel_raw)
        transmission_raw = item.get('transmission_type', {}).get('value', '')
        transmission = TRANSMISSION_MAP.get(transmission_raw, transmission_raw)
        drive = item.get('drive_type', {}).get('label')
        images = item.get('images', [])
        image_url = images[0].get('small') if images else None
        description = item.get('seo', {}).get('description', '')
        return {
            'url': url,
            'title': name,
            'model': model,
            'description': description[:200] if description else None,
            'price_eur': int(price),
            'year': year,
            'mileage_km': int(mileage) if mileage else None,
            'fuel': fuel,
            'transmission': transmission,
            'body': item.get('vehicleBodyType', {}).get('name'),
            'drive': drive,
            'image_url': image_url,
            'source': 'autodiiler'
        }
    except:
        return None

print("Scraping all autodiiler listings...")
total = 0
page_num = 1
next_url = "https://garage.autodiiler.ee/api/v1/vehicles?locale=et"

while next_url:
    print(f"  Page {page_num}...")
    try:
        data = fetch_page(next_url)
    except Exception as e:
        print(f"  Error fetching: {e}")
        break
    listings = []
    for item in data.get('data', []):
        parsed = parse_listing(item)
        if parsed:
            listings.append(parsed)
    if listings:
        try:
            supabase.table('listings').upsert(listings, on_conflict='url').execute()
            total += len(listings)
            print(f"    Saved {len(listings)} listings")
        except Exception as e:
            print(f"  Error saving: {e}")
            time.sleep(5)
    next_url = data.get('meta', {}).get('pagination', {}).get('links', {}).get('next')
    page_num += 1
    time.sleep(1)

print(f"\nAll done. Total: {total} listings")
