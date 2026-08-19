import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A component to re-center the map when the search result changes
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14);
    }
  }, [center, map]);
  return null;
}

export default function SafetyMap({ apiBase, zones, setZones }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [center, setCenter] = useState([37.7749, -122.4194]); // Default SF
  const [safetyScore, setSafetyScore] = useState(100);

  // Fetch zones on load
  useEffect(() => {
    fetchZones();
    // Get user's actual location if possible
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setCenter(coords);
        calculateScore(coords[0], coords[1], zones);
      });
    }
  }, []);

  const fetchZones = async () => {
    try {
      const res = await axios.get(`${apiBase}/zones`);
      setZones(res.data);
      calculateScore(center[0], center[1], res.data);
    } catch (err) {
      console.error("Failed to load danger zones", err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    try {
      // Use OpenStreetMap Nominatim for free geocoding
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      if (res.data && res.data.length > 0) {
        const lat = parseFloat(res.data[0].lat);
        const lon = parseFloat(res.data[0].lon);
        setCenter([lat, lon]);
        calculateScore(lat, lon, zones);
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }
  };

  const calculateScore = (lat, lng, currentZones) => {
    if (!currentZones || currentZones.length === 0) {
      setSafetyScore(100);
      return;
    }

    // Simple proximity algorithm: 
    // Decrease score based on distance to nearest danger zones
    let minDistance = Infinity;
    currentZones.forEach(z => {
      // Haversine approx
      const dLat = (z.lat - lat) * (Math.PI / 180);
      const dLon = (z.lng - lng) * (Math.PI / 180);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat * (Math.PI/180)) * Math.cos(z.lat * (Math.PI/180)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = 6371 * c; // Distance in km
      if (distance < minDistance) minDistance = distance;
    });

    // If a danger zone is within 0.5km, score drops significantly
    let score = 100;
    if (minDistance < 0.5) score = 30;
    else if (minDistance < 1.0) score = 55;
    else if (minDistance < 3.0) score = 80;
    
    setSafetyScore(score);
  };

  const getZoneColor = (severity) => {
    if (severity >= 80) return 'var(--danger)'; // Red
    if (severity >= 50) return '#f59e0b'; // Amber
    return '#eab308'; // Yellow
  };

  const getScoreColor = () => {
    if (safetyScore >= 80) return 'var(--safe)';
    if (safetyScore >= 50) return '#f59e0b'; // Amber
    return 'var(--danger)';
  };

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Search Overlay */}
      <form onSubmit={handleSearch} className="map-search-bar">
        <input 
          type="text" 
          placeholder="Find Safe Location, Contact..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit"><Search size={20} /></button>
      </form>

      {/* Safety Score Overlay */}
      <div className="safety-score-badge">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SAFETY SCORE</span>
        <span className="safety-score-val" style={{ color: getScoreColor() }}>{safetyScore}</span>
      </div>

      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <MapUpdater center={center} />
        
        {/* CartoDB Dark Matter Base Map */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Current Search/Location Marker */}
        <Marker position={center}>
          <Popup>Current Focus Area</Popup>
        </Marker>

        {/* Danger Zones (Color coded by severity) */}
        {zones && zones.map((zone, idx) => {
          const zoneColor = getZoneColor(zone.severity || 80);
          return (
            <Circle 
              key={idx}
              center={[zone.lat, zone.lng]} 
              pathOptions={{ color: zoneColor, fillColor: zoneColor, fillOpacity: 0.4 }} 
              radius={zone.severity >= 80 ? 400 : 250}
            >
              <Popup>
                <strong>Reported Danger Zone</strong><br/>
                {zone.address}<br/>
                <span style={{color: zoneColor, fontWeight: 'bold'}}>{zone.severity >= 80 ? 'Extreme Danger' : 'Caution/Moderate'}</span><br/>
                {zone.description}
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}
