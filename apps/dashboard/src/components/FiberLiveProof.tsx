import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { API_BASE } from '../lib/api';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface ProofChannel {
  channelId: string;
  state: string;
  enabled: boolean;
  localBalance: string;
  remoteBalance: string;
  fundingTxHash?: string;
  explorerUrl?: string;
}

type ProofState =
  | { status: 'loading' }
  | { status: 'ok'; channels: ProofChannel[] }
  | { status: 'error'; message: string };

export function FiberLiveProof() {
  const [proof, setProof] = useState<ProofState>({ status: 'loading' });

  const loadProof = useCallback(async () => {
    setProof({ status: 'loading' });
    try {
      const response = await fetch(`${API_BASE}/fiber/live-proof`);
      const data = await response.json();
      if (!response.ok || !data.live) {
        setProof({ status: 'error', message: data.error ?? 'No live channels' });
        return;
      }
      setProof({ status: 'ok', channels: data.channels ?? [] });
    } catch {
      setProof({ status: 'error', message: 'Could not reach FiberMeter API' });
    }
  }, []);

  useEffect(() => {
    void loadProof();
  }, [loadProof]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Live Fiber channel proof</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">
            Payments settle off-chain through a channel funded by this real CKB testnet transaction.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadProof()}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {proof.status === 'loading' && (
          <p className="text-sm text-zinc-500">Loading channel proof…</p>
        )}
        {proof.status === 'error' && (
          <p className="text-sm text-zinc-500">{proof.message}</p>
        )}
        {proof.status === 'ok' && proof.channels.length === 0 && (
          <p className="text-sm text-zinc-500">No open channels yet.</p>
        )}
        {proof.status === 'ok' && proof.channels.map((channel) => (
          <div
            key={channel.channelId}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant={channel.state === 'ChannelReady' ? 'success' : 'secondary'}>
                {channel.state || 'unknown'}
              </Badge>
              <span className="font-mono text-xs text-zinc-500">
                {channel.channelId.slice(0, 12)}…{channel.channelId.slice(-8)}
              </span>
            </div>
            {channel.explorerUrl ? (
              <a
                href={channel.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 break-all font-mono text-xs text-blue-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                Verify funding transaction on CKB Explorer
              </a>
            ) : (
              <p className="mt-2 font-mono text-xs text-zinc-400">
                Funding transaction pending confirmation
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
