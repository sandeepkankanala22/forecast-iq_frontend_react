import type { ChatStepDef, ParameterItem } from './types'

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

export const INDICATIONS = [
  'Rheumatoid Arthritis',
  'Multiple Sclerosis',
  'Type 2 Diabetes',
  'Oncology',
  'Alzheimer Disease',
  'Heart Failure',
]

export const COUNTRY_ALIASES: Record<string, string> = {
  us: 'United States',
  usa: 'United States',
  'united states': 'United States',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  gb: 'United Kingdom',
  britain: 'United Kingdom',
  de: 'Germany',
  germany: 'Germany',
  fr: 'France',
  france: 'France',
  jp: 'Japan',
  japan: 'Japan',
  cn: 'China',
  china: 'China',
  ca: 'Canada',
  canada: 'Canada',
  it: 'Italy',
  italy: 'Italy',
  es: 'Spain',
  spain: 'Spain',
}

export const CHAT_STEPS: ChatStepDef[] = [
  {
    key: 'country',
    ask: 'Which **country** are you targeting?\n\n(e.g. United States, Germany, Japan…)',
    qr: COUNTRIES,
  },
  {
    key: 'productName',
    ask: 'What is the **product name**?\n\n(e.g., TUB-040)',
    qr: [],
  },
  {
    key: 'classMoa',
    ask: 'What is the **drug class / mechanism of action**?\n\n(e.g., Antibody-Drug Conjugate, ADC / NaPi2b targeting)',
    qr: [],
  },
  {
    key: 'indication',
    ask: 'What **therapeutic indication** is being targeted?\n\n(e.g., Non-small cell lung cancer, Ovarian cancer)',
    qr: INDICATIONS,
  },
  {
    key: 'launchYear',
    ask: 'What year is the **planned launch**?\n\n(e.g., 2028)',
    qr: ['2025', '2026', '2027', '2028', '2029', '2030'],
  },
  {
    key: 'peakYear',
    ask: 'What is the **Forecast - End Year**?\n\n(e.g., 2034)',
    qr: ['2030', '2031', '2032', '2033', '2034', '2035'],
  },
]

export const PARAMETER_LABELS: Record<string, string> = {
  population: 'Total Population',
  prevalence: 'Prevalence Rate',
  incidence: 'Incidence Rate',
  severity: 'Severity / Subtype %',
  diagnosisRate: 'Diagnosis Rate',
  treatmentRate: 'Treatment Rate',
  eligibilityCriteria: 'Eligibility Criteria',
  progressionRate: 'Disease Progression Rate',
  classShare: 'Peak Class Share',
  peakProductShare: 'Peak Product Share',
  annualCostPerPatient: 'Annual Cost per Patient',
  discount: 'Discount/Rebate Rate',
  adoptionPeakTime: 'Time to Peak (Years)',
}

export const DEFAULT_SELECTED_PARAMETERS = {
  epidemiology: 'prevalence' as const,
  parameters: [
    'population',
    'prevalence',
    'diagnosisRate',
    'treatmentRate',
    'eligibilityCriteria',
    'classShare',
    'peakProductShare',
    'annualCostPerPatient',
    'discount',
  ],
}

export const EPIDEMIOLOGY_DEFAULTS: Record<
  string,
  { prevalence: number; diagnosis: number; treatment: number; biomarker: number }
> = {
  'Rheumatoid Arthritis': { prevalence: 0.005, diagnosis: 0.75, treatment: 0.7, biomarker: 0.8 },
  'Multiple Sclerosis': { prevalence: 0.0025, diagnosis: 0.85, treatment: 0.8, biomarker: 0.9 },
  'Type 2 Diabetes': { prevalence: 0.095, diagnosis: 0.7, treatment: 0.65, biomarker: 0.85 },
  Oncology: { prevalence: 0.0045, diagnosis: 0.9, treatment: 0.75, biomarker: 0.7 },
  'Alzheimer Disease': { prevalence: 0.011, diagnosis: 0.65, treatment: 0.5, biomarker: 0.6 },
  'Heart Failure': { prevalence: 0.02, diagnosis: 0.8, treatment: 0.7, biomarker: 0.75 },
  Default: { prevalence: 0.005, diagnosis: 0.75, treatment: 0.7, biomarker: 0.8 },
}

export const POPULATION_DATA: Record<string, number> = {
  'United States': 335000000,
  Germany: 84000000,
  'United Kingdom': 68000000,
  France: 68000000,
  Japan: 125000000,
  China: 1425000000,
  Canada: 39000000,
  Italy: 59000000,
  Spain: 48000000,
}

export const DISCOUNT_RATES: Record<string, { base: number; range: string }> = {
  'United States': { base: 0.22, range: '15-30%' },
  Germany: { base: 0.18, range: '12-25%' },
  'United Kingdom': { base: 0.2, range: '15-28%' },
  France: { base: 0.19, range: '14-26%' },
  Japan: { base: 0.12, range: '8-18%' },
  China: { base: 0.25, range: '18-35%' },
  Canada: { base: 0.21, range: '16-28%' },
  Italy: { base: 0.17, range: '12-24%' },
  Spain: { base: 0.16, range: '11-23%' },
}

export const PRESETS: Record<
  string,
  { params: string[]; label: string } | null
> = {
  standard: {
    params: [
      'population',
      'prevalence',
      'diagnosisRate',
      'treatmentRate',
      'eligibilityCriteria',
      'classShare',
      'peakProductShare',
      'annualCostPerPatient',
      'discount',
    ],
    label: 'Standard Forecast Template',
  },
  rare: {
    params: [
      'population',
      'prevalence',
      'diagnosisRate',
      'eligibilityCriteria',
      'classShare',
      'peakProductShare',
      'annualCostPerPatient',
      'discount',
    ],
    label: 'Rare Disease',
  },
  oncology: {
    params: [
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
    label: 'Oncology',
  },
  custom: null,
}

export const XV_PENDING = ['Calculations', 'Summary']

export const XV_STAGES = [
  { pct: 5, label: 'Reading market assumptions…', s: 2 },
  { pct: 13, label: 'Estimating patient population…', s: 15 },
  { pct: 22, label: 'Modeling treatment rates…', s: 32 },
  { pct: 32, label: 'Building revenue waterfall…', s: 55 },
  { pct: 41, label: 'Calculating peak year dynamics…', s: 85 },
  { pct: 52, label: 'Running sensitivity analysis…', s: 125 },
  { pct: 61, label: 'Applying net price adjustments…', s: 165 },
  { pct: 69, label: 'Generating scenario forecasts…', s: 205 },
  { pct: 76, label: 'Building summary tables…', s: 245 },
  { pct: 83, label: 'Formatting workbook sheets…', s: 285 },
  { pct: 88, label: 'Writing formulas and chart data…', s: 315 },
  { pct: 92, label: 'Validating outputs…', s: 340 },
  { pct: 94, label: 'Almost ready…', s: 355 },
]

export function createDefaultParameterItems(): Record<string, ParameterItem[]> {
  return {
    epidemiology: [
      {
        id: 'population',
        label: 'Total Population',
        description: 'Target country population base',
        category: 'epidemiology',
        type: 'checkbox',
        checked: true,
        disabled: true,
        required: true,
        badge: 'Required',
        draggable: false,
        deletable: false,
      },
      {
        id: 'prevalence',
        label: 'Prevalence Rate',
        description: 'Existing disease burden',
        category: 'epidemiology',
        type: 'radio',
        radioGroup: 'epi-type',
        checked: true,
        badge: 'Choose One',
        draggable: false,
        deletable: false,
      },
      {
        id: 'incidence',
        label: 'Incidence Rate',
        description: 'New cases per year',
        category: 'epidemiology',
        type: 'radio',
        radioGroup: 'epi-type',
        checked: false,
        badge: 'Choose One',
        draggable: false,
        deletable: false,
      },
      {
        id: 'severity',
        label: 'Severity / Subtype %',
        description: 'Disease severity or specific subtype prevalence',
        category: 'epidemiology',
        type: 'checkbox',
        checked: false,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
      {
        id: 'diagnosisRate',
        label: 'Diagnosis Rate',
        description: 'Proportion of patients diagnosed',
        category: 'epidemiology',
        type: 'checkbox',
        checked: true,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
    ],
    treatment: [
      {
        id: 'treatmentRate',
        label: 'Treatment Rate',
        description: 'Proportion receiving treatment',
        category: 'treatment',
        type: 'checkbox',
        checked: true,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
      {
        id: 'eligibilityCriteria',
        label: 'Eligibility Criteria',
        description: 'Biomarker, line of therapy, inclusion criteria',
        category: 'treatment',
        type: 'checkbox',
        checked: true,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
      {
        id: 'progressionRate',
        label: 'Progression Rate',
        description: 'Disease progression or line advancement rate',
        category: 'treatment',
        type: 'checkbox',
        checked: false,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
    ],
    market: [
      {
        id: 'classShare',
        label: 'Peak Class Share',
        description: 'Drug class market share at peak',
        category: 'market',
        type: 'checkbox',
        checked: true,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
      {
        id: 'peakProductShare',
        label: 'Peak Product Share',
        description: 'Product share within class at peak',
        category: 'market',
        type: 'checkbox',
        checked: true,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
    ],
    pricing: [
      {
        id: 'annualCostPerPatient',
        label: 'Annual Cost per Patient',
        description: 'Annual treatment cost (gross)',
        category: 'pricing',
        type: 'checkbox',
        checked: true,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
      {
        id: 'discount',
        label: 'Discount / Rebate Rate',
        description: 'Net pricing after discounts and rebates',
        category: 'pricing',
        type: 'checkbox',
        checked: true,
        badge: 'Optional',
        draggable: true,
        deletable: true,
      },
    ],
  }
}

export const WELCOME_MESSAGE =
  "Hello! I'm your **AI Forecast Assistant**.\n\n" +
  'I can help you build a commercial forecast in two ways:\n\n' +
  '• **All at once** — just describe your asset in one message, e.g.:\n  _"Forecast for **TUB-040** (ADC / NaPi2b targeting, Gilead / Tubulis) in the US for NSCLC, **launching 2028**, **forecast end year 2034**"_\n\n' +
  "• **Step by step** — I'll ask one question at a time.\n\n" +
  "Let's start — "
