import { create } from 'zustand';

export type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive';
  webhookUrl: string;
  defaultAsset: string;
};

export type PricingRule = {
  id: string;
  serviceId: string;
  name: string;
  metricKey: string;
  unitName: string;
  pricingModel: 'fixed_per_request' | 'per_unit' | 'per_1000_units';
  price: number;
  asset: string;
  active: boolean;
};

export type Customer = {
  id: string;
  externalId: string;
  name: string;
  email: string;
};

export type Balance = {
  id: string;
  customerId: string;
  asset: string;
  availableBalance: number;
  totalFunded: number;
  totalSpent: number;
};

export type PaymentRequest = {
  id: string;
  customerId: string;
  asset: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  paymentUri: string;
  createdAt: string;
};

export type UsageEvent = {
  id: string;
  serviceId: string;
  customerId: string;
  metricKey: string;
  quantity: number;
  calculatedAmount: number;
  asset: string;
  status: 'charged' | 'insufficient_balance';
  occurredAt: string;
};

export type WebhookDelivery = {
  id: string;
  eventType: string;
  payload: any;
  status: 'sent' | 'failed';
  createdAt: string;
};

interface StoreState {
  services: Service[];
  pricingRules: PricingRule[];
  customers: Customer[];
  balances: Balance[];
  paymentRequests: PaymentRequest[];
  usageEvents: UsageEvent[];
  webhooks: WebhookDelivery[];

  // Actions
  addService: (service: Omit<Service, 'id'>) => void;
  addPricingRule: (rule: Omit<PricingRule, 'id'>) => void;
  setPricingRuleActive: (id: string, active: boolean) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  createPaymentRequest: (
  req: Omit<PaymentRequest, 'id' | 'status' | 'paymentUri' | 'createdAt'>)
  => void;
  simulatePaymentPaid: (id: string) => void;
  recordUsage: (usage: {
    serviceSlug: string;
    customerExternalId: string;
    metricKey: string;
    quantity: number;
  }) => any;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useStore = create<StoreState>((set, get) => ({
  services: [
  {
    id: 'srv_1',
    name: 'AI Summary API',
    slug: 'ai-summary',
    description: 'Summarizes text using AI',
    status: 'active',
    webhookUrl: 'http://localhost:9000/webhooks/fibermeter',
    defaultAsset: 'CKB'
  }],

  pricingRules: [
  {
    id: 'pr_1',
    serviceId: 'srv_1',
    name: 'Token Usage',
    metricKey: 'tokens',
    unitName: 'token',
    pricingModel: 'per_1000_units',
    price: 10,
    asset: 'CKB',
    active: true
  }],

  customers: [
  {
    id: 'cus_1',
    externalId: 'cus_demo_001',
    name: 'Ada Demo',
    email: 'ada@example.com'
  }],

  balances: [
  {
    id: 'bal_1',
    customerId: 'cus_1',
    asset: 'CKB',
    availableBalance: 100,
    totalFunded: 100,
    totalSpent: 0
  }],

  paymentRequests: [],
  usageEvents: [],
  webhooks: [],

  addService: (service) =>
  set((state) => ({
    services: [...state.services, { ...service, id: `srv_${generateId()}` }]
  })),

  addPricingRule: (rule) =>
  set((state) => ({
    pricingRules: [...state.pricingRules, { ...rule, id: `pr_${generateId()}` }]
  })),

  setPricingRuleActive: (id, active) =>
  set((state) => ({
    pricingRules: state.pricingRules.map((r) =>
    r.id === id ? { ...r, active } : r
    )
  })),

  addCustomer: (customer) =>
  set((state) => {
    const newCustomer = { ...customer, id: `cus_${generateId()}` };
    const newBalance = {
      id: `bal_${generateId()}`,
      customerId: newCustomer.id,
      asset: 'CKB',
      availableBalance: 0,
      totalFunded: 0,
      totalSpent: 0
    };
    return {
      customers: [...state.customers, newCustomer],
      balances: [...state.balances, newBalance]
    };
  }),

  createPaymentRequest: (req) =>
  set((state) => {
    const newReq: PaymentRequest = {
      ...req,
      id: `pay_${generateId()}`,
      status: 'pending',
      paymentUri: `fiber-sim://pay?amount=${req.amount}&asset=${req.asset}&ref=sim_${generateId()}`,
      createdAt: new Date().toISOString()
    };

    // Simulate webhook
    const webhook: WebhookDelivery = {
      id: `wh_${generateId()}`,
      eventType: 'payment.request.created',
      payload: newReq,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    return {
      paymentRequests: [newReq, ...state.paymentRequests],
      webhooks: [webhook, ...state.webhooks]
    };
  }),

  simulatePaymentPaid: (id) =>
  set((state) => {
    const req = state.paymentRequests.find((r) => r.id === id);
    if (!req || req.status !== 'pending') return state;

    const updatedReq = { ...req, status: 'paid' as const };

    const balance = state.balances.find(
      (b) => b.customerId === req.customerId && b.asset === req.asset
    );
    const updatedBalances = state.balances.map((b) => {
      if (b.customerId === req.customerId && b.asset === req.asset) {
        return {
          ...b,
          availableBalance: b.availableBalance + req.amount,
          totalFunded: b.totalFunded + req.amount
        };
      }
      return b;
    });

    // If balance didn't exist, create it
    if (!balance) {
      updatedBalances.push({
        id: `bal_${generateId()}`,
        customerId: req.customerId,
        asset: req.asset,
        availableBalance: req.amount,
        totalFunded: req.amount,
        totalSpent: 0
      });
    }

    const webhook: WebhookDelivery = {
      id: `wh_${generateId()}`,
      eventType: 'balance.funded',
      payload: {
        customerId: req.customerId,
        amount: req.amount,
        asset: req.asset
      },
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    return {
      paymentRequests: state.paymentRequests.map((r) =>
      r.id === id ? updatedReq : r
      ),
      balances: updatedBalances,
      webhooks: [webhook, ...state.webhooks]
    };
  }),

  recordUsage: ({ serviceSlug, customerExternalId, metricKey, quantity }) => {
    const state = get();
    const service = state.services.find((s) => s.slug === serviceSlug);
    const customer = state.customers.find(
      (c) => c.externalId === customerExternalId
    );

    if (!service || !customer) return { error: 'Service or customer not found' };

    const rule = state.pricingRules.find(
      (r) => r.serviceId === service.id && r.metricKey === metricKey
    );
    if (!rule) return { error: 'Pricing rule not found' };

    let amount = 0;
    if (rule.pricingModel === 'fixed_per_request') amount = rule.price;else
    if (rule.pricingModel === 'per_unit') amount = rule.price * quantity;else
    if (rule.pricingModel === 'per_1000_units')
    amount = rule.price * quantity / 1000;

    const balance = state.balances.find(
      (b) => b.customerId === customer.id && b.asset === rule.asset
    );

    if (!balance || balance.availableBalance < amount) {
      const event: UsageEvent = {
        id: `use_${generateId()}`,
        serviceId: service.id,
        customerId: customer.id,
        metricKey,
        quantity,
        calculatedAmount: amount,
        asset: rule.asset,
        status: 'insufficient_balance',
        occurredAt: new Date().toISOString()
      };

      const webhook: WebhookDelivery = {
        id: `wh_${generateId()}`,
        eventType: 'usage.rejected',
        payload: event,
        status: 'sent',
        createdAt: new Date().toISOString()
      };

      set({
        usageEvents: [event, ...state.usageEvents],
        webhooks: [webhook, ...state.webhooks]
      });

      return {
        status: 'insufficient_balance',
        required: amount,
        available: balance?.availableBalance || 0,
        asset: rule.asset
      };
    }

    // Deduct balance
    const updatedBalances = state.balances.map((b) => {
      if (b.id === balance.id) {
        return {
          ...b,
          availableBalance: b.availableBalance - amount,
          totalSpent: b.totalSpent + amount
        };
      }
      return b;
    });

    const event: UsageEvent = {
      id: `use_${generateId()}`,
      serviceId: service.id,
      customerId: customer.id,
      metricKey,
      quantity,
      calculatedAmount: amount,
      asset: rule.asset,
      status: 'charged',
      occurredAt: new Date().toISOString()
    };

    const webhook: WebhookDelivery = {
      id: `wh_${generateId()}`,
      eventType: 'usage.charged',
      payload: event,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    set({
      balances: updatedBalances,
      usageEvents: [event, ...state.usageEvents],
      webhooks: [webhook, ...state.webhooks]
    });

    return {
      status: 'charged',
      amount,
      asset: rule.asset,
      balanceRemaining: balance.availableBalance - amount
    };
  }
}));