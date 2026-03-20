
import { Dataset, DataType, DataPoint, GroupedContinuousDataPoint, GroupedDiscreteDataPoint, BivariateDataPoint, UngroupedDataPoint, SolverResult, CalculationStep, BivariateSolverResult } from '../types';

// ==========================================
// HELPERS
// ==========================================

const getX = (d: DataPoint): number => {
  if ('midpoint' in d) return d.midpoint;
  return (d as any).x;
};

const getF = (d: DataPoint): number => {
  if ('f' in d) return (d as any).f;
  return 1;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const getFrequencyData = (dataset: Dataset): { x: number, f: number }[] => {
  if (dataset.type === DataType.UNGROUPED) {
    const raw = dataset.data as UngroupedDataPoint[];
    const aggregated = raw.reduce((acc: Record<number, number>, curr) => {
      acc[curr.x] = (acc[curr.x] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(aggregated).map(Number).sort((a, b) => a - b).map(x => ({ x, f: aggregated[x] }));
  }
  if (dataset.type === DataType.GROUPED_DISCRETE) {
    return (dataset.data as GroupedDiscreteDataPoint[]).sort((a, b) => a.x - b.x);
  }
  return (dataset.data as GroupedContinuousDataPoint[]).sort((a, b) => a.lower - b.lower).map(d => ({ x: d.midpoint, f: d.f }));
};

// ==========================================
// CENTRAL TENDENCY
// ==========================================

export const calculateMean = (dataset: Dataset): SolverResult => {
  let value = 0;
  let formula = '';
  let variables = '';
  let substitution = '';
  let steps: CalculationStep[] = [];
  let originExplanations: string[] = [];
  const data = dataset.data as DataPoint[];
  const N = dataset.totalFrequency || data.length;

  if (dataset.type === DataType.UNGROUPED) {
    const rawData = (data as UngroupedDataPoint[]).map(d => d.x);
    const sumX = sum(rawData);
    value = sumX / N;
    
    formula = String.raw`\bar{x} = \frac{\sum x}{n}`;
    variables = String.raw`\sum x = ${sumX}, n = ${N}`;
    substitution = String.raw`\bar{x} = \frac{${sumX}}{${N}}`;
    
    // Rule 2: Expanded Summations for small datasets
    if (rawData.length <= 8) {
        originExplanations.push(`Data Set: [${rawData.join(', ')}]`);
        originExplanations.push(`Summation (Σx): (${rawData.join(' + ')}) = ${sumX}`);
    } else {
        originExplanations.push(`Summation (Σx): Sum of all ${N} data points = ${sumX}`);
    }

    steps = [
      { latex: String.raw`\frac{${sumX}}{${N}}`, annotation: "Substitute Σx and n" },
      { latex: String.raw`= ${value.toFixed(4)}`, annotation: "Divide sum by count" }
    ];

  } else {
    const sumFX = data.reduce((acc, d) => acc + getX(d) * getF(d), 0);
    value = sumFX / N;
    
    formula = String.raw`\bar{x} = \frac{\sum fx}{\sum f}`;
    variables = String.raw`\sum fx = ${sumFX.toFixed(2)}, \sum f (N) = ${N}`;
    substitution = String.raw`\bar{x} = \frac{${sumFX.toFixed(2)}}{${N}}`;
    
    originExplanations.push(`Total Frequency (N): Sum of all frequencies = ${N}`);
    originExplanations.push(`Sum of Products (Σfx): Sum of (value × frequency) column = ${sumFX.toFixed(2)}`);

    steps = [
        { latex: String.raw`\frac{${sumFX.toFixed(2)}}{${N}}`, annotation: "Substitute Σfx and N" },
        { latex: String.raw`= ${value.toFixed(4)}`, annotation: "Divide product sum by total frequency" }
    ];
  }

  return { value, formula, variables, substitution, steps, originExplanations };
};

export const calculateMedian = (dataset: Dataset): SolverResult => {
  let value = 0;
  let formula = '';
  let variables = '';
  let substitution = '';
  let steps: CalculationStep[] = [];
  let originExplanations: string[] = [];
  const freqData = getFrequencyData(dataset);
  const N = dataset.totalFrequency || freqData.reduce((acc, d) => acc + d.f, 0);

  if (dataset.type === DataType.GROUPED_CONTINUOUS) {
    let cf = 0;
    let prevCf = 0;
    const target = N / 2;
    const data = dataset.data as GroupedContinuousDataPoint[];
    for (const d of data) {
      prevCf = cf;
      cf += d.f;
      if (cf >= target) {
        const L = d.lower;
        const h = d.upper - d.lower;
        const f = d.f;
        value = L + ((target - prevCf) / f) * h;
        
        formula = String.raw`\text{Median} = L + \left[\frac{\frac{N}{2} - CF_b}{f_m}\right] \times h`;
        variables = String.raw`L=${L}, N=${N}, CF_b=${prevCf}, f_m=${f}, h=${h}`;
        substitution = String.raw`${L} + \left[\frac{\frac{${N}}{2} - ${prevCf}}{${f}}\right] \times ${h}`;
        
        // Rule 1: Origin Explanations
        originExplanations = [
            `Total Frequency (N) = ${N}`,
            `Median Location (N/2) = ${target}`,
            `Looking at the Cumulative Frequency (CF) column, the first value ≥ ${target} is ${cf}.`,
            `Therefore, the Median Class is ${d.lower}-${d.upper}.`,
            `This gives us L = ${L}, f = ${f}, CF (previous) = ${prevCf}, and h = ${h}.`
        ];

        // Rule 3: Annotated Arithmetic
        const step1_N2 = target;
        const step2_num = step1_N2 - prevCf;
        const step3_frac = step2_num / f;
        const step4_mult = step3_frac * h;

        steps = [
            { latex: String.raw`\frac{${N}}{2} = ${step1_N2}`, annotation: "Calculate N/2" },
            { latex: String.raw`${L} + \left[\frac{${step1_N2} - ${prevCf}}{${f}}\right] \times ${h}`, annotation: "Substitute variables" },
            { latex: String.raw`${L} + \left[\frac{${step2_num.toFixed(4)}}{${f}}\right] \times ${h}`, annotation: "Subtract numerator (N/2 - CF)" },
            { latex: String.raw`${L} + (${step3_frac.toFixed(4)}) \times ${h}`, annotation: "Divide by frequency f (4dp)" },
            { latex: String.raw`${L} + ${step4_mult.toFixed(4)}`, annotation: "Multiply by class width h" },
            { latex: String.raw`= ${(L + step4_mult).toFixed(4)}`, annotation: "Final Addition" }
        ];
        break;
      }
    }
  } else {
    // Ungrouped / Discrete
    const isOdd = N % 2 !== 0;
    let cf = 0;
    if (isOdd) {
      const targetPos = (N + 1) / 2;
      for (const d of freqData) {
        cf += d.f;
        if (cf >= targetPos) {
          value = d.x;
          break;
        }
      }
      formula = String.raw`\text{Median} = \left(\frac{N+1}{2}\right)^{th} \text{ observation}`;
      variables = String.raw`N = ${N} \text{ (Odd)}, \text{Target Pos} = ${targetPos}`;
      substitution = String.raw`\text{Value at position } ${targetPos}`;
      
      originExplanations = [
          `Total Frequency (N) = ${N}. Since N is Odd, we use (N+1)/2.`,
          `Target Rank = (${N}+1)/2 = ${targetPos}th item.`,
          `Scanning Cumulative Frequencies: First CF ≥ ${targetPos} is ${cf}.`,
          `The X value corresponding to this position is ${value}.`
      ];

      steps = [
          { latex: String.raw`\frac{${N}+1}{2} = ${targetPos}`, annotation: "Calculate rank" },
          { latex: String.raw`\text{Locate } ${targetPos}^{th} \text{ item in CF column}`, annotation: "Table Lookup" },
          { latex: String.raw`= ${value}`, annotation: "Identify Data Point" }
      ];
    } else {
      const pos1 = N / 2;
      const pos2 = pos1 + 1;
      let val1 = 0, val2 = 0, cfTemp = 0;
      for (const d of freqData) {
        cfTemp += d.f;
        if (val1 === 0 && cfTemp >= pos1) val1 = d.x;
        if (val2 === 0 && cfTemp >= pos2) val2 = d.x;
        if (val1 !== 0 && val2 !== 0) break;
      }
      value = (val1 + val2) / 2;
      formula = String.raw`\text{Median} = \frac{(\frac{N}{2})^{th} + (\frac{N}{2}+1)^{th}}{2}`;
      variables = String.raw`N = ${N} \text{ (Even)}, \text{Pos}_1 = ${pos1}, \text{Pos}_2 = ${pos2}`;
      substitution = String.raw`\frac{${val1} + ${val2}}{2}`;

      originExplanations = [
        `Total Frequency (N) = ${N}. Since N is Even, we average the (N/2)th and (N/2 + 1)th items.`,
        `Position 1 = ${N}/2 = ${pos1}. Value found at CF ≥ ${pos1} is ${val1}.`,
        `Position 2 = ${pos1} + 1 = ${pos2}. Value found at CF ≥ ${pos2} is ${val2}.`
      ];

      steps = [
          { latex: String.raw`\frac{${val1} + ${val2}}{2}`, annotation: "Average the two middle values" },
          { latex: String.raw`= ${value.toFixed(4)}`, annotation: "Final Result" }
      ];
    }
  }
  return { value, formula, variables, substitution, steps, originExplanations };
};

export const calculateMode = (dataset: Dataset): SolverResult => {
  let value: number | string = 0;
  let formula = '';
  let variables = '';
  let substitution = '';
  let steps: CalculationStep[] = [];
  let originExplanations: string[] = [];

  if (dataset.type === DataType.GROUPED_CONTINUOUS) {
    const data = dataset.data as GroupedContinuousDataPoint[];
    let maxF = -1, modalIndex = -1;
    data.forEach((d, i) => { if (d.f > maxF) { maxF = d.f; modalIndex = i; } });
    if (modalIndex !== -1) {
      const modalClass = data[modalIndex], L = modalClass.lower, h = modalClass.upper - modalClass.lower, f1 = modalClass.f;
      const f0 = modalIndex > 0 ? data[modalIndex - 1].f : 0, f2 = modalIndex < data.length - 1 ? data[modalIndex + 1].f : 0;
      value = L + ((f1 - f0) / (2 * f1 - f0 - f2)) * h;

      const num = f1 - f0;
      const denom1 = 2 * f1;
      const denom2 = denom1 - f0 - f2;
      const frac = num / denom2;
      const mult = frac * h;

      formula = String.raw`\text{Mode} = L + \left[\frac{f_1 - f_0}{2f_1 - f_0 - f_2}\right] \times h`;
      variables = String.raw`L=${L}, f_1=${f1}, f_0=${f0}, f_2=${f2}, h=${h}`;
      substitution = String.raw`${L} + \left[\frac{${f1} - ${f0}}{2(${f1}) - ${f0} - ${f2}}\right] \times ${h}`;
      
      originExplanations = [
          `Highest Frequency in column f is ${maxF}.`,
          `This corresponds to the Modal Class: ${modalClass.lower}-${modalClass.upper}.`,
          `Parameters identified:`,
          `• Lower Limit (L) = ${L}`,
          `• Modal Frequency (f1) = ${f1}`,
          `• Pre-modal Frequency (f0) = ${f0}`,
          `• Post-modal Frequency (f2) = ${f2}`,
          `• Class Width (h) = ${h}`
      ];

      steps = [
        { latex: String.raw`${f1} - ${f0} = ${num}`, annotation: "Calculate Numerator (f1 - f0)" },
        { latex: String.raw`2(${f1}) - ${f0} - ${f2} = ${denom2}`, annotation: "Calculate Denominator (2f1 - f0 - f2)" },
        { latex: String.raw`${L} + \left[\frac{${num}}{${denom2}}\right] \times ${h}`, annotation: "Substitute simplified parts" },
        { latex: String.raw`\frac{${num}}{${denom2}} = ${frac.toFixed(4)}`, annotation: "Divide fraction (4dp)" },
        { latex: String.raw`${frac.toFixed(4)} \times ${h} = ${mult.toFixed(4)}`, annotation: "Multiply by width h" },
        { latex: String.raw`${L} + ${mult.toFixed(4)} = ${(L + mult).toFixed(4)}`, annotation: "Add to Lower Limit L" }
      ];
    }
  } else {
    const freqMap: Record<number, number> = {}, freqData = getFrequencyData(dataset);
    freqData.forEach(d => freqMap[d.x] = d.f);
    let maxFreq = 0, modes: number[] = [];
    for (const x in freqMap) {
      if (freqMap[x] > maxFreq) { maxFreq = freqMap[x]; modes = [parseFloat(x)]; }
      else if (freqMap[x] === maxFreq) modes.push(parseFloat(x));
    }
    value = modes.length > 1 ? modes.join(', ') : modes[0] || "No Mode";
    formula = String.raw`\text{Mode} = \text{Value(s) with Highest Frequency}`;
    variables = String.raw`Max Frequency = ${maxFreq}`;
    substitution = String.raw`\text{Identify value appearing }{${maxFreq}}\text{ times}`;
    
    originExplanations = [
        `Scan 'Frequency' column.`,
        `The maximum frequency value found is ${maxFreq}.`,
        `The X value(s) associated with this frequency are selected.`
    ];

    steps = [
        { latex: String.raw`\text{Max Frequency} = ${maxFreq}`, annotation: "Identify Max" },
        { latex: String.raw`\text{Corresponding X} = ${value}`, annotation: "Map to Data Point" }
    ];
  }
  return { value, formula, variables, substitution, steps, originExplanations };
};

export const calculateDispersion = (dataset: Dataset): {
    range: number; rangeFormula: string; rangeSub: string; rangeSteps: CalculationStep[]; rangeOrigin?: string[];
    meanDeviation: number; mdFormula: string; mdVars: string; mdSub: string; mdSteps: CalculationStep[]; mdOrigin?: string[];
    variance: number; varFormula: string; varVars: string; varSub: string; varSteps: CalculationStep[]; varOrigin?: string[];
    sd: number; sdFormula: string; sdSub: string; sdSteps: CalculationStep[]; sdOrigin?: string[];
} => {
  const { value: mean } = calculateMean(dataset);
  const data = dataset.data as DataPoint[];
  const N = dataset.totalFrequency || data.length;
  const validPoints = getFrequencyData(dataset).filter(p => p.f > 0);
  
  // RANGE
  let range = 0, rangeSub = '';
  let rangeOrigin: string[] = [];
  if (validPoints.length > 0) {
    const max = Math.max(...validPoints.map(p => p.x)), min = Math.min(...validPoints.map(p => p.x));
    range = max - min; 
    rangeSub = `${max} - ${min}`;
    rangeOrigin = [`Maximum X value found in table = ${max}`, `Minimum X value found in table = ${min}`];
  }
  
  // MEAN DEVIATION
  const sumAbsDev = data.reduce((acc, d) => acc + getF(d) * Math.abs(getX(d) - (mean as number)), 0);
  const meanDeviation = sumAbsDev / N;
  const mdFormula = String.raw`MD = \frac{\sum f|X - \bar{x}|}{N}`, mdVars = String.raw`\sum f|d| = ${sumAbsDev.toFixed(2)}, N = ${N}`, mdSub = String.raw`\frac{${sumAbsDev.toFixed(2)}}{${N}}`;
  const mdOrigin = [
      `Mean (x̄) = ${(mean as number).toFixed(4)}`,
      `Table Process: For each row, calculate deviation d = |x - x̄|.`,
      `Table Process: Multiply frequency f by deviation |d|.`,
      `Summation (Σf|d|): Sum of the 'f|x-x̄|' column = ${sumAbsDev.toFixed(4)}`
  ];
  const mdSteps: CalculationStep[] = [
      { latex: String.raw`\frac{${sumAbsDev.toFixed(2)}}{${N}}`, annotation: "Substitute Sum and N" },
      { latex: String.raw`= ${meanDeviation.toFixed(4)}`, annotation: "Divide by N" }
  ];

  // VARIANCE & SD
  const sumSqDev = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 2), 0);
  const variance = sumSqDev / N;
  const sd = Math.sqrt(variance);
  
  const varFormula = String.raw`V = \frac{\sum f(X - \bar{x})^2}{N}`, varVars = String.raw`\sum f d^2 = ${sumSqDev.toFixed(2)}, N = ${N}`, varSub = String.raw`\frac{${sumSqDev.toFixed(2)}}{${N}}`;
  const varOrigin = [
      `Table Process: For each row, calculate squared deviation (x - x̄)².`,
      `Table Process: Multiply frequency f by squared deviation.`,
      `Summation (Σf(x-x̄)²): Sum of the 'f(x-x̄)²' column = ${sumSqDev.toFixed(4)}`
  ];
  const varSteps: CalculationStep[] = [
      { latex: String.raw`\frac{${sumSqDev.toFixed(2)}}{${N}}`, annotation: "Substitute Sum Squares and N" },
      { latex: String.raw`= ${variance.toFixed(4)}`, annotation: "Divide by N" }
  ];

  const sdFormula = String.raw`\sigma = \sqrt{V}`, sdSub = String.raw`\sqrt{${variance.toFixed(4)}}`;
  const sdOrigin = [`Variance (V) calculated in previous step as ${variance.toFixed(4)}`];
  const sdSteps: CalculationStep[] = [
      { latex: String.raw`\sqrt{${variance.toFixed(4)}}`, annotation: "Square Root of Variance" },
      { latex: String.raw`= ${sd.toFixed(4)}`, annotation: "Final Result" }
  ];

  return { 
      range, rangeFormula: String.raw`R = x_{max} - x_{min}`, rangeSub, rangeSteps: [{latex: `${rangeSub} = ${range}`, annotation: "Subtract Min from Max"}], rangeOrigin,
      meanDeviation, mdFormula, mdVars, mdSub, mdSteps, mdOrigin,
      variance, varFormula, varVars, varSub, varSteps, varOrigin,
      sd, sdFormula, sdSub, sdSteps, sdOrigin
    };
};

export const calculateSkewnessKurtosis = (dataset: Dataset): {
    skewness: number; skewFormula: string; skewSub: string; skewVars: string; skewSteps: CalculationStep[]; skewOrigin?: string[];
    kurtosis: number; kurtFormula: string; kurtSub: string; kurtVars: string; kurtSteps: CalculationStep[]; kurtOrigin?: string[];
} => {
  const { value: mean } = calculateMean(dataset), { value: median } = calculateMedian(dataset), { value: mode } = calculateMode(dataset);
  const { sd } = calculateDispersion(dataset), { raw: moments } = calculateMoments(dataset);
  
  let skewness = 0, skewFormula = '', skewSub = '', skewVars = '', skewSteps: CalculationStep[] = [], skewOrigin: string[] = [];
  
  if (typeof mode === 'number') {
    skewness = ((mean as number) - mode) / sd;
    skewFormula = String.raw`S_k = \frac{\bar{x} - Z}{\sigma}`;
    skewVars = String.raw`\bar{x}=${(mean as number).toFixed(2)}, Z=${mode.toFixed(2)}, \sigma=${sd.toFixed(2)}`;
    skewSub = String.raw`\frac{${(mean as number).toFixed(2)} - ${mode.toFixed(2)}}{${sd.toFixed(2)}}`;
    skewOrigin = [`Using Pearson's Mode formula because a unique Mode exists.`];
    skewSteps = [
        { latex: String.raw`${(mean as number).toFixed(2)} - ${mode.toFixed(2)} = ${((mean as number)-mode).toFixed(4)}`, annotation: "Calculate Numerator (Mean - Mode)" },
        { latex: String.raw`\frac{${((mean as number)-mode).toFixed(4)}}{${sd.toFixed(2)}}`, annotation: "Divide by Sigma" },
        { latex: String.raw`= ${skewness.toFixed(4)}`, annotation: "Result" }
    ];
  } else {
    skewness = (3 * ((mean as number) - (median as number))) / sd;
    skewFormula = String.raw`S_k = \frac{3(\bar{x} - M)}{\sigma}`;
    skewVars = String.raw`\bar{x}=${(mean as number).toFixed(2)}, M=${(median as number).toFixed(2)}, \sigma=${sd.toFixed(2)}`;
    skewSub = String.raw`\frac{3(${(mean as number).toFixed(2)} - ${(median as number).toFixed(2)})}{${sd.toFixed(2)}}`;
    skewOrigin = [`Using Pearson's Median formula because Mode is undefined/multimodal.`];
    skewSteps = [
        { latex: String.raw`${(mean as number).toFixed(2)} - ${(median as number).toFixed(2)} = ${((mean as number)-(median as number)).toFixed(4)}`, annotation: "Calculate diff (Mean - Median)" },
        { latex: String.raw`3 \times ${((mean as number)-(median as number)).toFixed(4)} = ${(3*((mean as number)-(median as number))).toFixed(4)}`, annotation: "Multiply by 3" },
        { latex: String.raw`\frac{${(3*((mean as number)-(median as number))).toFixed(4)}}{${sd.toFixed(2)}}`, annotation: "Divide by Sigma" },
        { latex: String.raw`= ${skewness.toFixed(4)}`, annotation: "Result" }
    ];
  }

  const kurtosis = moments.m4 / Math.pow(moments.m2, 2);
  const kurtFormula = String.raw`\beta_2 = \frac{\mu_4}{\mu_2^2}`;
  const kurtVars = String.raw`\mu_4 = ${moments.m4.toFixed(2)}, \mu_2 = ${moments.m2.toFixed(2)}`;
  const kurtSub = String.raw`\frac{${moments.m4.toFixed(2)}}{(${moments.m2.toFixed(2)})^2}`;
  const kurtOrigin = [
      `4th Moment (μ4) = ${moments.m4.toFixed(4)}`,
      `2nd Moment (Variance μ2) = ${moments.m2.toFixed(4)}`
  ];
  const kurtSteps: CalculationStep[] = [
      { latex: String.raw`(${moments.m2.toFixed(2)})^2 = ${Math.pow(moments.m2, 2).toFixed(4)}`, annotation: "Square the 2nd Moment" },
      { latex: String.raw`\frac{${moments.m4.toFixed(2)}}{${Math.pow(moments.m2, 2).toFixed(4)}}`, annotation: "Divide μ4 by μ2²" },
      { latex: String.raw`= ${kurtosis.toFixed(4)}`, annotation: "Result" }
  ];

  return { skewness, skewFormula, skewSub, skewVars, skewSteps, skewOrigin, kurtosis, kurtFormula, kurtSub, kurtVars, kurtSteps, kurtOrigin };
};

// ==========================================
// BIVARIATE CALCULATIONS
// ==========================================

export const calculateBivariatePearson = (dataset: Dataset): BivariateSolverResult => {
    const data = dataset.data as BivariateDataPoint[];
    const N = data.length;
    const meanX = sum(data.map(d => d.x)) / N;
    const meanY = sum(data.map(d => d.y)) / N;
    
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    // For Alternative Z=X-Y Method
    let sumZ2_dev = 0;
    const meanZ = meanX - meanY;

    data.forEach(d => {
        const devX = d.x - meanX;
        const devY = d.y - meanY;
        sumXY += devX * devY;
        sumX2 += devX * devX;
        sumY2 += devY * devY;

        // Alternative calc
        const z = d.x - d.y;
        const devZ = z - meanZ;
        sumZ2_dev += devZ * devZ;
    });

    const denomMult = sumX2 * sumY2;
    const denomSqrt = Math.sqrt(denomMult);
    const r = sumXY / denomSqrt;
    
    const rSteps: CalculationStep[] = [
        { latex: String.raw`\text{SumXY} = ${sumXY.toFixed(2)}`, annotation: "Sum of product of deviations" },
        { latex: String.raw`${sumX2.toFixed(2)} \times ${sumY2.toFixed(2)} = ${denomMult.toFixed(2)}`, annotation: "Multiply SumX² and SumY²" },
        { latex: String.raw`\sqrt{${denomMult.toFixed(2)}} = ${denomSqrt.toFixed(4)}`, annotation: "Square Root of denominator" },
        { latex: String.raw`\frac{${sumXY.toFixed(2)}}{${denomSqrt.toFixed(4)}}`, annotation: "Divide Numerator by Denominator" },
        { latex: String.raw`= ${r.toFixed(4)}`, annotation: "Correlation Coefficient" }
    ];

    // --- Alternative Formula Steps ---
    // r = (varX + varY - var(X-Y)) / (2 * sdX * sdY)
    const varX = sumX2 / N;
    const varY = sumY2 / N;
    const varZ = sumZ2_dev / N;
    const sdX = Math.sqrt(varX);
    const sdY = Math.sqrt(varY);

    const altNum = varX + varY - varZ;
    const altDen = 2 * sdX * sdY;
    const r_alt = altNum / altDen;

    const altSteps: CalculationStep[] = [
      { latex: String.raw`\sigma_x^2 = \frac{\sum (x-\bar{x})^2}{N} = ${varX.toFixed(4)}`, annotation: "Variance of X" },
      { latex: String.raw`\sigma_y^2 = \frac{\sum (y-\bar{y})^2}{N} = ${varY.toFixed(4)}`, annotation: "Variance of Y" },
      { latex: String.raw`Z = X - Y \rightarrow \sigma_{x-y}^2 = \frac{\sum (z-\bar{z})^2}{N} = ${varZ.toFixed(4)}`, annotation: "Variance of Difference (Z)" },
      { latex: String.raw`\text{Numerator} = ${varX.toFixed(4)} + ${varY.toFixed(4)} - ${varZ.toFixed(4)}`, annotation: "Combine Variances" },
      { latex: String.raw`= ${altNum.toFixed(4)}`, annotation: "Numerator Result" },
      { latex: String.raw`\text{Denominator} = 2 \times \sqrt{${varX.toFixed(4)}} \times \sqrt{${varY.toFixed(4)}}`, annotation: "2 * SDx * SDy" },
      { latex: String.raw`= 2 \times ${sdX.toFixed(4)} \times ${sdY.toFixed(4)} = ${altDen.toFixed(4)}`, annotation: "Denominator Result" },
      { latex: String.raw`r = \frac{${altNum.toFixed(4)}}{${altDen.toFixed(4)}} = ${r_alt.toFixed(4)}`, annotation: "Final Division" }
    ];


    // Part A: Regression Line Y on X (y = a + bx)
    const byx = sumXY / sumX2;
    const ayx = meanY - byx * meanX;
    
    const yxSteps: CalculationStep[] = [
        { latex: String.raw`b_{yx} = \frac{${sumXY.toFixed(2)}}{${sumX2.toFixed(2)}} = ${byx.toFixed(4)}`, annotation: "Calculate Slope (b)" },
        { latex: String.raw`a = ${meanY.toFixed(2)} - (${byx.toFixed(4)} \times ${meanX.toFixed(2)})`, annotation: "Substitute into Intercept formula" },
        { latex: String.raw`${byx.toFixed(4)} \times ${meanX.toFixed(2)} = ${(byx * meanX).toFixed(4)}`, annotation: "Multiply Slope × MeanX" },
        { latex: String.raw`${meanY.toFixed(2)} - ${(byx * meanX).toFixed(4)}`, annotation: "Subtract from MeanY" },
        { latex: String.raw`= ${ayx.toFixed(4)}`, annotation: "Intercept (a)" }
    ];

    // Part B: Regression Line X on Y (x = a + by)
    const bxy = sumXY / sumY2;
    const axy = meanX - bxy * meanY;

    const xySteps: CalculationStep[] = [
        { latex: String.raw`b_{xy} = \frac{${sumXY.toFixed(2)}}{${sumY2.toFixed(2)}} = ${bxy.toFixed(4)}`, annotation: "Calculate Slope (b)" },
        { latex: String.raw`a = ${meanX.toFixed(2)} - (${bxy.toFixed(4)} \times ${meanY.toFixed(2)})`, annotation: "Substitute into Intercept formula" },
        { latex: String.raw`${bxy.toFixed(4)} \times ${meanY.toFixed(2)} = ${(bxy * meanY).toFixed(4)}`, annotation: "Multiply Slope × MeanY" },
        { latex: String.raw`${meanX.toFixed(2)} - ${(bxy * meanY).toFixed(4)}`, annotation: "Subtract from MeanX" },
        { latex: String.raw`= ${axy.toFixed(4)}`, annotation: "Intercept (a)" }
    ];

    let interpretation = "";
    if (r === 1) interpretation = "Perfect Positive Correlation";
    else if (r >= 0.7) interpretation = "Highly Positive Correlation";
    else if (r > 0) interpretation = "Positive Correlation";
    else if (r === 0) interpretation = "No Correlation";
    else if (r > -0.7) interpretation = "Negative Correlation";
    else if (r > -1) interpretation = "Highly Negative Correlation";
    else if (r === -1) interpretation = "Perfect Negative Correlation";

    return {
        r,
        interpretation,
        rSteps,
        meanX, meanY, sumXY, sumX2, sumY2,
        originExplanations: [
            `Sum of X deviations squares (Σx²) = ${sumX2.toFixed(2)}`,
            `Sum of Y deviations squares (Σy²) = ${sumY2.toFixed(2)}`,
            `Sum of products of deviations (Σxy) = ${sumXY.toFixed(2)}`,
            `Mean of X (x̄) = ${meanX.toFixed(2)}`,
            `Mean of Y (ȳ) = ${meanY.toFixed(2)}`
        ],
        regressionYX: { 
            a: ayx, 
            b: byx, 
            eqn: String.raw`y = ${ayx.toFixed(2)} + ${byx.toFixed(4)}x`,
            formulaB: String.raw`b_{yx} = \frac{\sum XY}{\sum X^2}`,
            variablesB: String.raw`\sum XY = ${sumXY.toFixed(2)}, \sum X^2 = ${sumX2.toFixed(2)}`,
            substitutionB: String.raw`b_{yx} = \frac{${sumXY.toFixed(2)}}{${sumX2.toFixed(2)}} = ${byx.toFixed(4)}`,
            formulaLine: String.raw`(y - \bar{y}) = b_{yx}(x - \bar{x})`,
            substitutionLine: String.raw`(y - ${meanY.toFixed(2)}) = ${byx.toFixed(4)}(x - ${meanX.toFixed(2)})`,
            steps: yxSteps
        },
        regressionXY: { 
            a: axy, 
            b: bxy, 
            eqn: String.raw`x = ${axy.toFixed(2)} + ${bxy.toFixed(4)}y`,
            formulaB: String.raw`b_{xy} = \frac{\sum XY}{\sum Y^2}`,
            variablesB: String.raw`\sum XY = ${sumXY.toFixed(2)}, \sum Y^2 = ${sumY2.toFixed(2)}`,
            substitutionB: String.raw`b_{xy} = \frac{${sumXY.toFixed(2)}}{${sumY2.toFixed(2)}} = ${bxy.toFixed(4)}`,
            formulaLine: String.raw`(x - \bar{x}) = b_{xy}(y - \bar{y})`,
            substitutionLine: String.raw`(x - ${meanX.toFixed(2)}) = ${bxy.toFixed(4)}(y - ${meanY.toFixed(2)})`,
            steps: xySteps
        },
        formulaR: String.raw`r = \frac{\sum XY}{\sqrt{\sum X^2 \cdot \sum Y^2}}`,
        variablesR: String.raw`\sum XY = ${sumXY.toFixed(2)}, \sum X^2 = ${sumX2.toFixed(2)}, \sum Y^2 = ${sumY2.toFixed(2)}`,
        substitutionR: String.raw`r = \frac{${sumXY.toFixed(2)}}{\sqrt{${sumX2.toFixed(2)} \cdot ${sumY2.toFixed(2)}}}`,
        alternativePearson: {
          formula: String.raw`r = \frac{\sigma_x^2 + \sigma_y^2 - \sigma_{x-y}^2}{2\sigma_x\sigma_y}`,
          variables: String.raw`\sigma_x^2=${varX.toFixed(2)}, \sigma_y^2=${varY.toFixed(2)}, \sigma_{x-y}^2=${varZ.toFixed(2)}`,
          substitution: String.raw`r = \frac{${varX.toFixed(2)} + ${varY.toFixed(2)} - ${varZ.toFixed(2)}}{2 \cdot ${sdX.toFixed(2)} \cdot ${sdY.toFixed(2)}}`,
          value: r_alt,
          steps: altSteps
        }
    };
};

export const generateUnivariateMasterTable = (dataset: Dataset, mean: number) => {
    const isContinuous = dataset.type === DataType.GROUPED_CONTINUOUS;
    const dataToProcess = getFrequencyData(dataset);
    const headers = [isContinuous ? String.raw`\text{Interval}` : String.raw`x`, ...(isContinuous ? [String.raw`x`] : []), String.raw`f`, String.raw`cf`, String.raw`fx`, String.raw`X = x - \bar{x}`, String.raw`|X|`, String.raw`f|X|`, String.raw`X^2`, String.raw`fX^2`, String.raw`fX^3`, String.raw`fX^4` ];
    const rows: any[] = [];
    let cf = 0, sumF = 0, sumFX = 0, sumFAbsX = 0, sumFX2 = 0, sumFX3 = 0, sumFX4 = 0;
    dataToProcess.forEach(d => {
        const x = d.x, f = d.f, fx = f * x, X = x - mean, absX = Math.abs(X), fAbsX = f * absX, X2 = X * X, fX2 = f * X2, X3 = X2 * X, fX3 = f * X3, X4 = X2 * X2, fX4 = f * X4;
        cf += f; sumF += f; sumFX += fx; sumFAbsX += fAbsX; sumFX2 += fX2; sumFX3 += fX3; sumFX4 += fX4;
        let label = x.toString();
        if (isContinuous) { const original = (dataset.data as GroupedContinuousDataPoint[]).find(orig => orig.midpoint === x); if (original) label = `${original.lower}-${original.upper}`; }
        rows.push([label, ...(isContinuous ? [x] : []), f, cf, fx, X, absX, fAbsX, X2, fX2, fX3, fX4]);
    });
    return { headers, rows, footer: ['Total', ...(isContinuous ? [0] : []), sumF, '-', sumFX, '-', '-', sumFAbsX, '-', sumFX2, sumFX3, sumFX4] };
};

export const generateBivariateMasterTable = (dataset: Dataset) => {
    const data = dataset.data as BivariateDataPoint[];
    const N = data.length;
    const meanX = sum(data.map(d => d.x)) / N;
    const meanY = sum(data.map(d => d.y)) / N;
    // Difference Mean for Z
    const meanZ = meanX - meanY;

    const headers = [
        String.raw`x`, 
        String.raw`y`, 
        String.raw`Z = x - y`, // New Z column
        String.raw`X = x - \bar{x}`, 
        String.raw`Y = y - \bar{y}`, 
        String.raw`z = Z - \bar{Z}`, // New Deviation Z
        String.raw`X^2`, 
        String.raw`Y^2`, 
        String.raw`z^2`, // New Squared Deviation Z
        String.raw`XY`
    ];
    const tooltips = [
        "Raw value of independent variable x.",
        "Raw value of dependent variable y.",
        "Difference between x and y (Z).",
        "Deviation of x from its mean.",
        "Deviation of y from its mean.",
        "Deviation of Z from its mean.",
        "Squared deviation of x.",
        "Squared deviation of y.",
        "Squared deviation of Z (used for difference variance).",
        "Product of deviations (Cross-product)."
    ];
    
    const rows: any[] = [];
    let sX = 0, sY = 0, sZ = 0, sDevX = 0, sDevY = 0, sDevZ = 0, sX2 = 0, sY2 = 0, sZ2 = 0, sXY = 0;

    data.forEach(d => {
        const Z = d.x - d.y;
        const X = d.x - meanX;
        const Y = d.y - meanY;
        const devZ = Z - meanZ;

        const X2 = X * X;
        const Y2 = Y * Y;
        const Z2 = devZ * devZ;
        const XY = X * Y;
        
        sX += d.x; sY += d.y; sZ += Z;
        sDevX += X; sDevY += Y; sDevZ += devZ;
        sX2 += X2; sY2 += Y2; sZ2 += Z2;
        sXY += XY;
        
        rows.push([d.x, d.y, Z, X, Y, devZ, X2, Y2, Z2, XY]);
    });

    return { 
        headers, 
        rows, 
        tooltips,
        footer: [sX, sY, sZ, sDevX, sDevY, sDevZ, sX2, sY2, sZ2, sXY] 
    };
};

export const calculateMoments = (dataset: Dataset) => {
    // ... same as before ...
    const { value: mean } = calculateMean(dataset);
  const data = dataset.data as DataPoint[];
  const N = dataset.totalFrequency || data.length;
  const m1_v = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 1), 0) / N;
  const m2_v = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 2), 0) / N;
  const m3_v = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 3), 0) / N;
  const m4_v = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 4), 0) / N;
  const sFX1 = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 1), 0);
  const sFX2 = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 2), 0);
  const sFX3 = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 3), 0);
  const sFX4 = data.reduce((acc, d) => acc + getF(d) * Math.pow(getX(d) - (mean as number), 4), 0);
  return {
    m1: { value: 0, formula: String.raw`\mu_1 = \frac{\sum f X}{N}`, vars: String.raw`\sum f X = ${sFX1.toFixed(2)}, N = ${N}`, sub: String.raw`\frac{${sFX1.toFixed(2)}}{${N}}` },
    m2: { value: m2_v, formula: String.raw`\mu_2 = \frac{\sum f X^2}{N}`, vars: String.raw`\sum f X^2 = ${sFX2.toFixed(2)}, N = ${N}`, sub: String.raw`\frac{${sFX2.toFixed(2)}}{${N}}` },
    m3: { value: m3_v, formula: String.raw`\mu_3 = \frac{\sum f X^3}{N}`, vars: String.raw`\sum f X^3 = ${sFX3.toFixed(2)}, N = ${N}`, sub: String.raw`\frac{${sFX3.toFixed(2)}}{${N}}` },
    m4: { value: m4_v, formula: String.raw`\mu_4 = \frac{\sum f X^4}{N}`, vars: String.raw`\sum f X^4 = ${sFX4.toFixed(2)}, N = ${N}`, sub: String.raw`\frac{${sFX4.toFixed(2)}}{${N}}` },
    raw: { m1: m1_v, m2: m2_v, m3: m3_v, m4: m4_v }
  };
};
