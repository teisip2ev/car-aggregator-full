import urllib.request
import json
import time
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

MAKES = {
    'Alfa Romeo': 1, 'Audi': 2, 'Bentley': 38, 'BMW': 3, 'Cadillac': 39,
    'Chevrolet': 56, 'Chrysler': 4, 'Citroen': 5, 'CUPRA': 79, 'Dacia': 55,
    'Dodge': 57, 'Ferrari': 40, 'Fiat': 8, 'Ford': 9, 'Honda': 10,
    'Hyundai': 11, 'Infiniti': 60, 'Jaguar': 12, 'Jeep': 52, 'Kia': 13,
    'Lamborghini': 42, 'Land Rover': 50, 'Lexus': 16, 'Maserati': 44,
    'Mazda': 17, 'Mercedes-Benz': 18, 'MINI': 51, 'Mitsubishi': 19,
    'Nissan': 20, 'Opel': 21, 'Peugeot': 22, 'Polestar': 80, 'Porsche': 23,
    'Renault': 25, 'Rolls-Royce': 46, 'Saab': 27, 'SEAT': 28, 'Skoda': 29,
    'Subaru': 30, 'Suzuki': 31, 'Tesla': 61, 'Toyota': 32,
    'Volkswagen': 34, 'Volvo': 33
}

FUEL_MAP = {
    'petrol': 'Bensiin', 'diesel': 'Diisel', 'hybrid': 'Hübriid',
    'electric': 'Elekter', 'plug_in_hybrid': 'Hübriid', 'gas': 'Gaasbensiin',
    'ethanol': 'Bensiin'
}
TRANSMISSION_MAP = {
    'automatic': 'Automaat', 'manual': 'Manuaal', 'semi-automatic': 'Poolautomaat'
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_page(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
    })
    response = urllib.request.urlopen(req, timeout=15)
    return json.loads(response.read().decode())

def parse_listing(item, make_name):
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
            'url': url, 'title': name, 'model': model, 'make': item.get('brand', {}).get('name') or make_name,
            'description': description[:200] if description else None,
            'price_eur': int(price), 'year': year,
            'mileage_km': int(mileage) if mileage else None,
            'fuel': fuel, 'transmission': transmission,
            'body': item.get('vehicleBodyType', {}).get('name'),
            'drive': drive, 'image_url': image_url, 'source': 'autodiiler'
        }
    except:
        return None

def scrape_make(make_name, brand_id):
    total = 0
    page_num = 1
    next_url = f"https://garage.autodiiler.ee/api/v1/vehicles?ba={brand_id}&locale=et"
    while next_url:
        print(f"  Page {page_num}...")
        try:
            data = fetch_page(next_url)
        except Exception as e:
            print(f"  Error fetching: {e}")
            break
        listings = [l for l in (parse_listing(item, make_name) for item in data.get('data', [])) if l]
        if listings:
            try:
                supabase.table('listings').upsert(listings, on_conflict='url').execute()
                history = [{'url': l['url'], 'price_eur': l['price_eur']} for l in listings if l.get('price_eur')]
                if history:
                    supabase.table('price_history').insert(history).execute()
                total += len(listings)
                print(f"    Saved {len(listings)} listings")
            except Exception as e:
                print(f"  Error saving: {e}")
                time.sleep(5)
        next_url = data.get('meta', {}).get('pagination', {}).get('links', {}).get('next')
        page_num += 1
        time.sleep(1)
    return total

grand_total = 0
for make_name, brand_id in MAKES.items():
    print(f"\nScraping {make_name}...")
    count = scrape_make(make_name, brand_id)
    print(f"  {make_name}: {count} listings")
    grand_total += count
    time.sleep(2)

print(f"\nAll done. Total: {grand_total} listings")
