
import React, { useEffect, useRef, useMemo } from 'react';
import ApexCharts from 'apexcharts';
import { Dataset, DataType, BivariateDataPoint, UngroupedDataPoint, GroupedContinuousDataPoint, GroupedDiscreteDataPoint } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { BarChart3, ScatterChart, TrendingUp } from 'lucide-react';

interface Props {
  dataset: Dataset;
  title?: string;
  className?: string;
}

const hexToRgba = (hex: string, opacity: number) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`
    : `rgba(0, 0, 0, ${opacity})`;
};

export const CinematicChart: React.FC<Props> = React.memo(({ dataset, title, className = '' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);
  const { colors } = useTheme();

  const isDark = useMemo(() => {
    const hexToRgb = (hex: string): string => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '0 0 0';
    };
    const rgb = hexToRgb(colors.bg).split(' ').map(Number);
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    return brightness <= 155;
  }, [colors.bg]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy previous instance
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    let options: any = {};
    const commonOptions = {
      chart: {
        background: 'transparent',
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true 
          },
          autoSelected: 'zoom'
        },
        animations: {
          enabled: false,
        },
        fontFamily: 'Space Mono, monospace',
      },
      theme: {
        mode: isDark ? 'dark' : 'light',
        palette: 'palette1',
      },
      grid: {
        borderColor: hexToRgba(colors.text, 0.05),
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },   
        yaxis: { lines: { show: true } },
      },
      dataLabels: { enabled: false },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        style: { fontSize: '12px' },
        x: { show: true },
        marker: { show: true },
        fixed: {
            enabled: false,
            position: 'topRight',
            offsetX: 0,
            offsetY: 0,
        },
      }
    };

    // --- LOGIC: Bivariate (Scatter + Regression) ---
    if (dataset.type === DataType.BIVARIATE) {
      const data = dataset.data as BivariateDataPoint[];
      
      // Calculate Regression for Line of Best Fit (ALWAYS use full dataset for accuracy)
      const n = data.length;
      const sumX = data.reduce((a, b) => a + b.x, 0);
      const sumY = data.reduce((a, b) => a + b.y, 0);
      const sumXY = data.reduce((a, b) => a + b.x * b.y, 0);
      const sumX2 = data.reduce((a, b) => a + b.x * b.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Downsample scatter points for performance if dataset is massive
      // ApexCharts (SVG) struggles with > 3000 points
      const MAX_POINTS = 2500;
      let sampledData = data;
      if (data.length > MAX_POINTS) {
        const step = Math.ceil(data.length / MAX_POINTS);
        sampledData = data.filter((_, i) => i % step === 0);
      }

      const scatterSeries = sampledData.map(d => [d.x, d.y]);
      const minX = Math.min(...data.map(d => d.x));
      const maxX = Math.max(...data.map(d => d.x));
      
      // Add padding to line
      const pad = (maxX - minX) * 0.1;
      const lineStart = minX - pad;
      const lineEnd = maxX + pad;
      
      const lineSeries = [
        [lineStart, slope * lineStart + intercept],
        [lineEnd, slope * lineEnd + intercept]
      ];

      options = {
        ...commonOptions,
        chart: {
            ...commonOptions.chart,
            type: 'line', // Hybrid type
            height: 400,
        },
        series: [
          {
            name: 'Data Points',
            type: 'scatter',
            data: scatterSeries
          },
          {
            name: 'Regression Line',
            type: 'line',
            data: lineSeries
          }
        ],
        stroke: {
            width: [0, 3], // 0 for scatter, 3 for line
            curve: 'straight',
            dashArray: [0, 0]
        },
        fill: {
            type: 'solid',
            opacity: [1, 1]
        },
        markers: {
            size: [6, 0],
            strokeWidth: 0,
            hover: { size: 9 }
        },
        colors: [isDark ? '#FFFFFF' : colors.text, colors.accent], // Points white/text, Line accent
        xaxis: {
            type: 'numeric',
            tickAmount: 10,
            labels: { style: { colors: hexToRgba(colors.text, 0.5), fontSize: '10px' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false }
        },
        yaxis: {
            tickAmount: 7,
            labels: { style: { colors: hexToRgba(colors.text, 0.5), fontSize: '10px' } },
        }
      };
    } 
    // --- LOGIC: Univariate (Bar / Histogram) ---
    else {
      let categories: (string|number)[] = [];
      let seriesData: number[] = [];
      let isContinuous = dataset.type === DataType.GROUPED_CONTINUOUS;

      if (dataset.type === DataType.UNGROUPED) {
          const raw = dataset.data as UngroupedDataPoint[];
          const counts: Record<number, number> = {};
          raw.forEach(d => counts[d.x] = (counts[d.x] || 0) + 1);
          const sortedKeys = Object.keys(counts).map(Number).sort((a,b) => a-b);
          categories = sortedKeys;
          seriesData = sortedKeys.map(k => counts[k]);
      } else if (dataset.type === DataType.GROUPED_DISCRETE) {
          const raw = (dataset.data as GroupedDiscreteDataPoint[]).sort((a,b) => a.x - b.x);
          categories = raw.map(d => d.x);
          seriesData = raw.map(d => d.f);
      } else if (isContinuous) {
          const raw = (dataset.data as GroupedContinuousDataPoint[]).sort((a,b) => a.lower - b.lower);
          categories = raw.map(d => `${d.lower}-${d.upper}`);
          seriesData = raw.map(d => d.f);
      }

      options = {
        ...commonOptions,
        chart: {
            ...commonOptions.chart,
            type: 'bar',
            height: 350,
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: isContinuous ? '98%' : '60%', // Histogram effect for continuous
                borderRadius: isContinuous ? 1 : 4,
                dataLabels: { position: 'top' }
            }
        },
        dataLabels: {
            enabled: true,
            offsetY: -20,
            style: {
                fontSize: '10px',
                colors: [colors.text]
            }
        },
        series: [{
            name: 'Frequency',
            data: seriesData
        }],
        colors: [colors.accent],
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: 'vertical',
                shadeIntensity: 0.5,
                gradientToColors: [colors.accent], // End color same for now, implies slight fade
                inverseColors: true,
                opacityFrom: 0.8,
                opacityTo: 0.2,
                stops: [0, 100]
            }
        },
        stroke: {
            show: true,
            width: 1,
            colors: ['transparent']
        },
        xaxis: {
            categories: categories,
            labels: {
                style: { colors: hexToRgba(colors.text, 0.5), fontSize: '10px' },
                rotate: -45
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { style: { colors: hexToRgba(colors.text, 0.5), fontSize: '10px' } }
        }
      };
    }

    chartInstance.current = new ApexCharts(chartRef.current, options);
    chartInstance.current.render();

    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [dataset, colors]);

  return (
    <div className={`relative ${className}`}>
        {/* Glass Card Container */}
        <div className="bg-skin-surface/40 border border-skin-border/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-skin-accent/10 rounded-lg border border-skin-accent/20">
                        {dataset.type === DataType.BIVARIATE 
                            ? <ScatterChart className="w-5 h-5 text-skin-accent" /> 
                            : <BarChart3 className="w-5 h-5 text-skin-accent" />
                        }
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-skin-text uppercase tracking-widest">{title || 'Data Visualization'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] text-skin-muted font-mono">Live Interactive Engine</span>
                        </div>
                    </div>
                </div>
                
                {dataset.type === DataType.BIVARIATE && (
                    <div className="px-3 py-1 bg-skin-surface/40 rounded-full border border-skin-border/10 flex items-center gap-2">
                         <TrendingUp className="w-3 h-3 text-skin-accent" />
                         <span className="text-[9px] text-skin-muted font-mono">Least Squares Regression</span>
                    </div>
                )}
            </div>

            {/* Chart Area */}
            <div className="relative z-10 mix-blend-screen" ref={chartRef} />
            
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-skin-accent/5 rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        </div>
    </div>
  );
});
