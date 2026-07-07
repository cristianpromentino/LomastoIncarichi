import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../App'
import Icon from '../components/Icon'
import { NAV_ICONS, UTILITY_ICONS } from '../components/icons-map'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = 'https://etrwrxahdbrswljzrzra.supabase.co/functions/v1/gmail-oauth-callback'
const SYNC_FUNCTION_URL = 'https://etrwrxahdbrswljzrzra.supabase.co/functions/v1/gmail-sync'
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ')

export default function Inbox() {
  const { showToast } = useApp()
  const [connection, setConnection] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    load()
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
    const { data: conn } = await supabase.from('gmail_connection').select('*').maybeSingle()
    setConnection(conn || null)
    if (conn) {
      const { data: msgs } = await supabase
        .from('inbox_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(50)
      setMessages(msgs || [])
    }
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
    setMessages([])
    showToast('Gmail scollegato', 'info')
  }

  async function sincronizzaOra() {
    setSyncing(true)
    try {
      const res = await fetch(SYNC_FUNCTION_URL, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore sincronizzazione')
      showToast(data.nuovi > 0 ? `✓ ${data.nuovi} nuove email` : 'Nessuna nuova email', 'success')
      await load()
    } catch (e) {
      showToast('Errore: ' + e.message, 'error')
    }
    setSyncing(false)
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
        {connection && (
          <button className="btn btn-outline btn-sm" onClick={sincronizzaOra} disabled={syncing}>
            {syncing ? <><Icon icon={UTILITY_ICONS.caricamento} size="sm" /> Sincronizzazione...</> : 'Aggiorna ora'}
          </button>
        )}
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
        <>
          <div className="form-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span className="badge badge-completato">Connesso</span>
                <span style={{ fontSize: 13, color: 'var(--slate)', marginLeft: 10 }}>{connection.email_address}</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={scollega}>Scollega</button>
            </div>
          </div>

          <div className="table-wrap">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Icon icon={NAV_ICONS.inbox} size={36} /></div>
                <div className="empty-text">Nessuna email ancora sincronizzata. Prova "Aggiorna ora".</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Da</th><th>Oggetto</th><th>Anteprima</th><th>Ricevuta</th></tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m.id} style={{ fontWeight: m.is_read ? 400 : 700 }}>
                      <td style={{ fontSize: 13 }}>{m.from_name || m.from_address}</td>
                      <td style={{ fontSize: 13 }}>{m.subject}</td>
                      <td style={{ fontSize: 12, color: 'var(--fog)', fontWeight: 400 }}>{m.snippet}</td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 400 }}>
                        {m.received_at ? new Date(m.received_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
