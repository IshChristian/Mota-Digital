import { create } from 'zustand';
import { financeApi } from '@/services/api';

interface FinanceState {
  riskScore: any;
  migrationStage: any;
  savingsStatus: any;
  eligibility: any;
  
  fetchRiskScore: () => Promise<void>;
  fetchSavingsStatus: () => Promise<void>;
  fetchMigrationStage: () => Promise<void>;
  fetchEligibility: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  riskScore: null,
  migrationStage: null,
  savingsStatus: null,
  eligibility: null,
  
  fetchRiskScore: async () => {
    try {
      const res = await financeApi.getRiskScore();
      set({ riskScore: res.data });
    } catch (error) {
      console.error('Failed to fetch risk score', error);
    }
  },
  
  fetchSavingsStatus: async () => {
    try {
      const res = await financeApi.getSavingsStatus();
      set({ savingsStatus: res.data });
    } catch (error) {
      console.error('Failed to fetch savings status', error);
    }
  },

  fetchMigrationStage: async () => {
    try {
      const res = await financeApi.getMigrationStage();
      set({ migrationStage: res.data });
    } catch (error) {
      console.error('Failed to fetch migration stage', error);
    }
  },

  fetchEligibility: async () => {
    try {
      const res = await financeApi.getEligibility();
      set({ eligibility: res.data });
    } catch (error) {
      console.error('Failed to fetch eligibility', error);
    }
  }
}));
