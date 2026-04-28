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
      <button onClick={e => { e.preventDefault(); setOpen(!open) }} className="text-xs px-2 py-0.5 rounded border font-medium border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition">
        Kontrolli tausta
      </button>
      {open && (
        <div className="absolute bottom-7 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-64 text-xs text-slate-700" onClick={e => e.preventDefault()}>
          <p className="font-semibold mb-2">Kontrolli sõiduki tausta</p>
          <input type="text" placeholder="Registreerimismärk või VIN" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:border-cyan-500" />
          <div className="flex gap-2">
            <a href="https://eteenindus.mnt.ee/public/soidukTaustakontroll.jsf?lang=et" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex-1 text-center bg-cyan-600 text-white py-1.5 rounded text-xs font-medium hover:bg-cyan-700 transition">MNT taustakontroll</a>
            <a href="https://www.lkf.ee/et/kahjukontroll" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex-1 text-center bg-orange-500 text-white py-1.5 rounded text-xs font-medium hover:bg-orange-600 transition">LKF kahjukontroll</a>
          </div>
          <p className="text-slate-400 mt-2">Sisesta märk ja ava kontroll uues aknas</p>
        </div>
      )}
    </div>
  )
}

function PriceTag({ car, openPopup, setOpenPopup }) {
  const open = openPopup === car.id
  const popupClass = "absolute top-6 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-56 text-xs text-slate-700"
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
        <button onClick={e => { e.preventDefault(); setOpenPopup(open ? null : car.id) }} className="text-xs px-2 py-0.5 rounded border font-medium border-slate-200 bg-slate-50 text-slate-400 hover:opacity-80 transition">
          Hinnavõrdlus puudub
        </button>
        {open && (
          <div className={popupClass} data-pricetag style={{right: 0, maxWidth: 'calc(100vw - 4rem)'}}>
            <p className="font-semibold mb-1">Hinnavõrdlus puudub</p>
            <p className="text-slate-500">Meil ei ole piisavalt andmeid, et selle auto hinnaskoori arvutada. Hinnaanalüüs vajab vähemalt 3 sarnast autot.</p>
          </div>
        )}
      </div>
    )
  }
  const label = car.price_score <= -15 ? 'Väga soodne hind' : car.price_score <= -5 ? 'Soodne hind' : car.price_score <= 5 ? 'Keskmine hind' : car.price_score <= 15 ? 'Kõrgem hind' : 'Kõrge hind'
  const color = car.price_score <= -5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : car.price_score <= 5 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'
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
          <p className="mt-2 text-slate-400">Põhineb {car.market_count} sarnase auto hindadel</p>
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
    'Bensiin': { consumption: 7.5, price: 1.65, label: '7.5l/100km @ 1.65€/l' },
    'Diisel': { consumption: 6.0, price: 1.55, label: '6.0l/100km @ 1.55€/l' },
    'Hübriid': { consumption: 5.0, price: 1.65, label: '5.0l/100km @ 1.65€/l' },
    'Elekter': { consumption: 18, price: 0.18, label: '18kWh/100km @ 0.18€/kWh' },
  }
  const config = configs[car.fuel]
  if (!config) return null
  const annualFuel = Math.round((km / 100) * config.consumption * config.price)
const tax = car.annual_tax || car.estimated_tax || 0
const totalAnnual = annualFuel + tax
  return (
    <div className="relative inline-block" data-fuelcost>
      <button onClick={e => { e.preventDefault(); setOpen(!open) }} className="text-xs px-2 py-0.5 rounded border font-medium border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition">
        Kulud ⓘ
      </button>
      {open && (
        <div className="absolute top-6 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-64 text-xs text-slate-700" data-fuelcost>
          <p className="font-semibold mb-2">Hinnanguline kütusekulu</p>
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Aastane läbisõit</span>
              <span className="font-medium">{km.toLocaleString()} km</span>
            </div>
            <input
              type="range" min="5000" max="50000" step="1000" value={km}
              className="w-full accent-cyan-600"
              onChange={e => setKm(parseInt(e.target.value))}
              onMouseDown={e => { e.stopPropagation(); e.target.focus() }}
              onTouchStart={e => e.stopPropagation()}
              onClick={e => e.preventDefault()}
            />
            <div className="flex justify-between text-slate-400 mt-0.5"><span>5 000</span><span>50 000</span></div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Kütus</span><span>{car.fuel}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tarbimine</span><span>{config.label}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Aastane kütusekulu</span><span>~{annualFuel.toLocaleString()} €</span></div>
            {tax > 0 && <div className="flex justify-between"><span className="text-slate-500">Automaks {car.annual_tax ? '' : '(hinnang)'}</span><span>~{tax.toLocaleString()} €/a</span></div>}
            <div className="flex justify-between font-semibold pt-1 border-t border-slate-200"><span>Aastane kogukulu</span><span className="text-cyan-600">~{totalAnnual.toLocaleString()} €</span></div>
          </div>
          <p className="text-slate-400 mt-2">Hinnang põhineb keskmistel näitajatel.</p>
        </div>
      )}
    </div>
  )
}


function Onboarding({ onComplete }) {
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState({})
  const [budget, setBudget] = useState(15000)
  const [maxCarMileage, setMaxCarMileage] = useState(150000)
  const [showSummary, setShowSummary] = useState(false)
  const [recommendation, setRecommendation] = useState(null)

  const questions = [
    {
      id: 'mileage',
      question: 'Kui palju plaanid aastas sõita?',
      reason: 'Läbisõit mõjutab otseselt kütusekulu — suurema läbisõiduga tasub eelistada diislit või hübriidi.',
      options: [
        { label: 'Alla 10 000 km', value: 'low', emoji: '🚶' },
        { label: '10 000 – 25 000 km', value: 'medium', emoji: '🚗' },
        { label: 'Üle 25 000 km', value: 'high', emoji: '🛣️' },
      ]
    },
    {
      id: 'passengers',
      question: 'Kui palju inimesi peab autosse mahtuma?',
      reason: 'See aitab soovitada õiget keretüüpi — kupee, sedaan, maastur või minivan.',
      options: [
        { label: '1–2 inimest', value: 'small', emoji: '👫' },
        { label: 'Kuni 5 inimest', value: 'medium', emoji: '👪' },
        { label: '6 või rohkem', value: 'large', emoji: '👬' },
      ]
    },
    {
      id: 'budget',
      type: 'slider',
      sliderKey: 'budget',
      question: 'Milline on sinu eelarve?',
      reason: 'Eelarve aitab filtreerida välja autod, mis on sinu jaoks realistlikud.',
    },
    {
      id: 'carMileage',
      type: 'slider',
      sliderKey: 'carMileage',
      question: 'Kui suure läbisõiduga autot otsid?',
      reason: 'Suurema läbisõiduga autod on odavamad, kuid vajavad rohkem hooldust. Väiksema läbisõiduga autod on usaldusväärsemad.',
    },
    {
      id: 'age',
      question: 'Kui vana võiks auto olla?',
      reason: 'Uuemad autod on tehnoloogiliselt arenenumad, vanemad aga taskukohasemad.',
      options: [
        { label: 'Kuni 3 aastat vana', value: '3', emoji: '✨' },
        { label: 'Kuni 7 aastat vana', value: '7', emoji: '👌' },
        { label: 'Kuni 15 aastat vana', value: '15', emoji: '😁' },
        { label: 'Pole vahet', value: '', emoji: '🤷' },
      ]
    },
    {
      id: 'priority',
      question: 'Mis on sulle olulisem?',
      reason: 'See mõjutab mootori ja kütuse soovitust ning filtreerib välja sobivad autod.',
      options: [
        { label: 'Jõudlus', value: 'performance', emoji: '⚡' },
        { label: 'Ökonoomsus', value: 'economy', emoji: '🌿' },
        { label: 'Tasakaal', value: 'balance', emoji: '⚖️' },
      ]
    },
    {
      id: 'transmission',
      question: 'Kas eelistad käigukasti?',
      reason: 'Automaatkäigukast on mugavam linnasõiduks, manuaal annab rohkem kontrolli ja on tihti odavam hooldada.',
      options: [
        { label: 'Automaatkäigukast', value: 'Automaat', emoji: '🛵' },
        { label: 'Manuaalkäigukast', value: 'Manuaal', emoji: '🏎️' },
        { label: 'Pole vahet', value: '', emoji: '🤷' },
      ]
    },
    {
      id: 'fuel',
      question: 'Millist kütust eelistad?',
      reason: 'Kütuse valik mõjutab igapäevast kasutust ja hoolduskulusid. Kui pole kindel, soovitame vastuste põhjal.',
      options: [
        { label: 'Bensiin', value: 'Bensiin', emoji: '⛽' },
        { label: 'Diisel', value: 'Diisel', emoji: '🛢️' },
        { label: 'Elekter', value: 'Elekter', emoji: '⚡' },
        { label: 'Hübriid', value: 'Hübriid', emoji: '🔋' },
        { label: 'Soovita mulle', value: 'recommend', emoji: '💡' },
      ]
    },
  ]

  const currentYear = new Date().getFullYear()

  function getRecommendation(ans) {
    let fuel = ''
    let body = ''
    let transmission = ''
    let minYear = ''
    let minPower = ''
    let maxPower = ''
    let drive = ''

    if (ans.fuel && ans.fuel !== 'recommend') {
      fuel = ans.fuel
    } else {
      if (ans.mileage === 'high' || (ans.mileage === 'medium' && ans.priority === 'economy')) {
        fuel = 'Diisel'
      } else if (ans.priority === 'economy' && ans.mileage === 'low') {
        fuel = 'Hübriid'
      } else {
        fuel = 'Bensiin'
      }
    }

    if (ans.passengers === 'large') body = 'Minivan'
    else if (ans.passengers === 'medium') body = 'Universaal'
    else if (ans.priority === 'performance' && ans.passengers === 'small') body = 'Sedaan'

    if (ans.transmission) transmission = ans.transmission

    if (ans.age) minYear = String(currentYear - parseInt(ans.age))

    if (ans.priority === 'performance') {
      minPower = '130'
    }

    return { fuel, body, maxPrice: String(budget), transmission, minYear, minPower, maxCarMileage: String(maxCarMileage), sortBy: 'price_eur', sortDir: 'desc' }
  }

  function buildSummary(ans, rec) {
    const lines = []
    const mileageLabel = { low: 'alla 10 000 km/a', medium: '10 000–25 000 km/a', high: 'üle 25 000 km/a' }
    const passLabel = { small: '1–2 inimest', medium: 'kuni 5 inimest', large: '6+' }
    const priorityLabel = { performance: 'jõudlus', economy: 'ökonoomsus', balance: 'tasakaal' }

    lines.push(`🛣️ Aastane läbisõit: ${mileageLabel[ans.mileage] || ''}`)
    lines.push(`👪 Reisijaid: ${passLabel[ans.passengers] || ''}`)
    lines.push(`💰 Eelarve: kuni ${budget.toLocaleString()} €`)
    lines.push(`🚙 Auto läbisõit: kuni ${maxCarMileage.toLocaleString()} km`)
    if (ans.age) lines.push(`📅 Vanus: kuni ${ans.age} aastat`)
    lines.push(`⚖️ Prioriteet: ${priorityLabel[ans.priority] || ''}`)
    if (ans.transmission) lines.push(`🛵 Käigukast: ${ans.transmission}`)
    if (rec.fuel) lines.push(`⛽ Kütus: ${rec.fuel}`)
    if (rec.body) lines.push(`🚗 Keretüüp: ${rec.body}`)
    if (rec.minPower) lines.push(`⚡ Min võimsus: ${rec.minPower}kW`)

    return lines
  }

  function handleSelect(value) {
    const q = questions[step]
    const newAnswers = { ...answers, [q.id]: value }
    setAnswers(newAnswers)
    if (step < questions.length - 1) {
      setStep(step + 1)
    } else {
      const rec = getRecommendation(newAnswers)
      setRecommendation(rec)
      setShowSummary(true)
    }
  }

  function handleSliderNext() {
    const q = questions[step]
    const newAnswers = { ...answers, [q.id]: q.sliderKey === 'budget' ? String(budget) : String(maxCarMileage) }
    setAnswers(newAnswers)
    setStep(step + 1)
  }

  const progress = (step / questions.length) * 100

  if (step === -1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 text-center">
          <div className="text-5xl mb-4">🚗</div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Tere tulemast<span className="text-cyan-500">!</span></h2>
          <p className="text-slate-500 leading-relaxed mb-2">
            <strong className="text-slate-700">Autootsing</strong> koondab kõik Eesti autokuulutused ühte kohta — üle <strong className="text-slate-700">44 000</strong> kuulutuse neljalt saidilt.
          </p>
          <p className="text-slate-500 leading-relaxed mb-8">
            Et aidata sul kõige sobivama auto leida, küsime sinult mõned küsimused. Vastused aitavad meil filtreerida just sulle sobivad autod.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setStep(0)} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-2xl transition shadow-lg shadow-cyan-100">
              Alustame →
            </button>
            <button onClick={() => onComplete(null)} className="w-full text-slate-400 hover:text-slate-600 py-2 text-sm transition">
              Jätan vahele, otsin ise
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showSummary && recommendation) {
    const summaryLines = buildSummary(answers, recommendation)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Kas see kõlab õigesti?</h2>
            <p className="text-sm text-slate-500">Sinu vastuste põhjal otsime just sellist autot:</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
            {summaryLines.map((line, i) => (
              <p key={i} className="text-sm text-slate-700">{line}</p>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => onComplete(recommendation)} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-2xl transition shadow-lg shadow-cyan-100">
              Jah, näita mulle sobivaid autosid →
            </button>
            <button onClick={() => { setStep(0); setAnswers({}); setShowSummary(false) }} className="w-full border-2 border-slate-200 text-slate-600 font-semibold py-2.5 rounded-2xl text-sm hover:bg-slate-50 transition">
              Muudan vastuseid
            </button>
            <button onClick={() => onComplete(null)} className="w-full text-slate-400 hover:text-slate-600 py-2 text-sm transition">
              Jätan vahele
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="h-1.5 bg-slate-100">
          <div className="h-1.5 bg-cyan-500 transition-all duration-500 rounded-full" style={{width: progress + '%'}} />
        </div>
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Küsimus {step + 1}/{questions.length}</span>
            <button onClick={() => onComplete(null)} className="text-xs text-slate-400 hover:text-slate-600 transition">Jäta vahele</button>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{q.question}</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            <span className="text-cyan-600 font-semibold">Miks küsime? </span>
            {q.reason}
          </p>
          {q.type === 'slider' ? (
            <div>
              <div className="text-center mb-4">
                {q.sliderKey === 'budget' ? (
                  <>
                    <span className="text-4xl font-black text-slate-900">{budget.toLocaleString()}</span>
                    <span className="text-2xl font-black text-cyan-600"> €</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-black text-slate-900">{maxCarMileage.toLocaleString()}</span>
                    <span className="text-2xl font-black text-cyan-600"> km</span>
                  </>
                )}
              </div>
              {q.sliderKey === 'budget' ? (
                <>
                  <input type="range" min="2000" max="80000" step="1000" value={budget}
                    onChange={e => setBudget(parseInt(e.target.value))}
                    className="w-full accent-cyan-600 mb-2" />
                  <div className="flex justify-between text-xs text-slate-400 mb-6">
                    <span>2 000 €</span><span>80 000 €</span>
                  </div>
                </>
              ) : (
                <>
                  <input type="range" min="10000" max="300000" step="5000" value={maxCarMileage}
                    onChange={e => setMaxCarMileage(parseInt(e.target.value))}
                    className="w-full accent-cyan-600 mb-2" />
                  <div className="flex justify-between text-xs text-slate-400 mb-6">
                    <span>10 000 km</span><span>300 000 km</span>
                  </div>
                </>
              )}
              <button onClick={handleSliderNext} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-2xl transition">
                Edasi →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {q.options.map(opt => (
                <button key={opt.value} onClick={() => handleSelect(opt.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 transition-all duration-150 text-left group">
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="font-semibold text-slate-800 group-hover:text-cyan-700">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [listings, setListings] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [openPopup, setOpenPopup] = useState(null)
  const [country, setCountry] = useState('EE')
  const [vehicleType, setVehicleType] = useState('')
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
  const [priceDropOnly, setPriceDropOnly] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])

  useEffect(() => {
    fetchListings(0, 'created_at', 'desc')
    if (!localStorage.getItem('onboardingDone')) setShowOnboarding(true)
    const saved = localStorage.getItem('recentSearches')
    if (saved) setRecentSearches(JSON.parse(saved))
  }, [])

  useEffect(() => { fetchListings(0) }, [country])
  useEffect(() => { fetchListings(0) }, [priceDropOnly])

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
    if (country === 'EE') q = q.eq('country', 'EE')
    if (country === 'LV') q = q.eq('country', 'LV')
    if (country === 'LT') q = q.eq('country', 'LT')
    if (vehicleType) q = q.eq('vehicle_type', vehicleType)
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
    if (priceDropOnly) q = q.gt('price_drop', 0)
    if (search) q = q.ilike('title', `%${search}%`)
    return q
  }

  async function fetchListings(pageNum, sb, sd) {
    setLoading(true)
    const sortField = sb || sortBy
    const sortOrder = sd || sortDir
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
let q = supabase.from('listings').select('*', { count: 'exact' })
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
    const entry = { label, filters: { make, model, search, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage, fuel, transmission, bodyType, drive, vehicleType } }
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
    setVehicleType(f.vehicleType || '')
    setTimeout(() => fetchListings(0), 50)
  }

  function handleOnboardingComplete(rec) {
    setShowOnboarding(false)
    localStorage.setItem('onboardingDone', '1')
    if (!rec) return
    setLoading(true)
    const sortField = rec.sortBy || 'price_eur'
    const sortAsc = rec.sortDir === 'asc'
    let q = supabase.from('listings').select('*', { count: 'exact' })
      .gte('price_eur', 100)
      .eq('country', 'EE')
      .order(sortField, { ascending: sortAsc })
      .range(0, PAGE_SIZE - 1)
    if (rec.fuel) q = q.eq('fuel', rec.fuel)
    if (rec.body) q = q.eq('body', rec.body)
    if (rec.maxPrice) q = q.lte('price_eur', parseInt(rec.maxPrice))
    if (rec.transmission) q = q.eq('transmission', rec.transmission)
    if (rec.minYear) q = q.gte('year', parseInt(rec.minYear))
    if (rec.minPower) q = q.not('power_kw', 'is', null).gte('power_kw', parseInt(rec.minPower))
    if (rec.maxCarMileage) q = q.lte('mileage_km', parseInt(rec.maxCarMileage))
    q.then(({ data, count }) => {
      setListings(data || [])
      setTotal(count || 0)
      setPage(0)
      setLoading(false)
      if (rec.fuel) setFuel(rec.fuel)
      if (rec.body) setBodyType(rec.body)
      if (rec.maxPrice) setMaxPrice(rec.maxPrice)
      if (rec.transmission) setTransmission(rec.transmission)
      if (rec.minYear) setMinYear(rec.minYear)
      if (rec.maxCarMileage) setMaxMileage(rec.maxCarMileage)
      if (rec.sortBy) setSortBy(rec.sortBy)
      if (rec.sortDir) setSortDir(rec.sortDir)
    })
  }

  function doSearch() { saveSearch(); fetchListings(0) }

  function reset() {
    setMake(''); setModel(''); setBodyType(''); setDrive(''); setFuel('')
    setTransmission(''); setMinYear(''); setMaxYear(''); setMinPrice('')
    setMaxPrice(''); setMinMileage(''); setMaxMileage(''); setSearch('')
    setVehicleType(''); setSortBy('created_at'); setSortDir('desc')
    setShowFilters(false)
    fetchListings(0, 'created_at', 'desc')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const sel = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-slate-400"

  const SOURCE_COLORS = {
    auto24: 'bg-blue-100 text-blue-700',
    autoportaal: 'bg-emerald-100 text-emerald-700',
    autodiiler: 'bg-orange-100 text-orange-700',
    veego: 'bg-violet-100 text-violet-700',
    sslv: 'bg-red-100 text-red-700',
    auto24lv: 'bg-pink-100 text-pink-700',
  }

  const sidebar = (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sõiduki tüüp</p>
        <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className={sel}>
          <option value="">Kõik tüübid</option>
          <option value="Sõiduauto">Sõiduauto</option>
          <option value="Maastur">Maastur / SUV</option>
          <option value="Minivan">Minivan</option>
        </select>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Keretüüp</p>
        <select value={bodyType} onChange={e => setBodyType(e.target.value)} className={sel}>
          <option value="">Kõik</option>
          <option value="Sedaan">Sedaan</option>
          <option value="Universaal">Universaal</option>
          <option value="Luukpära">Luukpära</option>
          <option value="Maastur">Maastur</option>
          <option value="Kupee">Kupee</option>
          <option value="Kabriolett">Kabriolett</option>
          <option value="Minivan">Minivan</option>
          <option value="Kaubik">Kaubik</option>
          <option value="Pikap">Pikap</option>
        </select>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mark ja mudel</p>
        <div className="space-y-2">
          <select value={make} onChange={e => setMake(e.target.value)} className={sel}>
            <option value="">Kõik margid</option>
            {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={model} onChange={e => setModel(e.target.value)} disabled={!make} className={sel + ' disabled:opacity-40'}>
            <option value="">Kõik mudelid</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="text" placeholder="Täpsustus (nt. M-pakett, AMG...)" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className={inp} />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Aasta</p>
        <div className="flex gap-2">
          <input type="number" placeholder="Alates" value={minYear} onChange={e => setMinYear(e.target.value)} className={inp} />
          <input type="number" placeholder="Kuni" value={maxYear} onChange={e => setMaxYear(e.target.value)} className={inp} />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Hind (€)</p>
        <div className="flex gap-2">
          <input type="number" placeholder="Alates" value={minPrice} onChange={e => setMinPrice(e.target.value)} className={inp} />
          <input type="number" placeholder="Kuni" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inp} />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Läbisõit (km)</p>
        <div className="flex gap-2">
          <input type="number" placeholder="Alates" value={minMileage} onChange={e => setMinMileage(e.target.value)} className={inp} />
          <input type="number" placeholder="Kuni" value={maxMileage} onChange={e => setMaxMileage(e.target.value)} className={inp} />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kütus</p>
        <select value={fuel} onChange={e => setFuel(e.target.value)} className={sel}>
          <option value="">Kõik</option>
          <option value="Bensiin">Bensiin</option>
          <option value="Diisel">Diisel</option>
          <option value="Elekter">Elekter</option>
          <option value="Hübriid">Hübriid</option>
          <option value="Gaasbensiin">Gaas / LPG</option>
        </select>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Käigukast</p>
        <select value={transmission} onChange={e => setTransmission(e.target.value)} className={sel}>
          <option value="">Kõik</option>
          <option value="Automaat">Automaat</option>
          <option value="Manuaal">Manuaal</option>
          <option value="Poolautomaat">Poolautomaat</option>
        </select>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vedav sild</p>
        <select value={drive} onChange={e => setDrive(e.target.value)} className={sel}>
          <option value="">Kõik</option>
          <option value="Esivedu">Esivedu</option>
          <option value="Tagavedu">Tagavedu</option>
          <option value="Nelikvedu">Nelikvedu</option>
        </select>
      </div>
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <button onClick={doSearch} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm shadow-cyan-200">
          OTSI ({total.toLocaleString()})
        </button>
        <button onClick={reset} className="w-full border border-slate-200 text-slate-500 py-2 rounded-xl text-sm hover:bg-slate-50 transition">
          Tühjenda
        </button>
      </div>
      {recentSearches.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Viimased otsingud</p>
          <div className="space-y-1">
            {recentSearches.map((entry, i) => (
              <button key={i} onClick={() => applySearch(entry)} className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 border border-slate-100 truncate transition">
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      <div className="bg-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={reset} className="flex items-baseline gap-2.5 hover:opacity-90 transition">
            <span className="text-2xl font-black text-white tracking-tight">Auto<span className="text-cyan-400">otsing</span></span>
            <span className="text-slate-400 text-xs hidden sm:block font-medium">Eesti autokuulutused ühes kohas</span>
          </button>
          <div className="ml-auto flex items-center bg-slate-800 rounded-xl p-1 gap-0.5">
            {[
              { code: 'EE', flag: '🇪🇪', label: 'Eesti' },
              { code: 'LV', flag: '🇱🇻', label: 'Läti' },
              { code: 'LT', flag: '🇱🇹', label: 'Leedu' },
              { code: 'all', flag: '', label: 'Kõik' },
            ].map(({ code, flag, label }) => (
              <button key={code} onClick={() => setCountry(code)}
                className={"text-xs px-3 py-1.5 rounded-lg font-semibold transition " + (country === code ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-white')}>
                {flag} {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-sm">
            {showFilters ? 'Peida' : 'Filtrid'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row gap-5 items-start">
        <div className="hidden md:block w-60 flex-shrink-0 sticky top-4">{sidebar}</div>
        {showFilters && <div className="md:hidden w-full">{sidebar}</div>}

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-600">{total.toLocaleString()} <span className="font-normal text-slate-400">kuulutust</span></p>
            <div className="flex items-center gap-2">
              <button onClick={() => { setPriceDropOnly(!priceDropOnly); setTimeout(() => { fetchListings(0) }, 50) }} className={'text-xs px-3 py-1.5 rounded-lg font-semibold border transition ' + (priceDropOnly ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600')}>
                🔥 Hind langenud
              </button>
              <span className="text-xs text-slate-400 hidden sm:block">Järjesta:</span>
              <select value={sortBy} onChange={e => { setSortBy(e.target.value); fetchListings(0, e.target.value, sortDir) }} className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="created_at">Uusimad</option>
                <option value="price_eur">Hind</option>
                <option value="year">Aasta</option>
                <option value="mileage_km">Läbisõit</option>
              </select>
              <select value={sortDir} onChange={e => { setSortDir(e.target.value); fetchListings(0, sortBy, e.target.value) }} className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="desc">↓</option>
                <option value="asc">↑</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-24 text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">Laen kuulutusi...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map(car => (
                <a key={car.id} href={car.url} target="_blank" rel="noopener noreferrer" draggable="false"
className="flex bg-white border border-slate-200 rounded-2xl hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-50 transition-all duration-200 group relative">                  <div className="w-36 sm:w-52 h-28 sm:h-36 flex-shrink-0 bg-slate-100 overflow-hidden">
                    {car.image_url
                      ? <img src={car.image_url} alt={car.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Pilt puudub</div>
                    }
                  </div>
                  <div className="flex-1 p-3 sm:p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate text-sm sm:text-base leading-tight">{car.title}</h3>
                        <p className="text-xs text-slate-400 truncate mt-0.5 hidden sm:block">{car.description}</p>
                      </div>
                      <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
<p className="text-lg sm:text-2xl font-black text-cyan-600">{car.price_eur?.toLocaleString()} €</p>                        
{(car.country === 'EE' || car.source === 'auto24lv') && <PriceTag car={car} openPopup={openPopup} setOpenPopup={setOpenPopup} />}
{car.country === 'EE' && <HistoryCheck />}
{(car.country === 'EE' || car.source === 'auto24lv') && <FuelCost car={car} />}                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-0.5 mt-2 text-sm text-slate-500">
                      {car.year && <span className="font-bold text-slate-800 pr-3">{car.year}</span>}
                      {car.mileage_km && <><span className="text-slate-200 pr-3">|</span><span className="pr-3">{car.mileage_km?.toLocaleString()} km</span></>}
                      {car.fuel && <><span className="text-slate-200 pr-3">|</span><span className="pr-3">{car.fuel}</span></>}
                      {car.transmission && <><span className="text-slate-200 pr-3">|</span><span className="pr-3">{car.transmission}</span></>}
                      {car.body && <><span className="text-slate-200 pr-3 hidden sm:inline">|</span><span className="pr-3 hidden sm:inline">{car.body}</span></>}
                      {car.drive && <><span className="text-slate-200 pr-3 hidden sm:inline">|</span><span className="hidden sm:inline">{car.drive}</span></>}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (SOURCE_COLORS[car.source] || 'bg-slate-100 text-slate-600')}>
                        {car.source}
                      </span>
                      {car.price_drop > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                          ↓ {car.price_drop?.toLocaleString()}€ odavamaks
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-1.5 mt-6 pb-8">
              <button onClick={() => fetchListings(page - 1)} disabled={page === 0} className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-30 hover:bg-white bg-white text-slate-700 shadow-sm transition">←</button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                return <button key={pageNum} onClick={() => fetchListings(pageNum)} className={"px-4 py-2 border rounded-xl text-sm transition shadow-sm " + (pageNum === page ? 'bg-cyan-600 text-white border-cyan-600' : 'border-slate-200 hover:bg-white bg-white text-slate-700')}>{pageNum + 1}</button>
              })}
              <button onClick={() => fetchListings(page + 1)} disabled={page >= totalPages - 1} className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-30 hover:bg-white bg-white text-slate-700 shadow-sm transition">→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
