import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate, useParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Clock, Copy, Bookmark, CheckCircle2, ChevronDown, Share2, 
    Download, Search, Filter, Play, Pause, RotateCcw, 
    BookOpen, Terminal, Sparkles, Sun, Moon, ArrowLeft, MessageSquare, AlertCircle, Brain, Award, ShieldAlert, Check, X
} from 'lucide-react'

const NAV_ITEMS = [
    { id: 'ats', label: 'ATS Analysis & Fit', icon: <Award size={16} /> },
    { id: 'technical', label: 'Technical Questions', icon: <Terminal size={16} /> },
    { id: 'behavioral', label: 'Behavioral Questions', icon: <MessageSquare size={16} /> },
    { id: 'roadmap', label: 'Road Map', icon: <BookOpen size={16} /> },
]

// ── Skeleton Loader Component ──────────────────────────────────────────
const ReportSkeleton = () => (
    <div className="skeleton-container">
        <header className="skeleton-header shimmer"></header>
        <div className="skeleton-layout">
            <nav className="skeleton-nav shimmer"></nav>
            <main className="skeleton-main">
                <div className="skeleton-search shimmer"></div>
                <div className="skeleton-card shimmer" style={{ height: '180px' }}></div>
                <div className="skeleton-card shimmer" style={{ height: '100px' }}></div>
                <div className="skeleton-card shimmer" style={{ height: '100px' }}></div>
            </main>
            <aside className="skeleton-sidebar shimmer"></aside>
        </div>
    </div>
);

// ── Practice Timer Component ───────────────────────────────────────────
const PracticeTimer = () => {
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(sec => sec + 1);
            }, 1000);
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, seconds]);

    const formatTime = (totalSec) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        return [
            hrs > 0 ? String(hrs).padStart(2, '0') : null,
            String(mins).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].filter(Boolean).join(':');
    };

    return (
        <div className='practice-timer-card'>
            <div className='timer-header'>
                <Clock size={16} className='pulse-icon' />
                <span>Practice Timer</span>
            </div>
            <div className='timer-display'>{formatTime(seconds)}</div>
            <div className='timer-controls'>
                <button onClick={() => setIsActive(!isActive)} className={`control-btn ${isActive ? 'pause' : 'play'}`}>
                    {isActive ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={() => { setSeconds(0); setIsActive(false); }} className='control-btn reset'>
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
};

// ── Question Card Component ────────────────────────────────────────────
const QuestionCard = ({ item, index, interviewId, isTechnical = true }) => {
    const [open, setOpen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [notes, setNotes] = useState("");
    const [copied, setCopied] = useState(false);

    const questionKey = `${interviewId}_${isTechnical ? 'tech' : 'beh'}_${index}`;

    useEffect(() => {
        const bookmarks = JSON.parse(localStorage.getItem('interview_bookmarks') || '{}');
        const completed = JSON.parse(localStorage.getItem('interview_completed') || '{}');
        const savedNotes = JSON.parse(localStorage.getItem('interview_notes') || '{}');
        
        setIsBookmarked(!!bookmarks[questionKey]);
        setIsCompleted(!!completed[questionKey]);
        setNotes(savedNotes[questionKey] || "");
    }, [questionKey]);

    const toggleBookmark = (e) => {
        e.stopPropagation();
        const bookmarks = JSON.parse(localStorage.getItem('interview_bookmarks') || '{}');
        if (bookmarks[questionKey]) {
            delete bookmarks[questionKey];
            setIsBookmarked(false);
        } else {
            bookmarks[questionKey] = true;
            setIsBookmarked(true);
        }
        localStorage.setItem('interview_bookmarks', JSON.stringify(bookmarks));
        window.dispatchEvent(new Event('storage'));
    };

    const toggleCompleted = (e) => {
        e.stopPropagation();
        const completed = JSON.parse(localStorage.getItem('interview_completed') || '{}');
        if (completed[questionKey]) {
            delete completed[questionKey];
            setIsCompleted(false);
        } else {
            completed[questionKey] = true;
            setIsCompleted(true);
        }
        localStorage.setItem('interview_completed', JSON.stringify(completed));
    };

    const handleNotesChange = (e) => {
        const val = e.target.value;
        setNotes(val);
        const savedNotes = JSON.parse(localStorage.getItem('interview_notes') || '{}');
        savedNotes[questionKey] = val;
        localStorage.setItem('interview_notes', JSON.stringify(savedNotes));
    };

    const copyToClipboard = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(item.question);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const diff = item.difficulty || 'medium';

    return (
        <div className={`q-card-premium ${isCompleted ? 'q-card-premium--completed' : ''}`}>
            <div className='q-card-header' onClick={() => setOpen(o => !o)}>
                <div className='q-card-left'>
                    <span className='q-index-badge'>Q{index + 1}</span>
                    <p className='q-question-text'>{item.question}</p>
                </div>
                <div className='q-card-actions'>
                    {isTechnical && (
                        <span className={`diff-badge diff-badge--${diff}`}>
                            {diff}
                        </span>
                    )}
                    <button onClick={copyToClipboard} className='action-icon-btn' title='Copy Question'>
                        {copied ? <span className='copied-txt'>Copied</span> : <Copy size={14} />}
                    </button>
                    <button onClick={toggleBookmark} className={`action-icon-btn ${isBookmarked ? 'active' : ''}`} title='Bookmark'>
                        <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
                    </button>
                    <button onClick={toggleCompleted} className={`action-icon-btn ${isCompleted ? 'active-check' : ''}`} title='Mark Completed'>
                        <CheckCircle2 size={14} />
                    </button>
                    <span className={`chevron-indicator ${open ? 'rotated' : ''}`}>
                        <ChevronDown size={16} />
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className='q-card-dropdown'
                    >
                        <div className='inner-content-block'>
                            <div className='qa-section'>
                                <span className='section-tag intention-tag'>Intention</span>
                                <p>{item.intention || "No specific intentions specified."}</p>
                            </div>
                            
                            <div className='qa-section'>
                                <span className='section-tag answer-tag'>Ideal Answer</span>
                                <p>{item.answer || "No sample answer was populated."}</p>
                            </div>

                            {item.tips && (
                                <div className='qa-section'>
                                    <span className='section-tag tips-tag'>Structure Tips</span>
                                    <p>{item.tips}</p>
                                </div>
                            )}

                            {item.sampleAnswer && (
                                <div className='qa-section'>
                                    <span className='section-tag sample-tag'>Sample STAR Answer</span>
                                    <div className='star-sample-text'>{item.sampleAnswer}</div>
                                </div>
                            )}

                            {item.commonMistakes && (
                                <div className='qa-section'>
                                    <span className='section-tag error-tag'>Common Mistakes</span>
                                    <p className='mistake-text'>{item.commonMistakes}</p>
                                </div>
                            )}

                            {item.followUpQuestions && item.followUpQuestions.length > 0 && (
                                <div className='qa-section'>
                                    <span className='section-tag follow-tag'>Follow-up Questions</span>
                                    <ul className='followups-list'>
                                        {item.followUpQuestions.map((fq, i) => <li key={i}>{fq}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div className='qa-notes-field'>
                                <label>My Interview Notes</label>
                                <textarea 
                                    placeholder='Type your personal answers, bullet points, or reminders here...'
                                    value={notes}
                                    onChange={handleNotesChange}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main Interview Component ──────────────────────────────────────────
const Interview = () => {
    const [activeNav, setActiveNav] = useState('ats')
    const [isNavOpen, setIsNavOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [difficultyFilter, setDifficultyFilter] = useState("all")
    const [isDarkTheme, setIsDarkTheme] = useState(true)
    const [copiedShare, setCopiedShare] = useState(false)
    const [fetchError, setFetchError] = useState(false)
    
    // Roadmap tracking
    const [selectedRoadmapTab, setSelectedRoadmapTab] = useState("all")
    const [completedDays, setCompletedDays] = useState({})

    const { report, getReportById, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    const loadReport = async () => {
        setFetchError(false)
        try {
            await getReportById(interviewId)
        } catch (err) {
            console.error("Error loading report:", err)
            setFetchError(true)
        }
    }

    useEffect(() => {
        if (interviewId) {
            loadReport()
        }
    }, [interviewId])

    useEffect(() => {
        const savedDays = JSON.parse(localStorage.getItem(`roadmap_days_${interviewId}`) || '{}');
        setCompletedDays(savedDays);
    }, [interviewId]);

    const handleDayToggle = (dayNum) => {
        const nextState = { ...completedDays, [dayNum]: !completedDays[dayNum] };
        setCompletedDays(nextState);
        localStorage.setItem(`roadmap_days_${interviewId}`, JSON.stringify(nextState));
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
    };

    if (loading) {
        return <ReportSkeleton />
    }

    if (fetchError || !report) {
        return (
            <main className='loading-screen-premium'>
                <div className='error-retry-card'>
                    <ShieldAlert size={48} className='error-alert-icon' />
                    <h1>Failed to load Interview Report</h1>
                    <p>There was a connection issue or the report ID does not exist.</p>
                    <div className='error-buttons'>
                        <button onClick={loadReport} className='retry-btn'>Retry Loading</button>
                        <button onClick={() => navigate('/')} className='back-dash-btn-flat'>Go to Dashboard</button>
                    </div>
                </div>
            </main>
        )
    }

    const scoreColor =
        report.matchScore >= 75 ? 'score--high' :
            report.matchScore >= 55 ? 'score--mid' : 'score--low'

    // Match metrics layout mapper
    const metrics = report.matchScoreDetails || {
        overallScore: report.matchScore || 0,
        technicalSkills: Math.min(100, (report.matchScore || 0) + 5),
        softSkills: Math.max(0, (report.matchScore || 0) - 10),
        resumeQuality: Math.min(100, (report.matchScore || 0) + 2),
        keywordMatch: Math.max(0, (report.matchScore || 0) - 8),
        educationMatch: Math.max(0, (report.matchScore || 0) + 12),
        experienceMatch: Math.max(0, (report.matchScore || 0) - 5),
        projectsMatch: Math.max(0, (report.matchScore || 0) - 3)
    };

    // Filter Technical Questions
    const filteredTech = (report.technicalQuestions || []).filter(q => {
        const matchesQuery = q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             q.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDiff = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
        return matchesQuery && matchesDiff;
    });

    // Filter Behavioral Questions
    const filteredBeh = (report.behavioralQuestions || []).filter(q => {
        return q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
               (q.answer && q.answer.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    // Roadmap items filter
    const categories = ["all", "DSA", "OOP", "DBMS", "OS", "Computer Networks", "System Design", "Projects", "HR Interview", "Mock Interviews"];
    const filteredRoadmap = (report.preparationPlan || []).filter(item => {
        return selectedRoadmapTab === 'all' || item.category === selectedRoadmapTab;
    });

    // Calculate Roadmap Progress
    const totalDays = report.preparationPlan?.length || 30;
    const completedDaysCount = Object.values(completedDays).filter(Boolean).length;
    const roadmapProgressPercentage = Math.round((completedDaysCount / totalDays) * 100);

    return (
        <div className={`interview-page-dashboard ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
            
            {/* Top SaaS bar */}
            <header className='report-header-premium'>
                <div className='left-actions'>
                    <button onClick={() => navigate('/')} className='back-dash-btn'>
                        <ArrowLeft size={16} />
                        Dashboard
                    </button>
                    <h1>{report.title || 'Interview Report'}</h1>
                </div>

                <div className='right-actions'>
                    <button onClick={handleShare} className='saas-icon-btn'>
                        <Share2 size={16} />
                        {copiedShare ? 'Link Copied' : 'Share Plan'}
                    </button>
                    <button onClick={() => getResumePdf(interviewId)} className='saas-icon-btn premium-btn'>
                        <Download size={16} />
                        Download ATS Resume
                    </button>
                    <button onClick={() => setIsDarkTheme(!isDarkTheme)} className='theme-toggle-btn'>
                        {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
            </header>

            {/* Mobile Header Bar */}
            <div className='interview-mobile-header'>
                <button className='hamburger-btn' aria-label='Open Navigation' onClick={() => setIsNavOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <h1 className='mobile-title'>{report.title || 'Untitled Position'}</h1>
            </div>

            {/* Slide-out Overlay */}
            {isNavOpen && (
                <div className='nav-overlay' onClick={() => setIsNavOpen(false)} />
            )}

            <div className='interview-layout'>

                {/* ── Left Nav ── */}
                <nav className={`interview-nav ${isNavOpen ? 'interview-nav--open' : ''}`}>
                    <div className="nav-content">
                        <div className="nav-header-mobile">
                            <span className="nav-header-title">Menu Sections</span>
                            <button className="nav-close-btn" onClick={() => setIsNavOpen(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <p className='interview-nav__label'>Sections</p>
                        <div className='nav-links-wrapper'>
                            {NAV_ITEMS.map(item => (
                                <button
                                    key={item.id}
                                    className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                    onClick={() => {
                                        setActiveNav(item.id)
                                        setIsNavOpen(false)
                                    }}
                                >
                                    <span className='interview-nav__icon'>{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <PracticeTimer />
                </nav>

                <div className='interview-divider' />

                {/* ── Center Content ── */}
                <main className='interview-content'>
                    
                    {/* Search & Filter Bar */}
                    {activeNav !== 'roadmap' && activeNav !== 'ats' && (
                        <div className='search-filter-panel-glass'>
                            <div className='search-box-wrapper'>
                                <Search size={16} className='search-icon' />
                                <input 
                                    type='text' 
                                    placeholder='Search questions, answers, and tags...'
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {activeNav === 'technical' && (
                                <div className='difficulty-filters'>
                                    <Filter size={14} className='filter-icon' />
                                    {['all', 'easy', 'medium', 'hard'].map(level => (
                                        <button 
                                            key={level} 
                                            className={`diff-filter-btn ${difficultyFilter === level ? 'active' : ''}`}
                                            onClick={() => setDifficultyFilter(level)}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content Section: ATS Analysis & Fit */}
                    {activeNav === 'ats' && (
                        <section className='section-block'>
                            <div className='content-header'>
                                <h2>ATS Analysis & Profile Match</h2>
                                <span className='content-header__count'>Metrics fit</span>
                            </div>
                            
                            <div className='ats-analysis-card-glass'>
                                <h3>Expert ATS Feedback</h3>
                                <p className='ats-summary-text'>
                                    {report.atsAnalysis || "Your resume demonstrates solid relevance matching for this target position. Below are detailed strengths, weaknesses, and optimization paths compiled by our AI."}
                                </p>
                            </div>

                            <div className='profile-strengths-weaknesses'>
                                <div className='strengths-block-glass'>
                                    <div className='block-title-row green'>
                                        <Check size={18} />
                                        <h3>Key Strengths</h3>
                                    </div>
                                    <ul className='bullet-saas-list'>
                                        {report.strengths && report.strengths.length > 0 ? (
                                            report.strengths.map((str, i) => <li key={i}>{str}</li>)
                                        ) : (
                                            <>
                                                <li>Strong alignment with target role technical qualifications.</li>
                                                <li>Relevant experience highlighted in project details.</li>
                                            </>
                                        )}
                                    </ul>
                                </div>

                                <div className='weaknesses-block-glass'>
                                    <div className='block-title-row red'>
                                        <X size={18} />
                                        <h3>Identified Gaps</h3>
                                    </div>
                                    <ul className='bullet-saas-list'>
                                        {report.weaknesses && report.weaknesses.length > 0 ? (
                                            report.weaknesses.map((weak, i) => <li key={i}>{weak}</li>)
                                        ) : (
                                            <>
                                                <li>Lack of specialized keywords corresponding to target Job Description.</li>
                                                <li>Missing key tooling references requested in target metrics.</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {report.recommendations && report.recommendations.length > 0 && (
                                <div className='recommendations-card-glass'>
                                    <h3>Actionable Profile Improvement Tips</h3>
                                    <ul className='number-saas-list'>
                                        {report.recommendations.map((rec, i) => (
                                            <li key={i}>
                                                <span className='step-num'>{i + 1}</span>
                                                <p>{rec}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Content Section: Technical Questions */}
                    {activeNav === 'technical' && (
                        <section className='section-block'>
                            <div className='content-header'>
                                <h2>Technical Interview Prep</h2>
                                <span className='content-header__count'>{filteredTech.length} matching</span>
                            </div>
                            <div className='q-list'>
                                {filteredTech.length > 0 ? (
                                    filteredTech.map((q, i) => (
                                        <QuestionCard key={i} item={q} index={i} interviewId={interviewId} isTechnical={true} />
                                    ))
                                ) : (
                                    <p className='no-results-text'>No technical questions matches your search query or filters.</p>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Content Section: Behavioral Questions */}
                    {activeNav === 'behavioral' && (
                        <section className='section-block'>
                            <div className='content-header'>
                                <h2>Behavioral & Scenario Prep</h2>
                                <span className='content-header__count'>{filteredBeh.length} matching</span>
                            </div>
                            <div className='q-list'>
                                {filteredBeh.length > 0 ? (
                                    filteredBeh.map((q, i) => (
                                        <QuestionCard key={i} item={q} index={i} interviewId={interviewId} isTechnical={false} />
                                    ))
                                ) : (
                                    <p className='no-results-text'>No behavioral questions matches your search query.</p>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Content Section: Roadmap */}
                    {activeNav === 'roadmap' && (
                        <section className='section-block'>
                            <div className='roadmap-premium-container'>
                                <div className='roadmap-top-stats'>
                                    <div className='road-stat-card'>
                                        <h3>Roadmap Progress</h3>
                                        <div className='road-progress-fill-bar'>
                                            <div className='bar-inner' style={{ width: `${roadmapProgressPercentage}%` }}></div>
                                        </div>
                                        <span className='percentage-txt'>{roadmapProgressPercentage}% Days Completed ({completedDaysCount}/{totalDays})</span>
                                    </div>
                                </div>

                                <div className='roadmap-category-tabs'>
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            className={`cat-tab-btn ${selectedRoadmapTab === cat ? 'active' : ''}`}
                                            onClick={() => setSelectedRoadmapTab(cat)}
                                        >
                                            {cat === 'all' ? 'All Days' : cat}
                                        </button>
                                    ))}
                                </div>

                                <div className='roadmap-list-premium'>
                                    {filteredRoadmap.length > 0 ? (
                                        filteredRoadmap.map((dayItem) => {
                                            const isChecked = !!completedDays[dayItem.day];
                                            return (
                                                <div 
                                                    key={dayItem.day} 
                                                    className={`roadmap-day-card ${isChecked ? 'roadmap-day-card--completed' : ''}`}
                                                >
                                                    <div className='day-card-header'>
                                                        <div className='day-left-meta'>
                                                            <input 
                                                                type='checkbox' 
                                                                id={`check-day-${dayItem.day}`} 
                                                                checked={isChecked}
                                                                onChange={() => handleDayToggle(dayItem.day)}
                                                            />
                                                            <label htmlFor={`check-day-${dayItem.day}`} className='day-number-label'>
                                                                Day {dayItem.day}
                                                            </label>
                                                            <span className='category-tag'>{dayItem.category}</span>
                                                        </div>
                                                        <div className='day-right-meta'>
                                                            <span className='time-meta'>{dayItem.estimatedTime || '3 hours'}</span>
                                                        </div>
                                                    </div>

                                                    <div className='day-card-body'>
                                                        <h3 className='day-topic-title'>{dayItem.topic || dayItem.focus}</h3>
                                                        
                                                        {dayItem.theory && (
                                                            <div className='day-section-block'>
                                                                <strong>Theory Concepts:</strong>
                                                                <p>{dayItem.theory}</p>
                                                            </div>
                                                        )}

                                                        {dayItem.practiceProblems && dayItem.practiceProblems.length > 0 && (
                                                            <div className='day-section-block'>
                                                                <strong>Practice Problems:</strong>
                                                                <ul className='bullet-details-list'>
                                                                    {dayItem.practiceProblems.map((prob, pi) => <li key={pi}>{prob}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {dayItem.interviewQuestions && dayItem.interviewQuestions.length > 0 && (
                                                            <div className='day-section-block'>
                                                                <strong>Standard Questions:</strong>
                                                                <ul className='bullet-details-list font-italic'>
                                                                    {dayItem.interviewQuestions.map((q, qi) => <li key={qi}>"{q}"</li>)}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {dayItem.resources && dayItem.resources.length > 0 && (
                                                            <div className='day-section-block'>
                                                                <strong>Suggested Resources:</strong>
                                                                <div className='resources-chips-row'>
                                                                    {dayItem.resources.map((res, ri) => (
                                                                        <span key={ri} className='res-chip'>{res}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {dayItem.tasks && dayItem.tasks.length > 0 && (
                                                            <div className='day-section-block tasks-listing'>
                                                                <strong>Daily Subtasks Checklist:</strong>
                                                                <ul className='checklist-tasks'>
                                                                    {dayItem.tasks.map((task, ti) => (
                                                                        <li key={ti}>
                                                                            <span className='bullet-circle' />
                                                                            {task}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <p className='no-results-text'>No roadmap days fit this selected category.</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                {/* ── Right Sidebar ── */}
                <aside className='interview-sidebar'>
                    
                    {/* Visual Match Metrics Card */}
                    <div className='match-details-card-glass'>
                        <div className='card-header-label'>Match Fit Analysis</div>
                        
                        <div className='match-progress-radial'>
                            <div className={`radial-ring-value ${scoreColor}`}>
                                <span className='score-num'>{metrics.overallScore}</span>
                                <span className='score-symbol'>%</span>
                            </div>
                            <span className='overall-verdict'>Overall ATS Fit</span>
                        </div>

                        <div className='metrics-bars-list'>
                            <div className='bar-field'>
                                <div className='bar-label-group'>
                                    <span>Technical Score</span>
                                    <span>{metrics.technicalSkills}%</span>
                                </div>
                                <div className='bar-track'><div className='bar-fill green' style={{ width: `${metrics.technicalSkills}%` }}></div></div>
                            </div>

                            <div className='bar-field'>
                                <div className='bar-label-group'>
                                    <span>Soft Skills Score</span>
                                    <span>{metrics.softSkills}%</span>
                                </div>
                                <div className='bar-track'><div className='bar-fill blue' style={{ width: `${metrics.softSkills}%` }}></div></div>
                            </div>

                            <div className='bar-field'>
                                <div className='bar-label-group'>
                                    <span>Resume Quality</span>
                                    <span>{metrics.resumeQuality}%</span>
                                </div>
                                <div className='bar-track'><div className='bar-fill purple' style={{ width: `${metrics.resumeQuality}%` }}></div></div>
                            </div>

                            <div className='bar-field'>
                                <div className='bar-label-group'>
                                    <span>Keyword Match</span>
                                    <span>{metrics.keywordMatch}%</span>
                                </div>
                                <div className='bar-track'><div className='bar-fill yellow' style={{ width: `${metrics.keywordMatch}%` }}></div></div>
                            </div>

                            <div className='bar-field'>
                                <div className='bar-label-group'>
                                    <span>Education Match</span>
                                    <span>{metrics.educationMatch}%</span>
                                </div>
                                <div className='bar-track'><div className='bar-fill cyan' style={{ width: `${metrics.educationMatch}%` }}></div></div>
                            </div>

                            <div className='bar-field'>
                                <div className='bar-label-group'>
                                    <span>Experience Match</span>
                                    <span>{metrics.experienceMatch}%</span>
                                </div>
                                <div className='bar-track'><div className='bar-fill orange' style={{ width: `${metrics.experienceMatch}%` }}></div></div>
                            </div>
                        </div>
                    </div>

                    {/* Skill Gaps Analysis */}
                    <div className='skill-gaps-glass-panel'>
                        <div className='card-header-label'>Identified Gaps</div>
                        <div className='gap-elements-list'>
                            {report.skillGaps && report.skillGaps.length > 0 ? (
                                report.skillGaps.map((gap, i) => (
                                    <div key={i} className={`gap-card-wrapper priority-${gap.priority || gap.severity}`}>
                                        <div className='gap-top-line'>
                                            <span className='gap-title-text'>{gap.skill}</span>
                                            <span className={`priority-pill priority-pill--${gap.priority || gap.severity}`}>
                                                {gap.priority || gap.severity}
                                            </span>
                                        </div>
                                        
                                        {gap.whyItMatters && (
                                            <p className='gap-explanation-text'>
                                                <strong>JD Importance:</strong> {gap.whyItMatters}
                                            </p>
                                        )}

                                        {gap.estimatedTime && (
                                            <div className='gap-time-label'>
                                                <span>Est. Study:</span> <strong>{gap.estimatedTime}</strong>
                                            </div>
                                        )}

                                        {gap.learningResources && gap.learningResources.length > 0 && (
                                            <div className='gap-resources-block'>
                                                <strong>Resources:</strong>
                                                <ul className='gap-resource-links'>
                                                    {gap.learningResources.map((res, ri) => (
                                                        <li key={ri}>{res}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className='no-gaps-message'>No critical skill gaps identified. Candidate matches target JD criteria perfectly!</p>
                            )}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    )
}

export default Interview