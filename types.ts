
export enum DataType {
  UNGROUPED = 'UNGROUPED', 
  GROUPED_DISCRETE = 'GROUPED_DISCRETE', 
  GROUPED_CONTINUOUS = 'GROUPED_CONTINUOUS', 
  BIVARIATE = 'BIVARIATE',
  MARKET = 'MARKET'
}

export interface StockPricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isPrediction?: boolean;
}

export interface NewsItem {
  title: string;
  date: string;
  source: string;
  url: string;
}

export interface MarketPulseItem {
  name: string;
  value: number;
  change: number;
}

export interface MarketDataset {
  ticker: string;
  currentPrice: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  volatility: number;
  history: StockPricePoint[];
  prediction: {
    forecast: StockPricePoint[];
    formula: string;
    rSquared: number;
  };
  news?: NewsItem[];
  marketPulse?: MarketPulseItem[];
  sources?: { uri: string; title?: string }[];
}

export interface UngroupedDataPoint {
  x: number;
}

export interface GroupedDiscreteDataPoint {
  x: number;
  f: number;
}

export interface GroupedContinuousDataPoint {
  lower: number;
  upper: number;
  f: number;
  midpoint: number;
}

export interface BivariateDataPoint {
  x: number;
  y: number;
}

export type DataPoint = UngroupedDataPoint | GroupedDiscreteDataPoint | GroupedContinuousDataPoint | BivariateDataPoint;

export interface Dataset {
  type: DataType;
  data: DataPoint[] | MarketDataset;
  totalFrequency?: number; // N
}

export interface CalculationStep {
  latex: string;
  annotation?: string;
}

export interface SolverResult {
  value: number | string;
  formula: string;
  variables: string;
  substitution: string;
  originExplanations?: string[];
  steps: CalculationStep[];
}

export interface BivariateSolverResult {
  r: number;
  interpretation: string;
  meanX: number; 
  meanY: number; 
  sumXY: number; 
  sumX2: number; 
  sumY2: number;
  originExplanations?: string[];
  regressionYX: { 
      a: number; 
      b: number; 
      eqn: string; 
      formulaB: string; 
      variablesB: string; 
      substitutionB: string; 
      formulaLine: string; 
      substitutionLine: string; 
      steps: CalculationStep[];
  };
  regressionXY: { 
      a: number; 
      b: number; 
      eqn: string; 
      formulaB: string; 
      variablesB: string; 
      substitutionB: string; 
      formulaLine: string; 
      substitutionLine: string; 
      steps: CalculationStep[];
  };
  formulaR: string;
  variablesR: string;
  substitutionR: string;
  rSteps: CalculationStep[];
  alternativePearson: {
    formula: string;
    variables: string;
    substitution: string;
    value: number;
    steps: CalculationStep[];
  };
}
