import React, { useState } from 'react';

// This component handles the alternative diagnoses section
const AlternativeDiagnoses = ({ alternatives }) => {
  const [expandedAlternatives, setExpandedAlternatives] = useState({});

  // Toggle expansion function
  const toggleAlternativeDetails = (index) => {
    setExpandedAlternatives(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return ( 
    <>
      <h4 className="section-title">Other Possible Diagnoses</h4>
      <div className="alternatives-grid">
        {alternatives.map((alt, index) => (
          <div key={`alt-${index}`} className="alternative-item">
            <h5>{alt.alternative_disease}</h5>
            <div className="similarity">Similarity: {(alt.similarity * 100).toFixed(1)}%</div>
            <div className="changes-count">
              {alt.changes_needed.length} changes needed 
              ({alt.changes_needed.filter(c => c.action === 'add').length} additions, 
              {alt.changes_needed.filter(c => c.action === 'remove').length} removals)
            </div>
            
            <button     
              className="toggle-details-btn"
              onClick={() => toggleAlternativeDetails(index)}
            >
              {expandedAlternatives[index] ? 'Hide Details' : 'Show Details'}
            </button>
            
            {expandedAlternatives[index] && (
              <div className="change-details">
                {alt.changes_needed.filter(c => c.action === 'add').length > 0 && (
                  <>
                    <h6>Additions Needed:</h6>
                    <ul className="changes-list additions">
                      {alt.changes_needed
                        .filter(change => change.action === 'add')
                        .map((change, changeIndex) => (
                          <li key={`add-${changeIndex}`}>
                            <span className="add-icon">+</span>
                            <div className="change-content">
                              <strong>{change.factor}</strong> <span className="factor-type">({change.factor_type})</span>
                              <span className="relationship-text">
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
                    <h6>Removals Needed:</h6>
                    <ul className="changes-list removals">
                      {alt.changes_needed
                        .filter(change => change.action === 'remove')
                        .map((change, changeIndex) => (
                          <li key={`remove-${changeIndex}`}>
                            <span className="remove-icon">-</span>
                            <div className="change-content">
                              <strong>{change.factor}</strong> <span className="factor-type">({change.factor_type})</span>
                              <span className="relationship-text">
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

      <style jsx>{`
        /* Alternative Diagnoses Grid */
        .alternatives-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        /* Alternative Item Card */
        .alternative-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          background-color: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 20px;
          transition: all 0.2s ease;
        }
        
        .alternative-item:hover {
          box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        }
        
        /* Headings */
        .section-title {
          font-size: 18px;
          margin-bottom: 15px;
          color: #333;
        }
        
        .alternative-item h5 {
          color: #3b82f6;
          font-size: 18px;
          margin-top: 0;
          margin-bottom: 12px;
          font-weight: 600;
        }
        
        .alternative-item h6 {
          margin: 12px 0 10px 0;
          font-size: 14px;
          color: #4a5568;
          font-weight: 600;
        }
        
        /* Stats */
        .similarity {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
          color: #333;
        }
        
        .changes-count {
          color: #4b5563;
          margin-bottom: 16px;
          font-size: 13px;
        }
        
        /* Toggle Button */
        .toggle-details-btn {
          background-color: #f5f7fa;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: #4a5568;
          font-weight: 500;
          display: block;
          width: 100%;
          text-align: center;
          margin-top: 10px;
        }
        
        .toggle-details-btn:hover {
          background-color: #edf2f7;
          border-color: #cbd5e0;
        }
        
        /* Change Details Section */
        .change-details {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px dashed #e2e8f0;
        }
        
        /* Change Lists */
        .changes-list {
          list-style-type: none;
          padding: 0;
          margin: 0 0 16px 0;
        }
        
        .changes-list li {
          padding: 8px;
          margin-bottom: 8px;
          display: flex;
          align-items: flex-start;
          background-color: #f8fafc;
          border-radius: 6px;
          line-height: 1.5;
        }
        
        .change-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .changes-list.additions li {
          border-left: 3px solid #2ca02c;
          background-color: #f0fff4;
        }
        
        .changes-list.removals li {
          border-left: 3px solid #d62728;
          background-color: #fff5f5;
        }
        
        /* Icons */
        .add-icon {
          color: #2ca02c;
          font-weight: bold;
          margin-right: 10px;
          font-size: 16px;
          line-height: 1.5;
          flex-shrink: 0;
        }
        
        .remove-icon {
          color: #d62728;
          font-weight: bold;
          margin-right: 10px;
          font-size: 16px;
          line-height: 1.5;
          flex-shrink: 0;
        }
        
        /* Text Formatting */
        .factor-type {
          color: #64748b;
          font-weight: normal;
          margin-right: 5px;
          display: inline;
        }
        
        .relationship-text {
          color: #64748b;
          font-style: italic;
          display: block;
          margin-top: 2px;
          font-size: 12px;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .alternatives-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default AlternativeDiagnoses;



