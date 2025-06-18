import pandas as pd
import json
import os
from collections import defaultdict

def create_knowledge_graph_from_csv(csv_path, output_path=None):
    """
    Creates a clear and explicit knowledge graph in JSON format from a medical dataset CSV.
    
    This graph connects diseases to their associated features for better explainability.
    Each node represents either a disease or a specific feature value (e.g., "High Blood Pressure").
    
    Args:
        csv_path: Path to the CSV file
        output_path: Path to save the JSON output (default: same directory as CSV)
    
    Returns:
        The knowledge graph as a dictionary
    """
    # Read the CSV
    df = pd.read_csv(csv_path)
    
    # Set default output path if not provided
    if output_path is None:
        output_path = os.path.join(os.path.dirname(csv_path), "knowledge_graph.json")
    
    # Initialize the knowledge graph
    knowledge_graph = {
        "nodes": [],
        "links": []
    }
    
    # Track unique nodes to avoid duplicates
    unique_nodes = set()
    
    # Function to add a node to the graph if it doesn't exist
    def add_node(node_id, node_type, properties=None):
        if node_id not in unique_nodes:
            node = {"id": node_id, "type": node_type}
            if properties:
                node.update(properties)
            knowledge_graph["nodes"].append(node)
            unique_nodes.add(node_id)
    
    # ========== Process Diseases ==========
    for disease in df["Disease"].unique():
        add_node(disease, "Disease")
    
    # ========== Process Symptoms ==========
    # Process binary symptom columns as individual nodes
    symptom_columns = ["Fever", "Cough", "Fatigue", "Difficulty Breathing"]
    
    for symptom in symptom_columns:
        # Create nodes for Symptom (Yes)
        symptom_node_id = f"{symptom}"
        add_node(symptom_node_id, "Symptom")
        
        # Create relationships: Disease -> has symptom -> Symptom
        for disease in df["Disease"].unique():
            # Filter rows for this disease
            disease_rows = df[df["Disease"] == disease]
            
            # Skip if there are no cases
            if len(disease_rows) == 0:
                continue
            
            # Check if this symptom is common for this disease
            yes_count = (disease_rows[symptom] == "Yes").sum()
            if yes_count > 0:
                weight = float(yes_count / len(disease_rows))
                if weight > 0.4:  # Only include if more than 50% have the symptom
                    knowledge_graph["links"].append({
                        "source": disease,
                        "target": symptom_node_id,
                        "relationship": "HAS_SYMPTOM",
                        "weight": weight
                    })
    
    # ========== Process Age ==========
    # Define age groups
    age_groups = [
        {"range": (0, 17), "name": "Child"},
        {"range": (18, 34), "name": "Young Adult"},
        {"range": (35, 59), "name": "Middle Aged"},
        {"range": (60, 120), "name": "Senior"}
    ]
    
    # Add age group nodes
    for group in age_groups:
        node_id = f"{group['name']} Age"
        add_node(node_id, "Age Group", {
            "min_age": group["range"][0],
            "max_age": group["range"][1]
        })
    
    # Function to get age group from age
    def get_age_group(age):
        for group in age_groups:
            if group["range"][0] <= age <= group["range"][1]:
                return f"{group['name']} Age"
        return None
    
    # Create relationship: Disease -> common in -> Age Group
    for disease in df["Disease"].unique():
        disease_rows = df[df["Disease"] == disease]
        
        # Skip if there are no cases
        if len(disease_rows) == 0:
            continue
        
        # Get counts by age group
        age_group_counts = defaultdict(int)
        for age in disease_rows["Age"]:
            age_group = get_age_group(age)
            if age_group:
                age_group_counts[age_group] += 1
        
        # Find significant age groups for this disease
        if age_group_counts:
            total = len(disease_rows)
            for age_group, count in age_group_counts.items():
                weight = float(count / total)
                if weight > 0.3:  # At least 30% of cases are in this age group
                    knowledge_graph["links"].append({
                        "source": disease,
                        "target": age_group,
                        "relationship": "COMMON_IN",
                        "weight": weight
                    })
    
    # ========== Process Gender ==========
    # Add gender nodes
    for gender in df["Gender"].unique():
        add_node(f"{gender} Gender", "Gender")
    
    # Create relationship: Disease -> prevalent in -> Gender
    for disease in df["Disease"].unique():
        disease_rows = df[df["Disease"] == disease]
        
        # Skip if there are no cases
        if len(disease_rows) == 0:
            continue
        
        # Get counts by gender
        gender_counts = disease_rows["Gender"].value_counts()
        
        # Check for clear prevalence
        total = len(disease_rows)
        for gender, count in gender_counts.items():
            weight = float(count / total)
            if weight > 0.3:  # At least 30% prevalence
                knowledge_graph["links"].append({
                    "source": disease,
                    "target": f"{gender} Gender",
                    "relationship": "PREVALENT_IN",
                    "weight": weight
                })
    
    # ========== Process Blood Pressure ==========
    # Add blood pressure nodes
    for bp in df["Blood Pressure"].unique():
        add_node(f"{bp} Blood Pressure", "Blood Pressure")
    
    # Create relationship: Disease -> associated with -> Blood Pressure
    for disease in df["Disease"].unique():
        disease_rows = df[df["Disease"] == disease]
        
        # Skip if there are no cases
        if len(disease_rows) == 0:
            continue
        
        # Get counts by blood pressure
        bp_counts = disease_rows["Blood Pressure"].value_counts()
        
        # Find significant associations
        total = len(disease_rows)
        for bp, count in bp_counts.items():
            weight = float(count / total)
            if weight > 0.3:  # At least 30% of cases have this BP
                knowledge_graph["links"].append({
                    "source": disease,
                    "target": f"{bp} Blood Pressure",
                    "relationship": "ASSOCIATED_WITH",
                    "weight": weight
                })
    
    # ========== Process Cholesterol Levels ==========
    # Add cholesterol level nodes
    for level in df["Cholesterol Level"].unique():
        add_node(f"{level} Cholesterol", "Cholesterol Level")
    
    # Create relationship: Disease -> correlated with -> Cholesterol Level
    for disease in df["Disease"].unique():
        disease_rows = df[df["Disease"] == disease]
        
        # Skip if there are no cases
        if len(disease_rows) == 0:
            continue
        
        # Get counts by cholesterol level
        chol_counts = disease_rows["Cholesterol Level"].value_counts()
        
        # Find significant correlations
        total = len(disease_rows)
        for level, count in chol_counts.items():
            weight = float(count / total)
            if weight > 0.3:  # At least 30% of cases have this cholesterol level
                knowledge_graph["links"].append({
                    "source": disease,
                    "target": f"{level} Cholesterol",
                    "relationship": "CORRELATED_WITH",
                    "weight": weight
                })
    
    # Save the knowledge graph as JSON
    with open(output_path, "w") as f:
        json.dump(knowledge_graph, f, indent=2)
    
    print(f"Knowledge graph created and saved to {output_path}")
    return knowledge_graph

# Execute the function with the specified CSV path
if __name__ == "__main__":
    csv_path = "/Users/yanis/Desktop/presentation-kod/ds-mf-filtered.csv"
    create_knowledge_graph_from_csv(csv_path)





create_knowledge_graph_from_csv(csv_path)
 