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
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TableSkeletonRows } from '../components/DataStates';
export function Customers() {
  const { customers, balances, addCustomer, isLoading } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    externalId: ''
  });
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCustomer(newCustomer);
    setIsAdding(false);
    setNewCustomer({
      name: '',
      email: '',
      externalId: ''
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-zinc-500">
            Manage your customers and their balances.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add Customer'}
        </Button>
      </div>

      {isAdding &&
      <Card>
          <CardHeader>
            <CardTitle>Add New Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                  required
                  value={newCustomer.name}
                  onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    name: e.target.value
                  })
                  }
                  placeholder="e.g. Ada Lovelace" />
                
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                  type="email"
                  required
                  value={newCustomer.email}
                  onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    email: e.target.value
                  })
                  }
                  placeholder="ada@example.com" />
                
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">External ID</label>
                  <Input
                  required
                  value={newCustomer.externalId}
                  onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    externalId: e.target.value
                  })
                  }
                  placeholder="cus_ext_123" />
                
                </div>
              </div>
              <Button type="submit">Save Customer</Button>
            </form>
          </CardContent>
        </Card>
      }

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Balances</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const customerBalances = balances.filter(
                  (b) => b.customerId === customer.id
                );
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {customer.externalId}
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>
                      {customerBalances.map((b) =>
                      <div key={b.id} className="text-sm">
                          <span className="font-medium">
                            {b.availableBalance.toFixed(2)}
                          </span>{' '}
                          {b.asset}
                        </div>
                      )}
                      {customerBalances.length === 0 &&
                      <span className="text-zinc-400">No balance</span>
                      }
                    </TableCell>
                  </TableRow>);

              })}
              {isLoading && customers.length === 0 &&
              <TableSkeletonRows rows={3} cols={4} />
              }
              {!isLoading && customers.length === 0 &&
              <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-500 py-8">
                    No customers yet.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}