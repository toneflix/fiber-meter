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
import { Copy, Check, Plus } from 'lucide-react';
import type { PricingModel } from '../lib/types';

const PRICING_MODELS: { value: PricingModel; label: string }[] = [
{ value: 'fixed_per_request', label: 'Fixed per request' },
{ value: 'per_unit', label: 'Per unit' },
{ value: 'per_1000_units', label: 'Per 1,000 units' }];


const emptyService = {
  name: '',
  slug: '',
  description: '',
  webhookUrl: '',
  defaultAsset: 'CKB'
};

const emptyRule = {
  name: '',
  metricKey: '',
  unitName: '',
  pricingModel: 'per_1000_units' as PricingModel,
  price: '',
  asset: 'CKB'
};

function priceLabel(model: PricingModel) {
  if (model === 'fixed_per_request') return 'per request';
  if (model === 'per_unit') return 'per unit';
  return 'per 1,000 units';
}

export function Services() {
  const { services, pricingRules, addService, addPricingRule, setPricingRuleActive } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState(emptyService);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [ruleFormFor, setRuleFormFor] = useState<string | null>(null);
  const [newRule, setNewRule] = useState(emptyRule);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    await addService(newService);
    setIsAdding(false);
    setNewService(emptyService);
  };

  const handleAddRule = async (serviceId: string, e: React.FormEvent) => {
    e.preventDefault();
    await addPricingRule({
      serviceId,
      name: newRule.name,
      metricKey: newRule.metricKey,
      unitName: newRule.unitName,
      pricingModel: newRule.pricingModel,
      price: parseFloat(newRule.price) || 0,
      asset: newRule.asset
    });
    setRuleFormFor(null);
    setNewRule(emptyRule);
  };

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-zinc-500">
            Manage your metered services and their pricing rules.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add Service'}
        </Button>
      </div>

      {isAdding &&
      <Card>
          <CardHeader>
            <CardTitle>Add New Service</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddService} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                  required
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="e.g. AI Summary API" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                  required
                  value={newService.slug}
                  onChange={(e) => setNewService({ ...newService, slug: e.target.value })}
                  placeholder="e.g. ai-summary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                  value={newService.webhookUrl}
                  onChange={(e) => setNewService({ ...newService, webhookUrl: e.target.value })}
                  placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Asset</label>
                  <Input
                  required
                  value={newService.defaultAsset}
                  onChange={(e) => setNewService({ ...newService, defaultAsset: e.target.value })} />
                </div>
              </div>
              <Button type="submit">Save Service</Button>
            </form>
          </CardContent>
        </Card>
      }

      {services.length === 0 &&
      <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            No services yet. Create one to start metering usage.
          </CardContent>
        </Card>
      }

      {services.map((service) => {
        const rules = pricingRules.filter((r) => r.serviceId === service.id);
        return (
          <Card key={service.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {service.name}
                  <Badge variant={service.status === 'active' ? 'success' : 'secondary'}>
                    {service.status}
                  </Badge>
                </CardTitle>
                <button
                  onClick={() => copySlug(service.slug)}
                  className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 hover:text-zinc-900"
                  title="Copy slug">
                  {service.slug}
                  {copiedSlug === service.slug ?
                  <Check className="h-3 w-3 text-green-600" /> :
                  <Copy className="h-3 w-3" />}
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRuleFormFor(ruleFormFor === service.id ? null : service.id);
                  setNewRule({ ...emptyRule, asset: service.defaultAsset });
                }}>
                <Plus className="mr-1 h-4 w-4" />
                Pricing rule
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {ruleFormFor === service.id &&
              <form
                onSubmit={(e) => handleAddRule(service.id, e)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Name</label>
                      <Input
                      required
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="Token usage" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Metric key</label>
                      <Input
                      required
                      value={newRule.metricKey}
                      onChange={(e) => setNewRule({ ...newRule, metricKey: e.target.value })}
                      placeholder="tokens" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Unit name</label>
                      <Input
                      required
                      value={newRule.unitName}
                      onChange={(e) => setNewRule({ ...newRule, unitName: e.target.value })}
                      placeholder="token" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Pricing model</label>
                      <select
                      className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                      value={newRule.pricingModel}
                      onChange={(e) =>
                      setNewRule({ ...newRule, pricingModel: e.target.value as PricingModel })
                      }>
                        {PRICING_MODELS.map((m) =>
                      <option key={m.value} value={m.value}>{m.label}</option>
                      )}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Price</label>
                      <Input
                      required
                      type="number"
                      step="0.000001"
                      value={newRule.price}
                      onChange={(e) => setNewRule({ ...newRule, price: e.target.value })}
                      placeholder="10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Asset</label>
                      <Input
                      required
                      value={newRule.asset}
                      onChange={(e) => setNewRule({ ...newRule, asset: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" size="sm">Save rule</Button>
                </form>
              }

              {rules.length === 0 ?
              <p className="text-sm text-zinc-500">No pricing rules yet.</p> :
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Metric</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) =>
                  <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500">
                          {rule.metricKey}
                        </TableCell>
                        <TableCell>
                          {rule.price} {rule.asset}{' '}
                          <span className="text-zinc-400">{priceLabel(rule.pricingModel)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.active ? 'success' : 'secondary'}>
                            {rule.active ? 'active' : 'inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPricingRuleActive(rule.id, !rule.active)}>
                            {rule.active ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                  )}
                  </TableBody>
                </Table>
              }
            </CardContent>
          </Card>);

      })}
    </div>);

}
