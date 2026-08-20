import { useState, ChangeEvent } from 'react';
import { Camera, Plus, FileDown, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';

// Embedded Logo (Base64)
const VICTOR_LOGO = "data:image/jpeg;base64,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";

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

export default function App() {
  const [stations, setStations] = useState<Station[]>([
    { id: Date.now(), name: 'Station 1', fields: JSON.parse(JSON.stringify(defaultChecklist)) }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const updateField = <K extends keyof Field>(fieldId: string, key: K, value: Field[K]) => {
    const updatedStations = [...stations];
    const fieldIndex = updatedStations[currentIndex].fields.findIndex((f: Field) => f.id === fieldId);
    if (fieldIndex > -1) {
      updatedStations[currentIndex].fields[fieldIndex][key] = value;
      setStations(updatedStations);
    }
  };

  const handlePhotoUpload = (fieldId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      updateField(fieldId, 'photoUrl', imageUrl);
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
          <button 
            onClick={exportToPDF}
            className="p-2 bg-[#006A31] rounded-full hover:bg-[#005226] transition text-[#FFD100]"
            title="Export to PDF"
          >
            <FileDown size={20} />
          </button>
        </div>
      </header>

      {/* Print-only PDF Header */}
      <div className="hidden print:flex p-4 border-b-4 border-[#00843D] mb-6 items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#00843D]">Inspection Report</h1>
          <p className="text-gray-600 font-medium mt-1">Generated on: {new Date().toLocaleDateString()}</p>
        </div>
        <img src={VICTOR_LOGO} alt="Victor Logo" className="h-16 w-16" />
      </div>

      {/* Main Content */}
      <main className="p-4 max-w-md mx-auto print:max-w-full print:p-0">
        
        {/* Print-only Station Title */}
        <h2 className="hidden print:block text-2xl font-bold mb-4 px-4 bg-gray-100 py-2 border-l-4 border-[#FFD100]">{currentStation.name}</h2>

        <div className="space-y-4">
          {currentStation.fields.map((field) => (
            <div key={field.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-b print:border-gray-200 print:rounded-none print:mb-2 print:p-2 page-break-inside-avoid">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm print:text-base">{field.name}</h3>
              
              {/* Status Toggles */}
              <div className="flex space-x-3 mb-3 print:hidden">
                <button
                  onClick={() => updateField(field.id, 'status', 'OK')}
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
                  onClick={() => updateField(field.id, 'status', 'Replace')}
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
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#00843D] focus:border-[#00843D] focus:outline-none resize-none print:border-none print:p-0 print:text-gray-600"
                  rows={2}
                  placeholder="Additional comments..."
                  value={field.comments}
                  onChange={(e) => updateField(field.id, 'comments', e.target.value)}
                />
                
                {/* Photo Upload Button - Hidden on Print */}
                <div className="relative print:hidden flex-shrink-0 w-20">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id={`photo-${field.id}`}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handlePhotoUpload(field.id, e)}
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
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
          .page-break-inside-avoid { break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
