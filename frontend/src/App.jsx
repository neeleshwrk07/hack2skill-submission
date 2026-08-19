import React, { useState, useEffect } from 'react';
import { Shield, Clock, Phone, AlertOctagon, CheckCircle2, UserPlus, ArrowLeft, Mic, Sun, Moon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [view, setView] = useState('dashboard'); // dashboard, setup, active, contacts
  const [journeyId, setJourneyId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAlert, setIsAlert] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [theme, setTheme] = useState(localStorage.getItem('aura_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aura_theme', theme);
  }, [theme]);
  
  // Polish: State for showing actual notified contacts and location
  const [notifiedContacts, setNotifiedContacts] = useState([]);
  const [location, setLocation] = useState(null);

  // Polish: Load active journey from localStorage on mount (Resilience against page refresh)
  useEffect(() => {
    const savedJourney = localStorage.getItem('aura_journey_id');
    const savedEndTime = localStorage.getItem('aura_journey_end');
    
    if (savedJourney && savedEndTime) {
      const end = parseInt(savedEndTime, 10);
      const now = Date.now();
      if (end > now) {
        setJourneyId(savedJourney);
        setTimeLeft(Math.floor((end - now) / 1000));
        setView('active');
      } else {
        localStorage.removeItem('aura_journey_id');
        localStorage.removeItem('aura_journey_end');
      }
    }
  }, []);

  // Timer logic
  useEffect(() => {
    let interval;
    if (view === 'active' && timeLeft > 0 && !isAlert) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            triggerAlert();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, timeLeft, isAlert]);

  // Offline detection logic
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Helper for geolocation
  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => resolve(null)
      );
    });
  };

  const triggerAlert = async () => {
    setIsAlert(true);
    
    // Polish: Fetch contacts to show who we are simulating SMS to
    try {
      const res = await fetch(`${API_BASE}/contacts`);
      const contactsData = await res.json();
      setNotifiedContacts(contactsData);
    } catch(e) {
      const local = localStorage.getItem('aura_contacts');
      if (local) setNotifiedContacts(JSON.parse(local));
    }
    
    // Polish: Grab real geolocation
    const loc = await getLocation();
    if (loc) {
      setLocation(loc);
    }

    if (journeyId) {
      try {
        await fetch(`${API_BASE}/journeys/${journeyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ALERT', location: loc })
        });
      } catch (err) {
        console.error("Backend not running, but alert triggered locally");
      }
    }
  };

  const markSafe = async () => {
    setIsAlert(false);
    setView('dashboard');
    
    // Polish: Clear resilient storage
    localStorage.removeItem('aura_journey_id');
    localStorage.removeItem('aura_journey_end');

    if (journeyId) {
      try {
        await fetch(`${API_BASE}/journeys/${journeyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SAFE' })
        });
      } catch (err) {}
    }
    setJourneyId(null);
    setLocation(null);
  };

  const startJourney = async (activity, minutes) => {
    const seconds = minutes * 60;
    setTimeLeft(seconds);
    setView('active');
    
    // Polish: Save to local storage for refresh resilience
    const end = Date.now() + (seconds * 1000);
    localStorage.setItem('aura_journey_end', end.toString());

    try {
      const res = await fetch(`${API_BASE}/journeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity, durationMinutes: minutes })
      });
      const data = await res.json();
      setJourneyId(data._id);
      localStorage.setItem('aura_journey_id', data._id);
    } catch (err) {
      console.warn("Backend not running, proceeding with local state only.");
      // Still store a fake ID so timer persists
      localStorage.setItem('aura_journey_id', 'local-only-id');
    }
  };

  const handleVoiceCheckIn = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('Listening...');
    };

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      
      if (journeyId) {
        try {
          const res = await fetch(`${API_BASE}/journeys/${journeyId}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          });
          const data = await res.json();
          if (data.status === 'ALERT') {
            triggerAlert();
          }
        } catch (err) {
          console.error("AI check-in failed", err);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsRecording(false);
      setTranscript('Microphone error');
    };

    recognition.onend = () => {
      setIsRecording(false);
      setTimeout(() => setTranscript(''), 3000);
    };

    recognition.start();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {isOffline && view === 'active' && (
        <div className="offline-banner">
          ⚠️ Offline Mode: Don't worry, Aura's backend is still monitoring your timer and will auto-alert your contacts if you don't reconnect and check-in.
        </div>
      )}
      
      <div className="header" style={{ position: 'relative' }}>
        AURA
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
          style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
        >
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
      </div>
      
      <div className="content-area">
        {view === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Your personal safety net is active.
            </p>
            
            <div className="sos-button-container">
              <div className="sos-ripple"></div>
              <button 
                className="sos-button" 
                onClick={triggerAlert}
              >
                SOS
              </button>
            </div>
            
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'auto', fontSize: '0.9rem' }}>
              Tap for immediate emergency alert
            </p>

            <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
              <button className="btn-primary" onClick={() => setView('setup')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Clock size={20} /> Start Journey
              </button>
              <button className="btn-primary" onClick={() => setView('contacts')} style={{ background: 'var(--glass-bg)', color: 'var(--text-main)', boxShadow: 'none' }}>
                <UserPlus size={20} />
              </button>
            </div>
          </div>
        )}

        {view === 'setup' && (
          <JourneySetup onStart={startJourney} onCancel={() => setView('dashboard')} />
        )}

        {view === 'active' && (
          <div className="glass-panel" style={{ textAlign: 'center', margin: 'auto', width: '100%' }}>
            <Shield size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: '8px' }}>Journey Active</h2>
            <p style={{ color: 'var(--text-muted)' }}>We're looking out for you.</p>
            
            <div className="timer-display">
              {formatTime(timeLeft)}
            </div>
            
            {transcript && (
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontStyle: 'italic', color: 'var(--text-main)' }}>
                "{transcript}"
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-primary" 
                onClick={handleVoiceCheckIn} 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', flex: 1, background: isRecording ? '#ef4444' : 'var(--glass-bg)', color: isRecording ? 'white' : 'var(--text-main)' }}
              >
                <Mic size={24} className={isRecording ? 'alert-pulse' : ''} />
              </button>
              <button className="btn-primary btn-safe" onClick={markSafe} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', flex: 3 }}>
                <CheckCircle2 size={24} /> Safe
              </button>
            </div>
          </div>
        )}

        {view === 'contacts' && (
          <ContactsManager onBack={() => setView('dashboard')} />
        )}
      </div>

      {isAlert && (
        <div className="alert-backdrop" style={{ overflowY: 'auto' }}>
          <div className="alert-card alert-pulse">
            <AlertOctagon size={80} color="white" style={{ marginBottom: '24px', marginTop: '20px' }} />
            <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', textAlign: 'center' }}>EMERGENCY ALERT</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '20px', opacity: 0.9, textAlign: 'center', padding: '0 20px' }}>
              Your trusted contacts have been notified with your live location.
            </p>

            {location && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', width: '90%', maxWidth: '350px', margin: '0 auto 20px auto', textAlign: 'center' }}>
                📍 <strong>Location Fixed:</strong> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            )}

            {notifiedContacts.length > 0 && (
              <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', width: '90%', maxWidth: '350px', margin: '0 auto 40px auto' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '1rem', opacity: 0.9 }}>Simulating SMS Dispatch to:</h3>
                {notifiedContacts.map(c => (
                  <div key={c._id || c.phone} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                    <span>{c.name}</span>
                    <span style={{ color: '#4ade80' }}>Sent ✓</span>
                  </div>
                ))}
              </div>
            )}

            <button className="btn-primary btn-safe" onClick={markSafe} style={{ padding: '16px', fontSize: '1.1rem', width: '90%', maxWidth: '350px', margin: '0 auto', background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              Cancel Alert (I'm Safe)
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function JourneySetup({ onStart, onCancel }) {
  const [activity, setActivity] = useState('');
  const [minutes, setMinutes] = useState(30);

  return (
    <div className="glass-panel" style={{ margin: 'auto', width: '100%' }}>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-main)', marginBottom: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={20} /> Back
      </button>
      
      <h2 style={{ marginBottom: '24px' }}>Start a Session</h2>
      
      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>What are you doing?</label>
      <input 
        type="text" 
        className="input-field" 
        placeholder="e.g. Walking home, Taking Uber"
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
      />

      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Expected Duration (Minutes)</label>
      <input 
        type="number" 
        className="input-field" 
        min="1"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
      />

      <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => onStart(activity || 'Active Session', parseInt(minutes) || 30)}>
        Start Timer
      </button>
    </div>
  );
}

function ContactsManager({ onBack }) {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/contacts`)
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(err => {
        console.warn("Backend not running, using local storage fallback.");
        const local = localStorage.getItem('aura_contacts');
        if (local) setContacts(JSON.parse(local));
      });
  }, []);

  const addContact = async () => {
    if (!name || !phone) return;
    try {
      const res = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, relationship: 'Trusted' })
      });
      const newContact = await res.json();
      setContacts([...contacts, newContact]);
    } catch (err) {
      const newContact = { _id: Date.now().toString(), name, phone };
      const updated = [...contacts, newContact];
      setContacts(updated);
      localStorage.setItem('aura_contacts', JSON.stringify(updated));
    }
    setName('');
    setPhone('');
  };

  const removeContact = async (id) => {
    try {
      await fetch(`${API_BASE}/contacts/${id}`, { method: 'DELETE' });
      setContacts(contacts.filter(c => c._id !== id));
    } catch (err) {
      const updated = contacts.filter(c => c._id !== id);
      setContacts(updated);
      localStorage.setItem('aura_contacts', JSON.stringify(updated));
    }
  };

  return (
    <div className="glass-panel" style={{ margin: 'auto', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-main)', marginBottom: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={20} /> Back
      </button>
      
      <h2 style={{ marginBottom: '24px' }}>Trusted Contacts</h2>
      
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
        {contacts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No contacts added yet.</p>
        ) : (
          contacts.map(c => (
            <div key={c._id} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{c.phone}</div>
              </div>
              <button onClick={() => removeContact(c._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>Remove</button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Name" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: '8px' }}
        />
        <input 
          type="text" 
          className="input-field" 
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ marginBottom: '8px' }}
        />
        <button className="btn-primary" onClick={addContact}>Add Contact</button>
      </div>
    </div>
  );
}
