export const PS_PARAM_DEFS: Record<
  string,
  { label: string; desc: string; badge: string; cat: string }
> = {
  population: {
    label: 'Total Population',
    desc: 'Overall population of the target country/region',
    badge: 'required',
    cat: 'epi',
  },
  prevalence: {
    label: 'Prevalence Rate',
    desc: 'Stock of living patients with the condition',
    badge: 'choose-one',
    cat: 'epi',
  },
  incidence: {
    label: 'Incidence Rate',
    desc: 'New cases diagnosed per year',
    badge: 'choose-one',
    cat: 'epi',
  },
  severity: {
    label: 'Severity / Subtype %',
    desc: 'Proportion in the relevant biomarker/stage subgroup',
    badge: 'optional',
    cat: 'epi',
  },
  diagnosisRate: {
    label: 'Diagnosis Rate',
    desc: 'Proportion of affected patients clinically identified',
    badge: 'optional',
    cat: 'epi',
  },
  treatmentRate: {
    label: 'Treatment Rate',
    desc: 'Proportion of diagnosed patients receiving therapy',
    badge: 'optional',
    cat: 'treat',
  },
  eligibilityCriteria: {
    label: 'Eligibility Criteria',
    desc: 'Biomarker, line of therapy, or inclusion gate',
    badge: 'optional',
    cat: 'treat',
  },
  progressionRate: {
    label: 'Progression Rate',
    desc: 'Disease progression or line advancement rate',
    badge: 'optional',
    cat: 'treat',
  },
  classShare: {
    label: 'Peak Class Share',
    desc: 'Drug class vs other classes at peak',
    badge: 'optional',
    cat: 'market',
  },
  peakProductShare: {
    label: 'Peak Product Share',
    desc: 'This product within its class at peak',
    badge: 'optional',
    cat: 'market',
  },
  annualCostPerPatient: {
    label: 'Annual Cost per Patient',
    desc: 'Gross annual treatment cost',
    badge: 'optional',
    cat: 'pricing',
  },
  discount: {
    label: 'Discount / Rebate Rate',
    desc: 'Net pricing after payer rebates',
    badge: 'optional',
    cat: 'pricing',
  },
}

export const PS_PRESETS: Record<string, string[]> = {
  standard: [
    'population',
    'prevalence',
    'diagnosisRate',
    'treatmentRate',
    'classShare',
    'peakProductShare',
    'annualCostPerPatient',
    'discount',
  ],
  oncology: [
    'population',
    'incidence',
    'diagnosisRate',
    'eligibilityCriteria',
    'treatmentRate',
    'classShare',
    'peakProductShare',
    'annualCostPerPatient',
    'discount',
  ],
  rare: [
    'population',
    'prevalence',
    'diagnosisRate',
    'eligibilityCriteria',
    'classShare',
    'peakProductShare',
    'annualCostPerPatient',
    'discount',
  ],
}

export const PS_CATEGORIES = [
  {
    id: 'epi',
    label: 'Epidemiology',
    params: ['population', 'prevalence', 'incidence', 'severity', 'diagnosisRate'],
  },
  {
    id: 'treat',
    label: 'Treatment Flow',
    params: ['eligibilityCriteria', 'treatmentRate', 'progressionRate'],
  },
  {
    id: 'market',
    label: 'Market Dynamics',
    params: ['classShare', 'peakProductShare'],
  },
  {
    id: 'pricing',
    label: 'Pricing & Access',
    params: ['annualCostPerPatient', 'discount'],
  },
]

export const PS_FUNNEL_ORDER = [
  'population',
  'prevalence',
  'incidence',
  'severity',
  'diagnosisRate',
  'eligibilityCriteria',
  'treatmentRate',
  'progressionRate',
  'classShare',
  'peakProductShare',
  'annualCostPerPatient',
  'discount',
]

export const PS_STEP_ICONS: Record<string, string> = {
  population: '🌍',
  prevalence: '📊',
  incidence: '📋',
  severity: '🎯',
  diagnosisRate: '🏥',
  eligibilityCriteria: '🔬',
  treatmentRate: '💊',
  progressionRate: '📈',
  classShare: '🏆',
  peakProductShare: '⭐',
  annualCostPerPatient: '💰',
  discount: '🏷️',
}

export const PS_STEP_SHORT: Record<string, string> = {
  population: 'Population',
  prevalence: 'Prevalence',
  incidence: 'Incidence',
  severity: 'Subtype %',
  diagnosisRate: 'Diagnosed',
  eligibilityCriteria: 'Eligible',
  treatmentRate: 'Treated',
  progressionRate: 'Progression',
  classShare: 'Class Share',
  peakProductShare: 'Prod. Share',
  annualCostPerPatient: 'Cost/Pt',
  discount: 'Net Price',
}

export const TYPE_BADGE: Record<string, string> = { flow: 'Flow', assumptions: 'Assumptions' }
export const TYPE_ICON: Record<string, string> = { flow: '⇢', assumptions: '⊙' }

export const COUNTRIES = [
  'United States',
  'Germany',
  'United Kingdom',
  'France',
  'Japan',
  'China',
  'Canada',
  'Italy',
  'Spain',
]
