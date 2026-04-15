'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const MAKES = ['Alfa Romeo','Audi','Bentley','BMW','Cadillac','Chevrolet','Chrysler','Citroen','CUPRA','Dacia','Dodge','Ferrari','Fiat','Ford','Honda','Hyundai','Infiniti','Jaguar','Jeep','Kia','Lamborghini','Land Rover','Lexus','Maserati','Mazda','Mercedes-Benz','MINI','Mitsubishi','Nissan','Opel','Peugeot','Polestar','Porsche','Renault','Rolls-Royce','Saab','SEAT','Skoda','Subaru','Suzuki','Tesla','Toyota','Volkswagen','Volvo']
const PAGE_SIZE = 40

export default function Home() {
  const [listings, setListings] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchListings(0, 'created_at', 'desc')
    fetchCount()
  }, [])

  useEffect(() => {
    if (make) loadModels(make)
    else setModels([])
    setModel('')
  }, [make])

  async function loadModels(selectedMake) {
    const { data } = await supabase
      .from('listings')
      .select('model')
      .eq('make', selectedMake)
      .not('model', 'is', null)
    if (data) {
      const unique = [...new Set(data.map(d => d.model))].filter(Boolean).sort()
      setModels(unique)
    }
  }

  function buildQuery(q) {
    if (make) q = q.eq('make', make)
    if (model) q = q.eq('model', model)
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
    if (search) q = q.ilike('title', `%${search}%`)
    return q
  }

  async function fetchCount() {
    let q = supabase.from('listings').select('*', { count: 'exact', head: true }).gte('price_eur', 100)
    const { count } = await buildQuery(q)
    setFilterCount(count || 0)
  }

  async function fetchListings(pageNum, sb, sd) {
    setLoading(true)
    const sortField = sb || sortBy
    const sortOrder = sd || sortDir
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let q = supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .gte('price_eur', 100)
      .order(sortField, { ascending: sortOrder === 'asc' })
      .range(from, to)
    q = buildQuery(q)
    const { data, error, count } = await q
    if (error) { console.error(error); setLoading(false); return }
    setListings(data || [])
    setTotal(count || 0)
    setPage(pageNum)
    setLoading(false)
    window.scrollTo(0, 0)
  }

  function doSearch() { fetchListings(0); fetchCount() }

  function reset() {
    setMake(''); setModel(''); setBodyType(''); setDrive(''); setFuel('')
    setTransmission(''); setMinYear(''); setMaxYear(''); setMinPrice('')
    setMaxPrice(''); setMinMileage(''); setMaxMileage(''); setSearch('')
    setSortBy('created_at'); setSortDir('desc')
    fetchListings(0, 'created_at', 'desc')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const sel = "w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500 text-gray-900"
const inp = "w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold text-blue-600">Autootsing</span>
          <span className="text-gray-400 text-sm hidden sm:block">Eesti autokuulutused ühes kohas</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4 items-start">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-3 sticky top-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sõiduki tüüp</p>
            <select className={sel}>
              <option value="">Kõik tüübid</option>
              <option value="car">Sõiduauto</option>
              <option value="suv">Maastur / SUV</option>
              <option value="van">Kaubik</option>
              <option value="truck">Veok</option>
              <option value="bus">Buss</option>
              <option value="other">Muu</option>
            </select>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mark ja mudel</p>

            <select value={make} onChange={e => setMake(e.target.value)} className={sel}>
              <option value="">Kõik margid</option>
              {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select value={model} onChange={e => setModel(e.target.value)} disabled={!make} className={sel + ' disabled:opacity-40'}>
              <option value="">Kõik mudelid</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <input
              type="text"
              placeholder="Täpsustus (nt. M-pakett, AMG...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              className={inp}
            />

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keretüüp</p>
            <select value={bodyType} onChange={e => setBodyType(e.target.value)} className={sel}>
              <option value="">Kõik</option>
              <option value="Sedaan">Sedaan</option>
              <option value="Universaal">Universaal</option>
              <option value="Luukpära">Luukpära</option>
              <option value="Maastur">Maastur</option>
              <option value="Kupee">Kupee</option>
              <option value="Kabriolett">Kabriolett</option>
              <option value="Minivan">Minivan</option>
            </select>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aasta</p>
            <div className="flex gap-1">
              <input type="number" placeholder="Alates" value={minYear} onChange={e => setMinYear(e.target.value)} className={inp} />
              <input type="number" placeholder="Kuni" value={maxYear} onChange={e => setMaxYear(e.target.value)} className={inp} />
            </div>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hind (€)</p>
            <div className="flex gap-1">
              <input type="number" placeholder="Alates" value={minPrice} onChange={e => setMinPrice(e.target.value)} className={inp} />
              <input type="number" placeholder="Kuni" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inp} />
            </div>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Läbisõit (km)</p>
            <div className="flex gap-1">
              <input type="number" placeholder="Alates" value={minMileage} onChange={e => setMinMileage(e.target.value)} className={inp} />
              <input type="number" placeholder="Kuni" value={maxMileage} onChange={e => setMaxMileage(e.target.value)} className={inp} />
            </div>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kütus</p>
            <select value={fuel} onChange={e => setFuel(e.target.value)} className={sel}>
              <option value="">Kõik</option>
              <option value="Bensiin">Bensiin</option>
              <option value="Diisel">Diisel</option>
              <option value="Elekter">Elekter</option>
              <option value="Hübriid">Hübriid</option>
              <option value="Gaasbensiin">Gaas / LPG</option>
            </select>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Käigukast</p>
            <select value={transmission} onChange={e => setTransmission(e.target.value)} className={sel}>
              <option value="">Kõik</option>
              <option value="Automaat">Automaat</option>
              <option value="Käsitsi">Käsitsi</option>
            </select>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vedav sild</p>
            <select value={drive} onChange={e => setDrive(e.target.value)} className={sel}>
              <option value="">Kõik</option>
              <option value="Esivedu">Esivedu</option>
              <option value="Tagavedu">Tagavedu</option>
              <option value="Nelikvedu">Nelikvedu</option>
            </select>

            <hr className="border-gray-100" />
            <button onClick={doSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm transition">
              OTSI ({filterCount.toLocaleString()})
            </button>
            <button onClick={reset} className="w-full border border-gray-200 text-gray-500 py-1.5 rounded text-sm hover:bg-gray-50 transition">
              Tühjenda
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 bg-white border border-gray-200 rounded-lg px-4 py-2">
            <p className="text-sm text-gray-600">{total.toLocaleString()} kuulutust</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Järjesta:</span>
              <select value={sortBy} onChange={e => { setSortBy(e.target.value); fetchListings(0, e.target.value, sortDir) }} className="text-sm border border-gray-200 rounded px-2 py-1 bg-white">
                <option value="created_at">Uusimad</option>
                <option value="price_eur">Hind</option>
                <option value="year">Aasta</option>
                <option value="mileage_km">Läbisõit</option>
              </select>
              <select value={sortDir} onChange={e => { setSortDir(e.target.value); fetchListings(0, sortBy, e.target.value) }} className="text-sm border border-gray-200 rounded px-2 py-1 bg-white">
                <option value="desc">↓</option>
                <option value="asc">↑</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Laen...</div>
          ) : (
            <div className="space-y-2">
              {listings.map(car => (
                <a key={car.id} href={car.url} target="_blank" rel="noopener noreferrer"
                  className="flex bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-md transition-all duration-150 group">
                  <div className="w-52 h-36 flex-shrink-0 bg-gray-100 overflow-hidden">
                    {car.image_url ? (
                      <img src={car.image_url} alt={car.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Pilt puudub</div>
                    )}
                  </div>
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{car.title}</h3>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{car.description}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xl font-bold text-blue-600">{car.price_eur?.toLocaleString()} €</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-sm text-gray-500">
                      {car.year && <span>{car.year}</span>}
                      {car.mileage_km && <><span className="text-gray-200">|</span><span>{car.mileage_km?.toLocaleString()} km</span></>}
                      {car.fuel && <><span className="text-gray-200">|</span><span>{car.fuel}</span></>}
                      {car.transmission && <><span className="text-gray-200">|</span><span>{car.transmission}</span></>}
                      {car.body && <><span className="text-gray-200">|</span><span>{car.body}</span></>}
                      {car.drive && <><span className="text-gray-200">|</span><span>{car.drive}</span></>}
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        car.source === 'auto24' ? 'bg-blue-100 text-blue-700' :
                        car.source === 'autoportaal' ? 'bg-green-100 text-green-700' :
                        car.source === 'autodiiler' ? 'bg-orange-100 text-orange-700' :
                        car.source === 'veego' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{car.source}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6 pb-8">
              <button onClick={() => fetchListings(page - 1)} disabled={page === 0} className="px-4 py-2 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50 bg-white transition">← Eelmine</button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                return (
                  <button key={pageNum} onClick={() => fetchListings(pageNum)} className={`px-4 py-2 border rounded text-sm transition ${pageNum === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 bg-white'}`}>{pageNum + 1}</button>
                )
              })}
              <button onClick={() => fetchListings(page + 1)} disabled={page >= totalPages - 1} className="px-4 py-2 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50 bg-white transition">Järgmine →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
