import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MarkdownEditor from './MarkdownEditor'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MarkdownEditor />
  </StrictMode>,
)
