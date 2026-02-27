import { useState, useMemo, useEffect } from 'react'

// Model configurations
const MODELS = {
  essential: { name: 'Dwell Essential', sqft: 472, beds: 1, baths: 1, listPrice: 141000, hasDeck: true },
  classic: { name: 'Dwell Classic', sqft: 575, beds: 2, baths: 1, listPrice: 172000, hasDeck: true },
  deluxe: { name: 'Dwell Deluxe', sqft: 600, beds: 2, baths: 1, listPrice: 186000, hasDeck: false },
  prime: { name: 'Dwell Prime', sqft: 900, beds: 2, baths: 2, listPrice: 270000, hasDeck: true },
}

// Project status options
const PROJECT_STATUS = {
  estimated: 'Estimated',
  in_progress: 'In Progress',
  completed: 'Completed'
}

// Default cost estimates per category
const getDefaultCosts = (model) => {
  const m = MODELS[model]
  const sqft = m.sqft
  const baths = m.baths
  
  return {
    // Structure
    structure: {
      steelMaterial: { 
        value: sqft * 38, 
        actualValue: null,
        min: 0, 
        max: sqft * 50, 
        unit: `$38/sqft × ${sqft}` 
      },
      steelLabor: { 
        value: sqft * 6, 
        actualValue: null,
        min: 0, 
        max: sqft * 10, 
        unit: `$6/sqft × ${sqft}` 
      },
    },
    // Electrical
    electrical: {
      electricalPackage: { 
        value: Math.round(sqft * 22.6), 
        actualValue: null,
        min: 0, 
        max: Math.round(sqft * 30), 
        unit: `~$22.60/sqft` 
      },
    },
    // HVAC
    hvac: {
      miniSplitSystem: { 
        value: baths === 1 ? 5000 : 8000, 
        actualValue: null,
        min: 0,
        max: baths === 1 ? 7000 : 9000,
        unit: `${baths === 1 ? '1-2 bed/1 bath' : '2 bed/2 bath'}`
      },
    },
    // Roofing
    roofing: {
      shingles: { 
        value: Math.round(sqft * 1.15 * 4.25), 
        actualValue: null,
        min: 0, 
        max: Math.round(sqft * 1.15 * 5), 
        unit: 'GAF Timberline HDZ' 
      },
      roofingLabor: { 
        value: Math.round(sqft * 1.15 * 4), 
        actualValue: null,
        min: 0, 
        max: Math.round(sqft * 1.15 * 5), 
        unit: 'Installation' 
      },
    },
    // Kitchen
    kitchen: {
      cabinets: { 
        value: 5000, 
        actualValue: null,
        min: 0, 
        max: 6000, 
        unit: 'Shaker w/ soft close' 
      },
      countertops: { 
        value: 1300, 
        actualValue: null,
        min: 0, 
        max: 1600, 
        unit: 'Quartz 20 sqft' 
      },
    },
    // Bathroom
    bathroom: {
      vanity: { 
        value: 600 * baths, 
        actualValue: null,
        min: 0, 
        max: 800 * baths, 
        unit: `Vanity w/ marble (${baths})` 
      },
      toilet: { 
        value: 275 * baths, 
        actualValue: null,
        min: 0, 
        max: 350 * baths, 
        unit: `American Standard (${baths})` 
      },
    },
    // Sitework
    sitework: {
      foundation: { 
        value: 15000, 
        actualValue: null,
        min: 0, 
        max: 35000, 
        unit: 'Slab/pier foundation' 
      },
      permits: { 
        value: 5000, 
        actualValue: null,
        min: 0, 
        max: 15000, 
        unit: 'Permits & fees' 
      },
    },
  }
}

const CATEGORY_LABELS = {
  structure: '🏗️ Structure (Steel)',
  electrical: '⚡ Electrical',
  hvac: '❄️ HVAC',
  roofing: '🏠 Roofing',
  kitchen: '🍳 Kitchen',
  bathroom: '🚿 Bathroom',
  sitework: '🚜 Sitework',
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
  foundation: 'Foundation',
  permits: 'Permits & Fees',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function getVarianceColor(variance) {
  if (Math.abs(variance) <= 5) return 'text-green-600'
  if (Math.abs(variance) <= 10) return 'text-yellow-600'
  return 'text-red-600'
}

function getVarianceBackground(variance) {
  if (Math.abs(variance) <= 5) return 'bg-green-50'
  if (Math.abs(variance) <= 10) return 'bg-yellow-50'
  return 'bg-red-50'
}

function App() {
  const [selectedModel, setSelectedModel] = useState('classic')
  const [costs, setCosts] = useState(() => getDefaultCosts('classic'))
  const [listPrice, setListPrice] = useState(MODELS.classic.listPrice)
  const [includeDeck, setIncludeDeck] = useState(true)
  const [projectName, setProjectName] = useState('')
  const [projectStatus, setProjectStatus] = useState('estimated')
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [savedProjects, setSavedProjects] = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [activeTab, setActiveTab] = useState('calculator')
  const [loading, setLoading] = useState(true)

  // Load projects from server on mount
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        const mapped = (data || []).map(p => ({
          id: p.id,
          name: p.name,
          model: p.model,
          costs: p.costs,
          listPrice: p.list_price,
          includeDeck: p.include_deck,
          totalCogs: p.total_cogs,
          margin: p.margin,
          status: p.status || 'estimated',
          savedAt: p.created_at
        }))
        setSavedProjects(mapped)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load projects:', err)
        setLoading(false)
      })
  }, [])

  const handleModelChange = (model) => {
    setSelectedModel(model)
    setCosts(getDefaultCosts(model))
    setListPrice(MODELS[model].listPrice)
    setIncludeDeck(MODELS[model].hasDeck)
  }

  const saveProject = async (name) => {
    const project = {
      name,
      model: selectedModel,
      costs,
      listPrice,
      includeDeck,
      totalCogs: totals.grandTotal,
      margin: listPrice - totals.grandTotal,
      status: projectStatus
    }

    try {
      const method = currentProjectId ? 'PUT' : 'POST'
      const url = currentProjectId ? `/api/projects/${currentProjectId}` : '/api/projects'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      })
      const saved = await res.json()
      
      if (currentProjectId) {
        setSavedProjects(prev => prev.map(p => p.id === currentProjectId ? saved : p))
      } else {
        setSavedProjects(prev => [...prev, saved])
        setCurrentProjectId(saved.id)
      }
      
      setProjectName(name)
      setShowSaveModal(false)
    } catch (err) {
      console.error('Failed to save project:', err)
      alert('Failed to save project')
    }
  }

  const loadProject = (project) => {
    setSelectedModel(project.model)
    setCosts(project.costs)
    setListPrice(project.listPrice)
    setIncludeDeck(project.includeDeck)
    setProjectName(project.name)
    setProjectStatus(project.status || 'estimated')
    setCurrentProjectId(project.id)
  }

  const handleCostChange = (category, itemKey, field, newValue) => {
    const numValue = field === 'value' || field === 'actualValue' ? (parseInt(newValue) || 0) : newValue
    setCosts(prev => {
      const newCosts = { ...prev }
      newCosts[category] = { ...prev[category] }
      newCosts[category][itemKey] = { 
        ...prev[category][itemKey], 
        [field]: numValue 
      }
      return newCosts
    })
  }

  const totals = useMemo(() => {
    const categoryTotals = {}
    const actualCategoryTotals = {}
    let grandTotal = 0
    let actualGrandTotal = 0

    Object.entries(costs).forEach(([category, items]) => {
      if (!items || Object.keys(items).length === 0) return
      
      let catTotal = 0
      let actualCatTotal = 0
      Object.values(items).forEach(item => {
        catTotal += item.value || 0
        actualCatTotal += item.actualValue || item.value || 0
      })
      categoryTotals[category] = catTotal
      actualCategoryTotals[category] = actualCatTotal
      grandTotal += catTotal
      actualGrandTotal += actualCatTotal
    })

    return { 
      categoryTotals, 
      actualCategoryTotals,
      grandTotal, 
      actualGrandTotal,
      variance: ((actualGrandTotal - grandTotal) / grandTotal * 100) || 0
    }
  }, [costs])

  const margin = listPrice - totals.actualGrandTotal
  const marginPercent = ((margin / listPrice) * 100).toFixed(1)

  if (loading) {
    return (
      <div className="app flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading COGS Calculator...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <span className="text-blue-600">MassDwell</span> COGS Calculator
              </h1>
              {projectName && (
                <p className="text-sm text-gray-600 mt-1">
                  Currently editing: <span className="font-medium">{projectName}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    projectStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    projectStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {PROJECT_STATUS[projectStatus]}
                  </span>
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              {/* Project Selector Dropdown */}
              <div className="relative">
                <select 
                  className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      const project = savedProjects.find(p => p.id === e.target.value)
                      if (project) loadProject(project)
                    }
                  }}
                  value={currentProjectId || ''}
                >
                  <option value="">Select Project ({savedProjects.length})</option>
                  {savedProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} | {MODELS[project.model]?.name} | {formatCurrency(project.totalCogs)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                onClick={() => setShowSaveModal(true)}
              >
                {currentProjectId ? 'Update Project' : 'Save Project'}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-6 mt-4 border-b">
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calculator' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('calculator')}
            >
              Calculator
            </button>
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'calculator' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Sidebar - Model & Status */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium text-gray-900 mb-4">Model Selection</h3>
                <div className="space-y-2">
                  {Object.entries(MODELS).map(([key, model]) => (
                    <button
                      key={key}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedModel === key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleModelChange(key)}
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-gray-600">
                        {model.sqft} sqft • {model.beds}bd/{model.baths}ba
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium text-gray-900 mb-4">Project Status</h3>
                <select
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(PROJECT_STATUS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Main Content - Cost Items */}
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(costs).map(([category, items]) => {
                if (!items || Object.keys(items).length === 0) return null

                return (
                  <div key={category} className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {CATEGORY_LABELS[category]}
                      </h3>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          Est: {formatCurrency(totals.categoryTotals[category] || 0)}
                        </div>
                        {totals.actualCategoryTotals[category] !== totals.categoryTotals[category] && (
                          <div className="text-sm text-gray-600">
                            Act: {formatCurrency(totals.actualCategoryTotals[category] || 0)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      {Object.entries(items).map(([key, item]) => {
                        const variance = item.actualValue && item.value 
                          ? ((item.actualValue - item.value) / item.value * 100)
                          : 0
                        const hasActual = item.actualValue !== null && item.actualValue !== undefined

                        return (
                          <div 
                            key={key} 
                            className={`grid grid-cols-12 gap-4 items-center p-3 rounded-lg border ${
                              hasActual ? getVarianceBackground(variance) : 'border-gray-100'
                            }`}
                          >
                            <div className="col-span-3">
                              <div className="font-medium text-sm text-gray-900">
                                {ITEM_LABELS[key] || key}
                              </div>
                              <div className="text-xs text-gray-500">{item.unit}</div>
                            </div>
                            
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500 block">Estimated</label>
                              <input
                                type="number"
                                value={item.value || 0}
                                onChange={(e) => handleCostChange(category, key, 'value', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500 block">Actual</label>
                              <input
                                type="number"
                                value={item.actualValue || ''}
                                onChange={(e) => handleCostChange(category, key, 'actualValue', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter actual"
                              />
                            </div>
                            
                            <div className="col-span-2">
                              {hasActual && variance !== 0 && (
                                <div className={`text-sm font-medium ${getVarianceColor(variance)}`}>
                                  {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                </div>
                              )}
                            </div>
                            
                            <div className="col-span-3">
                              <input
                                type="range"
                                min={item.min || 0}
                                max={item.max || item.value * 2}
                                value={item.value || 0}
                                onChange={(e) => handleCostChange(category, key, 'value', e.target.value)}
                                className="w-full"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right Sidebar - Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Estimated Total:</span>
                    <span className="font-medium">{formatCurrency(totals.grandTotal)}</span>
                  </div>
                  
                  {totals.actualGrandTotal !== totals.grandTotal && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Actual Total:</span>
                        <span className="font-medium">{formatCurrency(totals.actualGrandTotal)}</span>
                      </div>
                      
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Variance:</span>
                        <span className={`font-medium ${getVarianceColor(totals.variance)}`}>
                          {totals.variance > 0 ? '+' : ''}{totals.variance.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="mb-3">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Selling Price</label>
                    <input
                      type="text"
                      value={formatCurrency(listPrice)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0
                        setListPrice(val)
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gross Margin:</span>
                      <span className={`font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(margin)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Margin %:</span>
                      <span className={`font-medium ${parseFloat(marginPercent) >= 15 ? 'text-green-600' : 'text-red-600'}`}>
                        {marginPercent}%
                      </span>
                    </div>
                    
                    {parseFloat(marginPercent) < 15 && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        ⚠️ Margin below 15% target
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Overview</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Projects:</span>
                  <span className="font-medium">{savedProjects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium">
                    {savedProjects.filter(p => p.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In Progress:</span>
                  <span className="font-medium">
                    {savedProjects.filter(p => p.status === 'in_progress').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Model Performance</h3>
              {Object.entries(MODELS).map(([key, model]) => {
                const modelProjects = savedProjects.filter(p => p.model === key)
                const avgMargin = modelProjects.length > 0 
                  ? modelProjects.reduce((sum, p) => sum + (p.margin || 0), 0) / modelProjects.length
                  : 0
                
                return (
                  <div key={key} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">{model.name}:</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{modelProjects.length} projects</div>
                      {avgMargin > 0 && (
                        <div className="text-xs text-gray-500">
                          {((avgMargin / (model.listPrice || 1)) * 100).toFixed(1)}% avg margin
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Projects</h3>
              <div className="space-y-2">
                {savedProjects.slice(0, 5).map(project => (
                  <div key={project.id} className="text-sm">
                    <div className="font-medium truncate">{project.name}</div>
                    <div className="text-gray-500 text-xs">
                      {MODELS[project.model]?.name} • {formatCurrency(project.totalCogs)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {currentProjectId ? 'Update Project' : 'Save New Project'}
            </h2>
            
            <input
              type="text"
              placeholder="Project name (e.g., 48 Blue Gill Lane Plymouth)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
              <div>Model: {MODELS[selectedModel].name}</div>
              <div>COGS: {formatCurrency(totals.actualGrandTotal)}</div>
              <div>Margin: {formatCurrency(listPrice - totals.actualGrandTotal)}</div>
              <div>Status: {PROJECT_STATUS[projectStatus]}</div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                onClick={() => saveProject(projectName)}
                disabled={!projectName.trim()}
              >
                {currentProjectId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App