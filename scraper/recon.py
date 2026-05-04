from playwright.sync_api import sync_playwright
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY
import re
import time
from datetime import datetime, timezone

MAKES = {
    'Alfa Romeo': 9, 'Audi': 2, 'Bentley': 247, 'BMW': 4, 'Cadillac': 44,
    'Chevrolet': 31, 'Chrysler': 28, 'Citroen': 20, 'CUPRA': 1434, 'Dacia': 254,
    'Dodge': 24, 'Ferrari': 70, 'Fiat': 14, 'Ford': 7, 'Honda': 1,
    'Hyundai': 34, 'Infiniti': 255, 'Jaguar': 36, 'Jeep': 32, 'Kia': 25,
    'Lamborghini': 376, 'Land Rover': 42, 'Lexus': 35, 'Maserati': 60, 'Mazda': 6,
    'Mercedes-Benz': 12, 'MINI': 144, 'Mitsubishi': 3, 'Nissan': 11, 'Opel': 5,
    'Peugeot': 16, 'Polestar': 1483, 'Porsche': 140, 'Renault': 19,
    'Rolls-Royce': 168, 'Saab': 17, 'SEAT': 22, 'Skoda': 40, 'Subaru': 23,
    'Suzuki': 41, 'Tesla': 642, 'Toyota': 13, 'Volkswagen': 8, 'Volvo': 10
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Record when this run started — used for hard delete at the end
RUN_START = datetime.now(timezone.utc).isoformat()
SAFETY_MINIMUM = 50  # don't delete anything if we scraped fewer than this

def extract_model(title, make_name):
    if not title or not make_name:
        return None
    rest = title[len(make_name):].strip()
    match = re.match(r'^((?:[A-Za-z0-9\-]+)(?:\s+[A-Za-z][A-Za-z0-9\-]*)*)(?:\s+\d|$)', rest)
    if match:
        return match.group(1).strip() or None
    return None

def parse_listing(text, href, style='', make_name=''):
    image_url = None
    if style:
        match = re.search(r"url\(['\"]?(.*?)['\"]?\)", style)
        if match:
            image_url = match.group(1)
    lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
    listing = {
        "url": href, "image_url": image_url, "title": None, "description": None,
        "price_eur": None, "year": None, "mileage_km": None, "fuel": None,
        "transmission": None, "body": None, "drive": None, "source": "auto24",
        "make": make_name, "model": None, "country": "EE",
        "last_seen_at": RUN_START,
    }
    for line in lines:
        price_match = re.search(r"([\d\s\xa0]+)\s*€", line)
        if price_match and listing["price_eur"] is None:
            try:
                listing["price_eur"] = int(price_match.group(1).replace(" ", "").replace("\xa0", ""))
            except:
                pass
            continue
        if re.fullmatch(r"20[0-2]\d|19\d\d", line):
            listing["year"] = int(line)
            continue
        if "km" in line:
            km_match = re.search(r"([\d\s\xa0]+)\s*km", line)
            if km_match:
                try:
                    listing["mileage_km"] = int(km_match.group(1).replace(" ", "").replace("\xa0", ""))
                except:
                    pass
                continue
        if line in ["Diisel", "Bensiin", "Hubriid", "Elekter", "Gaasbensiin"]:
            listing["fuel"] = line
            continue
        if line in ["Automaat", "Manuaal", "Poolautomaat", "Käsitsi"]:
            transmission_map = {"Käsitsi": "Manuaal"}
            listing["transmission"] = transmission_map.get(line, line)
            continue
        if line in ["Sedaan", "Universaal", "Luukpara", "Maastur", "Kupee", "Kabriolett", "Minivan"]:
            listing["body"] = line
            continue
        if line in ["Tagavedu", "Esivedu", "Nelikvedu"]:
            listing["drive"] = line
            continue
        if listing["title"] is None and re.search(r"[A-Z]", line) and "€" not in line and "km" not in line:
            listing["title"] = line
            continue
        if listing["title"] and listing["description"] is None and re.search(r"[A-Za-z]", line) and "€" not in line:
            listing["description"] = line
    listing["model"] = extract_model(listing["title"], make_name)
    return listing

def scrape_make(page, make_name, make_id):
    base_url = f"https://www.auto24.ee/kasutatud/nimekiri.php?bn=2&a=100&b={make_id}&ae=8&af=50&otsi=otsi"
    all_listings = []
    offset = 0
    page_num = 1
    while True:
        url = base_url + f"&ak={offset}"
        print(f"  Page {page_num}...")
        page.goto(url, timeout=30000)
        page.wait_for_timeout(3000)
        results = page.eval_on_selector_all(
            "div[class*='result']",
            """els => els.map(e => ({
                text: e.innerText,
                href: e.querySelector('a') ? e.querySelector('a').href : '',
                image: (e.querySelector('span.thumb') || {getAttribute: ()=>''}).getAttribute('style')
            }))"""
        )
        new_listings = []
        for r in results:
            if len(r["text"].strip()) > 20:
                parsed = parse_listing(r["text"], r["href"], r.get("image", ""), make_name)
                if parsed["price_eur"]:
                    new_listings.append(parsed)
        if not new_listings:
            break
        for attempt in range(3):
            try:
                supabase.table("listings").upsert(new_listings, on_conflict="url").execute()
                from datetime import date as _date
                history = [{'url': l['url'], 'price_eur': l['price_eur'], 'scraped_date': str(_date.today())} for l in new_listings if l.get('price_eur')]
                if history:
                    supabase.table('price_history').upsert(history, on_conflict='url,scraped_date,price_eur').execute()
                break
            except Exception as e:
                print(f"  Save error (attempt {attempt+1}): {e}")
                time.sleep(10)
        all_listings.extend(new_listings)
        print(f"    Saved {len(new_listings)} listings")
        next_button = page.query_selector("a:has-text('järgmine')")
        if not next_button:
            break
        offset += 50
        page_num += 1
        time.sleep(2)
    return len(all_listings)

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    )
    context = browser.new_context(
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport={'width': 1920, 'height': 1080},
        locale='et-EE',
    )
    page = context.new_page()
    page.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

    total = 0
    for make_name, make_id in MAKES.items():
        print(f"\nScraping {make_name}...")
        count = scrape_make(page, make_name, make_id)
        print(f"  {make_name} done: {count} listings")
        total += count
        time.sleep(3)

    browser.close()

print(f"\nAll done. Total scraped: {total}")

# Hard delete listings not seen in this run
if total >= SAFETY_MINIMUM:
    print(f"\nCleaning up stale auto24 listings (not seen since {RUN_START})...")
    try:
        result = supabase.table("listings") \
            .delete() \
            .eq("source", "auto24") \
            .lt("last_seen_at", RUN_START) \
            .execute()
        deleted = len(result.data) if result.data else 0
        print(f"Deleted {deleted} stale listings from auto24")
    except Exception as e:
        print(f"Cleanup error: {e}")
else:
    print(f"\nSkipping cleanup — only scraped {total} listings (minimum is {SAFETY_MINIMUM}). Something may have gone wrong.")
