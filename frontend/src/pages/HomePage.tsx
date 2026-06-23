import { useRef } from 'react'
import { ForecastProvider, useForecast } from '../context/ForecastContext'
import { useChatResize } from '../hooks/useChatResize'
import ChatPanel from '../components/forecast/ChatPanel'
import Footer from '../components/forecast/Footer'
import Navbar from '../components/forecast/Navbar'
import NavRibbon from '../components/forecast/NavRibbon'
import ProductInfoSection from '../components/forecast/ProductInfoSection'
import ParameterSelectionSection from '../components/forecast/ParameterSelectionSection'
import AssumptionsSection from '../components/forecast/AssumptionsSection'
import ForecastEngineSection from '../components/forecast/ForecastEngineSection'
import ResultsSection from '../components/forecast/ResultsSection'
import SourceModal from '../components/forecast/SourceModal'
import '../forecast.css'

function ForecastAppShell() {
  const shellRef = useRef<HTMLDivElement>(null)
  const { chatHidden } = useForecast()
  useChatResize(shellRef, chatHidden)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-chryselys-bg text-chryselys-text">
      <Navbar />
      <div
        ref={shellRef}
        id="appShell"
        className={`grid min-h-0 flex-1 ${chatHidden ? 'grid-cols-1' : 'grid-cols-[1fr_480px]'}`}
        style={chatHidden ? undefined : { gridTemplateColumns: '1fr 480px' }}
      >
        <main id="workspace" className="min-h-0 overflow-y-auto">
          <NavRibbon />
          <div className="fc-container mx-auto max-w-[1200px] px-6 py-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-8 w-1 shrink-0 rounded-sm bg-gradient-to-b from-chryselys-gold to-chryselys-gold-light" />
              <h1 className="text-2xl font-bold text-chryselys-primary">Prompt Studio</h1>
            </div>
            <p className="mb-6 ml-4 text-sm text-chryselys-text-2">
              Commercial patient-based forecasting · Powered by{' '}
              <strong className="font-semibold text-chryselys-primary">Chryselys</strong>
            </p>
            <div className="space-y-6">
              <ProductInfoSection />
              <ParameterSelectionSection />
              <AssumptionsSection />
              <ForecastEngineSection />
              <ResultsSection />
            </div>
          </div>
        </main>
        {!chatHidden && <ChatPanel />}
      </div>
      <Footer />
      <SourceModal />
    </div>
  )
}

export default function HomePage() {
  return (
    <ForecastProvider>
      <ForecastAppShell />
    </ForecastProvider>
  )
}
