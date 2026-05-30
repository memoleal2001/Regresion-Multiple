/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dataset, ColumnStats, RegressionResult } from "../types";
import { transpose, multiply, invert, studentTProbability, fProbability } from "./math";

// 1. Descriptive stats builder
export function computeDescriptiveStats(
  headers: string[],
  rows: any[],
  colTypes: Record<string, "numeric" | "categorical">
): Record<string, ColumnStats> {
  const stats: Record<string, ColumnStats> = {};

  for (const h of headers) {
    const values = rows.map((r) => r[h]);
    const nullCount = values.filter(
      (v) => v === undefined || v === null || String(v).trim() === ""
    ).length;
    const distinctValues = Array.from(
      new Set(
        values.filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
      )
    );
    const distinctCount = distinctValues.length;

    if (colTypes[h] === "numeric") {
      const numValues: number[] = values
        .map((v) => Number(v))
        .filter((v) => !isNaN(v) && v !== null && v !== undefined);

      if (numValues.length === 0) {
        stats[h] = {
          min: 0,
          max: 0,
          avg: 0,
          median: 0,
          stdDev: 0,
          nullCount,
          distinctCount,
        };
        continue;
      }

      const sorted = [...numValues].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const sum = sorted.reduce((s, x) => s + x, 0);
      const avg = sum / sorted.length;

      // Median
      let median = 0;
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        median = (sorted[mid - 1] + sorted[mid]) / 2;
      } else {
        median = sorted[mid];
      }

      // Sample Standard Deviation
      const squaredDiffs = sorted.reduce((v, x) => v + Math.pow(x - avg, 2), 0);
      const sampleVariance = sorted.length > 1 ? squaredDiffs / (sorted.length - 1) : 0;
      const stdDev = Math.sqrt(sampleVariance);

      stats[h] = {
        min,
        max,
        avg,
        median,
        stdDev,
        nullCount,
        distinctCount,
      };
    } else {
      // Categorical freq
      const freqs: Record<string, number> = {};
      values.forEach((v) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          const s = String(v);
          freqs[s] = (freqs[s] || 0) + 1;
        }
      });
      const sortedFreqs = Object.entries(freqs)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

      stats[h] = {
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        stdDev: 0,
        nullCount,
        distinctCount,
        frequencies: sortedFreqs.slice(0, 10),
      };
    }
  }

  return stats;
}

// 2. Multiple Linear Regression computational engine
export function computeMultipleRegression(
  rows: any[],
  dependentVar: string,
  independentVars: string[],
  splitRatio: 0.7 | 0.8
): RegressionResult {
  if (!dependentVar || independentVars.length === 0) {
    throw new Error("Se requiere definir una variable dependiente y al menos una variable independiente.");
  }

  // Filter valid rows (where both dependent and all independent are numeric and present)
  const validRows = rows.filter((r) => {
    const yVal = Number(r[dependentVar]);
    if (isNaN(yVal) || r[dependentVar] === null || r[dependentVar] === undefined) return false;

    for (const v of independentVars) {
      const xVal = Number(r[v]);
      if (isNaN(xVal) || r[v] === null || r[v] === undefined) return false;
    }
    return true;
  });

  const N_total = validRows.length;
  if (N_total < independentVars.length + 2) {
    throw new Error(
      `Muestra insuficiente para regresión múltiple. Se necesitan al menos ${
        independentVars.length + 2
      } observaciones válidas libres de valores nulos, actualmente hay ${N_total}.`
    );
  }

  // Random train-test split to ensure professional data-handling
  // Deep-copy and shuffle
  const shuffled = [...validRows].sort(() => Math.random() - 0.5);
  const trainCount = Math.floor(N_total * splitRatio);
  const trainRows = shuffled.slice(0, trainCount);
  const testRows = shuffled.slice(trainCount);

  const n = trainRows.length;
  const p = independentVars.length;

  if (n <= p + 1) {
    throw new Error(
      "El tamaño de la muestra de entrenamiento es demasiado pequeño para estimar los coeficientes del modelo."
    );
  }

  // Construct Train Matrices
  // Matrix X: shape (n x (p + 1)) (first column = 1 for the intercept)
  const X_arr: number[][] = [];
  const Y_arr: number[][] = [];

  for (let i = 0; i < n; i++) {
    const r = trainRows[i];
    const rowX = [1]; // intercept term
    for (const v of independentVars) {
      rowX.push(Number(r[v]));
    }
    X_arr.push(rowX);
    Y_arr.push([Number(r[dependentVar])]);
  }

  // Ordinary Least Squares Calculations: beta = (X^T X)^-1 X^T Y
  const Xt = transpose(X_arr);
  const XtX = multiply(Xt, X_arr);
  const XtX_inv = invert(XtX);
  const XtY = multiply(Xt, Y_arr);
  const beta = multiply(XtX_inv, XtY);

  // Extract Intercept and Coefficients
  const intercept = beta[0][0];
  const coefficients: Record<string, number> = {};
  independentVars.forEach((v, idx) => {
    coefficients[v] = beta[idx + 1][0];
  });

  // Predictions on training set
  const trainPredictions = multiply(X_arr, beta);
  const residuals: number[] = [];
  let rss = 0; // Residual Sum of Squares
  let sumY = 0;

  for (let i = 0; i < n; i++) {
    const actual = Y_arr[i][0];
    const predicted = trainPredictions[i][0];
    const res = actual - predicted;
    residuals.push(res);
    rss += res * res;
    sumY += actual;
  }

  const avgY = sumY / n;
  let tss = 0; // Total Sum of Squares
  for (let i = 0; i < n; i++) {
    tss += Math.pow(Y_arr[i][0] - avgY, 2);
  }

  // Model variance and adjusted metrics
  const df_reg = p;
  const df_err = n - p - 1;

  const r2 = tss === 0 ? 0 : 1 - rss / tss;
  const adjR2 = tss === 0 || df_err <= 0 ? 0 : 1 - (rss / df_err) / (tss / (n - 1));

  const mse = rss / n;
  const rmse = Math.sqrt(mse);
  const unbiasedResidualVariance = df_err > 0 ? rss / df_err : 0;

  // Covariance of coefficients matrix: sigma^2 * (X^T * X)^-1
  const stdErrors: Record<string, number> = {};
  const tStats: Record<string, number> = {};
  const pValues: Record<string, number> = {};

  const interceptVar = unbiasedResidualVariance * XtX_inv[0][0];
  const interceptSE = Math.sqrt(interceptVar);
  stdErrors["(Intercepto)"] = interceptSE;
  
  const interceptT = interceptSE === 0 ? 0 : intercept / interceptSE;
  tStats["(Intercepto)"] = interceptT;
  pValues["(Intercepto)"] = df_err > 0 ? studentTProbability(Math.abs(interceptT), df_err) : 0.5;

  independentVars.forEach((v, idx) => {
    const idxInMatrix = idx + 1;
    const coeffVar = unbiasedResidualVariance * XtX_inv[idxInMatrix][idxInMatrix];
    const coeffSE = Math.sqrt(coeffVar);
    stdErrors[v] = coeffSE;

    const coeffVal = coefficients[v];
    const tStat = coeffSE === 0 ? 0 : coeffVal / coeffSE;
    tStats[v] = tStat;
    
    // Two-tailed p-value
    pValues[v] = df_err > 0 ? studentTProbability(Math.abs(tStat), df_err) : 0.5;
  });

  // F-statistic: (ESS / p) / (RSS / df_err) where ESS = TSS - RSS
  const ess = tss - rss;
  const mss = ess / df_reg;
  const fStatistic = unbiasedResidualVariance === 0 ? 0 : mss / unbiasedResidualVariance;
  const fProb = fProbability(fStatistic, df_reg, df_err);

  return {
    dependentVar,
    independentVars,
    coefficients,
    intercept,
    r2,
    adjR2,
    mse,
    rmse,
    pValues,
    tStats,
    stdErrors,
    fStatistic,
    fProb,
    residuals,
    trainSize: n,
    testSize: testRows.length,
    splitRatio: splitRatio === 0.7 ? "70/30" : "80/20",
  };
}
