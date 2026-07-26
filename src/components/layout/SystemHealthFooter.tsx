import { useEffect, useState } from 'react';
import { useSync } from '@/hooks/useSync';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SystemHealthFooter() {
  const { pendingCount, lastSyncAt, countPending } = useSync();
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Health check effect
  useEffect(() => {
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const base = import.meta.env.VITE_API_URL ?? '';
        const res = await fetch(`${base}/api/health`, {
          method: 'HEAD',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        setServerReachable(res.ok);
      } catch {
        setServerReachable(false);
      }
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  // Online/offline listener
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Count pending on mount and on focus
  useEffect(() => {
    countPending();
    const onFocus = () => countPending();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [countPending]);

  return (
    <div
      className="flex flex-row items-center gap-2 px-3 border-t text-xs text-muted-foreground"
      style={{ maxHeight: 40, minHeight: 32 }}
    >
      {/* Server dot */}
      <span
        className={cn(
          'size-2 rounded-full shrink-0',
          serverReachable === null ? 'bg-gray-400' : serverReachable ? 'bg-green-500' : 'bg-red-500'
        )}
        title={serverReachable ? 'Server terjangkau' : 'Server tidak terjangkau'}
      />
      {/* Online indicator */}
      {isOnline
        ? <Wifi className="size-3 text-green-600" />
        : <WifiOff className="size-3 text-red-500" />
      }
      {/* Pending */}
      {pendingCount > 0 && (
        <span className="text-orange-600">{pendingCount} pending</span>
      )}
      {/* Last sync */}
      {lastSyncAt && (
        <span className="ml-auto">{lastSyncAt.toLocaleTimeString('id-ID')}</span>
      )}
    </div>
  );
}
