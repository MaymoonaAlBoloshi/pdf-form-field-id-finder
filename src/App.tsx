import { useState } from 'react'
import './App.css'


function App() {
  const [pdf, stePdf] = useState<any>(null)

  return (
    <>
      <div style={{
        width: '100%',
        height: '100vh',
        backgroundColor: 'pink ',
      }}>
        PDF RR FORM
        <p>PDF: {pdf?.name}</p>
        
        lets get the pdf
        <input type="file" onChange={(e) => stePdf(e.target.files[0])} />

        
      </div>
    </>
  )
}

export default App
