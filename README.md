# XAI-MedKG

An innovative explainability system for medical predictions from large language models.

## Overview

XAI-MedKG transforms textual medical predictions from GPT-4 into structured knowledge graphs and compares them against reference medical datasets. This approach provides detailed explanations about diagnostic associations, identifies model innovations, and enables counterfactual analysis for medical AI transparency.

## Features

- **Knowledge Graph Generation**: Converts GPT-4 medical predictions into structured knowledge graphs
- **Reference Comparison**: Compares predictions against validated medical knowledge bases
- **Explainability Analysis**: Generates detailed explanations for diagnostic associations
- **Innovation Detection**: Identifies novel patterns and associations in model predictions
- **Counterfactual Analysis**: Provides alternative diagnostic scenarios and reasoning
- **Interactive Interface**: Allows medical experts to continuously enrich the reference knowledge base

## Technology Stack

- **Frontend**: React.js
- **Backend**: Flask
- **Data Processing**: Medical datasets (CSV format)
- **AI Integration**: GPT-4 API

## How It Works

1. **Input**: Medical text predictions from GPT-4
2. **Processing**: Transform predictions into knowledge graphs
3. **Comparison**: Match against reference medical knowledge base
4. **Analysis**: Generate explainability reports and validation scores
5. **Output**: Interactive visualizations and detailed explanations
