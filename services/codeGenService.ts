
import { Dataset, DataType, BivariateDataPoint, UngroupedDataPoint, GroupedDiscreteDataPoint, GroupedContinuousDataPoint } from '../types';

export const generatePythonCode = (dataset: Dataset): string => {
  let dataStr = '';
  if (dataset.type === DataType.BIVARIATE) {
    const data = dataset.data as BivariateDataPoint[];
    dataStr = `x = [${data.map(d => d.x).join(', ')}]\ny = [${data.map(d => d.y).join(', ')}]`;
  } else if (dataset.type === DataType.UNGROUPED) {
    const data = dataset.data as UngroupedDataPoint[];
    dataStr = `data = [${data.map(d => d.x).join(', ')}]`;
  } else if (dataset.type === DataType.GROUPED_DISCRETE) {
    const data = dataset.data as GroupedDiscreteDataPoint[];
    dataStr = `x = [${data.map(d => d.x).join(', ')}]\nf = [${data.map(d => d.f).join(', ')}]`;
  } else if (dataset.type === DataType.GROUPED_CONTINUOUS) {
    const data = dataset.data as GroupedContinuousDataPoint[];
    dataStr = `lower = [${data.map(d => d.lower).join(', ')}]\nupper = [${data.map(d => d.upper).join(', ')}]\nf = [${data.map(d => d.f).join(', ')}]`;
  }

  return `
import numpy as np
import matplotlib.pyplot as plt

# Dataset: ${dataset.type}
${dataStr}

# Basic Analysis
print(f"Dataset Type: ${dataset.type}")
${dataset.type === DataType.BIVARIATE ? `
from scipy import stats
slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
print(f"Slope: {slope}")
print(f"Intercept: {intercept}")
print(f"R-squared: {r_value**2}")
` : `
print(f"Mean: {np.mean(data if 'data' in locals() else x)}")
`}
`;
};

export const generateCCode = (dataset: Dataset): string => {
  return `
#include <stdio.h>

int main() {
    printf("StatForge Export\\n");
    printf("Dataset Type: ${dataset.type}\\n");
    // Implementation for ${dataset.type} logic...
    return 0;
}
`;
};

export const generateMatlabCode = (dataset: Dataset): string => {
  return `
% StatForge Export
% Dataset Type: ${dataset.type}

clc; clear;
% Data implementation...
`;
};
