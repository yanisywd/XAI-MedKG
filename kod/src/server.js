// const express = require('express');
// const cors = require('cors');
// const { exec } = require('child_process');
// const fs = require('fs');
// const path = require('path');
// const bodyParser = require('body-parser');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json({ limit: '10mb' }));
// app.use(express.static(path.join(__dirname, 'build')));

// // Process API endpoint
// app.post('/api/process', (req, res) => {
//   const inputData = req.body;
  
//   // Create temporary input file with the GPT response
//   const inputFile = path.join(__dirname, 'temp_input.json');
//   fs.writeFileSync(inputFile, JSON.stringify(inputData));
  
//   // Define output paths
//   const predKgPath = path.join(__dirname, 'pred-kg.json');
//   const analysisPath = path.join(__dirname, 'kg_analysis_results.json');
  
//   // Define your ground truth knowledge graph path
//   const groundTruthPath = path.join(__dirname, 'knowledge_graph.json');
  
//   console.log('Step 1: Running kg_generator.py to create knowledge graph...');
  
//   // Step 1: Run the first Python script to create the knowledge graph
//   exec(`python create_kg.py "${inputFile}" "${predKgPath}"`, (error, stdout, stderr) => {
//     if (error) {
//       console.error(`Error creating knowledge graph: ${error.message}`);
//       return res.status(500).json({ error: error.message });
//     }
    
//     console.log(`Knowledge graph created: ${stdout}`);
//     console.log('Step 2: Running analyze_kg.py to generate explanations...');
    
//     // Step 2: Run the second Python script to analyze the knowledge graph
//     exec(`python analyze_kg.py "${groundTruthPath}" "${predKgPath}" "${analysisPath}"`, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error analyzing knowledge graph: ${error.message}`);
//         return res.status(500).json({ error: error.message });
//       }
      
//       console.log(`Analysis completed: ${stdout}`);
      
//       // Step 3: Read the analysis results
//       try {
//         // This file will be used by your React app
//         console.log('Step 3: Analysis file generated successfully.');
        
//         // Return success (your React app will load the file directly)
//         return res.json({ 
//           success: true, 
//           message: 'Analysis completed successfully',
//           kgPath: '/pred-kg.json',
//           analysisPath: '/kg_analysis_results.json'
//         });
//       } catch (err) {
//         console.error(`Error reading analysis results: ${err.message}`);
//         return res.status(500).json({ error: err.message });
//       }
//     });
//   });
// });

// // Serve static files
// app.get('/pred-kg.json', (req, res) => {
//   res.sendFile(path.join(__dirname, 'pred-kg.json'));
// });

// app.get('/kg_analysis_results.json', (req, res) => {
//   res.sendFile(path.join(__dirname, 'kg_analysis_results.json'));
// });

// // Serve the React app
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });







// Add this to your existing server.js or create a new file for these routes
const express = require('express');
const fs = require('fs/promises');
const path = require('path');

// If creating a new file, you'll need these imports
// const express = require('express');
// const cors = require('cors');
// const fs = require('fs/promises');
// const path = require('path');
// const app = express();
// app.use(cors());
// app.use(express.json());

// Path to your knowledge graph file
const KG_PATH = '/Users/yanis/Desktop/presentation-kod/backend/knowledge_graph.json';

// Get the reference knowledge graph
app.get('/api/graph', async (req, res) => {
  try {
    // Read the knowledge graph file
    const data = await fs.readFile(KG_PATH, 'utf8');
    
    // Parse the JSON
    const graph = JSON.parse(data);
    
    // Return the graph data
    res.json(graph);
  } catch (err) {
    console.error('Error reading knowledge graph:', err);
    res.status(500).json({ error: 'Failed to read knowledge graph file' });
  }
});

// Update the reference knowledge graph
app.post('/api/graph', async (req, res) => {
  try {
    // Get the updated graph data from the request body
    const updatedGraph = req.body;
    
    // Basic validation
    if (!updatedGraph || !updatedGraph.nodes || !updatedGraph.links || 
        !Array.isArray(updatedGraph.nodes) || !Array.isArray(updatedGraph.links)) {
      return res.status(400).json({ error: 'Invalid graph structure' });
    }
    
    // Create a backup of the current file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${KG_PATH}.backup-${timestamp}`;
    
    try {
      // Read the current file to verify it exists
      await fs.access(KG_PATH);
      
      // Create backup
      await fs.copyFile(KG_PATH, backupPath);
      console.log(`Created backup at ${backupPath}`);
    } catch (backupErr) {
      console.warn('Could not create backup, file may not exist:', backupErr);
    }
    
    // Write the updated graph to the file
    await fs.writeFile(KG_PATH, JSON.stringify(updatedGraph, null, 2));
    
    res.json({ success: true, message: 'Knowledge graph updated successfully' });
  } catch (err) {
    console.error('Error updating knowledge graph:', err);
    res.status(500).json({ error: `Failed to update knowledge graph: ${err.message}` });
  }
});

// Add a new node to the graph
app.post('/api/node', async (req, res) => {
  try {
    // Get the new node from the request body
    const { node } = req.body;
    
    // Validate node
    if (!node || !node.id || !node.type) {
      return res.status(400).json({ error: 'Invalid node data' });
    }
    
    // Read the current graph
    const data = await fs.readFile(KG_PATH, 'utf8');
    const graph = JSON.parse(data);
    
    // Check if the node ID already exists
    if (graph.nodes.some(n => n.id === node.id)) {
      return res.status(400).json({ error: 'A node with this ID already exists' });
    }
    
    // Add the new node
    graph.nodes.push(node);
    
    // Write the updated graph back to the file
    await fs.writeFile(KG_PATH, JSON.stringify(graph, null, 2));
    
    res.json({ success: true, message: 'Node added successfully' });
  } catch (err) {
    console.error('Error adding node:', err);
    res.status(500).json({ error: `Failed to add node: ${err.message}` });
  }
});

// Add a new link (relationship) to the graph
app.post('/api/link', async (req, res) => {
  try {
    // Get the new link from the request body
    const { link } = req.body;
    
    // Validate link
    if (!link || !link.source || !link.target || !link.relationship || link.weight === undefined) {
      return res.status(400).json({ error: 'Invalid link data' });
    }
    
    // Read the current graph
    const data = await fs.readFile(KG_PATH, 'utf8');
    const graph = JSON.parse(data);
    
    // Check if the source and target nodes exist
    const sourceExists = graph.nodes.some(n => n.id === link.source);
    const targetExists = graph.nodes.some(n => n.id === link.target);
    
    if (!sourceExists || !targetExists) {
      return res.status(400).json({ 
        error: !sourceExists ? `Source node "${link.source}" does not exist` : `Target node "${link.target}" does not exist`
      });
    }
    
    // Check if the link already exists
    if (graph.links.some(l => 
      l.source === link.source && 
      l.target === link.target && 
      l.relationship === link.relationship
    )) {
      return res.status(400).json({ error: 'This relationship already exists' });
    }
    
    // Add the new link
    graph.links.push(link);
    
    // Write the updated graph back to the file
    await fs.writeFile(KG_PATH, JSON.stringify(graph, null, 2));
    
    res.json({ success: true, message: 'Relationship added successfully' });
  } catch (err) {
    console.error('Error adding link:', err);
    res.status(500).json({ error: `Failed to add relationship: ${err.message}` });
  }
});

// If this is a standalone file, add:
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});