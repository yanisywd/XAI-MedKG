


import json
import os

def parse_info_file(file_path):
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        if "Symptoms:" not in content:
            print("Warning: Could not find Symptoms section in info file")
            return []
        
        parts = content.split("Symptoms:")[1].split("Age Groups:")[0].strip()
        symptoms = [symptom.strip() for symptom in parts.split(',')]
        
        return symptoms
    except Exception as e:
        print(f"Error reading or parsing info file: {e}")
        return []

def create_kg_from_prediction(prediction_json, output_path=None, info_file_path='/Users/yanis/Desktop/presentation-kod/backend/info.txt'):
    """
    Creates a knowledge graph from a single disease prediction result.
    
    Args:
        prediction_json: Path to JSON file or JSON string/dictionary with prediction result
        output_path: Path to save the JSON output (optional)
        info_file_path: Path to the info.txt file containing known symptoms
    
    Returns:
        The knowledge graph as a dictionary
    """
    if isinstance(prediction_json, str):
        if os.path.isfile(prediction_json):
            with open(prediction_json, 'r') as f:
                data = json.load(f)
        else:
            data = json.loads(prediction_json)
    else:
        data = prediction_json
    
    if 'result' in data and isinstance(data['result'], list) and len(data['result']) > 0:
        prediction = data['result'][0]
    else:
        raise ValueError("Invalid prediction format. Expected a 'result' array with at least one item.")
    
    disease = prediction.get("predicted disease", "")
    if not disease:
        raise ValueError("No predicted disease found in the result.")
    
    knowledge_graph = {
        "nodes": [],
        "links": []
    }
    
    unique_nodes = set()
    
    def add_node(node_id, node_type, properties=None):
        if node_id not in unique_nodes:
            node = {"id": node_id, "type": node_type}
            if properties:
                node.update(properties)
            knowledge_graph["nodes"].append(node)
            unique_nodes.add(node_id)
    
    add_node(disease, "Disease")
    
    known_symptom_columns = parse_info_file(info_file_path)
    if not known_symptom_columns:
        known_symptom_columns = ["Fever", "Cough", "Fatigue", "Difficulty Breathing"]
    
    #key nom du sym
    # value : yes /no
    for key, value in prediction.items():
        if key == "predicted disease" or key in ["Age", "Gender", "Blood Pressure", "Cholesterol Level"]:
            continue
        
        if isinstance(value, str) and value.lower() in ["yes", "no"]:
            is_novel = key not in known_symptom_columns
            
            symptom_node_id = key
            add_node(symptom_node_id, "Symptom", {"is_novel": is_novel})
            
            if value.lower() == "yes":
                knowledge_graph["links"].append({
                    "source": disease,
                    "target": symptom_node_id,
                    "relationship": "HAS_SYMPTOM",
                    "weight": 1.0,
                    "is_novel": is_novel
                })
            elif value.lower() == "no":
                knowledge_graph["links"].append({
                    "source": disease,
                    "target": symptom_node_id,
                    "relationship": "DOES_NOT_HAVE_SYMPTOM",
                    "weight": 1.0,
                    "is_novel": is_novel
                })
    
    age = prediction.get("Age", "")
    if age:
        try:
            age_value = int(age)
            if 0 <= age_value <= 17:
                age_group = "Child Age"
            elif 18 <= age_value <= 34:
                age_group = "Young Adult Age"
            elif 35 <= age_value <= 59:
                age_group = "Middle Aged Age"
            else:
                age_group = "Senior Age"
            
            add_node(age_group, "Age Group")
            
            knowledge_graph["links"].append({
                "source": disease,
                "target": age_group,
                "relationship": "COMMON_IN",
                "weight": 1.0
            })
        except ValueError:
            pass
    
    gender = prediction.get("Gender", "")
    if gender:
        gender_node_id = f"{gender} Gender"
        add_node(gender_node_id, "Gender")
        
        knowledge_graph["links"].append({
            "source": disease,
            "target": gender_node_id,
            "relationship": "PREVALENT_IN",
            "weight": 1.0
        })
    
    bp = prediction.get("Blood Pressure", "")
    if bp:
        bp_node_id = f"{bp} Blood Pressure"
        add_node(bp_node_id, "Blood Pressure")
        
        knowledge_graph["links"].append({
            "source": disease,
            "target": bp_node_id,
            "relationship": "ASSOCIATED_WITH",
            "weight": 1.0
        })
    
    chol = prediction.get("Cholesterol Level", "")
    if chol:
        chol_node_id = f"{chol} Cholesterol"
        add_node(chol_node_id, "Cholesterol Level")
        
        knowledge_graph["links"].append({
            "source": disease,
            "target": chol_node_id,
            "relationship": "CORRELATED_WITH",
            "weight": 1.0
        })
    
    if output_path:
        with open(output_path, "w") as f:
            json.dump(knowledge_graph, f, indent=2)
        print(f"Knowledge graph created and saved to {output_path}")
    
    return knowledge_graph

if __name__ == "__main__":
    example_json = {
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
    }
    
    kg = create_kg_from_prediction(example_json, "pred-kg.json")
    print(f"Created knowledge graph with {len(kg['nodes'])} nodes and {len(kg['links'])} links")





