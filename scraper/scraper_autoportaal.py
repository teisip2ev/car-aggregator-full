from playwright.sync_api import sync_playwright
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY
import json
import re
import time

MAKES = {
    'Audi': 12, 'BMW': 15, 'Ford': 32, 'Honda': 34, 'Hyundai': 3,
    'Jeep': 41, 'Kia': 42, 'Land Rover': 46, 'Lexus': 48, 'Mazda': 57,
    'Mercedes-Benz': 59, 'Mitsubishi': 62, 'Nissan': 64, 'Opel': 67,
    'Peugeot': 68, 'Porsche': 72, 'Renault': 74, 'Subaru': 83,
    'Suzuki': 84, 'Tesla': 86, 'Toyota': 4, 'Volkswagen': 91, 'Volvo': 90
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

FUEL_MAP = {
    'Diesel': 'Diisel', 'Petrol': 'Bensiin', 'Hybrid': 'Hübriid',
    'Plug-in Hybrid': 'Hübriid', 'Electric': 'Elekter', 'Gas': 'Gaasbensiin'
}

def parse_json_listings(html):
    matches = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    listings = []
    for match in matches:
        try:
            data = json.loads(match)
            if isinstance(data, list):
                for item in data:
                    listing = parse_item(item)
                    if listing:
                        listings.append(listing)
            elif isinstance(data, dict):
                listing = parse_item(data)
                if listing:
                    listings.append(listing)
        except:
            pass
    return listings

def parse_item(item):
    if item.get('@type') != 'Product':
        return None
    try:
        offer = item.get('offers', [{}])
        if isinstance(offer, list):
            offer = offer[0] if offer else {}
        price = offer.get('price')
        url = offer.get('url', '')
        if not price or not url:
            return None
        fuel_raw = item.get('vehicleEngine', {}).get('fuelType') or item.get('fuelType', '')
        transmission_raw = item.get('vehicleTransmission', '')
        images = item.get('image', [])
        image_url = images[0] if images else None
        name = item.get('name', '')
        model = item.get('model', '')
        year = item.get('modelDate') or item.get('vehicleModelDate')
        mileage = item.get('mileageFromOdometer', {}).get('value')
        fuel = FUEL_MAP.get(fuel_raw, fuel_raw)
        if 'Automatic' in transmission_raw:
            transmission = 'Automaat'
        elif 'Manual' in transmission_raw:
            transmission = 'Käsitsi'
        else:
            transmission = transmission_raw
        return {
            'url': url,
            'title': name,
            'model': model,
            'description': item.get('description', '')[:200] if item.get('description') else None,
            'price_eur': int(price),
            'year': int(year) if year else None,
            'mileage_km': int(mileage) if mileage else None,
            'fuel': fuel,
            'transmission': transmission,
            'body': item.get('bodyType'),
            'drive': None,
            'image_url': image_url,
            'source': 'autoportaal'
        }
    except:
        return None

def scrape_make(page, make_name, make_id):
    total = 0
    page_num = 0
    while True:
        url = f"https://autoportaal.ee/et/{make_name.lower().replace(' ', '-').replace('-benz', '')}?ok=1&make_id={make_id}&page={page_num}"
        print(f"  Page {page_num + 1}...")
        page.goto(url, timeout=30000)
        page.wait_for_timeout(3000)
        html = page.content()
        listings = parse_json_listings(html)
        if not listings:
            print("  No listings found, stopping.")
            break
        supabase.table('listings').upsert(listings, on_conflict='url').execute()
        total += len(listings)
        print(f"    Saved {len(listings)} listings")
        next_btn = page.query_selector('a[href*="page="]')
        if not next_btn:
            print("  No next page, done.")
            break
        page_num += 1
        time.sleep(2)
    return total

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    grand_total = 0
    for make_name, make_id in MAKES.items():
        print(f"\nScraping {make_name}...")
        count = scrape_make(page, make_name, make_id)
        print(f"  {make_name}: {count} listings")
        grand_total += count
        time.sleep(3)
    browser.close()

print(f"\nAll done. Total: {grand_total} listings")
