// import React, { useState, useEffect } from 'react';
// import DiseaseGraphPreview from './DiseaseGraphPreview';

// function PopulateGraph() {
//   // State for form data
//   const [diseaseName, setDiseaseName] = useState('');
//   const [diseaseAction, setDiseaseAction] = useState('add'); // 'add' or 'modify'
//   const [existingDiseases, setExistingDiseases] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState(false);
//   const [error, setError] = useState(null);
  
//   // State for connections (relationships)
//   const [symptoms, setSymptoms] = useState({
//     Fever: { connected: false, weight: 0.5 },
//     Cough: { connected: false, weight: 0.5 },
//     Fatigue: { connected: false, weight: 0.5 },
//     'Difficulty Breathing': { connected: false, weight: 0.5 },
//     Headache: { connected: false, weight: 0.5 },
//     Nausea: { connected: false, weight: 0.5 }
//   });
  
//   // State for new symptom input
//   const [newSymptomName, setNewSymptomName] = useState('');
//   const [customSymptoms, setCustomSymptoms] = useState([]);
  
//   const [ageGroups, setAgeGroups] = useState({
//     'Child Age': { connected: false, weight: 0.3 },
//     'Young Adult Age': { connected: false, weight: 0.3 },
//     'Middle Aged Age': { connected: false, weight: 0.3 },
//     'Senior Age': { connected: false, weight: 0.3 }
//   });
  
//   const [genders, setGenders] = useState({
//     'Male Gender': { connected: false, weight: 0.5 },
//     'Female Gender': { connected: false, weight: 0.5 }
//   });
  
//   const [bloodPressures, setBloodPressures] = useState({
//     'High Blood Pressure': { connected: false, weight: 0.3 },
//     'Low Blood Pressure': { connected: false, weight: 0.3 },
//     'Normal Blood Pressure': { connected: false, weight: 0.3 }
//   });
  
//   const [cholesterolLevels, setCholesterolLevels] = useState({
//     'High Cholesterol': { connected: false, weight: 0.3 },
//     'Low Cholesterol': { connected: false, weight: 0.3 },
//     'Normal Cholesterol': { connected: false, weight: 0.3 }
//   });
  
//   // Load existing diseases and symptoms on component mount
//   useEffect(() => {
//     // Fetch existing diseases from backend
//     const fetchData = async () => {
//       try {
//         // Fetch diseases
//         const diseasesResponse = await fetch('http://localhost:5002/api/diseases');
//         const diseasesData = await diseasesResponse.json();
//         if (diseasesData.success) {
//           setExistingDiseases(diseasesData.diseases);
//         } else {
//           console.error('Failed to fetch diseases:', diseasesData.error);
//         }
        
//         // Fetch symptoms
//         const symptomsResponse = await fetch('http://localhost:5002/api/symptoms');
//         const symptomsData = await symptomsResponse.json();
//         if (symptomsData.success) {
//           // Create an updated symptoms object with all existing symptoms
//           const updatedSymptoms = { ...symptoms };
          
//           symptomsData.symptoms.forEach(symptom => {
//             // Only add if not already in our predefined list
//             if (!updatedSymptoms.hasOwnProperty(symptom)) {
//               updatedSymptoms[symptom] = { connected: false, weight: 0.5 };
//             }
//           });
          
//           setSymptoms(updatedSymptoms);
          
//           // Update custom symptoms list
//           if (symptomsData.custom_symptoms && symptomsData.custom_symptoms.length > 0) {
//             setCustomSymptoms(symptomsData.custom_symptoms);
//           }
//         } else {
//           console.error('Failed to fetch symptoms:', symptomsData.error);
//         }
//       } catch (err) {
//         console.error('Error fetching data:', err);
//       }
//     };
    
//     fetchData();
//   }, []);
  
//   // Handle selecting an existing disease to modify
//   const handleSelectDisease = async (disease) => {
//     if (!disease) return;
    
//     setDiseaseName(disease);
    
//     // Fetch the disease connections from backend
//     try {
//       setLoading(true);
//       const response = await fetch(`http://localhost:5002/api/disease/${encodeURIComponent(disease)}`);
//       const data = await response.json();
      
//       if (data.success) {
//         // Reset all connections
//         resetConnections();
        
//         // Update connections based on fetched data
//         data.connections.forEach(conn => {
//           const { target, relationship, weight } = conn;
          
//           if (relationship === 'HAS_SYMPTOM') {
//             setSymptoms(prev => ({
//               ...prev,
//               [target]: { connected: true, weight: weight || 0.5 }
//             }));
//           } else if (relationship === 'COMMON_IN' && target.includes('Age')) {
//             setAgeGroups(prev => ({
//               ...prev,
//               [target]: { connected: true, weight: weight || 0.3 }
//             }));
//           } else if (relationship === 'PREVALENT_IN' && target.includes('Gender')) {
//             setGenders(prev => ({
//               ...prev,
//               [target]: { connected: true, weight: weight || 0.5 }
//             }));
//           } else if (relationship === 'ASSOCIATED_WITH' && target.includes('Blood Pressure')) {
//             setBloodPressures(prev => ({
//               ...prev,
//               [target]: { connected: true, weight: weight || 0.3 }
//             }));
//           } else if (relationship === 'CORRELATED_WITH' && target.includes('Cholesterol')) {
//             setCholesterolLevels(prev => ({
//               ...prev,
//               [target]: { connected: true, weight: weight || 0.3 }
//             }));
//           }
//         });
//       } else {
//         setError(`Failed to fetch disease connections: ${data.error}`);
//       }
//     } catch (err) {
//       setError(`Error fetching disease connections: ${err.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   // Add a new custom symptom
//   const handleAddCustomSymptom = () => {
//     if (!newSymptomName.trim()) {
//       setError('Please enter a symptom name');
//       return;
//     }
    
//     // Check if symptom already exists in either predefined or custom symptoms
//     if (symptoms.hasOwnProperty(newSymptomName) || 
//         customSymptoms.some(s => s === newSymptomName)) {
//       setError(`Symptom "${newSymptomName}" already exists`);
//       return;
//     }
    
//     // Add to custom symptoms list
//     setCustomSymptoms([...customSymptoms, newSymptomName]);
    
//     // Add to symptoms state with default connected
//     setSymptoms(prev => ({
//       ...prev,
//       [newSymptomName]: { connected: true, weight: 0.5 }
//     }));
    
//     // Clear input field
//     setNewSymptomName('');
//     setError(null);
//   };
  
//   // Handle removing a custom symptom
//   const handleRemoveCustomSymptom = (symptomName) => {
//     // Remove from custom symptoms list
//     setCustomSymptoms(customSymptoms.filter(s => s !== symptomName));
    
//     // Remove from symptoms state
//     const updatedSymptoms = { ...symptoms };
//     delete updatedSymptoms[symptomName];
//     setSymptoms(updatedSymptoms);
//   };

//   // Reset all connections (used when switching diseases or modes)
//   const resetConnections = () => {
//     // Reset symptoms
//     setSymptoms({
//       Fever: { connected: false, weight: 0.5 },
//       Cough: { connected: false, weight: 0.5 },
//       Fatigue: { connected: false, weight: 0.5 },
//       'Difficulty Breathing': { connected: false, weight: 0.5 },
//       Headache: { connected: false, weight: 0.5 },
//       Nausea: { connected: false, weight: 0.5 }
//     });
    
//     // Reset custom symptoms
//     setCustomSymptoms([]);
    
//     // Reset age groups
//     setAgeGroups({
//       'Child Age': { connected: false, weight: 0.3 },
//       'Young Adult Age': { connected: false, weight: 0.3 },
//       'Middle Aged Age': { connected: false, weight: 0.3 },
//       'Senior Age': { connected: false, weight: 0.3 }
//     });
    
//     // Reset genders
//     setGenders({
//       'Male Gender': { connected: false, weight: 0.5 },
//       'Female Gender': { connected: false, weight: 0.5 }
//     });
    
//     // Reset blood pressures
//     setBloodPressures({
//       'High Blood Pressure': { connected: false, weight: 0.3 },
//       'Low Blood Pressure': { connected: false, weight: 0.3 },
//       'Normal Blood Pressure': { connected: false, weight: 0.3 }
//     });
    
//     // Reset cholesterol levels
//     setCholesterolLevels({
//       'High Cholesterol': { connected: false, weight: 0.3 },
//       'Low Cholesterol': { connected: false, weight: 0.3 },
//       'Normal Cholesterol': { connected: false, weight: 0.3 }
//     });
//   };
  
//   // Handle mode change (add new or modify existing disease)
//   const handleModeChange = (mode) => {
//     setDiseaseAction(mode);
//     setDiseaseName('');
//     resetConnections();
//     setSuccess(false);
//     setError(null);
//   };
  
//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!diseaseName.trim()) {
//       setError('Please enter a disease name');
//       return;
//     }
    
//     // Format the data to send to the backend
//     const connections = [];
    
//     // Add symptom connections
//     Object.entries(symptoms).forEach(([symptom, { connected, weight }]) => {
//       if (connected) {
//         connections.push({
//           target: symptom,
//           relationship: 'HAS_SYMPTOM',
//           weight: parseFloat(weight)
//         });
//       }
//     });
    
//     // Add age group connections
//     Object.entries(ageGroups).forEach(([ageGroup, { connected, weight }]) => {
//       if (connected) {
//         connections.push({
//           target: ageGroup,
//           relationship: 'COMMON_IN',
//           weight: parseFloat(weight)
//         });
//       }
//     });
    
//     // Add gender connections
//     Object.entries(genders).forEach(([gender, { connected, weight }]) => {
//       if (connected) {
//         connections.push({
//           target: gender,
//           relationship: 'PREVALENT_IN',
//           weight: parseFloat(weight)
//         });
//       }
//     });
    
//     // Add blood pressure connections
//     Object.entries(bloodPressures).forEach(([bp, { connected, weight }]) => {
//       if (connected) {
//         connections.push({
//           target: bp,
//           relationship: 'ASSOCIATED_WITH',
//           weight: parseFloat(weight)
//         });
//       }
//     });
    
//     // Add cholesterol level connections
//     Object.entries(cholesterolLevels).forEach(([chol, { connected, weight }]) => {
//       if (connected) {
//         connections.push({
//           target: chol,
//           relationship: 'CORRELATED_WITH',
//           weight: parseFloat(weight)
//         });
//       }
//     });
    
//     // Prepare the data to send
//     const diseaseData = {
//       disease: diseaseName,
//       action: diseaseAction,
//       connections
//     };
    
//     try {
//       setLoading(true);
//       setError(null);
//       setSuccess(false);
      
//       // Make the API request to update the knowledge graph
//       const response = await fetch('http://localhost:5002/api/update-graph', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(diseaseData)
//       });
      
//       const data = await response.json();
      
//       if (data.success) {
//         setSuccess(true);
        
//         // If adding a new disease, add it to the list
//         if (diseaseAction === 'add' && !existingDiseases.includes(diseaseName)) {
//           setExistingDiseases([...existingDiseases, diseaseName]);
//         }
        
//         // Reset form if adding a new disease
//         if (diseaseAction === 'add') {
//           setDiseaseName('');
//           resetConnections();
//         }
//       } else {
//         setError(`Failed to update knowledge graph: ${data.error}`);
//       }
//     } catch (err) {
//       setError(`Error updating knowledge graph: ${err.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   // Render connection settings for a given category
//   const renderConnectionSettings = (category, items, setItems, relationshipTitle, isSymptoms = false) => {
//     return (
//       <div className="connection-category">
//         <h3>{relationshipTitle}</h3>
        
//         {/* Add a custom symptom input field if this is the symptoms section */}
//         {isSymptoms && (
//           <div className="add-custom-container">
//             <div className="add-custom-input">
//               <input
//                 type="text"
//                 value={newSymptomName}
//                 onChange={(e) => setNewSymptomName(e.target.value)}
//                 placeholder="Add new symptom..."
//               />
//               <button 
//                 type="button" 
//                 onClick={handleAddCustomSymptom}
//                 className="add-custom-btn"
//               >
//                 Add
//               </button>
//             </div>
            
//             {/* Display custom symptoms with remove option */}
//             {customSymptoms.length > 0 && (
//               <div className="custom-symptoms-list">
//                 <p>Custom symptoms: </p>
//                 <div className="custom-tags">
//                   {customSymptoms.map(symptom => (
//                     <span key={symptom} className="custom-tag">
//                       {symptom}
//                       <button 
//                         onClick={() => handleRemoveCustomSymptom(symptom)}
//                         className="remove-tag"
//                       >
//                         ×
//                       </button>
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
        
//         <div className="connection-grid">
//           {Object.entries(items).map(([name, { connected, weight }]) => (
//             <div key={name} className="connection-item">
//               <div className="connection-header">
//                 <label>
//                   <input
//                     type="checkbox"
//                     checked={connected}
//                     onChange={(e) => {
//                       const isConnected = e.target.checked;
//                       setItems(prev => ({
//                         ...prev,
//                         [name]: { ...prev[name], connected: isConnected }
//                       }));
//                     }}
//                   />
//                   {name}
//                   {/* Show badge for custom symptoms */}
//                   {isSymptoms && customSymptoms.includes(name) && (
//                     <span className="custom-badge">custom</span>
//                   )}
//                 </label>
//               </div>
              
//               {connected && (
//                 <div className="connection-weight">
//                   <label>
//                     Weight:
//                     <input
//                       type="range"
//                       min="0.1"
//                       max="1"
//                       step="0.1"
//                       value={weight}
//                       onChange={(e) => {
//                         const newWeight = parseFloat(e.target.value);
//                         setItems(prev => ({
//                           ...prev,
//                           [name]: { ...prev[name], weight: newWeight }
//                         }));
//                       }}
//                     />
//                     <span>{(weight * 100).toFixed(0)}%</span>
//                   </label>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   };
  
//   return (
//     <div className="populate-graph">
//       <h2>Populate Knowledge Graph</h2>
      
//       <div className="action-toggle">
//         <button 
//           className={diseaseAction === 'add' ? 'active' : ''} 
//           onClick={() => handleModeChange('add')}
//         >
//           Add New Disease
//         </button>
//         <button 
//           className={diseaseAction === 'modify' ? 'active' : ''} 
//           onClick={() => handleModeChange('modify')}
//         >
//           Modify Existing Disease
//         </button>
//       </div>
      
//       <form onSubmit={handleSubmit}>
//         {diseaseAction === 'add' ? (
//           <div className="form-group">
//             <label htmlFor="diseaseName">Disease Name:</label>
//             <input
//               type="text"
//               id="diseaseName"
//               value={diseaseName}
//               onChange={(e) => setDiseaseName(e.target.value)}
//               placeholder="Enter new disease name"
//             />
//           </div>
//         ) : (
//           <div className="form-group">
//             <label htmlFor="existingDisease">Select Disease:</label>
//             <select
//               id="existingDisease"
//               value={diseaseName}
//               onChange={(e) => handleSelectDisease(e.target.value)}
//             >
//               <option value="">-- Select a disease --</option>
//               {existingDiseases.map(disease => (
//                 <option key={disease} value={disease}>{disease}</option>
//               ))}
//             </select>
//           </div>
//         )}
        
//         <div className="connections-container">
//           <h3>Define Disease Connections</h3>
//           <p>Connect the disease to symptoms and other factors. Set the connection weight (percentage) for each relationship.</p>
          
//           {renderConnectionSettings(
//             'symptoms',
//             symptoms,
//             setSymptoms,
//             'Symptoms (HAS_SYMPTOM)',
//             true  // Set isSymptoms to true
//           )}
          
//           {renderConnectionSettings(
//             'ageGroups',
//             ageGroups,
//             setAgeGroups,
//             'Age Groups (COMMON_IN)'
//           )}
          
//           {renderConnectionSettings(
//             'genders',
//             genders,
//             setGenders,
//             'Genders (PREVALENT_IN)'
//           )}
          
//           {renderConnectionSettings(
//             'bloodPressures',
//             bloodPressures,
//             setBloodPressures,
//             'Blood Pressure (ASSOCIATED_WITH)'
//           )}
          
//           {renderConnectionSettings(
//             'cholesterolLevels',
//             cholesterolLevels,
//             setCholesterolLevels,
//             'Cholesterol Levels (CORRELATED_WITH)'
//           )}
//         </div>
        
//         {error && (
//           <div className="error-message">
//             {error}
//           </div>
//         )}
        
//         {success && (
//           <div className="success-message">
//             {diseaseAction === 'add' 
//               ? 'New disease successfully added to the knowledge graph!' 
//               : 'Disease connections successfully updated!'}
//           </div>
//         )}
        
//         <div className="form-actions">
//           <button
//             type="submit"
//             disabled={loading || !diseaseName}
//             className="submit-button"
//           >
//             {loading ? 'Processing...' : (diseaseAction === 'add' ? 'Add Disease' : 'Update Disease')}
//           </button>
//         </div>
//       </form>
      
//       {/* Add graph preview */}
//       {diseaseName && (
//         <DiseaseGraphPreview 
//           diseaseName={diseaseName}
//           connections={
//             // Format connections for the preview
//             Object.entries(symptoms)
//               .filter(([_, { connected }]) => connected)
//               .map(([symptom, { weight }]) => ({
//                 target: symptom,
//                 relationship: 'HAS_SYMPTOM',
//                 weight
//               }))
//               .concat(
//                 Object.entries(ageGroups)
//                   .filter(([_, { connected }]) => connected)
//                   .map(([ageGroup, { weight }]) => ({
//                     target: ageGroup,
//                     relationship: 'COMMON_IN',
//                     weight
//                   }))
//               )
//               .concat(
//                 Object.entries(genders)
//                   .filter(([_, { connected }]) => connected)
//                   .map(([gender, { weight }]) => ({
//                     target: gender,
//                     relationship: 'PREVALENT_IN',
//                     weight
//                   }))
//               )
//               .concat(
//                 Object.entries(bloodPressures)
//                   .filter(([_, { connected }]) => connected)
//                   .map(([bp, { weight }]) => ({
//                     target: bp,
//                     relationship: 'ASSOCIATED_WITH',
//                     weight
//                   }))
//               )
//               .concat(
//                 Object.entries(cholesterolLevels)
//                   .filter(([_, { connected }]) => connected)
//                   .map(([chol, { weight }]) => ({
//                     target: chol,
//                     relationship: 'CORRELATED_WITH',
//                     weight
//                   }))
//               )
//           }
//           colors={{
//             Disease: "#e41a1c",
//             Symptom: "#377eb8",
//             "Age Group": "#4daf4a",
//             Gender: "#984ea3",
//             "Blood Pressure": "#ff7f00",
//             "Cholesterol Level": "#ffff33"
//           }}
//         />
//       )}
      
//       <style jsx>{`
//         .populate-graph {
//           padding: 20px;
//           max-width: 1200px;
//           margin: 0 auto;
//         }
        
//         h2 {
//           color: #333;
//           margin-bottom: 20px;
//         }
        
//         .action-toggle {
//           display: flex;
//           margin-bottom: 20px;
//           background-color: #f5f5f5;
//           border-radius: 8px;
//           overflow: hidden;
//           border: 1px solid #ddd;
//         }
        
//         .action-toggle button {
//           flex: 1;
//           padding: 10px;
//           background: transparent;
//           border: none;
//           cursor: pointer;
//           font-weight: normal;
//           transition: background-color 0.3s;
//         }
        
//         .action-toggle button.active {
//           background-color: #4a90e2;
//           color: white;
//           font-weight: bold;
//         }
        
//         .form-group {
//           margin-bottom: 20px;
//         }
        
//         .form-group label {
//           display: block;
//           margin-bottom: 5px;
//           font-weight: bold;
//         }
        
//         .form-group input, .form-group select {
//           width: 100%;
//           padding: 10px;
//           border: 1px solid #ddd;
//           border-radius: 4px;
//           font-size: 16px;
//         }
        
//         .connections-container {
//           border: 1px solid #ddd;
//           border-radius: 8px;
//           padding: 20px;
//           margin-bottom: 20px;
//           background-color: #f9f9f9;
//         }
        
//         .connection-category {
//           margin-bottom: 20px;
//           padding-bottom: 20px;
//           border-bottom: 1px solid #eee;
//         }
        
//         .connection-category:last-child {
//           border-bottom: none;
//         }
        
//         .connection-grid {
//           display: grid;
//           grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
//           gap: 15px;
//         }
        
//         .connection-item {
//           background-color: white;
//           border: 1px solid #eee;
//           border-radius: 4px;
//           padding: 10px;
//         }
        
//         .connection-header {
//           display: flex;
//           align-items: center;
//           margin-bottom: 10px;
//         }
        
//         .connection-weight {
//           padding-top: 5px;
//         }
        
//         .connection-weight label {
//           display: flex;
//           align-items: center;
//           gap: 10px;
//           font-size: 14px;
//         }
        
//         .connection-weight input {
//           flex: 1;
//         }
        
//         .error-message {
//           padding: 10px;
//           background-color: #ffeeee;
//           color: #e41a1c;
//           border-radius: 4px;
//           margin-bottom: 20px;
//         }
        
//         .success-message {
//           padding: 10px;
//           background-color: #eeffee;
//           color: #2ca02c;
//           border-radius: 4px;
//           margin-bottom: 20px;
//         }
        
//         .form-actions {
//           margin-top: 20px;
//         }
        
//         .submit-button {
//           background-color: #4a90e2;
//           color: white;
//           border: none;
//           padding: 12px 20px;
//           border-radius: 4px;
//           font-size: 16px;
//           font-weight: bold;
//           cursor: pointer;
//           transition: background-color 0.3s;
//         }
        
//         .submit-button:hover {
//           background-color: #357ab8;
//         }
        
//         .submit-button:disabled {
//           background-color: #cccccc;
//           cursor: not-allowed;
//         }
        
//         /* Custom Symptom Styles */
//         .add-custom-container {
//           margin-bottom: 15px;
//           padding: 10px;
//           background-color: #f5f5f5;
//           border-radius: 4px;
//         }
        
//         .add-custom-input {
//           display: flex;
//           gap: 10px;
//           margin-bottom: 10px;
//         }
        
//         .add-custom-input input {
//           flex: 1;
//           padding: 8px;
//           border: 1px solid #ddd;
//           border-radius: 4px;
//         }
        
//         .add-custom-btn {
//           background-color: #4a90e2;
//           color: white;
//           border: none;
//           padding: 8px 15px;
//           border-radius: 4px;
//           cursor: pointer;
//         }
        
//         .custom-symptoms-list {
//           margin-top: 10px;
//         }
        
//         .custom-symptoms-list p {
//           font-size: 12px;
//           color: #666;
//           margin: 0 0 5px 0;
//         }
        
//         .custom-tags {
//           display: flex;
//           flex-wrap: wrap;
//           gap: 8px;
//         }
        
//         .custom-tag {
//           display: inline-flex;
//           align-items: center;
//           background-color: #e1f0ff;
//           color: #0066cc;
//           font-size: 12px;
//           padding: 3px 8px;
//           border-radius: 12px;
//         }
        
//         .remove-tag {
//           background: none;
//           border: none;
//           color: #0066cc;
//           font-size: 14px;
//           font-weight: bold;
//           cursor: pointer;
//           margin-left: 5px;
//           padding: 0 2px;
//         }
        
//         .custom-badge {
//           display: inline-block;
//           font-size: 10px;
//           background-color: #4a90e2;
//           color: white;
//           padding: 2px 5px;
//           border-radius: 10px;
//           margin-left: 5px;
//           vertical-align: middle;
//         }
//       `}</style>
//     </div>
//   );
// }

// export default PopulateGraph;







import React, { useState, useEffect } from 'react';
import DiseaseGraphPreview from './DiseaseGraphPreview';

function PopulateGraph() {
  // State for form data
  const [diseaseName, setDiseaseName] = useState('');
  const [diseaseAction, setDiseaseAction] = useState('add'); // 'add' or 'modify'
  const [existingDiseases, setExistingDiseases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // State for connections (relationships)
  const [symptoms, setSymptoms] = useState({
    Fever: { connected: false, weight: 0.5 },
    Cough: { connected: false, weight: 0.5 },
    Fatigue: { connected: false, weight: 0.5 },
    'Difficulty Breathing': { connected: false, weight: 0.5 },
  });
  
  // State for new symptom input
  const [newSymptomName, setNewSymptomName] = useState('');
  const [customSymptoms, setCustomSymptoms] = useState([]);
  
  const [ageGroups, setAgeGroups] = useState({
    'Child Age': { connected: false, weight: 0.3 },
    'Young Adult Age': { connected: false, weight: 0.3 },
    'Middle Aged Age': { connected: false, weight: 0.3 },
    'Senior Age': { connected: false, weight: 0.3 }
  });
  
  const [genders, setGenders] = useState({
    'Male Gender': { connected: false, weight: 0.5 },
    'Female Gender': { connected: false, weight: 0.5 }
  });
  
  const [bloodPressures, setBloodPressures] = useState({
    'High Blood Pressure': { connected: false, weight: 0.3 },
    'Low Blood Pressure': { connected: false, weight: 0.3 },
    'Normal Blood Pressure': { connected: false, weight: 0.3 }
  });
  
  const [cholesterolLevels, setCholesterolLevels] = useState({
    'High Cholesterol': { connected: false, weight: 0.3 },
    'Low Cholesterol': { connected: false, weight: 0.3 },
    'Normal Cholesterol': { connected: false, weight: 0.3 }
  });
  
  // Load existing diseases and symptoms on component mount
  useEffect(() => {
    // Fetch existing diseases from backend
    const fetchData = async () => {
      try {
        // Fetch diseases
        const diseasesResponse = await fetch('http://localhost:5002/api/diseases');
        const diseasesData = await diseasesResponse.json();
        if (diseasesData.success) {
          setExistingDiseases(diseasesData.diseases);
        } else {
          console.error('Failed to fetch diseases:', diseasesData.error);
        }
        
        // Fetch symptoms
        const symptomsResponse = await fetch('http://localhost:5002/api/symptoms');
        const symptomsData = await symptomsResponse.json();
        if (symptomsData.success) {
          // Create an updated symptoms object with all existing symptoms
          const updatedSymptoms = { ...symptoms };
          
          symptomsData.symptoms.forEach(symptom => {
            // Only add if not already in our predefined list
            if (!updatedSymptoms.hasOwnProperty(symptom)) {
              updatedSymptoms[symptom] = { connected: false, weight: 0.5 };
            }
          });
          
          setSymptoms(updatedSymptoms);
          
          // Update custom symptoms list
          if (symptomsData.custom_symptoms && symptomsData.custom_symptoms.length > 0) {
            setCustomSymptoms(symptomsData.custom_symptoms);
          }
        } else {
          console.error('Failed to fetch symptoms:', symptomsData.error);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle selecting an existing disease to modify
  const handleSelectDisease = async (disease) => {
    if (!disease) return;
    
    setDiseaseName(disease);
    
    // Fetch the disease connections from backend
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5002/api/disease/${encodeURIComponent(disease)}`);
      const data = await response.json();
      
      if (data.success) {
        // Reset all connections
        resetConnections();
        
        // Update connections based on fetched data
        data.connections.forEach(conn => {
          const { target, relationship, weight } = conn;
          
          if (relationship === 'HAS_SYMPTOM') {
            setSymptoms(prev => ({
              ...prev,
              [target]: { connected: true, weight: weight || 0.5 }
            }));
          } else if (relationship === 'COMMON_IN' && target.includes('Age')) {
            setAgeGroups(prev => ({
              ...prev,
              [target]: { connected: true, weight: weight || 0.3 }
            }));
          } else if (relationship === 'PREVALENT_IN' && target.includes('Gender')) {
            setGenders(prev => ({
              ...prev,
              [target]: { connected: true, weight: weight || 0.5 }
            }));
          } else if (relationship === 'ASSOCIATED_WITH' && target.includes('Blood Pressure')) {
            setBloodPressures(prev => ({
              ...prev,
              [target]: { connected: true, weight: weight || 0.3 }
            }));
          } else if (relationship === 'CORRELATED_WITH' && target.includes('Cholesterol')) {
            setCholesterolLevels(prev => ({
              ...prev,
              [target]: { connected: true, weight: weight || 0.3 }
            }));
          }
        });
      } else {
        setError(`Failed to fetch disease connections: ${data.error}`);
      }
    } catch (err) {
      setError(`Error fetching disease connections: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new custom symptom
  const handleAddCustomSymptom = () => {
    if (!newSymptomName.trim()) {
      setError('Please enter a symptom name');
      return;
    }
    
    // Check if symptom already exists in either predefined or custom symptoms
    if (symptoms.hasOwnProperty(newSymptomName) || 
        customSymptoms.some(s => s === newSymptomName)) {
      setError(`Symptom "${newSymptomName}" already exists`);
      return;
    }
    
    // Add to custom symptoms list
    setCustomSymptoms([...customSymptoms, newSymptomName]);
    
    // Add to symptoms state with default connected
    setSymptoms(prev => ({
      ...prev,
      [newSymptomName]: { connected: true, weight: 0.5 }
    }));
    
    // Clear input field
    setNewSymptomName('');
    setError(null);
  };
  
  // Handle removing a custom symptom
  const handleRemoveCustomSymptom = (symptomName) => {
    // Remove from custom symptoms list
    setCustomSymptoms(customSymptoms.filter(s => s !== symptomName));
    
    // Remove from symptoms state
    const updatedSymptoms = { ...symptoms };
    delete updatedSymptoms[symptomName];
    setSymptoms(updatedSymptoms);
  };

  // Reset all connections (used when switching diseases or modes)
  const resetConnections = () => {
    // Reset symptoms
    setSymptoms({
      Fever: { connected: false, weight: 0.5 },
      Cough: { connected: false, weight: 0.5 },
      Fatigue: { connected: false, weight: 0.5 },
      'Difficulty Breathing': { connected: false, weight: 0.5 },
    });
    
    // Reset custom symptoms
    setCustomSymptoms([]);
    
    // Reset age groups
    setAgeGroups({
      'Child Age': { connected: false, weight: 0.3 },
      'Young Adult Age': { connected: false, weight: 0.3 },
      'Middle Aged Age': { connected: false, weight: 0.3 },
      'Senior Age': { connected: false, weight: 0.3 }
    });
    
    // Reset genders
    setGenders({
      'Male Gender': { connected: false, weight: 0.5 },
      'Female Gender': { connected: false, weight: 0.5 }
    });
    
    // Reset blood pressures
    setBloodPressures({
      'High Blood Pressure': { connected: false, weight: 0.3 },
      'Low Blood Pressure': { connected: false, weight: 0.3 },
      'Normal Blood Pressure': { connected: false, weight: 0.3 }
    });
    
    // Reset cholesterol levels
    setCholesterolLevels({
      'High Cholesterol': { connected: false, weight: 0.3 },
      'Low Cholesterol': { connected: false, weight: 0.3 },
      'Normal Cholesterol': { connected: false, weight: 0.3 }
    });
  };
  
  // Handle mode change (add new or modify existing disease)
  const handleModeChange = (mode) => {
    setDiseaseAction(mode);
    setDiseaseName('');
    resetConnections();
    setSuccess(false);
    setError(null);
  };
  
  // Update text file function
  const updateInfoTextFile = async (data) => {
    try {
      console.log('Attempting to update info.txt file with data:', data);
      
      const response = await fetch('http://localhost:5002/api/update-info-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      console.log('File update API response status:', response.status);
      
      const result = await response.json();
      console.log('File update API response body:', result);
      
      if (!result.success) {
        console.error('Failed to update info text file:', result.error);
        setError(`Failed to update text file: ${result.error}`);
        return false;
      } else {
        console.log('Info text file updated successfully');
        return true;
      }
    } catch (err) {
      console.error('Error updating info text file:', err.message);
      setError(`Error updating text file: ${err.message}`);
      return false;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!diseaseName.trim()) {
      setError('Please enter a disease name');
      return;
    }
    
    // Format the data to send to the backend
    const connections = [];
    
    // Add symptom connections
    Object.entries(symptoms).forEach(([symptom, { connected, weight }]) => {
      if (connected) {
        connections.push({
          target: symptom,
          relationship: 'HAS_SYMPTOM',
          weight: parseFloat(weight)
        });
      }
    });
    
    // Add age group connections
    Object.entries(ageGroups).forEach(([ageGroup, { connected, weight }]) => {
      if (connected) {
        connections.push({
          target: ageGroup,
          relationship: 'COMMON_IN',
          weight: parseFloat(weight)
        });
      }
    });
    
    // Add gender connections
    Object.entries(genders).forEach(([gender, { connected, weight }]) => {
      if (connected) {
        connections.push({
          target: gender,
          relationship: 'PREVALENT_IN',
          weight: parseFloat(weight)
        });
      }
    });
    
    // Add blood pressure connections
    Object.entries(bloodPressures).forEach(([bp, { connected, weight }]) => {
      if (connected) {
        connections.push({
          target: bp,
          relationship: 'ASSOCIATED_WITH',
          weight: parseFloat(weight)
        });
      }
    });
    
    // Add cholesterol level connections
    Object.entries(cholesterolLevels).forEach(([chol, { connected, weight }]) => {
      if (connected) {
        connections.push({
          target: chol,
          relationship: 'CORRELATED_WITH',
          weight: parseFloat(weight)
        });
      }
    });
    
    // Prepare the data to send
    const diseaseData = {
      disease: diseaseName,
      action: diseaseAction,
      connections
    };
    
    // Collect all available items for text file update
    const allSymptoms = Object.keys(symptoms);
    const textFileData = {
      action: diseaseAction,
      disease: diseaseName,
      allDiseases: diseaseAction === 'add' ? [...existingDiseases, diseaseName] : existingDiseases,
      allSymptoms
      // No file path - let the backend handle it
    };
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Make the API request to update the knowledge graph
      const response = await fetch('http://localhost:5002/api/update-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(diseaseData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Also update the text file
        const fileUpdateSuccess = await updateInfoTextFile(textFileData);
        
        setSuccess(true);
        
        // If adding a new disease, add it to the list
        if (diseaseAction === 'add' && !existingDiseases.includes(diseaseName)) {
          setExistingDiseases([...existingDiseases, diseaseName]);
        }
        
        // Reset form if adding a new disease
        if (diseaseAction === 'add') {
          setDiseaseName('');
          resetConnections();
        }
      } else {
        setError(`Failed to update knowledge graph: ${data.error}`);
      }
    } catch (err) {
      setError(`Error updating knowledge graph: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Render connection settings for a given category
  const renderConnectionSettings = (category, items, setItems, relationshipTitle, isSymptoms = false) => {
    return (
      <div className="connection-category">
        <h3>{relationshipTitle}</h3>
        
        {/* Add a custom symptom input field if this is the symptoms section */}
        {isSymptoms && (
          <div className="add-custom-container">
            <div className="add-custom-input">
              <input
                type="text"
                value={newSymptomName}
                onChange={(e) => setNewSymptomName(e.target.value)}
                placeholder="Add new symptom..."
              />
              <button 
                type="button" 
                onClick={handleAddCustomSymptom}
                className="add-custom-btn"
              >
                Add
              </button>
            </div>
            
            {/* Display custom symptoms with remove option */}
            {customSymptoms.length > 0 && (
              <div className="custom-symptoms-list">
                <p>Custom symptoms: </p>
                <div className="custom-tags">
                  {customSymptoms.map(symptom => (
                    <span key={symptom} className="custom-tag">
                      {symptom}
                      <button 
                        onClick={() => handleRemoveCustomSymptom(symptom)}
                        className="remove-tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="connection-grid">
          {Object.entries(items).map(([name, { connected, weight }]) => (
            <div key={name} className="connection-item">
              <div className="connection-header">
                <label>
                  <input
                    type="checkbox"
                    checked={connected}
                    onChange={(e) => {
                      const isConnected = e.target.checked;
                      setItems(prev => ({
                        ...prev,
                        [name]: { ...prev[name], connected: isConnected }
                      }));
                    }}
                  />
                  {name}
                  {/* Show badge for custom symptoms */}
                  {isSymptoms && customSymptoms.includes(name) && (
                    <span className="custom-badge">custom</span>
                  )}
                </label>
              </div>
              
              {connected && (
                <div className="connection-weight">
                  <label>
                    Weight:
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={weight}
                      onChange={(e) => {
                        const newWeight = parseFloat(e.target.value);
                        setItems(prev => ({
                          ...prev,
                          [name]: { ...prev[name], weight: newWeight }
                        }));
                      }}
                    />
                    <span>{(weight * 100).toFixed(0)}%</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="populate-graph">
      <h2>Populate Knowledge Graph</h2>
      
      <div className="action-toggle">
        <button 
          className={diseaseAction === 'add' ? 'active' : ''} 
          onClick={() => handleModeChange('add')}
        >
          Add New Disease
        </button>
        <button 
          className={diseaseAction === 'modify' ? 'active' : ''} 
          onClick={() => handleModeChange('modify')}
        >
          Modify Existing Disease
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {diseaseAction === 'add' ? (
          <div className="form-group">
            <label htmlFor="diseaseName">Disease Name:</label>
            <input
              type="text"
              id="diseaseName"
              value={diseaseName}
              onChange={(e) => setDiseaseName(e.target.value)}
              placeholder="Enter new disease name"
            />
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="existingDisease">Select Disease:</label>
            <select
              id="existingDisease"
              value={diseaseName}
              onChange={(e) => handleSelectDisease(e.target.value)}
            >
              <option value="">-- Select a disease --</option>
              {existingDiseases.map(disease => (
                <option key={disease} value={disease}>{disease}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="connections-container">
          <h3>Define Disease Connections</h3>
          <p>Connect the disease to symptoms and other factors. Set the connection weight (percentage) for each relationship.</p>
          
          {renderConnectionSettings(
            'symptoms',
            symptoms,
            setSymptoms,
            'Symptoms (HAS_SYMPTOM)',
            true  // Set isSymptoms to true
          )}
          
          {renderConnectionSettings(
            'ageGroups',
            ageGroups,
            setAgeGroups,
            'Age Groups (COMMON_IN)'
          )}
          
          {renderConnectionSettings(
            'genders',
            genders,
            setGenders,
            'Genders (PREVALENT_IN)'
          )}
          
          {renderConnectionSettings(
            'bloodPressures',
            bloodPressures,
            setBloodPressures,
            'Blood Pressure (ASSOCIATED_WITH)'
          )}
          
          {renderConnectionSettings(
            'cholesterolLevels',
            cholesterolLevels,
            setCholesterolLevels,
            'Cholesterol Levels (CORRELATED_WITH)'
          )}
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            {diseaseAction === 'add' 
              ? 'New disease successfully added to the knowledge graph and info file!' 
              : 'Disease connections successfully updated in graph and info file!'}
          </div>
        )}
        
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading || !diseaseName}
            className="submit-button"
          >
            {loading ? 'Processing...' : (diseaseAction === 'add' ? 'Add Disease' : 'Update Disease')}
          </button>
          
          {/* Test button for directly updating the file */}
          <button
            type="button"
            onClick={() => {
              // Test direct file update
              const testData = {
                action: 'test',
                allDiseases: [...existingDiseases],
                allSymptoms: Object.keys(symptoms)
              };
              console.log("Testing direct file update with:", testData);
              updateInfoTextFile(testData);
            }}
            className="test-button"
          >
            Test File Update
          </button>
        </div>
      </form>
      
      {/* Add graph preview */}
      {diseaseName && (
        <DiseaseGraphPreview 
          diseaseName={diseaseName}
          connections={
            // Format connections for the preview
            Object.entries(symptoms)
              .filter(([_, { connected }]) => connected)
              .map(([symptom, { weight }]) => ({
                target: symptom,
                relationship: 'HAS_SYMPTOM',
                weight
              }))
              .concat(
                Object.entries(ageGroups)
                  .filter(([_, { connected }]) => connected)
                  .map(([ageGroup, { weight }]) => ({
                    target: ageGroup,
                    relationship: 'COMMON_IN',
                    weight
                  }))
              )
              .concat(
                Object.entries(genders)
                  .filter(([_, { connected }]) => connected)
                  .map(([gender, { weight }]) => ({
                    target: gender,
                    relationship: 'PREVALENT_IN',
                    weight
                  }))
              )
              .concat(
                Object.entries(bloodPressures)
                  .filter(([_, { connected }]) => connected)
                  .map(([bp, { weight }]) => ({
                    target: bp,
                    relationship: 'ASSOCIATED_WITH',
                    weight
                  }))
              )
              .concat(
                Object.entries(cholesterolLevels)
                  .filter(([_, { connected }]) => connected)
                  .map(([chol, { weight }]) => ({
                    target: chol,
                    relationship: 'CORRELATED_WITH',
                    weight
                  }))
              )
          }
          colors={{
            Disease: "#e41a1c",
            Symptom: "#377eb8",
            "Age Group": "#4daf4a",
            Gender: "#984ea3",
            "Blood Pressure": "#ff7f00",
            "Cholesterol Level": "#ffff33"
          }}
        />
      )}
      
      <style jsx>{`
        .populate-graph {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        h2 {
          color: #333;
          margin-bottom: 20px;
        }
        
        .action-toggle {
          display: flex;
          margin-bottom: 20px;
          background-color: #f5f5f5;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #ddd;
        }
        
        .action-toggle button {
          flex: 1;
          padding: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: normal;
          transition: background-color 0.3s;
        }
        
        .action-toggle button.active {
          background-color: #4a90e2;
          color: white;
          font-weight: bold;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .form-group input, .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .connections-container {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        
        .connection-category {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        
        .connection-category:last-child {
          border-bottom: none;
        }
        
        .connection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }
        
        .connection-item {
          background-color: white;
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 10px;
        }
        
        .connection-header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .connection-weight {
          padding-top: 5px;
        }
        
        .connection-weight label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }
        
        .connection-weight input {
          flex: 1;
        }
        
        .error-message {
          padding: 10px;
          background-color: #ffeeee;
          color: #e41a1c;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .success-message {
          padding: 10px;
          background-color: #eeffee;
          color: #2ca02c;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .form-actions {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }
        
        .submit-button {
          background-color: #4a90e2;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .test-button {
          background-color: #6c757d;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .submit-button:hover {
          background-color: #357ab8;
        }
        
        .test-button:hover {
          background-color: #5a6268;
        }
        
        .submit-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        /* Custom Symptom Styles */
        .add-custom-container {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        
        .add-custom-input {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .add-custom-input input {
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .add-custom-btn {
          background-color: #4a90e2;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .custom-symptoms-list {
          margin-top: 10px;
        }
        
        .custom-symptoms-list p {
          font-size: 12px;
          color: #666;
          margin: 0 0 5px 0;
        }
        
        .custom-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .custom-tag {
          display: inline-flex;
          align-items: center;
          background-color: #e1f0ff;
          color: #0066cc;
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 12px;
        }
        
        .remove-tag {
          background: none;
          border: none;
          color: #0066cc;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          margin-left: 5px;
          padding: 0 2px;
        }
        
        .custom-badge {
          display: inline-block;
          font-size: 10px;
          background-color: #4a90e2;
          color: white;
          padding: 2px 5px;
          border-radius: 10px;
          margin-left: 5px;
          vertical-align: middle;
        }
      `}</style>
    </div>
  );
}

export default PopulateGraph;