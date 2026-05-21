import { useState, useEffect } from 'react';
import { Bell, BellOff, Trash2, CheckCheck, Shield } from 'lucide-react';
import { alertAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_STYLES = {
  MOTION:             { bg: 'bg-red-500/10',    text: 'text-red-400',    label: 'Motion' },
  CAMERA_OFFLINE:     { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Camera offline' },
  CAMERA_ONLINE:      { bg: 'bg-green-500/10',  text: 'text-green-400',  label: 'Camera online' },
  RECORDING_COMPLETE: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   label: 'Recording saved' },
};

export default function Alerts() {
  const [alerts, setAlerts]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await alertAPI.list({ limit: 50 });
      setAlerts(data.data);
      setUnread(data.unreadCount);
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleMarkRead(id) {
    await alertAPI.markRead(id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
    setUnread((n) => Math.max(0, n - 1));
  }

  async function handleMarkAllRead() {
    await alertAPI.markAllRead();
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnread(0);
    toast.success('All alerts marked as read');
  }

  async function handleDelete(id) {
    await alertAPI.delete(id);
    const wasUnread = alerts.find((a) => a.id === id)?.read === false;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (wasUnread) setUnread((n) => Math.max(0, n - 1));
  }

  return (
    <div className="page-container max-w-3xl animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          {unread > 0 && <p className="page-subtitle mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAllRead} className="btn-ghost text-sm">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-[3px] border-hk-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-16">
          <BellOff size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">No alerts yet</p>
          <p className="text-slate-500 text-sm mt-1">You'll be notified when motion is detected</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const style = TYPE_STYLES[alert.type] ?? TYPE_STYLES.MOTION;
            return (
              <div
                key={alert.id}
                className={`card flex items-start gap-3 px-4 py-3 transition-opacity ${alert.read ? 'opacity-60' : ''}`}
                onClick={() => !alert.read && handleMarkRead(alert.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                  <Shield size={13} className={style.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                    {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-hk-500 flex-shrink-0" />}
                  </div>
                  <p className="text-slate-300 text-sm mt-0.5">{alert.message}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</p>
                </div>
                {alert.thumbnailUrl && (
                  <img src={alert.thumbnailUrl} alt="" className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(alert.id); }}
                  className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-red-400 rounded-xl transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
