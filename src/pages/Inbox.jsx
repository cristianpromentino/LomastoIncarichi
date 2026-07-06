import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../App'
import Icon from '../components/Icon'
import { NAV_ICONS } from '../components/icons-map'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = 'https://etrwrxahdbrswljzrzra.supabase.co/functions/v1/gmail-oauth-callback'
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ')

export default function Inbox() {
  const { showToast } = useApp()
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // Gestisce il rientro dal flusso OAuth (?gmail_connected=1 nell'URL)
    const params = new URLSearchParams(window.location.search)
    if (params.get('gmail_connected') === '1') {
      showToast('Gmail collegato ✓', 'success')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('gmail_error')) {
      showToast('Errore collegamento Gmail: ' + params.get('gmail_error'), 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('gmail_connection').select('*').maybeSingle()
    setConnection(data || null)
    setLoading(false)
  }

  function connettiGmail() {
    if (!GOOGLE_CLIENT_ID) {
      showToast('Client ID Google non configurato (variabile VITE_GOOGLE_CLIENT_ID mancante)', 'error')
      return
    }
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    window.location.href = url.toString()
  }

  async function scollega() {
    if (!confirm('Scollegare la casella Gmail? Dovrai ricollegarla per continuare a ricevere email in NodoSuite.')) return
    const { error } = await supabase.from('gmail_connection').delete().eq('id', connection.id)
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    setConnection(null)
    showToast('Gmail scollegato', 'info')
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fog)' }}>Caricamento...</div>
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Inbox</div>
          <div className="page-subtitle">Email in arrivo dalla casella condivisa</div>
        </div>
      </div>

      {!connection ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Icon icon={NAV_ICONS.inbox} size={40} color="var(--fog)" />
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 14, marginBottom: 6 }}>Nessuna casella collegata</div>
          <div style={{ fontSize: 13, color: 'var(--fog)', marginBottom: 20, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            Collega la casella Gmail condivisa dello studio per vedere qui le email in arrivo e rispondere direttamente da NodoSuite.
          </div>
          <button className="btn btn-primary" onClick={connettiGmail}>Connetti Gmail</button>
        </div>
      ) : (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                <span className="badge badge-completato">Connesso</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 6 }}>{connection.email_address}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={scollega}>Scollega</button>
          </div>
          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--fog)', fontStyle: 'italic' }}>
            La lista dei messaggi e la sincronizzazione automatica arrivano nella prossima fase.
          </div>
        </div>
      )}
    </div>
  )
}
