import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Plus, FileDown, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Image as ImageIcon, Trash2, Pencil } from 'lucide-react';

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
interface Field {
  id: string;
  name: string;
  status: 'OK' | 'Replace' | null;
  comments: string;
  photoUrl: string | null;
}

interface Station {
  id: number;
  name: string;
  fields: Field[];
}

const defaultChecklist: Field[] = excelRows.map((name, index) => ({
  id: String(index + 1),
  name: name,
  status: null,
  comments: '',
  photoUrl: null
}));

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Pre-load the professional PDF generation library
  useEffect(() => {
    if (!document.getElementById('html2pdf-script')) {
      const script = document.createElement('script');
      script.id = 'html2pdf-script';
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const savedData = await loadFromDB('stations-data');
      if (savedData && savedData.length > 0) {
        setStations(savedData);
      } else {
        setStations([{ id: Date.now(), name: 'Station 1', fields: JSON.parse(JSON.stringify(defaultChecklist)) }]);
      }
      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) saveToDB('stations-data', stations);
  }, [stations, isLoaded]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-500">Loading App...</div>;
  }

  const currentStation = stations[currentIndex];

  const handleAddStation = () => {
    const stationName = window.prompt('Enter name for the new station:', `Station ${stations.length + 1}`);
    if (stationName) {
      setStations([
        ...stations,
        { id: Date.now(), name: stationName, fields: JSON.parse(JSON.stringify(defaultChecklist)) }
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
      const freshStart = [{ id: Date.now(), name: 'Station 1', fields: JSON.parse(JSON.stringify(defaultChecklist)) }];
      await saveToDB('stations-data', freshStart);
      setStations(freshStart);
      setCurrentIndex(0);
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
    setIsGeneratingPDF(true);
    
    setTimeout(() => {
      const element = document.getElementById('pdf-content');
      if (!element) {
        setIsGeneratingPDF(false);
        return;
      }
      
      const opt = {
        margin:       15, // Strict 15mm margin on all 4 sides for perfect centering
        filename:     `Victor_Inspection_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          windowWidth: 800 // Locks the virtual capture window size to prevent right-edge clipping
        },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'], before: '.print-page-break', avoid: '.page-break-inside-avoid' } 
      };
      
      try {
        // @ts-ignore
        window.html2pdf().set(opt).from(element).save().then(() => {
          setIsGeneratingPDF(false); 
        }).catch((err: any) => {
          console.error("PDF generation failed:", err);
          setIsGeneratingPDF(false);
          alert("Something went wrong while generating the PDF.");
        });
      } catch (err) {
        setIsGeneratingPDF(false);
        alert("PDF engine is still loading. Please try again in a few seconds.");
      }
    }, 500); 
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {isGeneratingPDF && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-8 border-gray-100 border-t-[#00843D] rounded-full animate-spin mb-6"></div>
          <h2 className="text-3xl font-black text-[#00843D] mb-2">Generating PDF</h2>
          <p className="text-gray-600 font-medium text-lg">Formatting your report...</p>
        </div>
      )}

      {!isGeneratingPDF && (
        <header className="bg-[#00843D] text-white p-4 shadow-md sticky top-0 z-10">
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
      )}

      {/* Main Content Area - Expands to exactly 800px width with extra side padding to stop cutoff */}
      <main 
        id="pdf-content" 
        className={`mx-auto ${isGeneratingPDF ? 'w-[800px] bg-white text-black px-10 py-4' : 'max-w-md p-4'}`}
      >
        {stations.map((station, index) => (
          <div 
            key={station.id} 
            className={`${index === currentIndex || isGeneratingPDF ? 'block' : 'hidden'} ${index > 0 && isGeneratingPDF ? 'print-page-break pt-8' : ''}`}
          >
            
            {/* Custom High-Res PDF Header */}
            <div className={`p-4 border-b-4 border-[#00843D] mb-8 items-center justify-between ${isGeneratingPDF ? 'flex' : 'hidden'}`}>
              <div>
                <h1 className="text-4xl font-black text-[#00843D]">Inspection Report</h1>
                <p className="text-gray-600 font-medium mt-2 text-lg">Generated on: {new Date().toLocaleDateString()}</p>
              </div>
              <img src={VICTOR_LOGO} alt="Victor Logo" className="h-20 w-20 object-contain" />
            </div>

            <h2 className={`font-bold px-4 bg-gray-100 border-[#FFD100] text-gray-900 ${isGeneratingPDF ? 'text-3xl mb-6 py-3 border-l-8 block' : 'hidden'}`}>
              {station.name}
            </h2>

            <div className="space-y-4">
              {station.fields.map((field) => (
                <div 
                  key={field.id} 
                  className={`bg-white page-break-inside-avoid ${isGeneratingPDF ? 'border-b-2 border-gray-200 pb-6 mb-6' : 'p-4 rounded-xl shadow-sm border border-gray-100'}`}
                >
                  
                  <h3 className={`font-semibold text-gray-800 mb-3 ${isGeneratingPDF ? 'text-xl' : 'text-base'}`}>{field.name}</h3>
                  
                  {!isGeneratingPDF ? (
                    <div className="flex space-x-3 mb-3">
                      <button
                        onClick={() => updateField(station.id, field.id, 'status', 'OK')}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border-2 transition text-sm ${
                          field.status === 'OK' 
                            ? 'bg-[#00843D] border-[#00843D] text-white font-bold' 
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <CheckCircle2 className="mr-2" size={18} />
                        OK
                      </button>
                      <button
                        onClick={() => updateField(station.id, field.id, 'status', 'Replace')}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border-2 transition text-sm ${
                          field.status === 'Replace' 
                            ? 'bg-[#FFD100] border-[#FFD100] text-gray-900 font-bold' 
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <AlertTriangle className="mr-2" size={18} />
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div className="mb-2 text-lg">
                      Status: <strong className={field.status === 'Replace' ? 'text-red-600 font-bold' : field.status === 'OK' ? 'text-[#00843D] font-bold' : 'text-gray-500'}>{field.status || 'Not Evaluated'}</strong>
                    </div>
                  )}

                  <div className={`flex gap-2 ${isGeneratingPDF ? 'block mt-2' : ''}`}>
                    
                    {!isGeneratingPDF ? (
                      <textarea
                        className="flex-1 bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#00843D] focus:border-[#00843D] focus:outline-none resize-none"
                        rows={2}
                        maxLength={200}
                        placeholder="Additional comments..."
                        value={field.comments}
                        onChange={(e) => updateField(station.id, field.id, 'comments', e.target.value)}
                      />
                    ) : (
                      field.comments && (
                        // break-words and extra padding explicitly prevents text cutoff at the edge
                        <div className="mt-2 text-gray-700 bg-gray-50 py-4 px-5 rounded-lg border border-gray-100 whitespace-pre-wrap text-base break-words">
                          <strong>Comments: </strong>{field.comments}
                        </div>
                      )
                    )}
                    
                    {!isGeneratingPDF && (
                      <div className="relative flex-shrink-0 w-20">
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
                    )}
                  </div>

                  {field.photoUrl && (
                    <div className={`mt-3 relative rounded-lg overflow-hidden border border-gray-200 ${isGeneratingPDF ? 'mt-4 border-none flex justify-start' : ''}`}>
                      <img 
                        src={field.photoUrl} 
                        alt="Inspection" 
                        className={`w-full object-cover ${isGeneratingPDF ? 'max-h-80 w-auto rounded-xl border border-gray-300' : 'h-32'}`} 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {!isGeneratingPDF && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
      )}
    </div>
  );
}
