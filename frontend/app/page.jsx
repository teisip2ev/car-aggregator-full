'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const MAKES = ['Alfa Romeo','Audi','Bentley','BMW','Cadillac','Chevrolet','Chrysler','Citroen','CUPRA','Dacia','Dodge','Ferrari','Fiat','Ford','Honda','Hyundai','Infiniti','Jaguar','Jeep','Kia','Lamborghini','Land Rover','Lexus','Maserati','Mazda','Mercedes-Benz','MINI','Mitsubishi','Nissan','Opel','Peugeot','Polestar','Porsche','Renault','Rolls-Royce','Saab','SEAT','Skoda','Subaru','Suzuki','Tesla','Toyota','Volkswagen','Volvo']
const PAGE_SIZE = 40

function HistoryCheck() {
  const [open, setOpen] = useState(false)
  const [plate, setPlate] = useState('')
  return (
    <div className="relative inline-block">
      <button onClick={e => { e.preventDefault(); setOpen(!open) }} className="text-xs px-2 py-0.5 rounded border font-medium border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
        Kontrolli tausta
      </button>
      {open && (
        <div className="absolute bottom-7 left-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 text-xs text-gray-700" onClick={e => e.preventDefault()}>
          <p className="font-semibold mb-2">Kontrolli sõiduki tausta</p>
          <input type="text" placeholder="Registreerimismärk või VIN" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:border-blue-500" />
          <div className="flex gap-2">
            <a href="https://eteenindus.mnt.ee/public/soidukTaustakontroll.jsf?lang=et" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex-1 text-center bg-blue-600 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition">MNT taustakontroll</a>
            <a href="https://www.lkf.ee/et/kahjukontroll" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex-1 text-center bg-orange-500 text-white py-1.5 rounded text-xs font-medium hover:bg-orange-600 transition">LKF kahjukontroll</a>
          </div>
          <p className="text-gray-400 mt-2">Sisesta märk ja ava kontroll uues aknas</p>
        </div>
      )}
    </div>
  )
}

function PriceTag({ car, openPopup, setOpenPopup }) {
  const open = openPopup === car.id
  const popupClass = "absolute top-6 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56 text-xs text-gray-700"
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!e.target.closest('[data-pricetag]')) setOpenPopup(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])
  if (!car.market_median || car.price_score === null || car.price_score === undefined) {
    return (
      <div className="relative inline-block" data-pricetag>
        <button onClick={e => { e.preventDefault(); setOpenPopup(open ? null : car.id) }} className="text-xs px-2 py-0.5 rounded border font-medium border-gray-200 bg-gray-50 text-gray-400 hover:opacity-80 transition">
          Hinnavõrdlus puudub
        </button>
        {open && (
          <div className={popupClass} data-pricetag style={{right: 0, maxWidth: 'calc(100vw - 4rem)'}}>
            <p className="font-semibold mb-1">Hinnavõrdlus puudub</p>
            <p className="text-gray-500">Meil ei ole piisavalt andmeid, et selle auto hinnaskoori arvutada. Hinnaanalüüs vajab vähemalt 3 sarnast autot.</p>
          </div>
        )}
      </div>
    )
  }
  const label = car.price_score <= -15 ? 'Väga soodne hind' : car.price_score <= -5 ? 'Soodne hind' : car.price_score <= 5 ? 'Keskmine hind' : car.price_score <= 15 ? 'Kõrgem hind' : 'Kõrge hind'
  const color = car.price_score <= -5 ? 'bg-green-100 text-green-700 border-green-200' : car.price_score <= 5 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-600 border-red-200'
  return (
    <div className="relative inline-block" data-pricetag>
      <button onClick={e => { e.preventDefault(); setOpenPopup(open ? null : car.id) }} className={'text-xs px-2 py-0.5 rounded border font-medium cursor-pointer hover:opacity-80 transition ' + color}>
        {label} ⓘ
      </button>
      {open && (
        <div className={popupClass} data-pricetag style={{right: 0, maxWidth: 'calc(100vw - 4rem)'}}>
          <p className="font-semibold mb-2">Hinna analüüs</p>
          <p>Mediaan: <span className="font-medium">{car.market_median?.toLocaleString()} €</span></p>
          <p>Vahemik: <span className="font-medium">{car.market_min?.toLocaleString()} – {car.market_max?.toLocaleString()} €</span></p>
          <p>See kuulutus: <span className="font-medium">{car.price_eur?.toLocaleString()} €</span></p>
          <p className="mt-2 text-gray-400">Põhineb {car.market_count} sarnase auto hindadel</p>
        </div>
      )}
    </div>
  )
}


function FuelCost({ car }) {
  const [open, setOpen] = useState(false)
  const [km, setKm] = useState(15000)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!e.target.closest('[data-fuelcost]')) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!car.fuel || car.fuel === 'Gaasbensiin') return null

  const configs = {
    'Bensiin': { consumption: 7.5, unit: 'l', price: 1.65, label: '7.5l/100km @ 1.65€/l' },
    'Diisel': { consumption: 6.0, unit: 'l', price: 1.55, label: '6.0l/100km @ 1.55€/l' },
    'Hübriid': { consumption: 5.0, unit: 'l', price: 1.65, label: '5.0l/100km @ 1.65€/l' },
    'Elekter': { consumption: 18, unit: 'kWh', price: 0.18, label: '18kWh/100km @ 0.18€/kWh' },
  }

  const config = configs[car.fuel]
  if (!config) return null

  const annualCost = Math.round((km / 100) * config.consumption * config.price)

  return (
    <div className="relative inline-block" data-fuelcost>
      <button
        onClick={e => { e.preventDefault(); setOpen(!open) }}
        className="text-xs px-2 py-0.5 rounded border font-medium border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
      >
        Kulud ⓘ
      </button>
      {open && (
<div className="absolute top-6 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 text-xs text-gray-700" data-fuelcost style={{maxWidth: 'calc(100vw - 4rem)'}} onClick={e => e.preventDefault()} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>          <p className="font-semibold mb-2">Hinnanguline kütusekulu</p>
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Aastane läbisõit</span>
              <span className="font-medium">{km.toLocaleString()} km</span>
            </div>
            <input
              type="range"
              min="5000"
              max="50000"
              step="1000"
              value={km}
              onChange={e => { e.stopPropagation(); setKm(parseInt(e.target.value)) }}
onMouseDown={e => e.stopPropagation()}
onTouchStart={e => e.stopPropagation()}
className="w-full"
onClick={e => e.preventDefault()}
            />
            <div className="flex justify-between text-gray-400 mt-0.5">
              <span>5 000</span>
              <span>50 000</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded p-2 mb-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Kütus</span>
              <span>{car.fuel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tarbimine</span>
              <span>{config.label}</span>
            </div>
            <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-gray-200">
              <span>Aastane kütusekulu</span>
              <span className="text-blue-600">~{annualCost.toLocaleString()} €</span>
            </div>
          </div>
          <p className="text-gray-400">Hinnang põhineb keskmistel näitajatel. Tegelik kulu sõltub sõidustiilist.</p>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [listings, setListings] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [openPopup, setOpenPopup] = useState(null)
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [drive, setDrive] = useState('')
  const [fuel, setFuel] = useState('')
  const [transmission, setTransmission] = useState('')
  const [minYear, setMinYear] = useState('')
  const [maxYear, setMaxYear] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minMileage, setMinMileage] = useState('')
  const [maxMileage, setMaxMileage] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [filterCount, setFilterCount] = useState(0)
  const [vehicleType, setVehicleType] = useState('')
  const [country, setCountry] = useState('EE')
  const [recentSearches, setRecentSearches] = useState([])

  useEffect(() => {
    fetchListings(0, 'created_at', 'desc')
    fetchCount()
    const saved = localStorage.getItem('recentSearches')
    if (saved) setRecentSearches(JSON.parse(saved))
  }, [])

  useEffect(() => { fetchListings(0); fetchCount() }, [country])

  useEffect(() => {
    if (make) loadModels(make)
    else setModels([])
    setModel('')
  }, [make])

  async function loadModels(selectedMake) {
    const { data } = await supabase.from('listings').select('model').eq('make', selectedMake).not('model', 'is', null)
    if (data) {
      const unique = [...new Set(data.map(d => d.model))].filter(Boolean).sort()
      setModels(unique)
    }
  }

  function buildQuery(q) {
    if (make) q = q.eq('make', make)
    if (model) q = q.ilike('model', model)
    if (bodyType) q = q.eq('body', bodyType)
    if (drive) q = q.eq('drive', drive)
    if (fuel) q = q.eq('fuel', fuel)
    if (transmission) q = q.eq('transmission', transmission)
    if (minYear) q = q.gte('year', parseInt(minYear))
    if (maxYear) q = q.lte('year', parseInt(maxYear))
    if (minPrice) q = q.gte('price_eur', parseInt(minPrice))
    if (maxPrice) q = q.lte('price_eur', parseInt(maxPrice))
    if (minMileage) q = q.gte('mileage_km', parseInt(minMileage))
    if (maxMileage) q = q.lte('mileage_km', parseInt(maxMileage))
if (country === 'EE') q = q.eq('country', 'EE')
if (country === 'LV') q = q.eq('country', 'LV')
if (country === 'LT') q = q.eq('country', 'LT')    
    if (vehicleType) q = q.eq('vehicle_type', vehicleType)
    if (search) q = q.ilike('title', `%${search}%`)
    return q
  }

  async function fetchCount() {
    let q = supabase.from('listings').select('*', { count: 'exact', head: true }).gte('price_eur', 100)
    q = buildQuery(q)
    const { count } = await q
    setFilterCount(count || 0)
  }

  async function fetchListings(pageNum, sb, sd) {
    setLoading(true)
    const sortField = sb || sortBy
    const sortOrder = sd || sortDir
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let q = supabase.from('listings').select('*', { count: 'exact' }).gte('price_eur', 100).order(sortField, { ascending: sortOrder === 'asc' }).range(from, to)
    q = buildQuery(q)
    const { data, error, count } = await q
    if (error) { console.error(error); setLoading(false); return }
    setListings(data || [])
    setTotal(count || 0)
    setPage(pageNum)
    setLoading(false)
    window.scrollTo(0, 0)
  }

  function saveSearch() {
    const parts = [make, model, search, minYear && maxYear ? minYear + '-' + maxYear : minYear || maxYear, maxPrice ? 'kuni ' + parseInt(maxPrice).toLocaleString() + '€' : '', fuel, transmission].filter(Boolean)
    if (!parts.length) return
    const label = parts.join(' · ')
    const entry = { label, filters: { make, model, search, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage, fuel, transmission, bodyType, drive } }
    const updated = [entry, ...recentSearches.filter(r => r.label !== label)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  function applySearch(entry) {
    const f = entry.filters
    setMake(f.make || ''); setModel(f.model || ''); setSearch(f.search || '')
    setMinYear(f.minYear || ''); setMaxYear(f.maxYear || '')
    setMinPrice(f.minPrice || ''); setMaxPrice(f.maxPrice || '')
    setMinMileage(f.minMileage || ''); setMaxMileage(f.maxMileage || '')
    setFuel(f.fuel || ''); setTransmission(f.transmission || '')
    setBodyType(f.bodyType || ''); setDrive(f.drive || '')
    setTimeout(() => { fetchListings(0); fetchCount() }, 50)
  }

  function doSearch() { saveSearch(); fetchListings(0); fetchCount() }

  function reset() {
    setMake(''); setModel(''); setBodyType(''); setDrive(''); setFuel('')
    setCountry('EE'); setVehicleType(''); setTransmission(''); setMinYear(''); setMaxYear(''); setMinPrice('')
    setMaxPrice(''); setMinMileage(''); setMaxMileage(''); setSearch('')
    setSortBy('created_at'); setSortDir('desc')
    setShowFilters(false)
    fetchListings(0, 'created_at', 'desc')
    fetchCount()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const sel = "w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
  const inp = "w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 placeholder-gray-400"

  const sidebar = (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2.5">
    
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sõiduki tüüp</p>
      <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className={sel}>
        <option value="">Kõik tüübid</option><option value="Sõiduauto">Sõiduauto</option><option value="Maastur">Maastur / SUV</option><option value="Minivan">Minivan</option>
      </select>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keretüüp</p>
      <select value={bodyType} onChange={e => setBodyType(e.target.value)} className={sel}>
        <option value="">Kõik</option><option value="Sedaan">Sedaan</option><option value="Universaal">Universaal</option><option value="Luukpära">Luukpära</option><option value="Maastur">Maastur</option><option value="Kupee">Kupee</option><option value="Kabriolett">Kabriolett</option><option value="Minivan">Minivan</option><option value="Kaubik">Kaubik</option><option value="Pikap">Pikap</option>
      </select>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mark ja mudel</p>
      <select value={make} onChange={e => setMake(e.target.value)} className={sel}><option value="">Kõik margid</option>{MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select>
      <select value={model} onChange={e => setModel(e.target.value)} disabled={!make} className={sel + ' disabled:opacity-40'}><option value="">Kõik mudelid</option>{models.map(m => <option key={m} value={m}>{m}</option>)}</select>
      <input type="text" placeholder="Täpsustus (nt. M-pakett, AMG...)" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className={inp} />
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aasta</p>
      <div className="flex gap-1"><input type="number" placeholder="Alates" value={minYear} onChange={e => setMinYear(e.target.value)} className={inp} /><input type="number" placeholder="Kuni" value={maxYear} onChange={e => setMaxYear(e.target.value)} className={inp} /></div>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hind (€)</p>
      <div className="flex gap-1"><input type="number" placeholder="Alates" value={minPrice} onChange={e => setMinPrice(e.target.value)} className={inp} /><input type="number" placeholder="Kuni" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inp} /></div>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Läbisõit (km)</p>
      <div className="flex gap-1"><input type="number" placeholder="Alates" value={minMileage} onChange={e => setMinMileage(e.target.value)} className={inp} /><input type="number" placeholder="Kuni" value={maxMileage} onChange={e => setMaxMileage(e.target.value)} className={inp} /></div>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kütus</p>
      <select value={fuel} onChange={e => setFuel(e.target.value)} className={sel}>
        <option value="">Kõik</option><option value="Bensiin">Bensiin</option><option value="Diisel">Diisel</option><option value="Elekter">Elekter</option><option value="Hübriid">Hübriid</option><option value="Gaasbensiin">Gaas / LPG</option>
      </select>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Käigukast</p>
      <select value={transmission} onChange={e => setTransmission(e.target.value)} className={sel}>
        <option value="">Kõik</option><option value="Automaat">Automaat</option><option value="Manuaal">Manuaal</option><option value="Poolautomaat">Poolautomaat</option>
      </select>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vedav sild</p>
      <select value={drive} onChange={e => setDrive(e.target.value)} className={sel}>
        <option value="">Kõik</option><option value="Esivedu">Esivedu</option><option value="Tagavedu">Tagavedu</option><option value="Nelikvedu">Nelikvedu</option>
      </select>
      <hr className="border-gray-100" />
      <button onClick={doSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm transition">OTSI ({filterCount.toLocaleString()})</button>
      <button onClick={reset} className="w-full border border-gray-200 text-gray-500 py-1.5 rounded text-sm hover:bg-gray-50 transition">Tühjenda</button>
      {recentSearches.length > 0 && (
        <div>
          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Viimased otsingud</p>
          <div className="space-y-1">
            {recentSearches.map((entry, i) => (
              <button key={i} onClick={() => applySearch(entry)} className="w-full text-left text-xs px-2 py-1.5 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 border border-gray-100 truncate transition">
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={reset} className="flex items-baseline gap-2 hover:opacity-80 transition">
            <span className="text-xl font-bold text-blue-600">Autootsing</span>
            <span className="text-gray-400 text-sm hidden sm:block">Eesti autokuulutused ühes kohas</span>
          </button>
          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setCountry('EE')} className={"text-xs px-2 py-1 rounded-md font-medium transition " + (country === 'EE' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
              🇪🇪 Eesti
            </button>
<button onClick={() => setCountry('LV')} className={"text-xs px-2 py-1 rounded-md font-medium transition " + (country === 'LV' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
  🇱🇻 Läti
</button>
<button onClick={() => setCountry('LT')} className={"text-xs px-2 py-1 rounded-md font-medium transition " + (country === 'LT' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
  🇱🇹 Leedu
</button>            <button onClick={() => setCountry('all')} className={"text-xs px-2 py-1 rounded-md font-medium transition " + (country === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
              Kõik
            </button>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-600">
            {showFilters ? 'Peida filtrid' : 'Filtrid'}
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 items-start">
        <div className="hidden md:block w-56 flex-shrink-0 sticky top-4">{sidebar}</div>
        {showFilters && <div className="md:hidden w-full">{sidebar}</div>}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between mb-3 bg-white border border-gray-200 rounded-lg px-4 py-2">
            <p className="text-sm text-gray-600">{total.toLocaleString()} kuulutust</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 hidden sm:block">Järjesta:</span>
              <select value={sortBy} onChange={e => { setSortBy(e.target.value); fetchListings(0, e.target.value, sortDir) }} className="text-sm border border-gray-200 rounded px-2 py-1 bg-white text-gray-900">
                <option value="created_at">Uusimad</option><option value="price_eur">Hind</option><option value="year">Aasta</option><option value="mileage_km">Läbisõit</option>
              </select>
              <select value={sortDir} onChange={e => { setSortDir(e.target.value); fetchListings(0, sortBy, e.target.value) }} className="text-sm border border-gray-200 rounded px-2 py-1 bg-white text-gray-900">
                <option value="desc">↓</option><option value="asc">↑</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-20 text-gray-400">Laen...</div>
          ) : (
            <div className="space-y-2">
              {listings.map(car => (
<a key={car.id} href={car.url} target="_blank" rel="noopener noreferrer" draggable="false" className="flex bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all duration-150 group relative">                  <div className="w-36 sm:w-52 h-28 sm:h-36 flex-shrink-0 bg-gray-100 overflow-hidden rounded-l-lg">
                    {car.image_url ? <img src={car.image_url} alt={car.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Pilt puudub</div>}
                  </div>
                  <div className="flex-1 p-3 sm:p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{car.title}</h3>
                        <p className="text-xs text-gray-400 truncate mt-0.5 hidden sm:block">{car.description}</p>
                      </div>
                      <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                        <p className="text-lg sm:text-xl font-bold text-blue-600">{car.price_eur?.toLocaleString()} €</p>
{car.country === 'EE' && <PriceTag car={car} openPopup={openPopup} setOpenPopup={setOpenPopup} />}
{car.country === 'EE' && <HistoryCheck />}                        <FuelCost car={car} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-0.5 mt-2 text-sm text-gray-500">
  {car.year && <span className="font-bold text-gray-800 pr-3">{car.year}</span>}
  {car.mileage_km && <><span className="text-gray-200 pr-3">|</span><span className="pr-3">{car.mileage_km?.toLocaleString()} km</span></>}
  {car.fuel && <><span className="text-gray-200 pr-3">|</span><span className="pr-3">{car.fuel}</span></>}
  {car.transmission && <><span className="text-gray-200 pr-3">|</span><span className="pr-3">{car.transmission}</span></>}
  {car.body && <><span className="text-gray-200 pr-3 hidden sm:inline">|</span><span className="pr-3 hidden sm:inline">{car.body}</span></>}
  {car.drive && <><span className="text-gray-200 pr-3 hidden sm:inline">|</span><span className="hidden sm:inline">{car.drive}</span></>}
</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={'text-xs px-2 py-0.5 rounded font-medium ' + (car.source === 'auto24' ? 'bg-blue-100 text-blue-700' : car.source === 'autoportaal' ? 'bg-green-100 text-green-700' : car.source === 'autodiiler' ? 'bg-orange-100 text-orange-700' : car.source === 'veego' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600')}>{car.source}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 sm:gap-2 mt-6 pb-8">
              <button onClick={() => fetchListings(page - 1)} disabled={page === 0} className="px-3 sm:px-4 py-2 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50 bg-white text-gray-800 transition">←</button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                return <button key={pageNum} onClick={() => fetchListings(pageNum)} className={'px-3 sm:px-4 py-2 border rounded text-sm transition ' + (pageNum === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 bg-white text-gray-800')}>{pageNum + 1}</button>
              })}
              <button onClick={() => fetchListings(page + 1)} disabled={page >= totalPages - 1} className="px-3 sm:px-4 py-2 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50 bg-white text-gray-800 transition">→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
