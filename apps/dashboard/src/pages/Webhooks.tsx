import React, { useState } from 'react';
import { useData } from '../lib/useData';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { TableSkeletonRows } from '../components/DataStates';

export function Webhooks() {
  const { webhooks, retryWebhook, isLoading } = useData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await retryWebhook(id);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhook Deliveries</h1>
        <p className="text-zinc-500">
          Inspect webhook events emitted by FiberMeter and retry failed deliveries.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Date</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => {
                const isOpen = expanded === webhook.id;
                return (
                  <React.Fragment key={webhook.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : webhook.id)}>
                      <TableCell>
                        {isOpen ?
                        <ChevronDown className="h-4 w-4 text-zinc-400" /> :
                        <ChevronRight className="h-4 w-4 text-zinc-400" />}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {new Date(webhook.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {webhook.eventType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={webhook.status === 'failed' ? 'destructive' : 'success'}>
                          {webhook.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {webhook.status === 'failed' &&
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retrying === webhook.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(webhook.id);
                          }}>
                            <RefreshCw
                            className={
                            'mr-1 h-3.5 w-3.5' + (
                            retrying === webhook.id ? ' animate-spin' : '')
                            } />
                            Retry
                          </Button>
                        }
                      </TableCell>
                    </TableRow>
                    {isOpen &&
                    <TableRow>
                        <TableCell colSpan={5} className="bg-zinc-50">
                          <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                            {JSON.stringify(webhook.payload, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    }
                  </React.Fragment>);

              })}
              {isLoading && webhooks.length === 0 &&
              <TableSkeletonRows rows={4} cols={5} />
              }
              {!isLoading && webhooks.length === 0 &&
              <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500 py-8">
                    No webhooks delivered yet.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}
