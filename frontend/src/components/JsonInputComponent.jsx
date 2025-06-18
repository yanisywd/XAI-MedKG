import React, { useState } from 'react';

const JsonInputComponent = ({ onAnalysisComplete }) => {
  const [inputJson, setInputJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleInputChange = (e) => {
    setInputJson(e.target.value);
    setError(null);
  };
  
  const handleSubmit = async () => {
    if (!inputJson.trim()) {
      setError('Please enter JSON data');
      return;
    }
    
    let jsonData;
    try {
      jsonData = JSON.parse(inputJson);
    } catch (err) {
      setError('Invalid JSON format: ' + err.message);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: inputJson,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error occurred');
      }
      
      // Force reload of your visualization component
      onAnalysisComplete(Date.now());
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasteExample = () => {
    const exampleJson = {
      "result": [
        {
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
    setInputJson(JSON.stringify(exampleJson, null, 2));
    setError(null);
  };
  
  return (
    <div className="json-input-container" style={styles.container}>
      <h3 style={styles.title}>Analyze GPT Response</h3>
      
      <div style={styles.inputWrapper}>
        <textarea
          value={inputJson}
          onChange={handleInputChange}
          placeholder='Paste JSON response here...'
          style={styles.textarea}
          rows={5}
        />
        
        <div style={styles.buttonContainer}>
          <button 
            onClick={handlePasteExample}
            style={styles.exampleButton}
          >
            Paste Example
          </button>
          
          <button 
            onClick={handleSubmit}
            disabled={loading}
            style={loading ? {...styles.submitButton, ...styles.disabledButton} : styles.submitButton}
          >
            {loading ? 'Processing...' : 'Generate Analysis'}
          </button>
        </div>
      </div>
      
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 10px 0',
    color: '#333',
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    marginBottom: '10px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  exampleButton: {
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    color: '#3b82f6',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  errorMessage: {
    color: '#ef4444',
    marginTop: '10px',
    padding: '8px',
    backgroundColor: '#fee2e2',
    borderRadius: '4px',
    fontSize: '14px',
  }
};

export default JsonInputComponent;