import { useState, useEffect } from 'react';
import { Video, Trash2, Download, Play } from 'lucide-react';
import { cameraAPI, recordingAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(secs) {
  if (!secs) return '\u2014';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Recordings() {
  const [cameras, setCameras] = useState([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedRecordings, setSelectedRecordings] = useState(new Set());

  useEffect(() => { cameraAPI.list().then(({ data }) => setCameras(data.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50, ...(selectedCam && { cameraId: selectedCam }) };
    recordingAPI.listAll(params).then(({ data }) => setRecordings(data.data)).catch(() => toast.error('Failed to load recordings')).finally(() => setLoading(false));
    setSelectedRecordings(new Set());
  }, [selectedCam]);

  async function handleDelete(id) {
    if (!confirm('Delete this recording?')) return;
    await recordingAPI.delete(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    setSelectedRecordings((prev) => { const n = new Set(prev); n.delete(id); return n; });
    toast.success('Recording deleted');
  }

  async function handleBulkDelete() {
    if (selectedRecordings.size === 0) return;
    if (!confirm(`Delete ${selectedRecordings.size} recording${selectedRecordings.size > 1 ? 's' : ''}?`)) return;
    await recordingAPI.deleteBulk(Array.from(selectedRecordings));
    setRecordings((prev) => prev.filter((r) => !selectedRecordings.has(r.id)));
    setSelectedRecordings(new Set());
    toast.success(`${selectedRecordings.size} recording${selectedRecordings.size > 1 ? 's' : ''} deleted`);
  }

  const filtered = filter ? recordings.filter((r) => r.trigger === filter) : recordings;

  return (
    <div className="page-container max-w-4xl animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Recordings</h1>
        <p className="page-subtitle mt-0.5">{filtered.length} recording{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {selectedRecordings.size > 0 && (
          <button onClick={handleBulkDelete} className="btn-destructive text-sm"><Trash2 size={14} /> Delete {selectedRecordings.size}</button>
        )}
        <select value={selectedCam} onChange={(e) => setSelectedCam(e.target.value)} className="input py-2 text-sm flex-1 sm:flex-none sm:w-40">
          <option value="">All cameras</option>
          {cameras.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input py-2 text-sm flex-1 sm:flex-none sm:w-36">
          <option value="">All triggers</option>
          <option value="MOTION">Motion</option>
          <option value="MANUAL">Manual</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-[3px] border-ap-blue border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 shadow-apple-sm">
          <Video size={36} className="text-ap-gray3 mx-auto mb-3" />
          <p className="text-text-secondary font-semibold">No recordings found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((rec) => (
            <div key={rec.id} className="card flex items-center gap-3 px-4 py-3 shadow-apple-sm hover:shadow-apple transition-shadow">
              <input type="checkbox" checked={selectedRecordings.has(rec.id)}
                onChange={(e) => setSelectedRecordings((prev) => { const n = new Set(prev); e.target.checked ? n.add(rec.id) : n.delete(rec.id); return n; })}
                className="w-4 h-4 text-ap-blue bg-fill-input border-ap-gray4 rounded focus:ring-ap-blue/30 flex-shrink-0" />
              <button onClick={() => setPlaying(rec)}
                className="w-10 h-10 bg-fill-input hover:bg-ap-blue/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                <Play size={15} className="text-ap-blue" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rec.trigger === 'MOTION' ? 'bg-ap-red/10 text-ap-red' : rec.trigger === 'SCHEDULED' ? 'bg-ap-blue/10 text-ap-blue' : 'bg-ap-gray5 text-ap-gray'}`}>
                    {rec.trigger}
                  </span>
                  <span className="text-ap-gray text-xs">{formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-ap-gray2 text-xs mt-0.5">{formatDuration(rec.duration)} \u00b7 {formatBytes(rec.size)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <a href={rec.url} download className="w-10 h-10 flex items-center justify-center text-ap-gray hover:text-ap-blue rounded-xl transition-colors" title="Download">
                  <Download size={14} />
                </a>
                <button onClick={() => handleDelete(rec.id)} className="w-10 h-10 flex items-center justify-center text-ap-gray hover:text-ap-red rounded-xl transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <video src={playing.url} controls autoPlay className="w-full rounded-2xl shadow-apple-lg" />
            <button onClick={() => setPlaying(null)} className="btn-ghost text-sm mt-3 text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
