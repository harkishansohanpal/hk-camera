import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Camera, Wifi, WifiOff, Trash2, Eye, AlertTriangle, HelpCircle, MoreVertical, Radio } from 'lucide-react';
import { cameraAPI } from '../services/api';
import toast from 'react-hot-toast';
import GuidedTour, { useTour } from '../components/GuidedTour';

export default function Dashboard() {
  const navigate = useNavigate();
  const [cameras, setCameras]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [newCam, setNewCam]       = useState({ name: '', description: '' });
  const [creating, setCreating]   = useState(false);
  const [openMenu, setOpenMenu]   = useState(null);
  const menuRef                   = useRef(null);
  const tour = useTour();
  const tourFired = useRef(false);

  async function loadCameras() {
    try {
      const { data } = await cameraAPI.list();
      setCameras(data.data);
    } catch { toast.error('Failed to load cameras'); }
    finally  { setLoading(false); }
  }

  useEffect(() => { loadCameras(); }, []);

  useEffect(() => {
    if (!loading && !tourFired.current && !tour.dismissed) {
      tourFired.current = true;
      const timer = setTimeout(() => tour.start(), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, tour.dismissed]);

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
    <div className="page-container animate-fade-in">

      {/* Tour trigger */}
      {tour.dismissed && (
        <button
          onClick={() => { tour.reset(); tour.start(); }}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-slate-700/80 hover:bg-slate-600 text-slate-300 rounded-xl text-[11px] transition-colors backdrop-blur-sm border border-slate-600/50"
          title="Restart tour"
        >
          <HelpCircle size={12} />
          Tour
        </button>
      )}

      {/* Page header */}
      <div className="page-header">
        <div className="min-w-0 flex-1">
          <h1 className="page-title" data-tour="tour-welcome">Dashboard</h1>
          <p className="page-subtitle mt-0.5">{cameras.length} camera{cameras.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)} data-tour="tour-add-camera" className="btn-primary text-sm px-4">
          <Plus size={16} /> <span className="hidden xs:inline">Add Camera</span>
        </button>
      </div>

      {/* Stats strip — Apple Health-style */}
      <div data-tour="tour-stats" className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total', value: cameras.length, Icon: Camera,       color: 'text-hk-400' },
          { label: 'Online', value: onlineCams,     Icon: Wifi,          color: 'text-green-400'  },
          { label: 'Alerts', value: totalAlerts,    Icon: AlertTriangle, color: 'text-orange-400' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-3">
              <Icon size={22} className={`${color} opacity-70 flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                <p className="text-slate-400 text-xs font-medium">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Camera grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-hk-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cameras.length === 0 ? (
        <div className="card text-center py-16 sm:py-20 px-6">
          <Camera size={48} className="text-slate-600 mx-auto mb-4 opacity-60" />
          <p className="text-slate-200 font-semibold text-lg">No cameras yet</p>
          <p className="text-slate-400 text-sm mt-2">Add your first camera to get started</p>
          <button onClick={() => setShowAdd(true)} className="mt-5 btn-primary text-sm px-5">
            <Plus size={16} /> Add Camera
          </button>
        </div>
      ) : (
        <div data-tour="tour-camera-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="card overflow-hidden"
            >
              {/* Thumbnail */}
              <div
                className="w-full aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden cursor-pointer"
                onClick={() => navigate(`/cameras/${cam.id}`)}
              >
                <Camera size={32} className="text-slate-600 opacity-60" />
                {cam.isOnline && (
                  <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-[11px] font-medium text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
                      Live
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/cameras/${cam.id}`)}>
                    <h3 className="font-semibold text-white truncate">{cam.name}</h3>
                    {cam.description && (
                      <p className="text-slate-400 text-sm mt-0.5 truncate">{cam.description}</p>
                    )}
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenMenu(openMenu === cam.id ? null : cam.id)}
                      data-tour="tour-camera-menu"
                      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl transition-colors"
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenu === cam.id && (
                      <div ref={menuRef} className="absolute right-0 mt-1 w-36 bg-slate-700 rounded-xl shadow-lg border border-slate-600/50 z-10 overflow-hidden">
                        <button
                          onClick={() => {
                            handleDelete(cam.id);
                            setOpenMenu(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status badge row */}
                <div className="flex items-center gap-2 mb-3">
                  {cam.isOnline
                    ? <span className="flex items-center gap-1 text-xs font-medium text-green-400"><Wifi size={11} /> Online</span>
                    : <span className="flex items-center gap-1 text-xs font-medium text-slate-400"><WifiOff size={11} /> Offline</span>}
                  <span className="text-slate-500 text-xs">{cam._count?.recordings ?? 0} recordings</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/viewer/${cam.streamKey}`)}
                    data-tour="tour-view-live"
                    className="flex-1 btn-primary text-sm"
                  >
                    <Eye size={15} />
                    View Live
                  </button>
                  <button
                    onClick={() => navigate(`/cameras/${cam.id}`)}
                    data-tour="tour-broadcast"
                    className="flex-1 btn-secondary text-sm"
                  >
                    <Radio size={15} />
                    Broadcast
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guided Tour */}
      {tour.active && (
        <GuidedTour onFinish={tour.finish} onDismiss={tour.dismissForever} />
      )}

      {/* Add Camera Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md mx-auto p-6">
            <h2 className="text-xl font-semibold text-white mb-5">Add New Camera</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Camera name</label>
                <input
                  className="input"
                  placeholder="e.g. Front Door"
                  value={newCam.name}
                  onChange={(e) => setNewCam({ ...newCam, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Main entrance"
                  value={newCam.description}
                  onChange={(e) => setNewCam({ ...newCam, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary flex-1 text-sm disabled:opacity-50">
                  {creating ? 'Adding\u2026' : 'Add Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
