import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Clock, Phone, AlertOctagon, UserPlus, MapPin, Search } from 'lucide-react';
import SafetyMap from './components/SafetyMap';
import './styles/global.css';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export default function App() {
  const [zones, setZones] = useState([]);
  const [isAlert, setIsAlert] = useState(false);
  const [contacts, setContacts] = useState([]);
  
  const [currentTab, setCurrentTab] = useState('home');
  const [timer, setTimer] = useState(null);
  const [timerDuration, setTimerDuration] = useState(1800); // Default 30 minutes

  // Danger Zone Form
  const [reportAddress, setReportAddress] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (timer !== null && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      // Timer finished! Trigger alert!
      setIsAlert(true);
      setTimer(null);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/contacts`);
      const data = await res.json();
      setContacts(data);
    } catch(e) {
      const local = localStorage.getItem('aura_contacts');
      if (local) setContacts(JSON.parse(local));
    }
  };

  const startSosSequence = () => {
    if (!isAlert) {
      setTimer(timerDuration);
    }
  };

  const cancelSosSequence = () => {
    setTimer(null);
  };

  const triggerAlert = () => {
    setIsAlert(true);
    setTimer(null);
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const reportDangerZone = async (e) => {
    e.preventDefault();
    if (!reportAddress) return;

    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(reportAddress)}`);
      if (res.data && res.data.length > 0) {
        const lat = parseFloat(res.data[0].lat);
        const lon = parseFloat(res.data[0].lon);
        
        const postRes = await axios.post(`${API_BASE}/zones`, {
          address: reportAddress,
          lat,
          lng: lon,
          description: reportDesc
        });
        
        setZones([...zones, postRes.data]);
        setReportAddress('');
        setReportDesc('');
        alert("Danger Zone successfully reported and added to the map.");
      } else {
        alert("Could not find coordinates for that address.");
      }
    } catch (err) {
      console.error("Failed to report zone", err);
      alert("Failed to report zone. Check console.");
    }
  };

  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <Shield size={28} color="var(--accent-red)" />
          HER SAFE ZONE
        </div>
        <div className="nav-links">
          <span className={currentTab === 'home' ? 'active' : ''} onClick={() => setCurrentTab('home')}>Home</span>
          <span className={currentTab === 'map' ? 'active' : ''} onClick={() => setCurrentTab('map')}>Safe Maps</span>
          <span>Community</span>
          <span>Support</span>
        </div>
        <button className={`nav-sos-btn ${isAlert || timer !== null ? 'alert-active' : ''}`} onClick={triggerAlert}>
          <AlertOctagon size={20} color="white" />
          SOS NOW
        </button>
      </nav>

      {/* Conditional Rendering Based on Tab */}
      {currentTab === 'home' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at center, #1a4548 0%, #113639 100%)' }}>
          {timer !== null ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--accent-red)', marginBottom: '24px' }}>SENDING ALERT IN</h2>
              <div style={{ fontSize: '6rem', fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: '40px', textShadow: '0 0 40px rgba(231, 54, 49, 0.8)' }}>
                {formatTime(timer)}
              </div>
              <button className="btn-secondary" onClick={cancelSosSequence} style={{ fontSize: '1.5rem', padding: '16px 32px', width: 'auto', background: 'var(--text-muted)' }}>
                CANCEL
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
              <button 
                onClick={startSosSequence}
                style={{
                  width: '250px', height: '250px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff3b30, #b91d17)',
                  color: 'white', border: '8px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 15px 40px rgba(231, 54, 49, 0.6), inset 0 8px 16px rgba(255, 255, 255, 0.3)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  cursor: 'pointer', transition: 'transform 0.2s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <AlertOctagon size={80} style={{ marginBottom: '12px' }} />
                <span style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '2px' }}>SOS</span>
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Alert Delay Timer
                </label>
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  {[{label: '30m', value: 1800}, {label: '60m', value: 3600}, {label: '2h', value: 7200}, {label: '3h', value: 10800}].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTimerDuration(option.value)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: timerDuration === option.value ? 'var(--accent-red)' : 'transparent',
                        color: timerDuration === option.value ? 'white' : 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="dashboard-container">
        
        {/* Left Side: Interactive Map */}
        <div className="map-section">
          <SafetyMap apiBase={API_BASE} zones={zones} setZones={setZones} />
        </div>

        {/* Right Side: Side Panel */}
        <div className="side-panel">
          
          {/* Active Emergency Status */}
          <div className={`panel-card ${isAlert ? 'emergency-card emergency-pulse' : ''}`}>
            <div className="panel-title" style={{ color: isAlert ? 'var(--accent-red)' : 'var(--text-main)' }}>
              <span>ACTIVE EMERGENCY</span>
              <AlertOctagon size={20} color={isAlert ? 'var(--accent-red)' : 'var(--text-muted)'} />
            </div>
            {isAlert ? (
              <p style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                1 active emergency sequence triggered. Full alert active.
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--safe)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--safe)', boxShadow: '0 0 8px var(--safe)' }}></div>
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>All systems normal. 0 active emergencies.</span>
              </div>
            )}
          </div>

          {/* Contacts List */}
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '300px' }}>
            <div className="panel-title" style={{ flexShrink: 0 }}>
              <span>MY CONTACTS</span>
              <UserPlus size={20} color="var(--accent-secondary)" />
            </div>
            <div style={{ overflowY: 'auto', paddingRight: '12px', flex: 1 }}>
              {contacts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No contacts loaded.</p>
              ) : (
                contacts.map(c => (
                  <div key={c._id || c.phone} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-secondary), #174246)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Report Danger Zone Form */}
          <div className="panel-card">
            <div className="panel-title">
              <span>REPORT SAFETY CONCERN</span>
              <MapPin size={20} color="var(--accent-red)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Add a dangerous area to the map via address to warn others and affect the safety score.
            </p>
            <form onSubmit={reportDangerZone}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Street Address or Landmark" 
                value={reportAddress}
                onChange={(e) => setReportAddress(e.target.value)}
                required
              />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Description (e.g. Unlit alley, weird person)" 
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" style={{ background: 'var(--accent-red)' }}>
                Add Danger Zone
              </button>
            </form>
          </div>

        </div>
      </div>
      )}

      {/* Full Screen Emergency Overlay */}
      {isAlert && (
        <div className="alert-backdrop">
          <div className="alert-modal">
            <div className="alert-icon-container">
              <AlertOctagon size={64} color="var(--accent-red)" />
            </div>
            <h1>EMERGENCY ACTIVE</h1>
            <p>Your trusted contacts have been notified with your live location.</p>
            <button className="btn-secondary" onClick={() => setIsAlert(false)} style={{ padding: '16px', fontSize: '1.1rem' }}>
              Cancel Alert (I'm Safe)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
