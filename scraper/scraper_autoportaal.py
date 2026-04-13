from playwright.sync_api import sync_playwright
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY
import json
import re
import time

MAKES = {
    'Alfa Romeo': (99, 'alfa-romeo'), 'Audi': (12, 'audi'), 'Bentley': (105, 'bentley'),
    'BMW': (15, 'bmw'), 'Cadillac': (104, 'cadillac'), 'Chevrolet': (101, 'chevrolet'),
    'Chrysler': (103, 'chrysler'), 'Citroen': (93, 'citroen'), 'CUPRA': (111, 'cupra'),
    'Dacia': (96, 'dacia'), 'Dodge': (102, 'dodge'), 'Ferrari': (108, 'ferrari'),
    'Fiat': (97, 'fiat'), 'Ford': (32, 'ford'), 'Honda': (34, 'honda'),
    'Hyundai': (3, 'hyundai'), 'Infiniti': (110, 'infiniti'), 'Jaguar': (98, 'jaguar'),
    'Jeep': (41, 'jeep'), 'Kia': (42, 'kia'), 'Lamborghini': (107, 'lamborghini'),
    'Land Rover': (46, 'land-rover'), 'Lexus': (48, 'lexus'), 'Maserati': (106, 'maserati'),
    'Mazda': (57, 'mazda'), 'Mercedes-Benz': (59, 'mercedes'), 'MINI': (95, 'mini'),
    'Mitsubishi': (62, 'mitsubishi'), 'Nissan': (64, 'nissan'), 'Opel': (67, 'opel'),
    'Peugeot': (68, 'peugeot'), 'Polestar': (112, 'polestar'), 'Porsche': (72, 'porsche'),
    'Renault': (74, 'renault'), 'Rolls-Royce': (109, 'rolls-royce'), 'Saab': (100, 'saab'),
    'SEAT': (94, 'seat'), 'Skoda': (83, 'skoda'), 'Subaru': (82, 'subaru'),
    'Suzuki': (84, 'suzuki'), 'Tesla': (86, 'tesla'), 'Toyota': (4, 'toyota'),
    'Volkswagen': (91, 'volkswagen'), 'Volvo': (90, 'volvo')
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

FUEL_MAP = {
    'Diesel': 'Diisel', 'Petrol': 'Bensiin', 'Hybrid': 'Hübriid',
    'Plug-in Hybrid': 'Hübriid', 'Electric': 'Elekter', 'Gas': 'Gaasbensiin'
}

def parse_json_listings(html, make_name):
    matches = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    listings = []
    for match in matches:
        try:
            data = json.loads(match)
            if isinstance(data, list):
                for item in data:
                    listing = parse_item(item, make_name)
                    if listing:
                        listings.append(listing)
            elif isinstance(data, dict):
                listing = parse_item(data, make_name)
                if listing:
                    listings.append(listing)
        except:
            pass
    return listings

def parse_item(item, make_name):
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
            'url': url, 'title': name, 'model': model, 'make': make_name,
            'description': item.get('description', '')[:200] if item.get('description') else None,
            'price_eur': int(price), 'year': int(year) if year else None,
            'mileage_km': int(mileage) if mileage else None,
            'fuel': fuel, 'transmission': transmission,
            'body': item.get('bodyType'), 'drive': None,
            'image_url': image_url, 'source': 'autoportaal'
        }
    except:
        return None

def scrape_make(page, make_name, make_id, make_slug):
    total = 0
    page_num = 0
    while True:
        url = f"https://autoportaal.ee/et/{make_slug}?ok=1&make_id={make_id}&page={page_num}"
        print(f"  Page {page_num + 1}...")
        page.goto(url, timeout=30000)
        page.wait_for_timeout(3000)
        html = page.content()
        listings = parse_json_listings(html, make_name)
        if not listings:
            break
        supabase.table('listings').upsert(listings, on_conflict='url').execute()
        total += len(listings)
        print(f"    Saved {len(listings)} listings")
        next_btn = page.query_selector('a[href*="page="]')
        if not next_btn:
            break
        page_num += 1
        time.sleep(2)
    return total

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    grand_total = 0
    for make_name, (make_id, make_slug) in MAKES.items():
        print(f"\nScraping {make_name}...")
        count = scrape_make(page, make_name, make_id, make_slug)
        print(f"  {make_name}: {count} listings")
        grand_total += count
        time.sleep(3)
    browser.close()

print(f"\nAll done. Total: {grand_total} listings")
