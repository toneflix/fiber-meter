import { useState } from 'react';
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
import { TableSkeletonRows } from '../components/DataStates';

const selectClass =
'flex h-9 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm';

export function UsageEvents() {
  const { usageEvents, services, customers, isLoading } = useData();
  const [serviceId, setServiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');

  const filtered = usageEvents.filter(
    (e) =>
    (!serviceId || e.serviceId === serviceId) && (
    !customerId || e.customerId === customerId) && (
    !status || e.status === status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usage Events</h1>
        <p className="text-zinc-500">
          View all metered usage events and charge statuses.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}>
          <option value="">All services</option>
          {services.map((s) =>
          <option key={s.id} value={s.id}>{s.name}</option>
          )}
        </select>
        <select
          className={selectClass}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">All customers</option>
          {customers.map((c) =>
          <option key={c.id} value={c.id}>{c.name || c.externalId}</option>
          )}
        </select>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="charged">Charged</option>
          <option value="insufficient_balance">Insufficient balance</option>
          <option value="rejected">Rejected</option>
        </select>
        {(serviceId || customerId || status) &&
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => {
            setServiceId('');
            setCustomerId('');
            setStatus('');
          }}>
            Clear filters
          </button>
        }
        <span className="ml-auto text-sm text-zinc-500">
          {filtered.length} event{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((event) => {
                const service = services.find((s) => s.id === event.serviceId);
                const customer = customers.find((c) => c.id === event.customerId);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-zinc-500">
                      {new Date(event.occurredAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{service?.name}</TableCell>
                    <TableCell>{customer?.name || customer?.externalId}</TableCell>
                    <TableCell>{event.metricKey}</TableCell>
                    <TableCell>{event.quantity}</TableCell>
                    <TableCell>
                      {event.calculatedAmount} {event.asset}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={event.status === 'charged' ? 'success' : 'destructive'}>
                        {event.status}
                      </Badge>
                    </TableCell>
                  </TableRow>);

              })}
              {isLoading && usageEvents.length === 0 &&
              <TableSkeletonRows rows={4} cols={7} />
              }
              {(!isLoading || usageEvents.length > 0) && filtered.length === 0 &&
              <TableRow>
                  <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                    No usage events found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}
