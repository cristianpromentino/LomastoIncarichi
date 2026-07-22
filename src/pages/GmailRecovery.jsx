// Pagina di emergenza, raggiungibile SENZA login, per ricollegare Gmail
// quando il collegamento OAuth scade e nessuno riesce più ad accedere a
// NodoSuite (i codici 2FA passano dalla stessa Gmail collegata).
// Si attiva solo con l'URL: nodosuite.vercel.app/?recupero=gmail&chiave=...
import { useState } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = 'https://etrwrxahdbrswljzrzra.supabase.co/functions/v1/gmail-oauth-callback'
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ')

export default function GmailRecovery() {
  const [avviato, setAvviato] = useState(false)

  function connettiGmail() {
    setAvviato(true)
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    window.location.href = url.toString()
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">Nodo<span>Suite</span></div>
        <div className="login-sub" style={{ marginBottom: 24 }}>Ripristino collegamento Gmail</div>
        <p style={{ fontSize: 13, color: 'var(--fog)', marginBottom: 20, lineHeight: 1.6 }}>
          Questa pagina serve solo per ricollegare la casella Gmail condivisa quando il collegamento è scaduto
          e impedisce l'accesso normale a NodoSuite (i codici di verifica passano da lì).
        </p>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={connettiGmail} disabled={avviato}>
          {avviato ? 'Reindirizzamento...' : 'Connetti Gmail'}
        </button>
      </div>
    </div>
  )
}
