import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../lib/useData';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription } from
'../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Zap, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

type DemoResult =
  | { success: true; summary: string; charge: { amount: number; asset: string; balanceRemaining: number } }
  | { success: false; error: string; details?: { required: number; available: number; asset: string } };

export function DemoService() {
  const {
    recordUsage,
    customers,
    balances,
    createPaymentRequest,
    paymentRequests,
    simulatePaymentPaid,
    isLive
  } = useData();
  const [text, setText] = useState('');
  const [result, setResult] = useState<DemoResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the first customer for the demo
  const customer = customers[0];
  const balance = balances.find((b) => b.customerId === customer?.id);
  const pendingRequest = paymentRequests.find(
    (r) => r.customerId === customer?.id && r.status === 'pending'
  );

  const handleSummarize = async () => {
    if (!text || !customer) return;
    setIsProcessing(true);
    const tokens = text.length; // 1 char = 1 token for demo
    const response = await recordUsage({
      serviceSlug: 'ai-summary',
      customerExternalId: customer.externalId,
      metricKey: 'tokens',
      quantity: tokens
    });

    if ('error' in response) {
      setResult({ success: false, error: response.error });
    } else if (response.status === 'charged') {
      setResult({
        success: true,
        summary: `This is a simulated AI summary of your ${tokens} character text. It was processed successfully because you had enough balance.`,
        charge: response
      });
    } else {
      setResult({
        success: false,
        error: 'Insufficient balance to process request.',
        details: response
      });
    }
    setIsProcessing(false);
  };

  const handleFund = async () => {
    if (!customer) return;
    await createPaymentRequest({
      customerId: customer.id,
      amount: 100,
      asset: 'CKB'
    });
  };

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        {isLive ? 'Loading demo… (is the API seeded?)' : 'Loading demo…'}
      </div>);

  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div>
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 mb-4">
            Demo Application
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI Summary API</h1>
        <p className="text-zinc-500">
          This is a simulated 3rd-party app that uses FiberMeter for billing.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summarize Text</CardTitle>
              <CardDescription>
                Enter text to summarize. Costs 10 CKB per 1,000 characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full min-h-[150px] p-3 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                placeholder="Paste your long text here..."
                value={text}
                onChange={(e) => setText(e.target.value)} />

              <div className="flex justify-between items-center">
                <div className="text-sm text-zinc-500">
                  Estimated cost: {(text.length * 10 / 1000).toFixed(2)} CKB
                </div>
                <Button onClick={handleSummarize} disabled={isProcessing || !text}>
                  {isProcessing ? 'Processing...' : 'Summarize'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {result &&
          <Card
            className={
            result.success ?
            'border-green-200 bg-green-50/50' :
            'border-red-200 bg-red-50/50'
            }>

              <CardContent className="pt-6">
                {result.success ?
              <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <CheckCircle2 className="h-5 w-5" />
                      Success
                    </div>
                    <p className="text-zinc-700">{result.summary}</p>
                    <div className="text-sm text-zinc-500 bg-white p-3 rounded border border-green-100">
                      Charged: {result.charge.amount} {result.charge.asset} |
                      Remaining: {result.charge.balanceRemaining.toFixed(2)}{' '}
                      {result.charge.asset}
                    </div>
                  </div> :

              <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-700 font-medium">
                      <AlertCircle className="h-5 w-5" />
                      Payment Required
                    </div>
                    <p className="text-zinc-700">{result.error}</p>
                    {result.details &&
                <div className="text-sm text-zinc-500 bg-white p-3 rounded border border-red-100">
                        Required: {result.details.required} {result.details.asset}{' '}
                        | Available: {result.details.available}{' '}
                        {result.details.asset}
                      </div>
                }
                    <Button variant="destructive" onClick={handleFund}>
                      Fund Balance
                    </Button>
                  </div>
              }
              </CardContent>
            </Card>
          }
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Customer Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-zinc-500">Logged in as</div>
                <div className="font-medium">{customer.name || customer.externalId}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Available Balance</div>
                <div className="text-2xl font-bold">
                  {balance?.availableBalance.toFixed(2) || '0.00'} CKB
                </div>
              </div>

              {pendingRequest ?
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                  <div className="text-sm font-medium text-amber-800">
                    Pending Payment
                  </div>
                  <div className="text-xs text-amber-700">
                    Please pay {pendingRequest.amount} CKB to fund your account.
                  </div>
                  <Button
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => simulatePaymentPaid(pendingRequest.id)}>

                    Simulate Payment
                  </Button>
                </div> :

              <Button variant="outline" className="w-full" onClick={handleFund}>
                  Add Funds
                </Button>
              }
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);

}
