import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BookOpen, Brain, Castle, ChevronDown, ChevronRight, Gamepad2, Home, Lock,
  Menu, Medal, Play, ShieldCheck, Sparkles, Sword, Wand2, X,
  GraduationCap, RotateCcw, Calculator, Flame
} from 'lucide-react'
import './styles.css'

const curriculum = [
  {
    part: "ΜΕΡΟΣ Α'",
    title: 'Εισαγωγή στην Αρχαία Ελληνική Γλώσσα',
    chapters: [
      {
        id: 'A1',
        title: 'Κεφάλαιο 1 — Η Αρχαία Ελληνική Γλώσσα',
        progress: 100,
        lessons: [
          { id: '1.1', title: 'Η Καταγωγή και η Εξέλιξη της Αρχαίας Ελληνικής', ready: true },
          { id: '1.2', title: 'Η Δομή & το Αλφάβητο', ready: true }
        ]
      }
    ]
  }
]

// Ενότητα 1.1 - Η Καταγωγή και η Εξέλιξη
function Lesson11() {
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)

  const theorySteps = [
    { title: "1. Η Καταγωγή", text: "Η Αρχαία Ελληνική προέρχεται από την Ινδοευρωπαϊκή γλωσσική οικογένεια." },
    { title: "2. Οι Διάλεκτοι", text: "Χωριζόταν σε διαλέκτους, με κυριότερη την Αττική διάλεκτο που έγινε η βάση για την Κοινή." },
    { title: "3. Η Διάδοση", text: "Ο Μέγας Αλέξανδρος μετέφερε την ελληνική γλώσσα σε όλο τον τότε γνωστό κόσμο." }
  ]

  const questions = [
    { q: "Ποια διάλεκτος έγινε η βάση για την μετέπειτα Κοινή Ελληνική;", correct: "Η Αττική", wrong: ["Η Ιωνική", "Η Δωρική", "Η Αιολική"] },
    { q: "Από ποια γλωσσική οικογένεια προέρχεται η Αρχαία Ελληνική;", correct: "Την Ινδοευρωπαϊκή", wrong: ["Την Ασιατική", "Την Αφρικανική"] }
  ]

  const currentQ = questions[qIdx]
  const options = useMemo(() => {
    if (!currentQ) return []
    return [currentQ.correct, ...currentQ.wrong].sort(() => Math.random() - 0.5)
  }, [qIdx])

  const handleAnswer = (opt) => {
    if (answered) return
    setSelected(opt)
    setAnswered(true)
    if (opt === currentQ.correct) {
      setScore(s => s + 15)
      setStreak(st => st + 1)
    } else {
      setStreak(0)
    }
  }

  const nextQuestion = () => {
    setQIdx(i => i + 1)
    setSelected(null)
    setAnswered(false)
  }

  return (
    <div className="platform">
      <div className="mainArea">
        <div className="lessonHero">
          <div>
            <h1>Η Καταγωγή και η Εξέλιξη</h1>
            <p>Εξερευνούμε τις ρίζες της γλώσσας που μιλούσαν οι αρχαίοι ημών πρόγονοι.</p>
          </div>
          <div className="bossPanel" style={{background: '#111827', color: 'white', padding: '16px', borderRadius: '16px', display: 'flex', gap: '20px', justifyContent: 'space-around', minWidth: '240px', alignItems: 'center'}}>
            <div style={{textAlign: 'center'}}><span style={{display:'block',fontSize:'20px',fontWeight:'bold'}}>{score}</span><label style={{fontSize:'12px',color:'#9ca3af'}}>XP</label></div>
            <div style={{textAlign: 'center'}}><span style={{display:'block',fontSize:'20px',fontWeight:'bold'}}>{streak} 🔥</span><label style={{fontSize:'12px',color:'#9ca3af'}}>Σερί</label></div>
          </div>
        </div>

        <div className="twoCol" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px'}}>
          <div className="card" style={{background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}>
            <h3 style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}><ShieldCheck color="#0056b3"/> Θυμόμαστε — Μαθαίνουμε</h3>
            {theorySteps.map((step, i) => (
              <div key={i} style={{background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e2e8f0'}}>
                <strong style={{color: '#0056b3', display: 'block', marginBottom: '4px'}}>{step.title}</strong>
                <p style={{fontSize: '14px', color: '#334155'}}>{step.text}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}>
            <h3 style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}><Sparkles color="#eab308"/> Κουίζ Αστραπή</h3>
            {currentQ ? (
              <div>
                <p style={{fontWeight: '600', marginBottom: '16px', fontSize: '16px'}}>{currentQ.q}</p>
                {options.map((opt, i) => {
                  let btnStyle = {width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0', background:'white', marginBottom:'8px', textAlign:'left', fontWeight:'500', cursor:'pointer'}
                  if (answered) {
                    if (opt === currentQ.correct) { btnStyle.background = '#d1fae5'; btnStyle.borderColor = '#10b981'; }
                    else if (opt === selected) { btnStyle.background = '#fee2e2'; btnStyle.borderColor = '#ef4444'; }
                  }
                  return (
                    <button key={i} style={btnStyle} onClick={() => handleAnswer(opt)} disabled={answered}>
                      {opt}
                    </button>
                  )
                })}
                {answered && (
                  <button onClick={nextQuestion} style={{marginTop:'12px', background:'#0056b3', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
                    Επόμενη ερώτηση
                  </button>
                )}
              </div>
            ) : (
              <div style={{textAlign:'center', padding:'20px'}}>
                <p style={{fontSize:'18px', fontWeight:'bold'}}>🎉 Συγχαρητήρια!</p>
                <p>Ολοκληρώσατε την αποστολή αυτής της ενότητας!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [activeLesson, setActiveLesson] = useState('1.1')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedChapters, setExpandedChapters] = useState({ A1: true })

  const toggleChapter = (cid) => {
    setExpandedChapters(prev => ({ ...prev, [cid]: !prev[cid] }))
  }

  return (
    <div className="home" style={{display: 'flex', minHeight: '100vh', padding: 0, background: '#f0f4f8'}}>
      {/* SIDEBAR */}
      <div className="desktopSidebar" style={{width: '320px', background: '#1a2536', color: 'white', display: 'flex', flexDirection: 'column'}}>
        <div style={{padding: '24px', background: 'rgba(0,0,0,0.2)', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}>
          🏛️ Αρχική
        </div>
        <div style={{flex: 1, overflowY: 'auto', padding: '16px'}}>
          {curriculum.map((part, pIdx) => (
            <div key={pIdx}>
              <div style={{fontSize:'11px', textTransform:'uppercase', color:'#7f8c8d', margin:'16px 0 8px 8px', letterSpacing:'1px'}}>{part.part} — {part.title}</div>
              {part.chapters.map((ch) => (
                <div key={ch.id}>
                  <div onClick={() => toggleChapter(ch.id)} style={{padding:'12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontWeight:'600', fontSize:'14px', marginBottom:'4px'}}>
                    <span>{ch.title}</span>
                    {expandedChapters[ch.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                  </div>
                  {expandedChapters[ch.id] && ch.lessons.map(les => (
                    <div key={les.id} onClick={() => setActiveLesson(les.id)} style={{padding:'10px 16px', marginLeft:'12px', borderRadius:'6px', cursor:'pointer', fontSize:'13px', background: activeLesson === les.id ? '#0056b3' : 'transparent', color: activeLesson === les.id ? 'white' : '#cbd5e1', marginBottom:'2px', display:'flex', justifyContent:'space-between'}}>
                      <span>{les.id} {les.title}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        <div className="topbar" style={{background:'white', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{fontWeight:'bold', fontSize:'16px', display:'flex', alignItems:'center', gap:'8px'}}>📜 Ακαδημία Ηρώων των Αρχαίων Ελληνικών</div>
          <button style={{padding:'8px 16px', borderRadius:'20px', border:'1px solid #e2e8f0', background:'white', fontWeight:'500'}}>Δες τα μαθήματα</button>
        </div>
        
        <div style={{flex: 1, padding: '32px', overflowY: 'auto'}}>
          {activeLesson === '1.1' ? <Lesson11 /> : (
            <div className="card" style={{background:'white', padding:'30px', borderRadius:'16px', textAlign:'center'}}>
              <h3>📚 Ενότητα {activeLesson}</h3>
              <p style={{color:'#64748b', marginTop:'8px'}}>Το περιεχόμενο αυτής της ενότητας θα προστεθεί σύντομα!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App />)
