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
    
    def analyze_status(self, query: str, collected_info: Dict[str, Any]) -> Dict[str, int]:
        """Analyze which fields are collected (1), missing (0), or partial (0.5)"""
        status = {}
        
        # Check existing data first
        for field in self.required_fields:
            status[field] = 1 if (field in collected_info and collected_info[field]) else 0
        
        # If any missing, check current query
        if any(s == 0 for s in status.values()):
            missing = [f for f in self.required_fields if status[f] == 0]
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
