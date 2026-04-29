import urllib.request
import json
import time
from datetime import date as _date, datetime, timezone
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

MAKES = {
    'Alfa Romeo': 6, 'Audi': 15, 'Bentley': 18, 'BMW': 19, 'Cadillac': 24,
    'Chevrolet': 26, 'Chrysler': 27, 'Citroen': 28, 'CUPRA': 30, 'Dacia': 31,
    'Dodge': 38, 'Ferrari': 43, 'Fiat': 44, 'Ford': 46, 'Honda': 53,
    'Hyundai': 57, 'Infiniti': 59, 'Jaguar': 62, 'Jeep': 63, 'Kia': 65,
    'Lamborghini': 69, 'Land Rover': 71, 'Lexus': 72, 'Maserati': 79,
    'Mazda': 82, 'Mercedes-Benz': 84, 'MINI': 88, 'Mitsubishi': 89,
    'Nissan': 93, 'Opel': 96, 'Peugeot': 98, 'Polestar': 101, 'Porsche': 103,
    'Renault': 106, 'Rolls-Royce': 108, 'Saab': 110, 'SEAT': 113, 'Skoda': 114,
    'Subaru': 117, 'Suzuki': 118, 'Tesla': 119, 'Toyota': 120,
    'Volkswagen': 125, 'Volvo': 126
}

FUEL_MAP = {
    'fuel-abbr-petrol': 'Bensiin',
    'fuel-abbr-diesel': 'Diisel',
    'fuel-abbr-hybrid': 'Hübriid',
    'fuel-abbr-hybrid-petrol': 'Hübriid',
    'fuel-abbr-hybrid-diesel': 'Hübriid',
    'fuel-abbr-electric': 'Elekter',
    'fuel-abbr-petrol-lpg': 'Gaasbensiin',
    'fuel-abbr-petrol-cng': 'Gaasbensiin',
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

RUN_START = datetime.now(timezone.utc).isoformat()
SAFETY_MINIMUM = 50

def fetch_page(make_id, page):
    url = 'https://api.veego.ee/api/v2/search'
    payload = json.dumps({
        'make_id': make_id, 'is_new': 0, 'per_page': 30,
        'page': page, 'is_rent': False, 'count': 2
    }).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'Origin': 'https://veego.ee', 'Referer': 'https://veego.ee/'
    })
    response = urllib.request.urlopen(req, timeout=15)
    return json.loads(response.read().decode())

def parse_listing(item, make_name):
    try:
        vehicle_id = item.get('id')
        url = f"https://veego.ee/kasutatud-autod/{vehicle_id}"
        title = item.get('title', '')
        price = item.get('active_price') or item.get('price')
        if not price:
            return None
        year = item.get('year')
        mileage = item.get('odometer')
        fuel_raw = item.get('fuel', '')
        fuel = FUEL_MAP.get(fuel_raw, fuel_raw)
        gearbox = item.get('gearbox', '')
        if gearbox == 'A':
            transmission = 'Automaat'
        elif gearbox == 'M':
            transmission = 'Manuaal'
        elif gearbox == 'S':
            transmission = 'Poolautomaat'
        else:
            transmission = None
        images = item.get('images', [])
        image_url = images[0].get('thumb_data_sm') if images else None
        annual_tax = item.get('annual_tax')
        registration_tax = item.get('registration_tax')
        return {
            'url': url, 'title': title, 'model': None, 'make': make_name,
            'description': None, 'price_eur': int(price),
            'year': int(year) if year else None,
            'mileage_km': int(mileage) if mileage else None,
            'fuel': fuel, 'transmission': transmission,
            'body': None, 'drive': None,
            'image_url': image_url, 'source': 'veego',
            'country': 'EE',
            'annual_tax': int(annual_tax) if annual_tax else None,
            'registration_tax': int(registration_tax) if registration_tax else None,
            'last_seen_at': RUN_START,
        }
    except:
        return None

grand_total = 0
for make_name, make_id in MAKES.items():
    print(f"\nScraping {make_name}...")
    page = 1
    make_total = 0
    while True:
        try:
            data = fetch_page(make_id, page)
        except Exception as e:
            print(f"  Error: {e}")
            break
        results = data.get('results', [])
        if not results:
            break
        listings = [l for l in (parse_listing(r, make_name) for r in results) if l]
        if listings:
            for attempt in range(3):
                try:
                    supabase.table('listings').upsert(listings, on_conflict='url').execute()
                    history = [{'url': l['url'], 'price_eur': l['price_eur'], 'scraped_date': str(_date.today())} for l in listings if l.get('price_eur')]
                    if history:
                        supabase.table('price_history').insert(history).execute()
                    make_total += len(listings)
                    print(f"  Page {page}: saved {len(listings)}")
                    break
                except Exception as e:
                    print(f"  Save error (attempt {attempt+1}): {e}")
                    time.sleep(10)
        total_pages = data.get('pages', 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(1)
    print(f"  {make_name}: {make_total} listings")
    grand_total += make_total
    time.sleep(2)

print(f"\nAll done. Total scraped: {grand_total}")

if grand_total >= SAFETY_MINIMUM:
    print(f"\nCleaning up stale veego listings (not seen since {RUN_START})...")
    try:
        result = supabase.table("listings") \
            .delete() \
            .eq("source", "veego") \
            .lt("last_seen_at", RUN_START) \
            .execute()
        deleted = len(result.data) if result.data else 0
        print(f"Deleted {deleted} stale listings from veego")
    except Exception as e:
        print(f"Cleanup error: {e}")
else:
    print(f"\nSkipping cleanup — only scraped {grand_total} listings (minimum is {SAFETY_MINIMUM}). Something may have gone wrong.")
