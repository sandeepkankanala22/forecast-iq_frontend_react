import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  excelDownloadUrl,
  getAgentStatus,
  getConfig,
  getExcelData,
  getPptxStatus,
  postAgent,
  postChat,
  postForecast,
  postPptx,
  postRecommend,
  postResearch,
  postSaveInput,
  postSensitivity,
  pptxDownloadUrl,
} from '../lib/api/forecast'
import {
  buildAssumptionsFromResearch,
  buildFallbackAssumptions,
  buildSelectedParameters,
} from '../lib/forecast/assumptionBuilder'
import { buildFallbackRec, REC_PARAM_LABELS, researchFallback } from '../lib/forecast/aiRecommendation'
import {
  allProductFieldsFilled,
  CHAT_HINT_QR,
  CHAT_HINTS,
  confirmMessage,
  extractFieldsLocal,
  isQuestion,
  looksLikeCommand,
  looksNonsensical,
} from '../lib/forecast/chatHelpers'
import {
  CHAT_STEPS,
  createDefaultParameterItems,
  DEFAULT_SELECTED_PARAMETERS,
  PARAMETER_LABELS,
  PRESETS,
  WELCOME_MESSAGE,
  XV_PENDING,
} from '../lib/forecast/constants'
import { buildSearchFeedHTML } from '../lib/forecast/curatedSources'
import { generateCalculationEngineHtml } from '../lib/forecast/calculationHelpers'
import { buildInputSheet } from '../lib/forecast/excelBuilder'
import type {
  ActiveSection,
  AssumptionValue,
  Assumptions,
  ChatMessage,
  CustomParameter,
  DownloadAction,
  EngineStepState,
  ForecastRow,
  ParameterCategory,
  ParameterItem,
  ProductInfo,
  ResearchSource,
  SelectedParameters,
  SensitivityRow,
  WorkflowStage,
} from '../lib/forecast/types'
import { formatBotText, nowTime, uid } from '../lib/forecast/utils'
import type { SheetData } from '../lib/excel/types'

const EMPTY_PRODUCT: ProductInfo = {
  country: '',
  productName: '',
  classMoa: '',
  indication: '',
  launchYear: '',
  peakYear: '',
}

export interface ForecastContextValue {
  product: ProductInfo
  setProduct: React.Dispatch<React.SetStateAction<ProductInfo>>
  highlightField: string | null
  activeSection: ActiveSection
  activeNavStep: number
  maxStepReached: number
  chatHidden: boolean
  setChatHidden: (v: boolean) => void
  messages: ChatMessage[]
  quickReplies: string[]
  typing: boolean
  chatStep: number
  parameterLists: Record<string, ParameterItem[]>
  parameterLabels: Record<string, string>
  customParameters: Record<string, CustomParameter>
  selectedParameters: SelectedParameters
  advancedMode: boolean
  setAdvancedMode: (v: boolean) => void
  activePreset: string
  assumptions: Assumptions
  researchSources: ResearchSource[]
  assumptionsGenerated: boolean
  rationaleVisible: boolean
  forecastData: ForecastRow[]
  forecastCalculated: boolean
  sensitivityData: { base_peak: number; sensitivity: SensitivityRow[] } | null
  engineOverlayVisible: boolean
  engineTitle: string
  engineSubtitle: string
  engineProgress: number
  engineSteps: EngineStepState[]
  engineDetailsHtml: string
  engineBtnsVisible: boolean
  excelSheets: SheetData[]
  excelPendingTabs: string[]
  excelFilename: string
  excelPreviewMode: boolean
  excelFullscreen: boolean
  setExcelFullscreen: (v: boolean) => void
  agentSessionId: string | null
  excelDownloadHref: string
  pptxDownloadHref: string
  pptxPreparing: boolean
  aiRecHtml: string
  aiRecLoading: boolean
  aiRecApplied: boolean
  sourceModalNum: number | null
  searchFeedExpanded: boolean
  generatingAssumptions: boolean
  showParameterForm: ParameterCategory | null
  validation: { success: boolean; message: string; visible: boolean }
  insightPeakSales: string
  insightPeakYear: string
  insightPeakPts: string
  insightGross: string
  insightDiscount: string
  insightDrivers: string[]
  navigateToSection: (n: number) => void
  showParameterSelection: () => void
  backToProductInfo: () => void
  generateAssumptions: () => Promise<void>
  calculateForecast: () => Promise<void>
  proceedToResults: () => void
  viewExistingResults: () => void
  backToAssumptions: () => void
  startOver: (silent?: boolean) => void
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
  applyPreset: (type: string) => void
  applyAIRecommendation: () => void
  updateAIRecommendation: () => Promise<void>
  toggleRationale: () => void
  resetAssumptions: () => void
  updateAssumption: (key: string, value: string) => void
  updateShareParam: (key: string, prop: string, value: string) => void
  updateEpiUnit: (key: string, unit: string) => void
  toggleYoYGrowth: (key: string, enabled: boolean) => void
  updateYoYGrowth: (key: string, value: string) => void
  renameParameter: (id: string, name: string) => void
  deleteParameter: (cat: ParameterCategory, id: string) => void
  addCustomParameter: (cat: ParameterCategory, name: string, desc: string) => void
  reorderParameter: (cat: ParameterCategory, fromId: string, toId: string) => void
  toggleParameterChecked: (cat: ParameterCategory, id: string, checked: boolean) => void
  setEpiType: (id: 'prevalence' | 'incidence') => void
  showSourceModal: (n: number) => void
  closeSourceModal: () => void
  toggleSearchFeed: () => void
  fillField: (key: keyof ProductInfo, value: string) => void
}

const ForecastContext = createContext<ForecastContextValue | null>(null)

export function useForecast() {
  const ctx = useContext(ForecastContext)
  if (!ctx) throw new Error('useForecast must be used within ForecastProvider')
  return ctx
}

function sectionFromNav(n: number): ActiveSection {
  if (n === 1) return 'product'
  if (n === 2) return 'parameters'
  if (n === 3) return 'assumptions'
  if (n === 4) return 'engine'
  return 'results'
}

export function ForecastProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<ProductInfo>(EMPTY_PRODUCT)
  const [highlightField, setHighlightField] = useState<string | null>(null)
  const [activeNavStep, setActiveNavStep] = useState(1)
  const [maxStepReached, setMaxStepReached] = useState(1)
  const [chatHidden, setChatHidden] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [quickReplies, setQuickReplies] = useState<string[]>(CHAT_STEPS[0].qr)
  const [typing, setTyping] = useState(false)
  const [chatStep, setChatStep] = useState(0)
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([])
  const [parameterLists, setParameterLists] = useState(createDefaultParameterItems)
  const [parameterLabels, setParameterLabels] = useState({ ...PARAMETER_LABELS })
  const [customParameters, setCustomParameters] = useState<Record<string, CustomParameter>>({})
  const [selectedParameters, setSelectedParameters] = useState<SelectedParameters>(DEFAULT_SELECTED_PARAMETERS)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [activePreset, setActivePreset] = useState('standard')
  const [assumptions, setAssumptions] = useState<Assumptions>({})
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([])
  const [assumptionsGenerated, setAssumptionsGenerated] = useState(false)
  const [rationaleVisible, setRationaleVisible] = useState(true)
  const [forecastData, setForecastData] = useState<ForecastRow[]>([])
  const [forecastCalculated, setForecastCalculated] = useState(false)
  const [sensitivityData, setSensitivityData] = useState<{
    base_peak: number
    sensitivity: SensitivityRow[]
  } | null>(null)
  const [engineOverlayVisible, setEngineOverlayVisible] = useState(false)
  const [engineTitle, setEngineTitle] = useState('Running Forecast Engine')
  const [engineSubtitle, setEngineSubtitle] = useState('Initialising calculation pipeline…')
  const [engineProgress, setEngineProgress] = useState(0)
  const [engineSteps, setEngineSteps] = useState<EngineStepState[]>([])
  const [engineDetailsHtml, setEngineDetailsHtml] = useState('')
  const [engineBtnsVisible, setEngineBtnsVisible] = useState(false)
  const [excelSheets, setExcelSheets] = useState<SheetData[]>([])
  const [excelFilename, setExcelFilename] = useState('Building workbook…')
  const [excelPreviewMode, setExcelPreviewMode] = useState(false)
  const [excelFullscreen, setExcelFullscreen] = useState(false)
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null)
  const [pptxPreparing, setPptxPreparing] = useState(false)
  const [aiRecHtml, setAiRecHtml] = useState('')
  const [aiRecLoading, setAiRecLoading] = useState(false)
  const [aiRecApplied, setAiRecApplied] = useState(false)
  const [aiRecParams, setAiRecParams] = useState<string[] | null>(null)
  const [sourceModalNum, setSourceModalNum] = useState<number | null>(null)
  const [searchFeedExpanded, setSearchFeedExpanded] = useState(false)
  const [generatingAssumptions, setGeneratingAssumptions] = useState(false)
  const [showParameterForm, setShowParameterForm] = useState<ParameterCategory | null>(null)
  const [validation] = useState({ success: true, message: '', visible: false })
  const [insightPeakSales, setInsightPeakSales] = useState('—')
  const [insightPeakYear, setInsightPeakYear] = useState('—')
  const [insightPeakPts, setInsightPeakPts] = useState('—')
  const [insightGross, setInsightGross] = useState('—')
  const [insightDiscount, setInsightDiscount] = useState('—')
  const [insightDrivers, setInsightDrivers] = useState<string[]>([])
  const s3Enabled = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const agentPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pptxPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const engineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const forecastCalculatedRef = useRef(false)
  const initialized = useRef(false)

  useEffect(() => {
    forecastCalculatedRef.current = forecastCalculated
  }, [forecastCalculated])

  const activeSection = sectionFromNav(activeNavStep)
  const excelPendingTabs = forecastCalculated && excelSheets.length === 1 ? XV_PENDING : []
  const excelDownloadHref = agentSessionId ? excelDownloadUrl(agentSessionId) : '#'
  const pptxDownloadHref = agentSessionId ? pptxDownloadUrl(agentSessionId) : '#'

  const getWorkflowStage = useCallback((): WorkflowStage => {
    if (activeSection === 'results') return 'results'
    if (activeSection === 'engine') return 'forecast_engine'
    if (activeSection === 'assumptions') return 'assumptions'
    if (activeSection === 'parameters') return 'parameter_selection'
    return 'product_info'
  }, [activeSection])

  const syncFlowPreview = useCallback((lists: Record<string, ParameterItem[]>) => {
    setSelectedParameters(buildSelectedParameters(lists))
  }, [])

  const debouncedSave = useCallback(() => {
    if (s3Enabled.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      postSaveInput({
        timestamp: new Date().toISOString(),
        product_info: product,
        forecast_flow: {
          preset: activePreset,
          epidemiology_type: selectedParameters.epidemiology,
          parameter_order: selectedParameters.parameters,
          parameter_labels: parameterLabels,
        },
        selected_parameters: selectedParameters.parameters,
        custom_parameters: customParameters,
        assumptions,
        forecast_results: forecastData,
      }).catch(() => {})
    }, 600)
  }, [product, activePreset, selectedParameters, parameterLabels, customParameters, assumptions, forecastData])

  const addMsg = useCallback((text: string, role: 'user' | 'bot', actions?: DownloadAction[]) => {
    setMessages((prev) => [
      ...prev,
      { id: uid(), role, text, time: nowTime(), html: true, actions },
    ])
  }, [])

  const botSay = useCallback(
    (text: string, qr: string[] = []) => {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addMsg(text, 'bot')
        setQuickReplies(qr)
      }, 700)
    },
    [addMsg],
  )

  const botSayWithActions = useCallback(
    (text: string, actions: DownloadAction[]) => {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        addMsg(text, 'bot', actions)
        setQuickReplies([])
      }, 700)
    },
    [addMsg],
  )

  const updateNavigation = useCallback(
    (active: number) => {
      setMaxStepReached((m) => Math.max(m, active))
      setActiveNavStep(active)
    },
    [],
  )

  const fillField = useCallback(
    (key: keyof ProductInfo, value: string) => {
      setProduct((p) => ({ ...p, [key]: value }))
      setHighlightField(key)
      setTimeout(() => setHighlightField(null), 1400)
      debouncedSave()
    },
    [debouncedSave],
  )

  const navigateToSection = useCallback(
    (n: number) => {
      if (n > maxStepReached && !(assumptionsGenerated && n === 3) && !(forecastCalculated && n >= 4)) {
        if (n > maxStepReached + 1) return
      }
      updateNavigation(n === 4 && forecastCalculated ? 5 : n)
    },
    [maxStepReached, assumptionsGenerated, forecastCalculated, updateNavigation],
  )

  const showParameterSelection = useCallback(() => {
    const { country, productName, classMoa, indication, launchYear, peakYear } = product
    if (!country || !productName || !classMoa || !indication || !launchYear || !peakYear) {
      alert('Please fill in all required fields')
      return
    }
    if (parseInt(peakYear) <= parseInt(launchYear)) {
      alert('Forecast - End Year must be after launch year')
      return
    }
    syncFlowPreview(parameterLists)
    setAiRecApplied(false)
    updateNavigation(2)
    updateAIRecommendation()
    botSay(
      `✓ **Product details confirmed!**\n\n• **Country:** ${country}\n• **Product:** ${productName}\n• **Class/MoA:** ${classMoa}\n• **Indication:** ${indication}\n• **Launch Year:** ${launchYear} → **Forecast - End Year:** ${peakYear}\n\nMoving to **Step 2: Define Forecast Flow**. Choose a template preset or customise your forecast parameters below.`,
      ['Apply AI Recommendation', 'Generate Now', 'Customise Parameters'],
    )
  }, [product, parameterLists, syncFlowPreview, updateNavigation, botSay])

  const updateAIRecommendation = useCallback(async () => {
    const { indication, productName, classMoa, country } = product
    setAiRecLoading(true)
    setAiRecHtml('<span class="ai-rec-loading">Analysing your asset and generating recommendation…</span>')
    setAiRecParams(null)
    try {
      const data = await postRecommend({
        indication,
        product_name: productName,
        class_moa: classMoa,
        country,
      })
      const toHtml = (s: string) =>
        (s || '').trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
      const params = Array.isArray(data.params) && data.params.length > 0 ? data.params : []
      if (params.length) setAiRecParams(params)
      let mainHtml = toHtml(data.recommendation)
      if (!mainHtml) mainHtml = buildFallbackRec(indication).text
      const rationaleRows = [
        { label: 'Epidemiology', val: data.epi_note },
        { label: 'Patient Flow', val: data.flow_note },
        { label: 'Market Sizing', val: data.pricing_note },
      ].filter((r) => r.val?.trim())
      let rationaleHtml = ''
      if (rationaleRows.length) {
        rationaleHtml =
          '<div class="ai-rec-rationale">' +
          rationaleRows.map((r) => `<div class="ai-rec-rationale-row"><strong>${r.label}:</strong> ${toHtml(r.val)}</div>`).join('') +
          '</div>'
      }
      let chipsHtml = ''
      if (params.length) {
        chipsHtml =
          `<div class="ai-rec-params-label">Selected Parameters (${params.length})</div><div class="ai-rec-param-chips">` +
          params.map((p: string) => `<span class="ai-rec-chip"><span class="ai-rec-chip-dot"></span>${REC_PARAM_LABELS[p] || p}</span>`).join('') +
          '</div>'
      }
      setAiRecHtml(mainHtml + rationaleHtml + chipsHtml)
    } catch {
      setAiRecHtml(buildFallbackRec(product.indication).text)
    } finally {
      setAiRecLoading(false)
    }
  }, [product])

  const applyPresetToLists = useCallback(
    (type: string) => {
      if (type === 'custom') {
        setActivePreset('custom')
        debouncedSave()
        return
      }
      const preset = PRESETS[type]
      if (!preset) return
      setParameterLists((lists) => {
        const next = { ...lists }
        for (const cat of Object.keys(next)) {
          next[cat] = next[cat].map((item) => {
            if (item.type === 'checkbox' && !item.disabled)
              return { ...item, checked: preset.params.includes(item.id) }
            if (item.type === 'radio' && item.radioGroup === 'epi-type') {
              const useIncidence = preset.params.includes('incidence')
              return { ...item, checked: item.id === (useIncidence ? 'incidence' : 'prevalence') }
            }
            return item
          })
        }
        syncFlowPreview(next)
        return next
      })
      setActivePreset(type)
      botSay(`✅ Applied **${preset.label}** template. Parameters auto-configured. Review and click **"Generate Assumptions"** when ready.`, [
        'Generate Assumptions',
        'Customise',
      ])
    },
    [syncFlowPreview, debouncedSave, botSay],
  )

  const applyAIRecommendation = useCallback(() => {
    const { indication } = product
    if (aiRecParams?.length) {
      setParameterLists((lists) => {
        const next = { ...lists }
        for (const cat of Object.keys(next)) {
          next[cat] = next[cat].map((item) => {
            if (item.type === 'checkbox' && !item.disabled)
              return { ...item, checked: aiRecParams.includes(item.id) }
            if (item.type === 'radio' && item.radioGroup === 'epi-type') {
              const useIncidence = aiRecParams.includes('incidence')
              return { ...item, checked: item.id === (useIncidence ? 'incidence' : 'prevalence') }
            }
            return item
          })
        }
        syncFlowPreview(next)
        return next
      })
      setActivePreset('ai_recommendation')
      setAiRecApplied(true)
      botSay(
        `**AI recommendation applied** for **${indication || 'your asset'}**.\n\nParameters have been individually selected based on LLM analysis. Review and click **"Generate Assumptions"** when ready.`,
        ['Generate Assumptions', 'Customise Parameters'],
      )
    } else {
      const ind = indication.toLowerCase()
      if (ind.includes('oncol') || ind.includes('cancer')) applyPresetToLists('oncology')
      else if (ind.includes('rare') || ind.includes('orphan')) applyPresetToLists('rare')
      else applyPresetToLists('standard')
      setAiRecApplied(true)
      botSay(
        `**AI recommendation applied** for **${indication || 'your indication'}**.\n\nThe optimal parameters have been pre-selected. Ready to generate?`,
        ['Generate Now', 'Customise Parameters'],
      )
    }
  }, [product, aiRecParams, syncFlowPreview, botSay, applyPresetToLists])

  const generateAssumptions = useCallback(async () => {
    const { country, productName, classMoa, indication, launchYear, peakYear } = product
    if (!country || !productName || !classMoa || !indication || !launchYear || !peakYear) {
      alert('Please fill in all required fields')
      return
    }
    if (parseInt(peakYear) <= parseInt(launchYear)) {
      alert('Forecast - End Year must be after launch year')
      return
    }
    setGeneratingAssumptions(true)
    const selected = buildSelectedParameters(parameterLists)
    setSelectedParameters(selected)

    const curatedCount = 7
    const totalSearchItems = curatedCount + 3
    let animIdx = 0
    setSearchFeedExpanded(false)
    const liveMsgId = uid()
    setMessages((prev) => [
      ...prev,
      {
        id: liveMsgId,
        role: 'bot',
        text: '',
        time: nowTime(),
        liveHtml: buildSearchFeedHTML(indication, country, classMoa, 0, false),
      },
    ])
    const progInterval = setInterval(() => {
      animIdx = Math.min(animIdx + 1, totalSearchItems)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === liveMsgId
            ? { ...m, liveHtml: buildSearchFeedHTML(indication, country, classMoa, animIdx, searchFeedExpanded) }
            : m,
        ),
      )
    }, 1400)

    try {
      let rd
      try {
        rd = await postResearch(indication, country, classMoa)
      } catch {
        rd = await researchFallback(indication, country, classMoa)
      }
      setResearchSources(Array.isArray(rd.sources) ? rd.sources : [])
      const built = buildAssumptionsFromResearch(
        {
          country,
          productName,
          classMoa,
          indication,
          launchYear: parseInt(launchYear),
          peakYear: parseInt(peakYear),
        },
        selected,
        rd as Parameters<typeof buildAssumptionsFromResearch>[2],
        customParameters,
      )
      setAssumptions(built)
      setAssumptionsGenerated(true)
      debouncedSave()
      clearInterval(progInterval)
      updateNavigation(3)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === liveMsgId
            ? {
                ...m,
                liveHtml:
                  buildSearchFeedHTML(indication, country, classMoa, totalSearchItems, false) +
                  `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(22,163,74,.06);border:1px solid rgba(22,163,74,.2);">
                    <div style="font-size:12px;font-weight:700;color:#1A2C3D;">Assumptions ready for <em>${indication}</em></div>
                  </div>`,
              }
            : m,
        ),
      )
      setTimeout(() => setQuickReplies(['Calculate Forecast', 'Edit Assumptions']), 1400)
    } catch {
      clearInterval(progInterval)
      const built = buildFallbackAssumptions(
        {
          country,
          productName,
          classMoa,
          indication,
          launchYear: parseInt(launchYear),
          peakYear: parseInt(peakYear),
        },
        selected,
        customParameters,
      )
      setAssumptions(built)
      setAssumptionsGenerated(true)
      updateNavigation(3)
      setQuickReplies(['Calculate Forecast'])
    } finally {
      setGeneratingAssumptions(false)
    }
  }, [product, parameterLists, customParameters, debouncedSave, updateNavigation, searchFeedExpanded])

  const displayForecast = useCallback(
    (data: ForecastRow[]) => {
      let maxNS = 0,
        maxNSY = 0,
        maxP = 0,
        maxGS = 0
      data.forEach((row) => {
        const ns = parseFloat(String(row.netSales))
        if (ns > maxNS) {
          maxNS = ns
          maxNSY = row.year
          maxP = row.treatedPatients
          maxGS = parseFloat(String(row.grossSales))
        }
      })
      const launchYr = Number(assumptions.launchYear) || 0
      setInsightPeakSales('$' + maxNS.toFixed(1) + 'M')
      setInsightPeakYear('Achieved in Year ' + (maxNSY - launchYr))
      setInsightPeakPts(maxP >= 1000 ? (maxP / 1000).toFixed(1) + 'K' : String(maxP))
      setInsightGross('$' + maxGS.toFixed(1) + 'M')
      const discountPct = assumptions.discount ? (assumptions.discount.value * 100).toFixed(0) : '0'
      setInsightDiscount(discountPct + '% discount → ' + (100 - parseFloat(discountPct)).toFixed(0) + '% net realisation')
      const drivers: string[] = []
      if (assumptions.diagnosisRate && assumptions.diagnosisRate.value >= 0.75)
        drivers.push('High diagnosis rate (' + (assumptions.diagnosisRate.value * 100).toFixed(0) + '%)')
      if (assumptions.classShare && assumptions.classShare.value >= 0.35)
        drivers.push('Strong class adoption (' + (assumptions.classShare.value * 100).toFixed(0) + '%)')
      if (drivers.length === 0) drivers.push('Moderate market assumptions')
      setInsightDrivers(drivers.slice(0, 4))
      setForecastData(data)
      postSensitivity(assumptions, selectedParameters.parameters)
        .then((sens) => {
          if (sens.sensitivity?.length) setSensitivityData(sens)
        })
        .catch(() => {})
    },
    [assumptions, selectedParameters],
  )

  const transitionToResults = useCallback(() => {
    if (forecastCalculatedRef.current) return
    forecastCalculatedRef.current = true
    setForecastCalculated(true)
    setEngineOverlayVisible(false)
    setEngineBtnsVisible(true)
    updateNavigation(5)
    const inputSheet = buildInputSheet(assumptions, selectedParameters, researchSources)
    setExcelSheets([inputSheet])
    setExcelFilename('forecast_preview.xlsx')
    setExcelPreviewMode(true)
  }, [assumptions, selectedParameters, researchSources, updateNavigation])

  const scheduleResultsTransition = useCallback(
    (delayMs: number, useFallbackTimer = false) => {
      const arm = () => {
        if (!forecastCalculatedRef.current) transitionToResults()
      }
      if (useFallbackTimer) {
        if (resultsFallbackTimerRef.current) clearTimeout(resultsFallbackTimerRef.current)
        resultsFallbackTimerRef.current = setTimeout(arm, delayMs)
      } else {
        if (resultsTransitionTimerRef.current) clearTimeout(resultsTransitionTimerRef.current)
        resultsTransitionTimerRef.current = setTimeout(arm, delayMs)
      }
    },
    [transitionToResults],
  )

  const pollAgent = useCallback(
    (sessionId: string) => {
      if (agentPollRef.current) clearInterval(agentPollRef.current)
      agentPollRef.current = setInterval(async () => {
        try {
          const data = await getAgentStatus(sessionId)
          if (data.status === 'done') {
            if (agentPollRef.current) clearInterval(agentPollRef.current)
            getExcelData(sessionId)
              .then((excel) => {
                setExcelSheets(excel.sheets)
                setExcelFilename(excel.filename || 'forecast.xlsx')
                setExcelPreviewMode(false)
              })
              .catch(() => {})
            botSayWithActions(
              '✅ **Excel workbook ready.** Calculations & Summary sheets are now live in the preview.',
              [{ label: 'Download Workbook', href: excelDownloadUrl(sessionId), download: 'forecast.xlsx', cls: 'excel' }],
            )
            if (!forecastCalculatedRef.current) transitionToResults()
          } else if (data.status === 'error') {
            if (agentPollRef.current) clearInterval(agentPollRef.current)
            botSay('⚠️ Excel agent error: ' + (data.error || 'Unknown error.'), [])
            if (!forecastCalculatedRef.current) transitionToResults()
          }
        } catch {
          /* keep polling */
        }
      }, 2000)
    },
    [botSayWithActions, botSay, transitionToResults],
  )

  const pollPptx = useCallback(
    (sessionId: string) => {
      if (pptxPollRef.current) clearInterval(pptxPollRef.current)
      setPptxPreparing(true)
      let unknownPolls = 0
      pptxPollRef.current = setInterval(async () => {
        try {
          const data = await getPptxStatus(sessionId)
          if (data.status === 'done') {
            if (pptxPollRef.current) clearInterval(pptxPollRef.current)
            setPptxPreparing(false)
            botSayWithActions('✅ **Presentation ready.** Your AI-generated slides with narratives are available.', [
              { label: 'Download Presentation', href: pptxDownloadUrl(sessionId), download: 'forecast_presentation.pptx', cls: 'pptx' },
            ])
            setEngineProgress(100)
            if (!forecastCalculatedRef.current) transitionToResults()
          } else if (data.status === 'error') {
            if (pptxPollRef.current) clearInterval(pptxPollRef.current)
            setPptxPreparing(false)
            botSay('⚠️ Presentation generation failed. Charts and Excel are still available.', [])
            if (!forecastCalculatedRef.current) transitionToResults()
          } else if (data.status === 'unknown') {
            unknownPolls++
            if (unknownPolls >= 5 && !forecastCalculatedRef.current) {
              setPptxPreparing(false)
              transitionToResults()
            }
          }
        } catch {
          /* keep polling */
        }
      }, 3000)
    },
    [botSayWithActions, botSay, transitionToResults],
  )

  const calculateForecast = useCallback(async () => {
    forecastCalculatedRef.current = false
    setForecastCalculated(false)
    setForecastData([])
    setAgentSessionId(null)
    setPptxPreparing(true)
    updateNavigation(4)
    setEngineOverlayVisible(true)
    setEngineTitle('Calculating Forecast')
    setEngineSubtitle('Running patient-based model…')
    setEngineSteps([
      { status: 'pending', label: 'Epidemiology model' },
      { status: 'pending', label: 'Patient flow simulation' },
      { status: 'pending', label: 'Revenue projection' },
      { status: 'pending', label: 'Validating results' },
      { status: 'hidden', label: '' },
    ])
    setEngineProgress(0)
    setEngineBtnsVisible(false)
    setEngineDetailsHtml('')

    let stepIdx = 0
    const tickEngine = () => {
      stepIdx++
      setEngineSteps((steps) =>
        steps.map((s, i) => {
          if (i < stepIdx - 1) return { ...s, status: 'done' }
          if (i === stepIdx - 1) return { ...s, status: 'running' }
          return s
        }),
      )
      setEngineProgress(Math.round((stepIdx / 5) * 90))
      if (stepIdx < 4) engineTimerRef.current = setTimeout(tickEngine, 700)
    }
    engineTimerRef.current = setTimeout(tickEngine, 300)

    try {
      const res = await postForecast(assumptions, selectedParameters.parameters)
      if (res.forecast_results) {
        displayForecast(res.forecast_results)
        debouncedSave()
        const horizon = parseInt(product.peakYear) - parseInt(product.launchYear)
        setEngineDetailsHtml(generateCalculationEngineHtml(assumptions, selectedParameters, horizon))
      }
      setEngineSteps((s) => s.map((x) => (x.status === 'hidden' ? x : { ...x, status: 'done' })))
      setEngineProgress(100)
      setEngineTitle('Building Presentation')
      setEngineSubtitle('Generating AI-powered slides…')
      setEngineBtnsVisible(true)
      botSay('✅ **Forecast calculated.** Generating your presentation — moving to dashboard in ~60 seconds…', [])

      const userInputPayload = {
        product_info: product,
        selected_parameters: selectedParameters.parameters,
        assumptions,
        forecast_results: res.forecast_results || [],
      }
      const agentRes = await postAgent(userInputPayload)
      if (agentRes.status === 'started' && agentRes.session_id) {
        setAgentSessionId(agentRes.session_id)
        pollAgent(agentRes.session_id)
        postPptx(agentRes.session_id, userInputPayload).then((pptxRes) => {
          if (pptxRes.status === 'started') {
            pollPptx(agentRes.session_id)
          } else {
            setPptxPreparing(false)
            botSay('⚠️ Could not start presentation generation. Excel and charts are still available.', [])
          }
        })
      } else {
        setPptxPreparing(false)
        botSay('⚠️ Could not start Excel agent: ' + (agentRes.error || agentRes.message || 'Unknown error.'), [])
        transitionToResults()
      }
      // Show results with charts + partial Excel preview shortly after forecast completes
      scheduleResultsTransition(4000)
      // Safety fallback if PPTX/agent polling stalls
      scheduleResultsTransition(90000, true)
    } catch (err) {
      botSay('⚠️ Could not load forecast: ' + (err as Error).message, [])
      transitionToResults()
    }
  }, [
    assumptions,
    selectedParameters,
    product,
    displayForecast,
    debouncedSave,
    updateNavigation,
    botSay,
    pollAgent,
    pollPptx,
    transitionToResults,
    scheduleResultsTransition,
  ])

  const handleUserMessageLocal = useCallback(
    (text: string) => {
      if (/confirm\s*(&|and)?\s*(proceed|continue)|✓\s*confirm/i.test(text.trim()) && chatStep >= 6 && activeSection === 'product') {
        showParameterSelection()
        return
      }
      if (isQuestion(text)) {
        const nextStep = chatStep < CHAT_STEPS.length ? CHAT_STEPS[chatStep] : null
        if (nextStep) {
          const msg = (CHAT_HINTS[nextStep.key] || nextStep.ask) + `\n\n${nextStep.ask}`
          botSay(msg, CHAT_HINT_QR[nextStep.key] || nextStep.qr)
        } else {
          botSay('All fields are filled! Click **Define Forecast Flow →** or type **"generate assumptions"**.', ['Generate Assumptions'])
        }
        return
      }
      const extracted = extractFieldsLocal(text, chatStep, product)
      const filledNow: string[] = []
      Object.entries(extracted).forEach(([key, val]) => {
        fillField(key as keyof ProductInfo, String(val))
        filledNow.push(key)
        const idx = CHAT_STEPS.findIndex((s) => s.key === key)
        if (idx !== -1 && idx >= chatStep) setChatStep(idx + 1)
      })
      const formNow = { ...product, ...extracted }
      if (filledNow.length > 0) {
        if (allProductFieldsFilled(formNow)) {
          setChatStep(6)
          botSay(confirmMessage(formNow), ['✓ Confirm & Proceed', 'Edit Details'])
        } else {
          const stillMissing = CHAT_STEPS.filter((s) => !formNow[s.key]?.trim())
          botSay(`✓ Got updates.\n\n${stillMissing[0]?.ask || ''}`, stillMissing[0]?.qr || [])
        }
        return
      }
      if (looksNonsensical(text) && chatStep < CHAT_STEPS.length) {
        botSay(`I didn't quite understand that. ${CHAT_STEPS[chatStep].ask}`, CHAT_STEPS[chatStep].qr)
        return
      }
      botSay('Type **"generate assumptions"** to move to the next step.', [])
    },
    [chatStep, product, activeSection, showParameterSelection, botSay, fillField],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      setQuickReplies([])
      addMsg(text, 'user')
      setConversationHistory((h) => [...h, { role: 'user', content: text }])

      if (looksLikeCommand(text) && /apply\s*(ai\s*)?(recommendation|rec)/i.test(text.trim())) {
        if (aiRecLoading) {
          botSay('The AI recommendation is still being generated. Please wait a moment and try again.')
          return
        }
        applyAIRecommendation()
        return
      }
      if (looksLikeCommand(text) && /^(generate\s*now|generate\s*with\s*current)/i.test(text.trim())) {
        generateAssumptions()
        return
      }
      if (looksLikeCommand(text) && /^(generate\s*(assumptions?|flow)|next\s*step|generate)$/i.test(text.trim())) {
        if (activeSection === 'parameters') {
          const qr = aiRecApplied ? ['Generate Now'] : ['Apply AI Recommendation', 'Generate Now']
          botSay(
            aiRecApplied
              ? `Ready to generate assumptions for **${product.indication}**. Click **Generate Now** to proceed.`
              : 'Ready to generate. Apply AI Recommendation or Generate Now with current selections.',
            qr,
          )
        } else {
          botSay('Proceeding to **Define Forecast Flow**…')
          setTimeout(showParameterSelection, 800)
        }
        return
      }
      if (looksLikeCommand(text) && /^(calculate forecast|run forecast|calculate|run)$/i.test(text.trim())) {
        botSay('Running the **Forecast Engine** now…')
        setTimeout(() => calculateForecast(), 800)
        return
      }
      if (looksLikeCommand(text) && /^(view results?|show (results?|charts?)|results?)$/i.test(text.trim())) {
        botSay('Jumping to **Results & Charts**')
        setTimeout(() => transitionToResults(), 800)
        return
      }
      if (looksLikeCommand(text) && /^(start over|restart|new forecast)$/i.test(text.trim())) {
        botSay("Starting a **new forecast**. Fill in the product details when you're ready!")
        setTimeout(() => startOver(false), 800)
        return
      }
      if (looksLikeCommand(text) && /^(export|download|download excel)$/i.test(text.trim())) {
        if (agentSessionId) {
          botSay('Downloading **Excel**…')
          window.open(excelDownloadUrl(agentSessionId), '_blank')
        } else {
          botSay('Excel workbook is still being built by the agent. Please wait.')
        }
        return
      }
      if (/confirm\s*(&|and)?\s*(proceed|continue)/i.test(text.trim()) && chatStep >= 6 && activeSection === 'product') {
        showParameterSelection()
        return
      }

      setTyping(true)
      try {
        const data = await postChat({
          messages: [...conversationHistory, { role: 'user', content: text }].slice(-20),
          chat_step: chatStep,
          form_state: product,
          workflow_stage: getWorkflowStage(),
        })
        setTyping(false)
        const prevChatStep = chatStep
        if (data.field_updates) {
          Object.entries(data.field_updates).forEach(([key, val]) => {
            if (val == null || String(val).trim() === '') return
            fillField(key as keyof ProductInfo, String(val))
            const idx = CHAT_STEPS.findIndex((s) => s.key === key)
            if (idx !== -1 && idx >= chatStep) setChatStep(idx + 1)
          })
          const formNow = { ...product, ...data.field_updates }
          if (allProductFieldsFilled(formNow as ProductInfo)) setChatStep(6)
          if (chatStep === 6 || (prevChatStep < 6 && allProductFieldsFilled(formNow as ProductInfo) && activeSection === 'product')) {
            addMsg(confirmMessage(formNow as ProductInfo), 'bot')
            setQuickReplies(['✓ Confirm & Proceed', 'Edit Details'])
            setConversationHistory((h) => [...h, { role: 'assistant', content: confirmMessage(formNow as ProductInfo) }])
            return
          }
        }
        if (data.action) {
          setTimeout(() => {
            if (data.action === 'show_parameter_selection') showParameterSelection()
            else if (data.action === 'generate_assumptions') generateAssumptions()
            else if (data.action === 'calculate_forecast') calculateForecast()
            else if (data.action === 'proceed_results') transitionToResults()
            else if (data.action === 'start_over' && /start\s*over/i.test(text)) startOver(false)
          }, 900)
        }
        addMsg(data.bot_message, 'bot')
        setQuickReplies(data.quick_replies || [])
        setConversationHistory((h) => [...h, { role: 'assistant', content: data.bot_message }])
      } catch {
        setTyping(false)
        handleUserMessageLocal(text)
      }
    },
    [
      addMsg,
      conversationHistory,
      chatStep,
      product,
      getWorkflowStage,
      fillField,
      activeSection,
      aiRecLoading,
      applyAIRecommendation,
      generateAssumptions,
      calculateForecast,
      transitionToResults,
      showParameterSelection,
      botSay,
      agentSessionId,
      aiRecApplied,
      handleUserMessageLocal,
    ],
  )

  const startOver = useCallback(
    (silent = false) => {
      if (agentPollRef.current) clearInterval(agentPollRef.current)
      if (pptxPollRef.current) clearInterval(pptxPollRef.current)
      if (resultsTransitionTimerRef.current) clearTimeout(resultsTransitionTimerRef.current)
      if (resultsFallbackTimerRef.current) clearTimeout(resultsFallbackTimerRef.current)
      forecastCalculatedRef.current = false
      setProduct(EMPTY_PRODUCT)
      setAssumptions({})
      setAssumptionsGenerated(false)
      setForecastCalculated(false)
      setForecastData([])
      setResearchSources([])
      setChatStep(0)
      setMaxStepReached(1)
      updateNavigation(1)
      setParameterLists(createDefaultParameterItems())
      setCustomParameters({})
      setSelectedParameters(DEFAULT_SELECTED_PARAMETERS)
      setExcelSheets([])
      setExcelPreviewMode(false)
      setAgentSessionId(null)
      setPptxPreparing(false)
      setSensitivityData(null)
      setConversationHistory([])
      if (!silent) {
        const msg = "Forecast reset. Let's start fresh.\n\n" + CHAT_STEPS[0].ask
        botSay(msg, CHAT_STEPS[0].qr)
        setConversationHistory([{ role: 'assistant', content: msg }])
      }
    },
    [updateNavigation, botSay],
  )

  const clearChat = useCallback(() => {
    setConversationHistory([])
    setMessages([])
    setQuickReplies([])
    startOver(true)
    const resetMsg =
      'Chat and forecast cleared.\n\nYou can type all your details at once or answer step by step.\n\n' +
      CHAT_STEPS[0].ask
    botSay(resetMsg, CHAT_STEPS[0].qr)
    setConversationHistory([{ role: 'assistant', content: resetMsg }])
  }, [startOver, botSay])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    getConfig().then((d) => {
      s3Enabled.current = !!d.s3_enabled
    })
    const welcome = WELCOME_MESSAGE + CHAT_STEPS[0].ask
    setTimeout(() => {
      addMsg(welcome, 'bot')
      setConversationHistory([{ role: 'assistant', content: welcome }])
    }, 100)
  }, [addMsg])

  const value = useMemo<ForecastContextValue>(
    () => ({
      product,
      setProduct,
      highlightField,
      activeSection,
      activeNavStep,
      maxStepReached,
      chatHidden,
      setChatHidden,
      messages,
      quickReplies,
      typing,
      chatStep,
      parameterLists,
      parameterLabels,
      customParameters,
      selectedParameters,
      advancedMode,
      setAdvancedMode,
      activePreset,
      assumptions,
      researchSources,
      assumptionsGenerated,
      rationaleVisible,
      forecastData,
      forecastCalculated,
      sensitivityData,
      engineOverlayVisible,
      engineTitle,
      engineSubtitle,
      engineProgress,
      engineSteps,
      engineDetailsHtml,
      engineBtnsVisible,
      excelSheets,
      excelPendingTabs,
      excelFilename,
      excelPreviewMode,
      excelFullscreen,
      setExcelFullscreen,
      agentSessionId,
      excelDownloadHref,
      pptxDownloadHref,
      pptxPreparing,
      aiRecHtml,
      aiRecLoading,
      aiRecApplied,
      sourceModalNum,
      searchFeedExpanded,
      generatingAssumptions,
      showParameterForm,
      validation,
      insightPeakSales,
      insightPeakYear,
      insightPeakPts,
      insightGross,
      insightDiscount,
      insightDrivers,
      navigateToSection,
      showParameterSelection,
      backToProductInfo: () => updateNavigation(1),
      generateAssumptions,
      calculateForecast,
      proceedToResults: () => transitionToResults(),
      viewExistingResults: () => updateNavigation(5),
      backToAssumptions: () => updateNavigation(3),
      startOver,
      sendMessage,
      clearChat,
      applyPreset: applyPresetToLists,
      applyAIRecommendation,
      updateAIRecommendation,
      toggleRationale: () => setRationaleVisible((v) => !v),
      resetAssumptions: () => generateAssumptions(),
      updateAssumption: (key, nv) => {
        setAssumptions((a) => {
          const data = a[key] as AssumptionValue
          if (!data) return a
          let p = parseFloat(nv.replace(/[^0-9.-]/g, ''))
          if (data.unit === '%') p /= 100
          return { ...a, [key]: { ...data, value: p } }
        })
        debouncedSave()
      },
      updateShareParam: (key, prop, v) => {
        setAssumptions((a) => {
          const data = { ...(a[key] as AssumptionValue) }
          const launchYr = Number(a.launchYear) || parseInt(product.launchYear) || 0
          const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''))
          if (prop === 'startingShare') data.startingShare = n / 100
          else if (prop === 'peakYear') {
            data.peakYear = n
            data.timeToPeak = Math.max(0, n - launchYr)
          } else if (prop === 'curveType') data.curveType = v
          return { ...a, [key]: data }
        })
        debouncedSave()
      },
      updateEpiUnit: (key, ut) => {
        setAssumptions((a) => {
          const data = { ...(a[key] as AssumptionValue) }
          data.unitType = ut
          data.displayUnit = ut === 'per100k' ? 'per 100,000' : ut === 'per1M' ? 'per 1,000,000' : 'rate'
          return { ...a, [key]: data }
        })
        debouncedSave()
      },
      toggleYoYGrowth: (key, en) => {
        setAssumptions((a) => {
          const data = { ...(a[key] as AssumptionValue) }
          if (en) data.yoyGrowth = 0
          else delete data.yoyGrowth
          return { ...a, [key]: data }
        })
        debouncedSave()
      },
      updateYoYGrowth: (key, v) => {
        setAssumptions((a) => {
          const data = { ...(a[key] as AssumptionValue) }
          data.yoyGrowth = parseFloat(v.replace(/[^0-9.-]/g, '')) / 100
          return { ...a, [key]: data }
        })
        debouncedSave()
      },
      renameParameter: (id, name) => {
        const t = name.trim()
        if (t) setParameterLabels((l) => ({ ...l, [id]: t }))
      },
      deleteParameter: (cat, id) => {
        if (!confirm('Remove this parameter from the forecast flow?')) return
        setParameterLists((lists) => ({
          ...lists,
          [cat]: lists[cat].filter((p) => p.id !== id),
        }))
        if (customParameters[id]) {
          setCustomParameters((c) => {
            const next = { ...c }
            delete next[id]
            return next
          })
        }
        syncFlowPreview(parameterLists)
      },
      addCustomParameter: (cat, name, desc) => {
        const id = `custom_${cat}_${Date.now()}`
        setCustomParameters((c) => ({ ...c, [id]: { name, description: desc, category: cat } }))
        setParameterLabels((l) => ({ ...l, [id]: name }))
        setParameterLists((lists) => ({
          ...lists,
          [cat]: [
            ...lists[cat],
            {
              id,
              label: name,
              description: desc,
              category: cat,
              type: 'checkbox',
              checked: true,
              badge: 'Custom',
              draggable: true,
              deletable: true,
              custom: true,
            },
          ],
        }))
        setShowParameterForm(null)
        syncFlowPreview(parameterLists)
      },
      reorderParameter: (cat, fromId, toId) => {
        setParameterLists((lists) => {
          const items = [...lists[cat]]
          const fromIdx = items.findIndex((p) => p.id === fromId)
          const toIdx = items.findIndex((p) => p.id === toId)
          if (fromIdx < 0 || toIdx < 0) return lists
          const [moved] = items.splice(fromIdx, 1)
          items.splice(toIdx, 0, moved)
          const next = { ...lists, [cat]: items }
          syncFlowPreview(next)
          return next
        })
      },
      toggleParameterChecked: (cat, id, checked) => {
        setParameterLists((lists) => {
          const next = {
            ...lists,
            [cat]: lists[cat].map((p) => (p.id === id ? { ...p, checked } : p)),
          }
          syncFlowPreview(next)
          return next
        })
      },
      setEpiType: (id) => {
        setParameterLists((lists) => {
          const next = {
            ...lists,
            epidemiology: lists.epidemiology.map((p) =>
              p.radioGroup === 'epi-type' ? { ...p, checked: p.id === id } : p,
            ),
          }
          syncFlowPreview(next)
          return next
        })
      },
      showSourceModal: setSourceModalNum,
      closeSourceModal: () => setSourceModalNum(null),
      toggleSearchFeed: () => setSearchFeedExpanded((v) => !v),
      fillField,
    }),
    [
      product,
      highlightField,
      activeSection,
      activeNavStep,
      maxStepReached,
      chatHidden,
      messages,
      quickReplies,
      typing,
      chatStep,
      parameterLists,
      parameterLabels,
      customParameters,
      selectedParameters,
      advancedMode,
      activePreset,
      assumptions,
      researchSources,
      assumptionsGenerated,
      rationaleVisible,
      forecastData,
      forecastCalculated,
      sensitivityData,
      engineOverlayVisible,
      engineTitle,
      engineSubtitle,
      engineProgress,
      engineSteps,
      engineDetailsHtml,
      engineBtnsVisible,
      excelSheets,
      excelPendingTabs,
      excelFilename,
      excelPreviewMode,
      excelFullscreen,
      agentSessionId,
      excelDownloadHref,
      pptxDownloadHref,
      pptxPreparing,
      aiRecHtml,
      aiRecLoading,
      aiRecApplied,
      sourceModalNum,
      searchFeedExpanded,
      generatingAssumptions,
      showParameterForm,
      validation,
      insightPeakSales,
      insightPeakYear,
      insightPeakPts,
      insightGross,
      insightDiscount,
      insightDrivers,
      navigateToSection,
      showParameterSelection,
      generateAssumptions,
      calculateForecast,
      transitionToResults,
      startOver,
      sendMessage,
      clearChat,
      applyPresetToLists,
      applyAIRecommendation,
      updateAIRecommendation,
      fillField,
      syncFlowPreview,
      customParameters,
      debouncedSave,
      updateNavigation,
    ],
  )

  return <ForecastContext.Provider value={value}>{children}</ForecastContext.Provider>
}

export { formatBotText }
