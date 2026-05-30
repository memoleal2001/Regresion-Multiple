/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColumnStats {
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
  nullCount: number;
  distinctCount: number;
  frequencies?: { value: string | number; count: number }[];
}

export interface DependentOption {
  variable: string;
  metricType: string;
  justification: string;
  viabilityScore: number;
}

export interface EconomicAnalysis {
  economicSector: string;
  sectorJustification: string;
  variablesBusinessContext: Record<string, string>;
  dependentOptions: DependentOption[];
  generalInterpretation: string;
}

export interface RegressionResult {
  dependentVar: string;
  independentVars: string[];
  coefficients: Record<string, number>;
  intercept: number;
  r2: number;
  adjR2: number;
  mse: number;
  rmse: number;
  pValues: Record<string, number>;
  tStats: Record<string, number>;
  stdErrors: Record<string, number>;
  fStatistic: number;
  fProb: number;
  residuals: number[];
  trainSize: number;
  testSize: number;
  splitRatio: string;
}

export interface VariableSignificanceItem {
  variable: string;
  coefficient: number;
  pValue: number;
  isSignificant: boolean;
  businessImpact: string;
}

export interface AIInterpretation {
  modelValidationResult: string;
  equationBusinessInterpretation: string;
  variableSignificanceTable: VariableSignificanceItem[];
  bestModelVerdict: string;
  strategicActionPlan: string[];
}

export interface SimulatedScenario {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, number>;
  predictedValue?: number;
  strategicFocus: string;
  businessLesson: string;
}

export interface Dataset {
  name: string;
  headers: string[];
  rows: any[];
  types: Record<string, "numeric" | "categorical">;
  stats: Record<string, ColumnStats>;
}
