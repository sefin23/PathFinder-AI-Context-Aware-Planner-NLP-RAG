/**
 * EventSymbols.js — Centralized mapping for life event icons and colors.
 * Used across SavedPlans, JourneyDetail, JourneyPreview, and WorkflowCard.
 */

// Direct category → visuals map. AI outputs one of these fixed strings.
const CATEGORY_MAP = {
  planning:    { emoji: '📋', image: '/images/events/academic_planning_min.png',  color: 'var(--amber)',   colorName: 'amber',   label: 'Planning'    },
  finance:     { emoji: '💰', image: '/images/events/money_assets_min.png',        color: 'var(--emerald)', colorName: 'emerald', label: 'Finance'     },
  legal:       { emoji: '⚖️', image: '/images/events/legal_identity_min.png',      color: 'var(--sky)',     colorName: 'sky',     label: 'Legal'       },
  documents:   { emoji: '📄', image: '/images/events/legal_identity_min.png',      color: 'var(--sky)',     colorName: 'sky',     label: 'Documents'   },
  'Identity & Documents': { emoji: '📄', image: '/images/events/legal_identity_min.png', color: 'var(--sky)', colorName: 'sky', label: 'Identity' },
  'Legal & Law': { emoji: '⚖️', image: '/images/events/legal_identity_min.png', color: 'var(--sky)', colorName: 'sky', label: 'Legal' },
  career:      { emoji: '💼', image: '/images/events/work_and_career_min.png',     color: 'var(--amber)',   colorName: 'amber',   label: 'Career'      },
  startup:     { emoji: '💡', image: '/images/events/business_startup_min.png',    color: 'var(--amber)',   colorName: 'amber',   label: 'Startup'     },
  business:    { emoji: '🏙️', image: '/images/events/business_launch_v8_fix.png', color: 'var(--amber)',   colorName: 'amber',   label: 'Business'    },
  home:        { emoji: '🏠', image: '/images/events/home_purchase_min.png',       color: 'var(--emerald)', colorName: 'emerald', label: 'Home'        },
  education:   { emoji: '🎓', image: '/images/events/academic_planning_min.png',   color: 'var(--amber)',   colorName: 'amber',   label: 'Education'   },
  family:      { emoji: '👪', image: '/images/events/family_relations_min.png',    color: 'var(--sage)',    colorName: 'sage',    label: 'Family'      },
  health:      { emoji: '🏥', image: '/images/events/medical_emergency_min.png',   color: 'var(--coral)',   colorName: 'coral',   label: 'Health'      },
  travel:      { emoji: '✈️', image: '/images/events/relocation_min.png',          color: 'var(--amber)',   colorName: 'amber',   label: 'Travel'      },
  relocation:  { emoji: '🚚', image: '/images/events/relocation_min.png',          color: 'var(--amber)',   colorName: 'amber',   label: 'Relocation'  },
  marriage:    { emoji: '💍', image: '/images/events/marriage_planning_min.png',   color: 'var(--amber)',   colorName: 'amber',   label: 'Marriage'    },
  loss:        { emoji: '🕊️', image: '/images/events/loss_crisis_min.png',         color: 'var(--coral)',   colorName: 'coral',   label: 'Remembrance' },
  growth:      { emoji: '🌱', image: '/images/events/personal_growth_min.png',     color: 'var(--sage)',    colorName: 'sage',    label: 'Growth'      },
  vehicle:     { emoji: '🚗', image: '/images/events/vehicle_purchase_min.png',    color: 'var(--amber)',   colorName: 'amber',   label: 'Vehicle'     },
  retirement:  { emoji: '🌅', image: '/images/events/retirement_min.png',          color: 'var(--amber)',   colorName: 'amber',   label: 'Retirement'  },
  completion:  { emoji: '🏆', image: '/images/events/event_planning_min.png',      color: 'var(--amber)',   colorName: 'amber',   label: 'Completion'  },
  caution:     { emoji: '⚠️', image: '/images/events/academic_planning_min.png',   color: 'var(--coral)',   colorName: 'coral',   label: 'Caution'     },
}

export const getEventVisuals = (title = '', displayTitle = '', category = null) => {
  // Fast path: AI-supplied category takes priority over keyword matching
  if (category && CATEGORY_MAP[category]) return CATEGORY_MAP[category]

  const t = (title + ' ' + (displayTitle || '')).toUpperCase()
  
  // Defaults - Neutral "Phase" mapping
  let image = '/images/events/relocation_min.png'
  let color = 'var(--amber)'
  let emoji = '📍'
  let label = 'Phase'
  let colorName = 'amber'

  // Helper: check if any keyword in array appears in t
  const has = (...kws) => kws.some(k => t.includes(k))

  // 0. Lifecycle / Universal Phases — only when no specific event type is present
  const isSpecificEvent = has('RELOCAT', 'MOV', 'TRANSIT', 'JOB ', 'CAREER', 'ONBOARD', 'STARTUP', 'BUSINESS', 'RENT', 'HOUSE', 'HOME', 'EDUC', 'HEALTH', 'MEDICAL', 'MARRIAG', 'WEDDING', 'TRAVEL', 'VEHICLE', 'RETIRE', 'FINANC', 'MONEY', 'LEGAL', 'VISA', 'UTILIT')
  if (!isSpecificEvent && has('REQUIREMENT', 'UNDERSTAND', 'RESEARCH', 'PLANNING', 'ANALY', 'PREP', 'GATHER', 'ASSESS', 'AUDIT', 'SURVEY', 'OVERVIEW', 'ORIENTAT', 'DISCOVER', 'EVALUAT', 'REVIEW', 'CHECKLIST')) {
    image = '/images/events/academic_planning_min.png'; color = 'var(--amber)'; emoji = '📋'; label = 'Planning'; colorName = 'amber'
  }
  else if (has('FINAL', 'SUCCESS', 'ARRIVE', 'CONCLUSION', 'DESTINATION', 'ACHIEV', 'ACCOMPLISH', 'WRAP', 'CELEBRAT', 'COMPLET')) {
    image = '/images/events/event_planning_min.png'; color = 'var(--amber)'; emoji = '🏆'; label = 'Success'; colorName = 'amber'
  }
  else if (has('CLOSURE', 'RECLAM', 'RECEIV', 'HANDOVER', 'HANDOFF', 'SUBMIT', 'DELIVER')) {
    image = '/images/events/event_planning_min.png'; color = 'var(--amber)'; emoji = '🏁'; label = 'Finalization'; colorName = 'amber'
  }

  // 1. Relocation / Moving / Repatriation (Amber)
  else if (has('RELOCAT', 'MOV', 'TRANSIT', 'ARRIV', 'REPATRIAT', 'SETTL', 'MIGRAT')) {
    image = '/images/events/relocation_min.png'; color = 'var(--amber)'; emoji = '🚚'; label = 'Relocation'; colorName = 'amber'
  }
  // 2. Career / Job / Work / Onboarding / Employment (Amber)
  else if (has('JOB', 'CAREER', 'FREELANCE', 'ONBOARD', 'RESUME', 'INTERVIEW', 'UPSKILL', 'EMPLOY', 'PROFESSION', 'OCCUPATION', 'WORKFORCE', 'RECRUIT', 'HIRE', 'STAFFING', 'TALENT')) {
    if (t.includes('ONBOARD')) image = '/images/events/job_onboarding_min.png';
    else if (has('TRANSIT', 'PIVOT')) { image = '/images/events/career_transition_min.png'; emoji = '🧭'; }
    else if (has('LEARN', 'UPSKILL', 'SKILL')) image = '/images/events/education_learning_min.png';
    else image = '/images/events/work_and_career_min.png';
    color = 'var(--amber)'; emoji = emoji === '🧭' ? '🧭' : '💼'; label = 'Career'; colorName = 'amber'
  }
  // 3. Startup / Founder / Ideas (💡)
  else if (has('STARTUP', 'ENTREPRENEUR', 'VENTURE', 'SAAS', 'FOUNDING', 'FOUNDER', 'CO-FOUND', 'COFOUND', 'PITCH', 'MVP', 'ACCELERAT', 'INCUBAT', 'BOOTSTRAP', 'TRACTION', 'PRODUCT-MARKET', 'SCALAB', 'PIVOTING', 'IDEATION', 'VALIDATE')) {
    image = '/images/events/business_startup_min.png'; color = 'var(--amber)'; emoji = '💡'; label = 'Startup'; colorName = 'amber'
  }
  // 3b. Business / Company / Structure (🏙️)
  else if (has('BUSINESS', 'COMPANY', 'INCORPORAT', 'CORPORATE', 'LAUNCH', 'REGISTRAT', 'STRUCTUR', 'OPERATION', 'PARTNER', 'FRANCHIS', 'ENTERPRISE', 'COMMERC', 'TRADE', 'MARKET', 'BRAND', 'PRODUCT', 'CUSTOMER', 'CLIENT', 'SALES', 'GROWTH STRATEG', 'GO-TO-MARKET', 'GTM', 'TEAM', 'HIRING', 'HEADCOUNT')) {
    image = '/images/events/business_launch_v8_fix.png'; color = 'var(--amber)'; emoji = '🏙️'; label = 'Business'; colorName = 'amber'
  }
  // 3c. Utilities / Home Setup (Emerald)
  else if (has('UTILIT', 'SET UP UTIL', 'ELECTRICITY', 'BROADBAND', 'INTERNET SETUP')) {
    image = '/images/events/home_purchase_min.png'; color = 'var(--emerald)'; emoji = '🔌'; label = 'Setup'; colorName = 'emerald'
  }
  // 4. Home / House / Rental / Property (Emerald)
  else if (has('HOME', 'RENT', 'HOUSE', 'PROPERTY', 'REAL ESTATE', 'RESIDENT', 'RENOVA', 'MORTGAGE', 'HOUSING', 'APARTMENT', 'FLAT', 'ACCOMMODATION', 'LANDLORD', 'TENANT', 'LEASE')) {
    if (has('SEARCH', 'FIND', 'HOUSING')) {
      image = '/images/events/housing_and_location_min.png'; emoji = '🏘️';
    } else {
      image = '/images/events/home_purchase_min.png';
    }
    color = 'var(--emerald)'; emoji = emoji === '🏘️' ? '🏘️' : '🏠'; label = 'Home'; colorName = 'emerald'
  }
  // 5. Education / Study / Academic (Amber)
  else if (has('EDUC', 'STUDY', 'SCHOOL', 'GRADUATE', 'ACADEMIC', 'ENROLL', 'TEACH', 'DIPLOMA', 'DEGREE', 'COURS', 'CERTIF', 'TRAIN', 'TUTORI', 'LESSON', 'CLASSRO', 'CAMPUS', 'UNIVERSIT', 'COLLEGE')) {
    if (t.includes('ENROLL')) image = '/images/events/educational_enrollment_min.png';
    else if (has('LEARN', 'SKILL', 'TRAIN')) image = '/images/events/education_learning_min.png';
    else image = '/images/events/academic_planning_min.png';
    color = 'var(--amber)'; emoji = '🎓'; label = 'Education'; colorName = 'amber'
  }
  // 6. Divorce / Separation / New Path (Sky)
  else if (has('DIVORCE', 'SEPARATION', 'RECOVERY', 'SPLIT', 'CUSTODY', 'ALIMONY', 'BREAKUP')) {
    image = '/images/events/divorce_min.png'; color = 'var(--sky)'; emoji = '🛤️'; label = 'Divorce'; colorName = 'sky'
  }
  // 7. Grief / Loss / Bereavement (Coral)
  else if (has('GRIEF', 'REMEMBRANCE', 'LOSS', 'BEREAVEM', 'DEATH', 'FUNERAL', 'MOURN', 'CONDOLEN', 'ESTATE SETTL', 'PROBATE')) {
    image = '/images/events/loss_crisis_min.png'; color = 'var(--coral)'; emoji = '🕊️'; label = 'Remembrance'; colorName = 'coral'
  }
  // 8. Marriage / Wedding / Relationship (Amber)
  else if (has('MARRIAGE', 'WEDDING', 'RELATIONSHIP', 'ENGAGEMENT', 'ANNIVERSARY', 'HONEYMOON', 'CEREMONY', 'VOWS', 'BRIDE', 'GROOM')) {
    image = '/images/events/marriage_planning_min.png'; color = 'var(--amber)'; emoji = '💍'; label = 'Marriage'; colorName = 'amber'
  }
  // 9. Finance / Money / Banking / Wealth (Emerald)
  else if (has('MONEY', 'FINANCE', 'FINANCIAL', 'FISCAL', 'DEBT', 'INVEST', 'INVESTOR', 'FUNDING', 'FUNDRAIS', 'TAX', 'SAVINGS', 'BANK', 'PAYMENT', 'ACCOUNT', 'BUDGET', 'REVENUE', 'ASSET', 'DISCIPLINE', 'CAPITAL', 'FUND', 'EQUITY', 'CASH', 'CREDIT', 'LOAN', 'PROFIT', 'COST', 'BOOKKEEP', 'ACCOUNTING', 'PAYROLL', 'WEALTH', 'VALUAT', 'EXPENDITURE', 'INSUR', 'PENSION', 'SUBSID', 'GRANT', 'STIPEND', 'COMPENSAT', 'SALARY', 'INCOME', 'EARNING', 'PRICING', 'MONETIZ')) {
    image = '/images/events/money_assets_min.png'; color = 'var(--emerald)'; emoji = '💰'; label = 'Finance'; colorName = 'emerald'
  }
  // 10. Legal / Visa / Identity / Passport / Documents (Sky)
  else if (has('LEGAL', 'VISA', 'IDENTITY', 'PASSPORT', 'CITIZEN', 'PERMIT', 'VERIF', 'COURT', 'LAWYER', 'NOTARI', 'WILL', 'ATTORNEY', 'LEGISLAT', 'REGULAT', 'COMPLIANC', 'CONTRACT', 'AGREEMENT', 'SIGN', 'CLAUSE', 'LIABILITY', 'INTELLECTUAL', 'TRADEMARK', 'COPYRIGHT', 'PATENT', 'DISPUTE', 'ARBITRAT', 'BYLAWS', 'AMENDMENT', 'AFFIDAVIT', 'DEED', 'TITLE')) {
    if (has('VISA', 'PASSPORT')) image = '/images/events/visa_application_min.png';
    else if (has('WILL', 'TESTAMENT')) image = '/images/events/last_will_min.png';
    else image = '/images/events/legal_identity_min.png';
    color = 'var(--sky)'; emoji = has('DOC', 'FORM', 'PAPER', 'FILE', 'SIGN') ? '📄' : '⚖️'; label = 'Legal'; colorName = 'sky'
  }
  // 10b. Documents (catch-all for doc-related phases)
  else if (has('DOC', 'FORM', 'PAPER', 'CERTIF', 'RECORD', 'APPLICAT', 'REGISTR', 'FILING', 'SUBMISS')) {
    image = '/images/events/legal_identity_min.png'; color = 'var(--sky)'; emoji = '📄'; label = 'Documents'; colorName = 'sky'
  }
  // 11. Travel / Trip / Vacation / Digital Nomad (Amber)
  else if (has('TRAVEL', 'TRIP', 'VACATION', 'NOMAD', 'EXPLOR', 'FLIGHT', 'TOUR', 'ABROAD', 'OVERSEAS', 'INTERNATIONAL', 'BORDER', 'IMMIGRAT')) {
    image = '/images/events/relocation_min.png'; color = 'var(--amber)'; emoji = '✈️'; label = 'Travel'; colorName = 'amber'
  }
  // 12. Vehicle / Car / Boat / Bike (Amber)
  else if (has('VEHICLE', 'CAR ', 'BOAT', 'BIKE', 'AUTOMOBILE', 'DRIVE', 'MOTORCYCL', 'TRUCK', 'TRANSPORT')) {
    image = '/images/events/vehicle_purchase_min.png'; color = 'var(--amber)'; emoji = '🚗'; label = 'Vehicle'; colorName = 'amber'
  }
  // 13. Medical / Health / Doctor (Coral)
  else if (has('MEDICAL', 'SURGERY', 'DOCTOR', 'HOSPITAL', 'CLINIC', 'PHYSICAL', 'DENTIST', 'CRISIS', 'HEALTH', 'DISABIL', 'MENTAL', 'THERAPY', 'COUNSEL', 'WELLBEING', 'WELLNESS', 'PRESCR', 'MEDICAT', 'DIAGNOS', 'TREATMENT', 'REHAB', 'RECOVER')) {
    if (has('DISABIL', 'LONG TERM')) image = '/images/events/health_disability_min.png';
    else image = '/images/events/medical_emergency_min.png';
    color = 'var(--coral)'; emoji = '🏥'; label = 'Medical'; colorName = 'coral'
  }
  // 14. Event / Party (Amber)
  else if (has('EVENT', 'PARTY', 'CELEBRAT', 'FESTIVAL', 'GATHERING', 'CONFERENCE', 'SEMINAR', 'WORKSHOP', 'SUMMIT')) {
    image = '/images/events/event_planning_min.png'; color = 'var(--amber)'; emoji = '🎉'; label = 'Event'; colorName = 'amber'
  }
  // 15. Retirement (Amber)
  else if (has('RETIRE')) {
    image = '/images/events/retirement_min.png'; color = 'var(--amber)'; emoji = '🌅'; label = 'Retirement'; colorName = 'amber'
  }
  // 16. Pets (Sage)
  else if (has('PET', 'ANIMAL', 'ADOPTION', 'DOG', 'CAT', 'VET')) {
    image = '/images/events/pet_adoption_min.png'; color = 'var(--sage)'; emoji = '🐈'; label = 'Pets'; colorName = 'sage'
  }
  // 17. Mindfulness / Peace / Wellness (Sky/Sage)
  else if (has('ZEN', 'PEACE', 'MINDFUL', 'MEDITAT', 'MENTAL HEALTH')) {
    image = '/images/events/peace_zen_min.png'; color = 'var(--sky)'; emoji = '🧘'; label = 'Mindfulness'; colorName = 'sky'
  }
  else if (has('GROWTH', 'HABIT', 'SELF', 'PERSONAL', 'DEVELOP', 'IMPROVE', 'GOAL', 'MOTIVAT', 'PRODUCTIV', 'ROUTINE', 'DISCIPL', 'MINDSET', 'SKILL')) {
    image = '/images/events/personal_growth_min.png'; color = 'var(--sage)'; emoji = '🌱'; label = 'Growth'; colorName = 'sage'
  }
  // 18. Family (Sage)
  else if (has('FAMILY', 'PARENT', 'CHILD', 'RELATIVE', 'SIBLING', 'GUARDIAN', 'CAREGIV')) {
    if (has('BABY', 'PARENTING', 'INFANT')) image = '/images/events/parenting_care_min.png';
    else image = '/images/events/family_relations_min.png';
    color = 'var(--sage)'; emoji = '👪'; label = 'Family'; colorName = 'sage'
  }
  // 19. Caution / Warnings / Mistakes to avoid
  else if (has('AVOID', 'MISTAKE', 'PITFALL', 'TRAP', 'WARN', 'CAUTION', 'COMMON ERROR', 'DON\'T', 'DANGER', 'RISK', 'PREVENT', 'PROTECT')) {
    image = '/images/events/academic_planning_min.png'; color = 'var(--coral)'; emoji = '⚠️'; label = 'Caution'; colorName = 'coral'
  }
  // 20. Work / Project (fallback career catch)
  else if (has('WORK', 'PROJECT', 'TASK', 'WORKFLOW', 'PROCESS', 'EXECUT', 'IMPLEMENT', 'ACTION', 'STRATEG', 'INITIATIVE', 'PROGRAM')) {
    image = '/images/events/work_and_career_min.png'; color = 'var(--amber)'; emoji = '💼'; label = 'Work'; colorName = 'amber'
  }

  return { image, color, emoji, label, colorName }
}
