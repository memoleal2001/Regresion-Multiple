/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Basic Matrix operations for Ordinary Least Squares (OLS)

export function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

export function multiply(A: number[][], B: number[][]): number[][] {
  const rA = A.length;
  const cA = A[0].length;
  const rB = B.length;
  const cB = B[0].length;

  if (cA !== rB) {
    throw new Error(`Dimension mismatch: columns of A (${cA}) must equal rows of B (${rB})`);
  }

  const result: number[][] = [];
  for (let i = 0; i < rA; i++) {
    result[i] = [];
    for (let j = 0; j < cB; j++) {
      let sum = 0;
      for (let k = 0; k < cA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

export function invert(matrix: number[][]): number[][] {
  const n = matrix.length;
  // Create augmented matrix [A | I]
  const augmented: number[][] = [];
  for (let i = 0; i < n; i++) {
    augmented[i] = [];
    for (let j = 0; j < 2 * n; j++) {
      if (j < n) {
        augmented[i][j] = matrix[i][j];
      } else {
        augmented[i][j] = j - n === i ? 1 : 0;
      }
    }
  }

  // Gauss-Jordan elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let pivotRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(augmented[r][i]) > Math.abs(augmented[pivotRow][i])) {
        pivotRow = r;
      }
    }

    // Swap rows
    if (pivotRow !== i) {
      const temp = augmented[i];
      augmented[i] = augmented[pivotRow];
      augmented[pivotRow] = temp;
    }

    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error(
        "Error de colinealidad: Hay variables altamente correlacionadas o con varianza cero. Elimina alguna para poder calcular el modelo."
      );
    }

    // Normalize pivot row
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }

    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const factor = augmented[r][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[r][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  // Extract inverted matrix
  const inverse: number[][] = [];
  for (let i = 0; i < n; i++) {
    inverse[i] = augmented[i].slice(n);
  }
  return inverse;
}

// Statistical Distributions Approximations for P-values

/**
 * Approximates log-gamma function log(Gamma(x))
 * Lanczos approximation Formula (g=5, n=7)
 */
export function logGamma(x: number): number {
  if (x <= 0) return 0;
  const p = [
    1.000000000190015,
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = p[0];
  for (let j = 1; j <= 6; j++) {
    y += 1;
    ser += p[j] / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Regularized Incomplete Beta function I_x(a, b)
 * Used to compute Student's t and F-distributions
 */
export function ibeta(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Continued fraction representation
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;

  // Use symmetry limit to accelerate convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - ibeta(1 - x, b, a);
  }

  // Continued fraction evaluation
  let f = 1, c = 1, d = 0;
  const maxIter = 100;
  const eps = 3e-15;

  for (let m = 0; m <= maxIter; m++) {
    const dP = m * 2;
    let dVal;
    
    if (m === 0) {
      dVal = 1;
    } else {
      const num = m;
      if (dP % 2 === 0) {
        // Even index term
        const k = num / 2;
        dVal = (k * (b - k) * x) / ((a + dP - 1) * (a + dP));
      } else {
        // Odd index term
        const k = (num - 1) / 2;
        dVal = -((a + k) * (a + b + k) * x) / ((a + dP) * (a + dP + 1));
      }
    }

    // Denominators
    d = 1 + dVal * d;
    if (Math.abs(d) < eps) d = eps;
    d = 1 / d;

    c = 1 + dVal / c;
    if (Math.abs(c) < eps) c = eps;

    const del = c * d;
    f *= del;

    if (Math.abs(del - 1) < eps) {
      return front * (f - 1);
    }
  }

  return front * (f - 1);
}

/**
 * Probability density functions (approximate) of Student-T distribution (cumulative, two-tailed)
 */
export function studentTProbability(t: number, df: number): number {
  if (df <= 0) return 1.0;
  const tSq = t * t;
  const x = df / (df + tSq);
  // ibeta handles the incomplete beta probability
  let p = ibeta(x, df / 2, 0.5);
  if (isNaN(p)) return 1.0;
  return p;
}

/**
 * Probability of F-distribution (cumulative upper tail area)
 */
export function fProbability(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1.0;
  const x = df2 / (df2 + df1 * f);
  let p = ibeta(x, df2 / 2, df1 / 2);
  if (isNaN(p)) return 1.0;
  return p;
}

/**
 * Calculate basic correlation (Pearson) between two arrays
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  let sumX = 0, sumY = 0, sumXY = 0;
  let sumXSq = 0, sumYSq = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumXSq += xi * xi;
    sumYSq += yi * yi;
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumXSq - sumX * sumX) * (n * sumYSq - sumY * sumY));

  if (den === 0) return 0;
  return num / den;
}
