/**
 * RequirementsCard — dashboard card showing retrieved KB documents.
 * Dark Forest styling with glassmorphism and document chips.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function ChunkItem({ chunk, index }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 16px', borderRadius: 'var(--r-md)',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'all 0.3s'
      }}
      onClick={() => setExpanded(!expanded)}
      whileHover={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
      layout
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(123,111,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
           <CheckCircle2 size={12} color="var(--lavender)" />
        </div>
        <motion.div animate={{ rotate: expanded ? 0 : 0 }}>
          {expanded ? <ChevronDown size={14} color="var(--muted)" /> : <ChevronRight size={14} color="var(--muted)" />}
        </motion.div>
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
           <span className="font-mono" style={{
             fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
             background: 'rgba(212,124,63,0.15)', color: 'var(--amber)', letterSpacing: '0.05em'
           }}>
             REF {String(index + 1).padStart(2, '0')}
           </span>
           <p className="font-playfair" style={{ fontSize: 15, fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.2 }}>
             {chunk.title}
           </p>
        </div>
        <AnimatePresence initial={false}>
          {expanded ? (
              <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <p style={{ fontSize: 13, color: 'var(--fog)', margin: '8px 0 0', lineHeight: 1.6 }}>
                {chunk.content}
              </p>
            </motion.div>
          ) : (
            chunk.content && (
              <p style={{ 
                fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
              }}>
                {chunk.content}
              </p>
            )
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function RequirementsCard({ data }) {
  if (!data) return null

  // Backend returns `retrieved_chunks`; keep backwards compat with `results`
  const chunks      = data?.retrieved_chunks ?? data?.results ?? []
  const explanation = data?.explanation

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-md)',
        padding: '24px 28px',
        overflow: 'hidden'
      }}
    >
      <div style={{
         position: 'absolute', top: -50, right: -50, width: 200, height: 200,
         background: 'radial-gradient(circle, rgba(212,124,63,0.1) 0%, transparent 70%)',
         pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(212,124,63,0.15)' }}>
          <FileText size={18} color="var(--amber)" />
        </div>
        <div>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2, fontWeight: 700 }}>
            Knowledge Core
          </p>
          <h3 className="font-playfair" style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>
            Required Documentation
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0 0' }}>{chunks.length} reference{chunks.length !== 1 ? 's' : ''} cited</p>
        </div>
      </div>

      {chunks.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>No knowledge base documents aligned with this query.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {chunks.map((chunk, i) => (
            <ChunkItem key={chunk.id ?? i} chunk={chunk} index={i} />
          ))}
        </div>
      )}

      {/* RAG explanation */}
      {explanation && (
        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--fog)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p style={{ margin: '0 0 12px 0' }} {...props} />,
              h3: ({node, ...props}) => <h3 className="font-playfair" style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '22px 0 12px 0', borderLeft: '3px solid var(--amber)', paddingLeft: 12 }} {...props} />,
              h4: ({node, ...props}) => <h4 style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: '16px 0 8px 0' }} {...props} />,
              ul: ({node, ...props}) => <ul style={{ margin: '0 0 16px 0', paddingLeft: 24, listStyleType: 'disc', color: 'var(--fog)' }} {...props} />,
              ol: ({node, ...props}) => <ol style={{ margin: '0 0 16px 0', paddingLeft: 24, listStyleType: 'decimal', color: 'var(--fog)' }} {...props} />,
              li: ({node, ...props}) => <li style={{ marginBottom: 8, paddingLeft: 4 }} {...props} />,
              strong: ({node, ...props}) => <strong style={{ color: 'white', fontWeight: 600 }} {...props} />,
            }}
          >
            {typeof explanation === 'string' ? explanation : explanation?.explanation}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
