import type { AssumptionValue, Assumptions, ResearchData } from './types'
import {
  DISCOUNT_RATES,
  EPIDEMIOLOGY_DEFAULTS,
  POPULATION_DATA,
} from './constants'
import type { CustomParameter, ParameterItem, SelectedParameters } from './types'

export function buildSelectedParameters(
  parameterLists: Record<string, ParameterItem[]>,
): SelectedParameters {
  const epiList = parameterLists.epidemiology || []
  const epiRadio = epiList.find((p) => p.type === 'radio' && p.checked)
  const epiType = (epiRadio?.id === 'incidence' ? 'incidence' : 'prevalence') as
    | 'prevalence'
    | 'incidence'

  const parameters: string[] = ['population', epiType]

  for (const cat of ['epidemiology', 'treatment', 'market', 'pricing']) {
    for (const item of parameterLists[cat] || []) {
      if (item.type === 'checkbox' && item.checked && item.id !== 'population' && !parameters.includes(item.id)) {
        parameters.push(item.id)
      }
    }
  }

  return { epidemiology: epiType, parameters }
}

export function buildAssumptionsFromResearch(
  product: {
    country: string
    productName: string
    classMoa: string
    indication: string
    launchYear: number
    peakYear: number
  },
  selected: SelectedParameters,
  rd: ResearchData,
  customParameters: Record<string, CustomParameter>,
): Assumptions {
  const { country, productName, classMoa, indication, launchYear, peakYear } = product
  const population = POPULATION_DATA[country]
  const discountInfo = DISCOUNT_RATES[country] || { base: 0.2, range: '15-30%' }

  const assumptions: Assumptions = {
    country,
    productName,
    classMoa,
    indication,
    launchYear: String(launchYear),
    peakYear: String(peakYear),
    selectedFlow: selected.parameters,
  }

  if (selected.parameters.includes('population'))
    assumptions.population = {
      value: population,
      yoyGrowth: 0.005,
      unit: 'persons',
      range: `${(population * 0.95).toLocaleString()} - ${(population * 1.05).toLocaleString()}`,
      rationale: `Total population in ${country} based on 2024 census data.`,
    }
  if (selected.parameters.includes('prevalence'))
    assumptions.prevalence = {
      value: rd.prevalence,
      unit: 'rate',
      unitType: 'rate',
      displayUnit: 'rate',
      range: `${(rd.prevalence * 0.7).toFixed(4)} - ${(rd.prevalence * 1.3).toFixed(4)}`,
      rationale: rd.prevalenceRationale,
    }
  if (selected.parameters.includes('incidence'))
    assumptions.incidence = {
      value: rd.prevalence * 0.15,
      unit: 'rate',
      unitType: 'rate',
      displayUnit: 'rate',
      range: `${(rd.prevalence * 0.1).toFixed(4)} - ${(rd.prevalence * 0.25).toFixed(4)}`,
      rationale: `Annual incidence rate for ${indication}.`,
    }
  if (selected.parameters.includes('severity'))
    assumptions.severity = {
      value: 0.65,
      unit: '%',
      range: '45% - 85%',
      rationale: 'Proportion with moderate-to-severe disease or specific subtype.',
    }
  if (selected.parameters.includes('diagnosisRate'))
    assumptions.diagnosisRate = {
      value: rd.diagnosis,
      unit: '%',
      range: `${(rd.diagnosis * 0.85 * 100).toFixed(0)}% - ${(rd.diagnosis * 1.1 * 100).toFixed(0)}%`,
      rationale: rd.diagnosisRationale,
    }
  if (selected.parameters.includes('treatmentRate'))
    assumptions.treatmentRate = {
      value: rd.treatment,
      unit: '%',
      range: `${(rd.treatment * 0.8 * 100).toFixed(0)}% - ${(rd.treatment * 1.15 * 100).toFixed(0)}%`,
      rationale: rd.treatmentRationale,
    }
  if (selected.parameters.includes('eligibilityCriteria'))
    assumptions.eligibilityCriteria = {
      value: rd.biomarker,
      unit: '%',
      range: `${(rd.biomarker * 0.75 * 100).toFixed(0)}% - ${(rd.biomarker * 1.15 * 100).toFixed(0)}%`,
      rationale: rd.biomarkerRationale,
    }
  if (selected.parameters.includes('progressionRate'))
    assumptions.progressionRate = {
      value: 0.18,
      unit: '%/year',
      range: '10% - 30%',
      rationale: 'Annual disease progression rate.',
    }
  if (selected.parameters.includes('classShare'))
    assumptions.classShare = {
      value: rd.classShare,
      startingShare: 0.05,
      timeToPeak: peakYear - launchYear,
      peakYear,
      curveType: 'scurve',
      unit: '%',
      range: '20% - 55%',
      rationale: rd.classShareRationale,
    }
  if (selected.parameters.includes('peakProductShare'))
    assumptions.peakProductShare = {
      value: rd.productShare,
      startingShare: 0.03,
      timeToPeak: peakYear - launchYear,
      peakYear,
      curveType: 'scurve',
      unit: '%',
      range: '15% - 50%',
      rationale: rd.productShareRationale,
    }
  if (selected.parameters.includes('annualCostPerPatient'))
    assumptions.annualCostPerPatient = {
      value: rd.annualCost,
      unit: '$',
      range: '$150,000 - $220,000',
      rationale: rd.costRationale,
    }
  if (selected.parameters.includes('discount'))
    assumptions.discount = {
      value: discountInfo.base,
      unit: '%',
      range: discountInfo.range,
      rationale: rd.discountRationale,
    }

  assumptions.adoptionPeakTime = {
    value: peakYear - launchYear,
    unit: 'years',
    range: `${Math.max(2, peakYear - launchYear - 2)} - ${peakYear - launchYear + 2} years`,
    rationale: 'S-curve adoption from launch to peak.',
  }

  selected.parameters.forEach((key) => {
    if (customParameters[key] && !assumptions[key]) {
      const cp = customParameters[key]
      assumptions[key] = {
        value: 0,
        unit: '',
        range: '—',
        label: cp.name,
        description: cp.description || '',
        category: cp.category,
        rationale: 'Custom parameter — please update this value.',
      } as AssumptionValue
    }
  })

  return assumptions
}

export function buildFallbackAssumptions(
  product: {
    country: string
    productName: string
    classMoa: string
    indication: string
    launchYear: number
    peakYear: number
  },
  selected: SelectedParameters,
  customParameters: Record<string, CustomParameter>,
): Assumptions {
  const { country, productName, classMoa, indication, launchYear, peakYear } = product
  const epiData = EPIDEMIOLOGY_DEFAULTS[indication] || EPIDEMIOLOGY_DEFAULTS.Default
  const population = POPULATION_DATA[country]
  const discountInfo = DISCOUNT_RATES[country] || { base: 0.2, range: '15-30%' }

  const assumptions: Assumptions = {
    country,
    productName,
    classMoa,
    indication,
    launchYear: String(launchYear),
    peakYear: String(peakYear),
    population: {
      value: population,
      yoyGrowth: 0.005,
      unit: 'persons',
      range: `${(population * 0.95).toLocaleString()} - ${(population * 1.05).toLocaleString()}`,
      rationale: `Total population in ${country}.`,
    },
    prevalence: {
      value: epiData.prevalence,
      unit: 'rate',
      range: `${(epiData.prevalence * 0.7).toFixed(4)} - ${(epiData.prevalence * 1.3).toFixed(4)}`,
      rationale: `Disease prevalence for ${indication}.`,
    },
    diagnosisRate: {
      value: epiData.diagnosis,
      unit: '%',
      range: `${(epiData.diagnosis * 0.85 * 100).toFixed(0)}% - ${(epiData.diagnosis * 1.1 * 100).toFixed(0)}%`,
      rationale: `Proportion diagnosed in ${country}.`,
    },
    treatmentRate: {
      value: epiData.treatment,
      unit: '%',
      range: `${(epiData.treatment * 0.8 * 100).toFixed(0)}% - ${(epiData.treatment * 1.15 * 100).toFixed(0)}%`,
      rationale: 'Proportion receiving treatment.',
    },
    eligibilityCriteria: {
      value: epiData.biomarker,
      unit: '%',
      range: `${(epiData.biomarker * 0.75 * 100).toFixed(0)}% - ${(epiData.biomarker * 1.15 * 100).toFixed(0)}%`,
      rationale: 'Patients meeting eligibility criteria.',
    },
    classShare: {
      value: 0.35,
      startingShare: 0.05,
      timeToPeak: peakYear - launchYear,
      peakYear,
      curveType: 'scurve',
      unit: '%',
      range: '20% - 55%',
      rationale: `Market share for ${classMoa} class.`,
    },
    peakProductShare: {
      value: 0.25,
      startingShare: 0.03,
      timeToPeak: peakYear - launchYear,
      peakYear,
      curveType: 'scurve',
      unit: '%',
      range: '15% - 50%',
      rationale: 'Product share within class.',
    },
    annualCostPerPatient: {
      value: 65000,
      unit: '$',
      range: '$150,000 - $220,000',
      rationale: `Estimated annual cost based on ${classMoa} benchmarks.`,
    },
    discount: {
      value: discountInfo.base,
      unit: '%',
      range: discountInfo.range,
      rationale: `Net price realization in ${country}.`,
    },
    adoptionPeakTime: {
      value: peakYear - launchYear,
      unit: 'years',
      range: `${Math.max(2, peakYear - launchYear - 2)} - ${peakYear - launchYear + 2} years`,
      rationale: 'S-curve adoption.',
    },
  }

  selected.parameters.forEach((key) => {
    if (customParameters[key] && !assumptions[key]) {
      const cp = customParameters[key]
      assumptions[key] = {
        value: 0,
        unit: '',
        range: '—',
        label: cp.name,
        description: cp.description || '',
        category: cp.category,
        rationale: 'Custom parameter — please update this value.',
      } as AssumptionValue
    }
  })

  return assumptions
}
