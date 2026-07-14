import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Terminal,
  WalletCards,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import type { PaymentRequest } from '../lib/types';
import { API_BASE } from '../lib/api';
import { toast } from '../lib/toast-store';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

type VerificationResult = { verification: { paid: boolean; alreadyPaid?: boolean } };

type FiberPaymentDialogProps = {
  request: PaymentRequest | null;
  customerName?: string;
  onClose: () => void;
  onPreflight: (invoice: string) => void;
  onVerify: (
    id: string,
    options?: { silent?: boolean },
  ) => Promise<VerificationResult>;
  demoAutopay?: boolean;
  demoMaxPaymentCkb?: number;
};

type Tab = 'invoice' | 'node' | 'setup';
type PollState = 'watching' | 'checking' | 'paid' | 'retrying';
type FundingProof = { explorerUrl: string; fundingTxHash?: string };

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()} — select it manually`);
  }
}

export function FiberPaymentDialog({
  request,
  customerName,
  onClose,
  onPreflight,
  onVerify,
  demoAutopay = false,
  demoMaxPaymentCkb,
}: FiberPaymentDialogProps) {
  const [tab, setTab] = useState<Tab>('invoice');
  const [pollState, setPollState] = useState<PollState>('watching');
  const [checkingNow, setCheckingNow] = useState(false);
  const [fundingProof, setFundingProof] = useState<FundingProof | null>(null);
  const verifyRef = useRef(onVerify);
  const requestId = request?.id;
  const requestStatus = request?.status;
  const tabs: Array<{ id: Tab; label: string }> = demoAutopay
    ? [
        { id: 'invoice', label: 'Demo payment' },
        { id: 'node', label: 'Manual fallback' },
        { id: 'setup', label: 'How it works' },
      ]
    : [
        { id: 'invoice', label: 'Pay invoice' },
        { id: 'node', label: 'Use your node' },
        { id: 'setup', label: 'Set up a payer' },
      ];

  useEffect(() => {
    verifyRef.current = onVerify;
  }, [onVerify]);

  const rpcCommand = useMemo(() => {
    if (!request) return '';
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'send_payment',
      params: [{ invoice: request.paymentUri }],
    });
    return [
      `curl -sS -X POST http://127.0.0.1:8227 ${'\\'}`,
      `  -H 'Content-Type: application/json' ${'\\'}`,
      `  -d '${payload}'`,
    ].join('\n');
  }, [request]);

  useEffect(() => {
    if (!requestId) return;
    setTab('invoice');
    setPollState(requestStatus === 'paid' ? 'paid' : 'watching');
    setFundingProof(null);
  }, [requestId, requestStatus]);

  useEffect(() => {
    if (!requestId || (requestStatus !== 'paid' && pollState !== 'paid')) return;

    let cancelled = false;
    const loadFundingProof = async () => {
      try {
        const response = await fetch(`${API_BASE}/fiber/live-proof`);
        const data = await response.json();
        const channel = data?.channels?.find(
          (candidate: { state?: string; explorerUrl?: string }) =>
            candidate.state === 'ChannelReady' && candidate.explorerUrl,
        );
        if (!cancelled && response.ok && channel?.explorerUrl) {
          setFundingProof({
            explorerUrl: channel.explorerUrl,
            fundingTxHash: channel.fundingTxHash,
          });
        }
      } catch {
        // Settlement remains valid if the optional public explorer proof is unavailable.
      }
    };

    void loadFundingProof();
    return () => {
      cancelled = true;
    };
  }, [pollState, requestId, requestStatus]);

  useEffect(() => {
    if (!requestId || requestStatus !== 'pending') return;

    let stopped = false;
    let running = false;

    const checkSettlement = async () => {
      if (running || stopped) return;
      running = true;
      setPollState('checking');
      try {
        const result = await verifyRef.current(requestId, { silent: true });
        if (!stopped) {
          setPollState(result.verification.paid ? 'paid' : 'watching');
        }
      } catch {
        if (!stopped) setPollState('retrying');
      } finally {
        running = false;
      }
    };

    const firstCheck = window.setTimeout(() => void checkSettlement(), 2_000);
    const interval = window.setInterval(() => void checkSettlement(), 5_000);
    return () => {
      stopped = true;
      window.clearTimeout(firstCheck);
      window.clearInterval(interval);
    };
  }, [requestId, requestStatus]);

  useEffect(() => {
    if (!request) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [request, onClose]);

  if (!request) return null;

  const paid = request.status === 'paid' || pollState === 'paid';
  const expired = request.status === 'expired';
  const expiry = request.expiresAt ? new Date(request.expiresAt) : null;

  const checkNow = async () => {
    setCheckingNow(true);
    try {
      const result = await onVerify(request.id);
      setPollState(result.verification.paid ? 'paid' : 'watching');
    } catch {
      setPollState('retrying');
    } finally {
      setCheckingNow(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiber-payment-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <h2 id="fiber-payment-title" className="text-lg font-semibold">
                Fund via Fiber
              </h2>
              <p className="text-sm text-zinc-500">
                {demoAutopay
                  ? `Auditor-triggered testnet payment${customerName ? ` for ${customerName}` : ''}`
                  : customerName
                    ? `Funding ${customerName}`
                    : 'Live Fiber payment request'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close payment dialog">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {paid ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold">Payment confirmed</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Fiber confirmed settlement. The customer balance has been credited with{' '}
              <strong className="text-zinc-900">{request.amount} {request.asset}</strong>.
            </p>
            <p className="mx-auto mt-3 max-w-md text-xs text-zinc-400">
              This confirmation stays open until you choose Done or close the dialog.
            </p>
            {fundingProof && (
              <div className="mx-auto mt-5 max-w-md rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <a
                  href={fundingProof.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View channel funding transaction
                </a>
                <p className="mt-1 text-xs text-blue-700/80">
                  Fiber payments are off-chain; this CKB testnet transaction independently
                  proves the funded channel used for settlement.
                </p>
              </div>
            )}
            <Button className="mt-7" onClick={onClose}>Done</Button>
          </div>
        ) : expired ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock3 className="h-9 w-9 text-amber-700" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold">Invoice expired</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              This invoice can no longer be settled. Close this dialog and create a new payment request.
            </p>
            <Button className="mt-7" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Amount</p>
                <p className="mt-1 font-semibold">{request.amount} {request.asset}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Network</p>
                <p className="mt-1 font-semibold">Fiber testnet</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Provider</p>
                <p className="mt-1 font-semibold">{demoAutopay ? 'Demo payer' : 'Live node'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Expires</p>
                <p className="mt-1 font-semibold">
                  {expiry ? expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                </p>
              </div>
            </div>

            <div className="px-6 pt-5">
              <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={cn(
                      'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      tab === item.id ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900',
                    )}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {tab === 'invoice' && (
                <div className="grid gap-6 sm:grid-cols-[210px_1fr]">
                  <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-4">
                    <QRCodeSVG value={request.paymentUri} size={176} level="M" marginSize={1} />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Fiber invoice</p>
                      <button
                        onClick={() => void copyText(request.paymentUri, 'Invoice')}
                        className="mt-2 flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-left hover:bg-zinc-100">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-600">
                          {request.paymentUri}
                        </span>
                        <Copy className="h-4 w-4 shrink-0 text-zinc-500" />
                      </button>
                    </div>

                    <div className={cn(
                      'rounded-lg border p-3 text-sm',
                      demoAutopay
                        ? 'border-green-200 bg-green-50 text-green-900'
                        : 'border-blue-200 bg-blue-50 text-blue-900',
                    )}>
                      {demoAutopay
                        ? `A separate funded testnet node is paying this real invoice automatically. No wallet setup is required${demoMaxPaymentCkb ? `; demo payments are capped at ${demoMaxPaymentCkb} CKB` : ''}.`
                        : 'Scan or copy this invoice into a Fiber-capable wallet or payer node. This page watches the merchant node and credits the balance after settlement.'}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void copyText(request.paymentUri, 'Invoice')}>
                        <Copy className="mr-2 h-4 w-4" /> Copy invoice
                      </Button>
                      <Button variant="outline" onClick={() => onPreflight(request.paymentUri)}>
                        Preflight Diagnostics
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'node' && (
                <div className="space-y-5">
                  <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                    <div>
                      <p className="text-sm font-medium text-green-950">
                        {demoAutopay ? 'Optional manual payment' : 'Your node stays under your control'}
                      </p>
                      <p className="mt-1 text-sm text-green-800">
                        {demoAutopay
                          ? 'The hosted demo payer normally handles settlement. This command is only a fallback for auditors who want to pay from another funded testnet node.'
                          : 'FiberMeter never connects to your payer RPC and never receives its keys. Run this command on the machine hosting your funded payer node.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Terminal className="h-4 w-4" /> Send with Fiber JSON-RPC
                      </p>
                      <button
                        onClick={() => void copyText(rpcCommand, 'Command')}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
                      <code>{rpcCommand}</code>
                    </pre>
                  </div>

                  <p className="text-sm text-zinc-500">
                    If your RPC uses another port, replace <code className="rounded bg-zinc-100 px-1 py-0.5">8227</code>. Keep RPC bound to localhost; only the Fiber P2P port should be reachable by peers.
                  </p>
                </div>
              )}

              {tab === 'setup' && demoAutopay && (
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">1</div>
                    <div>
                      <p className="font-medium">FiberMeter creates a real invoice</p>
                      <p className="mt-1 text-sm text-zinc-500">The merchant/payee node returns a signed <code className="rounded bg-zinc-100 px-1 py-0.5">fibt1…</code> testnet invoice.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">2</div>
                    <div>
                      <p className="font-medium">A separate demo node pays it</p>
                      <p className="mt-1 text-sm text-zinc-500">The bounded auto-payer acts as the test customer. It can pay only small CKB testnet requests.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">3</div>
                    <div>
                      <p className="font-medium">Settlement is independently verified</p>
                      <p className="mt-1 text-sm text-zinc-500">FiberMeter credits the prepaid balance only after the payee node reports the invoice as paid.</p>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'setup' && !demoAutopay && (
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">1</div>
                    <div>
                      <p className="font-medium">Install and start a testnet Fiber node</p>
                      <p className="mt-1 text-sm text-zinc-500">Use a native FNN release and the official testnet configuration.</p>
                      <a className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline" href="https://www.fiber.world/docs/quick-start/run-a-node/native" target="_blank" rel="noreferrer">
                        Native node guide <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">2</div>
                    <div>
                      <p className="font-medium">Fund its CKB address</p>
                      <p className="mt-1 text-sm text-zinc-500">Use testnet CKB only. Keep enough for the channel reserve, payment capacity, and fees.</p>
                      <a className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline" href="https://faucet.nervos.org/" target="_blank" rel="noreferrer">
                        Nervos testnet faucet <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">3</div>
                    <div>
                      <p className="font-medium">Open or connect to a ready channel</p>
                      <p className="mt-1 text-sm text-zinc-500">The payer needs outbound liquidity and a route to the merchant. Wait for <code className="rounded bg-zinc-100 px-1 py-0.5">ChannelReady</code>, then return to the previous tab and pay.</p>
                      <a className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline" href="https://www.fiber.world/docs/quick-start/basic-transfer" target="_blank" rel="noreferrer">
                        Channel and transfer guide <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                {pollState === 'checking' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : pollState === 'retrying' ? (
                  <Clock3 className="h-4 w-4 text-amber-600" />
                ) : (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                  </span>
                )}
                {pollState === 'checking'
                  ? 'Checking Fiber settlement…'
                  : pollState === 'retrying'
                    ? 'Settlement check unavailable; retrying…'
                    : demoAutopay
                      ? 'Demo payer is settling the invoice…'
                      : 'Watching for payment'}
              </div>
              <Button variant="outline" size="sm" disabled={checkingNow} onClick={() => void checkNow()}>
                {checkingNow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Check now
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
