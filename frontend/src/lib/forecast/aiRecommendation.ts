export const REC_PARAM_LABELS: Record<string, string> = {
  prevalence: 'Prevalence Rate',
  incidence: 'Incidence Rate',
  diagnosisRate: 'Diagnosis Rate',
  severity: 'Severity Filter',
  treatmentRate: 'Treatment Rate',
  eligibilityCriteria: 'Eligibility Criteria',
  progressionRate: 'Progression Rate',
  classShare: 'Class Share',
  peakProductShare: 'Peak Product Share',
  annualCostPerPatient: 'Annual Cost / Patient',
  discount: 'Discount Rate',
}

export function buildFallbackRec(indication: string): { text: string; params: string[] } {
  const ind = (indication || '').toLowerCase()
  let text: string
  let params: string[]

  if (ind.includes('oncol') || ind.includes('cancer') || ind.includes('tumour') || ind.includes('tumor')) {
    params = ['incidence', 'diagnosisRate', 'eligibilityCriteria', 'treatmentRate', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']
    text =
      'For <strong>Oncology</strong>, <strong>Incidence Rate</strong> is the correct epidemiological base — cancer is modelled on new cases per year rather than stock prevalence.'
  } else if (ind.includes('rare') || ind.includes('orphan')) {
    params = ['prevalence', 'diagnosisRate', 'eligibilityCriteria', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']
    text =
      'For <strong>Rare / Orphan Disease</strong>, <strong>Prevalence Rate</strong> defines the small but well-characterised patient base.'
  } else if (ind.includes('alzheimer') || ind.includes('dementia')) {
    params = ['prevalence', 'diagnosisRate', 'eligibilityCriteria', 'treatmentRate', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']
    text =
      "For <strong>Alzheimer's Disease</strong>, <strong>Prevalence Rate</strong> is appropriate — AD is a large, chronic prevalent condition."
  } else if (ind.includes('diabet') || ind.includes('t2d') || ind.includes('type 2')) {
    params = ['prevalence', 'diagnosisRate', 'treatmentRate', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']
    text =
      'For <strong>Type 2 Diabetes</strong>, <strong>Prevalence Rate</strong> underpins a large chronic patient pool.'
  } else {
    params = ['prevalence', 'diagnosisRate', 'treatmentRate', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']
    text = `For <strong>${indication || 'this indication'}</strong>, <strong>Prevalence Rate</strong> provides the epidemiological base.`
  }

  const chips =
    '<div class="ai-rec-params-label">Selected Parameters (' +
    params.length +
    ')</div><div class="ai-rec-param-chips">' +
    params.map((p) => `<span class="ai-rec-chip"><span class="ai-rec-chip-dot"></span>${REC_PARAM_LABELS[p] || p}</span>`).join('') +
    '</div>'
  return { text: text + chips, params }
}

export async function researchFallback(indication: string, country: string, classMoa: string) {
  await new Promise((r) => setTimeout(r, 1200))
  const db: Record<string, Record<string, unknown>> = {
    'Rheumatoid Arthritis': {
      prevalence: 0.0055, prevalenceRationale: `RA prevalence 0.55% in ${country}.`,
      diagnosis: 0.78, diagnosisRationale: 'Diagnosis rate 78% per ACR registry.',
      treatment: 0.72, treatmentRationale: 'Treatment rate 72% per EULAR guidelines.',
      biomarker: 0.82, biomarkerRationale: '82% eligibility (moderate-severe disease, DMARD-inadequate).',
      classShare: 0.38, classShareRationale: `${classMoa} expected 38% peak share in RA biologics.`,
      productShare: 0.27, productShareRationale: 'Product share 27% vs recent RA biologic launches.',
      annualCost: 68000, costRationale: `Annual cost $68K benchmark for RA biologics in ${country}.`,
      discountRationale: 'Net pricing after mandatory rebates and PBM negotiations.',
    },
    'Multiple Sclerosis': {
      prevalence: 0.0028, prevalenceRationale: 'MS prevalence 0.28% per MSIF Atlas 2023.',
      diagnosis: 0.87, diagnosisRationale: 'Diagnosis rate 87% with McDonald criteria.',
      treatment: 0.81, treatmentRationale: 'Treatment rate 81% per MS registries.',
      biomarker: 0.88, biomarkerRationale: '88% eligibility: RRMS, prior DMT failure.',
      classShare: 0.42, classShareRationale: `${classMoa} expected 42% share in MS DMT market.`,
      productShare: 0.29, productShareRationale: '29% share benchmarking recent MS launches.',
      annualCost: 88000, costRationale: 'Annual cost $88K per high-efficacy MS pricing.',
      discountRationale: 'Specialty pharmacy rebates and payer negotiations.',
    },
    Oncology: {
      prevalence: 0.0048, prevalenceRationale: 'Cancer prevalence 0.48% per GLOBOCAN 2023.',
      diagnosis: 0.92, diagnosisRationale: 'Diagnosis rate 92% given symptomatic presentation.',
      treatment: 0.77, treatmentRationale: 'Treatment rate 77% for eligible patients.',
      biomarker: 0.68, biomarkerRationale: '68% biomarker positive rate.',
      classShare: 0.44, classShareRationale: `${classMoa} expected 44% in target cancer segment.`,
      productShare: 0.31, productShareRationale: '31% share benchmarking recent IO launches.',
      annualCost: 185000, costRationale: 'Annual cost $185K per oncology pricing.',
      discountRationale: 'Oncology discounts 15-22% vs primary care.',
    },
  }
  const d = db[indication] || {
    prevalence: 0.005,
    prevalenceRationale: `Prevalence for ${indication} estimated at 0.5%.`,
    diagnosis: 0.75,
    diagnosisRationale: 'Diagnosis rate 75% estimated.',
    treatment: 0.7,
    treatmentRationale: 'Treatment rate 70% estimated.',
    biomarker: 0.8,
    biomarkerRationale: 'Eligibility criteria 80% estimated.',
    classShare: 0.35,
    classShareRationale: `${classMoa} class share 35% estimated.`,
    productShare: 0.25,
    productShareRationale: 'Product share 25% conservative estimate.',
    annualCost: 65000,
    costRationale: `Annual cost $65K for ${classMoa} in ${country}.`,
    discountRationale: `Discount based on ${country} market averages.`,
  }
  return d
}
