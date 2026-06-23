import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useForecast } from '../../context/ForecastContext'
import ExcelPreviewPanel from './ExcelPreviewPanel'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

export default function ResultsSection() {
  const {
    activeSection,
    forecastData,
    sensitivityData,
    insightPeakSales,
    insightPeakYear,
    insightPeakPts,
    insightGross,
    insightDiscount,
    insightDrivers,
    agentSessionId,
    excelDownloadHref,
    pptxDownloadHref,
    pptxPreparing,
    startOver,
  } = useForecast()

  if (activeSection !== 'results') return null

  const yrs = forecastData.map((d) => d.year)
  const gs = forecastData.map((d) => parseFloat(String(d.grossSales)))
  const ns = forecastData.map((d) => parseFloat(String(d.netSales)))
  const pts = forecastData.map((d) => d.treatedPatients)

  let maxNSY = 0
  forecastData.forEach((row) => {
    const nsVal = parseFloat(String(row.netSales))
    if (nsVal > parseFloat(String(forecastData.find((r) => r.year === maxNSY)?.netSales || 0)))
      maxNSY = row.year
  })
  forecastData.forEach((row) => {
    if (parseFloat(String(row.netSales)) >= parseFloat(String(forecastData[0]?.netSales || 0))) maxNSY = row.year
  })
  let peakYear = 0
  let peakVal = 0
  forecastData.forEach((row) => {
    const v = parseFloat(String(row.netSales))
    if (v > peakVal) {
      peakVal = v
      peakYear = row.year
    }
  })

  const sens = sensitivityData?.sensitivity?.slice(0, 8) || []
  const base = sensitivityData?.base_peak || 0

  return (
    <div className="rounded-xl border border-chryselys-primary/10 bg-white p-6 shadow-sm">
      <div className="mb-1 text-[10px] font-bold tracking-widest text-chryselys-gold">SECTION 5</div>
      <h2 className="mb-2 text-lg font-bold text-chryselys-primary">Forecast Results</h2>
      <p className="mb-6 text-sm text-chryselys-text-2">
        Commercial patient-based forecast summary — peak sales, patient volume, and market share analysis
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-chryselys-primary/20 bg-chryselys-primary/5 p-4">
          <div className="text-xs font-semibold text-chryselys-text-2">Peak Net Sales</div>
          <div className="text-2xl font-bold text-chryselys-primary">{insightPeakSales}</div>
          <div className="text-xs text-chryselys-text-2">{insightPeakYear}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-xs font-semibold text-chryselys-text-2">Peak Patient Volume</div>
          <div className="text-2xl font-bold text-chryselys-primary">{insightPeakPts}</div>
          <div className="text-xs text-chryselys-text-2">Treated patients at peak</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs font-semibold text-chryselys-text-2">Peak Gross Sales</div>
          <div className="text-2xl font-bold text-chryselys-primary">{insightGross}</div>
          <div className="text-xs text-chryselys-text-2">{insightDiscount}</div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-chryselys-text-2">Key Drivers</span>
        {insightDrivers.map((d) => (
          <span key={d} className="insight-driver-chip">{d}</span>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-chryselys-border p-4">
          <div className="mb-2 text-sm font-bold">Revenue Forecast ($M)</div>
          <Line
            data={{
              labels: yrs,
              datasets: [
                {
                  label: 'Gross Sales ($M)',
                  data: gs,
                  borderColor: '#1A4F72',
                  backgroundColor: 'rgba(26,79,114,.07)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                },
                {
                  label: 'Net Sales ($M)',
                  data: ns,
                  borderColor: '#0ea5e9',
                  backgroundColor: 'rgba(14,165,233,.07)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                },
              ],
            }}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
          />
        </div>
        <div className="rounded-lg border border-chryselys-border p-4">
          <div className="mb-2 text-sm font-bold">Treated Patient Volume</div>
          <Bar
            data={{
              labels: yrs,
              datasets: [
                {
                  label: 'Treated Patients',
                  data: pts,
                  backgroundColor: 'rgba(26,79,114,.18)',
                  borderColor: '#1A4F72',
                  borderWidth: 1.5,
                  borderRadius: 4,
                },
              ],
            }}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
          />
        </div>
      </div>

      {sens.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-bold">Sensitivity Analysis — Peak Net Sales Impact</h3>
          <div className="rounded-lg border border-chryselys-border p-4">
            <Bar
              data={{
                labels: sens.map((r) => r.label),
                datasets: [
                  {
                    label: '-20% assumption',
                    data: sens.map((r) => r.low - base),
                    backgroundColor: 'rgba(201,146,42,0.75)',
                  },
                  {
                    label: '+20% assumption',
                    data: sens.map((r) => r.high - base),
                    backgroundColor: 'rgba(26,79,114,0.75)',
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </div>
      )}

      <h3 className="mb-2 text-sm font-bold">Year-by-Year Forecast</h3>
      <div className="mb-6 overflow-x-auto rounded-lg border border-chryselys-border">
        <table className="w-full text-xs">
          <thead className="bg-chryselys-bg">
            <tr>
              <th className="px-2 py-2">Year</th>
              <th className="px-2 py-2">Eligible Pts</th>
              <th className="px-2 py-2">Class Share</th>
              <th className="px-2 py-2">Product Share</th>
              <th className="px-2 py-2">Treated Pts</th>
              <th className="px-2 py-2">Cost/Pt</th>
              <th className="px-2 py-2">Gross Sales</th>
              <th className="px-2 py-2">Discount</th>
              <th className="px-2 py-2">Net Sales</th>
            </tr>
          </thead>
          <tbody>
            {forecastData.map((row) => (
              <tr
                key={row.year}
                className={row.year === peakYear ? 'peak-row border-t border-chryselys-border' : 'border-t border-chryselys-border'}
              >
                <td className="px-2 py-1.5">{row.year}</td>
                <td className="px-2 py-1.5">{row.eligiblePatients.toLocaleString()}</td>
                <td className="px-2 py-1.5">{row.classShare}%</td>
                <td className="px-2 py-1.5">{row.productShare}%</td>
                <td className="px-2 py-1.5">{row.treatedPatients.toLocaleString()}</td>
                <td className="px-2 py-1.5">${row.annualCost}</td>
                <td className="px-2 py-1.5">${row.grossSales}M</td>
                <td className="px-2 py-1.5">{row.discount}%</td>
                <td className="px-2 py-1.5">${row.netSales}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 text-sm font-bold">Excel Workbook Preview</h3>
      <ExcelPreviewPanel />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={agentSessionId ? excelDownloadHref : '#'}
          download="forecast.xlsx"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white no-underline ${
            agentSessionId ? 'bg-[#217346]' : 'pointer-events-none bg-gray-400'
          }`}
        >
          Download Workbook
        </a>
        <a
          href={agentSessionId && !pptxPreparing ? pptxDownloadHref : '#'}
          download="forecast_presentation.pptx"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white no-underline ${
            agentSessionId && !pptxPreparing ? 'bg-[#d24726]' : 'pointer-events-none bg-gray-400'
          }`}
        >
          Download Presentation
        </a>
        {pptxPreparing && (
          <span className="inline-flex items-center gap-2 text-xs text-chryselys-text-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-chryselys-gold" />
            Preparing presentation…
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => startOver()}
          className="inline-flex items-center gap-2 rounded-lg border border-chryselys-border px-4 py-2 text-sm font-semibold text-chryselys-text-2"
        >
          New Forecast
        </button>
      </div>
    </div>
  )
}
