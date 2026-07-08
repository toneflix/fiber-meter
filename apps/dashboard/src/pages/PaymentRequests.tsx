import React, { useState } from 'react';
import { useData } from '../lib/useData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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
import { Input } from '../components/ui/Input';
import { TableSkeletonRows } from '../components/DataStates';
export function PaymentRequests() {
  const {
    paymentRequests,
    customers,
    createPaymentRequest,
    simulatePaymentPaid,
    isLoading
  } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [newReq, setNewReq] = useState({
    customerId: '',
    amount: '',
    asset: 'CKB'
  });
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPaymentRequest({
      customerId: newReq.customerId,
      amount: parseFloat(newReq.amount),
      asset: newReq.asset
    });
    setIsAdding(false);
    setNewReq({
      customerId: '',
      amount: '',
      asset: 'CKB'
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Requests
          </h1>
          <p className="text-zinc-500">
            Manage Fiber payment requests to fund customer balances.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Create Request'}
        </Button>
      </div>

      {isAdding &&
      <Card>
          <CardHeader>
            <CardTitle>Create Payment Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>
                  <select
                  required
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                  value={newReq.customerId}
                  onChange={(e) =>
                  setNewReq({
                    ...newReq,
                    customerId: e.target.value
                  })
                  }>
                  
                    <option value="">Select Customer</option>
                    {customers.map((c) =>
                  <option key={c.id} value={c.id}>
                        {c.name} ({c.externalId})
                      </option>
                  )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                  type="number"
                  step="0.01"
                  required
                  value={newReq.amount}
                  onChange={(e) =>
                  setNewReq({
                    ...newReq,
                    amount: e.target.value
                  })
                  }
                  placeholder="100" />
                
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Asset</label>
                  <Input
                  required
                  value={newReq.asset}
                  onChange={(e) =>
                  setNewReq({
                    ...newReq,
                    asset: e.target.value
                  })
                  } />
                
                </div>
              </div>
              <Button type="submit">Create Request</Button>
            </form>
          </CardContent>
        </Card>
      }

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment URI</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRequests.map((req) => {
                const customer = customers.find((c) => c.id === req.customerId);
                return (
                  <TableRow key={req.id}>
                    <TableCell className="text-zinc-500">
                      {new Date(req.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {customer?.name}
                    </TableCell>
                    <TableCell>
                      {req.amount} {req.asset}
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <button
                        onClick={() =>
                        navigator.clipboard.writeText(req.paymentUri)
                        }
                        title="Click to copy payment URI"
                        className="font-mono text-xs text-blue-600 hover:underline truncate block w-full text-left">
                        
                        {req.paymentUri}
                      </button>
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
                    <TableCell className="text-right">
                      {req.status === 'pending' &&
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => simulatePaymentPaid(req.id)}>
                        
                          Simulate Paid
                        </Button>
                      }
                    </TableCell>
                  </TableRow>);

              })}
              {isLoading && paymentRequests.length === 0 &&
              <TableSkeletonRows rows={3} cols={6} />
              }
              {!isLoading && paymentRequests.length === 0 &&
              <TableRow>
                  <TableCell
                  colSpan={6}
                  className="text-center text-zinc-500 py-8">

                    No payment requests found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}