// VERSION 16
import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Plus, FileDown, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Image as ImageIcon, Trash2, Pencil, Settings2, Info, AlertOctagon } from 'lucide-react';

const VICTOR_LOGO = "/IMG_0310.jpeg";

const excelRows = [
  "TIP/NOZZLE CLEAR ORIFICES", "TORCH HEAD SEAT SURFACE(S)", "NOZZLE NUT SECURE",
  "UNNATURAL BEND IN TUBES/NOZZLE", "CUTTING O2 VALVE AND LEVER", "INLET CONNECTION(S)",
  "PREHEAT THROTTLE VALVES", "ORINGS AND SEAT SURFACE(S)", "NO DAMAGE TO HANDLE",
  "INLET CONNECTION(S) ", "CHECK VALVE/FLASH ARRESTOR (if applicable)", "CORRECT GRADE FOR GAS/APPLICATION",
  "FITTINGS AND CONNECTIONS", "SURFACE CONDITION/DAMAGE", "CORRECT FOR GAS/APPLICATION",
  "GAUGE FUNCTION", "INLET NIPPLE AND SEAT", "OUTLET CONNECTION", "EXTERNAL DAMAGE",
  "ADAPTORS, OTHER", "SHUTOFF VALVE", "CHECK VALVE", "REGULATOR", "FLASH ARRESTOR",
  "FILTER", "PRESSURIZED LEAK TEST", "TEST GAUGE ADAPTORS TO CHECK PRESSURE DROP",
  "PRESSURE AND FLOW REQUIREMENT MET AT TIP?"
];

// TypeScript Definitions
export type StatusType = 'OK' | 'Recommendation' | 'Low Priority' | 'Immediate Fix' | null;

interface Field {
  id: string;
  name: string;
  status: StatusType;
  comments: string;
  photoUrl: string | null;
}

interface StationConfig {
  product: string;
  nominalSettings: string;
  application: string;
  fuel: string;
  fuelOther: string;
}

interface Station {
  id: number;
  name: string;
  config: StationConfig;
  fields: Field[];
}

const defaultChecklist: Field[] = excelRows.map((name, index) => ({
  id: String(index + 1),
  name: name,
  status: null,
  comments: '',
  photoUrl: null
}));

const defaultStationConfig: StationConfig = {
  product: '',
  nominalSettings: '',
  application: '',
  fuel: '',
  fuelOther: ''
};

// --- BUTTON CONFIGURATION ---
const STATUS_OPTIONS: StatusType[] = ['OK', 'Recommendation', 'Low Priority', 'Immediate Fix'];

const STATUS_CONFIG: Record<Exclude<StatusType, null>, { icon: any, unselected: string, selected: string }> = {
  'OK': {
    icon: CheckCircle2,
    unselected: 'bg-white border-[#00843D] text-[#00843D] hover:bg-green-50',
    selected: 'bg-[#00843D] border-[#00843D] text-white'
  },
  'Recommendation': {
    icon: Info,
    unselected: 'bg-white border-gray-500 text-gray-500 hover:bg-gray-50',
    selected: 'bg-gray-500 border-gray-500 text-white'
  },
  'Low Priority': {
    icon: AlertTriangle,
    unselected: 'bg-white border-[#FFD100] text-gray-700 hover:bg-yellow-50',
    selected: 'bg-[#FFD100] border-[#FFD100] text-gray-900'
  },
  'Immediate Fix': {
    icon: AlertOctagon,
    unselected: 'bg-white border-red-600 text-red-600 hover:bg-red-50',
    selected: 'bg-red-600 border-red-600 text-white'
  }
};

// --- INDEXED DB SETUP ---
const DB_NAME = 'VictorInspectionsDB';
const STORE_NAME = 'stationsStore';
const DB_VERSION = 1;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveToDB = async (key: string, data: any) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save to database", error);
  }
};

const loadFromDB = async (key: string) => {
  try {
    const db = await initDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to load from database", error);
    return null;
  }
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [showStartupModal, setShowStartupModal] = useState(false);
  const [startupConfig, setStartupConfig] = useState<StationConfig>(defaultStationConfig);

  useEffect(() => {
    const loadData = async () => {
      const savedData = await loadFromDB('stations-data');
      
      if (savedData && savedData.length > 0) {
        // Backwards compatibility for older saves missing the config
        const migratedData = savedData.map((st: any) => ({
          ...st,
          config: st.config || { ...defaultStationConfig }
        }));
        setStations(migratedData);
      } else {
        setStations([]);
        setShowStartupModal(true);
      }
      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded && stations.length > 0) {
      saveToDB('stations-data', stations);
    }
  }, [stations, isLoaded]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-500">Loading App...</div>;
  }

  const currentStation = stations[currentIndex];

  const handleStartNewInspection = () => {
    const newStation: Station = {
      id: Date.now(),
      name: 'Station 1',
      config: { ...startupConfig },
      fields: JSON.parse(JSON.stringify(defaultChecklist))
    };
    setStations([newStation]);
    setCurrentIndex(0);
    setShowStartupModal(false);
  };

  const handleAddStation = () => {
    const stationName = window.prompt('Enter name for the new station:', `Station ${stations.length + 1}`);
    if (stationName) {
      setStations([
        ...stations,
        { 
          id: Date.now(), 
          name: stationName, 
          config: currentStation?.config ? JSON.parse(JSON.stringify(currentStation.config)) : { ...defaultStationConfig },
          fields: JSON.parse(JSON.stringify(defaultChecklist)) 
        }
      ]);
      setCurrentIndex(stations.length);
    }
  };

  const handleRenameStation = (stationId: number, currentName: string) => {
    const newName = window.prompt('Edit station name:', currentName);
    if (newName !== null && newName.trim() !== '') {
      setStations(prevStations => prevStations.map(st => 
        st.id === stationId ? { ...st, name: newName.trim() } : st
      ));
    }
  };

  const resetApp = async () => {
    const confirmReset = window.confirm("Are you sure you want to delete all saved data and start a new report? This cannot be undone.");
    if (confirmReset) {
      await saveToDB('stations-data', []);
      setStations([]);
      setCurrentIndex(0);
      setStartupConfig(defaultStationConfig);
      setShowStartupModal(true);
    }
  };

  const updateField = <K extends keyof Field>(stationId: number, fieldId: string, key: K, value: Field[K]) => {
    setStations(prevStations => prevStations.map(st => {
      if (st.id === stationId) {
        return {
          ...st,
          fields: st.fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f)
        };
      }
      return st;
    }));
  };

  const updateConfig = <K extends keyof StationConfig>(stationId: number, key: K, value: StationConfig[K]) => {
    setStations(prevStations => prevStations.map(st => {
      if (st.id === stationId) {
        const currentConfig = st.config || { ...defaultStationConfig };
        return { ...st, config: { ...currentConfig, [key]: value } };
      }
      return st;
    }));
  };

  const handlePhotoUpload = async (stationId: number, fieldId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        updateField(stationId, fieldId, 'photoUrl', compressedBase64);
      } catch (error) {
        alert("Sorry, there was an issue processing that photo.");
      }
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans print:bg-white print:pb-0">
      
      {showStartupModal && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center mb-4">
              <img src={VICTOR_LOGO} alt="Victor Logo" className="h-12 w-12 rounded-full border-2 border-[#00843D] mr-3 object-cover" />
              <h2 className="text-2xl font-black text-[#00843D]">New Inspection</h2>
            </div>
            <p className="text-gray-600 mb-6 text-center text-sm font-medium">Enter the initial equipment details. These will copy to future stations and can be modified later.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Product</label>
                <input 
                  type="text" 
                  className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                  placeholder="e.g. Victor Edge Series"
                  value={startupConfig.product} 
                  onChange={(e) => setStartupConfig({...startupConfig, product: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Application</label>
                <input 
                  type="text" 
                  className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                  placeholder="e.g. Heavy Cutting"
                  value={startupConfig.application} 
                  onChange={(e) => setStartupConfig({...startupConfig, application: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nominal Settings</label>
                <input 
                  type="text" 
                  className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                  placeholder="e.g. 40 PSIG O2, 10 PSIG Fuel"
                  value={startupConfig.nominalSettings} 
                  onChange={(e) => setStartupConfig({...startupConfig, nominalSettings: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fuel Gas</label>
                <select 
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                  value={startupConfig.fuel}
                  onChange={(e) => setStartupConfig({...startupConfig, fuel: e.target.value})}
                >
                  <option value="">Select a fuel...</option>
                  <option value="Acetylene">Acetylene</option>
                  <option value="Propane">Propane</option>
                  <option value="Propylene">Propylene</option>
                  <option value="Natural Gas">Natural Gas</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {startupConfig.fuel === 'Other' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Specify Other Fuel</label>
                  <input 
                    type="text" 
                    className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                    placeholder="Enter fuel type"
                    value={startupConfig.fuelOther} 
                    onChange={(e) => setStartupConfig({...startupConfig, fuelOther: e.target.value})} 
                  />
                </div>
              )}
              
              <button 
                onClick={handleStartNewInspection} 
                className="w-full bg-[#00843D] text-white font-bold py-4 rounded-lg mt-4 shadow-lg hover:bg-[#006A31] active:scale-95 transition"
              >
                Start Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {!showStartupModal && currentStation && (
        <>
          <header className="bg-[#00843D] text-white p-4 shadow-md sticky top-0 z-10 print:hidden">
            <div className="flex justify-between items-center max-w-md mx-auto">
              <div 
                className="flex items-center space-x-2 overflow-hidden cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => handleRenameStation(currentStation.id, currentStation.name)}
                title="Tap to rename station"
              >
                <img src={VICTOR_LOGO} alt="Victor Logo" className="h-8 w-8 flex-shrink-0 rounded-full bg-white object-cover border-2 border-[#FFD100]" />
                <h1 className="text-xl font-bold truncate text-white">{currentStation?.name || 'Inspection'}</h1>
                <Pencil size={16} className="text-[#FFD100] flex-shrink-0" />
              </div>
              <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                <button 
                  onClick={resetApp}
                  className="p-2 bg-[#006A31] rounded-full hover:bg-red-600 transition text-[#FFD100] hover:text-white"
                  title="Clear Data & Start Over"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={exportToPDF}
                  className="p-2 bg-[#006A31] rounded-full hover:bg-[#005226] transition text-[#FFD100]"
                  title="Export to PDF"
                >
                  <FileDown size={20} />
                </button>
              </div>
            </div>
          </header>

          <main className="p-4 max-w-md mx-auto print:max-w-full print:p-0">
            {stations.map((station, index) => (
              <div 
                key={station.id} 
                className={`${index === currentIndex ? 'block' : 'hidden print:block'} ${index > 0 ? 'print-page-break' : ''}`}
              >
                
                <div className="hidden print:flex p-4 border-b-4 border-[#00843D] mb-6 items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-[#00843D]">Inspection Report</h1>
                    <p className="text-gray-600 font-medium mt-1">Generated on: {new Date().toLocaleDateString()}</p>
                  </div>
                  <img src={VICTOR_LOGO} alt="Victor Logo" className="h-16 w-16 object-contain" />
                </div>

                <h2 className="hidden print:block text-2xl font-bold mb-4 px-4 bg-gray-100 py-2 border-l-4 border-[#FFD100] text-gray-900">
                  {station.name}
                </h2>

                {/* STATION CONFIGURATION CARD */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-6 print:border-none print:shadow-none print:mb-4 print:p-0 page-break-inside-avoid">
                  <div className="flex items-center mb-4 print:hidden">
                    <Settings2 size={20} className="text-[#00843D] mr-2" />
                    <h3 className="font-bold text-gray-800">Equipment Details</h3>
                  </div>
                  
                  {/* Mobile Interactive Form */}
                  <div className="space-y-3 print:hidden">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Product</label>
                      <input 
                        type="text" 
                        className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                        value={station.config?.product || ''} 
                        onChange={(e) => updateConfig(station.id, 'product', e.target.value)} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Application</label>
                        <input 
                          type="text" 
                          className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                          value={station.config?.application || ''} 
                          onChange={(e) => updateConfig(station.id, 'application', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Settings</label>
                        <input 
                          type="text" 
                          className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                          value={station.config?.nominalSettings || ''} 
                          onChange={(e) => updateConfig(station.id, 'nominalSettings', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fuel Gas</label>
                      <select 
                        className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                        value={station.config?.fuel || ''}
                        onChange={(e) => updateConfig(station.id, 'fuel', e.target.value)}
                      >
                        <option value="">Select...</option>
                        <option value="Acetylene">Acetylene</option>
                        <option value="Propane">Propane</option>
                        <option value="Propylene">Propylene</option>
                        <option value="Natural Gas">Natural Gas</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {station.config?.fuel === 'Other' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Specify Other</label>
                        <input 
                          type="text" 
                          className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#00843D] focus:outline-none"
                          value={station.config?.fuelOther || ''} 
                          onChange={(e) => updateConfig(station.id, 'fuelOther', e.target.value)} 
                        />
                      </div>
                    )}
                  </div>

                  {/* Print Layout for Config */}
                  <div className="hidden print:grid grid-cols-2 gap-y-2 gap-x-4 border-b-2 border-gray-800 pb-4 mb-2">
                    <div className="text-base"><strong className="text-gray-800 uppercase text-sm tracking-wide mr-2">Product:</strong> {station.config?.product || 'N/A'}</div>
                    <div className="text-base"><strong className="text-gray-800 uppercase text-sm tracking-wide mr-2">Application:</strong> {station.config?.application || 'N/A'}</div>
                    <div className="text-base"><strong className="text-gray-800 uppercase text-sm tracking-wide mr-2">Settings:</strong> {station.config?.nominalSettings || 'N/A'}</div>
                    <div className="text-base">
                      <strong className="text-gray-800 uppercase text-sm tracking-wide mr-2">Fuel Gas:</strong> 
                      {station.config?.fuel === 'Other' ? (station.config?.fuelOther || 'Other') : (station.config?.fuel || 'N/A')}
                    </div>
                  </div>
                </div>

                {/* CHECKLIST FIELDS */}
                <div className="space-y-4">
                  {station.fields.map((field) => (
                    <div key={field.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-b print:border-gray-200 print:rounded-none print:mb-2 print:p-2 page-break-inside-avoid">
                      <h3 className="font-semibold text-gray-800 mb-3 text-sm print:text-base">{field.name}</h3>
                      
                      {/* Status Buttons (Mobile View - 4 Button Grid) */}
                      <div className="grid grid-cols-2 gap-2 mb-3 print:hidden">
                        {STATUS_OPTIONS.map((statusKey) => {
                          const config = STATUS_CONFIG[statusKey];
                          const isSelected = field.status === statusKey;
                          const Icon = config.icon;
                          
                          return (
                            <button
                              key={statusKey}
                              onClick={() => updateField(station.id, field.id, 'status', statusKey)}
                              className={`flex items-center justify-center py-2.5 rounded-lg border-2 transition text-sm font-bold ${
                                isSelected ? config.selected : config.unselected
                              }`}
                            >
                              <Icon className="mr-1.5" size={16} />
                              {statusKey}
                            </button>
                          );
                        })}
                      </div>

                      {/* Status Rendering (PDF View - Native Print Badge) */}
                      <div className="hidden print:block mb-3">
                        <div className="flex items-center">
                          <span className="mr-3 font-bold text-gray-700 text-base">Status:</span>
                          {field.status && field.status in STATUS_CONFIG ? (
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border-2 text-sm font-bold ${STATUS_CONFIG[field.status].selected}`}>
                              {(() => {
                                const Icon = STATUS_CONFIG[field.status].icon;
                                return <Icon className="mr-1.5" size={16} />;
                              })()}
                              {field.status}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-bold text-base">Not Evaluated</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 print:block">
                        <textarea
                          className="flex-1 bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#00843D] focus:border-[#00843D] focus:outline-none resize-none print:border-none print:p-0 print:text-gray-600 print:bg-transparent break-words"
                          rows={2}
                          maxLength={200}
                          placeholder="Additional comments..."
                          value={field.comments}
                          onChange={(e) => updateField(station.id, field.id, 'comments', e.target.value)}
                        />
                        
                        <div className="relative print:hidden flex-shrink-0 w-20">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            id={`photo-${station.id}-${field.id}`}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
                            onChange={(e) => handlePhotoUpload(station.id, field.id, e)}
                          />
                          <div className={`h-full flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed ${field.photoUrl ? 'border-[#00843D] bg-green-50 text-[#00843D]' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                            {field.photoUrl ? <ImageIcon size={20} /> : <Camera size={20} />}
                            <span className="text-[10px] mt-1 font-medium">{field.photoUrl ? 'Change' : 'Photo'}</span>
                          </div>
                        </div>
                      </div>

                      {field.photoUrl && (
                        <div className="mt-3 relative rounded-lg overflow-hidden border border-gray-200 print:mt-2 print-photo-container">
                          <img src={field.photoUrl} alt="Inspection" className="w-full h-32 object-cover print:h-auto print:max-h-48 print:w-auto" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </main>

          <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe print:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <button 
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className={`p-2 rounded-full ${currentIndex === 0 ? 'text-gray-300' : 'text-[#00843D] hover:bg-green-50'}`}
              >
                <ChevronLeft size={28} />
              </button>
              
              <span className="text-sm font-bold text-gray-700 bg-gray-100 px-4 py-1 rounded-full border border-gray-200">
                {currentIndex + 1} of {stations.length}
              </span>
              
              {currentIndex === stations.length - 1 ? (
                <button 
                  onClick={handleAddStation}
                  className="flex items-center text-white bg-[#00843D] font-semibold px-4 py-2 rounded-full hover:bg-[#006A31] shadow-sm transition"
                >
                  <Plus size={18} className="mr-1" /> Add
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentIndex(Math.min(stations.length - 1, currentIndex + 1))}
                  className="p-2 rounded-full text-[#00843D] hover:bg-green-50"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>
          </footer>
        </>
      )}

      {/* Safari Native Print Rules */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background-color: white; 
          }
          .pb-safe { padding-bottom: 0; }
          .page-break-inside-avoid { break-inside: avoid; }
          .print-page-break { page-break-before: always; }
        }
      `}} />
    </div>
  );
}
