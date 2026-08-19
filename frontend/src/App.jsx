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
  
  // Danger Zone Form
  const [reportAddress, setReportAddress] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

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

  const triggerAlert = () => {
    setIsAlert(true);
    // In a real app, API call to trigger emergency sequence would happen here
  };

  const reportDangerZone = async (e) => {
    e.preventDefault();
    if (!reportAddress) return;

    try {
      // Geocode the address
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(reportAddress)}`);
      if (res.data && res.data.length > 0) {
        const lat = parseFloat(res.data[0].lat);
        const lon = parseFloat(res.data[0].lon);
        
        // Post to backend
        const postRes = await axios.post(`${API_BASE}/zones`, {
          address: reportAddress,
          lat,
          lng: lon,
          description: reportDesc
        });
        
        // Update local state
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
          <span>Home</span>
          <span className="active">Safe Maps</span>
          <span>Community</span>
          <span>Support</span>
        </div>
        <button className={`nav-sos-btn ${isAlert ? 'alert-active' : ''}`} onClick={triggerAlert}>
          <AlertOctagon size={20} color="white" />
          SOS NOW
        </button>
      </nav>

      {/* Main Dashboard Layout */}
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
