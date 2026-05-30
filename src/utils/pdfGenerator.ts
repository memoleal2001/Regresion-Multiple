/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import { Dataset, EconomicAnalysis, RegressionResult, AIInterpretation, SimulatedScenario } from "../types";

export function generateExecutiveReport(
  dataset: Dataset,
  economicAnalysis: EconomicAnalysis | null,
  regressionResult: RegressionResult | null,
  aiInterpretation: AIInterpretation | null,
  scenarios: SimulatedScenario[],
  scenarioPredictions: Record<string, number>
) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageHeight = doc.internal.pageSize.height; // 297mm
  const pageWidth = doc.internal.pageSize.width; // 210mm
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin; // 170mm

  let currentPage = 1;
  const totalPages = 5;

  // Colors
  const primaryColor = { r: 30, g: 41, b: 59 }; // Slate-800
  const secondaryColor = { r: 71, g: 85, b: 105 }; // Slate-600
  const accentColor = { r: 14, g: 116, b: 144 }; // Cyan-700
  const lightBgColor = { r: 248, g: 250, b: 252 }; // Slate-50
  const borderColor = { r: 226, g: 232, b: 240 }; // Slate-200
  const textDark = { r: 15, g: 23, b: 42 }; // Slate-950

  // Helper: Draw header and footer
  const drawPageShell = (pageNum: number, titleText: string) => {
    // Header line
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.5);
    doc.line(margin, 20, pageWidth - margin, 20);

    // Header text
    doc.setFont("Helvetica", "light");
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    doc.text("INFORME EJECUTIVO - PLATAFORMA DE REGRESIÓN", margin, 15);
    doc.text(economicAnalysis?.economicSector?.toUpperCase() || "ANÁLISIS COMERCIAL", pageWidth - margin, 15, { align: "right" });

    // Footer line
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    // Footer text
    doc.text(
      `Generado el ${new Date().toLocaleDateString("es-ES")} | Analizador de Regresión Comercial`,
      margin,
      pageHeight - 15
    );
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 15, { align: "right" });
  };

  // Helper: Text wrapper with auto y-offset calculation
  const addParagraph = (text: string, x: number, y: number, maxLength: number, size = 10, align: "left" | "right" | "justify" = "justify"): number => {
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(textDark.r, textDark.g, textDark.b);
    const splitText = doc.splitTextToSize(text, maxLength);
    doc.text(splitText, x, y, { align: align === "justify" ? "left" : align });
    return y + splitText.length * (size * 0.45 + 1.2);
  };

  // --- STAGE 1: PORTADA ---
  // Top Banner
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(margin, 25, contentWidth, 55, "F");

  // Title Box
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INFORME EJECUTIVO ANALÍTICO", margin + 10, 42);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Modelo de Regresión Múltiple & Simulación de Escenarios", margin + 10, 52);
  doc.setFont("Helvetica", "oblique");
  doc.setFontSize(9);
  doc.text(`Carga de archivo: "${dataset.name}" (${dataset.rows.length} registros analizados)`, margin + 10, 62);

  // Sector Económico card
  let curY = 95;
  doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.rect(margin, curY, contentWidth, 38, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text("1. SECTOR ECONÓMICO DETECTADO", margin + 8, curY + 8);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(economicAnalysis?.economicSector || "Sector Comercial Genérico", margin + 8, curY + 16);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textDark.r, textDark.g, textDark.b);
  const sectorContext = economicAnalysis?.sectorJustification || 
    "No se ha configurado una interpretación automatizada. El modelo analiza el vector de ventas del negocio mediante Ordinary Least Squares.";
  addParagraph(sectorContext, margin + 8, curY + 22, contentWidth - 16, 9.5);

  // Business context narratives
  curY = 145;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("CONTEXTUALIZACIÓN COMERCIAL Y AMBIENTE DE NEGOCIO", margin, curY);

  curY += 8;
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(1);
  doc.line(margin, curY, margin + 30, curY);

  curY += 10;
  const genInterpretation = economicAnalysis?.generalInterpretation ||
    "La base de datos describe indicadores del sector con múltiples variables concurrentes. Se busca establecer cómo las decisiones tácticas (como inversión en precio o posicionamiento de marca) alteran de manera sinérgica la variable de resultado comercial seleccionada.";
  curY = addParagraph(genInterpretation, margin, curY, contentWidth, 10);

  // Quick stats bullet card
  curY += 10;
  doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.rect(margin, curY, contentWidth, 42, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  doc.text("RESUMEN DE ESTRUCTURA DEL DATASET", margin + 8, curY + 8);

  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.line(margin + 8, curY + 11, margin + 150, curY + 11);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(textDark.r, textDark.g, textDark.b);
  doc.text(`• Total de observaciones cargadas: ${dataset.rows.length}`, margin + 10, curY + 18);
  doc.text(`• Total de dimensiones detectadas: ${dataset.headers.length} variables`, margin + 10, curY + 24);
  const numericCount = Object.values(dataset.types).filter(t => t === "numeric").length;
  doc.text(`• Variables cuantitativas estimadas: ${numericCount} (ideales para modelado regression)`, margin + 10, curY + 30);
  doc.text(`• Variables cualitativas/conceptuales: ${dataset.headers.length - numericCount}`, margin + 10, curY + 36);

  drawPageShell(1, "PORTADA Y CONTEXTO");

  // --- STAGE 2: DESCRIPTIVE STATS ---
  doc.addPage();
  currentPage = 2;
  drawPageShell(currentPage, "ANÁLISIS DESCRIPTIVO");

  curY = 30;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("2. ANÁLISIS DESCRIPTIVO DE LAS MÁS RELEVANTES VARIABLES", margin, curY);

  curY += 8;
  const descriptiveContextText = "El análisis descriptivo permite evaluar la variabilidad, rango de acción y estabilidad estadística de las variables numéricas cargadas. Esto define los límites operacionales para las simulaciones y ayuda a validar que no existan inconsistencias antes de formular la regresión.";
  curY = addParagraph(descriptiveContextText, margin, curY, contentWidth, 9.5);

  // Create clean grid of statistics
  curY += 5;
  // Header Table
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(margin, curY, contentWidth, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Variable", margin + 4, curY + 6);
  doc.text("Muestras", margin + 42, curY + 6);
  doc.text("Mínimo", margin + 64, curY + 6);
  doc.text("Máximo", margin + 88, curY + 6);
  doc.text("Promedio", margin + 114, curY + 6);
  doc.text("Desv. Estándar", margin + 142, curY + 6);

  curY += 8;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textDark.r, textDark.g, textDark.b);

  const numericVars = Object.keys(dataset.types).filter((h) => dataset.types[h] === "numeric");
  numericVars.slice(0, 12).forEach((v, idx) => {
    const statItem = dataset.stats[v];
    if (statItem) {
      if (idx % 2 === 1) {
        doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
        doc.rect(margin, curY, contentWidth, 7, "F");
      }
      doc.setTextColor(textDark.r, textDark.g, textDark.b);
      doc.text(v.substring(0, 20), margin + 4, curY + 5);
      doc.text(String(dataset.rows.length - statItem.nullCount), margin + 42, curY + 5);
      doc.text(statItem.min.toLocaleString("es-ES", { maximumFractionDigits: 1 }), margin + 64, curY + 5);
      doc.text(statItem.max.toLocaleString("es-ES", { maximumFractionDigits: 1 }), margin + 88, curY + 5);
      doc.text(statItem.avg.toLocaleString("es-ES", { maximumFractionDigits: 1 }), margin + 114, curY + 5);
      doc.text(statItem.stdDev.toLocaleString("es-ES", { maximumFractionDigits: 1 }), margin + 142, curY + 5);
      curY += 7;
    }
  });

  // Dependent Options Diagnostics
  curY += 12;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("OPCIONES Y VALIDACIÓN DE VARIABLES DEPENDIENTES (Y)", margin, curY);

  curY += 6;
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.8);
  doc.line(margin, curY, margin + 40, curY);

  curY += 10;
  if (economicAnalysis?.dependentOptions && economicAnalysis.dependentOptions.length > 0) {
    economicAnalysis.dependentOptions.forEach((opt) => {
      doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.rect(margin, curY, contentWidth, 18, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      doc.text(`${opt.variable} — Metodo: ${opt.metricType} (Viabilidad: ${opt.viabilityScore}/10)`, margin + 6, curY + 5);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(textDark.r, textDark.g, textDark.b);
      addParagraph(opt.justification, margin + 6, curY + 10, contentWidth - 12, 8.5);

      curY += 22;
    });
  } else {
    const mockOpt = {
      variable: regressionResult?.dependentVar || "Variable Comercial",
      metricType: "Ventas / Demanda",
      justification: "Representa el volumen cuantitativo de transacciones logradas por periodo comercial. Es la meta clave del negocio.",
      viabilityScore: 9
    };
    doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
    doc.rect(margin, curY, contentWidth, 18, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${mockOpt.variable} — Viabilidad: ${mockOpt.viabilityScore}/10`, margin + 6, curY + 5);
    addParagraph(mockOpt.justification, margin + 6, curY + 10, contentWidth - 12, 8.5);
    curY += 22;
  }

  // --- STAGE 3: REGRESSION RESULTS ---
  doc.addPage();
  currentPage = 3;
  drawPageShell(currentPage, "MODELO DE REGRESIÓN MÚLTIPLE");

  curY = 30;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("3. ESPECIFICACIÓN DEL MODELO DE REGRESIÓN MÚLTIPLE OLS", margin, curY);

  curY += 6;
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.line(margin, curY, margin + 50, curY);

  curY += 10;
  if (regressionResult) {
    // Equation display
    doc.setFillColor(30, 41, 59); // Dark blue banner for regression formula
    doc.rect(margin, curY, contentWidth, 22, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FÓRMULA ESTIMADA DE NEGOCIO:", margin + 8, curY + 6);

    doc.setFont("Courier", "bold");
    doc.setFontSize(8.5);
    
    let expr = `${regressionResult.dependentVar} = ${regressionResult.intercept.toFixed(2)}`;
    regressionResult.independentVars.forEach((v) => {
      const coeff = regressionResult.coefficients[v];
      const sign = coeff >= 0 ? "+" : "-";
      expr += ` ${sign} ${Math.abs(coeff).toFixed(2)} * [${v}]`;
    });
    // Break formula if too long
    const splitExpr = doc.splitTextToSize(expr, contentWidth - 16);
    doc.text(splitExpr, margin + 8, curY + 13);

    // Summary block table
    curY += 28;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("MÉTRICAS COMPARATIVAS DEL AJUSTE", margin, curY);

    curY += 6;
    doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.rect(margin, curY, contentWidth, 34, "FD");

    doc.setTextColor(textDark.r, textDark.g, textDark.b);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Coeficiente de Determinación R²:", margin + 6, curY + 6);
    doc.text("R² Ajustado (Penalizado):", margin + 6, curY + 13);
    doc.text("Error Cuadrático Medio (MSE):", margin + 6, curY + 20);
    doc.text("Raíz del MSE (RMSE):", margin + 6, curY + 27);

    // Values right column
    doc.setFont("Helvetica", "normal");
    doc.text(`${(regressionResult.r2 * 100).toFixed(2)}%`, margin + 64, curY + 6);
    doc.text(`${(regressionResult.adjR2 * 100).toFixed(2)}%`, margin + 64, curY + 13);
    doc.text(regressionResult.mse.toLocaleString("es-ES", { maximumFractionDigits: 1 }), margin + 64, curY + 20);
    doc.text(regressionResult.rmse.toLocaleString("es-ES", { maximumFractionDigits: 1 }), margin + 64, curY + 27);

    // Significance right column
    doc.setFont("Helvetica", "bold");
    doc.text("F-Statistic (Estadística de Significación):", margin + 90, curY + 6);
    doc.text("Probabilidad (p-valor de F):", margin + 90, curY + 13);
    doc.text("División Muestral (Train/Test):", margin + 90, curY + 20);
    doc.text("Registros de Entrenamiento:", margin + 90, curY + 27);

    doc.setFont("Helvetica", "normal");
    doc.text(regressionResult.fStatistic.toFixed(2), margin + 152, curY + 6);
    doc.text(regressionResult.fProb < 0.001 ? "< 0.001 (Altamente Significativo)" : regressionResult.fProb.toFixed(4), margin + 152, curY + 13);
    doc.text(regressionResult.splitRatio, margin + 152, curY + 20);
    doc.text(regressionResult.trainSize.toString(), margin + 152, curY + 27);

    // Coefficients Table
    curY += 42;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("SIGNIFICANCIA GRUESA INDIVIDUAL DE VARIABLES (T-TEST)", margin, curY);

    curY += 5;
    doc.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    doc.rect(margin, curY, contentWidth, 8, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.text("Variable Independiente", margin + 4, curY + 6);
    doc.text("Coeficiente (beta)", margin + 46, curY + 6);
    doc.text("Error Est.", margin + 82, curY + 6);
    doc.text("t-Stat", margin + 104, curY + 6);
    doc.text("p-Value", margin + 126, curY + 6);
    doc.text("Significativo", margin + 148, curY + 6);

    curY += 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    
    // Intercept line
    doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
    doc.rect(margin, curY, contentWidth, 7, "F");
    doc.setTextColor(textDark.r, textDark.g, textDark.b);
    doc.text("(Intercepto)", margin + 4, curY + 5);
    doc.text(regressionResult.intercept.toFixed(2), margin + 46, curY + 5);
    doc.text(regressionResult.stdErrors["(Intercepto)"].toFixed(2), margin + 82, curY + 5);
    doc.text(regressionResult.tStats["(Intercepto)"].toFixed(2), margin + 104, curY + 5);
    doc.text(regressionResult.pValues["(Intercepto)"].toFixed(4), margin + 126, curY + 5);
    doc.text(regressionResult.pValues["(Intercepto)"] < 0.05 ? "Sí" : "No", margin + 148, curY + 5);
    curY += 7;

    regressionResult.independentVars.forEach((v, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
      }
      doc.rect(margin, curY, contentWidth, 7, "F");

      doc.setTextColor(textDark.r, textDark.g, textDark.b);
      doc.text(v.substring(0, 22), margin + 4, curY + 5);
      doc.text(regressionResult.coefficients[v].toFixed(2), margin + 46, curY + 5);
      doc.text(regressionResult.stdErrors[v].toFixed(2), margin + 82, curY + 5);
      doc.text(regressionResult.tStats[v].toFixed(2), margin + 104, curY + 5);
      doc.text(regressionResult.pValues[v].toFixed(4), margin + 126, curY + 5);
      doc.text(regressionResult.pValues[v] < 0.05 ? "Sí (p < 0.05)" : "No (No Signif.)", margin + 148, curY + 5);
      curY += 7;
    });

    // Business Interpretation from AI
    curY += 10;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text("DIAGNÓSTICO E INTERPRETACIÓN DE LA ECUACIÓN DE NEGOCIOS", margin, curY);

    curY += 6;
    const modelInterpretationText = aiInterpretation?.equationBusinessInterpretation ||
      "La ecuación resultante cuantifica la elasticidad o peso específico de cada factor. El intercepto representa las ventas basales si los estímulos de inversión o precio se redujeran a cero. Un coeficiente positivo indica que incrementar esa variable produce un aumento proporcional directo en los resultados.";
    curY = addParagraph(modelInterpretationText, margin, curY, contentWidth, 9);
  } else {
    doc.setFont("Helvetica", "normal");
    doc.text("No se ha calculado un modelo de regresión. Selecciona variables para obtener resultados.", margin, curY);
  }

  // --- STAGE 4: SCENARIOS ---
  doc.addPage();
  currentPage = 4;
  drawPageShell(currentPage, "ESCENARIOS DE SIMULACIÓN");

  curY = 30;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("4. ESCENARIOS DE SIMULACIÓN COMERCIAL AJUSTADOS", margin, curY);

  curY += 8;
  const scenarioExpl = "A continuación se presentan 5 escenarios clave diseñados con parámetros controlados dentro de las tolerancias matemáticas observables. Permiten guiar la toma de decisiones simulando estados extremos y balanceados del mercado.";
  curY = addParagraph(scenarioExpl, margin, curY, contentWidth, 9.5);

  curY += 4;
  if (scenarios && scenarios.length > 0) {
    scenarios.forEach((sc, idx) => {
      doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.rect(margin, curY, contentWidth, 31, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      doc.text(`${idx + 1}. ESCENARIO: ${sc.name.toUpperCase()}`, margin + 5, curY + 6);

      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
      doc.text(`Enfoque táctico: ${sc.strategicFocus}`, margin + 5, curY + 11);

      // Prediction
      const pred = scenarioPredictions[sc.id];
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text(
        `PRED. ESPERADA: ${pred ? pred.toLocaleString("es-ES", { maximumFractionDigits: 1 }) : "N/A"}`,
        margin + 106,
        curY + 6,
        { align: "left" }
      );

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(textDark.r, textDark.g, textDark.b);
      addParagraph(`${sc.description} Coeficientes ajustados. Lección clave: ${sc.businessLesson}`, margin + 5, curY + 16, contentWidth - 10, 8.5);

      curY += 36;
    });
  } else {
    doc.setFont("Helvetica", "normal");
    doc.text("No se han generado escenarios de simulación.", margin, curY);
  }

  // --- STAGE 5: RECOMMENDATIONS ---
  doc.addPage();
  currentPage = 5;
  drawPageShell(currentPage, "RECOMENDACIONES ESTRATÉGICAS");

  curY = 30;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("5. PLAN DE ACCIÓN RECOMENDADO Y PRUEBAS ADICIONALES", margin, curY);

  curY += 6;
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.line(margin, curY, margin + 40, curY);

  curY += 12;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("ACCIONES ESTRATÉGICAS SUGERIDAS POR INTELIGENCIA ARTIFICIAL", margin, curY);

  curY += 8;
  if (aiInterpretation?.strategicActionPlan && aiInterpretation.strategicActionPlan.length > 0) {
    aiInterpretation.strategicActionPlan.forEach((rec, idx) => {
      // Draw small bullet bullet point
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.rect(margin + 2, curY + 1.2, 2.5, 2.5, "F");

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(textDark.r, textDark.g, textDark.b);
      curY = addParagraph(rec, margin + 8, curY + 3.5, contentWidth - 10, 9.5);
      curY += 6;
    });
  } else {
    const fallbackRecs = [
      "Concentrar inversión en los factores identificados con coeficientes de alta magnitud positiva y significancia robusta (p < 0.05).",
      "Redefinir la estrategia de precios si se percibe elasticidad negativa significativa, buscando optimizar precios mediante promociones escalonadas.",
      "Descartar gradualmente las variables que mostraron anomalías estadísticas en los t-tests para simplificar y clarificar el modelo de regresión.",
      "Simular de forma quincenal con nuevos datos del periodo para re-calibrar los coeficientes en base a cambios macroeconómicos."
    ];
    fallbackRecs.forEach((rec) => {
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.rect(margin + 2, curY + 1.2, 2.5, 2.5, "F");
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      curY = addParagraph(rec, margin + 8, curY + 3.5, contentWidth - 10, 9.5);
      curY += 6;
    });
  }

  // Model Verdict Section
  curY += 6;
  doc.setFillColor(lightBgColor.r, lightBgColor.g, lightBgColor.b);
  doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
  doc.rect(margin, curY, contentWidth, 32, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("VEREDICTO ESTADÍSTICO & MEJOR MODELO", margin + 6, curY + 7);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textDark.r, textDark.g, textDark.b);
  const verdictText = aiInterpretation?.bestModelVerdict ||
    "Basado en un R² Ajustado consolidado, el modelo actual es robusto para proyecciones de mediano plazo. Se recomienda verificar collinearidad por factores de inflación de varianza (VIF) si se añaden variables altamente correlacionadas.";
  addParagraph(verdictText, margin + 6, curY + 13, contentWidth - 12, 9);

  // Corporate signature area at the very bottom
  curY = pageHeight - 65;
  doc.setDrawColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  doc.setLineWidth(0.5);
  doc.line(margin + 15, curY, margin + 65, curY);
  doc.line(pageWidth - margin - 65, curY, pageWidth - margin - 15, curY);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  doc.text("LIDER DE ANALÍTICA", margin + 40, curY + 5, { align: "center" });
  doc.text("DIPLOMADO EJECUTIVO", pageWidth - margin - 40, curY + 5, { align: "center" });

  doc.setFont("Helvetica", "light");
  doc.setFontSize(7.5);
  doc.text("Firma de Validación de Datos", margin + 40, curY + 9, { align: "center" });
  doc.text("Aprobación Corporativa de Plan", pageWidth - margin - 40, curY + 9, { align: "center" });

  // Save the PDF doc
  doc.save(`Informe_Ejecutivo_Regresion_${economicAnalysis?.economicSector ? economicAnalysis.economicSector.replace(/\s+/g, "_") : "Comercial"}.pdf`);
}
