import { useState, useMemo, useEffect } from 'react'

// Model configurations
const MODELS = {
  essential: { name: 'Dwell Essential', sqft: 472, beds: 1, baths: 1, listPrice: 141000, hasDeck: true },
  classic: { name: 'Dwell Classic', sqft: 575, beds: 2, baths: 1, listPrice: 172000, hasDeck: true },
  deluxe: { name: 'Dwell Deluxe', sqft: 600, beds: 2, baths: 1, listPrice: 186000, hasDeck: false },
  prime: { name: 'Dwell Prime', sqft: 900, beds: 2, baths: 2, listPrice: 270000, hasDeck: true },
}

// Default cost estimates per category
const getDefaultCosts = (model) => {
  const m = MODELS[model]
  const sqft = m.sqft
  const baths = m.baths
  
  return {
    // Structure
    structure: {
      steelMaterial: { value: sqft * 38, min: 0, max: sqft * 50, unit: `$38/sqft × ${sqft}` },
      steelLabor: { value: sqft * 6, min: 0, max: sqft * 10, unit: `$6/sqft × ${sqft}` },
    },
    // Electrical
    electrical: {
      electricalPackage: { value: Math.round(sqft * 22.6), min: 0, max: Math.round(sqft * 30), unit: `~$22.60/sqft` },
    },
    // HVAC
    hvac: {
      miniSplitSystem: { 
        value: baths === 1 ? 5000 : 8000, 
        min: 0,
        max: baths === 1 ? 7000 : 9000,
        unit: `${baths === 1 ? '1-2 bed/1 bath' : '2 bed/2 bath'}`
      },
    },
    // Roofing
    roofing: {
      shingles: { value: Math.round(sqft * 1.15 * 4.25), min: 0, max: Math.round(sqft * 1.15 * 5), unit: 'GAF Timberline HDZ' },
      roofingLabor: { value: Math.round(sqft * 1.15 * 4), min: 0, max: Math.round(sqft * 1.15 * 5), unit: 'Installation' },
      accessories: { value: Math.round(sqft * 1.15 * 1.5), min: 0, max: Math.round(sqft * 1.15 * 2), unit: 'Underlayment, flashing' },
    },
    // Siding
    siding: {
      sidingMaterial: { value: Math.round(sqft * 1.6 * 7), min: 0, max: Math.round(sqft * 1.6 * 10), unit: 'Cement board or vinyl' },
      sidingLabor: { value: Math.round(sqft * 1.6 * 4.5), min: 0, max: Math.round(sqft * 1.6 * 6), unit: 'Installation' },
    },
    // Windows
    windows: {
      windows: { 
        value: (model === 'prime' ? 11 : model === 'essential' ? 7 : 9) * 450,
        min: 0,
        max: (model === 'prime' ? 12 : model === 'essential' ? 8 : 10) * 700,
        unit: `${model === 'prime' ? '10-12' : model === 'essential' ? '6-8' : '8-10'} windows`
      },
    },
    // Exterior
    exterior: {
      entryDoor: { value: 1200, min: 0, max: 1500, unit: 'French style w/ frame' },
      slidingDoor: { value: 1500, min: 0, max: 2000, unit: 'Patio door' },
      hardware: { value: 200, min: 0, max: 250, unit: 'Schlage Century + Latitude' },
      doorInstall: { value: 500, min: 0, max: 800, unit: 'Installation' },
      extLighting: { value: 250, min: 0, max: 450, unit: 'Progress Lighting' },
    },
    // Flooring
    flooring: {
      lvpMaterial: { value: Math.round(sqft * 4), min: 0, max: Math.round(sqft * 5), unit: 'Emser Emcore SPC LVP' },
      flooringLabor: { value: Math.round(sqft * 3), min: 0, max: Math.round(sqft * 4), unit: 'Installation' },
      underlayment: { value: Math.round(sqft * 0.75), min: 0, max: Math.round(sqft * 1), unit: 'Underlayment' },
    },
    // Interior Doors & Trim
    interiorDoors: {
      doors: { value: 1500, min: 0, max: 2500, unit: 'Interior + closet doors' },
      hardware: { value: 200, min: 0, max: 300, unit: 'Schlage Latitude levers' },
      trim: { value: 800, min: 0, max: 1200, unit: 'Baseboard + door trim' },
      doorInstall: { value: 500, min: 0, max: 750, unit: 'Installation' },
    },
    // Drywall & Paint
    drywallPaint: {
      drywallMaterial: { value: Math.round(sqft * 3 * 2), min: 0, max: Math.round(sqft * 3 * 2.5), unit: 'Drywall material' },
      drywallLabor: { value: Math.round(sqft * 3 * 3), min: 0, max: Math.round(sqft * 3 * 4), unit: 'Hanging + finish' },
      paint: { value: Math.round(sqft * 3 * 0.15 * 50), min: 0, max: Math.round(sqft * 3 * 0.15 * 60), unit: 'Sherwin Williams' },
      paintLabor: { value: Math.round(sqft * 3 * 3), min: 0, max: Math.round(sqft * 3 * 4), unit: 'Painting labor' },
    },
    // Kitchen
    kitchen: {
      cabinets: { value: 5000, min: 0, max: 6000, unit: 'Shaker w/ soft close' },
      cabinetInstall: { value: 1000, min: 0, max: 1500, unit: 'Installation' },
      countertops: { value: 1300, min: 0, max: 1600, unit: 'Quartz 20 sqft' },
      backsplash: { value: 500, min: 0, max: 650, unit: 'Emser Catch subway' },
      sink: { value: 350, min: 0, max: 400, unit: '30" SS undermount' },
      faucet: { value: 325, min: 0, max: 400, unit: 'Moen Sleek' },
      pulls: { value: 75, min: 0, max: 100, unit: 'Miseno bar pulls' },
      fixtureInstall: { value: 225, min: 0, max: 300, unit: 'Installation' },
    },
    // Appliances
    appliances: {
      refrigerator: { value: 1500, min: 0, max: 1800, unit: 'LG 30" SS' },
      microwave: { value: 350, min: 0, max: 500, unit: 'LG Over-the-range' },
      dishwasher: { value: 750, min: 0, max: 900, unit: 'LG 24" SS' },
      range: { value: 850, min: 0, max: 1000, unit: 'LG 30" Electric' },
      washer: { value: 950, min: 0, max: 1100, unit: 'LG 24"' },
      dryer: { value: 950, min: 0, max: 1100, unit: 'LG 24"' },
    },
    // Bathroom (per bathroom)
    bathroom: {
      vanity: { value: 600 * baths, min: 0, max: 800 * baths, unit: `Vanity w/ marble (${baths})` },
      toilet: { value: 275 * baths, min: 0, max: 350 * baths, unit: `American Standard (${baths})` },
      faucet: { value: 225 * baths, min: 0, max: 300 * baths, unit: `Moen Voss (${baths})` },
      showerTrim: { value: 300 * baths, min: 0, max: 400 * baths, unit: `Moen Voss trim + head (${baths})` },
      vanityLight: { value: 150 * baths, min: 0, max: 200 * baths, unit: `Progress Lighting (${baths})` },
      accessories: { value: 120 * baths, min: 0, max: 160 * baths, unit: `TP holder, rod, etc. (${baths})` },
      bathInstall: { value: 750 * baths, min: 0, max: 1000 * baths, unit: `Installation (${baths})` },
    },
    // Shower/Tub
    shower: {
      showerPan: { value: 350 * baths, min: 0, max: 500 * baths, unit: `Shower base (${baths})` },
      floorTile: { value: 225 * baths, min: 0, max: 300 * baths, unit: `Emser hex tile (${baths})` },
      wallTile: { value: 600 * baths, min: 0, max: 800 * baths, unit: `Emser subway ~50sf (${baths})` },
      valve: { value: 225 * baths, min: 0, max: 300 * baths, unit: `Valve + rough-in (${baths})` },
    },
    // Plumbing
    plumbing: {
      kitchenRoughIn: { value: 2000, min: 0, max: 2500, unit: 'Kitchen rough-in' },
      bathRoughIn: { value: 2000 * baths, min: 0, max: 2500 * baths, unit: `Bath rough-in (${baths})` },
      laundryRoughIn: { value: 750, min: 0, max: 1000, unit: 'Laundry rough-in' },
      waterHeater: { value: 1150, min: 0, max: 1500, unit: 'Tankless or 40gal' },
      finishPlumbing: { value: 750, min: 0, max: 1000, unit: 'Connections' },
    },
    // Insulation
    insulation: {
      wallInsulation: { value: Math.round(sqft * 1.6 * 2.25), min: 0, max: Math.round(sqft * 1.6 * 3), unit: 'Spray foam or batt' },
      ceilingInsulation: { value: Math.round(sqft * 2.25), min: 0, max: Math.round(sqft * 3), unit: 'Ceiling insulation' },
    },
    // Deck (optional)
    deck: m.hasDeck ? {
      deckMaterial: { value: 234 * 20, min: 0, max: 234 * 25, unit: '234 sqft composite' },
      railing: { value: 50 * 75, min: 0, max: 50 * 100, unit: '~50 LF railing' },
    } : {},
    // Sitework
    sitework: {
      foundation: { value: 15000, min: 0, max: 35000, unit: 'Slab/pier foundation' },
      grading: { value: 3000, min: 0, max: 8000, unit: 'Site grading & prep' },
      utilityTrenching: { value: 4000, min: 0, max: 10000, unit: 'Utility trenching' },
      electricalHookup: { value: 3500, min: 0, max: 8000, unit: 'Electrical connection' },
      waterHookup: { value: 2500, min: 0, max: 6000, unit: 'Water connection' },
      sewerHookup: { value: 4000, min: 0, max: 12000, unit: 'Sewer/septic connection' },
      permits: { value: 5000, min: 0, max: 15000, unit: 'Permits & fees' },
    },
  }
}

const CATEGORY_LABELS = {
  structure: '🏗️ Structure (Steel)',
  electrical: '⚡ Electrical',
  hvac: '❄️ HVAC',
  roofing: '🏠 Roofing',
  siding: '🧱 Siding',
  windows: '🪟 Windows',
  exterior: '🚪 Exterior Doors & Lighting',
  flooring: '🪵 Interior Flooring',
  interiorDoors: '🚪 Interior Doors & Trim',
  drywallPaint: '🎨 Drywall & Paint',
  kitchen: '🍳 Kitchen',
  appliances: '🧊 Appliances (LG)',
  bathroom: '🚿 Bathroom Fixtures',
  shower: '🛁 Shower/Tub',
  plumbing: '🔧 Plumbing',
  insulation: '🧤 Insulation',
  deck: '🌳 Deck',
  sitework: '🚜 Sitework',
}

const ITEM_LABELS = {
  steelMaterial: 'Steel Material',
  steelLabor: 'Steel Labor',
  electricalPackage: 'Electrical Package',
  miniSplitSystem: 'Mini Split System',
  shingles: 'Shingles (GAF)',
  roofingLabor: 'Roofing Labor',
  accessories: 'Accessories',
  sidingMaterial: 'Siding Material',
  sidingLabor: 'Siding Labor',
  windows: 'Windows',
  entryDoor: 'Entry Door',
  slidingDoor: 'Sliding Patio Door',
  hardware: 'Hardware',
  doorInstall: 'Door Installation',
  extLighting: 'Exterior Lighting',
  lvpMaterial: 'LVP Material',
  flooringLabor: 'Flooring Labor',
  underlayment: 'Underlayment',
  doors: 'Doors',
  trim: 'Trim',
  drywallMaterial: 'Drywall Material',
  drywallLabor: 'Drywall Labor',
  paint: 'Paint',
  paintLabor: 'Paint Labor',
  cabinets: 'Cabinets',
  cabinetInstall: 'Cabinet Install',
  countertops: 'Countertops',
  backsplash: 'Backsplash',
  sink: 'Sink',
  faucet: 'Faucet',
  pulls: 'Cabinet Pulls',
  fixtureInstall: 'Fixture Install',
  refrigerator: 'Refrigerator',
  microwave: 'Microwave',
  dishwasher: 'Dishwasher',
  range: 'Range',
  washer: 'Washer',
  dryer: 'Dryer',
  vanity: 'Vanity',
  toilet: 'Toilet',
  showerTrim: 'Shower Trim + Head',
  vanityLight: 'Vanity Light',
  bathInstall: 'Bath Install',
  showerPan: 'Shower Pan',
  floorTile: 'Floor Tile',
  wallTile: 'Wall Tile',
  valve: 'Valve & Rough-in',
  kitchenRoughIn: 'Kitchen Rough-in',
  bathRoughIn: 'Bath Rough-in',
  laundryRoughIn: 'Laundry Rough-in',
  waterHeater: 'Water Heater',
  finishPlumbing: 'Finish Plumbing',
  wallInsulation: 'Wall Insulation',
  ceilingInsulation: 'Ceiling Insulation',
  deckMaterial: 'Deck Material',
  railing: 'Railing',
  foundation: 'Foundation',
  grading: 'Site Grading',
  utilityTrenching: 'Utility Trenching',
  electricalHookup: 'Electrical Hookup',
  waterHookup: 'Water Hookup',
  sewerHookup: 'Sewer/Septic Hookup',
  permits: 'Permits & Fees',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function App() {
  const [selectedModel, setSelectedModel] = useState('classic')
  const [costs, setCosts] = useState(() => getDefaultCosts('classic'))
  const [listPrice, setListPrice] = useState(MODELS.classic.listPrice)
  const [includeDeck, setIncludeDeck] = useState(true)
  const [projectName, setProjectName] = useState('')
  const [savedProjects, setSavedProjects] = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load projects from server on mount
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        // Map Supabase column names to frontend format
        const mapped = (data || []).map(p => ({
          id: p.id,
          name: p.name,
          model: p.model,
          costs: p.costs,
          listPrice: p.list_price,
          includeDeck: p.include_deck,
          totalCogs: p.total_cogs,
          margin: p.margin,
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
    }
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      })
      const saved = await res.json()
      setSavedProjects(prev => [...prev, saved])
      setShowSaveModal(false)
      setProjectName('')
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
    setShowLoadModal(false)
  }

  const deleteProject = async (id) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      setSavedProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete project:', err)
      alert('Failed to delete project')
    }
  }

  const handleCostChange = (category, itemKey, newValue) => {
    const numValue = parseInt(newValue) || 0
    setCosts(prev => {
      const newCosts = { ...prev }
      newCosts[category] = { ...prev[category] }
      newCosts[category][itemKey] = { 
        ...prev[category][itemKey], 
        value: numValue 
      }
      return newCosts
    })
  }

  const totals = useMemo(() => {
    const categoryTotals = {}
    let grandTotal = 0

    Object.entries(costs).forEach(([category, items]) => {
      if (category === 'deck' && !includeDeck) return
      if (!items || Object.keys(items).length === 0) return
      
      let catTotal = 0
      Object.values(items).forEach(item => {
        catTotal += item.value || 0
      })
      categoryTotals[category] = catTotal
      grandTotal += catTotal
    })

    return { categoryTotals, grandTotal }
  }, [costs, includeDeck])

  const margin = listPrice - totals.grandTotal
  const marginPercent = ((margin / listPrice) * 100).toFixed(1)

  const exportQuote = () => {
    const model = MODELS[selectedModel]
    let report = `MASSDWELL COGS QUOTE\n${'='.repeat(50)}\n\n`
    report += `Model: ${model.name}\n`
    report += `Square Footage: ${model.sqft} sqft\n`
    report += `Beds/Baths: ${model.beds}/${model.baths}\n`
    report += `Date: ${new Date().toLocaleDateString()}\n\n`
    report += `${'='.repeat(50)}\n`
    report += `COST BREAKDOWN\n`
    report += `${'='.repeat(50)}\n\n`

    Object.entries(costs).forEach(([category, items]) => {
      if (category === 'deck' && !includeDeck) return
      if (!items || Object.keys(items).length === 0) return
      
      report += `${CATEGORY_LABELS[category]}\n`
      report += `${'-'.repeat(40)}\n`
      Object.entries(items).forEach(([key, item]) => {
        const label = ITEM_LABELS[key] || key
        report += `  ${label.padEnd(25)} ${formatCurrency(item.value).padStart(10)}\n`
      })
      report += `  ${'SUBTOTAL'.padEnd(25)} ${formatCurrency(totals.categoryTotals[category]).padStart(10)}\n\n`
    })

    report += `${'='.repeat(50)}\n`
    report += `SUMMARY\n`
    report += `${'='.repeat(50)}\n\n`
    report += `Total COGS:     ${formatCurrency(totals.grandTotal)}\n`
    report += `List Price:     ${formatCurrency(listPrice)}\n`
    report += `Gross Margin:   ${formatCurrency(margin)} (${marginPercent}%)\n`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MassDwell_COGS_${model.name.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  const exportPDF = () => {
    window.print()
  }

  return (
    <div className="app">
      <header>
        <h1><span className="logo">MassDwell</span> COGS Calculator</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="header-btn" onClick={() => setShowLoadModal(true)}>
            📂 Load ({savedProjects.length})
          </button>
          <button className="header-btn save" onClick={() => setShowSaveModal(true)}>
            💾 Save Project
          </button>
        </div>
      </header>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Save Project</h2>
            <input
              type="text"
              placeholder="Project name (e.g., Bob Warren - Mattapoisett)"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <div className="modal-info">
              <div>Model: {MODELS[selectedModel].name}</div>
              <div>COGS: {formatCurrency(totals.grandTotal)}</div>
              <div>Margin: {formatCurrency(listPrice - totals.grandTotal)}</div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button 
                className="modal-btn save" 
                onClick={() => saveProject(projectName)}
                disabled={!projectName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Saved Projects</h2>
            {savedProjects.length === 0 ? (
              <div className="no-projects">No saved projects yet</div>
            ) : (
              <div className="project-list">
                {savedProjects.map(project => (
                  <div key={project.id} className="project-item">
                    <div className="project-info" onClick={() => loadProject(project)}>
                      <div className="project-name">{project.name}</div>
                      <div className="project-details">
                        {MODELS[project.model]?.name} · {formatCurrency(project.totalCogs)} COGS · {formatCurrency(project.margin)} margin
                      </div>
                      <div className="project-date">
                        {new Date(project.savedAt).toLocaleDateString()} {new Date(project.savedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <button className="delete-btn" onClick={() => deleteProject(project.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowLoadModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        {/* Left Sidebar - Model Selection */}
        <div className="sidebar">
          <h2>Select Model</h2>
          <div className="model-selector">
            {Object.entries(MODELS).map(([key, model]) => (
              <button
                key={key}
                className={`model-btn ${selectedModel === key ? 'active' : ''}`}
                onClick={() => handleModelChange(key)}
              >
                <span className="name">{model.name}</span>
                <span className="details">
                  {model.sqft} sqft · {model.beds}bd/{model.baths}ba · {formatCurrency(model.listPrice)}
                </span>
              </button>
            ))}
          </div>

          <h2>Options</h2>
          <div className="toggle-wrapper" style={{ marginBottom: '1rem' }}>
            <div 
              className={`toggle ${includeDeck ? 'active' : ''}`}
              onClick={() => MODELS[selectedModel].hasDeck && setIncludeDeck(!includeDeck)}
              style={{ opacity: MODELS[selectedModel].hasDeck ? 1 : 0.5 }}
            />
            <span>Include Deck</span>
          </div>

          <div className="quick-actions">
            <button className="quick-btn" onClick={() => setCosts(getDefaultCosts(selectedModel))}>
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Main Content - Line Items */}
        <div className="main-content">
          {Object.entries(costs).map(([category, items]) => {
            if (category === 'deck' && !includeDeck) return null
            if (!items || Object.keys(items).length === 0) return null

            return (
              <div key={category} className="category">
                <div className="category-header">
                  <h3>{CATEGORY_LABELS[category]}</h3>
                  <span className="category-total">{formatCurrency(totals.categoryTotals[category] || 0)}</span>
                </div>
                {Object.entries(items).map(([key, item]) => (
                  <div key={key} className="line-item">
                    <div className="line-item-name">
                      {ITEM_LABELS[key] || key}
                      <div className="unit">{item.unit}</div>
                    </div>
                    <input
                      type="range"
                      min={item.min || 0}
                      max={item.max || item.value * 2}
                      value={item.value}
                      onChange={(e) => handleCostChange(category, key, e.target.value)}
                    />
                    <div className="line-item-cost">
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => handleCostChange(category, key, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Right Sidebar - Summary */}
        <div className="summary-panel">
          <h2>💰 Cost Summary</h2>
          
          {Object.entries(totals.categoryTotals).map(([category, total]) => (
            <div key={category} className="summary-row">
              <span className="label">{CATEGORY_LABELS[category]?.replace(/[^\w\s()/-]/g, '').trim() || category}</span>
              <span className="value">{formatCurrency(total)}</span>
            </div>
          ))}
          
          <div className="summary-row total">
            <span className="label">Total COGS</span>
            <span className="value">{formatCurrency(totals.grandTotal)}</span>
          </div>

          <div className="margin-section">
            <h3>Margin Analysis</h3>
            
            <div className="price-input-wrapper">
              <label>Selling Price</label>
              <input
                type="text"
                className="price-input"
                value={formatCurrency(listPrice)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0
                  setListPrice(val)
                }}
              />
            </div>

            <div className="margin-display">
              <div className="margin-box">
                <div className="label">Gross Margin</div>
                <div className={`value ${margin >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(margin)}
                </div>
              </div>
              <div className="margin-box">
                <div className="label">Margin %</div>
                <div className={`value ${margin >= 0 ? 'positive' : 'negative'}`}>
                  {marginPercent}%
                </div>
              </div>
            </div>

            <div className="margin-bar">
              <div 
                className="margin-bar-fill" 
                style={{ width: `${Math.min(Math.max(parseFloat(marginPercent), 0), 50) * 2}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="export-btn" onClick={exportPDF}>
              📑 Export PDF
            </button>
            <button className="export-btn secondary" onClick={exportQuote}>
              📄 Text
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
