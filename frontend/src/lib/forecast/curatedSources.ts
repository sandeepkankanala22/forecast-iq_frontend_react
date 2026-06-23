import type { ResearchSource } from './types'

type CuratedMap = Record<string, ResearchSource[]>

export const CURATED_SOURCES_MAP: CuratedMap = {
  'rheumatoid arthritis': [
    { title: 'ACR RA Treatment Guidelines 2021', domain: 'rheumatology.org', url: 'https://www.rheumatology.org/Practice-Quality/Clinical-Support/Clinical-Practice-Guidelines/Rheumatoid-Arthritis' },
    { title: 'EULAR RA Management Recommendations 2022', domain: 'ard.bmj.com', url: 'https://ard.bmj.com/content/82/1/3' },
    { title: 'CDC Arthritis Prevalence & Impact', domain: 'cdc.gov', url: 'https://www.cdc.gov/arthritis/data_statistics/arthritis-related-stats.htm' },
    { title: 'Global RA Burden — GBD 2019 Analysis', domain: 'thelancet.com', url: 'https://www.thelancet.com/journals/lanrhe/article/PIIS2665-9913(21)00252-0/fulltext' },
    { title: 'FDA Drug Approvals — TNF Inhibitors', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/novel-drug-approvals-fda' },
    { title: 'ClinicalTrials.gov — RA Studies', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Rheumatoid+Arthritis&status=COMPLETED&phase=PHASE3' },
    { title: 'NCI Drug Dictionary — DMARDs', domain: 'ncithesaurus.nci.nih.gov', url: 'https://ncithesaurus.nci.nih.gov/ncitbrowser/' },
  ],
  psoriasis: [
    { title: 'AAD Psoriasis Guidelines of Care 2020', domain: 'jaad.org', url: 'https://www.jaad.org/article/S0190-9622(20)32288-X/fulltext' },
    { title: 'EADV Psoriasis Management Guidelines', domain: 'eadv.org', url: 'https://www.eadv.org/clinical-practice/eadv-guidelines/' },
    { title: 'NPF Psoriasis Prevalence Data', domain: 'psoriasis.org', url: 'https://www.psoriasis.org/statistics/' },
    { title: 'Global Psoriasis Atlas', domain: 'globalpsoriasisatlas.org', url: 'https://www.globalpsoriasisatlas.org/prevalence/' },
    { title: 'FDA Biologics for Plaque Psoriasis', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/novel-drug-approvals-fda' },
    { title: 'ClinicalTrials — IL-17/IL-23 Phase 3', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Plaque+Psoriasis&phase=PHASE3&status=COMPLETED' },
    { title: 'JAMA Dermatology — Biologics Comparative', domain: 'jamanetwork.com', url: 'https://jamanetwork.com/journals/jamadermatology' },
  ],
  'multiple sclerosis': [
    { title: 'MSIF Atlas of MS 2023', domain: 'msif.org', url: 'https://www.msif.org/resource/atlas-of-ms/' },
    { title: 'National MS Society — Prevalence Project', domain: 'nationalmssociety.org', url: 'https://www.nationalmssociety.org/About-the-MS-Society/News/New-Prevalence-Data' },
    { title: 'EAN/ECTRIMS Treatment Guidelines 2023', domain: 'ean.org', url: 'https://www.ean.org/ean/guidelines/ms-guidelines' },
    { title: 'FDA MS Drug Approvals — DMTs', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/drug-approvals-and-databases' },
    { title: 'ClinicalTrials — Relapsing MS Phase 3', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Multiple+Sclerosis%2C+Relapsing-Remitting&phase=PHASE3' },
    { title: 'NEJM — Real-World DMT Outcomes', domain: 'nejm.org', url: 'https://www.nejm.org/medical-research/multiple-sclerosis' },
    { title: 'WHO Neurological Disorders Atlas', domain: 'who.int', url: 'https://www.who.int/publications/i/item/9789241547888' },
  ],
  'type 2 diabetes': [
    { title: 'IDF Diabetes Atlas 10th Edition 2021', domain: 'diabetesatlas.org', url: 'https://diabetesatlas.org/atlas/tenth-edition/' },
    { title: 'ADA Standards of Medical Care 2024', domain: 'diabetesjournals.org', url: 'https://diabetesjournals.org/care/issue/47/Supplement_1' },
    { title: 'CDC National Diabetes Statistics Report', domain: 'cdc.gov', url: 'https://www.cdc.gov/diabetes/data/statistics-report/index.html' },
    { title: 'WHO Global Diabetes Prevalence', domain: 'who.int', url: 'https://www.who.int/news-room/fact-sheets/detail/diabetes' },
    { title: 'FDA GLP-1/SGLT-2 Approvals', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/novel-drug-approvals-fda' },
    { title: 'ClinicalTrials — T2D Cardiovascular Outcomes', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Type+2+Diabetes&phase=PHASE3&status=COMPLETED' },
    { title: 'Lancet — Global Burden of Diabetes 2022', domain: 'thelancet.com', url: 'https://www.thelancet.com/action/doSearch?searchType=quick&searchText=diabetes+global+burden' },
  ],
  'lung cancer': [
    { title: 'NCCN NSCLC Guidelines v5.2024', domain: 'nccn.org', url: 'https://www.nccn.org/professionals/physician_gls/pdf/nscl.pdf' },
    { title: 'GLOBOCAN 2022 — Lung Cancer Incidence', domain: 'gco.iarc.fr', url: 'https://gco.iarc.fr/today/fact-sheets-cancers?cancer=15&type=0&sex=0' },
    { title: 'SEER Lung Cancer Stat Facts', domain: 'seer.cancer.gov', url: 'https://seer.cancer.gov/statfacts/html/lungb.html' },
    { title: 'FDA Oncology Drug Approvals 2023–2024', domain: 'fda.gov', url: 'https://www.fda.gov/patients/hematologyoncology-cancer-approvals-safety-notifications' },
    { title: 'ClinicalTrials — PD-1/PD-L1 NSCLC Phase 3', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Non-Small+Cell+Lung+Cancer&term=PD-1&phase=PHASE3' },
    { title: 'ASCO — Lung Cancer Market Landscape', domain: 'ascopubs.org', url: 'https://ascopubs.org/journal/jco/lung-cancer' },
    { title: 'IASLC Staging & Epidemiology Data', domain: 'iaslc.org', url: 'https://www.iaslc.org/research-education/data-collection-databases' },
  ],
  'breast cancer': [
    { title: 'NCCN Breast Cancer Guidelines 2024', domain: 'nccn.org', url: 'https://www.nccn.org/professionals/physician_gls/pdf/breast.pdf' },
    { title: 'GLOBOCAN 2022 — Breast Cancer Incidence', domain: 'gco.iarc.fr', url: 'https://gco.iarc.fr/today/fact-sheets-cancers?cancer=20&type=0&sex=2' },
    { title: 'SEER Breast Cancer Stat Facts', domain: 'seer.cancer.gov', url: 'https://seer.cancer.gov/statfacts/html/breast.html' },
    { title: 'FDA CDK4/6 & HER2 Drug Approvals', domain: 'fda.gov', url: 'https://www.fda.gov/patients/hematologyoncology-cancer-approvals-safety-notifications/breast-cancer' },
    { title: 'EBCTCG Meta-Analysis — Early Breast Cancer', domain: 'thelancet.com', url: 'https://www.thelancet.com/journals/lanonc/article/PIIS1470-2045(22)00109-7' },
    { title: 'ClinicalTrials — HER2+/HR+ Phase 3', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Breast+Neoplasms&phase=PHASE3&status=COMPLETED' },
    { title: 'ASCO Breast — Market Access Reports', domain: 'ascopubs.org', url: 'https://ascopubs.org/journal/jco/breast-cancer' },
  ],
  'atopic dermatitis': [
    { title: 'AAD Atopic Dermatitis Guidelines', domain: 'jaad.org', url: 'https://www.jaad.org/article/S0190-9622(23)00002-3/fulltext' },
    { title: 'EADV Eczema Treatment Recommendations', domain: 'eadv.org', url: 'https://www.eadv.org/clinical-practice/eadv-guidelines/atopic-eczema/' },
    { title: 'Global Eczema — Prevalence Analysis 2022', domain: 'nationaleczema.org', url: 'https://nationaleczema.org/research/eczema-facts/' },
    { title: 'FDA IL-4/IL-13 & JAK Inhibitor Approvals', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/novel-drug-approvals-fda' },
    { title: 'ClinicalTrials — Dupilumab / Tralokinumab', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Atopic+Dermatitis&phase=PHASE3&status=COMPLETED' },
    { title: 'NEJM — JAK Inhibitors vs Biologics AD', domain: 'nejm.org', url: 'https://www.nejm.org/search?q=atopic+dermatitis' },
  ],
  'heart failure': [
    { title: 'AHA Heart Disease & Stroke Statistics 2024', domain: 'ahajournals.org', url: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001123' },
    { title: 'ESC Heart Failure Guidelines 2021', domain: 'escardio.org', url: 'https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Acute-and-Chronic-Heart-Failure' },
    { title: 'CDC Heart Failure Prevalence Data', domain: 'cdc.gov', url: 'https://www.cdc.gov/heartdisease/heart_failure.htm' },
    { title: 'FDA SGLT-2 HFpEF/HFrEF Approvals', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/novel-drug-approvals-fda' },
    { title: 'ClinicalTrials — HFpEF/HFrEF Phase 3', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Heart+Failure&phase=PHASE3&status=COMPLETED' },
    { title: 'NEJM — EMPEROR / DAPA-HF Trials', domain: 'nejm.org', url: 'https://www.nejm.org/search?q=heart+failure+SGLT2' },
    { title: 'HFSA 2022 Comprehensive Guidelines', domain: 'hfsa.org', url: 'https://hfsa.org/2022-hfsa-guideline-management-heart-failure' },
  ],
  alzheimer: [
    { title: "Alzheimer's Association Facts & Figures 2024", domain: 'alz.org', url: 'https://www.alz.org/alzheimers-dementia/facts-figures' },
    { title: 'WHO Dementia Fact Sheet 2023', domain: 'who.int', url: 'https://www.who.int/news-room/fact-sheets/detail/dementia' },
    { title: 'NIA Alzheimer Prevalence & Projections', domain: 'nia.nih.gov', url: 'https://www.nia.nih.gov/health/alzheimers-and-dementia/alzheimers-disease-fact-sheet' },
    { title: 'FDA Anti-Amyloid Drug Approvals', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/novel-drug-approvals-fda' },
    { title: 'ClinicalTrials — Anti-Amyloid Phase 3', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?cond=Alzheimer+Disease&phase=PHASE3&status=COMPLETED' },
    { title: 'Lancet — Global Dementia Commission 2024', domain: 'thelancet.com', url: 'https://www.thelancet.com/commissions/dementia2024' },
    { title: 'AAIC Biomarker & Epidemiology Data', domain: 'aaic.alz.org', url: 'https://aaic.alz.org/research.asp' },
  ],
  _default: [
    { title: 'WHO Global Health Observatory Data', domain: 'who.int', url: 'https://www.who.int/data/gho' },
    { title: 'GBD 2021 — Global Burden of Disease', domain: 'healthdata.org', url: 'https://www.healthdata.org/research-analysis/gbd' },
    { title: 'FDA Novel Drug Approvals Database', domain: 'fda.gov', url: 'https://www.fda.gov/drugs/drug-approvals-and-databases/novel-drug-approvals-fda' },
    { title: 'ClinicalTrials.gov — Phase 3 Trials', domain: 'clinicaltrials.gov', url: 'https://clinicaltrials.gov/search?phase=PHASE3&status=COMPLETED' },
    { title: 'EMA — European Public Assessment Reports', domain: 'ema.europa.eu', url: 'https://www.ema.europa.eu/en/medicines/download-medicine-data' },
    { title: 'Evaluate Pharma — Market Forecast Data', domain: 'evaluate.com', url: 'https://www.evaluate.com/vantage/articles/insights/company-sales/world-preview' },
  ],
}

export function getCuratedForIndication(indication: string): ResearchSource[] {
  const ind = (indication || '').toLowerCase()
  for (const key of Object.keys(CURATED_SOURCES_MAP)) {
    if (key === '_default') continue
    const words = key.split(' ')
    if (ind.includes(key) || words.some((w) => w.length > 4 && ind.includes(w)))
      return CURATED_SOURCES_MAP[key]
  }
  if (/(cancer|carcinoma|tumor|lymphoma|leukemia|myeloma|sarcoma)/i.test(ind))
    return CURATED_SOURCES_MAP['lung cancer']
  if (/(eczema|dermatitis)/i.test(ind)) return CURATED_SOURCES_MAP['atopic dermatitis']
  if (/(cardiac|cardio|coronary|afib|arrhythmia)/i.test(ind))
    return CURATED_SOURCES_MAP['heart failure']
  if (/(dementia|parkinson|neurolog)/i.test(ind)) return CURATED_SOURCES_MAP.alzheimer
  if (/(diabet|insulin|glucose|glycem)/i.test(ind)) return CURATED_SOURCES_MAP['type 2 diabetes']
  return CURATED_SOURCES_MAP._default
}

export function buildSearchFeedHTML(
  indication: string,
  country: string,
  classMoa: string,
  completedIdx: number,
  expanded: boolean,
  onToggleExpand?: () => void,
): string {
  const curated = getCuratedForIndication(indication)
  const pubQueries = [
    indication + ' prevalence epidemiology ' + country,
    indication + ' incidence annual new cases',
    classMoa + ' ' + indication + ' clinical outcomes',
  ]

  const allItems: { title: string; url: string; domain: string; tag: string }[] = []
  const maxCurated = Math.min(curated.length, 7)
  for (let i = 0; i < maxCurated; i++) {
    allItems.push({ title: curated[i].title, url: curated[i].url, domain: curated[i].domain, tag: 'Source' })
    if (i < pubQueries.length) {
      const term = encodeURIComponent(pubQueries[i]).replace(/%20/g, '+')
      allItems.push({
        title: pubQueries[i],
        url: 'https://pubmed.ncbi.nlm.nih.gov/?term=' + term,
        domain: 'pubmed.ncbi.nlm.nih.gov',
        tag: 'PubMed',
      })
    }
  }

  const total = allItems.length
  const done = Math.min(completedIdx, total)
  const isLive = done < total
  const active = isLive ? allItems[done] : null
  const discovered = allItems.slice(0, done)

  if (expanded) {
    const listRows = discovered
      .map((item, idx) => {
        const isPub = item.tag === 'PubMed'
        const tagHtml = `<span style="font-size:9px;padding:2px 6px;border-radius:10px;font-weight:700;flex-shrink:0;letter-spacing:.2px;${isPub ? 'background:rgba(37,99,235,.1);color:#2563eb;' : 'background:rgba(201,146,42,.12);color:#b8811e;'}">${item.tag}</span>`
        const srcNum = idx + 1
        return `<div data-source="${srcNum}" style="display:flex;align-items:center;gap:9px;padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.05);">
          <span style="font-size:9px;font-weight:700;width:18px;height:18px;border-radius:50%;background:#1A4F72;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${srcNum}</span>
          <div style="flex:1;min-width:0;"><div style="font-size:11px;font-weight:600;color:#1A2C3D;">Source ${srcNum}</div>
          <div style="font-size:10px;color:#4A6580;margin-top:1px;">Verified reference · click to view</div></div>${tagHtml}</div>`
      })
      .join('')

    const liveRow = isLive
      ? `<div style="display:flex;align-items:center;gap:9px;padding:8px 12px;background:rgba(26,79,114,.04);">
          <span class="animate-spin inline-block w-[18px] h-[18px] border-2 border-chryselys-primary/20 border-t-chryselys-primary rounded-full"></span>
          <div style="flex:1;"><div style="font-size:11px;font-weight:500;color:#4A6580;">Source ${done + 1}</div>
          <div style="font-size:10px;color:#A0AEC0;">Reading…</div></div></div>`
      : ''

    return `<div class="search-feed" style="font-family:Inter,sans-serif;border:1px solid rgba(0,0,0,.08);border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.07);">
      <div class="search-feed-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.07);cursor:pointer;">
        <div style="display:flex;align-items:center;gap:7px;"><span style="font-size:12px;font-weight:700;color:#1A2C3D;">${isLive ? 'Searching' : 'Sources'}</span></div>
        <span style="font-size:11px;font-weight:600;color:${isLive ? '#b8811e' : '#16a34a'};">${done} sources</span>
      </div>${listRows}${liveRow}</div>`
  }

  const sweepBar = `<div style="height:2px;background:rgba(0,0,0,.05);border-radius:2px;overflow:hidden;margin-bottom:11px;position:relative;">
    ${isLive ? '<div class="loading-bar-sweep"></div>' : '<div style="position:absolute;inset:0;background:linear-gradient(90deg,#1A4F72,#16a34a);border-radius:2px;"></div>'}
  </div>`

  const favStack = discovered
    .concat(active ? [active] : [])
    .slice(0, 5)
    .map((_, idx) => {
      const srcNum = idx + 1
      const isActiveItem = isLive && idx === done
      const ml = idx === 0 ? '0' : '-8px'
      const spinRing = isActiveItem
        ? '<div style="position:absolute;inset:-2px;border-radius:8px;border:2px solid rgba(26,79,114,0.45);animation:link-pulse 1.2s ease-in-out infinite;"></div>'
        : ''
      return `<div style="position:relative;margin-left:${ml};flex-shrink:0;">
        <div style="width:26px;height:26px;border-radius:7px;border:2px solid #F5F6F8;box-shadow:0 1px 4px rgba(0,0,0,.12);background:linear-gradient(135deg,#1A4F72,#2E6A96);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:8px;font-weight:700;color:#fff;">${srcNum}</span></div>${spinRing}</div>`
    })
    .join('')

  const activeLabel = active
    ? `<div style="display:flex;align-items:center;gap:7px;margin-top:9px;padding:6px 10px;border-radius:8px;background:rgba(26,79,114,.05);border:1px solid rgba(26,79,114,.09);">
        <span style="font-size:10px;font-weight:600;color:#1A2C3D;">Source ${done + 1}</span>
        <span style="font-size:9px;color:#4A6580;">Retrieving verified reference…</span></div>`
    : ''

  const clickable =
    done > 0
      ? `<div class="search-feed-toggle" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <div style="display:flex;align-items:center;">${favStack}</div>
          <span style="font-size:11px;font-weight:600;color:#1A4F72;">${done} sources ›</span></div>`
      : `<div style="height:30px;display:flex;align-items:center;"><span style="font-size:11px;color:#A0AEC0;">Looking for sources…</span></div>`

  void onToggleExpand
  return `<div style="font-family:Inter,sans-serif;">${sweepBar}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:700;color:#1A2C3D;">${isLive ? 'Searching' : 'Research complete'}</span>
      ${isLive ? '' : '<span style="font-size:11px;font-weight:600;color:#16a34a;">✓ Done</span>'}
    </div>${clickable}${activeLabel}</div>`
}
