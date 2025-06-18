#!/usr/bin/env python3
import sys

# Import your existing KGExplainer class - CHANGE THIS TO MATCH YOUR ACTUAL FILE NAME
from paste2 import KGExplainer  # Replace "paste2" with your module name

def main():
    if len(sys.argv) != 4:
        print("Usage: python analyze_kg.py ground_truth_path prediction_kg_path output_path")
        sys.exit(1)
    
    ground_truth_path = sys.argv[1]
    prediction_kg_path = sys.argv[2]
    output_path = sys.argv[3]
    
    try:
        # Create explainer instance
        explainer = KGExplainer(ground_truth_path, prediction_kg_path)
        
        # Perform analysis
        results = explainer.analyze()
        
        # Save results
        explainer.save_results(output_path)
        
        print(f"Analysis completed successfully. Results saved to {output_path}")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()


