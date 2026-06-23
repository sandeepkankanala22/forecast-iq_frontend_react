export type WorkflowStage =
  | 'product_info'
  | 'parameter_selection'
  | 'assumptions'
  | 'forecast_engine'
  | 'results'

export type ChatRole = 'user' | 'assistant' | 'bot'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  time: string
  html?: boolean
  actions?: DownloadAction[]
  liveHtml?: string
}

export interface DownloadAction {
  label: string
  href: string
  download: string
  cls?: 'excel' | 'pptx'
}

export interface ProductInfo {
  country: string
  productName: string
  classMoa: string
  indication: string
  launchYear: string
  peakYear: string
}

export interface ChatStepDef {
  key: keyof ProductInfo
  ask: string
  qr: string[]
}

export interface AssumptionValue {
  value: number
  unit?: string
  unitType?: string
  displayUnit?: string
  range?: string
  rationale?: string
  yoyGrowth?: number
  startingShare?: number
  timeToPeak?: number
  peakYear?: number
  curveType?: string
  label?: string
  description?: string
  category?: string
}

export interface Assumptions extends Partial<ProductInfo> {
  selectedFlow?: string[]
  population?: AssumptionValue
  prevalence?: AssumptionValue
  incidence?: AssumptionValue
  severity?: AssumptionValue
  diagnosisRate?: AssumptionValue
  treatmentRate?: AssumptionValue
  eligibilityCriteria?: AssumptionValue
  progressionRate?: AssumptionValue
  classShare?: AssumptionValue
  peakProductShare?: AssumptionValue
  annualCostPerPatient?: AssumptionValue
  discount?: AssumptionValue
  adoptionPeakTime?: AssumptionValue
  [key: string]: AssumptionValue | string | number | string[] | undefined
}

export interface ForecastRow {
  year: number
  eligiblePatients: number
  classShare: number | string
  productShare: number | string
  treatedPatients: number
  annualCost: number | string
  grossSales: number | string
  discount: number | string
  netSales: number | string
}

export interface SelectedParameters {
  epidemiology: 'prevalence' | 'incidence'
  parameters: string[]
}

export interface CustomParameter {
  name: string
  description: string
  category: ParameterCategory
}

export type ParameterCategory = 'epidemiology' | 'treatment' | 'market' | 'pricing'

export interface ParameterItem {
  id: string
  label: string
  description: string
  category: ParameterCategory
  type: 'checkbox' | 'radio'
  radioGroup?: string
  checked: boolean
  disabled?: boolean
  required?: boolean
  badge?: string
  draggable: boolean
  deletable: boolean
  custom?: boolean
}

export interface ResearchSource {
  title: string
  domain: string
  url: string
}

export interface ResearchData {
  sources?: ResearchSource[]
  prevalence: number
  prevalenceRationale: string
  diagnosis: number
  diagnosisRationale: string
  treatment: number
  treatmentRationale: string
  biomarker: number
  biomarkerRationale: string
  classShare: number
  classShareRationale: string
  productShare: number
  productShareRationale: string
  annualCost: number
  costRationale: string
  discountRationale: string
  error?: string
}

export interface SensitivityRow {
  label: string
  low: number
  high: number
}

export type ActiveSection =
  | 'product'
  | 'parameters'
  | 'assumptions'
  | 'engine'
  | 'results'

export interface EngineStepState {
  status: 'pending' | 'running' | 'done' | 'hidden'
  label: string
}
