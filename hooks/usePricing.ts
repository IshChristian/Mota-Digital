// Fees and prices set in the admin panel (Settings), so screens never show a
// stale hard-coded figure. Falls back to MOTA's defaults while loading/offline.
import { useQuery } from "@tanstack/react-query";
import { platformApi } from "@/services/api";

export type Pricing = {
  registrationFee: { driver: number; agent: number };
  fees: { cashOutPercent: number; transferPercent: number; commissionPercent: number };
  loans: { interestPercent: number; maxAmount: number; autoRepaymentPercent: number; maxDurationDays: number };
  support: { phone: string; email: string };
  maintenance: { on: boolean; message: string };
  savings: { monthlyRewardPercent: number };
};

export const DEFAULT_PRICING: Pricing = {
  registrationFee: { driver: 5000, agent: 10000 },
  fees: { cashOutPercent: 2, transferPercent: 1, commissionPercent: 10 },
  loans: { interestPercent: 5, maxAmount: 50000, autoRepaymentPercent: 10, maxDurationDays: 90 },
  support: { phone: "", email: "" },
  maintenance: { on: false, message: "" },
  savings: { monthlyRewardPercent: 2 },
};

export function usePricing() {
  const query = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: async () => ({ ...DEFAULT_PRICING, ...((await platformApi.pricing()).data?.data ?? {}) }) as Pricing,
    staleTime: 60_000,
  });
  return { pricing: query.data ?? DEFAULT_PRICING, loaded: query.isSuccess };
}

export const rwf = (amount: number) => `${Math.round(amount).toLocaleString()} RWF`;
