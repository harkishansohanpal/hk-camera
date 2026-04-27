import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Camera, Wifi, WifiOff, Trash2, Eye, AlertTriangle, MoreVertical } from 'lucide-react';
import { cameraAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [cameras, setCameras]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [newCam, setNewCam]       = useState({ name: '', description: '' });
  const [creating, setCreating]   = useState(false);
  const [openMenu, setOpenMenu]   = useState(null);
  const menuRef                   = useRef(null);

  async function loadCameras() {
    try {
      const { data } = await cameraAPI.list();
      setCameras(data.data);
    } catch { toast.error('Failed to load cameras'); }
    finally  { setLoading(false); }
  }

  useEffect(() => { loadCameras(); }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await cameraAPI.create(newCam);
      setCameras((prev) => [data.data, ...prev]);
      setShowAdd(false);
      setNewCam({ name: '', description: '' });
      toast.success('Camera added');
    } catch { toast.error('Failed to create camera'); }
    finally { setCreating(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this camera and all its recordings?')) return;
    try {
      await cameraAPI.delete(id);
      setCameras((prev) => prev.filter((c) => c.id !== id));
      toast.success('Camera removed');
    } catch { toast.error('Failed to delete camera'); }
  }

  const onlineCams  = cameras.filter((c) => c.isOnline).length;
  const totalAlerts = cameras.reduce((acc, c) => acc + (c._count?.alerts ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{cameras.length} camera{cameras.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-hk-500 hover:bg-hk-600 text-white rounded-xl transition-colors font-medium text-sm">
          <Plus size={18} /> Add Camera
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total Cameras', value: cameras.length, Icon: Camera,       color: 'text-hk-400' },
          { label: 'Online Now',    value: onlineCams,     Icon: Wifi,          color: 'text-green-400'  },
          { label: 'Unread Alerts', value: totalAlerts,    Icon: AlertTriangle, color: 'text-yellow-400' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/80 transition-colors">
            <div className="flex items-center gap-3">
              <Icon size={24} className={`${color} opacity-80`} />
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Camera grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-hk-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cameras.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl text-center py-20 px-6">
          <Camera size={56} className="text-slate-600 mx-auto mb-4 opacity-60" />
          <p className="text-slate-200 font-medium text-lg">No cameras yet</p>
          <p className="text-slate-400 text-sm mt-2">Add your first camera to get started</p>
          <button onClick={() => setShowAdd(true)} className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-hk-500 hover:bg-hk-600 text-white rounded-xl transition-colors font-medium text-sm">
            <Plus size={18} /> Add Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="bg-slate-800/50 hover:bg-slate-800/80 rounded-2xl overflow-hidden transition-all duration-200 border border-slate-700/50 hover:border-slate-600/80 shadow-sm hover:shadow-md"
            >
              {/* Thumbnail */}
              <div
                className="w-full h-40 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden cursor-pointer group/thumb"
                onClick={() => navigate(`/cameras/${cam.id}`)}
              >
                <Camera size={36} className="text-slate-600 group-hover/thumb:text-slate-500 transition-colors" />
                {cam.isOnline && (
                  <div className="absolute top-3 left-3">
                    <span className="badge-online"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/cameras/${cam.id}`)}>
                    <h3 className="font-semibold text-white truncate text-base">{cam.name}</h3>
                    {cam.description && (
                      <p className="text-slate-400 text-xs mt-1 truncate">{cam.description}</p>
                    )}
                  </div>
                  {/* Menu button */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenMenu(openMenu === cam.id ? null : cam.id)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {/* Dropdown menu */}
                    {openMenu === cam.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-slate-700 rounded-xl shadow-lg border border-slate-600/50 z-10 overflow-hidden">
                        <button
                          onClick={() => {
                            handleDelete(cam.id);
                            setOpenMenu(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <Trash2 size={14} />
                          Delete Camera
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 mb-3">
                  {cam.isOnline
                    ? <span className="badge-online"><Wifi size={10} /> Online</span>
                    : <span className="badge-offline"><WifiOff size={10} /> Offline</span>}
                  <span className="text-slate-500 text-xs">{cam._count?.recordings ?? 0} clips</span>
                </div>

                {/* View button */}
                <button
                  onClick={() => navigate(`/viewer/${cam.streamKey}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-hk-500 hover:bg-hk-600 text-white rounded-xl transition-colors font-medium text-sm"
                >
                  <Eye size={16} />
                  <span>View Live</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add camera modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 w-full max-w-md shadow-xl">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Add New Camera</h2>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Camera name</label>
                  <input
                    className="input"
                    placeholder="e.g. Front Door"
                    value={newCam.name}
                    onChange={(e) => setNewCam({ ...newCam, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. Main entrance"
                    value={newCam.description}
                    onChange={(e) => setNewCam({ ...newCam, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-hk-500 hover:bg-hk-600 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                    disabled={creating}
                  >
                    {creating ? 'Adding…' : 'Add Camera'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
