import logging
import base64
from typing import Optional, Dict
from backend.config import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

def analyze_document_vision(file_path: str) -> Dict[str, str]:
    """
    Uses Gemini Vision to identify a document. Checks local demo_cache.json first.
    """
    # ── DEMO GUARD CACHE ──────────────────────────────────────────────────────
    try:
        import json
        file_name = os.path.basename(file_path).lower()
        cache_path = os.path.join(os.path.dirname(__file__), "..", "demo_cache.json")
        if os.path.exists(cache_path):
            with open(cache_path, "r") as f:
                cache = json.load(f)
                # Check for exact name match (e.g. 'aadhaar card.pdf')
                if file_name in cache:
                    logger.info(f"DEMO GUARD: Using cached extraction for {file_name}")
                    return cache[file_name]
                # Fallback: check if the original display name is in the cache 
                # (e.g. if the file was renamed in the DB but is one of our demo docs)
    except Exception as cache_err:
        logger.warning(f"Demo cache check failed: {cache_err}")
    # ──────────────────────────────────────────────────────────────────────────

    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set, skipping vision scan.")
        return {}

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        
        with open(file_path, "rb") as f:
            image_data = f.read()
            
        # Determine mime type based on extension
        ext = file_path.lower().split('.')[-1]
        mime_type = "image/jpeg"
        if ext == "png": mime_type = "image/png"
        elif ext == "webp": mime_type = "image/webp"
        elif ext == "pdf": mime_type = "application/pdf"

        prompt = """
        You are a highly advanced document intelligence expert. 
        Analyze the provided document and return a JSON object covering every identifiable attribute.
        
        PART 1: CLASSIFICATION
        - "category": [identity, employment, education, financial, health, legal, unknown]
        - "suggested_name": A professional title for this file (e.g., "HDFC Bank Statement Q3", "Passport - Front Page").
        - "document_date": Found date on the document (YYYY-MM-DD), if any.
        
        PART 2: ENTITY EXTRACTION
        Extract EVERY identifiable piece of information to help personalize a life-event roadmap.
        
        CORE FIELDS:
        - "full_name": Name of the primary person mentioned.
        - "reference_id": ANY unique ID, URN, Acknowledgement number, Account number, or Serial number found.
        - "locations": List of cities or states mentioned (e.g. ["Kochi", "Kerala"]).
        - "dates": Any significant dates like joining, expiry, valid-till, or issuance (YYYY-MM-DD).
        
        SPECIFIC ATTRIBUTES (Fill if applicable):
        - Identity: father_name, DOB, gender, permanent_address, ID_type (e.g. "PAN").
        - Employment: company_name, role_title, employee_id, joining_date, salary_amount, notice_period.
        - Financial: bank_name, account_last_4, ifsc_code, transaction_ref.
        
        PART 3: DYNAMIC METADATA
        - "extra_context": A 1-sentence summary of what this document proves (e.g. "Proof of address update request", "Confirmation of employment").
        - "metadata": A dictionary of ANY other key-value pairs you find that might be useful for planning (e.g. {"expiry_date": "2030-01-01", "vessel_name": "...", "policy_type": "..."}).

        Rules:
        - Return ONLY valid JSON.
        - Use null for missing fields.
        - ALWAYS expand acronyms in "suggested_name" and "extra_context" (e.g., use "Permanent Account Number" instead of "PAN", "Aadhaar Card" instead of "Aadhar").
        - Provide a "confidence" score (0-1).
        """

        # Try models in order — each has its own free-tier quota bucket:
        # flash-lite: low cost, fast, handles PDFs well
        # 2.5-flash: higher intelligence if flash-lite quota is also exhausted
        VISION_MODELS = ["gemini-2.0-flash-lite", "gemini-2.5-flash"]
        response = None
        last_err = None
        for model_name in VISION_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Content(
                            parts=[
                                types.Part.from_bytes(data=image_data, mime_type=mime_type),
                                types.Part.from_text(text=prompt)
                            ]
                        )
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                logger.info(f"Vision extraction succeeded with model: {model_name}")
                break  # success — stop trying
            except Exception as model_err:
                logger.warning(f"Vision model {model_name} failed: {model_err}")
                last_err = model_err
                continue

        if response is None:
            raise last_err or RuntimeError("All vision models failed")

        import json
        result = json.loads(response.text)
        logger.info(f"Vision Intelligence Result: {result}")

        # Normalize extracted fields for vault storage
        normalized = normalize_extracted_fields(result)
        return normalized

    except Exception as e:
        logger.error(f"Vision Scan Failed: {e}")
        return {}


def normalize_extracted_fields(raw_data: dict) -> dict:
    """
    Normalize AI-extracted fields to standardized vault field names.
    Maps company_name, locations, joining_date, etc. to consistent keys.
    """
    normalized = {}

    # Copy basic fields as-is
    for field in ['full_name', 'reference_id', 'document_date', 'category',
                  'suggested_name', 'extra_context', 'confidence']:
        if field in raw_data and raw_data[field]:
            normalized[field] = raw_data[field]

    # Employment fields
    if 'company_name' in raw_data and raw_data['company_name']:
        normalized['company_name'] = raw_data['company_name']

    if 'role_title' in raw_data and raw_data['role_title']:
        normalized['designation'] = raw_data['role_title']

    if 'employee_id' in raw_data and raw_data['employee_id']:
        normalized['employee_id'] = raw_data['employee_id']

    if 'joining_date' in raw_data and raw_data['joining_date']:
        normalized['joining_date'] = raw_data['joining_date']

    if 'salary_amount' in raw_data and raw_data['salary_amount']:
        normalized['salary_monthly'] = raw_data['salary_amount']

    # Location extraction - CRITICAL for state-specific portals
    if 'locations' in raw_data and isinstance(raw_data['locations'], list) and len(raw_data['locations']) > 0:
        # First location is typically work location
        normalized['work_location'] = raw_data['locations'][0]

        # Try to identify state from locations
        state = extract_state_from_locations(raw_data['locations'])
        if state:
            normalized['state'] = state
            normalized['state_code'] = map_state_to_code(state)

    # Identity fields
    for field in ['father_name', 'permanent_address', 'gender']:
        if field in raw_data and raw_data[field]:
            normalized[field] = raw_data[field]

    # Handle DOB field
    if 'DOB' in raw_data and raw_data['DOB']:
        normalized['dob'] = raw_data['DOB']
    elif 'date_of_birth' in raw_data and raw_data['date_of_birth']:
        normalized['dob'] = raw_data['date_of_birth']

    # Financial fields
    for field in ['bank_name', 'account_last_4', 'ifsc_code', 'pan_number', 'aadhaar_number']:
        if field in raw_data and raw_data[field]:
            normalized[field] = raw_data[field]

    # Include metadata as-is for custom fields
    if 'metadata' in raw_data and raw_data['metadata']:
        normalized['metadata'] = raw_data['metadata']

    logger.info(f"Normalized fields: {list(normalized.keys())}")
    return normalized


def extract_state_from_locations(locations: list) -> Optional[str]:
    """
    Extract Indian state name from a list of location strings.
    Handles both full state names and city → state mapping.
    """
    indian_states = {
        # Full state names
        'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
        'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
        'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
        'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
        'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
        'delhi', 'puducherry', 'chandigarh', 'dadra and nagar haveli',
        'daman and diu', 'lakshadweep', 'jammu and kashmir', 'ladakh'
    }

    # City to state mapping for common cities
    city_to_state = {
        'mumbai': 'Maharashtra', 'pune': 'Maharashtra', 'nagpur': 'Maharashtra', 'nashik': 'Maharashtra',
        'bangalore': 'Karnataka', 'bengaluru': 'Karnataka', 'mysore': 'Karnataka', 'mangalore': 'Karnataka',
        'chennai': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu',
        'hyderabad': 'Telangana', 'warangal': 'Telangana', 'secunderabad': 'Telangana',
        'delhi': 'Delhi', 'new delhi': 'Delhi', 'gurgaon': 'Haryana', 'gurugram': 'Haryana', 'faridabad': 'Haryana',
        'kolkata': 'West Bengal', 'howrah': 'West Bengal',
        'ahmedabad': 'Gujarat', 'surat': 'Gujarat', 'vadodara': 'Gujarat',
        'jaipur': 'Rajasthan', 'udaipur': 'Rajasthan', 'jodhpur': 'Rajasthan',
        'lucknow': 'Uttar Pradesh', 'kanpur': 'Uttar Pradesh', 'agra': 'Uttar Pradesh', 'varanasi': 'Uttar Pradesh',
        'chandigarh': 'Chandigarh', 'kochi': 'Kerala', 'thiruvananthapuram': 'Kerala',
        'bhopal': 'Madhya Pradesh', 'indore': 'Madhya Pradesh',
        'patna': 'Bihar', 'bhubaneswar': 'Odisha', 'guwahati': 'Assam'
    }

    for location in locations:
        location_lower = location.lower().strip()

        # Check if it's a direct state match
        if location_lower in indian_states:
            return location.title()

        # Check if it's a known city
        if location_lower in city_to_state:
            return city_to_state[location_lower]

    return None


def map_state_to_code(state_name: str) -> str:
    """Convert full state name to 2-letter code."""
    state_codes = {
        'andhra pradesh': 'ap', 'arunachal pradesh': 'ar', 'assam': 'as',
        'bihar': 'br', 'chhattisgarh': 'cg', 'goa': 'ga', 'gujarat': 'gj',
        'haryana': 'hr', 'himachal pradesh': 'hp', 'jharkhand': 'jh',
        'karnataka': 'ka', 'kerala': 'kl', 'madhya pradesh': 'mp',
        'maharashtra': 'mh', 'manipur': 'mn', 'meghalaya': 'ml',
        'mizoram': 'mz', 'nagaland': 'nl', 'odisha': 'or', 'punjab': 'pb',
        'rajasthan': 'rj', 'sikkim': 'sk', 'tamil nadu': 'tn',
        'telangana': 'ts', 'tripura': 'tr', 'uttar pradesh': 'up',
        'uttarakhand': 'uk', 'west bengal': 'wb',
        'delhi': 'dl', 'puducherry': 'py', 'chandigarh': 'ch',
        'dadra and nagar haveli': 'dn', 'daman and diu': 'dd',
        'lakshadweep': 'ld', 'jammu and kashmir': 'jk', 'ladakh': 'la'
    }
    return state_codes.get(state_name.lower().strip(), '')
