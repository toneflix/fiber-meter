/*
 * UI-facing types shared by the live (API) and demo (in-browser) data sources.
 * The core entity shapes come from the mock store; amounts are always plain
 * numbers here so pages can format them uniformly regardless of source. The
 * live client coerces Decimal-as-string values from the API into numbers.
 */
export type {
  Service,
  PricingRule,
  Customer,
  Balance,
  PaymentRequest,
  UsageEvent,
  WebhookDelivery,
} from '../store';

export type PricingModel = 'fixed_per_request' | 'per_unit' | 'per_1000_units';

/* Shared mutation inputs — identical across the live and demo data sources so
 * pages get one stable call signature regardless of the active source. */
export type ServiceInput = {
  name: string;
  slug: string;
  description: string;
  webhookUrl: string;
  defaultAsset: string;
};

export type PricingRuleInput = {
  serviceId: string;
  name: string;
  metricKey: string;
  unitName: string;
  pricingModel: PricingModel;
  price: number;
  asset: string;
};

export type CustomerInput = {
  name: string;
  email: string;
  externalId: string;
};

export type PaymentRequestInput = {
  customerId: string;
  amount: number;
  asset: string;
};

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  active: boolean;
  createdAt: string;
  /* Present only on the create response — the raw secret is shown once. */
  key?: string;
};

export type RecordUsageInput = {
  serviceSlug: string;
  customerExternalId: string;
  metricKey: string;
  quantity: number;
};

export type RecordUsageResult =
  | { status: 'charged'; amount: number; asset: string; balanceRemaining: number }
  | { status: 'insufficient_balance'; required: number; available: number; asset: string }
  | { error: string };
