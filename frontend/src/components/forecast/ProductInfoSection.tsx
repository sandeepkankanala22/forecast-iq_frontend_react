import { COUNTRIES } from '../../lib/forecast/constants'
import { useForecast } from '../../context/ForecastContext'

export default function ProductInfoSection() {
  const { product, setProduct, highlightField, showParameterSelection, activeSection } = useForecast()
  if (activeSection !== 'product') return null

  const fieldClass = (id: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
      highlightField === id
        ? 'border-chryselys-gold shadow-[0_0_0_3px_rgba(201,146,42,0.2)]'
        : 'border-chryselys-border focus:border-chryselys-primary'
    }`

  return (
    <div className="rounded-xl border border-chryselys-primary/10 bg-white p-6 shadow-sm">
      <div className="mb-1 text-[10px] font-bold tracking-widest text-chryselys-gold">SECTION 1</div>
      <h2 className="mb-4 text-lg font-bold text-chryselys-primary">Product Information</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-chryselys-text-2">Country*</label>
          <select
            id="country"
            value={product.country}
            onChange={(e) => setProduct((p) => ({ ...p, country: e.target.value }))}
            className={fieldClass('country')}
          >
            <option value="">Select Country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-chryselys-text-2">Product Name*</label>
          <input
            id="productName"
            value={product.productName}
            onChange={(e) => setProduct((p) => ({ ...p, productName: e.target.value }))}
            placeholder="e.g., TUB-040"
            className={fieldClass('productName')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-chryselys-text-2">Class / Mechanism of Action*</label>
          <input
            id="classMoa"
            value={product.classMoa}
            onChange={(e) => setProduct((p) => ({ ...p, classMoa: e.target.value }))}
            placeholder="e.g., Antibody-Drug Conjugate (ADC)"
            className={fieldClass('classMoa')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-chryselys-text-2">Indication*</label>
          <input
            id="indication"
            value={product.indication}
            onChange={(e) => setProduct((p) => ({ ...p, indication: e.target.value }))}
            placeholder="e.g., Non-small cell lung cancer"
            className={fieldClass('indication')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-chryselys-text-2">Forecast-Launch (Year)*</label>
          <input
            id="launchYear"
            type="number"
            value={product.launchYear}
            onChange={(e) => setProduct((p) => ({ ...p, launchYear: e.target.value }))}
            placeholder="2025"
            min={2024}
            max={2040}
            className={fieldClass('launchYear')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-chryselys-text-2">Forecast-End (Year)*</label>
          <input
            id="peakYear"
            type="number"
            value={product.peakYear}
            onChange={(e) => setProduct((p) => ({ ...p, peakYear: e.target.value }))}
            placeholder="2030"
            min={2025}
            max={2045}
            className={fieldClass('peakYear')}
          />
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={showParameterSelection}
          className="rounded-lg bg-gradient-to-br from-chryselys-primary to-chryselys-navy-light px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Define Forecast Flow →
        </button>
      </div>
    </div>
  )
}
