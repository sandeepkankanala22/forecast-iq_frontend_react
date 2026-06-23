import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PromptStudioPage from './pages/PromptStudioPage'
import ExcelViewerPage from './pages/ExcelViewerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/prompt-editor" element={<PromptStudioPage />} />
        <Route path="/preview_excel" element={<ExcelViewerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
