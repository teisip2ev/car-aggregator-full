from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Try inserting one test row
result = supabase.table("listings").insert({
    "url": "https://test.com",
    "title": "Test Car",
    "price_eur": 9999,
    "year": 2020,
    "mileage_km": 50000,
    "fuel": "Diisel",
    "transmission": "Automaat",
    "source": "auto24"
}).execute()

print("Insert result:", result)