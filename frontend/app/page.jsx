'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const MAKES = ['Audi','BMW','Ford','Honda','Hyundai','Jeep','Kia','Land Rover','Lexus','Mazda','Mercedes-Benz','Mitsubishi','Nissan','Opel','Peugeot','Porsche','Renault','Skoda','Subaru','Suzuki','Tesla','Toyota','Volkswagen','Volvo']

export default function Home() {
  const [listings, setListings] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [fuel, setFuel] = useState('')
  const [transmission, setTransmission] = useState('')
  const [minYear, setMinYear] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [maxMileage, setMaxMileage] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => { fetchListings() }, [])

  useEffect(() => {
    if (make) loadModels(make)
    else setModels([])
    setModel('')
  }, [make])

  async function loadModels(selectedMake) {
    const { data } = await supabase
      .from('listings')
      .select('model')
      .ilike('title', `%${selectedMake}%`)
      .not('model', 'is', null)
    if (data) {
      const unique = [...new Set(data.map(d => d.model))].filter(Boolean).sort()
      setModels(unique)
    }
  }

  async function fetchListings() {
    setLoading(true)
    let query = supabase.from('listings').select('*', { count: 'exact' }).order('price_eur', { ascending: true }).limit(96)
    if (make) query = query.ilike('title', `%${make}%`)
    if (model) query = query.eq('model', model)
    if (fuel) query = query.eq('fuel', fuel)
    if (transmission) query = query.eq('transmission', transmission)
    if (minYear) query = query.gte('year', parseInt(minYear))
    if (maxPrice) query = query.lte('price_eur', parseInt(maxPrice))
    if (maxMileage) query = query.lte('mileage_km', parseInt(maxMileage))
    const { data, error, count } = await query
    if (error) console.error(error)
    else { setListings(data); setTotal(count) }
    setLoading(false)
  }

  function reset() {
    setMake(''); setModel(''); setFuel(''); setTransmission('')
    setMinYear(''); setMaxPrice(''); setMaxMileage('')
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-1">🚗 Autootsing</h1>
      <p className="text-gray-500 mb-6">Eesti autokuulutused ühes kohas</p>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-6 border">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
          <select value={make} onChange={e => setMake(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800">
            <option value="">Kõik margid</option>
            {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={model} onChange={e => setModel(e.target.value)} disabled={!make} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 disabled:opacity-40">
            <option value="">Kõik mudelid</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={fuel} onChange={e => setFuel(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800">
            <option value="">Kütus</option>
            <option value="Diisel">Diisel</option>
            <option value="Bensiin">Bensiin</option>
            <option value="Hübriid">Hübriid</option>
            <option value="Elekter">Elekter</option>
          </select>
          <select value={transmission} onChange={e => setTransmission(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800">
            <option value="">Käigukast</option>
            <option value="Automaat">Automaat</option>
            <option value="Käsitsi">Käsitsi</option>
          </select>
          <input type="number" placeholder="Aastast" value={minYear} onChange={e => setMinYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800" />
          <input type="number" placeholder="Max hind €" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800" />
          <input type="number" placeholder="Max km" value={maxMileage} onChange={e => setMaxMileage(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800" />
        </div>
        <div className="flex gap-2">
          <button onClick={fetchListings} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Otsi</button>
          <button onClick={() => { reset(); setTimeout(fetchListings, 100) }} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition">Tühjenda</button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Laen...</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{total?.toLocaleString()} kuulutust leitud, näitan {listings.length}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map(car => (
              <a key={car.id} href={car.url} target="_blank" rel="noopener noreferrer" className="group block bg-white dark:bg-gray-900 border rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all duration-200">
                <div className="relative">
                  {car.image_url ? (
                    <img src={car.image_url} alt={car.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-200" />
                  ) : (
                    <div className="w-full h-44 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">Pilt puudub</div>
                  )}
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded-lg">
                    {car.price_eur?.toLocaleString()} €
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm mb-1 truncate">{car.title}</p>
                  <p className="text-gray-500 text-xs truncate mb-2">{car.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {car.year && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded">{car.year}</span>}
                    {car.mileage_km && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded">{car.mileage_km?.toLocaleString()} km</span>}
                    {car.fuel && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded">{car.fuel}</span>}
                    {car.transmission && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded">{car.transmission}</span>}
                    {car.source && <span className={`text-xs px-2 py-0.5 rounded font-medium ${car.source === 'auto24' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>{car.source}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
