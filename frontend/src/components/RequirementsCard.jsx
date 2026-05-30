/**
 * RequirementsCard — dashboard card showing retrieved KB documents.
 * Dark Forest styling with categorized chips based on the mock design.
 */
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Download, FileText, Briefcase, CreditCard, ShieldCheck, Home, AlertCircle, FileCheck2, Clock, RefreshCw, GraduationCap, ChevronsRight, ExternalLink } from 'lucide-react'

export const CATEGORIES = [
  {
    id: 'arrange_first',
    title: 'Primary Essentials',
    subtitle: 'High priority items & foundation',
    color: '#4ade80', 
    border: 'rgba(74, 222, 128, 0.3)',
    bgActive: 'rgba(74, 222, 128, 0.1)',
    match: (t) => t.includes('proof') || t.includes('basic') || t.includes('checklist') || t.includes('identity') || t.includes('identit') || t.includes('first') || t.includes('verification') || t.includes('self') || t.includes('contact') || t.includes('right') || t.includes('id ') || t.includes('aadhaar') || t.includes('passport')
  },
  {
    id: 'third_party',
    title: 'From Third Parties',
    subtitle: 'Authorities, past employers, etc.',
    color: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.3)',
    bgActive: 'rgba(56, 189, 248, 0.1)',
    match: (t) => t.includes('employer') || t.includes('contract') || t.includes('handbook') || t.includes('policy') || t.includes('offer') || t.includes('certificate') || t.includes('letter') || t.includes('agreement') || t.includes('noc') || t.includes('landlord') || t.includes('lease') || t.includes('bank') || t.includes('authorit') || t.includes('official') || t.includes('license') || t.includes('registry') || t.includes('municip') || t.includes('registrar') || t.includes('government') || t.includes('gst') || t.includes('pan') || t.includes('tax') || t.includes('registration')
  },
  {
    id: 'submission_needs',
    title: 'Action & Submission Needs',
    subtitle: 'Finalizing requirements',
    color: '#fbbf24', 
    border: 'rgba(251, 191, 36, 0.35)',
    bgActive: 'rgba(251, 191, 36, 0.1)',
    match: (t) => t.includes('need') || t.includes('photo') || t.includes('degree') || t.includes('application') || t.includes('form') || t.includes('filing') || t.includes('online') || t.includes('portal') || t.includes('submission') || t.includes('action') || t.includes('task')
  },
  {
    id: 'mistakes',
    title: 'Common Mistakes',
    subtitle: 'Revision needed',
    color: '#f87171', 
    border: 'rgba(248, 113, 113, 0.35)',
    bgActive: 'rgba(248, 113, 113, 0.1)',
    match: (t) => t.includes('mistake') || t.includes('missed') || t.includes('error') || t.includes('invalid') || t.includes('incorrect') || t.includes('revision') || t.includes('fail') || t.includes('background')
  }
];

const getDocIcon = (title = "") => {
  const t = title.toLowerCase()
  if (t.includes('offer') || t.includes('employment') || t.includes('job') || t.includes('employer')) return Briefcase
  if (t.includes('pan') || t.includes('card') || t.includes('license') || t.includes('bank') || t.includes('tax') || t.includes('pension') || t.includes('details')) return CreditCard
  if (t.includes('aadhaar') || t.includes('id') || t.includes('passport') || t.includes('proof') || t.includes('security') || t.includes('background') || t.includes('verification')) return ShieldCheck
  if (t.includes('contact') || t.includes('photo') || t.includes('profile')) return FileText
  if (t.includes('warning') || t.includes('alert') || t.includes('mistake') || t.includes('error') || t.includes('missed')) return AlertCircle
  if (t.includes('right to work') || t.includes('time') || t.includes('clock')) return Clock
  if (t.includes('refresh') || t.includes('revision')) return RefreshCw
  if (t.includes('degree') || t.includes('school') || t.includes('university') || t.includes('education') || t.includes('certificate')) return GraduationCap
  if (t.includes('handbook') || t.includes('policy')) return FileText
  if (t.includes('address') || t.includes('utility') || t.includes('rent')) return Home
  return FileCheck2
}

export const categorizeChunks = (chunks) => {
  const groups = {
    arrange_first: [],
    third_party: [],
    submission_needs: [],
    mistakes: []
  };

  chunks.forEach(chunk => {
    const t = (chunk.title || '').toLowerCase();
    if (CATEGORIES[3].match(t)) groups.mistakes.push(chunk);
    else if (CATEGORIES[1].match(t)) groups.third_party.push(chunk);
    else if (CATEGORIES[2].match(t)) groups.submission_needs.push(chunk);
    else groups.arrange_first.push(chunk); // default if no match
  });

  return groups;
}

export const parseExplanationToCategories = (explanationStr) => {
  const groups = {
    arrange_first: [],
    third_party: [],
    submission_needs: [],
    mistakes: []
  };

  if (!explanationStr) return null;

  const lines = explanationStr.split('\n');
  let currentCategory = null;
  let parsedAny = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    
    // Check for list items FIRST, so their words don't accidentally match category headings
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (currentCategory) {
        let rawText = trimmed.replace(/^[-*]\s+/, '').trim();
        let title = rawText; 
        let content = '';
        
        // Smarter Parsing: Look for bold tags or colons
        // e.g. "**Document Name**: Explanation" or "**Document Name** - Explanation"
        const boldMatch = rawText.match(/\*\*(.+?)\*\*/);
        if (boldMatch) {
            title = boldMatch[1].trim();
            // remove the bolded part and any leading colons/dashes
            content = rawText.replace(boldMatch[0], '').replace(/^[\s:\-—]+/, '').trim();
        } else if (rawText.includes(':')) {
            const parts = rawText.split(':');
            title = parts[0].trim();
            content = parts.slice(1).join(':').trim();
        } else {
            // No bolding or colons. We use the first few words as a short title
            const words = rawText.split(' ');
            if (words.length > 6) {
                title = words.slice(0, 4).join(' ') + '...';
                content = rawText;
            } else {
                title = rawText;
            }
        }
        
        // Clean up title
        title = title.replace(/\*\*/g, '').replace(/__/g, '').trim();
        
        // Ensure content has a reliable fallback
        if (!content || content.length < 5) {
            content = 'This requirement was automatically extracted from your AI guide. Be sure to check formatting and validity.';
        }

        if (title && title.length > 2) {
          groups[currentCategory].push({
            id: `llm-${currentCategory}-${title.toLowerCase().replace(/\s+/g, '-')}`,
            title: title,
            content: content
          });
          parsedAny = true;
        }
      }
      continue;
    }

    // Check for headings by looking for keywords
    // Anchoring \b (word boundary) or # to safely match standard headers
    if (lower.match(/(primary|essential|basic|identit|fundamental|background|intro|first|^#*\s*1\.)/)) {
      currentCategory = 'arrange_first';
    } else if (lower.match(/(authorit|third\s*-?\s*part|external|partner|bank|employer|outside|government|official|govt|registry|registrar|^#*\s*2\.)/)) {
      currentCategory = 'third_party';
    } else if (lower.match(/(action|submission|application|finaliz|filing|needs|task|register|^#*\s*3\.)/)) {
      currentCategory = 'submission_needs';
    } else if (lower.match(/(mistake|extra|check|revision|verification|common|missed|tip|^#*\s*4\.)/)) {
      currentCategory = 'mistakes';
    }
  }

  // Ensure all keys exist
  ['arrange_first', 'third_party', 'submission_needs', 'mistakes'].forEach(k => {
    if (!groups[k]) groups[k] = [];
  });

  return parsedAny ? groups : null;
}

function CategoryRow({ category, items, isLast, collectedIds, onToggleDoc, index }) {
  const [activeId, setActiveId] = useState(null)
  const hasItems = items && items.length > 0;

  const rowVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 } 
    }
  }

  return (
    <motion.div 
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      style={{ 
        padding: '24px 0', 
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '48px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '180px', flexShrink: 0, paddingTop: '4px' }}>
          <h3 className="font-playfair" style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: '0 0 4px 0', letterSpacing: '0.01em' }}>{category.title}</h3>
          <p style={{ fontSize: '12px', color: category.color, margin: 0, opacity: 0.9, fontWeight: 500 }}>{category.subtitle}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
          {!hasItems ? (
             <div style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', padding: '8px 4px' }}>
                No documents currently assigned.
             </div>
          ) : (
            items.map((item, idx) => {
               const isCollected = collectedIds?.has(item.id || item.title);
               const Icon = getDocIcon(item.title);
               const isActive = activeId === idx;
               const itemKey = `req-${category.id}-${idx}-${(item.title || 'doc').substring(0, 10)}`;
               const accentColor = isCollected ? 'var(--sage)' : category.color;
               const bgColor = isCollected ? 'rgba(92, 140, 117, 0.08)' : isActive ? category.bgActive : 'rgba(255,255,255,0.02)';
               const borderColor = isCollected ? 'rgba(92, 140, 117, 0.25)' : isActive ? category.color : 'rgba(255,255,255,0.08)';
               
               return (
                 <motion.div 
                   key={itemKey}
                   whileHover={{ scale: 1.02, backgroundColor: isCollected ? 'rgba(92, 140, 117, 0.12)' : 'rgba(255,255,255,0.05)' }}
                   whileTap={{ scale: 0.98 }}
                   style={{ 
                     display: 'flex', alignItems: 'center', 
                     background: bgColor, border: `1px solid ${borderColor}`,
                     borderRadius: 'var(--r-pill)',
                     transition: 'all var(--dur-fast) var(--ease-main)',
                   }}
                 >
                   {/* Checklist Toggle Button */}
                   <button
                     onClick={() => onToggleDoc?.(item.id || item.title)}
                     aria-label={isCollected ? `Mark ${item.title} as incomplete` : `Mark ${item.title} as collected`}
                     style={{
                       padding: '8px 4px 8px 12px', background: 'none', border: 'none', 
                       cursor: 'pointer', display: 'flex', alignItems: 'center', outline: 'none'
                     }}
                   >
                     {isCollected ? (
                       <CheckCircle2 size={16} color="var(--sage)" strokeWidth={3} />
                     ) : (
                       <Circle size={16} color={accentColor} strokeWidth={2} style={{ opacity: 0.4 }} />
                     )}
                   </button>

                   {/* Expand Info Button */}
                   <button 
                     onClick={() => setActiveId(isActive ? null : idx)}
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '10px', 
                       padding: '8px 16px 8px 6px', background: 'none', border: 'none',
                       color: accentColor, cursor: 'pointer', textAlign: 'left',
                       outline: 'none', fontFamily: "'DM Sans', sans-serif"
                     }}
                   >
                     <Icon size={14} color={accentColor} strokeWidth={2} style={{ opacity: isCollected ? 0.6 : 1 }} />
                     <span style={{ fontSize: '13px', fontWeight: 600, color: isCollected ? 'rgba(255,255,255,0.5)' : 'white' }}>
                       {item.title}
                     </span>
                     <motion.div animate={{ rotate: isActive ? 90 : 0 }} transition={{ ease: [0.16, 1, 0.3, 1] }}>
                       <ChevronsRight size={12} style={{ opacity: 0.3 }} />
                     </motion.div>
                   </button>
                 </motion.div>
               )
            })
          )}
        </div>
      </div>
      
      {/* Expanded content area */}
      <AnimatePresence>
        {activeId !== null && items && items[activeId] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ 
              marginTop: '16px', padding: '20px 24px', 
              background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r-md)', 
              borderLeft: `3px solid ${category.color}`,
              color: 'var(--fog)',
              fontSize: '14px',
              lineHeight: 1.6
            }}>
              <strong style={{ color: 'white', display: 'block', marginBottom: '8px', fontSize: '15px' }}>{items[activeId].title}</strong>
              <div dangerouslySetInnerHTML={{ __html: (items[activeId].content || '').replace(/\*\*(.*?)\*\*/g, '<strong style="color: white; font-weight: 700;">$1</strong>') }} />
              
              {/* Actionable Links for Documents - Hide for Mistakes/Tips */}
              {category.id !== 'mistakes' && (
                <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button 
                    onClick={() => window.open(items[activeId].portal_url || `https://www.google.com/search?q=official+portal+for+${encodeURIComponent(items[activeId].title)}`, '_blank')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  >
                    <ExternalLink size={14} /> Official Portal
                  </button>
                  <button 
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(items[activeId].title)}+form+pdf+download`, '_blank')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: 8, color: 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Download size={14} /> Forms
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function RequirementsCard({ data, collectedIds, onToggleDoc, onGroupedDocs }) {

  // Backend returns `retrieved_chunks`; keep backwards compat with `results`
  const rawChunks = data?.retrieved_chunks ?? data?.results ?? []
  // Deduplicate chunks by ID
  const chunks = Array.from(new Map(rawChunks.map(c => [c.id, c])).values())
  const explanation = data?.explanation
  const explanationRaw = typeof explanation === 'string' ? explanation : explanation?.explanation;

  const groupedChunks = useMemo(() => {
    let groups = categorizeChunks(chunks)
    if (explanationRaw) {
        const parsedGroups = parseExplanationToCategories(explanationRaw);
        if (parsedGroups) {
            // Deduplicate during merge based on title (case-insensitive)
            Object.keys(groups).forEach(k => {
              const titles = new Set(groups[k].map(it => (it.title || '').toLowerCase()));
              const filteredMatches = (parsedGroups[k] || []).filter(it => !titles.has((it.title || '').toLowerCase()));
              groups[k] = [...groups[k], ...filteredMatches];
            });
        }
    }
    return groups;
  }, [chunks, explanationRaw]);

  // Use demo data ONLY if we have absolutely no data (no chunks AND no explanation)
  const isDemo = chunks.length === 0 && !explanationRaw;
  const demoData = isDemo ? {
    arrange_first: [
      {title: 'Primary Identification', content: 'Provide a valid government-issued ID or passport.'},
      {title: 'Foundational Proofs', content: 'Evidence required for the initial stage of your event.'},
      {title: 'Key Contacts', content: 'Designated emergency or primary stakeholders.'},
      {title: 'Legal Eligibility', content: 'Documentation verifying your right to proceed with this task.'}
    ],
    third_party: [
      {title: 'External Verifications', content: 'Documents sourced from outside authorities or organizations.'},
      {title: 'Regulatory Guidelines', content: 'Official policies or handbooks governing your situation.'},
      {title: 'Third Party Contracts', content: 'Agreements or letters from external entities.'}
    ],
    submission_needs: [
      {title: 'Official Certificates', content: 'Proof of specific qualifications or status.'},
      {title: 'Application Assets', content: 'Necessary photos, forms, or metadata for submission.'},
      {title: 'Declaration Forms', content: 'Signed statements or tax-related declarations.'}
    ],
    mistakes: [
      {title: 'Validation Errors', content: 'Common mismatch points to double-check in your logs.'},
      {title: 'Record Syncing', content: 'Ensure your vault documents align with the new plan details.'}
    ]
  } : groupedChunks;

  // Notify parent of grouped structure for DocumentStatusDashboard mini-stats
  useEffect(() => {
    if (onGroupedDocs) onGroupedDocs(demoData);
  }, [demoData, onGroupedDocs]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ 
        position: 'relative', 
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(32px)',
        border: '1.5px solid rgba(255,255,255,0.06)',
        borderTop: 'none',
        borderRadius: '0 0 var(--r-lg) var(--r-lg)',
        padding: '32px 40px',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <CategoryRow key="c1" index={0} category={CATEGORIES[0]} items={demoData.arrange_first} collectedIds={collectedIds} onToggleDoc={onToggleDoc} />
        <CategoryRow key="c2" index={1} category={CATEGORIES[1]} items={demoData.third_party} collectedIds={collectedIds} onToggleDoc={onToggleDoc} />
        <CategoryRow key="c3" index={2} category={CATEGORIES[2]} items={demoData.submission_needs} collectedIds={collectedIds} onToggleDoc={onToggleDoc} />
        <CategoryRow key="c4" index={3} category={CATEGORIES[3]} items={demoData.mistakes} isLast={true} collectedIds={collectedIds} onToggleDoc={onToggleDoc} />
      </div>
    </motion.div>
  )
}
