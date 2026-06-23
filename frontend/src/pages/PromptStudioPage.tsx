import { useCallback, useEffect, useState } from 'react'
import {
  discardDraft,
  fetchLockedSchemas,
  fetchPrompt,
  fetchPromptList,
  publishPrompt,
  saveDraft,
  testAssumptionsPrompt,
  testFlowPrompt,
  testGenericPrompt,
  type LockedSchemas,
  type ProductContext,
  type PromptMeta,
  type Resource,
  type TestResult,
} from '../lib/api/prompts'
import { Editor } from '../components/prompt-studio/Editor'
import type { EditorTab } from '../components/prompt-studio/VariableChips'
import { Navbar } from '../components/prompt-studio/Navbar'
import { PromptSidebar } from '../components/prompt-studio/PromptSidebar'
import { TestPanel } from '../components/prompt-studio/TestPanel'
import { ToastProvider, useToast } from '../components/prompt-studio/Toast'

const DEFAULT_PRODUCT: ProductContext = {
  indication: '',
  product_name: '',
  drug_class: '',
  country: 'United States',
  launch_year: 2025,
  peak_year: 2035,
}

function PromptStudioContent() {
  const { toast } = useToast()

  const [prompts, setPrompts] = useState<PromptMeta[]>([])
  const [lockedSchemas, setLockedSchemas] = useState<LockedSchemas>({})
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [selected, setSelected] = useState<string | null>(null)
  const [liveSystem, setLiveSystem] = useState('')
  const [liveTemplate, setLiveTemplate] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userTemplate, setUserTemplate] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [editorTab, setEditorTab] = useState<EditorTab>('system')
  const [saving, setSaving] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)

  const [productContext, setProductContext] = useState<ProductContext>(DEFAULT_PRODUCT)
  const [flowQuery, setFlowQuery] = useState('')
  const [assumptionsQuery, setAssumptionsQuery] = useState('')
  const [genericQuery, setGenericQuery] = useState('')
  const [flowStructInput, setFlowStructInput] = useState('')
  const [sessionFlowResult, setSessionFlowResult] = useState<unknown>(null)
  const [sessionFlowAuto, setSessionFlowAuto] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [running, setRunning] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const selectedMeta = prompts.find((p) => p.name === selected) || null

  const loadList = useCallback(async () => {
    try {
      const [data, schemas] = await Promise.all([fetchPromptList(), fetchLockedSchemas()])
      setPrompts(data.prompts || [])
      setLockedSchemas(schemas)
      setListError(null)
    } catch {
      setListError('Failed to load prompts')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const selectPrompt = useCallback(
    async (name: string) => {
      if (selected === name) return
      setSelected(name)
      setDirty(false)
      setTestResult(null)
      setTestError(null)
      setResources([])
      setEditorTab('system')

      try {
        const data = await fetchPrompt(name)
        const active = data.has_draft && data.draft ? data.draft : data.live
        setLiveSystem(data.live.system_prompt || '')
        setLiveTemplate(data.live.user_template || '')
        setSystemPrompt(active.system_prompt || '')
        setUserTemplate(active.user_template || '')
        setHasDraft(data.has_draft)
        setLastModified(data.last_modified)
      } catch (e) {
        toast('Failed to load prompt: ' + (e instanceof Error ? e.message : String(e)), 'error')
      }
    },
    [selected, toast],
  )

  const handleSystemChange = (v: string) => {
    setSystemPrompt(v)
    setDirty(true)
  }

  const handleTemplateChange = (v: string) => {
    setUserTemplate(v)
    setDirty(true)
  }

  const handleSaveDraft = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await saveDraft(selected, { system_prompt: systemPrompt, user_template: userTemplate })
      setHasDraft(true)
      setDirty(false)
      await loadList()
      toast('Draft saved', 'success')
    } catch (e) {
      toast('Failed to save draft: ' + (e instanceof Error ? e.message : String(e)), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishOpen(false)
    if (!selected) return
    try {
      await publishPrompt(selected)
      setHasDraft(false)
      setDirty(false)
      await loadList()
      toast('Prompt published to live ✓', 'success')
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      toast('Publish failed: ' + (e instanceof Error ? e.message : String(e)), 'error')
    }
  }

  const handleDiscard = async () => {
    if (!selected) return
    if (!hasDraft && !dirty) return
    const hadDraft = hasDraft
    if (hadDraft) {
      if (!confirm('Discard the draft and revert to the live version?')) return
      try {
        await discardDraft(selected)
      } catch (e) {
        toast('Failed to discard: ' + (e instanceof Error ? e.message : String(e)), 'error')
        return
      }
      setHasDraft(false)
      await loadList()
    }
    setDirty(false)
    setSystemPrompt(liveSystem)
    setUserTemplate(liveTemplate)
    toast(hadDraft ? 'Draft discarded' : 'Reset to live version', 'warning')
  }

  const getFlowStructure = (): unknown => {
    const val = flowStructInput.trim()
    if (val) {
      try {
        return JSON.parse(val)
      } catch {
        /* fall through */
      }
    }
    return sessionFlowResult || null
  }

  const handleRunTest = async () => {
    if (!selected || !selectedMeta) return
    const testType = selectedMeta.test_type || 'generic'
    setRunning(true)
    setTestError(null)
    setTestResult(null)

    try {
      let data: TestResult
      const content = { system_prompt: systemPrompt, user_template: userTemplate }

      if (testType === 'flow') {
        data = await testFlowPrompt({
          ...content,
          ...productContext,
          query: flowQuery,
        })
      } else if (testType === 'assumptions') {
        data = await testAssumptionsPrompt({
          ...content,
          ...productContext,
          query: assumptionsQuery,
          resources: resources.map((r) => ({
            type: r.type,
            content: r.content,
            name: r.name,
          })),
          funnel_structure: getFlowStructure(),
        })
      } else {
        data = await testGenericPrompt({ ...content, query: genericQuery })
      }

      const enriched: TestResult = {
        ...data,
        testType,
        contextUsed: productContext,
        queryUsed:
          testType === 'flow'
            ? flowQuery
            : testType === 'assumptions'
              ? assumptionsQuery
              : genericQuery,
      }
      setTestResult(enriched)

      if (testType === 'flow' && data.parsed) {
        setSessionFlowResult(data.parsed)
        setSessionFlowAuto(true)
        setFlowStructInput(JSON.stringify(data.parsed, null, 2))
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const handlePassToAssumptions = () => {
    if (!testResult?.parsed) {
      toast('Run the Flow test first to generate a funnel structure', 'warning')
      return
    }
    setSessionFlowResult(testResult.parsed)
    setSessionFlowAuto(true)
    setFlowStructInput(JSON.stringify(testResult.parsed, null, 2))
    const assm = prompts.find((p) => p.test_type === 'assumptions')
    if (assm) {
      selectPrompt(assm.name)
      toast('Flow structure passed to Step 3 ✓', 'success')
    } else {
      toast('Flow structure saved — switch to the Assumptions prompt to use it', 'success')
    }
  }

  const handleClearFlowStructure = () => {
    setSessionFlowResult(null)
    setSessionFlowAuto(false)
    setFlowStructInput('')
  }

  const handleFlowStructChange = (v: string) => {
    setFlowStructInput(v)
    if (!v.trim()) {
      setSessionFlowResult(null)
      setSessionFlowAuto(false)
    }
  }

  useEffect(() => {
    if (selectedMeta?.test_type === 'assumptions' && sessionFlowAuto && sessionFlowResult) {
      setFlowStructInput(JSON.stringify(sessionFlowResult, null, 2))
    }
  }, [selectedMeta?.test_type, sessionFlowAuto, sessionFlowResult])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F5F6F8] font-sans text-[#1A2C3D]">
      <Navbar />
      <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_390px] overflow-hidden">
        <PromptSidebar
          prompts={prompts}
          selected={selected}
          loading={listLoading}
          error={listError}
          onSelect={selectPrompt}
        />
        <Editor
          meta={selectedMeta}
          lockedSchemas={lockedSchemas}
          editorTab={editorTab}
          systemPrompt={systemPrompt}
          userTemplate={userTemplate}
          liveSystem={liveSystem}
          liveTemplate={liveTemplate}
          hasDraft={hasDraft}
          dirty={dirty}
          lastModified={lastModified}
          saving={saving}
          publishOpen={publishOpen}
          onTabChange={setEditorTab}
          onSystemChange={handleSystemChange}
          onTemplateChange={handleTemplateChange}
          onSaveDraft={handleSaveDraft}
          onDiscard={handleDiscard}
          onOpenPublish={() => setPublishOpen(true)}
          onClosePublish={() => setPublishOpen(false)}
          onPublish={handlePublish}
        />
        <TestPanel
          meta={selectedMeta}
          productContext={productContext}
          onProductContextChange={setProductContext}
          flowQuery={flowQuery}
          onFlowQueryChange={setFlowQuery}
          assumptionsQuery={assumptionsQuery}
          onAssumptionsQueryChange={setAssumptionsQuery}
          genericQuery={genericQuery}
          onGenericQueryChange={setGenericQuery}
          flowStructInput={flowStructInput}
          onFlowStructInputChange={handleFlowStructChange}
          sessionFlowAuto={sessionFlowAuto}
          resources={resources}
          onResourcesChange={setResources}
          onClearFlowStructure={handleClearFlowStructure}
          running={running}
          result={testResult}
          testError={testError}
          onRunTest={handleRunTest}
          onPassToAssumptions={handlePassToAssumptions}
        />
      </div>
    </div>
  )
}

export default function PromptStudioPage() {
  return (
    <ToastProvider>
      <PromptStudioContent />
    </ToastProvider>
  )
}
