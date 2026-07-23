import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../App'
import Icon from '../components/Icon'
import { NAV_ICONS } from '../components/icons-map'

const PRIORITA_LABEL = { bassa: 'Bassa', media: 'Media', alta: 'Alta', urgente: 'Urgente' }
const PRIORITA_COLORI = {
  bassa: { background: '#f3f4f6', color: '#6b7280' },
  media: { background: '#e8f2f7', color: '#015578' },
  alta: { background: '#fef3c7', color: '#d97706' },
  urgente: { background: '#fee2e2', color: '#dc2626' },
}

export default function Dashboard() {
  const { navigate } = useApp()
  const [stats, setStats] = useState({ totale: 0, in_attesa: 0, in_corso: 0, bloccato: 0, completato: 0, scaduti: 0, in_scadenza: 0 })
  const [recenti, setRecenti] = useState([])
  const [taskRecenti, setTaskRecenti] = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data }, { data: task }] = await Promise.all([
      supabase.from('incarichi').select('*, edifici(nome), fornitori(ragione_sociale)').order('created_at', { ascending: false }),
      supabase.from('attivita_interne').select('*, edifici(nome)').order('created_at', { ascending: false }).limit(5),
    ])
    setTaskRecenti(task || [])

    if (!data) return
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const tra7 = new Date(oggi); tra7.setDate(oggi.getDate() + 7)
    setStats({
      totale: data.length,
      in_attesa: data.filter(i => i.stato === 'in_attesa').length,
      in_corso: data.filter(i => i.stato === 'in_corso').length,
      bloccato: data.filter(i => i.stato === 'bloccato').length,
      completato: data.filter(i => i.stato === 'completato').length,
      scaduti: data.filter(i => i.data_scadenza && new Date(i.data_scadenza) < oggi && i.stato !== 'completato').length,
      in_scadenza: data.filter(i => i.data_scadenza && new Date(i.data_scadenza) >= oggi && new Date(i.data_scadenza) <= tra7 && i.stato !== 'completato').length,
    })
    setRecenti(data.slice(0, 5))
  }

  const STATO_LABEL = { in_attesa: 'In attesa', in_corso: 'In corso', completato: 'Completato', bloccato: 'Bloccato' }

  function isScaduto(i) {
    if (!i.data_scadenza || i.stato === 'completato') return false
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    return new Date(i.data_scadenza) < oggi
  }

  function isTaskScaduto(t) {
    if (!t.data_scadenza || t.stato === 'completato') return false
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    return new Date(t.data_scadenza) < oggi
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Riepilogo stato incarichi</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => { sessionStorage.setItem('nodosuite:openNewTask', '1'); navigate('task') }}>
            <Icon icon={NAV_ICONS.task} size="sm" /> + Nuovo task
          </button>
          <button className="btn btn-primary" onClick={() => { sessionStorage.setItem('nodosuite:openNewIncarico', '1'); navigate('incarichi') }}>
            + Nuovo incarico
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-value">{stats.totale}</div>
          <div className="stat-card-label">Totale incarichi</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#1e40af' }}>{stats.in_corso}</div>
          <div className="stat-card-label">In corso</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#92400e' }}>{stats.in_attesa}</div>
          <div className="stat-card-label">In attesa</div>
        </div>
        <div className="stat-card scaduto">
          <div className="stat-card-value">{stats.scaduti}</div>
          <div className="stat-card-label">Scaduti</div>
        </div>
        <div className="stat-card in-scadenza">
          <div className="stat-card-value">{stats.in_scadenza}</div>
          <div className="stat-card-label">In scadenza (7gg)</div>
        </div>
        <div className="stat-card urgente">
          <div className="stat-card-value">{stats.bloccato}</div>
          <div className="stat-card-label">Bloccati</div>
        </div>
        <div className="stat-card completati">
          <div className="stat-card-value">{stats.completato}</div>
          <div className="stat-card-label">Completati</div>
        </div>
      </div>

      <div className="dashboard-split">
        <div className="table-wrap">
          <div className="table-header">
            <div className="table-title">Ultimi incarichi aperti</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('incarichi')}>Vedi tutti →</button>
          </div>
          {recenti.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon icon={NAV_ICONS.incarichi} size={36} /></div>
              <div className="empty-text">Nessun incarico ancora. Creane uno!</div>
            </div>
          ) : (
            <table className="table-incarichi-dash">
              <thead>
                <tr>
                  <th>Condominio</th>
                  <th>Descrizione</th>
                  <th>Fornitore</th>
                  <th>Stato</th>
                  <th>Scadenza</th>
                </tr>
              </thead>
              <tbody>
                {recenti.map(i => (
                  <tr key={i.id} className={isScaduto(i) ? 'row-scaduto' : ''} onClick={() => navigate('dettaglio', i.id)}>
                    <td>{i.edifici?.nome || '—'}</td>
                    <td>{i.descrizione.length > 50 ? i.descrizione.slice(0, 50) + '...' : i.descrizione}</td>
                    <td>{i.fornitori?.ragione_sociale || <span style={{ color: 'var(--fog)' }}>Da assegnare</span>}</td>
                    <td>
                      {isScaduto(i)
                        ? <span className="badge badge-scaduto">Scaduto</span>
                        : <span className={`badge badge-${i.stato}`}>{STATO_LABEL[i.stato]}</span>}
                    </td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {i.data_scadenza ? new Date(i.data_scadenza).toLocaleDateString('it-IT') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-wrap">
          <div className="table-header">
            <div className="table-title">Ultimi task</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('task')}>Vedi tutti →</button>
          </div>
          {taskRecenti.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon icon={NAV_ICONS.task} size={30} /></div>
              <div className="empty-text">Nessun task ancora.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {taskRecenti.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate('task-dettaglio', t.id)}
                  className={isTaskScaduto(t) ? 'row-scaduto' : ''}
                  style={{ padding: '10px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{t.titolo}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span className="badge" style={PRIORITA_COLORI[t.priorita]}>{PRIORITA_LABEL[t.priorita]}</span>
                    <span style={{ fontSize: 11, color: 'var(--fog)', fontFamily: 'ui-monospace, monospace' }}>
                      {t.data_scadenza ? new Date(t.data_scadenza).toLocaleDateString('it-IT') : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
