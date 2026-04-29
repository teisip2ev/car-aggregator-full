import urllib.request
import re
import time
from datetime import date as _date, datetime, timezone
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

MAKES = [
    'audi', 'bmw', 'mercedes', 'volkswagen', 'volvo', 'toyota',
    'ford', 'skoda', 'opel', 'renault', 'peugeot', 'kia', 'hyundai',
    'nissan', 'honda', 'porsche', 'land-rover', 'lexus', 'mazda',
    'suzuki', 'subaru', 'mitsubishi', 'jeep', 'tesla', 'citroen',
    'seat', 'mini', 'dacia', 'chevrolet', 'fiat', 'jaguar',
    'alfa-romeo', 'dodge', 'infiniti', 'cupra', 'polestar'
]

TRANSMISSION_MAP = {
    'manual': 'Manuaal', 'automaat': 'Automaat', 'automatic': 'Automaat',
    'manualis': 'Manuaal', 'mechanika': 'Manuaal', 'automat': 'Automaat',
    'tiptronic': 'Automaat', 'variator': 'Automaat', 'robots': 'Poolautomaat',
    'mehaanika': 'Manuaal', 'mehānika': 'Manuaal', 'automātiskā': 'Automaat',
    'automatiska': 'Automaat', 'manuālā': 'Manuaal', 'manuala': 'Manuaal',
    'automats': 'Automaat', 'avtomats': 'Automaat', 'mehanika': 'Manuaal'
}

FUEL_MAP = {
    'diesel': 'Diisel', 'benzin': 'Bensiin', 'petrol': 'Bensiin',
    'elektro': 'Elekter', 'electric': 'Elekter', 'hybrid': 'Hubriid',
    'gas': 'Gaasbensiin', 'lpg': 'Gaasbensiin',
    'dizels': 'Diisel', 'dīzelis': 'Diisel', 'dizelis': 'Diisel',
    'benzīns': 'Bensiin', 'benzins': 'Bensiin', 'elektrisk': 'Elekter',
    'hibrīds': 'Hubriid', 'hibrids': 'Hubriid', 'gāze': 'Gaasbensiin'
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

RUN_START = datetime.now(timezone.utc).isoformat()
SAFETY_MINIMUM = 50

def fetch_page(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    })
    resp = urllib.request.urlopen(req, timeout=15)
    return resp.read().decode('utf-8', errors='ignore')

def parse_price(raw):
    try:
        return int(re.sub(r'[^\d]', '', raw))
    except:
        return None

def parse_listing(row, make_name):
    try:
        url_match = re.search(r'href="(/msg/en/transport/cars/[^"]+)"', row)
        if not url_match:
            return None
        url = 'https://www.ss.lv' + url_match.group(1)

        title_match = re.search(r'class="am"[^>]*>([^<]+)<', row)
        title = title_match.group(1).strip() if title_match else ''

        img_match = re.search(r'<img src="([^"]+)"', row)
        image_url = img_match.group(1).replace('.th2.', '.800.') if img_match else None

        cells = re.findall(r'class="msga2-o pp6"[^>]*>([^<]+)<', row)

        model = cells[0].strip() if len(cells) > 0 else None
        year = int(cells[1].strip()) if len(cells) > 1 and cells[1].strip().isdigit() else None
        engine = cells[2].strip() if len(cells) > 2 else ''
        price_raw = cells[3].strip() if len(cells) > 3 else None
        price = parse_price(price_raw) if price_raw else None

        if not price or price < 100:
            return None

        title_lower = title.lower()
        transmission = None
        for key, val in TRANSMISSION_MAP.items():
            if key in title_lower:
                transmission = val
                break

        fuel = None
        combined = (title_lower + ' ' + engine.lower())
        for key, val in FUEL_MAP.items():
            if key in combined:
                fuel = val
                break

        return {
            'url': url,
            'title': title[:200] if title else None,
            'make': make_name,
            'model': model,
            'description': None,
            'price_eur': price,
            'year': year,
            'mileage_km': None,
            'fuel': fuel,
            'transmission': transmission,
            'body': None,
            'drive': None,
            'image_url': image_url,
            'source': 'sslv',
            'country': 'LV',
            'last_seen_at': RUN_START,
        }
    except:
        return None

def scrape_make(make_slug, make_name):
    total = 0
    page = 1
    while True:
        if page == 1:
            url = f'https://www.ss.lv/en/transport/cars/{make_slug}/'
        else:
            url = f'https://www.ss.lv/en/transport/cars/{make_slug}/page{page}.html'
        print(f'  Page {page}...')
        try:
            html = fetch_page(url)
        except Exception as e:
            print(f'  Error: {e}')
            break

        rows = re.findall(r'<tr id="tr_\d+">(.*?)</tr>', html, re.DOTALL)
        if not rows:
            break

        listings = [l for l in (parse_listing(r, make_name) for r in rows) if l]
        if listings:
            for attempt in range(3):
                try:
                    supabase.table('listings').upsert(listings, on_conflict='url').execute()
                    history = [{'url': l['url'], 'price_eur': l['price_eur'], 'scraped_date': str(_date.today())} for l in listings if l.get('price_eur')]
                    if history:
                        supabase.table('price_history').insert(history).execute()
                    total += len(listings)
                    print(f'    Saved {len(listings)} listings')
                    break
                except Exception as e:
                    print(f'    Save error (attempt {attempt+1}): {e}')
                    time.sleep(10)

        if f'page{page+1}.html' not in html:
            break
        page += 1
        time.sleep(2)
    return total

SLUG_TO_NAME = {
    'mercedes': 'Mercedes-Benz',
    'land-rover': 'Land Rover',
    'alfa-romeo': 'Alfa Romeo',
    'mini': 'MINI',
    'seat': 'SEAT',
    'cupra': 'CUPRA',
}

grand_total = 0
for make_slug in MAKES:
    make_name = SLUG_TO_NAME.get(make_slug, make_slug.replace('-', ' ').title())
    print(f'\nScraping {make_name}...')
    count = scrape_make(make_slug, make_name)
    print(f'  {make_name}: {count} listings')
    grand_total += count
    time.sleep(3)

print(f'\nAll done. Total scraped: {grand_total}')

if grand_total >= SAFETY_MINIMUM:
    print(f"\nCleaning up stale sslv listings (not seen since {RUN_START})...")
    try:
        result = supabase.table("listings") \
            .delete() \
            .eq("source", "sslv") \
            .lt("last_seen_at", RUN_START) \
            .execute()
        deleted = len(result.data) if result.data else 0
        print(f"Deleted {deleted} stale listings from sslv")
    except Exception as e:
        print(f"Cleanup error: {e}")
else:
    print(f"\nSkipping cleanup — only scraped {grand_total} listings (minimum is {SAFETY_MINIMUM}). Something may have gone wrong.")
