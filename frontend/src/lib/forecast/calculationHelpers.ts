import type { AssumptionValue, Assumptions, SelectedParameters } from './types'
import { PARAMETER_LABELS } from './constants'

export function calculateShareByYear(
  sp: AssumptionValue,
  yearIndex: number,
  assumptions: Assumptions,
): number {
  const launchYear = Number(assumptions.launchYear) || 0
  const peakYear = Number(assumptions.peakYear) || 0
  const ttp = sp.timeToPeak || peakYear - launchYear
  const ss = sp.startingShare || 0.05
  const pk = sp.value
  const ct = sp.curveType || 'scurve'
  if (yearIndex === 0) return ss
  const tr = yearIndex / ttp
  if (ct === 'linear') return tr >= 1 ? pk : ss + (pk - ss) * tr
  if (ct === 'exponential') return tr >= 1 ? pk : ss + (pk - ss) * Math.pow(tr, 2)
  if (tr >= 1) {
    const df = (tr - 1) * 0.15
    return Math.max(pk * 0.7, pk * (1 - df))
  }
  return ss + (pk - ss) / (1 + Math.exp(-5 * (tr - 0.5)))
}

export function computeInsightDrivers(assumptions: Assumptions): string[] {
  const drivers: string[] = []
  const dr = assumptions.diagnosisRate
  const cs = assumptions.classShare
  const ac = assumptions.annualCostPerPatient
  const ec = assumptions.eligibilityCriteria
  const tr = assumptions.treatmentRate
  if (dr && dr.value >= 0.75) drivers.push(`High diagnosis rate (${(dr.value * 100).toFixed(0)}%)`)
  if (cs && cs.value >= 0.35) drivers.push(`Strong class adoption (${(cs.value * 100).toFixed(0)}%)`)
  if (ac && ac.value >= 50000)
    drivers.push(`Premium pricing ($${Math.round(ac.value / 1000)}K/yr)`)
  if (ec && ec.value >= 0.75) drivers.push(`Broad eligibility (${(ec.value * 100).toFixed(0)}%)`)
  if (tr && tr.value >= 0.7) drivers.push(`High treatment rate (${(tr.value * 100).toFixed(0)}%)`)
  if (drivers.length === 0) drivers.push('Moderate market assumptions')
  return drivers.slice(0, 4)
}

export interface CalcYearBlock {
  year: number
  yearIndex: number
  html: string
}

export function generateCalculationEngineHtml(
  assumptions: Assumptions,
  selectedParameters: SelectedParameters,
  horizon: number,
): string {
  const ep = assumptions.population?.value || 0
  const ly = Number(assumptions.launchYear) || 0
  let html = ''

  for (let i = 0; i <= Math.min(horizon, 4); i++) {
    const yr = ly + i
    html += `<div class="card" style="margin-bottom:20px;background:rgba(26,79,114,.02);">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;color:#1A4F72;">Year ${yr} (Launch + ${i} years)</h3>`
    html += `<h4 style="font-size:13px;font-weight:700;margin:14px 0 10px;">1. Epidemiology Build-Up</h4>
      <table style="font-size:11px;margin-bottom:14px;width:100%;">
        <thead><tr style="background:rgba(26,79,114,.1);">
          <th>Parameter</th><th style="text-align:right">Value</th><th style="text-align:right">Calculation</th><th style="text-align:right">Result</th>
        </tr></thead><tbody>`

    let rt = ep
    if (assumptions.population)
      html += `<tr><td><strong>Total Population</strong></td><td style="text-align:right">${assumptions.population.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td style="text-align:right;font-family:monospace;font-size:10px;">Base</td><td style="text-align:right;font-weight:700">${rt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>`

    for (const p of selectedParameters.parameters) {
      if ((p === 'prevalence' || p === 'incidence') && assumptions[p]) {
        const a = assumptions[p] as AssumptionValue
        const baseRate = a.value
        const yoy = a.yoyGrowth || 0
        const effectiveRate = baseRate * Math.pow(1 + yoy, i)
        const growthNote =
          yoy && i > 0
            ? ` <span style="color:#1A4F72;font-size:9px;">(+${(yoy * 100).toFixed(1)}%/yr → ${effectiveRate.toFixed(4)})</span>`
            : ''
        const prev = rt
        rt *= effectiveRate
        html += `<tr><td><strong>${PARAMETER_LABELS[p]}</strong>${growthNote}</td><td style="text-align:right">${effectiveRate.toFixed(4)}</td><td style="text-align:right;font-family:monospace;font-size:10px;">${prev.toLocaleString(undefined, { maximumFractionDigits: 0 })} × ${effectiveRate.toFixed(4)}</td><td style="text-align:right;font-weight:700">${rt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>`
      }
      if (p === 'diagnosisRate' && assumptions.diagnosisRate) {
        const prev = rt
        rt *= assumptions.diagnosisRate.value
        html += `<tr><td><strong>Diagnosed Patients</strong></td><td style="text-align:right">${(assumptions.diagnosisRate.value * 100).toFixed(1)}%</td><td style="text-align:right;font-family:monospace;font-size:10px;">${prev.toLocaleString(undefined, { maximumFractionDigits: 0 })} × ${assumptions.diagnosisRate.value.toFixed(3)}</td><td style="text-align:right;font-weight:700">${rt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>`
      }
      if (p === 'treatmentRate' && assumptions.treatmentRate) {
        const prev = rt
        rt *= assumptions.treatmentRate.value
        html += `<tr><td><strong>Treated Patients</strong></td><td style="text-align:right">${(assumptions.treatmentRate.value * 100).toFixed(1)}%</td><td style="text-align:right;font-family:monospace;font-size:10px;">${prev.toLocaleString(undefined, { maximumFractionDigits: 0 })} × ${assumptions.treatmentRate.value.toFixed(3)}</td><td style="text-align:right;font-weight:700">${rt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>`
      }
      if (p === 'eligibilityCriteria' && assumptions.eligibilityCriteria) {
        const prev = rt
        rt *= assumptions.eligibilityCriteria.value
        html += `<tr style="background:rgba(26,79,114,.05)"><td><strong>Eligible Patients</strong></td><td style="text-align:right">${(assumptions.eligibilityCriteria.value * 100).toFixed(1)}%</td><td style="text-align:right;font-family:monospace;font-size:10px;">${prev.toLocaleString(undefined, { maximumFractionDigits: 0 })} × ${assumptions.eligibilityCriteria.value.toFixed(3)}</td><td style="text-align:right;font-weight:700;color:#1A4F72">${rt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td></tr>`
      }
    }
    html += `</tbody></table>`

    const cs = assumptions.classShare ? calculateShareByYear(assumptions.classShare, i, assumptions) : 0
    const ps = assumptions.peakProductShare
      ? calculateShareByYear(assumptions.peakProductShare, i, assumptions)
      : 0
    const fp = rt * cs * ps
    const ac = assumptions.annualCostPerPatient ? assumptions.annualCostPerPatient.value : 0
    const gs = (fp * ac) / 1e6
    const dc = assumptions.discount ? assumptions.discount.value : 0
    const ns = gs * (1 - dc)
    html += `<h4 style="font-size:13px;font-weight:700;margin:14px 0 10px;">2. Revenue Build-Up</h4>
      <table style="font-size:11px;width:100%;">
        <thead><tr style="background:rgba(26,79,114,.1)"><th>Component</th><th style="text-align:right">Value</th><th style="text-align:right">Calculation</th><th style="text-align:right">Result ($M)</th></tr></thead>
        <tbody>
          <tr><td><strong>Product Patients</strong></td><td style="text-align:right">${fp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td style="text-align:right;font-family:monospace;font-size:10px;">Eligible × ${(cs * 100).toFixed(1)}% × ${(ps * 100).toFixed(1)}%</td><td style="text-align:right">–</td></tr>
          <tr><td><strong>Annual Cost/Patient</strong></td><td style="text-align:right">$${ac.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td style="text-align:right;font-family:monospace;font-size:10px;">Base</td><td style="text-align:right">–</td></tr>
          <tr><td><strong>Gross Sales</strong></td><td style="text-align:right">–</td><td style="text-align:right;font-family:monospace;font-size:10px;">${fp.toLocaleString(undefined, { maximumFractionDigits: 0 })} × $${ac.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td style="text-align:right;font-weight:700">$${gs.toFixed(1)}M</td></tr>
          <tr><td><strong>Discount/Rebate</strong></td><td style="text-align:right">${(dc * 100).toFixed(1)}%</td><td style="text-align:right;font-family:monospace;font-size:10px;">Gross × ${dc.toFixed(3)}</td><td style="text-align:right">–$${(gs * dc).toFixed(1)}M</td></tr>
          <tr style="background:rgba(26,79,114,.05);border-top:2px solid #1A4F72"><td><strong>Net Sales</strong></td><td style="text-align:right">–</td><td style="text-align:right;font-family:monospace;font-size:10px;">Gross × (1 – Discount%)</td><td style="text-align:right;font-weight:700;color:#1A4F72">$${ns.toFixed(1)}M</td></tr>
        </tbody>
      </table></div>`
  }

  if (horizon > 4)
    html += `<div class="notice"><em>Showing first 5 years. Full data in Results table below.</em></div>`
  return html
}
