/*
 * Live data source: thin fetchers + mutations against the FiberMeter API, with
 * normalizers that map API rows (Decimal-as-string amounts, nullable fields)
 * into the numeric UI shapes defined in ./types. This is the "real API" half of
 * the dashboard's data layer; the demo half is the in-browser zustand store.
 */
import { apiFetch, apiKeyStore } from './api';
import type {
  ApiKey,
  Balance,
  Customer,
  PaymentRequest,
  PricingRule,
  RecordUsageInput,
  RecordUsageResult,
  Service,
  UsageEvent,
  WebhookDelivery,
} from './types';

const num = (value: unknown): number => Number(value ?? 0);

function mapService(s: any): Service {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description ?? '',
    status: s.status,
    webhookUrl: s.webhookUrl ?? '',
    defaultAsset: s.defaultAsset,
  };
}

function mapPricingRule(r: any): PricingRule {
  return {
    id: r.id,
    serviceId: r.serviceId,
    name: r.name,
    metricKey: r.metricKey,
    unitName: r.unitName,
    pricingModel: r.pricingModel,
    price: num(r.price),
    asset: r.asset,
    active: r.active,
  };
}

function mapCustomer(c: any): Customer {
  return {
    id: c.id,
    externalId: c.externalId,
    name: c.name ?? '',
    email: c.email ?? '',
  };
}

function mapBalance(b: any): Balance {
  return {
    id: b.id,
    customerId: b.customerId,
    asset: b.asset,
    availableBalance: num(b.availableBalance),
    totalFunded: num(b.totalFunded),
    totalSpent: num(b.totalSpent),
  };
}

function mapPayment(p: any): PaymentRequest {
  return {
    id: p.id,
    customerId: p.customerId,
    asset: p.asset,
    amount: num(p.amount),
    status: p.status,
    paymentUri: p.paymentUri,
    createdAt: p.createdAt,
  };
}

function mapUsage(e: any): UsageEvent {
  return {
    id: e.id,
    serviceId: e.serviceId,
    customerId: e.customerId,
    metricKey: e.metricKey,
    quantity: num(e.quantity),
    calculatedAmount: num(e.calculatedAmount),
    asset: e.asset,
    status: e.status,
    occurredAt: e.occurredAt ?? e.createdAt,
  };
}

function mapWebhook(w: any): WebhookDelivery {
  return {
    id: w.id,
    eventType: w.eventType,
    payload: w.payload,
    status: w.status,
    createdAt: w.createdAt,
  };
}

/* --- Reads --- */

export async function getServices(): Promise<{ services: Service[]; pricingRules: PricingRule[] }> {
  const rows = await apiFetch<any[]>('/services');
  return {
    services: rows.map(mapService),
    pricingRules: rows.flatMap((s) => (s.pricingRules ?? []).map(mapPricingRule)),
  };
}

export async function getCustomers(): Promise<{ customers: Customer[]; balances: Balance[] }> {
  const rows = await apiFetch<any[]>('/customers');
  return {
    customers: rows.map(mapCustomer),
    balances: rows.flatMap((c) => (c.balances ?? []).map(mapBalance)),
  };
}

export async function getPaymentRequests(): Promise<PaymentRequest[]> {
  const rows = await apiFetch<any[]>('/payment-requests');
  return rows.map(mapPayment);
}

export async function getUsageEvents(): Promise<UsageEvent[]> {
  const rows = await apiFetch<any[]>('/usage-events');
  return rows.map(mapUsage);
}

export async function getWebhooks(): Promise<WebhookDelivery[]> {
  const rows = await apiFetch<any[]>('/webhook-deliveries');
  return rows.map(mapWebhook);
}

export async function getApiKeys(): Promise<ApiKey[]> {
  return apiFetch<ApiKey[]>('/api-keys');
}

/* --- Mutations --- */

export async function createService(input: {
  name: string;
  slug: string;
  description?: string;
  webhookUrl?: string;
  defaultAsset: string;
}): Promise<void> {
  await apiFetch('/services', { method: 'POST', body: input });
}

export async function createPricingRule(
  serviceId: string,
  input: {
    name: string;
    metricKey: string;
    unitName: string;
    pricingModel: string;
    price: number;
    asset: string;
  },
): Promise<void> {
  await apiFetch(`/services/${serviceId}/pricing-rules`, {
    method: 'POST',
    body: { ...input, price: String(input.price) },
  });
}

export async function setPricingRuleActive(id: string, active: boolean): Promise<void> {
  await apiFetch(`/pricing-rules/${id}`, { method: 'PUT', body: { active } });
}

export async function createCustomer(input: {
  name: string;
  email: string;
  externalId: string;
}): Promise<void> {
  await apiFetch('/customers', { method: 'POST', body: input });
}

export async function createPaymentRequest(input: {
  customerId: string;
  amount: number;
  asset: string;
}): Promise<void> {
  await apiFetch('/payment-requests', {
    method: 'POST',
    body: { ...input, amount: String(input.amount) },
  });
}

export async function simulatePaymentPaid(id: string): Promise<void> {
  await apiFetch(`/payment-requests/${id}/simulate-paid`, { method: 'POST' });
}

export async function retryWebhook(id: string): Promise<void> {
  await apiFetch(`/webhook-deliveries/${id}/retry`, { method: 'POST' });
}

export async function createApiKey(name: string): Promise<ApiKey> {
  const key = await apiFetch<ApiKey>('/api-keys', { method: 'POST', body: { name } });
  /* Persist the raw secret so the demo service can ingest usage with it. */
  if (key.key) {
    apiKeyStore.set(key.key);
  }
  return key;
}

export async function recordUsage(input: RecordUsageInput): Promise<RecordUsageResult> {
  const apiKey = apiKeyStore.get();
  if (!apiKey) {
    return { error: 'No API key found. Create one on the Quickstart page first.' };
  }

  const idempotencyKey =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.round(Math.random() * 1e9)}`;

  try {
    const result = await apiFetch<any>('/usage-events', {
      method: 'POST',
      apiKey,
      body: {
        service: input.serviceSlug,
        customer: input.customerExternalId,
        metricKey: input.metricKey,
        quantity: input.quantity,
        idempotencyKey,
      },
    });

    if (result.status === 'charged') {
      return {
        status: 'charged',
        amount: num(result.amount),
        asset: result.asset,
        balanceRemaining: num(result.balanceRemaining),
      };
    }

    return {
      status: 'insufficient_balance',
      required: num(result.required),
      available: num(result.available),
      asset: result.asset,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Usage request failed' };
  }
}
