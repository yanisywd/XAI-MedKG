

from flask import Flask, request, jsonify, make_response
import json
import os
import re
import logging
from openai import OpenAI
from gpt_to_jsonkg import create_kg_from_prediction
from xai import KGExplainer

# OpenAI API key
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "your-api-key")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze_gpt_response():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS preflight request")
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")  # Allow all origins
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response
    
    logger.info("Handling POST request to /api/analyze")
    
    try:
        # Get the GPT response from the request
        gpt_data = request.json
        logger.info(f"Received data: {json.dumps(gpt_data)[:100]}...")
        
        # Define file paths in the same directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        ground_truth_path = os.path.join(current_dir, "knowledge_graph.json")
        pred_kg_path = os.path.join(current_dir, "temp_pred_kg.json")
        
        # Step 1: Generate knowledge graph from GPT response
        logger.info("Generating knowledge graph...")
        kg = create_kg_from_prediction(gpt_data, pred_kg_path)
        logger.info(f"Created knowledge graph with {len(kg['nodes'])} nodes and {len(kg['links'])} links")
        
        # Step 2: Analyze the knowledge graph
        logger.info("Analyzing knowledge graph...")
        explainer = KGExplainer(ground_truth_path, pred_kg_path)
        explainer.analyze()
        viz_data = explainer.get_visualization_data()
        
        # Return the visualization data directly
        logger.info("Sending response...")
        response = jsonify({"success": True, "data": viz_data})
        response.headers.add("Access-Control-Allow-Origin", "*")  # Add CORS header
        return response
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")  # Add CORS header
        return response, 500



# Helper function to get nodes of a specific type from the knowledge graph
def get_nodes_by_type(node_type):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    kg_path = os.path.join(current_dir, "knowledge_graph.json")
    
    try:
        with open(kg_path, 'r') as f:
            kg_data = json.load(f)
        
        nodes = []
        for node in kg_data['nodes']:
            if node['type'] == node_type:
                nodes.append({
                    'id': node['id'],
                    'custom': node.get('custom', False)
                })
        
        return nodes
    except Exception as e:
        logger.error(f"Error getting nodes of type {node_type}: {str(e)}")
        return []

# Endpoint to get all diseases from the knowledge graph
@app.route('/api/diseases', methods=['GET', 'OPTIONS'])
def get_diseases():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET")
        return response
    
    try:
        # Path to the knowledge graph file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        kg_path = os.path.join(current_dir, "knowledge_graph.json")
        
        # Read the knowledge graph file
        with open(kg_path, 'r') as f:
            kg_data = json.load(f)
        
        # Extract all disease nodes
        diseases = []
        for node in kg_data['nodes']:
            if node['type'] == 'Disease':
                diseases.append(node['id'])
        
        # Return the list of diseases
        response = jsonify({"success": True, "diseases": diseases})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    except Exception as e:
        logger.error(f"Error getting diseases: {str(e)}")
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

# Endpoint to get information about a specific disease
@app.route('/api/disease/<disease_name>', methods=['GET', 'OPTIONS'])
def get_disease(disease_name):
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET")
        return response
    
    try:
        # Path to the knowledge graph file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        kg_path = os.path.join(current_dir, "knowledge_graph.json")
        
        # Read the knowledge graph file
        with open(kg_path, 'r') as f:
            kg_data = json.load(f)
        
        # Check if the disease exists
        disease_exists = False
        for node in kg_data['nodes']:
            if node['type'] == 'Disease' and node['id'] == disease_name:
                disease_exists = True
                break
        
        if not disease_exists:
            response = jsonify({"success": False, "error": f"Disease '{disease_name}' not found"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 404
        
        # Get all connections for this disease
        connections = []
        for link in kg_data['links']:
            if link['source'] == disease_name:
                connections.append({
                    'target': link['target'],
                    'relationship': link['relationship'],
                    'weight': link.get('weight', 0.5)
                })
        
        # Return the disease connections
        response = jsonify({"success": True, "disease": disease_name, "connections": connections})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    except Exception as e:
        logger.error(f"Error getting disease connections: {str(e)}")
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

# Endpoint to get all symptoms from the knowledge graph
@app.route('/api/symptoms', methods=['GET', 'OPTIONS'])
def get_symptoms():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET")
        return response
    
    try:
        # Get all symptom nodes
        symptoms = get_nodes_by_type('Symptom')
        
        # Return the symptoms
        response = jsonify({
            "success": True, 
            "symptoms": [symptom['id'] for symptom in symptoms],
            "custom_symptoms": [symptom['id'] for symptom in symptoms if symptom.get('custom')]
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    except Exception as e:
        logger.error(f"Error getting symptoms: {str(e)}")
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500




# Add this endpoint to your api.py file

@app.route('/api/update-info-file', methods=['POST', 'OPTIONS'])
def update_info_file():
    """
    Update the info.txt file with the provided data.
    This endpoint updates the disease and symptom information in the text file.
    """
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response
    
    try:
        # Get the request data
        data = request.json
        logger.info(f"Received request to update info file with data: {data}")
        
        # Use the correct path to info.txt in the backend folder
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, "info.txt")
        
        logger.info(f"Target file path: {file_path}")
        logger.info(f"Current working directory: {os.getcwd()}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            error_msg = f"File not found: {file_path}"
            logger.error(error_msg)
            response = jsonify({"success": False, "error": error_msg})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 404
        
        # Read the existing file content
        try:
            with open(file_path, 'r') as file:
                current_content = file.read()
                logger.info(f"Successfully read file, content length: {len(current_content)}")
        except Exception as e:
            error_msg = f"Error reading file: {str(e)}"
            logger.error(error_msg)
            response = jsonify({"success": False, "error": error_msg})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 500
        
        # Parse the existing content into sections
        sections = {}
        current_section = None
        
        for line in current_content.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            if ':' in line and line.split(':', 1)[0].strip() in ['Diseases', 'Symptoms', 'Age Groups', 'Gender', 'Blood Pressure', 'Cholesterol Level']:
                section_name, section_content = line.split(':', 1)
                current_section = section_name.strip()
                sections[current_section] = section_content.strip()
            elif current_section:
                sections[current_section] += line
        
        logger.info(f"Parsed sections: {sections.keys()}")
        
        # Update the sections based on the data provided
        if 'allDiseases' in data:
            all_diseases = data['allDiseases']
            # Sort alphabetically to maintain order
            all_diseases.sort()
            sections['Diseases'] = ', '.join(all_diseases)
            logger.info(f"Updated Diseases section with {len(all_diseases)} diseases")
        
        if 'allSymptoms' in data:
            all_symptoms = data['allSymptoms']
            # Sort alphabetically to maintain order
            all_symptoms.sort()
            sections['Symptoms'] = ', '.join(all_symptoms)
            logger.info(f"Updated Symptoms section with {len(all_symptoms)} symptoms")
        
        # Reconstruct the file content
        updated_content = ""
        for section, content in sections.items():
            updated_content += f"{section}: {content}\n"
        
        logger.info(f"Prepared updated content: {updated_content[:100]}...")
        
        # Create a backup of the original file just in case
        backup_path = file_path + ".backup"
        try:
            with open(backup_path, 'w') as backup_file:
                backup_file.write(current_content)
                logger.info(f"Created backup at: {backup_path}")
        except Exception as e:
            logger.warning(f"Could not create backup: {str(e)}")
        
        # Write the updated content back to the file
        try:
            with open(file_path, 'w') as file:
                file.write(updated_content)
                logger.info(f"Successfully wrote updated content to file")
        except Exception as e:
            error_msg = f"Error writing to file: {str(e)}"
            logger.error(error_msg)
            response = jsonify({"success": False, "error": error_msg})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 500
        
        response = jsonify({
            "success": True, 
            "message": "File updated successfully"
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
        
    except Exception as e:
        error_msg = f"Error updating info file: {str(e)}"
        logger.error(error_msg)
        response = jsonify({"success": False, "error": error_msg})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500



# Endpoint to update the knowledge graph
@app.route('/api/update-graph', methods=['POST', 'OPTIONS'])
def update_graph():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response
    
    try:
        # Get the request data
        data = request.json
        disease_name = data.get('disease')
        action = data.get('action')  # 'add' or 'modify'
        connections = data.get('connections', [])
        
        if not disease_name:
            response = jsonify({"success": False, "error": "Disease name is required"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400
        
        # Path to the knowledge graph file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        kg_path = os.path.join(current_dir, "knowledge_graph.json")
        
        # Read the knowledge graph file
        with open(kg_path, 'r') as f:
            kg_data = json.load(f)
        
        # Check if the disease exists
        disease_exists = False
        for node in kg_data['nodes']:
            if node['type'] == 'Disease' and node['id'] == disease_name:
                disease_exists = True
                break
        
        # If adding a new disease and it already exists, return an error
        if action == 'add' and disease_exists:
            response = jsonify({"success": False, "error": f"Disease '{disease_name}' already exists"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400
        
        # If modifying a disease and it doesn't exist, return an error
        if action == 'modify' and not disease_exists:
            response = jsonify({"success": False, "error": f"Disease '{disease_name}' not found"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 404
        
        # If adding a new disease, add it to the nodes
        if action == 'add':
            kg_data['nodes'].append({
                'id': disease_name,
                'type': 'Disease'
            })
        
        # If modifying, remove all existing connections for this disease
        if action == 'modify':
            kg_data['links'] = [link for link in kg_data['links'] if link['source'] != disease_name]
        
        # Add the new connections
        for conn in connections:
            target = conn.get('target')
            relationship = conn.get('relationship')
            weight = conn.get('weight', 0.5)
            
            # Check if the target node exists
            target_exists = False
            target_type = None
            
            for node in kg_data['nodes']:
                if node['id'] == target:
                    target_exists = True
                    target_type = node['type']
                    break
            
            # If target doesn't exist, add it with the appropriate type
            if not target_exists:
                # Determine the type based on the relationship
                if relationship == 'HAS_SYMPTOM':
                    target_type = 'Symptom'
                    logger.info(f"Adding new symptom node: {target}")
                elif relationship == 'COMMON_IN':
                    target_type = 'Age Group'
                elif relationship == 'PREVALENT_IN':
                    target_type = 'Gender'
                elif relationship == 'ASSOCIATED_WITH':
                    target_type = 'Blood Pressure'
                elif relationship == 'CORRELATED_WITH':
                    target_type = 'Cholesterol Level'
                
                kg_data['nodes'].append({
                    'id': target,
                    'type': target_type,
                    'custom': True  # Mark as a custom-added node
                })
            
            # Add the new link
            kg_data['links'].append({
                'source': disease_name,
                'target': target,
                'relationship': relationship,
                'weight': weight
            })
        
        # Write the updated knowledge graph back to the file
        with open(kg_path, 'w') as f:
            json.dump(kg_data, f, indent=2)
        
        # Return success
        response = jsonify({"success": True})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    except Exception as e:
        logger.error(f"Error updating knowledge graph: {str(e)}")
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

@app.route('/api/gpt-inference', methods=['POST', 'OPTIONS'])
def gpt_inference():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS preflight request")
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")  # Allow all origins
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response
        
    try:
        # Get user prompt from the request
        user_prompt = request.json.get('prompt', '')
        
        if not user_prompt:
            return jsonify({"success": False, "error": "No prompt provided"}), 400
        
        # Use the correct path to info.txt in the backend folder
        current_dir = os.path.dirname(os.path.abspath(__file__))
        info_file_path = os.path.join(current_dir, "info.txt")
        logger.info(f"Looking for info.txt at: {info_file_path}")
        
        # Read the content of the file if it exists
        existing_data = ""
        try:
            with open(info_file_path, 'r', encoding='utf-8') as file:
                existing_data = file.read()
                logger.info(f"Successfully read existing data from {info_file_path}")
                print(f"\n----- EXISTING DATA -----")
                print(existing_data)
        except Exception as file_err:
            logger.error(f"Error reading existing data file: {str(file_err)}")
            print(f"\n----- FILE READ ERROR -----")
            print(f"Error: {str(file_err)}")
            existing_data = ""
            
        # Create system prompt with instructions to use existing data
        # Headache, Nausea
        system_prompt = f"""
        Tu es un systeme d'assistance medicale intelligent. Tu recevras les antécédents médicaux, l'histoire et les symptômes d'un patient 
        et tu devras les extraire, structurer et organiser en JSON de
        maniere claire et pertinente puis predire la maladie, lors de la prediction tu predit une maladie pas de phrase , par example : "predicted disease": "Eczema"

        Objectif:
        * Extraire uniquement les facteurs pertinents pour le diagnostic.
        * Ajouter ou supprimer des facteurs selon leur importance pour identifier la maladie.
        * Structurer les donnees de maniere coherente et exploitable.
        * un facteur ou un symthome peut prendre : yes/no , exeption pour les facteur : age , gender 
        pour un facteur comme blood pressure si non specifier tu dit : normal
        
        IMPORTANT - Utilisation des données existantes:
        Voici les données que nous avons déjà traitées. Si tu trouves des symptômes ou facteurs identiques, 
        utilise EXACTEMENT la même structure et les mêmes termes. Tu peux ajouter de nouveaux facteurs pertinents, 
        mais conserve absolument ce qui existe déjà:
        
        {existing_data}
        
        exemple de Format JSON attendu:
        {{"result": [{{"Fever": "No", "Cough": "No", "Fatigue": "Yes", "Difficulty Breathing": "No", 
        "Headache": "Yes", "Nausea": "No", "Age": "26", "Gender": "Female", "Blood Pressure": "Normal", 
        "Cholesterol Level": "High", "predicted disease": "Eczema"}}]}}
        
        Consignes:
        * Ne conserver que les facteurs qui ont contribué au diagnostic.
        * Ajouter ou supprimer des facteurs en fonction de leur pertinence medicale.
        * Maintenir une structure JSON claire et organisée.
        * Si un symptôme ou facteur apparaît dans les données existantes, utilise EXACTEMENT la même clé et structure.
        * Si tu peut deduire un nouveaux facteur pertinent des donnee que l'utilisateur te donne tu peut l'ajouter , meme chose si tu arrive a diagnostiquer une maladie qui nexiste pas dans nos donnee existante , mais priorise toujour nos donee existante!
        
        Tu devras aussi savoir que les ages sont structurés comme ceci:
        {{"range": (0, 17), "name": "Child"}},
        {{"range": (18, 34), "name": "Young Adult"}},
        {{"range": (35, 59), "name": "Middle Aged"}},
        {{"range": (60, 120), "name": "Senior"}}
        """
        
        logger.info("Sending request to GPT API...")
        print("\n----- USER PROMPT -----")
        print(user_prompt)
        
        # Initialize OpenAI client
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Call OpenAI API using client library
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        
        # Process response
        gpt_response = completion.choices[0].message.content
        
        # Print the raw response to terminal
        print("\n----- RAW GPT RESPONSE -----")
        print(gpt_response)
        
        logger.info("Received response from GPT API")
        
        # Parse JSON from the response
        try:
            # Remove any markdown formatting if present
            clean_response = re.sub(r'^```json\n|^```\n|```$', '', gpt_response.strip())
            
            # Print the cleaned response
            print("\n----- CLEANED RESPONSE -----")
            print(clean_response)
            
            json_response = json.loads(clean_response)
            
            # Print the parsed JSON
            print("\n----- PARSED JSON -----")
            print(json.dumps(json_response, indent=2))
            
            # Return the parsed JSON as a response
            response = jsonify(json_response)
            response.headers.add("Access-Control-Allow-Origin", "*")  # Add CORS header
            return response
            
        except json.JSONDecodeError as json_err:
            logger.error(f"Error parsing JSON from GPT response: {json_err}")
            print(f"\n----- JSON PARSE ERROR -----")
            print(f"Error: {json_err}")
            print(f"Raw response that couldn't be parsed:")
            print(gpt_response)
            
            response = jsonify({
                "success": False, 
                "error": f"Invalid JSON response from GPT: {str(json_err)}", 
                "raw_response": gpt_response
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400
                
    except Exception as e:
        logger.error(f"Error in GPT inference: {str(e)}")
        print(f"\n----- ERROR -----")
        print(f"Error: {str(e)}")
        
        response = jsonify({"success": False, "error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500


# Simple test endpoint
@app.route('/', methods=['GET'])
def index():
    response = jsonify({"status": "API is running"})
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response

if __name__ == '__main__':
    logger.info("Starting Flask server on http://localhost:5002")
    app.run(debug=True, port=5002, host='0.0.0.0')





