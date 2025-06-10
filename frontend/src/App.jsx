import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";


function LoginPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [email, setEmail] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_name: hospitalName, email }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Registration successful! Your Hospital ID is: ${data.hospital_id}`);
        setHospitalName('');
        setEmail('');
        setShowRegister(false);
      } else {
        setMessage(data.detail || 'Registration failed');
      }
    } catch (error) {
      setMessage('Error connecting to the server');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: hospitalId }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Welcome, ${data.hospital_name}!`);
        setHospitalId('');
        navigate('/alerts');
      } else {
        setMessage(data.detail || 'Login failed');
      }
    } catch (error) {
      setMessage('Error connecting to the server');
    }
  };

  return (
    <div className="h-screen relative flex items-center justify-center">
      <div className="absolute z-[70] bg-white bg-opacity-80 p-8 rounded-lg -lg max-w-md w-full">
        {showRegister ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">Register Hospital</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Hospital Name</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-zinc-600 text-white p-2 rounded hover:bg-zinc-700">
                Register
              </button>
            </form>
            <p className="mt-4 text-center">
              Already have an account?{' '}
              <button
                className="text-zinc-600 hover:underline"
                onClick={() => setShowRegister(false)}
              >
                Login
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Hospital ID</label>
                <input
                  type="text"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full p-2 border rounded"
                  maxLength={4}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-zinc-600 text-white p-2 rounded hover:bg-zinc-700">
                Login
              </button>
            </form>
            <p className="mt-4 text-center">
              No account?{' '}
              <button
                className="text-zinc-600 hover:underline"
                onClick={() => setShowRegister(true)}
              >
                Register
              </button>
            </p>
          </>
        )}
        {message && <p className="mt-4 text-center text-red-600">{message}</p>}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="mt-4 w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            Install SEKMED App
          </button>
        )}
      </div>
    </div>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  // Google Maps API key from environment variable
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Load Google Maps API script
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
  });

  // Custom map styles
  const customMapStyles = [
    {
      featureType: "all",
      elementType: "geometry",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "all",
      elementType: "labels",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "administrative",
      elementType: "geometry.fill",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "administrative.country",
      elementType: "all",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "administrative.province",
      elementType: "all",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "administrative.locality",
      elementType: "labels",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#2c2c2c" }, { weight: "2.00" }],
    },
    {
      featureType: "administrative.neighborhood",
      elementType: "labels",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "administrative.neighborhood",
      elementType: "labels.text.fill",
      stylers: [{ color: "#696969" }],
    },
    {
      featureType: "landscape",
      elementType: "geometry.fill",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "landscape.man_made",
      elementType: "geometry.fill",
      stylers: [{ visibility: "none" }],
    },
    {
      featureType: "poi",
      elementType: "geometry.fill",
      stylers: [{ visibility: "none"}] },
    {
      featureType: "poi.park",
      elementType: "geometry.fill",
      stylers: [{ color: "#f6f6f6" }, { visibility: "none" }],
    },
    {
      featureType: "road",
      elementType: "geometry.fill",
      stylers: [{ weight: "0.50" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "none" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.fill",
      stylers: [{ color: "#565656" }, { weight: "0.50" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "none" }, { weight: "0.01" }],
    },
    {
      featureType: "road.highway.controlled_access",
      elementType: "geometry.fill",
      stylers: [{ weight: "0.50" }, { color: "#8e8e8e" }],
    },
    {
      featureType: "road.highway.controlled_access",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "none" }],
    },
    {
      featureType: "road.arterial",
      elementType: "geometry.fill",
      stylers: [{ color: "#000000" }],
    },
    {
      featureType: "road.arterial",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "none" }, { weight: "0.50" }],
    },
    {
      featureType: "road.local",
      elementType: "geometry.fill",
      stylers: [{ color: "#b7b7b7" }],
    },
    {
      featureType: "road.local",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "none" }],
    },
    {
      featureType: "transit.line",
      elementType: "geometry.fill",
      stylers: [{ color: "#404040" }],
    },
    {
      featureType: "transit.line",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "none" }],
    },
    {
      featureType: "transit.station",
      elementType: "geometry.fill",
      stylers: [{ visibility: "none" }],
    },
    {
      featureType: "water",
      elementType: "geometry.fill",
      stylers: [{ color: "#dedede" }],
    },
  ];

  // Handle API key and load errors
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API key is not set in .env file");
      setMessage("Google Maps API key is missing");
    }
    if (loadError) {
      console.error("Failed to load Google Maps API:", loadError);
      setMessage("Failed to load Google Maps");
    }
  }, [loadError]);

  useEffect(() => {
    // Fetch initial alerts
    const fetchAlerts = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/alerts");
        const data = await response.json();
        if (response.ok) {
          setAlerts(data);
        } else {
          setMessage(data.detail || "Failed to fetch alerts");
        }
      } catch (error) {
        setMessage("Error connecting to the server");
      }
    };
    fetchAlerts();

    // Establish WebSocket connection
    const ws = new WebSocket("ws://localhost:8000/ws/alerts");
    ws.onopen = () => {
      console.log("WebSocket connected");
    };
    ws.onmessage = (event) => {
      const newAlert = JSON.parse(event.data);
      // Validate new alert structure
      if (newAlert && newAlert.id && newAlert.premature_diagnoses) {
        setAlerts((prevAlerts) => [...prevAlerts, newAlert]);
        setMessage("New alert received!");
      } else {
        console.warn("Received invalid alert via WebSocket:", newAlert);
      }
    };
    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    // Cleanup WebSocket on component unmount
    return () => {
      ws.close();
    };
  }, []);

  // Map container style
  const mapContainerStyle = {
    width: "100vw",
    height: "100vh",
  };

  // Get center for the map
  const defaultCenter = { lat: 0, lng: 0 };
  const validAlerts = alerts.filter((alert) => alert.Location && alert.Location.lat != null && alert.Location.lng != null);
  const mapCenter = validAlerts.length > 0 ? { lat: validAlerts[0].Location.lat, lng: validAlerts[0].Location.lng } : defaultCenter;

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Header */}
      <header className="absolute top-0 left-0 z-10 mx-4 my-2 text-left">
        <span className="text-3xl font-bold text-zinc-800">
          sekmed*
          <span className="text-sm bg-zinc-800 font-light px-1 text-white">ems</span>
        </span>
      </header>

      {/* Map and Message */}
      <div className="relative flex-grow">
        {message && (
          <p className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10 text-center text-red-50 bg-red-700 px-2 py-1 rounded-full">
            {message}
          </p>
        )}
        {isLoaded && validAlerts.length > 0 ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={13}
            options={{ styles: customMapStyles,
              mapTypeControl: false,
             }}
          >
            {validAlerts.map((alert) => (
              <Marker
                key={alert.id}
                position={{ lat: alert.Location.lat, lng: alert.Location.lng }}
                onClick={() => setSelectedAlertId(alert.id)}
              >
                {selectedAlertId === alert.id && (
                  <InfoWindow onCloseClick={() => setSelectedAlertId(null)}>
                    <div className=" max-w-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {alert.premature_diagnoses || "No diagnosis provided"}
                      </ReactMarkdown>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
        ) : (
          <div className="w-full h-screen flex items-center justify-center bg-zinc-800">
            <p className="text-zinc-50 text-lg">Map unavailable</p>
          </div>
        )}
      </div>

      
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>     
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

