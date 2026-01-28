import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface EOLBarChartProps {
  eolIfApproved: number;
  eolIfRejected: number;
  bestDecision: 'approve' | 'reject';
  height?: number;
}

/**
 * D3-based bar chart comparing EOL for approve vs reject decisions
 */
export function EOLBarChart({
  eolIfApproved,
  eolIfRejected,
  bestDecision,
  height = 160,
}: EOLBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 300;

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

    const data = [
      { label: 'Approve', value: eolIfApproved, isBest: bestDecision === 'approve' },
      { label: 'Reject', value: eolIfRejected, isBest: bestDecision === 'reject' },
    ];

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.4);

    const yMax = Math.max(eolIfApproved, eolIfRejected) * 1.1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // Format currency
    const formatCurrency = (value: number) => {
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    };

    // Draw bars with animation
    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.label) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', (d) => (d.isBest ? '#22c55e' : '#94a3b8'))
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => yScale(d.value))
      .attr('height', (d) => innerHeight - yScale(d.value));

    // Add value labels on top of bars
    g.selectAll('.value-label')
      .data(data)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.value) - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#1e293b')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text((d) => formatCurrency(d.value))
      .attr('opacity', 0)
      .transition()
      .delay(300)
      .duration(300)
      .attr('opacity', 1);

    // X-axis labels
    g.selectAll('.x-label')
      .data(data)
      .join('text')
      .attr('class', 'x-label')
      .attr('x', (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
      .attr('y', innerHeight + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '13px')
      .text((d) => d.label);

    // Best choice indicator
    g.selectAll('.best-indicator')
      .data(data.filter((d) => d.isBest))
      .join('text')
      .attr('class', 'best-indicator')
      .attr('x', (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#22c55e')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('✓ Lower EOL');

  }, [eolIfApproved, eolIfRejected, bestDecision, height]);

  return (
    <div className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
