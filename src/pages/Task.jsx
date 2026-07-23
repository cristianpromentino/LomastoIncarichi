import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../App'
import Icon from '../components/Icon'
import { NAV_ICONS } from '../components/icons-map'
import TaskModal from '../components/TaskModal'

const PRIORITA_LABEL = { bassa: 'Bassa', media: 'Media', alta: 'Alta', urgente: 'Urgente' }
const PRIORITA_COLORI = {
  bassa: { background: '#f3f4f6', color: '#6b7280' },
  media: { background: '#e8f2f7', color: '#015578' },
  alta: { background: '#fef3c7', color: '#d97706' },
  urgente: { background: '#fee2e2', color: '#dc2626' },
}
const STATO_LABEL = { da_fare: 'Da fare', in_corso: 'In corso', bloccato: 'Bloccato', completato: 'Completato' }
const STATO_COLORI = {
  da_fare: { background: '#f3f4f6', color: '#6b7280' },
  in_corso: { background: '#e8f2f7', color: '#015578' },
  bloccato: { background: '#fee2e2', color: '#dc2626' },
  completato: { background: '#dcfce7', color: '#16a34a' },
}

function isScaduto(t) {
  if (!t.data_scadenza || t.stato === 'completato') return false
  return new Date(t.data_scadenza) < new Date(new Date().toDateString())
}

export default function Task() {
  const { navigate, showToast, profilo } = useApp()
  const [lista, setLista] = useState([])
  const [profili, setProfili] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('')
  const [soloMie, setSoloMie] = useState(false)
  const [search, setSearch] = useState('')
  const [showNuovo, setShowNuovo] = useState(false)

  useEffect(() => {
    load()
    if (sessionStorage.getItem('nodosuite:openNewTask') === '1') {
      sessionStorage.removeItem('nodosuite:openNewTask')
      setShowNuovo(true)
    }
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: task }, { data: assegnazioni }, { data: prof }] = await Promise.all([
      supabase.from('attivita_interne').select('*, edifici(nome)').order('created_at', { ascending: false }),
      supabase.from('attivita_assegnatari').select('*, profili(id, nome_completo)'),
      supabase.from('profili').select('id, nome_completo').order('nome_completo'),
    ])
    const assegnatiPerTask = {}
    ;(assegnazioni || []).forEach(a => {
      if (!assegnatiPerTask[a.attivita_id]) assegnatiPerTask[a.attivita_id] = []
      assegnatiPerTask[a.attivita_id].push(a.profili)
    })
    setLista((task || []).map(t => ({ ...t, assegnatari: assegnatiPerTask[t.id] || [] })))
    setProfili(prof || [])
    setLoading(false)
  }

  const listaFiltrata = useMemo(() => {
    let base = lista
    if (filtroStato) base = base.filter(t => t.stato === filtroStato)
    if (soloMie) base = base.filter(t => t.assegnatari.some(a => a.id === profilo?.id))
    const q = search.trim().toLowerCase()
    if (q) base = base.filter(t => (t.titolo || '').toLowerCase().includes(q) || (t.descrizione || '').toLowerCase().includes(q))
    return base
  }, [lista, filtroStato, soloMie, search, profilo])

  async function creaTask(payload) {
    const { data, error } = await supabase.from('attivita_interne').insert({
      titolo: payload.titolo,
      descrizione: payload.descrizione || null,
      priorita: payload.priorita,
      area: payload.area || null,
      stato: 'da_fare',
      data_inizio: payload.data_inizio || null,
      data_scadenza: payload.data_scadenza || null,
      edificio_id: payload.edificio_id || null,
      persona_riferimento_id: payload.persona_riferimento_id || null,
      origine_message_id: payload.origine_message_id || null,
      creato_da: profilo?.id,
    }).select().single()
    if (error) { showToast('Errore: ' + error.message, 'error'); return }

    if (payload.assegnatari?.length) {
      await supabase.from('attivita_assegnatari').insert(
        payload.assegnatari.map(pid => ({ attivita_id: data.id, profilo_id: pid }))
      )
    }

    if (payload.files?.length) {
      for (const file of payload.files) {
        const path = `${data.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from('task-allegati').upload(path, file)
        if (!upErr) {
          await supabase.from('attivita_allegati').insert({
            attivita_id: data.id, filename: file.name, mime_type: file.type, size_bytes: file.size,
            storage_path: path, caricato_da: profilo?.id,
          })
        }
      }
    }
    showToast('Task creato ✓', 'success')
    setShowNuovo(false)
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fog)' }}>Caricamento...</div>

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Task</div>
          <div className="page-subtitle">Attività interne allo studio · {listaFiltrata.length} {listaFiltrata.length === 1 ? 'task' : 'task'}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNuovo(true)}>+ Nuovo task</button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <select className="form-select" style={{ width: 160 }} value={filtroStato} onChange={e => setFiltroStato(e.target.value)}>
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={soloMie} onChange={e => setSoloMie(e.target.checked)} /> Solo le mie
        </label>
        <input className="form-input" style={{ flex: 1, minWidth: 180 }} placeholder="Cerca per titolo o descrizione..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-wrap">
        {listaFiltrata.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon icon={NAV_ICONS.task} size={36} /></div>
            <div className="empty-text">Nessun task trovato.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Titolo</th><th>Assegnatari</th><th>Priorità</th><th>Stato</th><th>Scadenza</th></tr>
            </thead>
            <tbody>
              {listaFiltrata.map(t => {
                const scaduto = isScaduto(t)
                return (
                  <tr key={t.id} onClick={() => navigate('task-dettaglio', t.id)} style={{ cursor: 'pointer' }} className={scaduto ? 'row-scaduto' : ''}>
                    <td>
                      <strong>{t.titolo}</strong>
                      {t.edifici?.nome && <div style={{ fontSize: 11, color: 'var(--fog)' }}>{t.edifici.nome}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {t.assegnatari.length === 0 ? '—' : t.assegnatari.map(a => a.nome_completo).join(', ')}
                    </td>
                    <td><span className="badge" style={PRIORITA_COLORI[t.priorita]}>{PRIORITA_LABEL[t.priorita]}</span></td>
                    <td>
                      {scaduto
                        ? <span className="badge badge-scaduto">Scaduto</span>
                        : <span className="badge" style={STATO_COLORI[t.stato]}>{STATO_LABEL[t.stato]}</span>}
                    </td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {t.data_scadenza ? new Date(t.data_scadenza).toLocaleDateString('it-IT') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNuovo && (
        <TaskModal profili={profili} onClose={() => setShowNuovo(false)} onSave={creaTask} />
      )}
    </div>
  )
}
