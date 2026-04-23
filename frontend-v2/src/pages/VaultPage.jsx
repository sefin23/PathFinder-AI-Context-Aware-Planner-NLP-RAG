import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Filter, Search, Plus, X, Maximize2, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react'
import DocumentCard from '../components/DocumentCard'
import { getVaultDocs, uploadToVault, deleteVaultDoc, renameVaultDoc } from '../api/vault'
import { getLifeEvents, retrieveRequirements } from '../api/backend'

export default function VaultPage() {
  const [docs, setDocs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [readiness, setReadiness] = useState({ percent: 0, total: 0, linked: 0 })

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true)
      const [vDocs, plans] = await Promise.all([
        getVaultDocs(),
        getLifeEvents()
      ])
      
      setDocs(vDocs)

      // Calculate Readiness dynamically
      if (plans.length > 0) {
        // Fetch requirements for each plan to calculate the goal
        const reqPromises = plans.map(p => {
          let eventType = null
          try {
            const meta = typeof p.metadata_json === 'string' ? JSON.parse(p.metadata_json) : p.metadata_json
            if (meta?.event_types?.length) eventType = meta.event_types[0]
          } catch { /* ignore */ }
          return retrieveRequirements(p.description || p.title, eventType, 8)
        })
        const allReqResults = await Promise.all(reqPromises)
        
        const uniqueReqs = new Set()
        allReqResults.forEach(res => {
          const chunks = res.retrieved_chunks || res.results || []
          chunks.forEach(c => {
            if (c.title) uniqueReqs.add(c.title.toLowerCase().trim())
          })
        })

        const totalNeeded = Math.max(uniqueReqs.size, 5)
        const linkedCount = vDocs.filter(d => d.plans_count > 0).length
        const percent = Math.min(Math.round((linkedCount / totalNeeded) * 100), 100)
        const totalSize = vDocs.reduce((acc, d) => acc + (d.size_bytes || 0), 0)
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1)
        const activeLinks = vDocs.reduce((acc, d) => acc + (d.plans_count || 0), 0)
        
        setReadiness({ percent, total: totalNeeded, linked: linkedCount, totalSizeMB, activeLinks })
      } else {
        const totalSize = vDocs.reduce((acc, d) => acc + (d.size_bytes || 0), 0)
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1)
        const activeLinks = vDocs.reduce((acc, d) => acc + (d.plans_count || 0), 0)
        setReadiness({ percent: 0, total: 3, linked: 0, totalSizeMB, activeLinks })
      }

    } catch (err) {
      console.error('Vault/Readiness fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    try {
      await uploadToVault(file)
      await fetchDocs()
      // Notify other components (like SmartAlerts) that data has changed
      window.dispatchEvent(new CustomEvent('vault_updated'))
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (docId) => {
    if (!confirm('Are you sure you want to remove this document from your vault?')) return
    try {
      await deleteVaultDoc(docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleRename = async (docId, newName) => {
    try {
      await renameVaultDoc(docId, newName)
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, name: newName } : d))
    } catch (err) {
      console.error('Rename failed:', err)
    }
  }

  // Normalize documents and apply business logic (e.g. Birth Certificate belongs in Identity)
  const normalizedDocs = docs.map(d => {
    const name = d.name?.toLowerCase() || ''
    const isBirth = name.includes('birth')
    const isPlusTwo = name.includes('plus two') || name.includes('+2') || name.includes('marklist')
    
    if (isPlusTwo) return { ...d, doc_type: 'education_employment' }
    if (isBirth) return { ...d, doc_type: 'identity' }
    return d
  })

  const filteredDocs = filter === 'all' 
    ? normalizedDocs 
    : normalizedDocs.filter(d => {
        const type = d.doc_type?.toLowerCase() || '';
        if (filter === 'education' && (type === 'education' || type === 'education_employment')) return true;
        if (filter === 'employment' && (type === 'employment' || type === 'education_employment')) return true;
        return type === filter;
    })

  const categories = [
    { id: 'all', label: 'All Library', count: normalizedDocs.length },
    { id: 'identity', label: 'Identity', count: normalizedDocs.filter(d => d.doc_type === 'identity').length },
    { id: 'employment', label: 'Employment', count: normalizedDocs.filter(d => (d.doc_type === 'employment' || d.doc_type === 'education_employment')).length },
    { id: 'education', label: 'Education', count: normalizedDocs.filter(d => (d.doc_type === 'education' || d.doc_type === 'education_employment')).length },
    { id: 'financial', label: 'Financial', count: normalizedDocs.filter(d => d.doc_type === 'financial').length },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Area */}
      <header style={{ marginBottom: 32, padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sage)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Secure Archive
            </span>
            <div style={{ width: 30, height: 1, background: 'var(--sage)', opacity: 0.3 }} />
        </div>
        <h1 className="font-playfair" style={{ fontSize: 36, color: 'white', fontWeight: 900, marginBottom: 8 }}>
            Document <em>Vault</em>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fog)', maxWidth: 700, lineHeight: 1.6, fontWeight: 300 }}>
            Your personal document storage. Files you upload here are automatically used to fulfill requirements across all your current and future plans.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        
        {/* Main Content: Library Grid */}
        <div style={{ padding: '0 12px' }}>
            {/* Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setFilter(cat.id)}
                        style={{
                            padding: '6px 16px', borderRadius: 999, border: '1px solid',
                            fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: filter === cat.id ? 'rgba(92, 140, 117, 0.15)' : 'transparent',
                            borderColor: filter === cat.id ? 'rgba(92, 140, 117, 0.4)' : 'rgba(255,255,255,0.06)',
                            color: filter === cat.id ? 'var(--sage)' : 'rgba(255,255,255,0.4)',
                        }}
                    >
                        {cat.label} ({cat.count})
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                    <p className="font-mono" style={{ fontSize: 12 }}>PREPARING YOUR SECURE ARCHIVE...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div style={{ 
                    height: 400, border: '2px dashed rgba(255,255,255,0.05)', borderRadius: 24,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 16 }}>📚</div>
                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>No documents found in this category.</p>
                    <p style={{ color: 'var(--sage)', fontSize: 11, marginTop: 8, cursor: 'pointer', opacity: 0.7 }} onClick={() => setFilter('all')}>
                        Click here to view All Library documents →
                    </p>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, 240px)', 
                    gap: 24,
                    alignItems: 'start' 
                }}>
                    <AnimatePresence mode="popLayout">
                        {filteredDocs.map((doc, idx) => (
                            <DocumentCard 
                                key={doc.id} 
                                doc={doc} 
                                index={idx}
                                onRemove={handleRemove}
                                onRename={(newName) => handleRename(doc.id, newName)}
                                onPreview={setPreviewDoc}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>


        {/* Sidebar: Actions & Stats */}
        <aside>
            <div style={{ 
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 20, padding: 24, position: 'sticky', top: 100
            }}>
                <h3 className="font-playfair" style={{ fontSize: 20, color: 'white', marginBottom: 20 }}>Actions</h3>
                
                {/* Upload Zone */}
                <label style={{ cursor: uploading ? 'default' : 'pointer', width: '100%' }}>
                    <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                    <div style={{
                        padding: '24px 16px', borderRadius: 12, border: '2px dashed var(--sage)',
                        background: 'rgba(92, 140, 117, 0.05)', textAlign: 'center',
                        transition: 'all 0.2s'
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{uploading ? '⏳' : '📁'}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
                            {uploading ? 'UPLOADING...' : 'Add Document'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            PDF, JPEG, or PNG
                        </div>
                    </div>
                </label>

                <div style={{ marginTop: 32 }}>
                    <h3 className="font-playfair" style={{ fontSize: 18, color: 'white', marginBottom: 16 }}>Vault Analytics</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ 
                            padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                               <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vault Readiness</span>
                               <span style={{ fontSize: 16, fontWeight: 900, color: readiness.percent > 70 ? 'var(--sage)' : 'var(--amber)' }}>{readiness.percent}%</span>
                           </div>
                           <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${readiness.percent}%` }}
                                 style={{ height: '100%', background: readiness.percent > 70 ? 'var(--sage)' : 'var(--amber)' }} 
                               />
                           </div>
                           <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
                               {readiness.linked} of {readiness.total} required documents secured.
                           </p>
                        </div>

                        {[
                            { label: 'Storage Used', value: `${readiness.totalSizeMB || '0.0'} MB` },
                            { label: 'Active Plan Links', value: `${readiness.activeLinks || 0} links` }
                        ].map((stat, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '0 4px' }}>
                                <span style={{ color: 'var(--muted)' }}>{stat.label}</span>
                                <span style={{ color: 'white', fontWeight: 600 }}>{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </aside>

      </div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 40
            }}
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 1000, height: '100%', maxHeight: 800,
                background: '#1a1a1a', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8)'
              }}
            >
              {/* Modal Header */}
              <div style={{ 
                padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <div>
                  <h3 className="font-playfair" style={{ fontSize: 24, color: 'white', margin: 0 }}>{previewDoc.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {previewDoc.doc_type} · {(previewDoc.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => window.open(previewDoc.storage_url, '_blank')}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
                      width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', cursor: 'pointer'
                    }}
                  >
                    <ExternalLink size={20} />
                  </button>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    style={{
                      background: 'rgba(198,93,74,0.1)', border: 'none', borderRadius: 8,
                      width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--coral)', cursor: 'pointer'
                    }}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Viewport */}
              <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden' }}>
                {previewDoc.name?.toLowerCase().match(/\.(jpg|jpeg|png|webp|avif)$/) ? (
                  <img
                    src={previewDoc.storage_url}
                    alt={previewDoc.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : previewDoc.name?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={`${previewDoc.storage_url}#toolbar=1`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title={previewDoc.name}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                     <FileText size={80} color="var(--muted)" strokeWidth={1} />
                     <p style={{ color: 'var(--muted)', fontSize: 14 }}>Preview not available for this file type.</p>
                     <button
                        onClick={() => window.open(previewDoc.storage_url, '_blank')}
                        style={{ padding: '12px 24px', background: 'var(--sage)', color: 'white', border: 'none', borderRadius: 99, fontWeight: 700, cursor: 'pointer' }}
                     >
                        Download Original
                     </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
