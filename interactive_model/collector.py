"""
Information Collector - Handles information extraction and analysis
"""
import json
from typing import Dict, Any, List
import google.generativeai as genai
from config import REQUIRED_FIELDS


class InformationCollector:
    """Manages information collection from user queries"""
    
    def __init__(self, model: genai.GenerativeModel):
        self.model = model
        self.required_fields = list(REQUIRED_FIELDS.keys())
    
    def filter_relevant_fields(self, query: str, collected_info: Dict[str, Any]) -> List[str]:
        """Filter relevant fields based on the user's query and problem category
        
        Args:
            query: User's query
            collected_info: Already collected information
            
        Returns:
            List of relevant field names (subset of REQUIRED_FIELDS)
        """
        # Build field descriptions
        fields_desc = "\n".join([
            f"- {field}: {REQUIRED_FIELDS[field]['description']}"
            for field in self.required_fields
        ])
        
        # Get problem category if available
        problem_category = collected_info.get('problem_category', 'unknown')
        
        prompt = f"""Analyze the user query and determine which information fields are RELEVANT to collect.

Query: "{query}"
Problem Category: {problem_category}
Already collected: {json.dumps(collected_info, ensure_ascii=False)}

Available fields:
{fields_desc}

RULES:
1. Only select fields that are NECESSARY for this specific problem
2. Core fields (nationality, current_location, language_spoken, problem_category) should ALWAYS be included
3. For visa issues: Include visa_type, visa_expiry_status, document_condition, residence_type
4. For medical issues: Include symptom_urgency, insurance_status, mobility_status, medical_history
5. For lost items/theft: Include incident_location, police_report_status, lost_items, document_condition
6. For general issues: Include relevant fields based on context
7. DO NOT include fields already in collected_info
8. Maximum 15 fields total

Return ONLY a JSON array of field names: ["field1", "field2", ...]

Example outputs:
- Visa query: ["nationality", "current_location", "visa_type", "visa_expiry_status", "time_constraint"]
- Medical query: ["current_location", "symptom_urgency", "insurance_status", "mobility_status"]
- Lost passport: ["nationality", "incident_location", "police_report_status", "lost_items", "document_condition"]"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = self._clean_response(response.text)
            relevant_fields = json.loads(response_text)
            
            # Validate and filter
            if not isinstance(relevant_fields, list):
                print("[WARN] Invalid response format, using all fields")
                return self.required_fields
            
            # Only keep valid field names
            valid_fields = [f for f in relevant_fields if f in self.required_fields]
            
            # Always include core fields if not present
            core_fields = ['nationality', 'current_location', 'language_spoken', 'problem_category']
            for core in core_fields:
                if core not in valid_fields and core not in collected_info:
                    valid_fields.insert(0, core)
            
            print(f"[INFO] Filtered {len(self.required_fields)} fields → {len(valid_fields)} relevant fields")
            return valid_fields
            
        except Exception as e:
            print(f"[ERROR] Filter failed: {e}")
            # Fallback: return all fields
            return self.required_fields
    
    def extract_from_query(self, query: str, collected_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract information from user query"""
        # Build field descriptions dynamically from config
        fields_desc = "\n".join([
            f"- {field}: {REQUIRED_FIELDS[field]['description']} (e.g., {', '.join(map(str, REQUIRED_FIELDS[field]['examples'][:2]))})"
            for field in self.required_fields
        ])
        
        prompt = f"""Extract structured information from user query.

Query: "{query}"
Existing data: {json.dumps(collected_info, ensure_ascii=False)}

Fields to extract:
{fields_desc}

IMPORTANT RULES:
- Extract explicitly mentioned information only
- Translate extracted values to ENGLISH for storage
- Preserve factual information (names, numbers, addresses keep original)
- Merge with existing data
- Return valid JSON only

Examples:
- "người Indonesia" → "nationality": "Indonesian"
- "gia hạn visa" → "problem": "visa renewal"
- "quận 1" → "current_address": "District 1" (or keep "quận 1" if address)
- "Budi Santoso" → "full_name": "Budi Santoso" (keep as is)

Format: {{"field": "value", ...}}"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = self._clean_response(response.text)
            extracted = json.loads(response_text)
            
            # Merge
            updated = {**collected_info, **{k: v for k, v in extracted.items() if v}}
            return updated
        except Exception as e:
            print(f"[ERROR] Extract failed: {e}")
            return collected_info
    
    def analyze_status(self, query: str, collected_info: Dict[str, Any], relevant_fields: List[str] = None) -> Dict[str, int]:
        """Analyze which fields are collected (1), missing (0), or partial (0.5)
        
        Args:
            query: User's query
            collected_info: Already collected information
            relevant_fields: Optional list of relevant fields to analyze (if None, uses all required_fields)
        """
        fields_to_check = relevant_fields if relevant_fields else self.required_fields
        status = {}
        
        # Check existing data first
        for field in fields_to_check:
            status[field] = 1 if (field in collected_info and collected_info[field]) else 0
        
        # If any missing, check current query
        if any(s == 0 for s in status.values()):
            missing = [f for f in fields_to_check if status[f] == 0]
            fields_desc = ", ".join([f"{f} ({REQUIRED_FIELDS[f]['description']})" for f in missing])
            
            prompt = f"""Analyze if the query contains information for these fields: {fields_desc}

Query: "{query}"

Return JSON format: {{"field": status}}
Status values:
- 1: clearly present in query
- 0: not mentioned
- 0.5: partially mentioned or unclear

Only return the JSON object."""
            
            try:
                response = self.model.generate_content(prompt)
                response_text = self._clean_response(response.text)
                new_status = json.loads(response_text)
                
                # Update only missing fields
                for field in missing:
                    if field in new_status:
                        status[field] = new_status[field]
            except Exception as e:
                print(f"[ERROR] Analyze failed: {e}")
        
        return status
    
    def _clean_response(self, text: str) -> str:
        """Remove markdown code blocks from response"""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if len(lines) > 2 else text
            if text.startswith("json"):
                text = text[4:].strip()
        return text.strip()
