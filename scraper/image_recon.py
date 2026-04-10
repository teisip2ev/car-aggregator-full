/Library/Developer/CommandLineTools/usr/bin/python3 -c "
from playwright.sync_api import sync_playwright
import re

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('https://www.auto24.ee/kasutatud/nimekiri.php?bn=2&a=100&b=4&f1=2018&h[0]=2&ae=8&af=50&otsi=otsi', timeout=30000)
    page.wait_for_timeout(6000)

    styles = page.eval_on_selector_all('[style*=\"background-image\"]', 'els => els.map(e => e.getAttribute(\"style\"))')
    urls = []
    for s in styles:
        match = re.search(r'url\([\'\"](.*?)[\'\"]\)', s)
        if match and 'img-bcg.eu' in match.group(1):
            urls.append(match.group(1))
    
    print(f'Car image URLs: {len(urls)}')
    for u in urls[:5]:
        print(u)

    browser.close()
"