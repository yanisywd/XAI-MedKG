



























import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import PopulateGraph from './PopulateGraph';

function App() {
  // Form states
  const [gptInput, setGptInput] = useState('');
  const [showForm, setShowForm] = useState(true);
  
  // New GPT-4 integration states
  const [gptPrompt, setGptPrompt] = useState('');
  const [isGptLoading, setIsGptLoading] = useState(false);
  const [formView, setFormView] = useState('manual'); // 'manual' or 'gpt4'
  
  // Visualization states (from your KnowledgeGraphExplainer)
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('graph');
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState(new Set());
  const [activeExplanationTab, setActiveExplanationTab] = useState('summary');
  const [expandedAlternatives, setExpandedAlternatives] = useState({});
  
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // Example data for the sample button
  const exampleData = {
    "result": [
      {
        "Fever": "No",
        "Cough": "No",
        "Fatigue": "Yes", 
        "Difficulty Breathing": "No",
        "headache": "Yes",
        "nausea": "No",
        "Age": "26",
        "Gender": "Female",
        "Blood Pressure": "Normal",
        "Cholesterol Level": "High",
        "predicted disease": "Eczema"
      }
    ]
  };

  // Example medical prompt for GPT-4
  const examplePrompt = "I've been experiencing fatigue and headaches for the past week. I'm a 26-year-old female with normal blood pressure but high cholesterol. I don't have fever, cough, breathing difficulties, or nausea. What might be the issue?";

  // Configuration options (from your existing code)
  const config = {
    width: window.innerWidth - 30, // Subtract a bit for padding
    height: window.innerHeight - 130,
    nodeRadius: {
      Disease: 12,
      Symptom: 8,
      "Age Group": 8,
      Gender: 8,
      "Blood Pressure": 8,
      "Cholesterol Level": 8
    },
    colors: {
      Disease: "#e41a1c",
      Symptom: "#377eb8",
      "Age Group": "#4daf4a",
      Gender: "#984ea3",
      "Blood Pressure": "#ff7f00",
      "Cholesterol Level": "#ffff33"
    },
    sourceColors: {
      ground_truth: "#1f77b4",
      prediction: "#2ca02c",
      both: "#9467bd"
    },
    relationships: {
      HAS_SYMPTOM: "#1f77b4",
      DOES_NOT_HAVE_SYMPTOM: "#d62728", // Red for negative relationships
      COMMON_IN: "#2ca02c",
      PREVALENT_IN: "#9467bd",
      ASSOCIATED_WITH: "#ff7f0e",
      CORRELATED_WITH: "#8c564b"
    },
    noveltyColor: "#ff1493", // Bright pink for novel factors
    linkDistance: 180,
    chargeStrength: -400,
    collideForce: 1.5
  };

  // Handle GPT-4 API request
  const handleGptRequest = async () => {
    if (!gptPrompt.trim()) {
      setError('Please enter a prompt for GPT-4');
      return;
    }
    
    setIsGptLoading(true);
    setError(null);
    
    try {
      // Make API request to our backend endpoint with hardcoded API key
      const response = await fetch('http://localhost:5002/api/gpt-inference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: gptPrompt
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(`GPT-4 API Error: ${data.error}`);
        
        // If there's a raw response, show it in the input field for debugging
        if (data.raw_response) {
          setGptInput(data.raw_response);
        }
      } else {
        // If the response is already in the correct format
        if (data.result) {
          // Set the formatted response in the input field
          setGptInput(JSON.stringify(data, null, 2));
          
          // Automatically trigger analysis
          handleAnalyze(data);
        } else {
          setError('Unexpected response format from GPT-4 API. Missing "result" field.');
          // Show the raw response for debugging
          setGptInput(JSON.stringify(data, null, 2));
        }
      }
    } catch (err) {
      console.error('Error calling GPT-4 API:', err);
      setError(`Error calling GPT-4 API: ${err.message}`);
    } finally {
      setIsGptLoading(false);
    }
  };

  // Handle GPT response analysis
  const handleAnalyze = async (inputData = null) => {
    setError(null);
    setLoading(true);
    
    try {
      // If no input data is provided, parse the input JSON from the textarea
      const dataToSend = inputData || JSON.parse(gptInput);
      
      console.log("Sending request to API...");
      const response = await fetch('http://localhost:5002/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      
      console.log("Response received:", response.status);
      const result = await response.json();
      
      if (result.success) {
        // Set the data for visualization
        setAnalysisData({ visualization_data: result.data });
        setShowForm(false);
      } else {
        setError(`Analysis failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Error:", err);
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your input.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    if (formView === 'manual') {
      setGptInput(JSON.stringify(exampleData, null, 2));
    } else {
      setGptPrompt(examplePrompt);
    }
  };

  const handleNewAnalysis = () => {
    setShowForm(true);
    setAnalysisData(null);
    setGptInput('');
    setGptPrompt('');
    setError(null);
  };

  // Toggle expansion function for alternatives
  const toggleAlternativeDetails = (index) => {
    setExpandedAlternatives(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Initialize and update the graph visualization
  useEffect(() => {
    if (!analysisData || !svgRef.current || activeTab !== 'graph') return;

    const vizData = analysisData.visualization_data;
    const graphData = vizData.combined_graph;

    // Clear any existing graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up SVG container
    const svg = d3.select(svgRef.current)
      .attr("width", config.width)
      .attr("height", config.height)
      .attr("viewBox", [0, 0, config.width, config.height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "10px")
      .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
      .style("font-size", "12px")
      .style("max-width", "250px")
      .style("z-index", "10");

    // Add zoom capabilities
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create a container for the graph elements
    const container = svg.append("g")
      .attr("class", "container");

    // Create a filter for drop shadow
    const defs = container.append("defs");
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
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
    const marker = container.append("defs").selectAll("marker")
      .data(Object.entries(config.relationships))
      .enter().append("marker")
        .attr("id", d => `arrowhead-${d[0]}`)
        .attr("viewBox", "0 -2 6 4")
        .attr("refX", 15)
        .attr("refY", 0)
        .attr("markerWidth", 3)
        .attr("markerHeight", 3)
        .attr("orient", "auto")
        .append("path")
          .attr("fill", d => d[1])
          .attr("d", "M0,-2L6,0L0,2");

    const markerForNovel = container.append("defs").selectAll("marker.novel")
    .data(Object.entries(config.relationships))
    .enter().append("marker")
      .attr("id", d => `arrowhead-novel-${d[0]}`)
      .attr("viewBox", "0 -2 6 4")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 3)
      .attr("markerHeight", 3)
      .attr("orient", "auto")
      .append("path")
        .attr("fill", config.noveltyColor)
        .attr("d", "M0,-2L6,0L0,2");

    // Initialize the force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(d => {
          // Adjust distance based on relationship type
          switch(d.relationship) {
            case 'HAS_SYMPTOM': return config.linkDistance * 0.8;
            case 'COMMON_IN': return config.linkDistance * 1.0;
            case 'PREVALENT_IN': return config.linkDistance * 1.0;
            case 'ASSOCIATED_WITH': return config.linkDistance * 1.0;
            case 'CORRELATED_WITH': return config.linkDistance * 1.0;
            default: return config.linkDistance;
          }
        })
      )
      .force("charge", d3.forceManyBody().strength(d => {
        // Different charge strength based on node type
        switch(d.type) {
          case 'Disease': return config.chargeStrength * 1.5;
          case 'Symptom': return config.chargeStrength * 0.5;
          default: return config.chargeStrength;
        }
      }))
      .force("center", d3.forceCenter(config.width / 2, config.height / 2))
      .force("collide", d3.forceCollide().radius(d => config.nodeRadius[d.type] * 3).strength(config.collideForce))
      .force("x", d3.forceX(config.width / 2).strength(0.05))
      .force("y", d3.forceY(config.height / 2).strength(0.05));

    // Group links by source graph
    const linkGroups = {};
    const sourceGraphTypes = ['ground_truth', 'prediction', 'both'];
    sourceGraphTypes.forEach(source => {
      linkGroups[source] = container.append("g")
        .attr("class", `links-${source}`);
    });

    // Add links by group
    const links = {};
    sourceGraphTypes.forEach(source => {
      const filteredLinks = graphData.links.filter(d => d.source_graph === source);
      links[source] = linkGroups[source].selectAll("line")
        .data(filteredLinks)
        .enter().append("line")
          .attr("class", d => `link link-${source}${d.is_novel ? ' link-novel' : ''}`)
          .attr("stroke", d => d.is_novel ? config.noveltyColor : config.sourceColors[source])
          .attr("stroke-width", d => {
            if (source === 'both') {
              return Math.max(1.5, d.weight * 2);
            } else {
              return Math.max(0.5, d.weight * 1.5);
            }
          })
          .attr("stroke-opacity", d => {
            if (source === 'both') {
              return 0.8;
            } else {
              return 0.5;
            }
          })
          .attr("stroke-dasharray", d => {
            if (d.is_novel) {
              return "5,3"; // Special dash pattern for novel links
            }
            return source === 'prediction' ? "4" : "none";
          })
          .attr("marker-end", d => {
            if (d.is_novel) {
              return `url(#arrowhead-novel-${d.relationship})`;
            }
            return `url(#arrowhead-${d.relationship})`;
          })
          .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", d => Math.max(1.5, d.weight * 2));
    
            // Show tooltip
            let tooltipContent = `<strong>${d.source}</strong> ${d.relationship.replace(/_/g, " ")} <strong>${d.target}</strong><br>`;
            tooltipContent += `Weight: ${(d.weight * 100).toFixed(0)}%<br>`;
            tooltipContent += `Source: ${d.source_graph}`;
            
            if (d.is_novel) {
              tooltipContent += `<br><strong style="color:${config.noveltyColor}">NOVEL FACTOR</strong>`;
            }
            
            if (d.source_graph === 'both' && d.ground_truth_weight) {
              tooltipContent += `<br>Ground Truth Weight: ${(d.ground_truth_weight * 100).toFixed(0)}%`;
            }
    
            tooltip
              .html(tooltipContent)
              .style("visibility", "visible")
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          })
          .on("mouseout", function() {
            const source = d3.select(this).datum().source_graph;
            let opacity = source === 'both' ? 0.8 : 0.5;
            let width = source === 'both' ? 
              d => Math.max(1.5, d.weight * 2) : 
              d => Math.max(0.5, d.weight * 1.5);
            
            d3.select(this).attr("stroke-opacity", opacity).attr("stroke-width", width);
            tooltip.style("visibility", "hidden");
          });
    });

    // Group nodes by type
    const nodeGroups = {};
    const nodeTypes = [...new Set(graphData.nodes.map(d => d.type))];
    nodeTypes.forEach(type => {
      nodeGroups[type] = container.append("g")
        .attr("class", `nodes-${type}`);
    });

    // Add nodes by group
    const nodes = {};
    nodeTypes.forEach(type => {
      const filteredNodes = graphData.nodes.filter(d => d.type === type);
      nodes[type] = nodeGroups[type].selectAll(".node")
        .data(filteredNodes)
        .enter().append("g")
          .attr("class", `node node-${type}`)
          .call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragging)
            .on("end", dragEnded));

      nodes[type].append("circle")
        .attr("r", d => config.nodeRadius[d.type])
        .attr("fill", d => d.is_novel ? config.noveltyColor : config.colors[d.type])
        .attr("stroke", d => {
          if (d.is_novel) {
            return "#ff1493"; // Pink border for novel nodes
          } else if (d.source === 'both') {
            return "#9467bd"; // Purple for nodes in both graphs
          } else if (d.source === 'ground_truth') {
            return "#1f77b4"; // Blue for ground truth nodes
          } else {
            return "#2ca02c"; // Green for prediction nodes
          }
        })
        .attr("stroke-width", d => d.is_novel ? 3 : (d.source === 'both' ? 2.5 : 1.5))
        .style("filter", "url(#drop-shadow)")
        .style("stroke-dasharray", d => {
          if (d.is_novel) {
            return "3,1"; // Special dash pattern for novel nodes
          }
          return d.source === 'prediction' ? "2" : "none";
        })
        .on("mouseover", function(event, d) {
          // Highlight the node
          d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);

          // Show tooltip
          let tooltipContent = `<strong>${d.id}</strong><br>Type: ${d.type}<br>Source: ${d.source}`;
          
          if (d.is_novel) {
            tooltipContent += `<br><strong style="color:${config.noveltyColor}">NOVEL FACTOR</strong>`;
          }
          
          // Add additional properties if available
          Object.entries(d).forEach(([key, value]) => {
            if (!["id", "type", "x", "y", "vx", "vy", "index", "source", "is_novel"].includes(key)) {
              tooltipContent += `<br>${key}: ${value}`;
            }
          });
          
          tooltip
            .html(tooltipContent)
            .style("visibility", "visible")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          const d = d3.select(this).datum();
          let strokeColor;
          
          if (d.is_novel) {
            strokeColor = config.noveltyColor;
          } else if (d.source === 'both') {
            strokeColor = "#9467bd"; // Purple for nodes in both graphs
          } else if (d.source === 'ground_truth') {
            strokeColor = "#1f77b4"; // Blue for ground truth nodes
          } else {
            strokeColor = "#2ca02c"; // Green for prediction nodes
          }
          
          const strokeWidth = d.is_novel ? 3 : (d.source === 'both' ? 2.5 : 1.5);
          
          d3.select(this).attr("stroke", strokeColor).attr("stroke-width", strokeWidth);
          tooltip.style("visibility", "hidden");
        })
        .on("click", function(event, d) {
          event.stopPropagation();
          setSelectedNode(d);
          handleNodeClick(d);
        });

      // Add labels to nodes with different font sizes based on type
      nodes[type].append("text")
        .attr("dx", d => {
          // Position text differently based on node type
          if (d.type === 'Disease') {
            return config.nodeRadius[d.type] + 3;
          } else {
            return config.nodeRadius[d.type] + 3;
          }
        })
        .attr("dy", ".35em")
        .text(d => {
          // Truncate long node names
          const maxLength = d.type === 'Disease' ? 15 : 20;
          return d.id.length > maxLength ? d.id.substring(0, maxLength) + '...' : d.id;
        })
        .attr("font-size", d => {
          // Different font sizes based on node type
          return d.type === 'Disease' ? "10px" : "8px";
        })
        .attr("font-weight", d => d.type === 'Disease' ? "bold" : "normal")
        .attr("fill", "#333")
        .style("pointer-events", "none");
    });

    // Handle node click
    function handleNodeClick(d) {
      // Collect connected nodes and links
      const connectedNodes = new Set([d.id]);
      const connectedLinks = new Set();
      
      graphData.links.forEach((link) => {
        if (link.source.id === d.id || link.source === d.id || 
            link.target.id === d.id || link.target === d.id) {
          connectedLinks.add(link);
          connectedNodes.add(typeof link.source === 'object' ? link.source.id : link.source);
          connectedNodes.add(typeof link.target === 'object' ? link.target.id : link.target);
        }
      });
      
      setHighlightedNodes(connectedNodes);
      setHighlightedLinks(connectedLinks);
      
      // Update visual appearance for all links
      Object.values(links).forEach(linkGroup => {
        linkGroup.attr("stroke-opacity", link => 
          connectedLinks.has(link) ? 1 : (link.source_graph === 'both' ? 0.3 : 0.1)
        ).attr("stroke-width", link => 
          connectedLinks.has(link) ? 
            (link.source_graph === 'both' ? Math.max(2, link.weight * 2.5) : Math.max(1, link.weight * 2)) : 
            (link.source_graph === 'both' ? Math.max(1, link.weight * 1.5) : Math.max(0.3, link.weight * 0.8))
        );
      });

      // Update visual appearance for all nodes
      Object.values(nodes).forEach(nodeGroup => {
        nodeGroup.selectAll("circle").attr("opacity", node => 
          connectedNodes.has(node.id) ? 1 : 0.2
        ).attr("r", node => 
          node.id === d.id ? config.nodeRadius[node.type] * 1.3 : config.nodeRadius[node.type]
        );
        
        nodeGroup.selectAll("text").attr("opacity", node => 
          connectedNodes.has(node.id) ? 1 : 0.2
        ).attr("font-weight", node => 
          node.id === d.id ? "bold" : node.type === 'Disease' ? "bold" : "normal"
        );
      });

      // Display node info in a panel
      updateInfoPanel(d, connectedNodes, connectedLinks);
    }

    // Update info panel with selected node details
    function updateInfoPanel(node, connectedNodes, connectedLinks) {
      // Remove existing info panel
      d3.select(".info-panel").remove();
      
      // Create new info panel
      const infoPanel = svg.append("g")
        .attr("class", "info-panel")
        .attr("transform", `translate(20, ${config.height - 180})`);
      
      // Add background rectangle
      infoPanel.append("rect")
        .attr("width", 320)
        .attr("height", 160)
        .attr("fill", "white")
        .attr("stroke", "#ddd")
        .attr("rx", 5)
        .attr("ry", 5)
        .style("filter", "url(#drop-shadow)");
      
      // Node color indicator
      const nodeColor = node.type ? config.colors[node.type] : "#999";
      infoPanel.append("circle")
        .attr("cx", 20)
        .attr("cy", 20)
        .attr("r", 8)
        .attr("fill", nodeColor)
        .attr("stroke", node.source === 'both' ? "#9467bd" : 
                       (node.source === 'ground_truth' ? "#1f77b4" : "#2ca02c"))
        .attr("stroke-width", node.source === 'both' ? 2.5 : 1.5)
        .style("stroke-dasharray", node.source === 'prediction' ? "2" : "none");
      
      // Add title
      infoPanel.append("text")
        .attr("x", 35)
        .attr("y", 25)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(`${node.id} (${node.type})`);
      
      // Add source info
      const sourceText = node.source === 'both' ? 
        "Appears in both ground truth and prediction" :
        (node.source === 'ground_truth' ? 
          "Only appears in ground truth" : 
          "Only appears in prediction");
          
      infoPanel.append("text")
        .attr("x", 20)
        .attr("y", 45)
        .attr("font-size", "12px")
        .attr("fill", node.source === 'both' ? "#9467bd" : 
                     (node.source === 'ground_truth' ? "#1f77b4" : "#2ca02c"))
        .text(sourceText);
      
      // Add connection info
      infoPanel.append("text")
        .attr("x", 20)
        .attr("y", 65)
        .attr("font-size", "12px")
        .text(`Connected to ${connectedNodes.size - 1} entities with ${connectedLinks.size} relationships`);
      
      // Group relationships by source and type
      const relationshipsBySource = {
        both: {},
        ground_truth: {},
        prediction: {}
      };
      
      connectedLinks.forEach(link => {
        if ((typeof link.source === 'object' ? link.source.id : link.source) === node.id) {
          // Outgoing links
          const relType = link.relationship;
          const source = link.source_graph;
          
          if (!relationshipsBySource[source][relType]) {
            relationshipsBySource[source][relType] = [];
          }
          
          relationshipsBySource[source][relType].push({
            target: (typeof link.target === 'object' ? link.target.id : link.target),
            weight: link.weight
          });
        } else {
          // Incoming links (reverse relationship name)
          const relType = "IS_" + link.relationship + "_OF";
          const source = link.source_graph;
          
          if (!relationshipsBySource[source][relType]) {
            relationshipsBySource[source][relType] = [];
          }
          
          relationshipsBySource[source][relType].push({
            target: (typeof link.source === 'object' ? link.source.id : link.source),
            weight: link.weight
          });
        }
      });
      
      // Add relationship breakdown by source
      let y = 85;
      const sourceLabels = {
        both: "Shared Relationships:",
        ground_truth: "Ground Truth Only:",
        prediction: "Prediction Only:"
      };
      
      const sourceOrder = ['both', 'ground_truth', 'prediction'];
      
      sourceOrder.forEach(source => {
        const relTypes = Object.keys(relationshipsBySource[source]);
        if (relTypes.length > 0) {
          // Add source header
          infoPanel.append("text")
            .attr("x", 20)
            .attr("y", y)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", config.sourceColors[source])
            .text(sourceLabels[source]);
          
          y += 18;
          
          // Add relationships for this source
          relTypes.forEach(relType => {
            const entities = relationshipsBySource[source][relType];
            
            // Format relationship name
            const relName = relType
              .replace(/IS_|_OF/g, ' ')
              .replace(/_/g, ' ')
              .trim();
            
            infoPanel.append("text")
              .attr("x", 30)
              .attr("y", y)
              .attr("font-size", "11px")
              .attr("fill", "#333")
              .text(`${relName}:`);
            
            // Display entities
            const displayText = entities.map(e => `${e.target} (${(e.weight * 100).toFixed(0)}%)`).join(", ");
            
            infoPanel.append("text")
              .attr("x", 40)
              .attr("y", y + 12)
              .attr("font-size", "10px")
              .attr("fill", "#666")
              .text(displayText.length > 40 ? displayText.substring(0, 37) + "..." : displayText);
            
            y += 25;
          });
        }
      });
      
      // Resize panel if needed
      const panelHeight = Math.max(160, y - 65);
      infoPanel.select("rect")
        .attr("height", panelHeight);
    }

    // Reset button
    const resetButton = svg.append("g")
      .attr("class", "reset-button")
      .attr("transform", `translate(${config.width - 120}, 20)`)
      .style("cursor", "pointer")
      .on("click", function() {
        // Reset selection
        setSelectedNode(null);
        setHighlightedNodes(new Set());
        setHighlightedLinks(new Set());
        
        // Reset node appearance
        Object.values(nodes).forEach(nodeGroup => {
          nodeGroup.selectAll("circle")
            .attr("opacity", 1)
            .attr("r", d => config.nodeRadius[d.type]);
          
          nodeGroup.selectAll("text")
            .attr("opacity", 1)
            .attr("font-weight", d => d.type === 'Disease' ? "bold" : "normal");
        });
        
        // Reset link appearance
        Object.entries(links).forEach(([source, linkGroup]) => {
          let opacity = source === 'both' ? 0.8 : 0.5;
          let width = source === 'both' ? 
            d => Math.max(1.5, d.weight * 2) : 
            d => Math.max(0.5, d.weight * 1.5);
          
          linkGroup
            .attr("stroke-opacity", opacity)
            .attr("stroke-width", width);
        });
        
        // Remove info panel
        d3.select(".info-panel").remove();
        
        // Reset zoom
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
      });
    
    resetButton.append("rect")
      .attr("width", 100)
      .attr("height", 30)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "white")
      .attr("stroke", "#ddd");
    
    resetButton.append("text")
      .attr("x", 50)
      .attr("y", 19)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text("Reset View");

    // Drag functions
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragging(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Update positions on each simulation tick
    simulation.on("tick", () => {
      // Update links
      Object.values(links).forEach(linkGroup => {
        linkGroup
          .attr("x1", d => typeof d.source === 'object' ? d.source.x : d.x)
          .attr("y1", d => typeof d.source === 'object' ? d.source.y : d.y)
          .attr("x2", d => typeof d.target === 'object' ? d.target.x : d.x)
          .attr("y2", d => typeof d.target === 'object' ? d.target.y : d.y);
      });

      // Update nodes
      Object.values(nodes).forEach(nodeGroup => {
        nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
      });
    });
    
    // Create legend
    const createLegend = () => {
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20, 20)");
      
      // Background rectangle
      legend.append("rect")
        .attr("width", 170)
        .attr("height", 150) // Increased height to accommodate novel factors
        .attr("fill", "white")
        .attr("opacity", 0.9)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("stroke", "#ddd");
      
      // Title
      legend.append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("Legend");
      
      // Source types
      legend.append("text")
        .attr("x", 10)
        .attr("y", 40)
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text("Source");
      
      const sourceTypes = [
        { id: "ground_truth", label: "Ground Truth Only" },
        { id: "prediction", label: "Prediction Only" },
        { id: "both", label: "Both Sources" }
      ];
      
      sourceTypes.forEach((source, i) => {
        // Line for links
        legend.append("line")
          .attr("x1", 15)
          .attr("y1", 52 + i * 15)
          .attr("x2", 35)
          .attr("y2", 52 + i * 15)
          .attr("stroke", config.sourceColors[source.id])
          .attr("stroke-width", source.id === 'both' ? 2 : 1.5)
          .attr("stroke-dasharray", source.id === 'prediction' ? "4" : "none");
        
        // Text label
        legend.append("text")
          .attr("x", 40)
          .attr("y", 55 + i * 15)
          .attr("font-size", "9px")
          .text(source.label);
      });
      
      // Novel factor indicator
      legend.append("line")
        .attr("x1", 15)
        .attr("y1", 52 + sourceTypes.length * 15)
        .attr("x2", 35)
        .attr("y2", 52 + sourceTypes.length * 15)
        .attr("stroke", config.noveltyColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,3");
      
      legend.append("text")
        .attr("x", 40)
        .attr("y", 55 + sourceTypes.length * 15)
        .attr("font-size", "9px")
        .text("Novel Factor");
      
      // Node type colors
      legend.append("text")
        .attr("x", 10)
        .attr("y", 100)
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text("Node Types");
      
      const mainNodeTypes = ["Disease", "Symptom"];
      
      mainNodeTypes.forEach((type, i) => {
        // Circle for node
        legend.append("circle")
          .attr("cx", 18)
          .attr("cy", 113 + i * 15)
          .attr("r", type === "Disease" ? 6 : 5)
          .attr("fill", config.colors[type]);
        
        // Text label
        legend.append("text")
          .attr("x", 30)
          .attr("y", 116 + i * 15)
          .attr("font-size", "9px")
          .text(type);
        
        if (i === 0) {
          legend.append("circle")
            .attr("cx", 100)
            .attr("cy", 113)
            .attr("r", 6)
            .attr("fill", config.colors["Age Group"]);
          
          legend.append("text")
            .attr("x", 112)
            .attr("y", 116)
            .attr("font-size", "9px")
            .text("Other Types");
        }
      });
      
      // Add novel node example
      legend.append("circle")
        .attr("cx", 18)
        .attr("cy", 113 + mainNodeTypes.length * 15)
        .attr("r", 5)
        .attr("fill", config.noveltyColor)
        .attr("stroke", config.noveltyColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,1");
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 116 + mainNodeTypes.length * 15)
        .attr("font-size", "9px")
        .text("Novel Factor");
    };
    
    createLegend();
    
    // Add title with metrics
    const createTitle = () => {
      const metrics = vizData.assessment;
      const title = svg.append("g")
        .attr("class", "title")
        .attr("transform", `translate(${config.width / 2 - 200}, 20)`);
      
      // Background
      title.append("rect")
        .attr("width", 400)
        .attr("height", 70)
        .attr("fill", "white")
        .attr("opacity", 0.9)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("stroke", "#ddd");
      
      // Title text
      title.append("text")
        .attr("x", 200)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(`Knowledge Graph Association Analysis`);
      
      // Disease
      title.append("text")
        .attr("x", 200)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text(`Predicted Disease: ${metrics.predicted_disease}`);
      
      // Assessment
      const getAssessmentColor = (assessment) => {
        switch(assessment) {
          case 'STRONG MATCH': return "#2ca02c";
          case 'PARTIAL MATCH': return "#ff7f0e";
          case 'WEAK MATCH': return "#d62728";
          default: return "#666";
        }
      };
      
      title.append("text")
        .attr("x", 200)
        .attr("y", 62)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", getAssessmentColor(metrics.assessment))
        .text(`Assessment: ${metrics.assessment}`);
    };
    
    createTitle();
    
    // Run the simulation for a few seconds then stop it
    setTimeout(() => {
      simulation.alpha(0).stop();
    }, 3000);
    
    // Clean up on unmount
    return () => {
      simulation.stop();
    };
  }, [analysisData, activeTab]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        d3.select(svgRef.current)
          .attr("width", window.innerWidth - 30)  // Subtract padding
          .attr("height", window.innerHeight - 130);  // Subtract header and tabs
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render the metrics panel
  const renderMetricsPanel = () => {
    if (!analysisData) return null;
    
    const { assessment } = analysisData.visualization_data;
    
    // Get color based on score
    const getScoreColor = (score) => {
      if (score >= 0.8) return "#2ca02c"; // Green
      if (score >= 0.5) return "#ff7f0e"; // Orange
      return "#d62728"; // Red
    };
    
    return (
      <div className="metrics-panel">
        <h3>Association Assessment for {assessment.predicted_disease}</h3>
        
        <div className="assessment-badge" style={{ backgroundColor: getScoreColor(assessment.confidence_score) }}>
          {assessment.assessment}
        </div>
        
        <div className="reliability-badge" style={{ 
          backgroundColor: assessment.reliability === "HIGH" ? "#2ca02c" : 
                          assessment.reliability === "MEDIUM" ? "#ff7f0e" : "#d62728"
        }}>
          Reliability: {assessment.reliability}
        </div>
        
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Association Accuracy</div>
            <div className="metric-value" style={{ color: getScoreColor(assessment.reasoning_accuracy) }}>
              {(assessment.reasoning_accuracy * 100).toFixed(1)}%
            </div>
            <div className="metric-desc">Percentage of valid Association steps</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Semantic Similarity</div>
            <div className="metric-value" style={{ color: getScoreColor(assessment.semantic_similarity) }}>
              {(assessment.semantic_similarity * 100).toFixed(1)}%
            </div>
            <div className="metric-desc">Match between prediction and ground truth</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Factor Coverage</div>
            <div className="metric-value" style={{ color: getScoreColor(assessment.factor_coverage) }}>
              {(assessment.factor_coverage * 100).toFixed(1)}%
            </div>
            <div className="metric-desc">Important factors identified</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Novelty</div>
            <div className="metric-value" style={{ color: assessment.novelty > 0.5 ? "#ff7f0e" : "#2ca02c" }}>
              {(assessment.novelty * 100).toFixed(1)}%
            </div>
            <div className="metric-desc">New factors introduced by the model</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Overall Confidence</div>
            <div className="metric-value" style={{ color: getScoreColor(assessment.confidence_score) }}>
              {(assessment.confidence_score * 100).toFixed(1)}%
            </div>
            <div className="metric-desc">Combined confidence in the Association</div>
          </div>
        </div>
      </div>
    );
  };

  // Render the explanation panel
  const renderExplanationPanel = () => {
    if (!analysisData) return null;
    
    const { explanations } = analysisData.visualization_data;
    
    return (
      <div className="explanation-panel">
        <div className="explanation-tabs">
          <button 
            className={activeExplanationTab === 'summary' ? 'active' : ''} 
            onClick={() => setActiveExplanationTab('summary')}
          >
            Summary
          </button>
          <button 
            className={activeExplanationTab === 'details' ? 'active' : ''} 
            onClick={() => setActiveExplanationTab('details')}
          >
            Detailed Analysis
          </button>
          <button 
            className={activeExplanationTab === 'counterfactual' ? 'active' : ''} 
            onClick={() => setActiveExplanationTab('counterfactual')}
          >
            What-If Analysis
          </button>
        </div>
        
        <div className="explanation-content">
          {activeExplanationTab === 'summary' && (
            <div className="summary-content">
              <pre>{explanations.summary}</pre>
            </div>
          )}
          
          {activeExplanationTab === 'details' && (
            <div className="details-content">
              <h4>Correct Association</h4>
              {explanations.valid_reasoning.length === 0 ? (
                <p className="no-items">No valid Association steps identified.</p>
              ) : (
                <ul className="explanation-list">
                  {explanations.valid_reasoning.map((item, index) => (
                    <li key={`valid-${index}`} className="valid-item">
                      <span className="checkmark">✓</span> {item.explanation}
                    </li>
                  ))}
                </ul>
              )}
              
              <h4>Incorrect Association</h4>
              {explanations.invalid_reasoning.length === 0 ? (
                <p className="no-items">No invalid Association steps identified.</p>
              ) : (
                <ul className="explanation-list">
                  {explanations.invalid_reasoning.map((item, index) => (
                    <li key={`invalid-${index}`} className="invalid-item">
                      <span className="x-mark">✗</span> {item.explanation}
                    </li>
                  ))}
                </ul>
              )}
              
              {/* New section for novel factors */}
              <h4>Novel Factors Introduced</h4>
              {!explanations.novel_reasoning || explanations.novel_reasoning.length === 0 ? (
                <p className="no-items">No novel factors were introduced.</p>
              ) : (
                <ul className="explanation-list">
                  {explanations.novel_reasoning.map((item, index) => (
                    <li key={`novel-${index}`} className="novel-item">
                      <span className="novel-mark">★</span> {item.explanation}
                    </li>
                  ))}
                </ul>
              )}
              
              <h4>Missing Important Factors</h4>
              {!explanations.missing_factors || explanations.missing_factors.length === 0 ? (
                <p className="no-items">No important factors were missed.</p>
              ) : (
                <ul className="explanation-list">
                  {explanations.missing_factors.map((item, index) => (
                    <li 
                      key={`missing-${index}`} 
                      className={item.is_key_symptom ? "missing-item missing-key-symptom" : "missing-item"}
                    >
                      <span className="warning-mark">{item.is_key_symptom ? "⚠️" : "⚠"}</span> {item.explanation}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {activeExplanationTab === 'counterfactual' && (
            <div style={{padding: '20px', maxWidth: '900px', margin: '0 auto'}}>
              {analysisData.visualization_data.counterfactuals.minimal_changes ? (
                <>
                  <h4 style={{fontSize: '18px', margin: '0 0 15px 0', color: '#333'}}>Alternative Diagnosis Analysis</h4>
                  <div style={{marginBottom: '20px'}}>
                    <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: 1.5, backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px'}}>
                      {analysisData.visualization_data.counterfactuals.minimal_changes.explanation}
                    </pre>
                  </div>
                  
                  <h4 style={{fontSize: '18px', margin: '20px 0 15px 0', color: '#333'}}>Other Possible Diagnoses</h4>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px'}}>
                    {analysisData.visualization_data.counterfactuals.alternatives.map((alt, index) => (
                      <div key={`alt-${index}`} style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginBottom: '20px'
                      }}>
                        <h5 style={{
                          color: '#3b82f6',
                          fontSize: '18px',
                          marginTop: 0,
                          marginBottom: '12px',
                          fontWeight: 600
                        }}>{alt.alternative_disease}</h5>
                        
                        <div style={{
                          fontWeight: 600,
                          fontSize: '16px',
                          marginBottom: '8px',
                          color: '#333'
                        }}>Similarity: {(alt.similarity * 100).toFixed(1)}%</div>
                        
                        <div style={{
                          color: '#4b5563',
                          marginBottom: '16px',
                          fontSize: '13px'
                        }}>
                          {alt.changes_needed.length} changes needed 
                          ({alt.changes_needed.filter(c => c.action === 'add').length} additions, 
                          {alt.changes_needed.filter(c => c.action === 'remove').length} removals)
                        </div>
                        
                        <button 
                          onClick={() => toggleAlternativeDetails(index)}
                          style={{
                            backgroundColor: '#f5f7fa',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            color: '#4a5568',
                            fontWeight: 500,
                            display: 'block',
                            width: '100%',
                            textAlign: 'center',
                            marginTop: '10px'
                          }}
                        >
                          {expandedAlternatives[index] ? 'Hide Details' : 'Show Details'}
                        </button>
                        
                        {expandedAlternatives[index] && (
                          <div style={{
                            marginTop: '16px',
                            paddingTop: '12px',
                            borderTop: '1px dashed #e2e8f0'
                          }}>
                            {alt.changes_needed.filter(c => c.action === 'add').length > 0 && (
                              <>
                                <h6 style={{
                                  margin: '12px 0 10px 0',
                                  fontSize: '14px',
                                  color: '#4a5568',
                                  fontWeight: 600
                                }}>Additions Needed:</h6>
                                
                                <ul style={{
                                  listStyleType: 'none',
                                  padding: 0,
                                  margin: '0 0 16px 0'
                                }}>
                                  {alt.changes_needed
                                    .filter(change => change.action === 'add')
                                    .map((change, changeIndex) => (
                                      <li key={`add-${changeIndex}`} style={{
                                        padding: '8px',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        backgroundColor: '#f0fff4',
                                        borderRadius: '6px',
                                        borderLeft: '3px solid #2ca02c',
                                        lineHeight: 1.5
                                      }}>
                                        <span style={{
                                          color: '#2ca02c',
                                          fontWeight: 'bold',
                                          marginRight: '10px',
                                          fontSize: '16px',
                                          lineHeight: 1.5
                                        }}>+</span>
                                        
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          flex: 1
                                        }}>
                                          <div>
                                            <strong>{change.factor}</strong> <span style={{
                                              color: '#64748b',
                                              fontWeight: 'normal',
                                              marginRight: '5px'
                                            }}>({change.factor_type})</span>
                                          </div>
                                          
                                          <span style={{
                                            color: '#64748b',
                                            fontStyle: 'italic',
                                            display: 'block',
                                            marginTop: '2px',
                                            fontSize: '12px'
                                          }}>
                                            {change.relationship.replace(/_/g, ' ').toLowerCase()}
                                          </span>
                                        </div>
                                      </li>
                                    ))
                                  }
                                </ul>
                              </>
                            )}
                            
                            {alt.changes_needed.filter(c => c.action === 'remove').length > 0 && (
                              <>
                                <h6 style={{
                                  margin: '12px 0 10px 0',
                                  fontSize: '14px',
                                  color: '#4a5568',
                                  fontWeight: 600
                                }}>Removals Needed:</h6>
                                
                                <ul style={{
                                  listStyleType: 'none',
                                  padding: 0,
                                  margin: '0 0 16px 0'
                                }}>
                                  {alt.changes_needed
                                    .filter(change => change.action === 'remove')
                                    .map((change, changeIndex) => (
                                      <li key={`remove-${changeIndex}`} style={{
                                        padding: '8px',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        backgroundColor: '#fff5f5',
                                        borderRadius: '6px',
                                        borderLeft: '3px solid #d62728',
                                        lineHeight: 1.5
                                      }}>
                                        <span style={{
                                          color: '#d62728',
                                          fontWeight: 'bold',
                                          marginRight: '10px',
                                          fontSize: '16px',
                                          lineHeight: 1.5
                                        }}>-</span>
                                        
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          flex: 1
                                        }}>
                                          <div>
                                            <strong>{change.factor}</strong> <span style={{
                                              color: '#64748b',
                                              fontWeight: 'normal',
                                              marginRight: '5px'
                                            }}>({change.factor_type})</span>
                                          </div>
                                          
                                          <span style={{
                                            color: '#64748b',
                                            fontStyle: 'italic',
                                            display: 'block',
                                            marginTop: '2px',
                                            fontSize: '12px'
                                          }}>
                                            {change.relationship.replace(/_/g, ' ').toLowerCase()}
                                          </span>
                                        </div>
                                      </li>
                                    ))
                                  }
                                </ul>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>No counterfactual analysis available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <header style={{ 
        backgroundColor: '#4a90e2', 
        color: 'white', 
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Knowledge Graph Medical Explainer</h1>
        
        {!showForm && (
          <button
            onClick={handleNewAnalysis}
            style={{
              backgroundColor: 'white',
              color: '#4a90e2',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            New Analysis
          </button>
        )}
      </header>

      <main style={{ 
        padding: '15px',
        width: '100%',
        maxWidth: 'none',
        margin: '0'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>Processing GPT response...</p>
            <p>This may take a few moments while we analyze the knowledge graph.</p>
          </div>
        ) : isGptLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>Generating response from GPT-4...</p>
            <p>This may take a few moments while we wait for the API to respond.</p>
          </div>
        ) : showForm ? (
          <div>
            {/* Input method toggle */}
            <div style={{ 
              display: 'flex', 
              marginBottom: '15px', 
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #ddd'
            }}>
              <button
                onClick={() => setFormView('manual')}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: formView === 'manual' ? '#4a90e2' : 'transparent',
                  color: formView === 'manual' ? 'white' : '#333',
                  border: 'none',
                  borderRight: '1px solid #ddd',
                  cursor: 'pointer',
                  fontWeight: formView === 'manual' ? 'bold' : 'normal'
                }}
              >
                Paste JSON Response
              </button>
              <button
                onClick={() => setFormView('gpt4')}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: formView === 'gpt4' ? '#4a90e2' : 'transparent',
                  color: formView === 'gpt4' ? 'white' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: formView === 'gpt4' ? 'bold' : 'normal'
                }}
              >
                Generate with GPT-4
              </button>
            </div>

            {formView === 'manual' ? (
              <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2>Input GPT Response</h2>
                <div style={{ marginBottom: '15px' }}>
                  <textarea
                    value={gptInput}
                    onChange={(e) => setGptInput(e.target.value)}
                    placeholder="Paste your GPT response JSON here..."
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleAnalyze()}
                    style={{
                      backgroundColor: '#4a90e2',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Analyze
                  </button>
                  
                  <button
                    onClick={loadExample}
                    style={{
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #ddd',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Load Example
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2>Generate with GPT-4</h2>
                <p style={{ color: '#666', marginBottom: '15px' }}>
                  Enter a medical scenario for GPT-4 to analyze and diagnose. The model will generate a structured JSON response that will be automatically processed.
                </p>
                
                <div style={{ marginBottom: '15px' }}>
                  <textarea
                    value={gptPrompt}
                    onChange={(e) => setGptPrompt(e.target.value)}
                    placeholder="Describe patient symptoms and medical history..."
                    style={{
                      width: '100%',
                      minHeight: '150px',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontFamily: 'sans-serif'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleGptRequest}
                    disabled={isGptLoading}
                    style={{
                      backgroundColor: '#4a90e2',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: isGptLoading ? 'not-allowed' : 'pointer',
                      opacity: isGptLoading ? 0.7 : 1
                    }}
                  >
                    {isGptLoading ? 'Generating...' : 'Generate & Analyze'}
                  </button>
                  
                  <button
                    onClick={loadExample}
                    style={{
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #ddd',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Load Example Prompt
                  </button>
                </div>
                
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  <strong>Note:</strong> GPT-4 is instructed to respond with a structured JSON format that includes symptom analysis and a predicted disease.
                </div>
              </div>
            )}
            
            {error && (
              <div style={{
                color: 'red',
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#ffeeee',
                borderRadius: '4px'
              }}>
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="kg-explainer">
            <div className="tabs">
              <button 
                className={activeTab === 'graph' ? 'active' : ''} 
                onClick={() => setActiveTab('graph')}
              >
                Knowledge Graph
              </button>
              <button 
                className={activeTab === 'metrics' ? 'active' : ''} 
                onClick={() => setActiveTab('metrics')}
              >
                Association Metrics
              </button>
              <button 
                className={activeTab === 'explanation' ? 'active' : ''} 
                onClick={() => setActiveTab('explanation')}
              >
                AI Explanation
              </button>
              <button 
    className={activeTab === 'populate' ? 'active' : ''} 
    onClick={() => setActiveTab('populate')}
  >
    Populate Graph
  </button>
            </div>
            
            <div className="content">
  {activeTab === 'graph' && (
    <div className="graph-container">
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  )}
  
  {activeTab === 'metrics' && renderMetricsPanel()}
  
  {activeTab === 'explanation' && renderExplanationPanel()}
  
  {activeTab === 'populate' && <PopulateGraph />}
</div>
          </div>
        )}
      </main>
      
      <style jsx>{`
        .kg-explainer {
          width: 100%;
          height: 90vh;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
        }
        .tabs {
          display: flex;
          background-color: #f5f5f5;
          border-bottom: 1px solid #ddd;
          padding: 10px 20px;
          height: 50px;
        }
        
        .tabs button {
          background: transparent;
          border: none;
          padding: 8px 15px;
          margin-right: 5px;
          cursor: pointer;
          font-size: 14px;
          border-radius: 4px;
          outline: none;
        }
        
        .tabs button.active {
          background-color: #fff;
          border: 1px solid #ddd;
          border-bottom: 2px solid #4a90e2;
          font-weight: bold;
        }
        
        .content {
          flex: 1;
          overflow: auto;
          position: relative;
          height: calc(100vh - 130px);
        }
        
        .graph-container {
          width: 100%;
          height: 100%;
          min-height: calc(100vh - 130px);
          background-color: #f9f9f9;
        }
        
        svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        
        .loading, .error {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          font-size: 18px;
          color: #666;
          text-align: center;
          padding: 20px;
        }
        
        .error {
          color: #e41a1c;
        }
        
        .metrics-panel {
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .metrics-panel h3 {
          text-align: center;
          margin-bottom: 20px;
          color: #333;
        }
        
        .assessment-badge, .reliability-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          color: white;
          font-weight: bold;
          margin: 0 10px 20px 0;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .metric-item {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 15px;
          background-color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .metric-label {
          font-weight: bold;
          font-size: 14px;
          color: #555;
          margin-bottom: 8px;
        }
        
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .metric-desc {
          font-size: 12px;
          color: #777;
        }
        
        .explanation-panel {
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .explanation-tabs {
          display: flex;
          border-bottom: 1px solid #ddd;
          margin-bottom: 20px;
        }
        
        .explanation-tabs button {
          background: transparent;
          border: none;
          padding: 8px 15px;
          margin-right: 5px;
          cursor: pointer;
          font-size: 14px;
          border-radius: 4px 4px 0 0;
          outline: none;
        }
        
        .explanation-tabs button.active {
          background-color: #fff;
          border: 1px solid #ddd;
          border-bottom: 2px solid #4a90e2;
          font-weight: bold;
        }
        
        .explanation-content {
          background-color: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 20px;
          min-height: 400px;
        }
        
        .summary-content pre {
          white-space: pre-wrap;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .explanation-list {
          list-style-type: none;
          padding: 0;
        }
        
        .explanation-list li {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .checkmark {
          color: #2ca02c;
          font-weight: bold;
          margin-right: 5px;
        }
        
        .x-mark {
          color: #d62728;
          font-weight: bold;
          margin-right: 5px;
        }
        
        .warning-mark {
          color: #ff7f0e;
          font-weight: bold;
          margin-right: 5px;
        }
        
        .no-items {
          color: #999;
          font-style: italic;
        }
        
        .counterfactual-explanation pre {
          white-space: pre-wrap;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
        }
        
        .alternatives-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 10px;
        }
        
        .alternative-item {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 15px;
          background-color: #f9f9f9;
        }
        
        .alternative-item h5 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #4a90e2;
        }
        
        .similarity {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .changes-count {
          font-size: 12px;
          color: #666;
        }

        .novel-mark {
          color: #ff1493;
          font-weight: bold;
          margin-right: 5px;
        }

        .missing-item {
          color: #ff7f0e;
        }

        .missing-key-symptom {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default App;





