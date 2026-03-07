import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { forwardRef } from 'react'

const RecommendationsPanel = forwardRef(({ recommendations = [] }, ref) => {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div ref={ref} style={{ marginTop: 24, scrollMarginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,124,63,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={16} color="var(--amber)" />
        </div>
        <h3 className="font-playfair" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--amber)' }}>
          Navigational Guidance
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recommendations.map((rec, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            style={{
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 'var(--r-md)',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <ArrowRight size={18} color="var(--lavender)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'white', fontWeight: 500, lineHeight: 1.5 }}>
                {rec.message}
              </p>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Rationale:
                </span>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {rec.reason.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
})

export default RecommendationsPanel
