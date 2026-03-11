import { useState, useMemo, useEffect, useCallback, Component } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase Client ────────────────────────────────────────────────────────

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

function mapFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    costs: row.costs,
    listPrice: row.list_price,
    includeDeck: row.include_deck,
    totalCogs: row.total_cogs,
    margin: row.margin,
    status: row.total_cogs > 0 ? 'active' : 'estimated',
    createdAt: row.created_at,
  }
}

function mapToDb(project) {
  return {
    name: project.name,
    model: project.model,
    costs: project.costs,
    list_price: project.listPrice,
    include_deck: project.includeDeck,
    total_cogs: project.totalCogs,
    margin: project.margin,
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODELS = {
  essential: { name: 'Dwell Essential', sqft: 472, beds: 1, baths: 1, listPrice: 141000, hasDeck: true },
  classic: { name: 'Dwell Classic', sqft: 575, beds: 2, baths: 1, listPrice: 172000, hasDeck: true },
  deluxe: { name: 'Dwell Deluxe', sqft: 600, beds: 2, baths: 1, listPrice: 186000, hasDeck: false },
  prime: { name: 'Dwell Prime', sqft: 900, beds: 2, baths: 2, listPrice: 270000, hasDeck: true },
}

const PROJECT_STATUS = {
  estimated: { label: 'Estimated', color: 'badge-gray' },
  in_progress: { label: 'In Progress', color: 'badge-yellow' },
  completed: { label: 'Completed', color: 'badge-green' },
  closed: { label: 'Closed', color: 'badge-blue' },
}

const CATEGORY_LABELS = {
  structure: { icon: '🏗️', name: 'Structure (Steel)' },
  electrical: { icon: '⚡', name: 'Electrical' },
  hvac: { icon: '❄️', name: 'HVAC' },
  roofing: { icon: '🏠', name: 'Roofing' },
  kitchen: { icon: '🍳', name: 'Kitchen' },
  bathroom: { icon: '🚿', name: 'Bathroom' },
  sitework: { icon: '🚜', name: 'Site Prep & Foundation' },
  utilities: { icon: '🔌', name: 'Utilities' },
  overhead: { icon: '📋', name: 'Overhead' },
  contingency: { icon: '🛡️', name: 'Contingency' },
}

const ITEM_LABELS = {
  steelMaterial: 'Steel Material',
  steelLabor: 'Steel Labor',
  electricalPackage: 'Electrical Package',
  miniSplitSystem: 'Mini Split System',
  shingles: 'Shingles (GAF)',
  roofingLabor: 'Roofing Labor',
  cabinets: 'Cabinets',
  countertops: 'Countertops',
  vanity: 'Vanity',
  toilet: 'Toilet',
  sitePrep: 'Site Preparation',
  foundation: 'Foundation',
  permits: 'Permits & Fees',
  grading: 'Grading & Excavation',
  waterSewer: 'Water & Sewer',
  electricService: 'Electric Service',
  gasService: 'Gas Service',
  projectManagement: 'Project Management',
  insurance: 'Insurance & Bonding',
  generalConditions: 'General Conditions',
  contingencyReserve: 'Contingency Reserve',
}

// ─── Cost Defaults ───────────────────────────────────────────────────────────

function getDefaultCosts(model) {
  const m = MODELS[model]
  const sqft = m.sqft
  const baths = m.baths

  return {
    structure: {
      steelMaterial: { value: sqft * 38, actualValue: null, min: 0, max: sqft * 50, unit: `$38/sqft × ${sqft}`, note: '' },
      steelLabor: { value: sqft * 6, actualValue: null, min: 0, max: sqft * 10, unit: `$6/sqft × ${sqft}`, note: '' },
    },
    electrical: {
      electricalPackage: { value: Math.round(sqft * 22.6), actualValue: null, min: 0, max: Math.round(sqft * 30), unit: `~$22.60/sqft`, note: '' },
    },
    hvac: {
      miniSplitSystem: { value: baths === 1 ? 5000 : 8000, actualValue: null, min: 0, max: baths === 1 ? 7000 : 9000, unit: `${baths === 1 ? '1-2 bed/1 bath' : '2 bed/2 bath'}`, note: '' },
    },
    roofing: {
      shingles: { value: Math.round(sqft * 1.15 * 4.25), actualValue: null, min: 0, max: Math.round(sqft * 1.15 * 5), unit: 'GAF Timberline HDZ', note: '' },
      roofingLabor: { value: Math.round(sqft * 1.15 * 4), actualValue: null, min: 0, max: Math.round(sqft * 1.15 * 5), unit: 'Installation', note: '' },
    },
    kitchen: {
      cabinets: { value: 5000, actualValue: null, min: 0, max: 6000, unit: 'Shaker w/ soft close', note: '' },
      countertops: { value: 1300, actualValue: null, min: 0, max: 1600, unit: 'Quartz 20 sqft', note: '' },
    },
    bathroom: {
      vanity: { value: 600 * baths, actualValue: null, min: 0, max: 800 * baths, unit: `Vanity w/ marble (${baths})`, note: '' },
      toilet: { value: 275 * baths, actualValue: null, min: 0, max: 350 * baths, unit: `American Standard (${baths})`, note: '' },
    },
    sitework: {
      sitePrep: { value: 3000, actualValue: null, min: 0, max: 8000, unit: 'Clearing & prep', note: '' },
      foundation: { value: 15000, actualValue: null, min: 0, max: 35000, unit: 'Slab/pier foundation', note: '' },
      permits: { value: 5000, actualValue: null, min: 0, max: 15000, unit: 'Permits & fees', note: '' },
      grading: { value: 2500, actualValue: null, min: 0, max: 6000, unit: 'Grading & excavation', note: '' },
    },
    utilities: {
      waterSewer: { value: 4000, actualValue: null, min: 0, max: 10000, unit: 'Water/sewer hookup', note: '' },
      electricService: { value: 3500, actualValue: null, min: 0, max: 8000, unit: 'Panel & service', note: '' },
      gasService: { value: 2000, actualValue: null, min: 0, max: 5000, unit: 'Gas line hookup', note: '' },
    },
    overhead: {
      projectManagement: { value: Math.round(sqft * 5), actualValue: null, min: 0, max: Math.round(sqft * 10), unit: `~$5/sqft`, note: '' },
      insurance: { value: 2500, actualValue: null, min: 0, max: 5000, unit: 'Builder\'s risk + GL', note: '' },
      generalConditions: { value: 3000, actualValue: null, min: 0, max: 6000, unit: 'Dumpster, porta, etc.', note: '' },
    },
    contingency: {
      contingencyReserve: { value: Math.round(sqft * 8), actualValue: null, min: 0, max: Math.round(sqft * 20), unit: `~$8/sqft reserve`, note: '' },
    },
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0)
}

function getVarianceColor(variance) {
  const abs = Math.abs(variance)
  if (abs <= 5) return 'text-green-600'
  if (abs <= 10) return 'text-yellow-600'
  return 'text-red-600'
}

function getMarginColor(marginPct) {
  if (marginPct >= 25) return 'text-green-600'
  if (marginPct >= 15) return 'text-yellow-600'
  return 'text-red-600'
}

function getMarginBg(marginPct) {
  if (marginPct >= 25) return 'bg-green-50 border-green-200'
  if (marginPct >= 15) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// ─── Error Boundary ──────────────────────────────────────────────────────────

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4 text-sm">{this.state.error?.message}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>Reload Application</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Toast System ────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast-enter flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span className="text-lg">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="text-current opacity-50 hover:opacity-100">×</button>
        </div>
      ))}
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

function App() {
  // Core state
  const [selectedModel, setSelectedModel] = useState('classic')
  const [costs, setCosts] = useState(() => getDefaultCosts('classic'))
  const [listPrice, setListPrice] = useState(MODELS.classic.listPrice)
  const [includeDeck, setIncludeDeck] = useState(true)
  const [targetMargin, setTargetMargin] = useState(25)
  const [changeOrders, setChangeOrders] = useState([])

  // Project state
  const [projectName, setProjectName] = useState('')
  const [projectStatus, setProjectStatus] = useState('estimated')
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [savedProjects, setSavedProjects] = useState([])

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modelFilter, setModelFilter] = useState('all')
  const [expandedNotes, setExpandedNotes] = useState({})

  // Toast helpers
  const addToast = useCallback((message, type = 'success') => {
    const id = generateId()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ─── Data Loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadProjects() {
      try {
        const { data, error } = await supabase
          .from('cogs_projects')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setSavedProjects((data || []).map(mapFromDb))
      } catch (err) {
        console.error('Failed to load projects:', err)
        addToast('Failed to load projects from database', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [addToast])

  // ─── Computed Values ───────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const categoryTotals = {}
    const actualCategoryTotals = {}
    let grandTotal = 0
    let actualGrandTotal = 0

    Object.entries(costs).forEach(([category, items]) => {
      if (!items || typeof items !== 'object') return
      let catTotal = 0
      let actualCatTotal = 0
      Object.values(items).forEach(item => {
        if (!item || typeof item !== 'object') return
        catTotal += item.value || 0
        actualCatTotal += (item.actualValue != null ? item.actualValue : item.value) || 0
      })
      categoryTotals[category] = catTotal
      actualCategoryTotals[category] = actualCatTotal
      grandTotal += catTotal
      actualGrandTotal += actualCatTotal
    })

    // Add change order amounts
    const coTotal = changeOrders.reduce((sum, co) => sum + (co.amount || 0), 0)

    return {
      categoryTotals,
      actualCategoryTotals,
      grandTotal,
      actualGrandTotal: actualGrandTotal + coTotal,
      changeOrderTotal: coTotal,
      variance: grandTotal ? ((actualGrandTotal + coTotal - grandTotal) / grandTotal * 100) : 0,
    }
  }, [costs, changeOrders])

  const margin = listPrice - totals.actualGrandTotal
  const marginPercent = listPrice ? ((margin / listPrice) * 100) : 0

  // ─── KPI Metrics ───────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const active = savedProjects.filter(p => p.status !== 'archived')
    const completed = active.filter(p => p.status === 'completed')
    const inProgress = active.filter(p => p.status === 'in_progress')

    const totalRevenue = active.reduce((sum, p) => sum + (p.listPrice || 0), 0)
    const avgMargin = active.length > 0
      ? active.reduce((sum, p) => {
          const lp = p.listPrice || 0
          const tc = p.totalCogs || 0
          return sum + (lp > 0 ? ((lp - tc) / lp * 100) : 0)
        }, 0) / active.length
      : 0

    return {
      totalProjects: active.length,
      completed: completed.length,
      inProgress: inProgress.length,
      totalRevenue,
      avgMargin,
    }
  }, [savedProjects])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleModelChange = (model) => {
    setSelectedModel(model)
    setCosts(getDefaultCosts(model))
    setListPrice(MODELS[model].listPrice)
    setIncludeDeck(MODELS[model].hasDeck)
    setChangeOrders([])
  }

  const handleCostChange = (category, itemKey, field, newValue) => {
    setCosts(prev => {
      const updated = { ...prev }
      updated[category] = { ...prev[category] }
      updated[category][itemKey] = {
        ...prev[category][itemKey],
        [field]: field === 'note' ? newValue : (parseInt(newValue) || 0),
      }
      return updated
    })
  }

  const handleNewProject = () => {
    setSelectedModel('classic')
    setCosts(getDefaultCosts('classic'))
    setListPrice(MODELS.classic.listPrice)
    setIncludeDeck(true)
    setProjectName('')
    setProjectStatus('estimated')
    setCurrentProjectId(null)
    setChangeOrders([])
    setTargetMargin(25)
    setActiveTab('calculator')
  }

  const loadProject = (project) => {
    setSelectedModel(project.model || 'classic')

    // Merge saved costs with defaults to handle new categories
    const defaults = getDefaultCosts(project.model || 'classic')
    const merged = { ...defaults }
    if (project.costs) {
      Object.keys(project.costs).forEach(cat => {
        if (cat.startsWith('_')) return // skip meta fields
        if (merged[cat]) {
          merged[cat] = { ...merged[cat] }
          Object.keys(project.costs[cat]).forEach(item => {
            if (merged[cat][item] || project.costs[cat][item]) {
              merged[cat][item] = { ...(merged[cat][item] || {}), ...project.costs[cat][item] }
            }
          })
        } else {
          merged[cat] = project.costs[cat]
        }
      })
    }

    setCosts(merged)
    setListPrice(project.listPrice || MODELS[project.model]?.listPrice || 0)
    setIncludeDeck(project.includeDeck ?? true)
    setProjectName(project.name || '')
    setProjectStatus(project.status || 'estimated')
    setCurrentProjectId(project.id)
    setChangeOrders(project.costs?._changeOrders || [])
    setTargetMargin(project.costs?._targetMargin || 25)
    setActiveTab('calculator')
  }

  const saveProject = async (name) => {
    if (!name.trim()) {
      addToast('Project name is required', 'error')
      return
    }

    setSaving(true)
    const costsWithMeta = {
      ...costs,
      _changeOrders: changeOrders,
      _targetMargin: targetMargin,
    }

    const project = {
      name: name.trim(),
      model: selectedModel,
      costs: costsWithMeta,
      listPrice,
      includeDeck,
      totalCogs: totals.actualGrandTotal,
      margin,
    }

    try {
      const dbData = mapToDb(project)

      if (currentProjectId) {
        const { data, error } = await supabase
          .from('cogs_projects')
          .update({ ...dbData })
          .eq('id', currentProjectId)
          .select()
          .single()

        if (error) throw error
        const saved = mapFromDb(data)
        setSavedProjects(prev => prev.map(p => p.id === currentProjectId ? saved : p))
      } else {
        const { data, error } = await supabase
          .from('cogs_projects')
          .insert([dbData])
          .select()
          .single()

        if (error) throw error
        const saved = mapFromDb(data)
        setSavedProjects(prev => [saved, ...prev])
        setCurrentProjectId(saved.id)
      }

      setProjectName(name.trim())
      setShowSaveModal(false)
      addToast(currentProjectId ? 'Project updated successfully' : 'Project saved successfully')
    } catch (err) {
      console.error('Failed to save project:', err)
      addToast('Failed to save project: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const archiveProject = async (projectId) => {
    try {
      const { error } = await supabase
        .from('cogs_projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setSavedProjects(prev => prev.filter(p => p.id !== projectId))
      if (currentProjectId === projectId) {
        handleNewProject()
      }
      addToast('Project archived successfully')
    } catch (err) {
      addToast('Failed to archive project: ' + err.message, 'error')
    }
  }

  const duplicateProject = (project) => {
    setSelectedModel(project.model || 'classic')
    const defaults = getDefaultCosts(project.model || 'classic')
    const merged = { ...defaults }
    if (project.costs) {
      Object.keys(project.costs).forEach(cat => {
        if (cat.startsWith('_')) return
        if (merged[cat]) {
          merged[cat] = { ...merged[cat] }
          Object.keys(project.costs[cat]).forEach(item => {
            if (merged[cat][item] || project.costs[cat][item]) {
              merged[cat][item] = { ...(merged[cat][item] || {}), ...project.costs[cat][item] }
            }
          })
        }
      })
    }

    setCosts(merged)
    setListPrice(project.listPrice || MODELS[project.model]?.listPrice || 0)
    setIncludeDeck(project.includeDeck ?? true)
    setProjectName(`${project.name} (Copy)`)
    setProjectStatus('estimated')
    setCurrentProjectId(null)
    setChangeOrders(project.costs?._changeOrders || [])
    setTargetMargin(project.costs?._targetMargin || 25)
    setActiveTab('calculator')
    addToast('Project duplicated — save to create a new copy', 'info')
  }

  const addChangeOrder = (co) => {
    setChangeOrders(prev => [...prev, { ...co, id: generateId(), date: new Date().toISOString() }])
    setShowChangeOrderModal(false)
    addToast('Change order added')
  }

  // ─── Export Functions ──────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ['Project Name', 'Model', 'Status', 'Estimated COGS', 'Actual COGS', 'List Price', 'Margin', 'Margin %', 'Created']
    const rows = savedProjects.map(p => {
      const lp = p.listPrice || 0
      const tc = p.totalCogs || 0
      const m = lp - tc
      const mp = lp > 0 ? ((m / lp) * 100).toFixed(1) : '0.0'
      return [
        `"${p.name}"`,
        MODELS[p.model]?.name || p.model,
        PROJECT_STATUS[p.status]?.label || p.status,
        tc,
        tc,
        lp,
        m,
        mp + '%',
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `massdwell-cogs-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast('CSV exported successfully')
  }

  const exportPDF = () => {
    window.print()
    addToast('Print dialog opened for PDF export', 'info')
  }

  // ─── Filtered Projects ────────────────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    return savedProjects.filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (modelFilter !== 'all' && p.model !== modelFilter) return false
      return true
    })
  }, [savedProjects, searchQuery, statusFilter, modelFilter])

  // ─── Loading Screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading COGS Calculator...</p>
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-40 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-3">
                  <img src="/massdwell-logo.jpg" alt="MassDwell Solutions" style={{ height: "48px", objectFit: "contain" }} />
                  COGS Calculator
                </h1>
                {projectName && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {projectName}
                    <span className={`ml-2 badge ${PROJECT_STATUS[projectStatus]?.color || 'badge-gray'}`}>
                      {PROJECT_STATUS[projectStatus]?.label || projectStatus}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="btn-secondary text-xs sm:text-sm" onClick={handleNewProject}>+ New</button>
                <button className="btn-primary text-xs sm:text-sm" onClick={() => setShowSaveModal(true)}>
                  {saving ? 'Saving...' : currentProjectId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <nav className="flex space-x-6 mt-3 -mb-px overflow-x-auto">
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'calculator', label: 'Calculator' },
                { key: 'projects', label: `Projects (${savedProjects.length})` },
                { key: 'analytics', label: 'Analytics' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`tab-btn whitespace-nowrap ${activeTab === tab.key ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* ─── Dashboard Tab ──────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="kpi-card">
                <div className="text-sm font-medium text-gray-500">Total Projects</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{kpis.totalProjects}</div>
                <div className="text-xs text-gray-400 mt-1">{kpis.inProgress} in progress</div>
              </div>
              <div className="kpi-card">
                <div className="text-sm font-medium text-gray-500">Avg Margin</div>
                <div className={`text-3xl font-bold mt-1 ${getMarginColor(kpis.avgMargin)}`}>
                  {kpis.avgMargin.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {kpis.avgMargin >= 25 ? 'Healthy' : kpis.avgMargin >= 15 ? 'Watch' : 'Below target'}
                </div>
              </div>
              <div className="kpi-card">
                <div className="text-sm font-medium text-gray-500">Revenue Pipeline</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(kpis.totalRevenue)}
                </div>
                <div className="text-xs text-gray-400 mt-1">{kpis.totalProjects} projects</div>
              </div>
              <div className="kpi-card">
                <div className="text-sm font-medium text-gray-500">Completed</div>
                <div className="text-3xl font-bold text-green-600 mt-1">{kpis.completed}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {kpis.totalProjects > 0 ? Math.round(kpis.completed / kpis.totalProjects * 100) : 0}% completion rate
                </div>
              </div>
            </div>

            {/* Model Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Model</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-500">Sq Ft</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-500">Bed/Bath</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">List Price</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-500">Projects</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Avg Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(MODELS).map(([key, model]) => {
                      const mp = savedProjects.filter(p => p.model === key)
                      const avgM = mp.length > 0
                        ? mp.reduce((s, p) => s + ((p.listPrice || 0) > 0 ? (((p.listPrice || 0) - (p.totalCogs || 0)) / (p.listPrice || 1) * 100) : 0), 0) / mp.length
                        : 0
                      return (
                        <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium text-gray-900">{model.name}</td>
                          <td className="py-3 px-2 text-center text-gray-600">{model.sqft}</td>
                          <td className="py-3 px-2 text-center text-gray-600">{model.beds}bd/{model.baths}ba</td>
                          <td className="py-3 px-2 text-right font-medium">{formatCurrency(model.listPrice)}</td>
                          <td className="py-3 px-2 text-center">{mp.length}</td>
                          <td className={`py-3 px-2 text-right font-medium ${mp.length > 0 ? getMarginColor(avgM) : 'text-gray-400'}`}>
                            {mp.length > 0 ? `${avgM.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
              {savedProjects.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No projects yet. Create your first project to get started.</p>
              ) : (
                <div className="space-y-2">
                  {savedProjects.slice(0, 5).map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => loadProject(p)}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          {MODELS[p.model]?.name || p.model} · {formatCurrency(p.totalCogs)} COGS
                        </div>
                      </div>
                      <span className={`badge ${PROJECT_STATUS[p.status]?.color || 'badge-gray'} flex-shrink-0 ml-2`}>
                        {PROJECT_STATUS[p.status]?.label || p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Calculator Tab ─────────────────────────────────────────────── */}
        {activeTab === 'calculator' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Sidebar: Model + Status */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Model</h3>
                  <div className="space-y-2">
                    {Object.entries(MODELS).map(([key, model]) => (
                      <button
                        key={key}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedModel === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                        onClick={() => handleModelChange(key)}
                      >
                        <div className="font-medium text-sm text-gray-900">{model.name}</div>
                        <div className="text-xs text-gray-500">{model.sqft} sqft · {model.beds}bd/{model.baths}ba · {formatCurrency(model.listPrice)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    className="input-field"
                  >
                    {Object.entries(PROJECT_STATUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>

                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">Target Margin</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="cost-input w-20 text-center"
                      min="0"
                      max="100"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>

                {/* Change Orders */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Change Orders</h3>
                    <button
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => setShowChangeOrderModal(true)}
                    >
                      + Add
                    </button>
                  </div>
                  {changeOrders.length === 0 ? (
                    <p className="text-xs text-gray-400">No change orders</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {changeOrders.map((co, i) => (
                        <div key={co.id || i} className="text-xs p-2 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-700 truncate">{co.description}</span>
                            <span className={`font-medium ml-2 flex-shrink-0 ${co.amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {co.amount >= 0 ? '+' : ''}{formatCurrency(co.amount)}
                            </span>
                          </div>
                          <div className="text-gray-400 mt-0.5">
                            {co.category && (CATEGORY_LABELS[co.category]?.name || co.category)}
                            {co.date && ` · ${new Date(co.date).toLocaleDateString()}`}
                          </div>
                        </div>
                      ))}
                      {changeOrders.length > 0 && (
                        <div className="flex justify-between text-xs font-semibold pt-2 border-t border-gray-200">
                          <span>Total COs:</span>
                          <span className={totals.changeOrderTotal >= 0 ? 'text-red-600' : 'text-green-600'}>
                            {totals.changeOrderTotal >= 0 ? '+' : ''}{formatCurrency(totals.changeOrderTotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content: Cost Items */}
              <div className="lg:col-span-6 space-y-4">
                {Object.entries(costs).map(([category, items]) => {
                  if (!items || typeof items !== 'object' || category.startsWith('_')) return null
                  const validItems = Object.entries(items).filter(([, item]) => item && typeof item === 'object' && 'value' in item)
                  if (validItems.length === 0) return null

                  const catLabel = CATEGORY_LABELS[category] || { icon: '📦', name: category }

                  return (
                    <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {catLabel.icon} {catLabel.name}
                        </h3>
                        <div className="text-right text-xs">
                          <div className="font-semibold text-gray-900">
                            Est: {formatCurrency(totals.categoryTotals[category] || 0)}
                          </div>
                          {(totals.actualCategoryTotals[category] || 0) !== (totals.categoryTotals[category] || 0) && (
                            <div className="text-gray-500">
                              Act: {formatCurrency(totals.actualCategoryTotals[category] || 0)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {validItems.map(([key, item]) => {
                          const variance = item.actualValue != null && item.value
                            ? ((item.actualValue - item.value) / item.value * 100)
                            : 0
                          const hasActual = item.actualValue != null
                          const noteKey = `${category}.${key}`

                          return (
                            <div key={key} className="space-y-1">
                              <div className={`grid grid-cols-12 gap-2 sm:gap-3 items-center p-2.5 rounded-lg border ${
                                hasActual
                                  ? (Math.abs(variance) <= 5 ? 'bg-green-50 border-green-100' : Math.abs(variance) <= 10 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100')
                                  : 'border-gray-100'
                              }`}>
                                {/* Label */}
                                <div className="col-span-12 sm:col-span-3">
                                  <div className="font-medium text-xs text-gray-900">
                                    {ITEM_LABELS[key] || key}
                                  </div>
                                  <div className="text-xs text-gray-400">{item.unit}</div>
                                </div>

                                {/* Estimated */}
                                <div className="col-span-4 sm:col-span-2">
                                  <label className="text-xs text-gray-400 block">Est</label>
                                  <input
                                    type="number"
                                    value={item.value || 0}
                                    onChange={(e) => handleCostChange(category, key, 'value', e.target.value)}
                                    className="cost-input"
                                    min="0"
                                  />
                                </div>

                                {/* Actual */}
                                <div className="col-span-4 sm:col-span-2">
                                  <label className="text-xs text-gray-400 block">Act</label>
                                  <input
                                    type="number"
                                    value={item.actualValue ?? ''}
                                    onChange={(e) => handleCostChange(category, key, 'actualValue', e.target.value)}
                                    className="cost-input"
                                    placeholder="—"
                                    min="0"
                                  />
                                </div>

                                {/* Variance */}
                                <div className="col-span-2 sm:col-span-1 text-center">
                                  {hasActual && variance !== 0 && (
                                    <div className={`text-xs font-semibold ${getVarianceColor(variance)}`}>
                                      {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                    </div>
                                  )}
                                </div>

                                {/* Slider */}
                                <div className="col-span-10 sm:col-span-3">
                                  <input
                                    type="range"
                                    min={item.min || 0}
                                    max={item.max || item.value * 2 || 10000}
                                    value={item.value || 0}
                                    onChange={(e) => handleCostChange(category, key, 'value', e.target.value)}
                                    className="w-full"
                                  />
                                </div>

                                {/* Note toggle */}
                                <div className="col-span-2 sm:col-span-1 text-center">
                                  <button
                                    className={`text-xs ${expandedNotes[noteKey] ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
                                    onClick={() => setExpandedNotes(prev => ({ ...prev, [noteKey]: !prev[noteKey] }))}
                                    title="Add note"
                                  >
                                    📝
                                  </button>
                                </div>
                              </div>

                              {/* Note field */}
                              {expandedNotes[noteKey] && (
                                <input
                                  type="text"
                                  value={item.note || ''}
                                  onChange={(e) => handleCostChange(category, key, 'note', e.target.value)}
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 placeholder-gray-300"
                                  placeholder="Add a note for this line item..."
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Right Sidebar: Summary */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-20">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Cost Summary</h3>

                  {/* Category breakdown */}
                  <div className="space-y-1.5 mb-4">
                    {Object.entries(totals.categoryTotals).map(([cat, total]) => (
                      <div key={cat} className="flex justify-between text-xs">
                        <span className="text-gray-500 truncate mr-2">{CATEGORY_LABELS[cat]?.name || cat}</span>
                        <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(total)}</span>
                      </div>
                    ))}
                    {totals.changeOrderTotal !== 0 && (
                      <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                        <span className="text-gray-500">Change Orders</span>
                        <span className={`font-medium ${totals.changeOrderTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {totals.changeOrderTotal > 0 ? '+' : ''}{formatCurrency(totals.changeOrderTotal)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Est. Total COGS:</span>
                      <span className="font-semibold">{formatCurrency(totals.grandTotal)}</span>
                    </div>
                    {totals.actualGrandTotal !== totals.grandTotal && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Act. Total COGS:</span>
                          <span className="font-semibold">{formatCurrency(totals.actualGrandTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Variance:</span>
                          <span className={`font-semibold ${getVarianceColor(totals.variance)}`}>
                            {totals.variance > 0 ? '+' : ''}{totals.variance.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Selling Price */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <label className="text-xs font-medium text-gray-500 block mb-1">Selling Price</label>
                    <input
                      type="number"
                      value={listPrice}
                      onChange={(e) => setListPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input-field text-right font-semibold tabular-nums"
                      min="0"
                    />
                  </div>

                  {/* Margin */}
                  <div className={`mt-4 p-4 rounded-lg border ${getMarginBg(marginPercent)}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Gross Margin</span>
                      <span className={`text-lg font-bold ${getMarginColor(marginPercent)}`}>
                        {marginPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Profit:</span>
                      <span className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(margin)}
                      </span>
                    </div>

                    {/* Margin bar */}
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          marginPercent >= 25 ? 'bg-green-500' : marginPercent >= 15 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, marginPercent))}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0%</span>
                      <span className="font-medium">Target: {targetMargin}%</span>
                      <span>50%</span>
                    </div>

                    {marginPercent < 15 && (
                      <div className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded font-medium">
                        ⚠ Margin below 15% — review costs
                      </div>
                    )}
                    {marginPercent >= 15 && marginPercent < 25 && (
                      <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 p-2 rounded font-medium">
                        ⚡ Margin 15-25% — acceptable but watch closely
                      </div>
                    )}
                  </div>

                  {/* Export buttons */}
                  <div className="mt-4 flex gap-2">
                    <button className="btn-secondary flex-1 text-xs" onClick={exportPDF}>PDF</button>
                    <button className="btn-secondary flex-1 text-xs" onClick={exportCSV}>CSV</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Projects Tab ───────────────────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field sm:w-40"
                >
                  <option value="all">All Statuses</option>
                  {Object.entries(PROJECT_STATUS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="input-field sm:w-40"
                >
                  <option value="all">All Models</option>
                  {Object.entries(MODELS).map(([key, model]) => (
                    <option key={key} value={key}>{model.name}</option>
                  ))}
                </select>
                <button className="btn-secondary text-xs whitespace-nowrap" onClick={exportCSV}>
                  Export CSV
                </button>
              </div>
            </div>

            {/* Projects List */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📁</div>
                <p className="font-medium">No projects found</p>
                <p className="text-sm mt-1">
                  {savedProjects.length === 0 ? 'Create your first project to get started.' : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProjects.map(project => {
                  const lp = project.listPrice || 0
                  const tc = project.totalCogs || 0
                  const projMargin = lp - tc
                  const projMarginPct = lp > 0 ? (projMargin / lp * 100) : 0

                  return (
                    <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => loadProject(project)}>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">{project.name}</h4>
                            <span className={`badge ${PROJECT_STATUS[project.status]?.color || 'badge-gray'} flex-shrink-0`}>
                              {PROJECT_STATUS[project.status]?.label || project.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>{MODELS[project.model]?.name || project.model}</span>
                            <span>COGS: {formatCurrency(tc)}</span>
                            <span>List: {formatCurrency(lp)}</span>
                            <span className={`font-medium ${getMarginColor(projMarginPct)}`}>
                              Margin: {projMarginPct.toFixed(1)}%
                            </span>
                            {project.createdAt && (
                              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                            onClick={() => duplicateProject(project)}
                            title="Duplicate project"
                          >
                            Copy
                          </button>
                          <button
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Archive "${project.name}"? It can be recovered later.`)) {
                                archiveProject(project.id)
                              }
                            }}
                            title="Archive project"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Analytics Tab ──────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Cost Breakdown by Category */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Structure (Current)</h3>
                <div className="space-y-3">
                  {Object.entries(totals.categoryTotals).map(([cat, total]) => {
                    const pct = totals.grandTotal > 0 ? (total / totals.grandTotal * 100) : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{CATEGORY_LABELS[cat]?.icon} {CATEGORY_LABELS[cat]?.name || cat}</span>
                          <span className="font-medium">{formatCurrency(total)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Model Performance */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
                {Object.entries(MODELS).map(([key, model]) => {
                  const mp = savedProjects.filter(p => p.model === key)
                  const totalRev = mp.reduce((s, p) => s + (p.listPrice || 0), 0)
                  const totalCost = mp.reduce((s, p) => s + (p.totalCogs || 0), 0)
                  const avgM = mp.length > 0 && totalRev > 0
                    ? ((totalRev - totalCost) / totalRev * 100)
                    : 0

                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="font-medium text-sm text-gray-900">{model.name}</div>
                        <div className="text-xs text-gray-500">{mp.length} project{mp.length !== 1 ? 's' : ''} · {formatCurrency(totalRev)} revenue</div>
                      </div>
                      <div className={`text-sm font-semibold ${mp.length > 0 ? getMarginColor(avgM) : 'text-gray-300'}`}>
                        {mp.length > 0 ? `${avgM.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Project Status Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Pipeline</h3>
                <div className="space-y-4">
                  {Object.entries(PROJECT_STATUS).map(([key, val]) => {
                    const count = savedProjects.filter(p => p.status === key).length
                    const pct = savedProjects.length > 0 ? (count / savedProjects.length * 100) : 0
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{val.label}</span>
                          <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              key === 'completed' ? 'bg-green-500' :
                              key === 'in_progress' ? 'bg-yellow-500' :
                              key === 'closed' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Revenue Pipeline', value: formatCurrency(kpis.totalRevenue) },
                    { label: 'Total Projects', value: kpis.totalProjects },
                    { label: 'Average Margin', value: `${kpis.avgMargin.toFixed(1)}%`, color: getMarginColor(kpis.avgMargin) },
                    { label: 'Completed Projects', value: kpis.completed },
                    { label: 'In Progress', value: kpis.inProgress },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.color || 'text-gray-900'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Save Modal ─────────────────────────────────────────────────── */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {currentProjectId ? 'Update Project' : 'Save New Project'}
              </h2>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., 48 Blue Gill Lane Plymouth"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="input-field"
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Model:</span>
                  <span className="font-medium">{MODELS[selectedModel].name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">COGS:</span>
                  <span className="font-medium">{formatCurrency(totals.actualGrandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">List Price:</span>
                  <span className="font-medium">{formatCurrency(listPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Margin:</span>
                  <span className={`font-medium ${getMarginColor(marginPercent)}`}>
                    {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium">{PROJECT_STATUS[projectStatus]?.label}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button className="btn-secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={() => saveProject(projectName)}
                  disabled={!projectName.trim() || saving}
                >
                  {saving ? 'Saving...' : currentProjectId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Change Order Modal ─────────────────────────────────────────── */}
        {showChangeOrderModal && (
          <ChangeOrderModal
            onAdd={addChangeOrder}
            onClose={() => setShowChangeOrderModal(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

// ─── Change Order Modal Component ────────────────────────────────────────────

function ChangeOrderModal({ onAdd, onClose }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')

  const handleSubmit = () => {
    if (!description.trim() || !amount) return
    onAdd({ description: description.trim(), amount: parseInt(amount) || 0, category })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Change Order</h2>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="e.g., Upgraded countertops"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Amount *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field"
              placeholder="Positive = cost increase, negative = savings"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              <option value="">Select category</option>
              {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!description.trim() || !amount}
          >
            Add Change Order
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
