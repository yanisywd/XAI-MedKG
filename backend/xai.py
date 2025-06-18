import json
import os
import pandas as pd
import networkx as nx
from collections import defaultdict
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

class KGExplainer:
    """
    Knowledge Graph Explainability Module for comparing ground truth KG with prediction-based KG
    and identifying reasoning errors, providing explanations, and generating visualization data.
    """
    
    def __init__(self, ground_truth_path, prediction_kg_path):
        """
        Initialize the KG Explainer with paths to both knowledge graphs.
        
        Args:
            ground_truth_path: Path to the ground truth knowledge graph JSON
            prediction_kg_path: Path to the prediction-based knowledge graph JSON
        """
        self.ground_truth_path = ground_truth_path
        self.prediction_kg_path = prediction_kg_path
        
        # Load the knowledge graphs
        self.load_knowledge_graphs()
        
        # Convert to NetworkX graphs for analysis
        self.ground_truth_nx = self.to_networkx(self.ground_truth_kg)
        self.prediction_nx = self.to_networkx(self.prediction_kg)
        
        # Results storage
        self.analysis_results = {
            "structural_comparison": {},
            "semantic_comparison": {},
            "reasoning_paths": {},
            "counterfactuals": {},
            "explanations": {},
            "metrics": {},
            "visualization_data": {}
        }
    
    def load_knowledge_graphs(self):
        """Load both knowledge graphs from their respective JSON files."""
        try:
            with open(self.ground_truth_path, 'r') as f:
                self.ground_truth_kg = json.load(f)
            
            with open(self.prediction_kg_path, 'r') as f:
                self.prediction_kg = json.load(f)
            
            print(f"Successfully loaded both knowledge graphs.")
            print(f"Ground truth KG: {len(self.ground_truth_kg['nodes'])} nodes, {len(self.ground_truth_kg['links'])} links")
            print(f"Prediction KG: {len(self.prediction_kg['nodes'])} nodes, {len(self.prediction_kg['links'])} links")
            
            # Extract predicted disease
            self.predicted_disease = self._get_predicted_disease()
            print(f"Predicted disease: {self.predicted_disease}")
            
        except Exception as e:
            print(f"Error loading knowledge graphs: {e}")
            raise
    
    def _get_predicted_disease(self):
        """Extract the predicted disease from the prediction KG."""
        for node in self.prediction_kg['nodes']:
            if node['type'] == 'Disease':
                return node['id']
        return None
    
    def to_networkx(self, kg_json):
        """Convert the JSON KG to a NetworkX graph for analysis."""
        G = nx.DiGraph()
        
        # Add nodes with attributes
        for node in kg_json['nodes']:
            attrs = {k: v for k, v in node.items() if k != 'id'}
            G.add_node(node['id'], **attrs)
        
        # Add edges with attributes
        for link in kg_json['links']:
            source = link['source']
            target = link['target']
            
            # Handle the case where source/target might be objects
            if isinstance(source, dict):
                source = source['id']
            if isinstance(target, dict):
                target = target['id']
                
            attrs = {k: v for k, v in link.items() if k not in ['source', 'target']}
            G.add_edge(source, target, **attrs)
        
        return G
    
    def analyze(self):
        """
        Perform comprehensive analysis comparing the two knowledge graphs.
        """
        # 1. Structural comparison
        self._structural_comparison()
        
        # 2. Semantic comparison for the specific disease
        self._semantic_comparison()
        
        # 3. Analyze reasoning paths
        self._analyze_reasoning_paths()
        
        # 4. Generate counterfactual explanations
        self._generate_counterfactuals()
        
        # 5. Create clinical explanations
        self._generate_explanations()
        
        # 6. Calculate metrics
        self._calculate_metrics()
        
        # 7. Prepare visualization data
        self._prepare_visualization_data()
        
        return self.analysis_results
    

    def _generate_counterfactuals(self):
        """Generate counterfactual explanations to show what would change the prediction."""
        results = {}
        
        if not self.predicted_disease:
            results['error'] = "No predicted disease found"
            self.analysis_results['counterfactuals'] = results
            return
        
        # Find most similar diseases based on shared factors
        disease_similarity = {}
        predicted_factors = set()
        
        # Get all factors connected to the predicted disease
        for _, target, _ in self.prediction_nx.out_edges(self.predicted_disease, data=True):
            predicted_factors.add(target)
        
        # Compare with other diseases in ground truth
        for node in self.ground_truth_kg['nodes']:
            if node['type'] == 'Disease' and node['id'] != self.predicted_disease:
                disease_id = node['id']
                disease_factors = set()
                
                for _, target, _ in self.ground_truth_nx.out_edges(disease_id, data=True):
                    disease_factors.add(target)
                
                # Calculate Jaccard similarity
                shared_factors = predicted_factors.intersection(disease_factors)
                combined_factors = predicted_factors.union(disease_factors)
                
                if combined_factors:
                    similarity = len(shared_factors) / len(combined_factors)
                    
                    # Factors that would need to change
                    factors_to_add = disease_factors - predicted_factors
                    factors_to_remove = predicted_factors - disease_factors
                    
                    disease_similarity[disease_id] = {
                        'similarity': similarity,
                        'shared_factors': list(shared_factors),
                        'factors_to_add': list(factors_to_add),
                        'factors_to_remove': list(factors_to_remove)
                    }
        
        # Find the top 3 most similar alternative diseases
        top_alternatives = sorted(
            disease_similarity.items(),
            key=lambda x: x[1]['similarity'],
            reverse=True
        )[:3]
        
        counterfactuals = []
        for disease_id, data in top_alternatives:
            # Generate a counterfactual explanation
            changes_needed = []
            
            for factor in data['factors_to_add']:
                # Get the factor type from ground truth
                factor_type = None
                relationship = None
                
                for _, target, edge_data in self.ground_truth_nx.out_edges(disease_id, data=True):
                    if target == factor:
                        factor_type = self.ground_truth_nx.nodes[target].get('type', '')
                        relationship = edge_data['relationship']
                        break
                
                if factor_type and relationship:
                    changes_needed.append({
                        'action': 'add',
                        'factor': factor,
                        'factor_type': factor_type,
                        'relationship': relationship
                    })
            
            for factor in data['factors_to_remove']:
                # Get the factor type from prediction
                factor_type = None
                relationship = None
                
                for _, target, edge_data in self.prediction_nx.out_edges(self.predicted_disease, data=True):
                    if target == factor:
                        factor_type = self.prediction_nx.nodes[target].get('type', '')
                        relationship = edge_data['relationship']
                        break
                
                if factor_type and relationship:
                    changes_needed.append({
                        'action': 'remove',
                        'factor': factor,
                        'factor_type': factor_type,
                        'relationship': relationship
                    })
            
            counterfactuals.append({
                'alternative_disease': disease_id,
                'similarity': data['similarity'],
                'changes_needed': changes_needed
            })
        
        results['alternative_diagnoses'] = counterfactuals
        
        # Generate the minimal set of changes needed for the most likely alternative
        if counterfactuals:
            most_likely_alternative = counterfactuals[0]
            results['minimal_changes_explanation'] = {
                'alternative_disease': most_likely_alternative['alternative_disease'],
                'changes': most_likely_alternative['changes_needed'],
                'explanation': self._generate_counterfactual_text(most_likely_alternative)
            }
        
        self.analysis_results['counterfactuals'] = results
    


    def _generate_counterfactual_text(self, counterfactual):
        """Generate human-readable text for a counterfactual explanation."""
        disease = counterfactual['alternative_disease']
        changes = counterfactual['changes_needed']
        
        additions = [c for c in changes if c['action'] == 'add']
        removals = [c for c in changes if c['action'] == 'remove']
        
        text = f"To change the diagnosis from {self.predicted_disease} to {disease}, the following changes would be needed:\n\n"
        
        if additions:
            text += "Additions:\n"
            for change in additions:
                relationship = change['relationship'].replace('_', ' ').lower()
                text += f"- Add {change['factor']} ({change['factor_type']}): The patient would need to {relationship} this factor.\n"
        
        if removals:
            text += "\nRemovals:\n"
            for change in removals:
                relationship = change['relationship'].replace('_', ' ').lower()
                text += f"- Remove {change['factor']} ({change['factor_type']}): The patient would need to no longer {relationship} this factor.\n"
        
        return text
    
    def _structural_comparison(self):
        """Compare the structural elements of both graphs."""
        results = {}
        
        # Node type comparison
        gt_node_types = defaultdict(int)
        pred_node_types = defaultdict(int)
        
        for node in self.ground_truth_kg['nodes']:
            gt_node_types[node['type']] += 1
        
        for node in self.prediction_kg['nodes']:
            pred_node_types[node['type']] += 1
        
        # Find shared disease nodes
        gt_disease_nodes = {node['id'] for node in self.ground_truth_kg['nodes'] if node['type'] == 'Disease'}
        pred_disease_nodes = {node['id'] for node in self.prediction_kg['nodes'] if node['type'] == 'Disease'}
        
        shared_diseases = gt_disease_nodes.intersection(pred_disease_nodes)
        
        # Relationship type comparison
        gt_rel_types = defaultdict(int)
        pred_rel_types = defaultdict(int)
        
        for link in self.ground_truth_kg['links']:
            gt_rel_types[link['relationship']] += 1
        
        for link in self.prediction_kg['links']:
            pred_rel_types[link['relationship']] += 1
        
        results['node_types'] = {
            'ground_truth': dict(gt_node_types),
            'prediction': dict(pred_node_types)
        }
        
        results['relationship_types'] = {
            'ground_truth': dict(gt_rel_types),
            'prediction': dict(pred_rel_types)
        }
        
        results['shared_diseases'] = list(shared_diseases)
        
        self.analysis_results['structural_comparison'] = results
    
    def _semantic_comparison(self):
        """Compare the semantic content focusing on the predicted disease."""
        results = {}
        
        if not self.predicted_disease:
            results['error'] = "No predicted disease found"
            self.analysis_results['semantic_comparison'] = results
            return
        
        # Check if the predicted disease exists in ground truth
        if not self.ground_truth_nx.has_node(self.predicted_disease):
            results['disease_match'] = False
            results['explanation'] = f"The predicted disease '{self.predicted_disease}' does not exist in the ground truth knowledge graph."
            self.analysis_results['semantic_comparison'] = results
            return
        
        results['disease_match'] = True
        
        # Compare outgoing links (disease -> factor relationships)
        gt_links = {}
        for _, target, data in self.ground_truth_nx.out_edges(self.predicted_disease, data=True):
            rel_type = data['relationship']
            if rel_type not in gt_links:
                gt_links[rel_type] = []
            gt_links[rel_type].append({
                'target': target,
                'weight': data['weight']
            })
        
        pred_links = {}
        # Track novel factors
        novel_factors = []
        
        for _, target, data in self.prediction_nx.out_edges(self.predicted_disease, data=True):
            rel_type = data['relationship']
            if rel_type not in pred_links:
                pred_links[rel_type] = []
            
            # Check if this is a novel factor (not in ground truth)
            is_novel = data.get('is_novel', False)
            if is_novel or (self.prediction_nx.nodes[target].get('is_novel', False)):
                is_novel = True
                
            pred_links[rel_type].append({
                'target': target,
                'weight': data['weight'],
                'is_novel': is_novel
            })
            
            # Collect novel factors
            if is_novel:
                novel_factors.append({
                    'factor': target,
                    'relationship': rel_type,
                    'factor_type': self.prediction_nx.nodes[target].get('type', '')
                })
        
        # Compare by relationship type
        relationship_comparison = {}
        
        # All relationship types that appear in either graph
        all_rel_types = set(gt_links.keys()).union(set(pred_links.keys()))
        
        for rel_type in all_rel_types:
            gt_targets = {item['target'] for item in gt_links.get(rel_type, [])}
            pred_targets = {item['target'] for item in pred_links.get(rel_type, [])}
            
            # Find matches and mismatches
            matches = gt_targets.intersection(pred_targets)
            gt_only = gt_targets - pred_targets
            pred_only = pred_targets - gt_targets
            
            # Track novel factors from prediction
            novel_in_pred = []
            for item in pred_links.get(rel_type, []):
                if item.get('is_novel', False) and item['target'] in pred_only:
                    novel_in_pred.append(item['target'])
            
            relationship_comparison[rel_type] = {
                'matches': list(matches),
                'ground_truth_only': list(gt_only),
                'prediction_only': list(pred_only),
                'novel_factors': novel_in_pred,
                'match_ratio': len(matches) / max(1, len(gt_targets)) if gt_targets else 0
            }
        
        results['relationship_comparison'] = relationship_comparison
        results['novel_factors'] = novel_factors
        
        # Calculate overall semantic similarity (excluding novel factors)
        total_matches = sum(len(data['matches']) for data in relationship_comparison.values())
        total_gt_items = sum(len(data['matches']) + len(data['ground_truth_only']) for data in relationship_comparison.values())
        
        if total_gt_items > 0:
            results['overall_similarity'] = total_matches / total_gt_items
        else:
            results['overall_similarity'] = 0
        
        self.analysis_results['semantic_comparison'] = results

    def _analyze_reasoning_paths(self):
        """Analyze reasoning paths that led to the prediction."""
        results = {}
        
        if not self.predicted_disease:
            results['error'] = "No predicted disease found"
            self.analysis_results['reasoning_paths'] = results
            return
        
        # Get all factors connected to the predicted disease in the prediction KG
        prediction_factors = {}
        novel_symptoms = []
        
        for _, target, data in self.prediction_nx.out_edges(self.predicted_disease, data=True):
            factor_type = self.prediction_nx.nodes[target].get('type', '')
            
            # Check if this is a novel factor
            is_novel = data.get('is_novel', False) or self.prediction_nx.nodes[target].get('is_novel', False)
            
            if factor_type not in prediction_factors:
                prediction_factors[factor_type] = []
            
            factor_info = {
                'factor': target,
                'relationship': data['relationship'],
                'weight': data.get('weight', 1.0),
                'is_novel': is_novel
            }
            
            prediction_factors[factor_type].append(factor_info)
            
            # Track novel symptoms separately
            if is_novel and factor_type == "Symptom":
                novel_symptoms.append(factor_info)
        
        # For each factor, check if it's a valid indicator in ground truth
        valid_reasoning = []
        invalid_reasoning = []
        novel_reasoning = []  # New category for novel factors
        
        # Track factors that have been processed to avoid duplicates
        processed_factors = set()
        
        for factor_type, factors in prediction_factors.items():
            for factor_info in factors:
                factor = factor_info['factor']
                relationship = factor_info['relationship']
                is_novel = factor_info['is_novel']
                
                # Create a unique key for this factor+relationship combination
                factor_key = f"{factor}:{relationship}"
                
                # Skip if we've already processed this factor+relationship
                if factor_key in processed_factors:
                    continue
                    
                processed_factors.add(factor_key)
                
                # Special handling for novel factors
                if is_novel:
                    novel_reasoning.append({
                        'factor_type': factor_type,
                        'factor': factor,
                        'relationship': relationship,
                        'is_novel': True,
                        'evidence': "This is a novel factor not present in the ground truth knowledge graph."
                    })
                    continue
                
                # For non-novel factors, proceed with regular validation
                # Check if this factor is connected to the predicted disease in ground truth
                is_valid = False
                evidence = ""
                
                # Special handling for DOES_NOT_HAVE_SYMPTOM relationships
                if relationship == "DOES_NOT_HAVE_SYMPTOM":
                    has_symptom_in_gt = False
                    for _, gt_target, gt_data in self.ground_truth_nx.out_edges(self.predicted_disease, data=True):
                        if gt_target == factor and gt_data['relationship'] == "HAS_SYMPTOM":
                            has_symptom_in_gt = True
                            gt_weight = gt_data.get('weight', 0)
                            if gt_weight > 0.5:
                                is_valid = False
                                evidence = f"Invalid absence - symptom is common in ground truth (weight: {gt_weight:.2f})"
                            else:
                                is_valid = True
                                evidence = f"Valid absence - symptom is uncommon in ground truth (weight: {gt_weight:.2f})"
                            break
                    
                    if not has_symptom_in_gt:
                        is_valid = True
                        evidence = "Valid absence - this symptom is not strongly associated with the disease in ground truth"
                else:
                    for _, gt_target, gt_data in self.ground_truth_nx.out_edges(self.predicted_disease, data=True):
                        if gt_target == factor and gt_data['relationship'] == relationship:
                            is_valid = True
                            gt_weight = gt_data.get('weight', 0)
                            evidence = f"Connection confirmed with weight {gt_weight:.2f}"
                            break
                
                reasoning_item = {
                    'factor_type': factor_type,
                    'factor': factor,
                    'relationship': relationship,
                    'is_valid': is_valid,
                    'evidence': evidence
                }
                
                if is_valid:
                    valid_reasoning.append(reasoning_item)
                else:
                    invalid_reasoning.append(reasoning_item)
        
        # Calculate reasoning accuracy (excluding novel factors)
        total_evaluated = len(valid_reasoning) + len(invalid_reasoning)
        reasoning_accuracy = len(valid_reasoning) / total_evaluated if total_evaluated > 0 else 0
        
        # Find potentially missing important factors
 # Find potentially missing important factors
        missing_factors = []
        if self.ground_truth_nx.has_node(self.predicted_disease):
            # Define key symptoms that should always be considered, even with lower weight
            key_symptoms = set(["Fever", "Cough", "Fatigue", "Difficulty Breathing"])
            
            for _, target, data in self.ground_truth_nx.out_edges(self.predicted_disease, data=True):
                # Get target type and weight
                target_type = self.ground_truth_nx.nodes[target].get('type', '')
                weight = data.get('weight', 0)
                relationship = data.get('relationship', '')
                
                # Modified: Check if this factor should be considered as important
                # Now includes ALL factors with weight > 0.4, regardless of type or relationship
                is_important = (
                    (weight > 0.4) or  # Any factor with significant weight
                    (target_type == "Symptom" and target in key_symptoms and weight > 0.4)  # threshold for key symptoms
                )
                
                if is_important:
                    # Check if this factor is missing in prediction
                    factor_found = False
                    for _, pred_target, pred_data in self.prediction_nx.out_edges(self.predicted_disease, data=True):
                        # Check if target is found with any relationship
                        if pred_target == target:
                            factor_found = True
                            
                            # If relationships don't match and both are significant, flag as issue
                            if pred_data['relationship'] != relationship and weight > 0.5:
                                # Create a unique key for this factor+relationship
                                factor_key = f"{target}:{pred_data['relationship']}"
                                
                                # Only add if we haven't processed it already
                                if factor_key not in processed_factors:
                                    processed_factors.add(factor_key)
                                    invalid_reasoning.append({
                                        'factor_type': target_type,
                                        'factor': target,
                                        'relationship': pred_data['relationship'],
                                        'expected_relationship': relationship,
                                        'is_valid': False,
                                        'evidence': f"Wrong relationship: factor has {pred_data['relationship']} but should have {relationship} (weight: {weight:.2f})"
                                    })
                            break
                    
                    if not factor_found:
                        missing_factors.append({
                            'factor': target,
                            'factor_type': target_type,
                            'relationship': relationship,
                            'weight': weight,
                            'is_key_symptom': target in key_symptoms
                        })
        
        # Recalculate reasoning accuracy after adding new invalid reasoning items
        total_evaluated = len(valid_reasoning) + len(invalid_reasoning)
        reasoning_accuracy = len(valid_reasoning) / total_evaluated if total_evaluated > 0 else 0
        
        results['valid_reasoning'] = valid_reasoning
        results['invalid_reasoning'] = invalid_reasoning
        results['novel_reasoning'] = novel_reasoning  # Add the new category
        results['reasoning_accuracy'] = reasoning_accuracy
        results['missing_important_factors'] = missing_factors
        
        self.analysis_results['reasoning_paths'] = results

    def _generate_explanations(self):
        """Generate natural language explanations of the reasoning analysis."""
        results = {}
        
        if not self.predicted_disease:
            results['error'] = "No predicted disease found"
            self.analysis_results['explanations'] = results
            return
        
        # Overall assessment
        reasoning_accuracy = self.analysis_results['reasoning_paths'].get('reasoning_accuracy', 0)
        valid_count = len(self.analysis_results['reasoning_paths'].get('valid_reasoning', []))
        invalid_count = len(self.analysis_results['reasoning_paths'].get('invalid_reasoning', []))
        novel_count = len(self.analysis_results['reasoning_paths'].get('novel_reasoning', []))
        
        if reasoning_accuracy >= 0.8:
            assessment = "STRONG MATCH"
            assessment_explanation = f"The model's reasoning is well-aligned with medical knowledge. {valid_count} out of {valid_count + invalid_count} factors used in the diagnosis are valid according to the ground truth knowledge graph."
        elif reasoning_accuracy >= 0.5:
            assessment = "PARTIAL MATCH"
            assessment_explanation = f"The model's reasoning is partially aligned with medical knowledge. {valid_count} out of {valid_count + invalid_count} factors used in the diagnosis are valid according to the ground truth knowledge graph."
        else:
            assessment = "WEAK MATCH"
            assessment_explanation = f"The model's reasoning shows significant deviations from medical knowledge. Only {valid_count} out of {valid_count + invalid_count} factors used in the diagnosis are valid according to the ground truth knowledge graph."
        
        # Add note about novel factors if present
        if novel_count > 0:
            assessment_explanation += f" Additionally, the model introduced {novel_count} novel factor(s) not present in the ground truth knowledge."
        
        results['assessment'] = assessment
        results['assessment_explanation'] = assessment_explanation
        
        # Detailed explanation of valid reasoning
        valid_reasoning = []
        for item in self.analysis_results['reasoning_paths'].get('valid_reasoning', []):
            relationship = item['relationship'].replace('_', ' ').lower()
            
            # Special handling for DOES_NOT_HAVE_SYMPTOM
            if item['relationship'] == "DOES_NOT_HAVE_SYMPTOM":
                explanation = f"The model correctly identified that {self.predicted_disease} does not have {item['factor']}."
            else:
                explanation = f"The model correctly identified that {self.predicted_disease} {relationship} {item['factor']}."
                    
            valid_reasoning.append({
                'factor': item['factor'],
                'explanation': explanation
            })
        
        results['valid_reasoning'] = valid_reasoning
        
        # Detailed explanation of invalid reasoning
        invalid_reasoning = []
        for item in self.analysis_results['reasoning_paths'].get('invalid_reasoning', []):
            relationship = item['relationship'].replace('_', ' ').lower()
            
            # Special handling for DOES_NOT_HAVE_SYMPTOM
            if item['relationship'] == "DOES_NOT_HAVE_SYMPTOM":
                explanation = f"The model incorrectly ruled out {item['factor']} for {self.predicted_disease}. Medical knowledge suggests this symptom is common for this disease."
            elif item.get('alternative_diseases'):
                alt_diseases = item.get('alternative_diseases', [])
                if len(alt_diseases) > 0:
                    top_alt = alt_diseases[0]['disease']
                    explanation = f"The model incorrectly associated {item['factor']} with {self.predicted_disease}. This factor is actually more strongly associated with {top_alt}."
                else:
                    explanation = f"The model incorrectly identified that {self.predicted_disease} {relationship} {item['factor']}. This association is not supported by medical knowledge."
            else:
                explanation = f"The model incorrectly identified that {self.predicted_disease} {relationship} {item['factor']}. This association is not supported by medical knowledge."
            
            invalid_reasoning.append({
                'factor': item['factor'],
                'explanation': explanation
            })
        
        results['invalid_reasoning'] = invalid_reasoning
        
        # New section for novel factors
        novel_reasoning = []
        for item in self.analysis_results['reasoning_paths'].get('novel_reasoning', []):
            relationship = item['relationship'].replace('_', ' ').lower()
            
            explanation = f"The model introduced a novel factor: {item['factor']} ({item['factor_type']}). This factor is not present in the ground truth knowledge graph, suggesting the model is including new considerations in its diagnosis."
            
            novel_reasoning.append({
                'factor': item['factor'],
                'explanation': explanation
            })
        
        results['novel_reasoning'] = novel_reasoning
        
        # Explanation of missing important factors
# In the _generate_explanations method, update the missing factors section:

# Explanation of missing important factors
        missing_factors = []
        for item in self.analysis_results['reasoning_paths'].get('missing_important_factors', []):
            relationship = item['relationship'].replace('_', ' ').lower()
            
            # Create explanations based on factor type and weight
            if item.get('is_key_symptom', False):
                explanation = f"The model completely omitted a key symptom: {item['factor']}. Medical knowledge indicates that {self.predicted_disease} typically {relationship} {item['factor']} (importance: {item['weight']:.2f}). This symptom should always be assessed."
            elif item['weight'] > 0.7:
                explanation = f"The model missed a critical factor: {item['factor']} ({item['factor_type']}). Medical knowledge strongly indicates that {self.predicted_disease} {relationship} {item['factor']} (importance: {item['weight']:.2f})."
            elif item['weight'] > 0.5:
                explanation = f"The model missed an important factor: {item['factor']} ({item['factor_type']}). Medical knowledge indicates that {self.predicted_disease} typically {relationship} {item['factor']} (importance: {item['weight']:.2f})."
            else:
                explanation = f"The model missed a relevant factor: {item['factor']} ({item['factor_type']}). Medical knowledge suggests {self.predicted_disease} may {relationship} {item['factor']} (importance: {item['weight']:.2f})."
            
            missing_factors.append({
                'factor': item['factor'],
                'explanation': explanation,
                'is_key_symptom': item.get('is_key_symptom', False),
                'weight': item['weight'],
                'factor_type': item['factor_type']
            })

        # Sort missing factors by weight and factor type to present most important first
        missing_factors.sort(key=lambda x: (-x['weight'], x.get('is_key_symptom', False), x['factor_type']))

        results['missing_factors'] = missing_factors
        
        # Summary explanation
        summary = f"Diagnosis: {self.predicted_disease}\n\n"
        summary += f"Assessment: {assessment}\n\n"
        summary += f"{assessment_explanation}\n\n"
        
        if valid_reasoning:
            summary += "CORRECT ASSOCIATIONS:\n"
            for item in valid_reasoning:
                summary += f"- {item['explanation']}\n"
            summary += "\n"
        
        if invalid_reasoning:
            summary += "INCORRECT ASSOCIATIONS:\n"
            for item in invalid_reasoning:
                summary += f"- {item['explanation']}\n"
            summary += "\n"
        
        if novel_reasoning:
            summary += "NOVEL FACTORS INTRODUCED:\n"
            for item in novel_reasoning:
                summary += f"- {item['explanation']}\n"
            summary += "\n"
        
        if missing_factors:
            summary += "MISSING IMPORTANT FACTORS:\n"
            for item in missing_factors:
                summary += f"- {item['explanation']}\n"
            summary += "\n"
        
        # Add counterfactual if available
        if 'minimal_changes_explanation' in self.analysis_results.get('counterfactuals', {}):
            minimal_changes = self.analysis_results['counterfactuals']['minimal_changes_explanation']
            summary += "ALTERNATIVE DIAGNOSIS:\n"
            summary += minimal_changes['explanation']
        
        results['summary'] = summary
        
        self.analysis_results['explanations'] = results

    def _calculate_metrics(self):
        """Calculate metrics for the explainability assessment."""
        metrics = {}
        
        # Reasoning accuracy (already calculated)
        metrics['reasoning_accuracy'] = self.analysis_results['reasoning_paths'].get('reasoning_accuracy', 0)
        
        # Semantic similarity (already calculated)
        metrics['semantic_similarity'] = self.analysis_results['semantic_comparison'].get('overall_similarity', 0)
        
        # Factor coverage (percentage of important ground truth factors included in prediction)
        gt_factors = set()
        for _, target, data in self.ground_truth_nx.out_edges(self.predicted_disease, data=True):
            if data.get('weight', 0) > 0.5:  # Only consider moderately important factors
                gt_factors.add(target)
        
        pred_factors = set()
        pred_novel_factors = set()
        for _, target, data in self.prediction_nx.out_edges(self.predicted_disease, data=True):
            pred_factors.add(target)
            if data.get('is_novel', False) or self.prediction_nx.nodes[target].get('is_novel', False):
                pred_novel_factors.add(target)
        
        if gt_factors:
            metrics['factor_coverage'] = len(gt_factors.intersection(pred_factors)) / len(gt_factors)
        else:
            metrics['factor_coverage'] = 0
        
        # Novelty (percentage of prediction factors not in ground truth)
        if pred_factors:
            # Calculate both ways: 
            # 1. Based on explicitly marked novel factors
            metrics['explicit_novelty'] = len(pred_novel_factors) / len(pred_factors) if len(pred_factors) > 0 else 0
            
            # 2. Based on factors not in ground truth (traditional way)
            metrics['novelty'] = len(pred_factors - gt_factors) / len(pred_factors)
            
            # For the final metric, prefer the explicit marking if available
            if metrics['explicit_novelty'] > 0:
                metrics['combined_novelty'] = metrics['explicit_novelty']
            else:
                metrics['combined_novelty'] = metrics['novelty']
        else:
            metrics['novelty'] = 0
            metrics['explicit_novelty'] = 0
            metrics['combined_novelty'] = 0
        
        # Confidence score (combined metric)
        metrics['confidence_score'] = (
            metrics['reasoning_accuracy'] * 0.4 +
            metrics['semantic_similarity'] * 0.3 +
            metrics['factor_coverage'] * 0.3
        )
        
        # Overall reliability assessment
        if metrics['confidence_score'] >= 0.8:
            metrics['reliability'] = "HIGH"
        elif metrics['confidence_score'] >= 0.5:
            metrics['reliability'] = "MEDIUM"
        else:
            metrics['reliability'] = "LOW"
        
        self.analysis_results['metrics'] = metrics

    def _prepare_visualization_data(self):
        """Prepare data for visualization in the React component."""
        viz_data = {}
        
        # Combine both graphs for visualization
        combined_nodes = []
        combined_links = []
        
        # Track nodes to avoid duplicates
        node_map = {}
        
        # Process ground truth nodes first
        for node in self.ground_truth_kg['nodes']:
            node_id = node['id']
            node_copy = node.copy()
            node_copy['source'] = 'ground_truth'
            combined_nodes.append(node_copy)
            node_map[node_id] = len(combined_nodes) - 1
        
        # Process prediction nodes, marking shared ones
        for node in self.prediction_kg['nodes']:
            node_id = node['id']
            if node_id in node_map:
                # Node exists in both graphs
                combined_nodes[node_map[node_id]]['source'] = 'both'
            else:
                # Node only in prediction
                node_copy = node.copy()
                node_copy['source'] = 'prediction'
                
                # Mark novel nodes
                if node.get('is_novel', False):
                    node_copy['is_novel'] = True
                    
                combined_nodes.append(node_copy)
                node_map[node_id] = len(combined_nodes) - 1
        
        # Process ground truth links
        for link in self.ground_truth_kg['links']:
            link_copy = link.copy()
            link_copy['source_graph'] = 'ground_truth'
            
            # Check if both nodes exist in the combined graph
            source_id = link['source'] if isinstance(link['source'], str) else link['source']['id']
            target_id = link['target'] if isinstance(link['target'], str) else link['target']['id']
            
            if source_id in node_map and target_id in node_map:
                link_copy['source'] = source_id
                link_copy['target'] = target_id
                combined_links.append(link_copy)
        
        # Process prediction links
        for link in self.prediction_kg['links']:
            link_copy = link.copy()
            
            # Check if both nodes exist in the combined graph
            source_id = link['source'] if isinstance(link['source'], str) else link['source']['id']
            target_id = link['target'] if isinstance(link['target'], str) else link['target']['id']
            
            if source_id in node_map and target_id in node_map:
                # Check if this link exists in ground truth
                link_exists = False
                match_weight = 0
                
                for gt_link in self.ground_truth_kg['links']:
                    gt_source = gt_link['source'] if isinstance(gt_link['source'], str) else gt_link['source']['id']
                    gt_target = gt_link['target'] if isinstance(gt_link['target'], str) else gt_link['target']['id']
                    
                    if (gt_source == source_id and gt_target == target_id and 
                        gt_link['relationship'] == link['relationship']):
                        link_exists = True
                        match_weight = gt_link.get('weight', 0)
                        break
                
                if link_exists:
                    link_copy['source_graph'] = 'both'
                    link_copy['ground_truth_weight'] = match_weight
                else:
                    link_copy['source_graph'] = 'prediction'
                    
                    # Mark novel links
                    if link.get('is_novel', False):
                        link_copy['is_novel'] = True
                
                link_copy['source'] = source_id
                link_copy['target'] = target_id
                combined_links.append(link_copy)
        
        # Add assessment data
        assessment_data = {
            'predicted_disease': self.predicted_disease,
            'assessment': self.analysis_results['explanations'].get('assessment', 'UNKNOWN'),
            'confidence_score': self.analysis_results['metrics'].get('confidence_score', 0),
            'reasoning_accuracy': self.analysis_results['metrics'].get('reasoning_accuracy', 0),
            'semantic_similarity': self.analysis_results['metrics'].get('semantic_similarity', 0),
            'factor_coverage': self.analysis_results['metrics'].get('factor_coverage', 0),
            'novelty': self.analysis_results['metrics'].get('combined_novelty', 0),
            'reliability': self.analysis_results['metrics'].get('reliability', 'UNKNOWN')
        }
        
        # Add explanation data
        explanation_data = {
            'valid_reasoning': self.analysis_results['explanations'].get('valid_reasoning', []),
            'invalid_reasoning': self.analysis_results['explanations'].get('invalid_reasoning', []),
            'novel_reasoning': self.analysis_results['explanations'].get('novel_reasoning', []),  # Add the new category
            'missing_factors': self.analysis_results['explanations'].get('missing_factors', []),
            'summary': self.analysis_results['explanations'].get('summary', '')
        }
        
        # Add counterfactual data
        counterfactual_data = {}
        if 'alternative_diagnoses' in self.analysis_results.get('counterfactuals', {}):
            counterfactual_data['alternatives'] = self.analysis_results['counterfactuals']['alternative_diagnoses']
        
        if 'minimal_changes_explanation' in self.analysis_results.get('counterfactuals', {}):
            counterfactual_data['minimal_changes'] = self.analysis_results['counterfactuals']['minimal_changes_explanation']
        
        viz_data['combined_graph'] = {
            'nodes': combined_nodes,
            'links': combined_links
        }
        
        viz_data['assessment'] = assessment_data
        viz_data['explanations'] = explanation_data
        viz_data['counterfactuals'] = counterfactual_data
        
        self.analysis_results['visualization_data'] = viz_data



    def save_results(self, output_path):
        """Save the analysis results to a JSON file."""
        with open(output_path, 'w') as f:
            json.dump(self.analysis_results, f, indent=2)
        print(f"Analysis results saved to {output_path}")
    
    def get_visualization_data(self):
        """Return the visualization data for the React component."""
        return self.analysis_results['visualization_data']


def main():
    # Get the paths to the knowledge graphs
    ground_truth_path = "/Users/yanis/Desktop/presentation-kod/kod/src/knowledge_graph.json"
    prediction_kg_path = "/Users/yanis/Desktop/presentation-kod/kod/src/pred-kg.json"
    output_path = "/Users/yanis/Desktop/presentation-kod/kod/src/kg_analysis_results.json"
    
    # Create the explainer
    explainer = KGExplainer(ground_truth_path, prediction_kg_path)
    
    # Perform the analysis
    results = explainer.analyze()
    
    # Save the results
    explainer.save_results(output_path)
    
    # Print a summary
    print("\nAnalysis Summary:")
    print(f"Predicted Disease: {explainer.predicted_disease}")
    if 'metrics' in results:
        print(f"Reasoning Accuracy: {results['metrics'].get('reasoning_accuracy', 0) * 100:.1f}%")
        print(f"Semantic Similarity: {results['metrics'].get('semantic_similarity', 0) * 100:.1f}%")
        print(f"Factor Coverage: {results['metrics'].get('factor_coverage', 0) * 100:.1f}%")
        print(f"Reliability: {results['metrics'].get('reliability', 'UNKNOWN')}")
    
    if 'explanations' in results and 'assessment' in results['explanations']:
        print(f"\nAssessment: {results['explanations']['assessment']}")
    
    return 0


if __name__ == "__main__":
    main()



