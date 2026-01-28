import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import {
  normalPDF,
  ciToParams,
  tDistributionPDF,
  ciToTDistributionParams,
} from '../../utils/distributions';
import type { DistributionType } from '../../types';

interface DistributionChartProps {
  lowerBound: number;
  upperBound: number;
  threshold: number;
  distribution?: DistributionType;
  degreesOfFreedom?: number;
  height?: number;
  centerAtZero?: boolean;
}

/**
 * D3-based distribution visualization
 * Shows the probability distribution with threshold line and shaded loss region
 * Supports normal, uniform, and t-distribution (fat tails)
 */
export function DistributionChart({
  lowerBound,
  upperBound,
  threshold,
  distribution = 'normal',
  degreesOfFreedom = 5,
  height = 200,
  centerAtZero = false,
}: DistributionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 400;
    const orderedLower = Math.min(lowerBound, upperBound);
    const orderedUpper = Math.max(lowerBound, upperBound);
    const rangeWidth = orderedUpper - orderedLower;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set dimensions
    svg.attr('width', width).attr('height', height);

    const margin = { top: 20, right: 20, bottom: 40, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate distribution parameters based on type
    let mean: number;
    let scaleParam: number;

    if (distribution === 't-distribution') {
      const tParams = ciToTDistributionParams(orderedLower, orderedUpper, degreesOfFreedom);
      mean = tParams.mean;
      scaleParam = tParams.scale;
    } else {
      const normalParams = ciToParams(orderedLower, orderedUpper);
      mean = normalParams.mean;
      scaleParam = normalParams.stdDev;
    }

    // X scale: determine the x-axis range
    let xMin: number;
    let xMax: number;

    if (distribution === 'uniform') {
      // For uniform, show the range plus some padding
      const padding = rangeWidth === 0 ? 1 : rangeWidth * 0.2;
      xMin = orderedLower - padding;
      xMax = orderedUpper + padding;
    } else {
      // For normal/t distributions
      const tailMultiplier = distribution === 't-distribution' && degreesOfFreedom < 10 ? 5 : 3.5;
      const naturalMin = mean - tailMultiplier * scaleParam;
      const naturalMax = mean + tailMultiplier * scaleParam;

      // If centerAtZero is true and range is reasonable (upper < 100%), center at 0
      if (centerAtZero && upperBound < 100) {
        // Calculate symmetric range around 0 that encompasses the distribution
        const maxExtent = Math.max(Math.abs(naturalMin), Math.abs(naturalMax), Math.abs(orderedLower), Math.abs(orderedUpper));
        // Ensure we show at least from lowerBound to upperBound with some padding
        const minExtent = Math.max(Math.abs(orderedLower), Math.abs(orderedUpper)) * 1.5;
        const extent = Math.max(maxExtent, minExtent);
        xMin = -extent;
        xMax = extent;
      } else {
        // Use natural range centered on mean
        xMin = naturalMin;
        xMax = naturalMax;
      }
    }

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);

    // Generate curve data points
    const numPoints = 200;
    const curveData: { x: number; y: number }[] = [];

    if (distribution === 'uniform') {
      // Uniform distribution
      const uniformHeight = rangeWidth === 0 ? 0 : 1 / rangeWidth;
      curveData.push({ x: xMin, y: 0 });
      curveData.push({ x: orderedLower, y: 0 });
      curveData.push({ x: orderedLower, y: uniformHeight });
      curveData.push({ x: orderedUpper, y: uniformHeight });
      curveData.push({ x: orderedUpper, y: 0 });
      curveData.push({ x: xMax, y: 0 });
    } else {
      // Normal or t-distribution
      for (let i = 0; i <= numPoints; i++) {
        const x = xMin + (i / numPoints) * (xMax - xMin);
        let y: number;

        if (distribution === 't-distribution') {
          y = tDistributionPDF(x, degreesOfFreedom, mean, scaleParam);
        } else {
          y = normalPDF(x, mean, scaleParam);
        }

        curveData.push({ x, y });
      }
    }

    // Y scale
    const yMax = d3.max(curveData, (d) => d.y) || 1;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([innerHeight, 0]);

    // Create area generator for the full curve
    const areaGenerator = d3
      .area<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y0(innerHeight)
      .y1((d) => yScale(d.y))
      .curve(distribution === 'uniform' ? d3.curveLinear : d3.curveBasis);

    // Create line generator
    const lineGenerator = d3
      .line<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(distribution === 'uniform' ? d3.curveLinear : d3.curveBasis);

    // Split data into loss region (below threshold) and safe region (above threshold)
    let lossData: { x: number; y: number }[];
    let safeData: { x: number; y: number }[];

    if (distribution === 'uniform') {
      // For uniform, create rectangular regions
      const uniformHeight = rangeWidth === 0 ? 0 : 1 / rangeWidth;
      const clampedThreshold = Math.max(orderedLower, Math.min(orderedUpper, threshold));

      lossData = [
        { x: orderedLower, y: 0 },
        { x: orderedLower, y: uniformHeight },
        { x: clampedThreshold, y: uniformHeight },
        { x: clampedThreshold, y: 0 },
      ];

      safeData = [
        { x: clampedThreshold, y: 0 },
        { x: clampedThreshold, y: uniformHeight },
        { x: orderedUpper, y: uniformHeight },
        { x: orderedUpper, y: 0 },
      ];
    } else {
      lossData = curveData.filter((d) => d.x <= threshold);
      safeData = curveData.filter((d) => d.x >= threshold);
    }

    // Draw loss region (red/pink)
    if (lossData.length > 0) {
      g.append('path')
        .datum(lossData)
        .attr('d', areaGenerator)
        .attr('fill', 'rgba(239, 68, 68, 0.3)')
        .attr('stroke', 'none');
    }

    // Draw safe region (blue)
    if (safeData.length > 0) {
      g.append('path')
        .datum(safeData)
        .attr('d', areaGenerator)
        .attr('fill', 'rgba(59, 130, 246, 0.3)')
        .attr('stroke', 'none');
    }

    // Draw the full curve outline
    g.append('path')
      .datum(curveData)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#475569')
      .attr('stroke-width', 2);

    // Draw zero line if centerAtZero and 0 is in range
    if (centerAtZero && xMin < 0 && xMax > 0) {
      g.append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', innerHeight - 5)
        .attr('y2', innerHeight + 5)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 2);
    }

    // Draw threshold line
    const thresholdX = xScale(threshold);
    g.append('line')
      .attr('x1', thresholdX)
      .attr('x2', thresholdX)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    // Draw CI bounds (subtle vertical lines)
    [lowerBound, upperBound].forEach((bound) => {
      g.append('line')
        .attr('x1', xScale(bound))
        .attr('x2', xScale(bound))
        .attr('y1', innerHeight - 10)
        .attr('y2', innerHeight)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1);
    });

    // Draw mean line (dotted) - only for continuous distributions
    if (distribution !== 'uniform') {
      let peakY: number;
      if (distribution === 't-distribution') {
        peakY = tDistributionPDF(mean, degreesOfFreedom, mean, scaleParam);
      } else {
        peakY = normalPDF(mean, mean, scaleParam);
      }

      g.append('line')
        .attr('x1', xScale(mean))
        .attr('x2', xScale(mean))
        .attr('y1', yScale(peakY))
        .attr('y2', innerHeight)
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');
    }

    // X-axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(7)
      .tickFormat((d) => {
        const val = d as number;
        if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
        // For small values (like percentages), show appropriate precision
        if (Math.abs(val) < 10) {
          // Show + sign for positive values when centered at zero
          const sign = centerAtZero && val > 0 ? '+' : '';
          return `${sign}${val.toFixed(1)}%`;
        }
        return `${val.toFixed(0)}%`;
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '11px');

    g.selectAll('.domain').attr('stroke', '#cbd5e1');
    g.selectAll('.tick line').attr('stroke', '#cbd5e1');

    // Labels
    // Threshold label
    g.append('text')
      .attr('x', thresholdX)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f59e0b')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Threshold');

    // 90% CI label
    g.append('text')
      .attr('x', xScale((lowerBound + upperBound) / 2))
      .attr('y', innerHeight + 32)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .text('← 90% Confidence Interval →');

    // Distribution type indicator (for non-normal)
    if (distribution !== 'normal') {
      const label = distribution === 't-distribution' ? `t(df=${degreesOfFreedom})` : 'Uniform';
      g.append('text')
        .attr('x', innerWidth - 5)
        .attr('y', 15)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .text(label);
    }

  }, [lowerBound, upperBound, threshold, distribution, degreesOfFreedom, height, centerAtZero]);

  return (
    <div className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
