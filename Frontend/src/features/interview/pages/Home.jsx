import React, { useState, useRef, useEffect } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Brain, Sparkles, FileText, Upload, Plus, Award, 
    TrendingUp, Calendar, AlertTriangle, ArrowRight, BarChart2, BookOpen
} from 'lucide-react'

// Premium Loading Screen Messages
const LOADING_MESSAGES = [
    "Analyzing Resume details...",
    "Reading Target Job Description...",
    "Matching Core Skills...",
    "Calculating ATS Relevance...",
    "Identifying Profile Skill Gaps...",
    "Compiling Technical Questions (Easy/Med/Hard)...",
    "Structuring Behavioral STAR Scenarios...",
    "Customizing 30-Day Preparation Roadmap...",
    "Polishing ATS Resume template..."
];

const AiLoader = () => {
    const [msgIndex, setMsgIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const msgInterval = setInterval(() => {
            setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 2500);

        const progInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 98) return prev;
                return prev + 1;
            });
        }, 250);

        return () => {
            clearInterval(msgInterval);
            clearInterval(progInterval);
        };
    }, []);

    const estimatedTime = Math.max(1, Math.round((100 - progress) * 0.3));

    return (
        <main className='loading-screen-premium'>
            <div className="loader-container">
                <div className="gradient-ring-container">
                    <motion.div 
                        className="rotating-gradient-ring"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    />
                    <div className="brain-core">
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        >
                            <Brain size={48} className="brain-icon" />
                        </motion.div>
                        <motion.div 
                            className="scanning-beam"
                            animate={{ y: [-35, 35, -35] }}
                            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                        />
                    </div>
                </div>

                <div className="glowing-circle circle-1"></div>
                <div className="glowing-circle circle-2"></div>

                <div className="loading-text-box">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={msgIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="loading-message-text"
                        >
                            {LOADING_MESSAGES[msgIndex]}
                        </motion.p>
                    </AnimatePresence>
                    <p className="loading-subtext">Estimated remaining: {estimatedTime}s</p>
                </div>

                <div className="progress-bar-container">
                    <div className="progress-bar-bg">
                        <motion.div 
                            className="progress-bar-fill"
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "easeInOut" }}
                        />
                    </div>
                    <span className="progress-percentage">{progress}%</span>
                </div>
            </div>
        </main>
    );
};

const Home = () => {
    const { loading, generateReport, reports, getReports } = useInterview()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ selectedFile, setSelectedFile ] = useState(null)
    const [ error, setError ] = useState("")
    const resumeInputRef = useRef()
    const formRef = useRef(null)

    const navigate = useNavigate()

    useEffect(() => {
        getReports().catch(err => {
            console.error("Failed to fetch reports:", err)
        })
    }, [])

    const handleGenerateReport = async () => {
        setError("")

        if (!jobDescription.trim()) {
            setError("Job description is required.")
            return
        }

        if (!selectedFile && !selfDescription.trim()) {
            setError("Please upload a resume PDF/DOCX or enter a self-description.")
            return
        }

        try {
            const data = await generateReport({ 
                jobDescription: jobDescription.trim(), 
                selfDescription: selfDescription.trim(), 
                resumeFile: selectedFile 
            })
            if (data && data._id) {
                navigate(`/interview/${data._id}`)
            } else {
                setError("Failed to generate report. Please try again.")
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to generate interview report.")
        }
    }

    const scrollToForm = () => {
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    // Calculate stats
    const totalPlans = reports?.length || 0;
    const avgMatchScore = totalPlans > 0 
        ? Math.round(reports.reduce((acc, curr) => acc + (curr.matchScore || 0), 0) / totalPlans) 
        : 0;
    const highMatchPlans = reports?.filter(r => r.matchScore >= 75).length || 0;

    if (loading) {
        return <AiLoader />
    }

    return (
        <div className='home-page-dashboard'>
            {/* Top SaaS Header */}
            <header className='dashboard-header'>
                <div className='header-logo'>
                    <Brain className='logo-icon' />
                    <h1>AI Interview <span className='highlight'>Master</span></h1>
                </div>
                <button onClick={scrollToForm} className='quick-new-btn'>
                    <Plus size={16} />
                    New Interview Plan
                </button>
            </header>

            {/* Statistics Cards */}
            <section className='stats-container'>
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className='stat-card'
                >
                    <div className='stat-icon-wrapper blue-icon'>
                        <Award size={20} />
                    </div>
                    <div className='stat-details'>
                        <h3>Avg Match Score</h3>
                        <p>{avgMatchScore}%</p>
                        <span className='stat-footer'>Across all generated profiles</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className='stat-card'
                >
                    <div className='stat-icon-wrapper green-icon'>
                        <BarChart2 size={20} />
                    </div>
                    <div className='stat-details'>
                        <h3>Total Plans</h3>
                        <p>{totalPlans}</p>
                        <span className='stat-footer'>Custom roadmaps generated</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className='stat-card'
                >
                    <div className='stat-icon-wrapper orange-icon'>
                        <TrendingUp size={20} />
                    </div>
                    <div className='stat-details'>
                        <h3>High Match Fit</h3>
                        <p>{highMatchPlans}</p>
                        <span className='stat-footer'>Plans scoring 75% or higher</span>
                    </div>
                </motion.div>
            </section>

            {/* Error Message */}
            {error && (
                <div className='error-box'>
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Main Interactive Grid */}
            <div className='dashboard-grid'>
                
                {/* Creation panel */}
                <section ref={formRef} className='create-card-glass'>
                    <div className='card-header-premium'>
                        <Sparkles size={20} className='header-sparkle' />
                        <h2>Generate New Strategy</h2>
                    </div>

                    <div className='panels-container'>
                        <div className='panel-field'>
                            <label className='panel-label'>
                                <span>Target Job Description</span>
                                <span className='badge badge--required'>Required</span>
                            </label>
                            <textarea
                                onChange={(e) => setJobDescription(e.target.value)}
                                value={jobDescription}
                                className='jd-textarea'
                                placeholder="Paste the target job description here..."
                                maxLength={5000}
                            />
                            <div className='char-counter'>{jobDescription.length} / 5000</div>
                        </div>

                        <div className='panel-divider-horiz' />

                        <div className='panel-field'>
                            <label className='panel-label'>
                                <span>Upload Resume</span>
                                <span className='badge badge--best'>Best Results</span>
                            </label>
                            <label className='dropzone-premium' htmlFor='resume'>
                                <Upload size={24} className='upload-arrow' />
                                <span className='dropzone-title'>
                                    {selectedFile ? selectedFile.name : "Click to select resume file"}
                                </span>
                                <span className='dropzone-subtitle'>PDF or DOCX (Max 3MB)</span>
                                <input 
                                    ref={resumeInputRef} 
                                    hidden 
                                    type='file' 
                                    id='resume' 
                                    accept='.pdf,.docx' 
                                    onChange={(e) => {
                                        setError("");
                                        setSelectedFile(e.target.files?.[0] || null);
                                    }}
                                />
                            </label>

                            <div className='divider-or'><span>OR</span></div>

                            <label className='panel-label'>Quick Self-Description</label>
                            <textarea
                                onChange={(e) => setSelfDescription(e.target.value)}
                                value={selfDescription}
                                className='self-textarea'
                                placeholder="State your experience, key skills, and tools if you don't have a resume handy..."
                            />
                        </div>
                    </div>

                    <div className='create-footer'>
                        <span className='footer-ai-note'>AI Analysis takes approx 30 seconds</span>
                        <button onClick={handleGenerateReport} className='primary-saas-btn'>
                            <Sparkles size={16} />
                            Generate Interview Strategy
                        </button>
                    </div>
                </section>

                {/* Recent Plans / Sidebar */}
                <section className='recent-reports-panel'>
                    <div className='panel-header-premium'>
                        <Calendar size={18} />
                        <h2>My Recent Reports</h2>
                    </div>

                    {reports && reports.length > 0 ? (
                        <div className='recent-list'>
                            {reports.map((report, idx) => (
                                <motion.div 
                                    key={report._id} 
                                    className='recent-item-glass' 
                                    onClick={() => navigate(`/interview/${report._id}`)}
                                    whileHover={{ y: -3, scale: 1.01 }}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <div className='recent-title-group'>
                                        <h3>{report.title || 'Untitled Role'}</h3>
                                        <p>Created on {new Date(report.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className='recent-score-ring'>
                                        <span className={`score-value ${report.matchScore >= 75 ? 'high' : report.matchScore >= 55 ? 'mid' : 'low'}`}>
                                            {report.matchScore}%
                                        </span>
                                    </div>
                                    <ArrowRight size={16} className='arrow-link' />
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className='no-reports-box'>
                            <BookOpen size={24} />
                            <p>No reports generated yet. Get started by entering details on the left.</p>
                        </div>
                    )}
                </section>
            </div>

            <footer className='dashboard-footer'>
                <a href='#'>Privacy Policy</a>
                <a href='#'>Terms of Service</a>
                <a href='#'>Help Center</a>
            </footer>
        </div>
    )
}

export default Home