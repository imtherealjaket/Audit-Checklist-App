import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Plus, FileDown, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Image as ImageIcon, Trash2 } from 'lucide-react';

// Using standard image reference instead of base64 to ensure it loads perfectly.
// Because IMG_0310.jpeg is in the `public` folder, we can just reference it from the root.
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

// A helper function to compress large iPhone images down to a saveable size
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
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Returns a lightweight Base64 string that can easily be saved in the browser memory
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  // Load data from Local Storage when the app opens, or use defaults
  const [stations, setStations] = useState<Station[]>(() => {
    const savedData = localStorage.getItem('victor-inspections-data');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error("Failed to parse saved app data.");
      }
    }
    return [{ id: Date.now(), name: 'Station 1', fields: JSON.parse(JSON.stringify(defaultChecklist)) }];
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);

  // Automatically save to Local Storage every time a change is made
  useEffect(() => {
    localStorage.setItem('victor-inspections-data', JSON.stringify(stations));
  }, [stations]);

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

  const resetApp = () => {
    const confirmReset = window.confirm("Are you sure you want to delete all saved data and start a new report? This cannot be undone.");
    if (confirmReset) {
      localStorage.removeItem('victor-inspections-data');
      setStations([{ id: Date.now(), name: 'Station 1', fields: JSON.parse(JSON.stringify(defaultChecklist)) }]);
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
        // Compress the image before saving it so we don't crash the browser storage
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
      
      {/* Header - Victor Dark Green */}
      <header className="bg-[#00843D] text-white p-4 shadow-md sticky top-0 z-10 print:hidden">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img src={VICTOR_LOGO} alt="Victor Logo" className="h-8 w-8 rounded-full bg-white object-cover border-2 border-[#FFD100]" />
            <h1 className="text-xl font-bold truncate text-white">{currentStation.name}</h1>
          </div>
          <div className="flex items-center space-x-2">
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

      {/* Main Content - Maps through ALL stations to allow for multi-page PDF generation */}
      <main className="p-4 max-w-md mx-auto print:max-w-full print:p-0">
        {stations.map((station, index) => (
          <div 
            key={station.id} 
            // On screen: Only show if it's the current station. On print: Show all of them, and break page if it isn't the first one.
            className={`${index === currentIndex ? 'block' : 'hidden print:block'} ${index > 0 ? 'print-page-break' : ''}`}
          >
            
            {/* Print-only PDF Header - Added inside the loop so every station/page gets a nice header */}
            <div className="hidden print:flex p-4 border-b-4 border-[#00843D] mb-6 items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-[#00843D]">Inspection Report</h1>
                <p className="text-gray-600 font-medium mt-1">Generated on: {new Date().toLocaleDateString()}</p>
              </div>
              <img src={VICTOR_LOGO} alt="Victor Logo" className="h-16 w-16" />
            </div>

            {/* Print-only Station Title */}
            <h2 className="hidden print:block text-2xl font-bold mb-4 px-4 bg-gray-100 py-2 border-l-4 border-[#FFD100]">
              {station.name}
            </h2>

            <div className="space-y-4">
              {station.fields.map((field) => (
                <div key={field.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-b print:border-gray-200 print:rounded-none print:mb-2 print:p-2 page-break-inside-avoid">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm print:text-base">{field.name}</h3>
                  
                  {/* Status Toggles */}
                  <div className="flex space-x-3 mb-3 print:hidden">
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

                  {/* Print-only Status */}
                  <div className="hidden print:block mb-2 text-base">
                    Status: <strong className={field.status === 'Replace' ? 'text-amber-600' : 'text-green-700'}>{field.status || 'Not Evaluated'}</strong>
                  </div>

                  {/* Comments & Photo Row */}
                  <div className="flex gap-2 print:block">
                    <textarea
                      // bg-white and text-gray-900 force the box to remain light-mode even if the phone is in dark mode
                      className="flex-1 bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#00843D] focus:border-[#00843D] focus:outline-none resize-none print:border-none print:p-0 print:text-gray-600 print:bg-transparent"
                      rows={2}
                      maxLength={200} // Limits input so the PDF layout doesn't break
                      placeholder="Additional comments..."
                      value={field.comments}
                      onChange={(e) => updateField(station.id, field.id, 'comments', e.target.value)}
                    />
                    
                    {/* Photo Upload Button - Hidden on Print */}
                    <div className="relative print:hidden flex-shrink-0 w-20">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        id={`photo-${station.id}-${field.id}`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => handlePhotoUpload(station.id, field.id, e)}
                      />
                      <div className={`h-full flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed ${field.photoUrl ? 'border-[#00843D] bg-green-50 text-[#00843D]' : 'border-gray-300 text-gray-400 bg-gray-50'}`}>
                        {field.photoUrl ? <ImageIcon size={20} /> : <Camera size={20} />}
                        <span className="text-[10px] mt-1 font-medium">{field.photoUrl ? 'Change' : 'Photo'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Photo Preview */}
                  {field.photoUrl && (
                    <div className="mt-3 relative rounded-lg overflow-hidden border border-gray-200 print:mt-2">
                      <img src={field.photoUrl} alt="Inspection" className="w-full h-32 object-cover print:h-auto print:max-h-48 print:w-auto" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Navigation */}
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

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
          .page-break-inside-avoid { break-inside: avoid; }
          .print-page-break { page-break-before: always; }
        }
      `}} />
    </div>
  );
}
