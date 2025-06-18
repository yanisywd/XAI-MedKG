#!/usr/bin/env python3
import sys
import json

# Import your existing function - CHANGE THIS TO MATCH YOUR ACTUAL FILE NAME
from paste import create_kg_from_prediction  # Replace "paste" with your module name

def main():
    if len(sys.argv) != 3:
        print("Usage: python create_kg.py input_json_path output_kg_path")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        # Read input JSON
        with open(input_path, 'r') as f:
            input_data = json.load(f)
        
        # Call your existing function
        kg = create_kg_from_prediction(input_data, output_path)
        
        print(f"Successfully created knowledge graph with {len(kg['nodes'])} nodes and {len(kg['links'])} links")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()