import { useState, useEffect } from 'react';
import { Video, Trash2, Download, Play, Filter } from 'lucide-react';
import { cameraAPI, recordingAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Recordings() {
  const [cameras, setCameras]       = useState([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [playing, setPlaying]       = useState(null);
  const [filter, setFilter]         = useState('');
  const [selectedRecordings, setSelectedRecordings] = useState(new Set());

  useEffect(() => {
    cameraAPI.list().then(({ data }) => setCameras(data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50, ...(selectedCam && { cameraId: selectedCam }) };
    recordingAPI.listAll(params)
      .then(({ data }) => setRecordings(data.data))
      .catch(() => toast.error('Failed to load recordings'))
      .finally(() => setLoading(false));
    setSelectedRecordings(new Set());
      }, [selectedCam]);


  async function handleDelete(id) {
    if (!confirm('Delete this recording?')) return;
    await recordingAPI.delete(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    setSelectedRecordings((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
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

  function handleSelectRecording(id, checked) {
    setSelectedRecordings((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }

  function handleSelectAll(checked) {
    if (checked) {
      setSelectedRecordings(new Set(filtered.map(r => r.id)));
    } else {
      setSelectedRecordings(new Set());
    }
  }

  const filtered = filter
    ? recordings.filter((r) => r.trigger === filter)
    : recordings;

  const allSelected = filtered.length > 0 && selectedRecordings.size === filtered.length;

  return (
    <div className="max-w-4xl mx-auto px-0 sm:px-1">
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Recordings</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {selectedRecordings.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn-danger flex items-center gap-2 text-xs sm:text-sm"
            >
              <Trash2 size={14} />
              Delete {selectedRecordings.size}
            </button>
          )}
          <select
            value={selectedCam}
            onChange={(e) => setSelectedCam(e.target.value)}
            className="input py-2 text-xs sm:text-sm flex-1 sm:flex-none sm:w-auto"
          >
            <option value="">All cameras</option>
            {cameras.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input py-2 text-xs sm:text-sm flex-1 sm:flex-none sm:w-auto">
            <option value="">All triggers</option>
            <option value="MOTION">Motion</option>
            <option value="MANUAL">Manual</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-hk-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 sm:py-16">
          <Video size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">No recordings found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="card">
            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
              <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center -ml-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-hk-500 bg-slate-700 border-slate-600 rounded focus:ring-hk-500 focus:ring-2"
                />
              </div>
              <span className="text-xs sm:text-sm text-slate-300 font-medium">Select All ({filtered.length})</span>
            </label>
          </div>

          {filtered.map((rec) => (
            <div key={rec.id} className="card flex items-center gap-2 sm:gap-4">
              <label className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center -ml-1.5 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRecordings.has(rec.id)}
                  onChange={(e) => handleSelectRecording(rec.id, e.target.checked)}
                  className="w-4 h-4 text-hk-500 bg-slate-700 border-slate-600 rounded focus:ring-hk-500 focus:ring-2"
                />
              </label>

              <button
                onClick={() => setPlaying(rec)}
                className="w-10 h-9 sm:w-14 sm:h-10 bg-slate-700 hover:bg-hk-500/20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <Play size={16} className="text-hk-400" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className={`text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    rec.trigger === 'MOTION'    ? 'bg-red-500/20 text-red-400'    :
                    rec.trigger === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400'  :
                    'bg-slate-600/40 text-slate-400'
                  }`}>
                    {rec.trigger}
                  </span>
                  <span className="text-slate-400 text-[10px] sm:text-xs">{formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">
                  {formatDuration(rec.duration)} · {formatBytes(rec.size)}
                </p>
              </div>

              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                <a href={rec.url} download className="p-2 sm:p-2.5 text-slate-400 hover:text-hk-400 transition-colors" title="Download">
                  <Download size={14} />
                </a>
                <button onClick={() => handleDelete(rec.id)} className="p-2 sm:p-2.5 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <video src={playing.url} controls autoPlay className="w-full rounded-xl" />
            <button onClick={() => setPlaying(null)} className="mt-3 btn-ghost text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
