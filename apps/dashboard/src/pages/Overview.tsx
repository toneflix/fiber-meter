import { useData } from '../lib/useData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Activity, CreditCard, Users, Zap } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { FiberLiveProof } from '../components/FiberLiveProof';
import { useFiberConfig } from '../lib/useFiberConfig';
import type { ReactNode } from 'react';
export function Overview() {
  const { services, customers, balances, usageEvents, paymentRequests, isLoading } =
  useData();
  const totalFunded = balances.reduce((acc, b) => acc + b.totalFunded, 0);
  const totalSpent = balances.reduce((acc, b) => acc + b.totalSpent, 0);
  const totalUsageEvents = usageEvents.length;
  const { isLive: fiberLive } = useFiberConfig();
  const stat = (value: ReactNode) =>
  isLoading ?
  <Skeleton className="h-7 w-24" /> :
  <div className="text-2xl font-bold">{value}</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-zinc-500">
          Welcome to FiberMeter. Here's what's happening with your services.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue (Funded)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {stat(`${totalFunded.toFixed(2)} CKB`)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Usage Charged
            </CardTitle>
            <Zap className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {stat(`${totalSpent.toFixed(2)} CKB`)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Customers
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {stat(customers.length)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Events</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {stat(totalUsageEvents)}
          </CardContent>
        </Card>
      </div>

      {fiberLive && <FiberLiveProof />}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Usage Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageEvents.slice(0, 5).map((event) => {
                  const service = services.find((s) => s.id === event.serviceId);
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        {service?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {event.calculatedAmount} {event.asset}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                          event.status === 'charged' ?
                          'success' :
                          'destructive'
                          }>
                          
                          {event.status}
                        </Badge>
                      </TableCell>
                    </TableRow>);

                })}
                {usageEvents.length === 0 &&
                <TableRow>
                    <TableCell
                    colSpan={3}
                    className="text-center text-zinc-500 py-4">
                    
                      No usage events yet.
                    </TableCell>
                  </TableRow>
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payment Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentRequests.slice(0, 5).map((req) => {
                  const customer = customers.find(
                    (c) => c.id === req.customerId
                  );
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        {customer?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {req.amount} {req.asset}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                          req.status === 'paid' ?
                          'success' :
                          req.status === 'pending' ?
                          'secondary' :
                          'destructive'
                          }>
                          
                          {req.status}
                        </Badge>
                      </TableCell>
                    </TableRow>);

                })}
                {paymentRequests.length === 0 &&
                <TableRow>
                    <TableCell
                    colSpan={3}
                    className="text-center text-zinc-500 py-4">
                    
                      No payment requests yet.
                    </TableCell>
                  </TableRow>
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>);

}
