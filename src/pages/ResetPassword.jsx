import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fatto, setFatto] = useState(false)

  async function handleSalva() {
    if (!password || password.length < 6) { setError('La password deve avere almeno 6 caratteri'); return }
    if (password !== conferma) { setError('Le due password non coincidono'); return }
    setLoading(true); setError('')
    try {
      const { error: updError } = await supabase.auth.updateUser({ password })
      if (updError) throw new Error('Errore durante il salvataggio, riprova')
      setFatto(true)
      await supabase.auth.signOut()
      setTimeout(() => { window.location.href = window.location.origin }, 2500)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function handleKey(e) { if (e.key === 'Enter') handleSalva() }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="/NodoSuite_logo.svg" alt="NodoSuite" className="login-logo-img" />
        <div className="login-sub" style={{ marginBottom: 24 }}>Imposta una nuova password</div>
        {error && <div className="login-error">{error}</div>}

        {fatto ? (
          <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6 }}>
            Password aggiornata ✓ Verrai reindirizzato al login tra un attimo...
          </div>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Nuova password</label>
              <input
                className="form-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Conferma password</label>
              <input
                className="form-input" type="password" placeholder="••••••••"
                value={conferma} onChange={e => setConferma(e.target.value)} onKeyDown={handleKey}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSalva} disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva nuova password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
