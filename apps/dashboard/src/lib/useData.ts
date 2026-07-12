/*
 * useData() — the single data-access hook every page uses.
 *
 * It exposes one uniform shape (collections + mutation callbacks) backed by
 * either the live API (TanStack Query over ./live) or the in-browser demo store
 * (zustand). All hooks are called unconditionally so the Rules of Hooks hold;
 * the active source is selected afterwards based on auth mode.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import { toast } from './toast';
import * as live from './live';
import { useStore } from '../store';
import type {
  ApiKey,
  CustomerInput,
  PaymentRequestInput,
  PricingRuleInput,
  RecordUsageInput,
  RecordUsageResult,
  ServiceInput,
} from './types';

/* Synthetic key shown on the Quickstart page while in demo mode. */
const DEMO_API_KEY_RAW = 'fm_demo_sk_0000111122223333';
const DEMO_API_KEYS: ApiKey[] = [
  {
    id: 'key_demo',
    name: 'Demo ingestion key',
    keyPrefix: 'fm_demo_sk',
    lastUsedAt: null,
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

export function useData() {
  const { demoMode, token } = useAuth();
  const qc = useQueryClient();
  const store = useStore();

  const enabled = !demoMode && !!token;
  const opts = { enabled, staleTime: 5_000 };

  /* Live queries — always instantiated; disabled (no fetch) in demo mode. */
  const servicesQ = useQuery({ queryKey: ['services'], queryFn: live.getServices, ...opts });
  const customersQ = useQuery({ queryKey: ['customers'], queryFn: live.getCustomers, ...opts });
  const paymentsQ = useQuery({ queryKey: ['payments'], queryFn: live.getPaymentRequests, ...opts });
  const usageQ = useQuery({ queryKey: ['usage'], queryFn: live.getUsageEvents, ...opts });
  const webhooksQ = useQuery({ queryKey: ['webhooks'], queryFn: live.getWebhooks, ...opts });
  const apiKeysQ = useQuery({ queryKey: ['apiKeys'], queryFn: live.getApiKeys, ...opts });

  const invalidate = (...keys: string[]) =>
    Promise.all(keys.map((key) => qc.invalidateQueries({ queryKey: [key] })));

  /* Run a mutation, surfacing success/failure to the user via a toast. */
  const notify = async <T,>(successMsg: string | null, fn: () => Promise<T>): Promise<T> => {
    try {
      const result = await fn();
      if (successMsg) toast.success(successMsg);
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
      throw e;
    }
  };

  if (demoMode) {
    return {
      isLive: false,
      isLoading: false,
      error: null as Error | null,
      services: store.services,
      pricingRules: store.pricingRules,
      customers: store.customers,
      balances: store.balances,
      paymentRequests: store.paymentRequests,
      usageEvents: store.usageEvents,
      webhooks: store.webhooks,
      apiKeys: DEMO_API_KEYS,

      addService: (input: ServiceInput) =>
        notify('Service created', async () => store.addService({ ...input, status: 'active' })),
      addPricingRule: (input: PricingRuleInput) =>
        notify('Pricing rule created', async () => store.addPricingRule({ ...input, active: true })),
      setPricingRuleActive: (id: string, active: boolean) =>
        notify(active ? 'Rule enabled' : 'Rule disabled', async () =>
          store.setPricingRuleActive(id, active),
        ),
      addCustomer: (input: CustomerInput) =>
        notify('Customer created', async () => store.addCustomer(input)),
      createPaymentRequest: (input: PaymentRequestInput) =>
        notify('Payment request created', async () => store.createPaymentRequest(input)),
      simulatePaymentPaid: (id: string) =>
        notify('Payment marked as paid', async () => store.simulatePaymentPaid(id)),
      verifyPaymentRequest: async (_id: string) => {
        toast.error('Verify on Fiber is only available in Live mode');
      },
      retryWebhook: async (_id: string) => {
        /* Demo webhooks are always delivered — nothing to retry. */
      },
      createApiKey: (_name: string): Promise<ApiKey> =>
        notify('API key created', async () => ({ ...DEMO_API_KEYS[0], key: DEMO_API_KEY_RAW })),
      recordUsage: async (input: RecordUsageInput): Promise<RecordUsageResult> =>
        store.recordUsage(input) as RecordUsageResult,
    };
  }

  const error =
    (servicesQ.error ??
      customersQ.error ??
      paymentsQ.error ??
      usageQ.error ??
      webhooksQ.error ??
      apiKeysQ.error) as Error | null;

  return {
    isLive: true,
    isLoading:
      servicesQ.isLoading ||
      customersQ.isLoading ||
      paymentsQ.isLoading ||
      usageQ.isLoading ||
      webhooksQ.isLoading,
    error,
    services: servicesQ.data?.services ?? [],
    pricingRules: servicesQ.data?.pricingRules ?? [],
    customers: customersQ.data?.customers ?? [],
    balances: customersQ.data?.balances ?? [],
    paymentRequests: paymentsQ.data ?? [],
    usageEvents: usageQ.data ?? [],
    webhooks: webhooksQ.data ?? [],
    apiKeys: apiKeysQ.data ?? [],

    addService: (input: ServiceInput) =>
      notify('Service created', async () => {
        await live.createService(input);
        await invalidate('services');
      }),
    addPricingRule: (input: PricingRuleInput) =>
      notify('Pricing rule created', async () => {
        const { serviceId, ...rule } = input;
        await live.createPricingRule(serviceId, rule);
        await invalidate('services');
      }),
    setPricingRuleActive: (id: string, active: boolean) =>
      notify(active ? 'Rule enabled' : 'Rule disabled', async () => {
        await live.setPricingRuleActive(id, active);
        await invalidate('services');
      }),
    addCustomer: (input: CustomerInput) =>
      notify('Customer created', async () => {
        await live.createCustomer(input);
        await invalidate('customers');
      }),
    createPaymentRequest: (input: PaymentRequestInput) =>
      notify('Payment request created', async () => {
        await live.createPaymentRequest(input);
        await invalidate('payments', 'webhooks');
      }),
    simulatePaymentPaid: (id: string) =>
      notify('Payment marked as paid', async () => {
        await live.simulatePaymentPaid(id);
        await invalidate('payments', 'customers', 'webhooks');
      }),
    verifyPaymentRequest: (id: string) =>
      notify(null, async () => {
        const result = await live.verifyPaymentRequest(id);
        if (result.verification.paid) {
          toast.success(
            result.verification.alreadyPaid
              ? 'Already paid'
              : 'Fiber payment confirmed — balance funded',
          );
        } else {
          toast.error('Not paid yet on Fiber — pay the invoice, then verify again');
        }
        await invalidate('payments', 'customers', 'webhooks');
        return result;
      }),
    retryWebhook: (id: string) =>
      notify('Webhook retried', async () => {
        await live.retryWebhook(id);
        await invalidate('webhooks');
      }),
    createApiKey: (name: string): Promise<ApiKey> =>
      notify('API key created', async () => {
        const key = await live.createApiKey(name);
        await invalidate('apiKeys');
        return key;
      }),
    recordUsage: async (input: RecordUsageInput): Promise<RecordUsageResult> => {
      const result = await live.recordUsage(input);
      await invalidate('usage', 'customers', 'webhooks');
      return result;
    },
  };
}
