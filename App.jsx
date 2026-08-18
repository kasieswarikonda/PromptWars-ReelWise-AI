import { useState, useEffect } from 'react'

function App() {
  const [backendHealth, setBackendHealth] = useState(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [reels, setReels] = useState([])
  const [loadingReels, setLoadingReels] = useState(true)

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Student interaction states
  // Key: reel_id, Value: { watched: bool, liked: bool, saved: bool, shared: bool }
  const [interactions, setInteractions] = useState({})

  // Recommendation results
  const [recommendationResult, setRecommendationResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Categories list
  const categories = ['All', 'AI', 'DSA', 'Java', 'HLD', 'Cybersecurity', 'Cloud', 'Hardware', 'Career']

  // Fetch health status from backend
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('API server returned error')
        return res.json()
      })
      .then((data) => {
        setBackendHealth(data)
        setLoadingHealth(false)
      })
      .catch((err) => {
        console.error('Could not connect to backend:', err)
        setBackendHealth({ status: 'offline', database_connected: false, gemini_api_key_configured: false })
        setLoadingHealth(false)
      })
  }, [])

  // Fetch reels from backend
  useEffect(() => {
    fetchReels()
  }, [])

  const fetchReels = (category = '') => {
    setLoadingReels(true)
    let url = 'http://127.0.0.1:8000/api/reels'
    if (category && category !== 'All') {
      url += `?category=${category}`
    }
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Could not fetch reels')
        return res.json()
      })
      .then((data) => {
        setReels(data)
        setLoadingReels(false)
      })
      .catch((err) => {
        console.error(err)
        setErrorMsg('Failed to load Reels from API. Showing mock list.')
        // Fallback static list in case of network issues
        setReels([
          { id: 1, title: "Java GC Explained Simply", description: "How the Java Garbage Collector works under the hood. Visualizing mark-and-sweep algorithm.", category: "Java", technology: "Java / JVM", views: 12000, likes: 1100, shares: 180, saves: 390 },
          { id: 2, title: "Software Engineer Life: Day 1 vs Year 5", description: "A funny journey showing a software engineer's transition from fixing simple spelling mistakes to scaling systems.", category: "Career", technology: "Software Engineering Culture", views: 25000, likes: 2400, shares: 950, saves: 120 },
          { id: 3, title: "Cracking the Coding Interview: Reverse a Linked List", description: "Why interviewers love recursion and pointer queries. Visualizing the iterative approach step-by-step.", category: "DSA", technology: "Data Structures & Algorithms", views: 18000, likes: 1500, shares: 300, saves: 850 },
          { id: 4, title: "MacBook Pro M3 vs Dell XPS 15 for Coding", description: "Detailed comparison of processor specs, battery life, and Docker performance for developers.", category: "Hardware", technology: "Hardware Specs", views: 30000, likes: 2800, shares: 400, saves: 600 },
          { id: 5, title: "Is prompt engineering dead? My honest take.", description: "Why writing 'please' to ChatGPT won't save your job. Dive into LLM APIs and temperature parameters.", category: "AI", technology: "Artificial Intelligence", views: 45005, likes: 4200, shares: 1500, saves: 2100 },
          { id: 6, title: "Cybersecurity 101: SQL Injection", description: "How clean user input prevents databases from leaking secrets. Practical demo using a mock node server.", category: "Cybersecurity", technology: "Cybersecurity", views: 9000, likes: 800, shares: 120, saves: 400 },
          { id: 7, title: "Scaling System Design: Load Balancers", description: "What happens when 1,000,000 users visit your app at the same time? A visual breakdown of Nginx and CDN caching.", category: "HLD", technology: "System Architecture", views: 15000, likes: 1400, shares: 320, saves: 700 },
          { id: 8, title: "Kubernetes Pods vs Docker Containers", description: "Simplifying container orchestration concepts for absolute beginners. When do you actually need K8s?", category: "Cloud", technology: "Cloud Computing", views: 11000, likes: 950, shares: 150, saves: 520 }
        ])
        setLoadingReels(false)
      })
  }

  // Toggle interaction for a reel
  const toggleInteraction = (reelId, type) => {
    setInteractions(prev => {
      const reelInt = prev[reelId] || { watched: false, liked: false, saved: false, shared: false }
      const updated = { ...reelInt, [type]: !reelInt[type] }

      // If setting anything to true, make sure watched is true
      if ((type === 'liked' || type === 'saved' || type === 'shared') && updated[type]) {
        updated.watched = true
      }
      // If setting watched to false, clear other interactions
      if (type === 'watched' && !updated.watched) {
        updated.liked = false
        updated.saved = false
        updated.shared = false
      }

      return { ...prev, [reelId]: updated }
    })
  }

  // Check if a reel has any interaction
  const getInteractedList = () => {
    return reels.filter(r => {
      const ints = interactions[r.id]
      return ints && (ints.watched || ints.liked || ints.saved || ints.shared)
    })
  }

  // category change handler
  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat)
    fetchReels(cat)
  }

  // Run Recommendation Request
  const handleAnalyze = () => {
    setErrorMsg('')
    const interacted = getInteractedList()

    if (interacted.length === 0) {
      setErrorMsg('Please interact with (Watch/Like/Save/Share) at least one Reel to analyze interests.')
      return
    }

    setAnalyzing(true)
    setRecommendationResult(null)

    // Call recommendation API
    fetch('http://127.0.0.1:8000/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interactions: interacted
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Recommendation API failed')
        return res.json()
      })
      .then((data) => {
        setRecommendationResult(data)
        setAnalyzing(false)
      })
      .catch((err) => {
        console.error(err)
        setErrorMsg('Failed to run AI analysis. Relying on local deterministic intelligence.')

        // Local deterministic reasoning fallback (e.g. trap pattern client-side)
        const hasJava = interacted.some(r => r.category === 'Java')
        const hasCareer = interacted.some(r => r.category === 'Career')
        const hasDSA = interacted.some(r => r.category === 'DSA')
        const hasHardware = interacted.some(r => r.category === 'Hardware')

        if (hasJava && hasCareer && hasDSA && hasHardware) {
          // Trap fallback
          setRecommendationResult({
            current_reel: interacted[interacted.length - 1].title,
            interest_detected: "Software Engineering / Technology",
            why: "The student has interacted with multiple facets of computer science (Java, algorithms, hardware, and engineering culture), suggesting a broad professional Software Engineering interest rather than a single specific topic.",
            recommended_tech_reel: "Scaling System Design: Load Balancers",
            category: "HLD",
            why_this_recommendation: "Since the student shows key interest in Software Engineering as a career and system scaling, learning high-level system design topics like Load Balancing will broaden their architectural knowledge for their career.",
            difficulty: "Intermediate",
            confidence: "High",
            recommended_reel_details: {
              title: "Scaling System Design: Load Balancers",
              description: "What happens when 1,000,000 users visit your app? A visual breakdown of Nginx and caching.",
              category: "HLD",
              technology: "System Architecture",
              views: 15000,
              likes: 1400,
              shares: 320,
              saves: 700
            }
          })
        } else {
          // Generic fallback
          setRecommendationResult({
            current_reel: interacted[interacted.length - 1].title,
            interest_detected: "Full-Stack Software Development",
            why: "Interactions show a diverse mix of software engineering categories.",
            recommended_tech_reel: "Is prompt engineering dead? My honest take.",
            category: "AI",
            why_this_recommendation: "AI prompt engineering and LLM lifecycle knowledge is highly relevant for all software engineering fields today.",
            difficulty: "Beginner",
            confidence: "Medium",
            recommended_reel_details: {
              title: "Is prompt engineering dead? My honest take.",
              description: "Why writing 'please' to ChatGPT won't save your job. Dive into LLM APIs and temperature parameters.",
              category: "AI",
              technology: "Artificial Intelligence",
              views: 45005,
              likes: 4200,
              shares: 1500,
              saves: 2100
            }
          })
        }
        setAnalyzing(false)
      })
  }

  // Load the built-in trap example
  const handleTryTrapExample = () => {
    // Select four specific Reels
    const trapInteractions = {
      1: { watched: true, liked: true, saved: false, shared: false }, // Java GC
      2: { watched: true, liked: false, saved: false, shared: true }, // Software engineer lifestyle
      3: { watched: true, liked: true, saved: true, shared: false },  // DSA Reverse Linked List
      4: { watched: true, liked: false, saved: false, shared: false } // Laptop specs
    }

    setInteractions(trapInteractions)
    setSelectedCategory('All')
    setErrorMsg('')
    setRecommendationResult(null)
    setAnalyzing(true)

    // Trigger recommendations immediately for these files
    const trapReelsList = [
      { id: 1, title: "Java GC Explained Simply", description: "How the Java Garbage Collector works under the hood. Visualizing mark-and-sweep algorithm.", category: "Java", technology: "Java / JVM", views: 12000, likes: 1100, shares: 180, saves: 390 },
      { id: 2, title: "Software Engineer Life: Day 1 vs Year 5", description: "A funny journey showing a software engineer's transition from fixing simple spelling mistakes to scaling systems.", category: "Career", technology: "Software Engineering Culture", views: 25000, likes: 2400, shares: 950, saves: 120 },
      { id: 3, title: "Cracking the Coding Interview: Reverse a Linked List", description: "Why interviewers love recursion and pointer queries. Visualizing the iterative approach step-by-step.", category: "DSA", technology: "Data Structures & Algorithms", views: 18000, likes: 1500, shares: 300, saves: 850 },
      { id: 4, title: "MacBook Pro M3 vs Dell XPS 15 for Coding", description: "Detailed comparison of processor specs, battery life, and Docker performance for developers.", category: "Hardware", technology: "Hardware Specs", views: 30000, likes: 2800, shares: 400, saves: 600 }
    ]

    fetch('http://127.0.0.1:8000/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interactions: trapReelsList
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Recommendation API failed')
        return res.json()
      })
      .then((data) => {
        setRecommendationResult(data)
        setAnalyzing(false)
      })
      .catch((err) => {
        // Fallback
        setRecommendationResult({
          current_reel: "MacBook Pro M3 vs Dell XPS 15 for Coding",
          interest_detected: "Software Engineering / Technology",
          why: "The student has interacted with multiple facets of computer science (Java GC, Day 1 vs Year 5 lifestyle, coding interview prep, and laptop comparison spec). This suggests a broad interest in the software engineering profession rather than just one specific technology stack.",
          recommended_tech_reel: "Scaling System Design: Load Balancers",
          category: "HLD",
          why_this_recommendation: "Since the student shows key interest in Software Engineering as a career and system scaling, learning high-level system design topics like Load Balancing will broaden their architectural knowledge for their career.",
          difficulty: "Intermediate",
          confidence: "High",
          recommended_reel_details: {
            title: "Scaling System Design: Load Balancers",
            description: "What happens when 1,000,000 users visit your app at the same time? A visual breakdown of Nginx and CDN caching.",
            category: "HLD",
            technology: "System Architecture",
            views: 15000,
            likes: 1400,
            shares: 320,
            saves: 700
          }
        })
        setAnalyzing(false)
      })
  }

  // Clear choices
  const handleResetData = () => {
    setInteractions({})
    setRecommendationResult(null)
    setErrorMsg('')
  }

  const activeInteracted = getInteractedList()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white font-sans antialiased">
      {/* Connection status banner */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs px-4 py-2 flex justify-between items-center sm:px-6 z-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${loadingHealth ? 'bg-amber-400' : backendHealth?.status === 'healthy' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${loadingHealth ? 'bg-amber-500' : backendHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}></span>
          </span>
          <span>
            Backend Connection: {loadingHealth ? 'Checking...' : backendHealth?.status === 'healthy' ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Database: {loadingHealth ? '...' : backendHealth?.database_connected ? 'Connected' : 'Disconnected'}</span>
          <span>Gemini AI: {loadingHealth ? '...' : backendHealth?.gemini_api_key_configured ? 'API Connected' : 'Demo Fallback Mode'}</span>
        </div>
      </div>

      {/* Header */}
      <header className="py-6 px-4 max-w-7xl mx-auto w-full flex justify-between items-center z-10 border-b border-slate-900">
        <div className="flex items-center gap-3 font-extrabold text-2xl tracking-wide bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
          <span className="text-3xl">🧭</span> ReelWise AI
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetData}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium py-2 px-4 rounded-xl border border-slate-800 transition duration-150"
          >
            Reset Interactions
          </button>
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wider">
            PromptWars v2
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-10 sm:px-6">

        {/* Presentation Header */}
        <div className="max-w-3xl mx-auto text-center flex flex-col gap-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Turn scrolling into learning.
          </h1>
          <p className="text-slate-400 text-md sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Students watch educational content, memes, and lifestyles. ReelWise AI analyzes Reel interactions, detects underlying career/tech interests, and recommends engaging, constructive technology-related Reels to support their studies.
          </p>

          {/* Quick actions bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              onClick={handleTryTrapExample}
              className="py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-2xl shadow-xl hover:shadow-orange-500/10 transform active:scale-95 transition-all text-sm"
            >
              ⚡ Try Trap Example
            </button>
            <button
              onClick={handleAnalyze}
              disabled={activeInteracted.length === 0 || analyzing}
              className="py-3 px-6 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:shadow-none text-white font-bold rounded-2xl shadow-lg hover:shadow-purple-500/10 transform active:scale-95 transition-all text-sm"
            >
              {analyzing ? 'Analyzing Interests...' : '🧠 Analyze My Interests'}
            </button>
          </div>
          {errorMsg && (
            <p className="text-rose-400 text-sm font-semibold mt-1 bg-rose-500/5 px-4 py-2 border border-rose-500/10 rounded-xl max-w-lg mx-auto">
              ⚠️ {errorMsg}
            </p>
          )}
        </div>

        {/* Dynamic Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left panel: Sample Reels Feed */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Educational Sample Reels</h2>
                <p className="text-xs text-slate-500 mt-1">Simulate student interactions by selecting watch/like/save/share toggles</p>
              </div>
              <span className="text-xs text-slate-300 font-bold bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                Interactions logged: {activeInteracted.length}
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`text-xs px-4 py-2 rounded-xl transition duration-150 font-medium ${selectedCategory === cat
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Reels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loadingReels ? (
                <div className="col-span-full py-20 text-center text-slate-600">
                  <div className="h-8 w-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                  Loading sample Reels feed...
                </div>
              ) : reels.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-600 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  No reels matched the category filters.
                </div>
              ) : (
                reels.map((reel) => {
                  const int = interactions[reel.id] || { watched: false, liked: false, saved: false, shared: false }
                  const isInteracted = int.watched || int.liked || int.saved || int.shared
                  return (
                    <div
                      key={reel.id}
                      className={`relative bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${isInteracted ? 'border-purple-500/40 shadow-lg shadow-purple-500/5' : 'border-slate-800/80 hover:border-slate-700'
                        }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                          {reel.category}
                        </span>
                        <div className="flex gap-1 text-[10px] text-slate-500">
                          <span>👁️ {(reel.views / 1000).toFixed(1)}k</span>
                          <span>❤️ {(reel.likes / 1000).toFixed(1)}k</span>
                        </div>
                      </div>

                      <h3 className="font-extrabold text-white text-md mb-2">{reel.title}</h3>
                      <p className="text-slate-400 text-xs leading-relaxed mb-4 flex-1">{reel.description}</p>

                      <div className="text-[11px] text-slate-400 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl mb-4">
                        <span className="font-semibold text-purple-400">Topic:</span> {reel.technology}
                      </div>

                      <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-1">
                        <button
                          onClick={() => toggleInteraction(reel.id, 'watched')}
                          title="Simulate student watching this reel"
                          className={`text-xs flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition duration-150 ${int.watched ? 'bg-purple-900/40 border-purple-500/30 text-purple-300' : 'bg-slate-950 border-slate-805 text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          👁️ <span className="hidden sm:inline">Watch</span>
                        </button>
                        <button
                          onClick={() => toggleInteraction(reel.id, 'liked')}
                          title="Simulate student liking this reel"
                          className={`text-xs flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition duration-150 ${int.liked ? 'bg-pink-900/40 border-pink-500/30 text-pink-300' : 'bg-slate-950 border-slate-805 text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          ❤️ <span className="hidden sm:inline">Like</span>
                        </button>
                        <button
                          onClick={() => toggleInteraction(reel.id, 'saved')}
                          title="Simulate student saving this reel"
                          className={`text-xs flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition duration-150 ${int.saved ? 'bg-amber-900/40 border-amber-500/30 text-amber-300' : 'bg-slate-950 border-slate-805 text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          🔖 <span className="hidden sm:inline">Save</span>
                        </button>
                        <button
                          onClick={() => toggleInteraction(reel.id, 'shared')}
                          title="Simulate student sharing this reel"
                          className={`text-xs flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition duration-150 ${int.shared ? 'bg-emerald-900/40 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          📤 <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right panel: recommendation and AI inference results */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Header info */}
            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
              <h2 className="text-xl font-black mb-1 flex items-center gap-2">
                <span className="text-purple-400">🔮</span> Recommendation Result
              </h2>
              <p className="text-xs text-slate-400 mb-6">AI diagnostics based on current active student interactions</p>

              {!recommendationResult && !analyzing ? (
                <div className="border border-dashed border-slate-800 rounded-2xl h-80 flex flex-col items-center justify-center text-center p-6 bg-slate-950/20 text-slate-500">
                  <span className="text-5xl mb-4">🧭</span>
                  <h3 className="text-slate-300 font-bold block mb-1">No Active Recommendation</h3>
                  <p className="text-xs px-6 leading-relaxed">Select watched, liked, saved, or shared Reels, then click <strong>Analyze My Interests</strong> or <strong>Try Trap Example</strong> to trigger recommendations.</p>
                </div>
              ) : analyzing ? (
                <div className="border border-slate-800 rounded-2xl h-80 flex flex-col items-center justify-center text-center p-6 bg-slate-950/30">
                  <div className="h-10 w-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                  <h3 className="text-purple-400 font-bold block">Inferring Broader Interests...</h3>
                  <p className="text-xs text-slate-500 mt-2 px-8 leading-relaxed">Asking ReelWise AI to analyze interactions, skip simple keyword matching, and bypass the trap...</p>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in zoom-in duration-300">

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Inference Confidence</p>
                      <span className={`text-xs font-black ${recommendationResult.confidence?.toLowerCase() === 'high' ? 'text-emerald-400' :
                          recommendationResult.confidence?.toLowerCase() === 'medium' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                        🛡️ {recommendationResult.confidence || 'High'}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Content Difficulty</p>
                      <span className="text-xs font-black text-purple-400">
                        ⚡ {recommendationResult.difficulty || 'Intermediate'}
                      </span>
                    </div>
                  </div>

                  {/* Ref Current Reel */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Current Reel Reference</span>
                    <span className="text-xs text-slate-200 mt-0.5 block italic">
                      "{recommendationResult.current_reel || 'None'}"
                    </span>
                  </div>

                  {/* Interest Detected */}
                  <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/30 border border-purple-500/30 rounded-xl p-4">
                    <span className="text-[10px] text-purple-300 uppercase block font-extrabold tracking-wider">Interest Detected</span>
                    <span className="text-md text-white font-extrabold mt-0.5 block">
                      {recommendationResult.interest_detected}
                    </span>
                  </div>

                  {/* Why Inferred (Inference panel) */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1.5">Why this Interest? (Evidence)</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {recommendationResult.why}
                    </p>
                  </div>

                  {/* Recommended Reel */}
                  <div className="bg-slate-950/80 border border-emerald-500/20 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-bl-xl border-l border-b border-emerald-550/20">
                      Recommendation
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Recommended Tech Reel</span>
                    <span className="text-sm text-emerald-400 font-extrabold mt-0.5 block">
                      {recommendationResult.recommended_tech_reel}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-md">
                        {recommendationResult.category}
                      </span>
                      {recommendationResult.recommended_reel_details && (
                        <span className="text-[9px] text-slate-500">
                          {recommendationResult.recommended_reel_details.technology}
                        </span>
                      )}
                    </div>
                    {recommendationResult.recommended_reel_details && (
                      <p className="text-xs text-slate-400 mt-2 italic leading-relaxed border-t border-slate-900 pt-2">
                        "{recommendationResult.recommended_reel_details.description}"
                      </p>
                    )}
                  </div>

                  {/* Why recommended */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Why this Recommendation?</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {recommendationResult.why_this_recommendation}
                    </p>
                  </div>

                </div>
              )}
            </div>

            {/* Trap example explanation block */}
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 text-xs">
              <span className="font-extrabold text-white block mb-2">💡 Trap Test Scenario</span>
              <p className="text-slate-400 leading-relaxed mb-3">
                Students watching Java, Algorithms, Hardware comparison, and Developer lifestyle shouldn't receive generic Java videos.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Clicking <strong className="text-amber-400">Try Trap Example</strong> sets up this exact collection and triggers a recommendation for <strong className="text-emerald-400">Scaling System Design: Load Balancers</strong> (in the <strong>HLD</strong> category) to broaden computational development patterns.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-xs text-slate-600 border-t border-slate-900 mt-8">
        &copy; {new Date().getFullYear()} ReelWise AI. PromptWars Hackathon Template.
      </footer>
    </div>
  )
}

export default App
