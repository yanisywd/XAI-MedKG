import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function DiseaseGraphPreview({ diseaseName, connections, colors }) {
  const svgRef = useRef(null);
  
  // Default colors if not provided
  const defaultColors = {
    Disease: "#e41a1c",
    Symptom: "#377eb8",
    "Age Group": "#4daf4a",
    Gender: "#984ea3",
    "Blood Pressure": "#ff7f00",
    "Cholesterol Level": "#ffff33"
  };
  
  const relationshipTypes = {
    HAS_SYMPTOM: { color: "#1f77b4", targetType: "Symptom" },
    COMMON_IN: { color: "#2ca02c", targetType: "Age Group" },
    PREVALENT_IN: { color: "#9467bd", targetType: "Gender" },
    ASSOCIATED_WITH: { color: "#ff7f0e", targetType: "Blood Pressure" },
    CORRELATED_WITH: { color: "#8c564b", targetType: "Cholesterol Level" }
  };
  
  useEffect(() => {
    if (!svgRef.current || !diseaseName || !connections || connections.length === 0) return;
    
    // Clear any existing visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Set up the SVG dimensions
    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const nodeRadius = 8;
    const diseaseRadius = 12;
    
    // Set up the SVG container
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
    
    // Create a drop shadow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "drop-shadow-preview")
      .attr("height", "130%");

    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 2)
      .attr("result", "blur");

    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 1)
      .attr("dy", 1)
      .attr("result", "offsetBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "offsetBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");
    
    // Create arrow markers for each relationship type
    Object.entries(relationshipTypes).forEach(([relType, { color }]) => {
      svg.append("defs").append("marker")
        .attr("id", `arrow-${relType}`)
        .attr("viewBox", "0 -2 6 4")
        .attr("refX", 6)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
          .attr("fill", color)
          .attr("d", "M0,-2L6,0L0,2");
    });
    
    // Create nodes data
    const nodes = [
      { id: diseaseName, type: "Disease", x: centerX, y: centerY }
    ];
    
    // Group connections by relationship type
    const connectionsByType = {};
    connections.forEach(conn => {
      if (!connectionsByType[conn.relationship]) {
        connectionsByType[conn.relationship] = [];
      }
      connectionsByType[conn.relationship].push(conn);
    });
    
    // Calculate positions for nodes based on relationship type
    Object.entries(connectionsByType).forEach(([relType, conns], typeIndex) => {
      const totalTypes = Object.keys(connectionsByType).length;
      const angleOffset = (2 * Math.PI / totalTypes) * typeIndex;
      
      conns.forEach((conn, i) => {
        const totalConnsOfType = conns.length;
        const radius = 140; // Distance from center
        const angleSpread = Math.PI / 3; // Spread for this type
        const angle = angleOffset + (angleSpread / (totalConnsOfType + 1)) * (i + 1) - angleSpread/2;
        
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        nodes.push({
          id: conn.target,
          type: relationshipTypes[relType].targetType,
          x: x,
          y: y,
          relationship: relType,
          weight: conn.weight
        });
      });
    });
    
    // Create links data
    const links = connections.map(conn => ({
      source: diseaseName,
      target: conn.target,
      relationship: conn.relationship,
      weight: conn.weight
    }));
    
    // Draw links
    svg.selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("x1", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        return sourceNode ? sourceNode.x : 0;
      })
      .attr("y1", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        return sourceNode ? sourceNode.y : 0;
      })
      .attr("x2", d => {
        const targetNode = nodes.find(n => n.id === d.target);
        // Calculate the point where the line meets the node circle
        if (targetNode) {
          const dx = targetNode.x - centerX;
          const dy = targetNode.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nodeRadius = targetNode.type === "Disease" ? diseaseRadius : 8;
          return targetNode.x - (dx / dist) * nodeRadius;
        }
        return 0;
      })
      .attr("y2", d => {
        const targetNode = nodes.find(n => n.id === d.target);
        // Calculate the point where the line meets the node circle
        if (targetNode) {
          const dx = targetNode.x - centerX;
          const dy = targetNode.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nodeRadius = targetNode.type === "Disease" ? diseaseRadius : 8;
          return targetNode.y - (dy / dist) * nodeRadius;
        }
        return 0;
      })
      .attr("stroke", d => relationshipTypes[d.relationship].color)
      .attr("stroke-width", d => Math.max(1, d.weight * 3))
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", d => `url(#arrow-${d.relationship})`);
    
    // Draw nodes
    const nodeGroups = svg.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Add circles for nodes
    nodeGroups.append("circle")
      .attr("r", d => d.type === "Disease" ? diseaseRadius : nodeRadius)
      .attr("fill", d => (colors || defaultColors)[d.type] || "#999")
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5)
      .style("filter", "url(#drop-shadow-preview)");
    
    // Add labels for nodes
    nodeGroups.append("text")
      .attr("dx", d => d.type === "Disease" ? 15 : 10)
      .attr("dy", ".35em")
      .attr("font-size", d => d.type === "Disease" ? "12px" : "10px")
      .attr("font-weight", d => d.type === "Disease" ? "bold" : "normal")
      .text(d => {
        // Abbreviate long names
        const maxLength = 15;
        return d.id.length > maxLength ? d.id.substring(0, maxLength) + "..." : d.id;
      });
    
    // Add weight labels for connections
    svg.selectAll(".weight-label")
      .data(links)
      .enter()
      .append("text")
      .attr("class", "weight-label")
      .attr("x", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        const targetNode = nodes.find(n => n.id === d.target);
        return sourceNode && targetNode ? (sourceNode.x + targetNode.x) / 2 : 0;
      })
      .attr("y", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        const targetNode = nodes.find(n => n.id === d.target);
        return sourceNode && targetNode ? (sourceNode.y + targetNode.y) / 2 - 10 : 0;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "#666")
      .attr("background", "white")
      .text(d => `${(d.weight * 100).toFixed(0)}%`);
    
    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 10)`);
    
    // Background for legend
    legend.append("rect")
      .attr("width", 110)
      .attr("height", 120)
      .attr("fill", "white")
      .attr("stroke", "#ddd")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("opacity", 0.9);
    
    // Legend title
    legend.append("text")
      .attr("x", 5)
      .attr("y", 15)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text("Relationship Types");
    
    // Legend entries
    Object.entries(relationshipTypes).forEach(([relType, { color }], i) => {
      legend.append("line")
        .attr("x1", 10)
        .attr("y1", 30 + i * 15)
        .attr("x2", 25)
        .attr("y2", 30 + i * 15)
        .attr("stroke", color)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 33 + i * 15)
        .attr("font-size", "8px")
        .text(relType.replace(/_/g, " "));
    });
    
  }, [diseaseName, connections, colors, defaultColors]);
  
  return (
    <div className="graph-preview-container">
      <h3>Connection Preview</h3>
      <svg ref={svgRef} className="graph-preview"></svg>
      
      <style jsx>{`
        .graph-preview-container {
          margin-top: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          background-color: white;
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 16px;
          color: #333;
        }
        
        .graph-preview {
          width: 100%;
          height: 400px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

export default DiseaseGraphPreview;