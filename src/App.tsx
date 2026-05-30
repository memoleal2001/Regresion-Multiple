/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileText,
  Database,
  TrendingUp,
  BarChart3,
  Sliders,
  Download,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Info,
  Layers,
  Table,
  LineChart,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Percent
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  BarChart,
  Bar,
  ComposedChart
} from "recharts";

import {
  Dataset,
  EconomicAnalysis,
  RegressionResult,
  AIInterpretation,
  SimulatedScenario
} from "./types";
import { calculateCorrelation } from "./utils/math";
import { computeDescriptiveStats, computeMultipleRegression } from "./utils/regression";
import { generateExecutiveReport } from "./utils/pdfGenerator";

export default function App() {
  // Global App States
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "descriptive" | "correlation" | "regression" | "simulation">("upload");
  const [splitRatio, setSplitRatio] = useState<0.7 | 0.8>(0.7);
  const [isDragging, setIsDragging] = useState(false);

  // Variable Choices
  const [dependentVar, setDependentVar] = useState<string>("");
  const [independentVars, setIndependentVars] = useState<string[]>([]);

  // AI & Computational Results
  const [economicAnalysis, setEconomicAnalysis] = useState<EconomicAnalysis | null>(null);
  const [regressionResult, setRegressionResult] = useState<RegressionResult | null>(null);
  const [aiInterpretation, setAiInterpretation] = useState<AIInterpretation | null>(null);
  const [scenarios, setScenarios] = useState<SimulatedScenario[]>([]);

  // Interactive Simulation Variables state
  const [simulatedInputs, setSimulatedInputs] = useState<Record<string, number>>({});
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");

  // Loading, progress, and error utilities
  const [isSectorLoading, setIsSectorLoading] = useState(false);
  const [isRegressionLoading, setIsRegressionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scatterplot trend interactive state
  const [scatterX, setScatterX] = useState<string>("");
  const [scatterY, setScatterY] = useState<string>("");

  // Quick Time indicator
  const [timeStr] = useState<string>("2026-05-23 18:06:49 (UTC)");

  // Automatically select a default scatter comparison if dataset changes
  useEffect(() => {
    if (dataset) {
      const numericCols = Object.keys(dataset.types).filter(c => dataset.types[c] === "numeric");
      if (numericCols.length >= 2) {
        setScatterX(numericCols[0]);
        setScatterY(numericCols[1]);
      }
    }
  }, [dataset]);

  // Load a pre-defined demo dataset if desired so users can test immediately
  const loadDemoDataset = () => {
    setErrorMessage(null);
    const demoRows = [];
    // Generate logical retail sales data (30 periods)
    for (let i = 1; i <= 30; i++) {
      const precio = 50 + Math.random() * 30 - 15; // $35 - $65
      const inversion_mkt = 1000 + Math.random() * 800; // $1000 - $1800
      const indice_mercado = 80 + Math.random() * 40; // 80 - 120
      const satisfaccion_cliente = 3.5 + Math.random() * 1.5; // 3.5 - 5.0
      // Sales formula with slight error:
      const ventas = Math.round(
        350 + (precio * -4.2) + (inversion_mkt * 0.25) + (indice_mercado * 1.8) + (satisfaccion_cliente * 12) + (Math.random() * 30 - 15)
      );
      demoRows.push({
        Mes: `Mes ${i}`,
        Ventas_Totales: ventas,
        Precio_Unitario: precio,
        Inversion_Marketing: inversion_mkt,
        Indice_Clima_Competencias: indice_mercado,
        Satisfaccion_Cliente: satisfaccion_cliente
      });
    }

    const headers = ["Mes", "Ventas_Totales", "Precio_Unitario", "Inversion_Marketing", "Indice_Clima_Competencias", "Satisfaccion_Cliente"];
    const types: Record<string, "numeric" | "categorical"> = {
      Mes: "categorical",
      Ventas_Totales: "numeric",
      Precio_Unitario: "numeric",
      Inversion_Marketing: "numeric",
      Indice_Clima_Competencias: "numeric",
      Satisfaccion_Cliente: "numeric"
    };

    const stats = computeDescriptiveStats(headers, demoRows, types);
    const demoDataset: Dataset = {
      name: "Datos_Demo_Retorno_Ventas.xlsx",
      headers,
      rows: demoRows,
      types,
      stats
    };

    setDataset(demoDataset);
    // Suggest Ventas_Totales as dependent
    setDependentVar("Ventas_Totales");
    setIndependentVars(["Precio_Unitario", "Inversion_Marketing", "Indice_Clima_Competencias", "Satisfaccion_Cliente"]);
    triggerAISectorAnalysis(demoDataset);
    setActiveTab("descriptive");
  };

  // Drag and Drop helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      parseUploadedFile(files[0]);
    }
  };

  const parseUploadedFile = (file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        if (jsonData.length === 0) {
          setErrorMessage("El archivo cargado está vacío. Asegúrate de incluir encabezados y registros.");
          return;
        }

        // Extract and audit headers
        const headersSet = new Set<string>();
        jsonData.forEach((row: any) => {
          Object.keys(row).forEach((k) => headersSet.add(k));
        });
        const headers = Array.from(headersSet);

        // Detect numeric vs categorical
        const types: Record<string, "numeric" | "categorical"> = {};
        headers.forEach((h) => {
          let numericScore = 0;
          let populatedScore = 0;
          jsonData.forEach((row: any) => {
            const val = row[h];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              populatedScore++;
              if (!isNaN(Number(val))) {
                numericScore++;
              }
            }
          });
          types[h] = populatedScore > 0 && numericScore / populatedScore > 0.6 ? "numeric" : "categorical";
        });

        // Compute stats
        const stats = computeDescriptiveStats(headers, jsonData, types);
        const newDataset: Dataset = {
          name: file.name,
          headers,
          rows: jsonData,
          types,
          stats
        };

        setDataset(newDataset);
        
        // Default target variables deduction
        const numericColumns = headers.filter(h => types[h] === "numeric");
        if (numericColumns.length > 0) {
          // Select last numeric or one close to "venta", "profit", "total"
          const candidateY = numericColumns.find(h => 
            h.toLowerCase().includes("venta") || 
            h.toLowerCase().includes("total") || 
            h.toLowerCase().includes("ganancia") || 
            h.toLowerCase().includes("val") ||
            h.toLowerCase().includes("precio")
          ) || numericColumns[0];
          
          setDependentVar(candidateY);
          setIndependentVars(numericColumns.filter(c => c !== candidateY));
        }

        // Trigger sector analysis
        triggerAISectorAnalysis(newDataset);
        setActiveTab("descriptive");
      } catch (err: any) {
        setErrorMessage(`Error al procesar el archivo: ${err.message || String(err)}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Trigger Gemini Economic Sector Analysis
  const triggerAISectorAnalysis = async (ds: Dataset) => {
    setIsSectorLoading(true);
    setErrorMessage(null);

    // Filter relevant column stats to send to server
    const colStats: Record<string, any> = {};
    ds.headers.forEach(h => {
      const s = ds.stats[h];
      if (ds.types[h] === "numeric") {
        colStats[h] = { min: s.min, max: s.max, avg: s.avg };
      }
    });

    try {
      const res = await fetch("/api/analyze-sector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: ds.headers,
          sampleRows: ds.rows.slice(0, 2),
          columnStats: colStats
        })
      });

      if (!res.ok) throw new Error("Error en la respuesta del servidor Gemini.");
      const data: EconomicAnalysis = await res.json();
      setEconomicAnalysis(data);

      // If Gemini suggested a viable target, select it
      if (data.dependentOptions && data.dependentOptions.length > 0) {
        const primarySuggested = data.dependentOptions[0].variable;
        if (ds.headers.includes(primarySuggested)) {
          setDependentVar(primarySuggested);
          setIndependentVars(
            Object.keys(ds.types).filter(c => ds.types[c] === "numeric" && c !== primarySuggested)
          );
        }
      }
    } catch (e: any) {
      console.error(e);
      // Fallback is automatically provided by our express endpoint
    } finally {
      setIsSectorLoading(false);
    }
  };

  // Calculate Regression model and call Gemini for executive interpretation
  const handleCalculateRegression = async () => {
    if (!dataset || !dependentVar || independentVars.length === 0) return;
    setIsRegressionLoading(true);
    setErrorMessage(null);

    try {
      // Calculate regression locally using our high-precision utilities
      const localResult = computeMultipleRegression(dataset.rows, dependentVar, independentVars, splitRatio);
      setRegressionResult(localResult);

      // Prepopulate simulation input sliders to average values
      const initialInputs: Record<string, number> = {};
      independentVars.forEach(v => {
        initialInputs[v] = dataset.stats[v]?.avg || 0;
      });
      setSimulatedInputs(initialInputs);

      // Collect ranges to send to Gemini
      const ranges: Record<string, any> = {};
      independentVars.forEach(v => {
        const stats = dataset.stats[v];
        if (stats) {
          ranges[v] = { min: stats.min, max: stats.max, avg: stats.avg };
        }
      });

      // Invoke server side Gemini regression interpretation
      const resInterpret = await fetch("/api/interpret-regression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dependentVar,
          independentVars,
          coefficients: localResult.coefficients,
          intercept: localResult.intercept,
          r2: localResult.r2,
          adjR2: localResult.adjR2,
          mse: localResult.mse,
          pValues: localResult.pValues,
          fStatistic: localResult.fStatistic,
          fProb: localResult.fProb,
          economicSector: economicAnalysis?.economicSector || "General"
        })
      });

      if (!resInterpret.ok) throw new Error("No se pudo obtener el diagnóstico interpretativo del servidor.");
      const interpretData: AIInterpretation = await resInterpret.json();
      setAiInterpretation(interpretData);

      // Invoke server side scenario generator to build 5 amazing business environments
      const resScenarios = await fetch("/api/generate-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dependentVar,
          independentVars,
          coefficients: localResult.coefficients,
          intercept: localResult.intercept,
          columnRanges: ranges,
          economicSector: economicAnalysis?.economicSector || "General"
        })
      });

      if (!resScenarios.ok) throw new Error("No se pudo obtener la matriz de simulación del servidor.");
      const scenarioData = await resScenarios.json();
      setScenarios(scenarioData.scenarios);

    } catch (err: any) {
      setErrorMessage(err.message || "Error al realizar el análisis de regresión.");
    } finally {
      setIsRegressionLoading(false);
    }
  };

  // Select a predefined simulation scenario and automatically set slider states
  const loadScenarioInputs = (sc: SimulatedScenario) => {
    setSelectedScenarioId(sc.id);
    const loadedInputs = { ...sc.inputs };
    // Make sure we have sliders for all independent variables
    independentVars.forEach(v => {
      if (loadedInputs[v] === undefined) {
        loadedInputs[v] = dataset?.stats[v]?.avg || 0;
      }
    });
    setSimulatedInputs(loadedInputs);
  };

  // Calculate real-time prediction for sliders
  const getPredictedValue = (inputs: Record<string, number>): number => {
    if (!regressionResult) return 0;
    let prediction = regressionResult.intercept;
    independentVars.forEach(v => {
      const val = inputs[v] !== undefined ? inputs[v] : (dataset?.stats[v]?.avg || 0);
      prediction += val * (regressionResult.coefficients[v] || 0);
    });
    return prediction;
  };

  // Helper values for scenarios predictions
  const scenarioPredictions: Record<string, number> = {};
  if (regressionResult && scenarios.length > 0) {
    scenarios.forEach(sc => {
      // Create copy of inputs to calculate
      const inputsCopy = { ...sc.inputs };
      independentVars.forEach(v => {
        if (inputsCopy[v] === undefined) {
          inputsCopy[v] = dataset?.stats[v]?.avg || 0;
        }
      });
      scenarioPredictions[sc.id] = getPredictedValue(inputsCopy);
    });
  }

  // Auto-calculate regression when variables change to keep workspace fully synchronized
  useEffect(() => {
    if (dataset && dependentVar && independentVars.length > 0) {
      handleCalculateRegression();
    }
  }, [dependentVar, independentVars, splitRatio, dataset]);

  // Generate the Executive PDF
  const triggerPdfDownload = () => {
    if (!dataset || !regressionResult) return;
    
    // Calculate predicted values for PDF
    const scPredictions: Record<string, number> = {};
    scenarios.forEach(sc => {
      const inp = { ...sc.inputs };
      independentVars.forEach(v => {
        if (inp[v] === undefined) inp[v] = dataset.stats[v]?.avg || 0;
      });
      scPredictions[sc.id] = getPredictedValue(inp);
    });

    generateExecutiveReport(
      dataset,
      economicAnalysis,
      regressionResult,
      aiInterpretation,
      scenarios,
      scPredictions
    );
  };

  // Clear workspace
  const handleReset = () => {
    setDataset(null);
    setEconomicAnalysis(null);
    setRegressionResult(null);
    setAiInterpretation(null);
    setScenarios([]);
    setDependentVar("");
    setIndependentVars([]);
    setErrorMessage(null);
    setActiveTab("upload");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1. Header Area styled with Sleek Interface spec */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm">Σ</div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
              MarketImpact <span className="text-indigo-600">Analytics</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
              Plataforma OLS de Modelización Comercial, Simulación de Escenarios y Reportería Ejecutiva
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2.5 py-1 rounded-full border border-indigo-100 font-mono font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Powered by Gemini
          </span>

          {dataset ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-semibold text-slate-600">Dataset: {dataset.name}</span>
              </div>
              
              <button
                onClick={handleReset}
                className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition font-semibold shadow-xs"
                id="btn-reset"
              >
                Reiniciar Proyecto
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono hidden sm:block">
              {timeStr}
            </span>
          )}
        </div>
      </header>

      {/* 2. Stepper layout (Tab controls) */}
      {dataset && (
        <nav className="bg-white border-b border-slate-200 px-4 md:px-6 py-2 flex overflow-x-auto gap-1.5 shadow-xs">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              activeTab === "upload" 
                ? "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-xs" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent"
            }`}
          >
            <Database className="h-4 w-4" /> 1. Datos Fuente
          </button>
          
          <button
            onClick={() => setActiveTab("descriptive")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              activeTab === "descriptive" 
                ? "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-xs" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent"
            }`}
          >
            <Table className="h-4 w-4" /> 2. Estadísticos Descriptivos
          </button>

          <button
            onClick={() => setActiveTab("correlation")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              activeTab === "correlation" 
                ? "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-xs" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent"
            }`}
          >
            <TrendingUp className="h-4 w-4" /> 3. Matriz de Correlación
          </button>

          <button
            onClick={() => setActiveTab("regression")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              activeTab === "regression" 
                ? "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-xs" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent"
            }`}
          >
            <LineChart className="h-4 w-4" /> 4. Ajuste de Regresión
          </button>

          <button
            onClick={() => setActiveTab("simulation")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              activeTab === "simulation" 
                ? "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-xs" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent"
            }`}
          >
            <Sliders className="h-4 w-4" /> 5. Simulaciones & Reporte
          </button>
        </nav>
      )}

      {/* Main Container Workspace */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 overflow-y-auto">
        
        {/* Validation error helper */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-xs" id="alert-error">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Validación Matemática o de Operaciones</h4>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* --- STEP 1: UPLOAD & DEMO --- */}
        {!dataset ? (
          <div className="flex-1 flex flex-col justify-center items-center max-w-2xl mx-auto w-full py-12">
            <div className="text-center mb-8">
              <div className="bg-indigo-50 h-16 w-16 rounded-2xl flex items-center justify-center border border-indigo-100 mx-auto mb-4 shadow-xs">
                <Database className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Carga tu Base de Datos</h2>
              <p className="text-slate-500 text-sm mt-2 max-w-md">
                Arrastra u importa hojas de cálculo en CSV, Excel (XLS, XLSX) o archivos de texto plano para evaluar ventas y simular escenarios.
              </p>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer shadow-xs transition-all duration-300 ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/30"
              }`}
              id="upload-dropzone"
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    parseUploadedFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-slate-400 mb-4 animate-pulse" />
              <span className="text-sm font-semibold text-slate-700">
                Selecciona o arrastra tu archivo aquí
              </span>
              <span className="text-xs text-slate-450 mt-2">
                Soporta .xlsx, .xls, .csv, o .txt de forma ilimitada
              </span>
            </div>

            {/* Demo Button to trigger Instant Dashboard */}
            <div className="w-full flex items-center justify-center gap-4 mt-8">
              <div className="h-px bg-slate-250 flex-1"></div>
              <span className="text-xs text-slate-400 uppercase tracking-widest font-mono font-medium">o prueba con</span>
              <div className="h-px bg-slate-250 flex-1"></div>
            </div>

            <button
              onClick={loadDemoDataset}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100/50 hover:shadow-indigo-200/50 text-sm font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 transform hover:-translate-y-0.5"
              id="btn-demo"
            >
              <Sparkles className="h-4 w-4 text-white" /> Cargar Base de Ventas de Demo
            </button>
          </div>
        ) : (
          /* DASHBOARD VIEW */
          <div className="flex flex-col gap-6">
            
            {/* Quick Status Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block font-bold">Archivo Activo</span>
                  <span className="text-sm font-bold text-slate-800 block">{dataset.name}</span>
                </div>
              </div>

              {isSectorLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-555 font-medium">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                  Identificando sector económico y variables con Gemini...
                </div>
              ) : (
                economicAnalysis && (
                  <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-lg flex items-start gap-2.5 max-w-xl">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-indigo-700 block">Sector Estimado: {economicAnalysis.economicSector}</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5 font-medium">{economicAnalysis.generalInterpretation}</p>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* TAB CONTENT: 1. RAW DATA & FIRST ROWS */}
            {activeTab === "upload" && (
              <div className="flex flex-col gap-6">
                
                {/* Descriptive metadata summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Observaciones</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{dataset.rows.length}</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Dimensiones de Columnas</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{dataset.headers.length}</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Variables Cuantitativas</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
                      {Object.values(dataset.types).filter(t => t === "numeric").length}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Variables Categóricas</span>
                    <span className="text-2xl font-black text-amber-600 mt-1 block font-mono">
                      {Object.values(dataset.types).filter(t => t === "categorical").length}
                    </span>
                  </div>
                </div>

                {/* Showing the First 2 Rows of the dataset */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-slate-600 font-bold">Primeras dos filas del conjunto cargado</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Índices 0 - 1</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 min-w-max border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-mono text-[10px]">
                          <th className="px-5 py-3 border-r border-slate-100 w-16 text-center">Fila</th>
                          {dataset.headers.map(h => (
                            <th key={h} className="px-5 py-3 border-r border-slate-100 font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dataset.rows.slice(0, 2).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-5 py-3 border-r border-slate-100 font-mono text-center text-slate-400 select-none bg-slate-50 font-bold">{idx + 1}</td>
                            {dataset.headers.map(h => (
                              <td key={h} className="px-5 py-3 border-r border-slate-100 max-w-xs truncate text-[11px] font-medium font-mono text-slate-800">
                                {row[h] !== undefined && row[h] !== null ? String(row[h]) : <span className="bg-rose-50 text-rose-600 px-1 rounded text-[10px] font-bold">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Show variables lists and detected types and business meanings inside grid */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-4.5 w-4.5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">Variables Detectadas y Contexto Comercial</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dataset.headers.map(h => (
                      <div key={h} className="bg-slate-50/55 border border-slate-200/60 p-3.5 rounded-xl flex items-start gap-4">
                        <div className={`p-2 rounded-lg text-xs font-mono font-bold shrink-0 text-center uppercase tracking-widest border shadow-2xs ${
                          dataset.types[h] === "numeric" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" 
                            : "bg-amber-50 text-amber-700 border-amber-200/50"
                        }`}>
                          {dataset.types[h] === "numeric" ? "NUM" : "CAT"}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-850 font-mono">{h}</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-medium">
                            {economicAnalysis?.variablesBusinessContext?.[h] || `Indicador de tipo cuantitativo o cualitativo registrado para la simulación de regresión.`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: 2. DESCRIPTIVE SUMMARY */}
            {activeTab === "descriptive" && (
              <div className="flex flex-col gap-6">
                
                {/* descriptive stats table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Métricas Estadísticas Descriptivas Totales</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-750 border-collapse min-w-max">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 uppercase tracking-widest font-mono text-[9px] border-b border-slate-200">
                          <th className="px-5 py-3">Variable</th>
                          <th className="px-5 py-3">Rango de Acción (Mín a Máx)</th>
                          <th className="px-5 py-3">Promedio</th>
                          <th className="px-5 py-3">Mediana</th>
                          <th className="px-5 py-3">Desviación Estándar</th>
                          <th className="px-5 py-3">Observaciones Nulas</th>
                          <th className="px-5 py-3 text-right">Valores Distintos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dataset.headers.map(h => {
                          const colStats = dataset.stats[h];
                          if (!colStats) return null;
                          return (
                            <tr key={h} className="hover:bg-slate-50/80">
                              <td className="px-5 py-3 font-semibold text-slate-900 font-mono">
                                {h}
                                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded font-sans ${
                                  dataset.types[h] === "numeric" 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : "bg-amber-50 text-amber-700"
                                }`}>
                                  {dataset.types[h] === "numeric" ? "numérico" : "categórico"}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-slate-600 font-mono">
                                {dataset.types[h] === "numeric" ? `${colStats.min.toLocaleString("es-ES")} — ${colStats.max.toLocaleString("es-ES")}` : "N/A"}
                              </td>
                              <td className="px-5 py-3 font-mono text-slate-800">
                                {dataset.types[h] === "numeric" ? colStats.avg.toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "N/A"}
                              </td>
                              <td className="px-5 py-3 font-mono text-slate-800">
                                {dataset.types[h] === "numeric" ? colStats.median.toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "N/A"}
                              </td>
                              <td className="px-5 py-3 font-mono text-slate-500">
                                {dataset.types[h] === "numeric" ? colStats.stdDev.toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "N/A"}
                              </td>
                              <td className="px-5 py-3">
                                <span className={colStats.nullCount > 0 ? "text-rose-650 font-bold" : "text-slate-400"}>
                                  {colStats.nullCount} ({((colStats.nullCount / dataset.rows.length) * 100).toFixed(0)}%)
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right font-mono text-slate-600">{colStats.distinctCount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Economic sector justification card */}
                {economicAnalysis && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Sustento del Sector y Carácter del Negocio</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {economicAnalysis.sectorJustification}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: 3. CORRELATION HEATMAP MATRIX */}
            {activeTab === "correlation" && (
              <div className="flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">Matriz de Correlación de Pearson</h3>
                  <p className="text-xs text-slate-500 mb-6 font-medium">
                    Muestra el grado de alineación matemática entre variables numéricas. Los valores oscilan de -1 a 1. 
                    Haz clic en cualquier celda para graficar su dispersión interactiva de puntos a la derecha.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Matrix Grid left side */}
                    <div className="lg:col-span-7 overflow-x-auto">
                      <table className="text-xs text-center border-collapse mx-auto">
                        <thead>
                          <tr>
                            <th className="p-2"></th>
                            {Object.keys(dataset.types)
                              .filter(c => dataset.types[c] === "numeric")
                              .map(v => (
                                <th key={v} className="p-2 font-mono text-[9px] h-16 whitespace-nowrap align-text-bottom truncate max-w-[80px] text-slate-500 font-bold" title={v}>
                                  {v.substring(0, 8)}..
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(dataset.types)
                            .filter(c => dataset.types[c] === "numeric")
                            .map(rowV => (
                              <tr key={rowV}>
                                <td className="p-2 text-right font-bold text-slate-600 font-mono text-[10px] truncate max-w-[110px]" title={rowV}>
                                  {rowV.substring(0, 10)}..
                                </td>
                                {Object.keys(dataset.types)
                                  .filter(c => dataset.types[c] === "numeric")
                                  .map(colV => {
                                    const r1 = dataset.rows.map(r => Number(r[rowV]));
                                    const r2 = dataset.rows.map(r => Number(r[colV]));
                                    const coeff = calculateCorrelation(r1, r2);
                                    
                                    // Generate nice red/indigo styling reflecting the theme spec
                                    let bgStyle = "";
                                    let textStyle = "text-slate-800";
                                    if (coeff === 1) {
                                      bgStyle = "bg-indigo-600 text-white border-indigo-700 font-bold";
                                      textStyle = "text-white";
                                    } else if (coeff > 0.6) {
                                      bgStyle = "bg-indigo-100 hover:bg-indigo-200 cursor-pointer border-indigo-200/50";
                                      textStyle = "text-indigo-900 font-bold";
                                    } else if (coeff > 0.2) {
                                      bgStyle = "bg-indigo-50/50 hover:bg-indigo-100 cursor-pointer border-indigo-100/30";
                                      textStyle = "text-indigo-700 font-medium";
                                    } else if (coeff < -0.6) {
                                      bgStyle = "bg-rose-100 hover:bg-rose-200 cursor-pointer border-rose-200/50";
                                      textStyle = "text-rose-900 font-bold";
                                    } else if (coeff < -0.2) {
                                      bgStyle = "bg-rose-50/50 hover:bg-rose-100 cursor-pointer border-rose-100/30";
                                      textStyle = "text-rose-700 font-medium";
                                    } else {
                                      bgStyle = "bg-slate-50 hover:bg-slate-100 border-slate-250 cursor-pointer";
                                      textStyle = "text-slate-400";
                                    }

                                    return (
                                      <td
                                        key={colV}
                                        onClick={() => {
                                          setScatterX(colV);
                                          setScatterY(rowV);
                                        }}
                                        className={`p-3 font-mono border text-[10px] w-14 font-semibold transition ${bgStyle} ${textStyle}`}
                                        title={`${rowV} vs ${colV}: ${coeff.toFixed(4)}`}
                                      >
                                        {coeff.toFixed(2)}
                                      </td>
                                    );
                                  })}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Scatter plot of active cell */}
                    <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">Bivariate Scatter Trend</h4>
                          <span className="text-[10px] text-slate-400 font-mono">Interactive Chart</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          Graficando eje X: <strong className="text-indigo-600 font-bold">{scatterX}</strong> contra eje Y: <strong className="text-slate-800 font-bold">{scatterY}</strong>. 
                          La cercanía de los puntos describe visualmente la correlación detectada.
                        </p>
                      </div>

                      {scatterX && scatterY ? (
                        <div className="h-64 w-full mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="x" 
                                type="number" 
                                name={scatterX}
                                tick={{ fill: '#475569', fontSize: 9 }}
                                label={{ value: scatterX, position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }} 
                              />
                              <YAxis 
                                dataKey="y" 
                                type="number" 
                                name={scatterY}
                                tick={{ fill: '#475569', fontSize: 9 }}
                                label={{ value: scatterY, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} 
                              />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                              <Scatter 
                                name="Registros" 
                                data={dataset.rows.map(r => ({ x: Number(r[scatterX]), y: Number(r[scatterY]) }))} 
                                fill="#4f46e5" 
                              />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-medium">
                          Haz clic en la matriz para ver la curva de tendencia
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. REGRESSION FORMULATION */}
            {activeTab === "regression" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Formulator Sidebar left */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl flex flex-col gap-6 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Estructura la Ecuación</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Elige qué variables numéricas intervienen en el modelo basal de regresión por mínimos cuadrados.
                    </p>
                  </div>

                  {/* Dependent Choice Target */}
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block mb-1.5 uppercase tracking-wider font-mono">
                      1. Variable Objetivo (Dependiente - Y)
                    </span>
                    <select
                      value={dependentVar}
                      onChange={(e) => {
                        const newY = e.target.value;
                        setDependentVar(newY);
                        // Prevent variable duplicating in Xs
                        setIndependentVars(prev => prev.filter(v => v !== newY));
                      }}
                      className="bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg p-2.5 w-full focus:border-indigo-505 focus:ring-0 shadow-3xs font-medium"
                    >
                      <option value="">Selecciona la Variable dependiente Y</option>
                      {Object.keys(dataset.types)
                        .filter(col => dataset.types[col] === "numeric")
                        .map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                    </select>

                    {/* Show quick AI recommended alternative options in badge */}
                    {economicAnalysis?.dependentOptions && (
                      <div className="mt-2.5">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider font-mono">Recomendaciones de Gemini:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {economicAnalysis.dependentOptions.map(opt => (
                            <button
                              key={opt.variable}
                              onClick={() => {
                                setDependentVar(opt.variable);
                                setIndependentVars(prev => 
                                  Object.keys(dataset.types).filter(c => dataset.types[c] === "numeric" && c !== opt.variable)
                                );
                              }}
                              className={`text-[9px] font-sans px-2 py-1 rounded transition border font-semibold ${
                                dependentVar === opt.variable 
                                  ? "bg-indigo-100 text-indigo-700 border-indigo-200" 
                                  : "bg-slate-100 text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-205"
                              }`}
                            >
                              {opt.variable} ({opt.viabilityScore}/10)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 70/30 Split Switch */}
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block mb-2 uppercase tracking-wide flex items-center justify-between font-mono">
                      2. Fraccionamiento de Base
                      <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] text-slate-500 font-mono font-bold">Train/Test</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-slate-55 p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setSplitRatio(0.7)}
                        className={`text-xs py-1.5 font-bold rounded-md transition border ${
                          splitRatio === 0.7 
                            ? "bg-white text-indigo-700 shadow-md border-indigo-200/50" 
                            : "text-slate-450 border-transparent hover:text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        70/30 Split (Estándar)
                      </button>
                      <button
                        onClick={() => setSplitRatio(0.8)}
                        className={`text-xs py-1.5 font-bold rounded-md transition border ${
                          splitRatio === 0.8 
                            ? "bg-white text-indigo-700 shadow-md border-indigo-200/50" 
                            : "text-slate-450 border-transparent hover:text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        80/20 Split (Estable)
                      </button>
                    </div>
                  </div>

                  {/* Independent Checkboxes choices (Xs) */}
                  <div className="flex-1 flex flex-col">
                    <span className="text-[10px] text-slate-455 font-bold block mb-2 uppercase tracking-wider font-mono">
                      3. Estímulos / Variables Explicativas (Xs)
                    </span>
                    
                    <div className="space-y-2 border border-slate-200 bg-slate-50/50 rounded-xl p-3 max-h-56 overflow-y-auto shadow-inner">
                      {Object.keys(dataset.types)
                        .filter(c => dataset.types[c] === "numeric" && c !== dependentVar)
                        .map(v => (
                          <label key={v} className="flex items-center gap-2 px-1 py-0.5 cursor-pointer text-slate-600 hover:text-slate-900 text-xs font-semibold">
                            <input
                              type="checkbox"
                              checked={independentVars.includes(v)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setIndependentVars(prev => [...prev, v]);
                                } else {
                                  setIndependentVars(prev => prev.filter(item => item !== v));
                                }
                              }}
                              className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 focus:ring-0 w-3.5 h-3.5 shadow-3xs cursor-pointer"
                            />
                            <span className="font-mono">{v}</span>
                          </label>
                        ))}
                    </div>

                    <div className="flex justify-between mt-2 text-[10px]">
                      <button
                        onClick={() => setIndependentVars(
                          Object.keys(dataset.types).filter(c => dataset.types[c] === "numeric" && c !== dependentVar)
                        )}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Seleccionar todos
                      </button>
                      <button
                        onClick={() => setIndependentVars([])}
                        className="text-slate-400 hover:text-slate-600 font-bold"
                      >
                        Desmarcar todos
                      </button>
                    </div>
                  </div>

                </div>

                {/* Regression Outputs Right */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {isRegressionLoading ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center shadow-sm">
                      <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Formulando regresión lineal por mínimos cuadrados OLS...</h4>
                        <p className="text-xs text-slate-500 mt-1">Calculando p-valores y llamando a Gemini para diagnóstico comercial.</p>
                      </div>
                    </div>
                  ) : regressionResult ? (
                    <div className="flex flex-col gap-6">
                      
                      {/* Live Equation display block - Premium Sleek Dark Container to balance the hierarchy */}
                      <div className="bg-slate-900 border border-slate-950 rounded-xl p-5 shadow-xl text-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none select-none">
                          <Database className="h-32 w-32 text-indigo-400" />
                        </div>
                        <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-widest font-mono">Ecuación Estimada</span>
                        <div className="mt-2 text-sm text-indigo-300 font-mono font-bold break-words select-all hover:bg-slate-800/40 p-2.5 rounded border border-slate-800/60 leading-relaxed">
                          {dependentVar} = {regressionResult.intercept.toFixed(4)}
                          {regressionResult.independentVars.map(v => {
                            const val = regressionResult.coefficients[v];
                            return ` ${val >= 0 ? "+" : "-"} ${Math.abs(val).toFixed(4)} * [${v}]`;
                          })}
                        </div>
                      </div>

                      {/* Summary fit parameters */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Ajuste de Precisión & Residuos</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-3xs">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">R² Estimado</span>
                            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{(regressionResult.r2 * 100).toFixed(2)}%</span>
                          </div>
                          
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-3xs">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">R² Ajustado</span>
                            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{(regressionResult.adjR2 * 100).toFixed(2)}%</span>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-3xs">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">MSE Error</span>
                            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
                              {regressionResult.mse.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-3xs">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono font-mono">RMSE Est.</span>
                            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
                              {regressionResult.rmse.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
                            </span>
                          </div>
                        </div>

                        {/* Overall hypothesis check parameters */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center text-xs font-medium text-slate-600 gap-2">
                          <div>
                            <span>F-Statistic Global:</span>
                            <span className="text-slate-900 ml-2 font-mono font-bold">{regressionResult.fStatistic.toFixed(3)}</span>
                          </div>
                          <div>
                            <span>Prob (F Significance):</span>
                            <span className={`ml-2 font-mono ${regressionResult.fProb < 0.05 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}`}>
                              {regressionResult.fProb < 0.001 ? "altamente sig. (<0.001)" : regressionResult.fProb.toFixed(5)}
                            </span>
                          </div>
                          <div>
                            <span>Subconjuntos (Train / Test):</span>
                            <span className="text-slate-800 ml-2 font-mono font-bold">{regressionResult.trainSize} / {regressionResult.testSize} obs.</span>
                          </div>
                        </div>
                      </div>

                      {/* Coeff t-significance grid */}
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Métricas Individuales de Variables</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse font-mono">
                            <thead>
                              <tr className="bg-slate-50/20 text-slate-450 uppercase text-[9px] tracking-widest border-b border-slate-200">
                                <th className="px-5 py-2.5">Variable</th>
                                <th className="px-5 py-2.5">Coeficiente (beta)</th>
                                <th className="px-5 py-2.5">Error Estándar</th>
                                <th className="px-5 py-2.5">Estadística t</th>
                                <th className="px-5 py-2.5">p-Valor (H0: beta=0)</th>
                                <th className="px-5 py-2.5 text-right font-bold">Significativo (alpha=5%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {/* Intercept Line */}
                              <tr className="hover:bg-slate-50 bg-slate-50/50">
                                <td className="px-5 py-3 font-semibold text-slate-800 font-sans">Intercepto basal</td>
                                <td className="px-5 py-3 text-slate-900 font-bold">{regressionResult.intercept.toFixed(4)}</td>
                                <td className="px-5 py-3 text-slate-505">{regressionResult.stdErrors["(Intercepto)"].toFixed(4)}</td>
                                <td className="px-5 py-3 text-slate-505">{regressionResult.tStats["(Intercepto)"].toFixed(3)}</td>
                                <td className="px-5 py-3 text-slate-700 font-semibold">{regressionResult.pValues["(Intercepto)"].toFixed(5)}</td>
                                <td className="px-5 py-3 text-right">
                                  {regressionResult.pValues["(Intercepto)"] < 0.05 ? (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-sans font-bold shadow-3xs">Signif.</span>
                                  ) : "No"}
                                </td>
                              </tr>
                              {/* Slopes */}
                              {regressionResult.independentVars.map(v => (
                                <tr key={v} className="hover:bg-slate-50">
                                  <td className="px-5 py-3 font-sans font-semibold text-slate-800">{v}</td>
                                  <td className={`px-5 py-3 font-bold ${regressionResult.coefficients[v] >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {regressionResult.coefficients[v].toFixed(4)}
                                  </td>
                                  <td className="px-5 py-3 text-slate-505">{regressionResult.stdErrors[v].toFixed(4)}</td>
                                  <td className="px-5 py-3 text-slate-505">{regressionResult.tStats[v].toFixed(3)}</td>
                                  <td className="px-5 py-3 font-bold text-slate-800">{regressionResult.pValues[v].toFixed(5)}</td>
                                  <td className="px-5 py-3 text-right font-sans">
                                    {regressionResult.pValues[v] < 0.05 ? (
                                      <span className="bg-emerald-50 text-emerald-800 border-emerald-150 border text-[10px] px-2 py-0.5 rounded font-sans font-bold shadow-3xs">Sí (p &lt; 0.05)</span>
                                    ) : (
                                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-400 font-bold">No (p &gt; 0.05)</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* AI Interpretative comments */}
                      {aiInterpretation && (
                        <div className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-xl shadow-xs">
                          <div className="flex items-center gap-2 text-indigo-700 mb-3">
                            <Sparkles className="h-4.5 w-4.5" />
                            <h4 className="text-xs font-bold uppercase tracking-widest font-mono">Diagnóstico de la Regresión (Ecuación y Métricas)</h4>
                          </div>
                          
                          <div className="text-xs space-y-4">
                            <div>
                              <span className="text-indigo-850 font-bold block mb-1 font-sans">Análisis de Robustez Balances:</span>
                              <p className="text-slate-650 leading-relaxed font-semibold">{aiInterpretation.modelValidationResult}</p>
                            </div>
                            <div>
                              <span className="text-indigo-850 font-bold block mb-1 font-sans">Veredicto del Modelo e Higiene Estadística:</span>
                              <p className="text-slate-650 leading-relaxed font-semibold">{aiInterpretation.bestModelVerdict}</p>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 p-10 text-center rounded-xl text-slate-400 flex flex-col justify-center items-center h-full shadow-sm">
                      <HelpCircle className="h-10 w-10 text-slate-300 mb-4 animate-bounce" />
                      <p className="text-xs font-medium">Selecciona al menos una variable independiente para calcular la ecuación multiple y sus diagnósticos correspondientes.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: 5. SIMULATION & PDF EXPORTERS */}
            {activeTab === "simulation" && (
              <div className="flex flex-col gap-6">
                
                {regressionResult ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Interactive Slider Simulator Box */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl flex flex-col gap-5 shadow-sm">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Simulación Interactiva</h3>
                        <p className="text-xs text-slate-500 font-semibold">
                          Ajusta los estímulos comerciales mediante los pasadores para predecir las ventas ($Y$).
                        </p>
                      </div>

                      {/* Giant Target Output box - Balanced dark premium aesthetic theme block */}
                      <div className="bg-slate-900 border border-slate-955 rounded-xl p-5 text-center shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none select-none">
                          <Database className="h-20 w-20 text-indigo-400" />
                        </div>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold block uppercase tracking-widest">Predicción de {dependentVar} ($Y$)</span>
                        <div className="text-3xl font-black text-indigo-300 mt-2 font-mono tracking-tight">
                          {getPredictedValue(simulatedInputs).toLocaleString("es-ES", { maximumFractionDigits: 1 })}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Calculado mediante Ordinary Least Squares</span>
                      </div>

                      {/* Independent Inputs Sliders list */}
                      <div className="space-y-4 divide-y divide-slate-100">
                        {independentVars.map(v => {
                          const stats = dataset.stats[v];
                          if (!stats) return null;
                          const currentVal = simulatedInputs[v] !== undefined ? simulatedInputs[v] : stats.avg;
                          
                          return (
                            <div key={v} className="pt-2">
                              <div className="flex justify-between items-center mb-1 text-xs">
                                <span className="font-bold text-slate-700 truncate pr-2 max-w-[200px]" title={v}>{v}</span>
                                <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-bold font-mono text-indigo-700 text-[11px] shadow-3xs">
                                  {currentVal.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={stats.min}
                                max={stats.max}
                                step={(stats.max - stats.min) / 100}
                                value={currentVal}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSimulatedInputs(prev => ({ ...prev, [v]: val }));
                                  setSelectedScenarioId(""); // override predefined scen
                                }}
                                className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-[9px] text-slate-400 font-medium mt-0.5 font-mono">
                                <span>Mín: {stats.min.toLocaleString("es-ES", { maximumFractionDigits: 0 })}</span>
                                <span>Prom: {stats.avg.toLocaleString("es-ES", { maximumFractionDigits: 0 })}</span>
                                <span>Máx: {stats.max.toLocaleString("es-ES", { maximumFractionDigits: 0 })}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>

                    {/* Simulation predictions graph and scenarios right */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                      
                      {/* PDF Report trigger card */}
                      <div className="bg-gradient-to-r from-indigo-50/80 via-indigo-50/20 to-white border border-indigo-200/50 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg border border-indigo-200 shadow-2xs">
                            <Download className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Descargar Informe Ejecutivo PDF Completo</h4>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5 text-balance">Genera un dossier corporativo listo para directiva y gerencia comercial.</p>
                          </div>
                        </div>

                        <button
                          onClick={triggerPdfDownload}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs whitespace-nowrap transition shadow-md shadow-indigo-100 flex items-center gap-2 transform active:scale-95"
                          id="btn-pdf-export"
                        >
                          Generar PDF en Español
                        </button>
                      </div>

                      {/* 5 business simulation predefined situations container */}
                      {scenarios.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">5 Escenarios de Negocio Sugeridos</h4>
                            <p className="text-[11px] text-slate-450 font-semibold">Generados por Gemini en base a las covarianzas operacionales encontradas. Selecciónalos para pre-cargar la simulación.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {scenarios.map((sc, i) => (
                              <button
                                key={sc.id}
                                onClick={() => loadScenarioInputs(sc)}
                                className={`p-3.5 rounded-xl border transition text-left h-full flex flex-col justify-between ${
                                  selectedScenarioId === sc.id
                                    ? "bg-indigo-50/70 border-indigo-300 text-indigo-800 shadow-xs"
                                    : "bg-slate-50/50 hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                <span className={`text-[9px] block font-bold font-mono ${selectedScenarioId === sc.id ? "text-indigo-500" : "text-slate-400"}`}>
                                  ESCENARIO {i + 1}
                                </span>
                                <h5 className="text-xs font-bold mt-1.5 leading-tight font-sans text-balance">{sc.name.replace(/esc escenario/, "")}</h5>
                              </button>
                            ))}
                          </div>

                          {/* Detail of selected predefined scenario */}
                          {selectedScenarioId && (
                            <div className="bg-indigo-50/30 border border-indigo-100 p-4 rounded-xl mt-1 text-xs">
                              {scenarios
                                .filter(s => s.id === selectedScenarioId)
                                .map(s => (
                                  <div key={s.id} className="space-y-2 text-slate-700">
                                    <div className="flex justify-between items-center bg-indigo-100/35 p-2 rounded border border-indigo-100/40">
                                      <span className="font-bold text-indigo-900 font-sans">Detalle escenario: "{s.name}"</span>
                                      <span className="text-[9px] text-indigo-600 font-mono font-bold uppercase tracking-wider">PRESELECCIONADO</span>
                                    </div>
                                    <p className="text-slate-650 leading-relaxed text-[11px] font-medium p-1">{s.description}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 font-sans">
                                      <div>
                                        <span className="text-slate-450 font-bold block uppercase tracking-wider text-[8px] font-mono">Foco Estratégico</span>
                                        <span className="text-indigo-700 font-semibold block mt-0.5 leading-relaxed text-[11px]">{s.strategicFocus}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-450 font-bold block uppercase tracking-wider text-[8px] font-mono">Lección de Negocio</span>
                                        <span className="text-slate-700 font-medium block mt-0.5 leading-relaxed text-[11px]">{s.businessLesson}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                        </div>
                      )}

                      {/* Prediction visual Comparison BarChart */}
                      {scenarios.length > 0 && (
                        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm text-slate-800 flex flex-col gap-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Análisis Comparativo Gráfico de Ventas Esperadas por Escenario</h4>
                          
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[
                                  ...scenarios.map((sc, index) => ({
                                    name: `Escenario ${index + 1}`,
                                    Pred: scenarioPredictions[sc.id] || 0
                                  })),
                                  {
                                    name: "Simulación Actual",
                                    Pred: getPredictedValue(simulatedInputs)
                                  }
                                ]}
                                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                              >
                                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="Pred" name={dependentVar} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Strategic recommend List */}
                      {aiInterpretation && (
                        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">Plan de Acción Estratégico Propuesto</h4>
                          <div className="space-y-3">
                            {aiInterpretation.strategicActionPlan.map((rec, idx) => (
                              <div key={idx} className="flex gap-3 text-xs items-start leading-relaxed text-slate-600 font-medium">
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0 font-mono text-[10px] shadow-3xs">
                                  {idx + 1}
                                </span>
                                <p className="mt-0.5">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 p-12 text-slate-400 text-center rounded-xl max-w-md mx-auto shadow-sm">
                    <Sliders className="h-10 w-10 text-slate-300 mx-auto mb-4 animate-bounce" />
                    <p className="text-xs font-semibold">
                      Para realizar simulaciones, primero debes cargar un conjunto de datos válido y especificar las variables de la regresión.
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* Corporate bottom credit line & Equation indicator styled precisely using Sleek interface */}
      <footer className="h-12 bg-white border-t border-slate-200 px-6 flex md:-mt-1 md:h-10 flex-col md:flex-row items-center justify-between text-[10px] text-slate-400 shrink-0 gap-1 shadow-inner py-1.5 font-sans font-medium">
        <div className="flex gap-4">
          <span>Status: <strong className="text-slate-600 font-semibold uppercase">Ready</strong></span>
          <span>Compute: <strong className="text-indigo-600 font-bold uppercase">Normal (24ms)</strong></span>
        </div>
        
        {regressionResult && (
          <div className="flex items-center gap-2 max-w-full overflow-hidden">
            <span>Model Matrix:</span>
            <span className="font-mono bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded italic text-slate-600 max-w-sm md:max-w-md truncate" title={`Y = ${regressionResult.intercept.toFixed(2)} + summary`}>
              Y = {regressionResult.intercept.toFixed(2)}
              {regressionResult.independentVars.slice(0, 3).map(v => ` + (${regressionResult.coefficients[v].toFixed(2)})${v}`)}
              {regressionResult.independentVars.length > 3 ? " + ..." : ""}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}
