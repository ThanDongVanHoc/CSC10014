# Interactive Model API

This is an interactive information collection model using Google Gemini 1.5 Flash API.

## Features

### Query Type 1: Interactive Information Collection

- Analyzes user queries to extract information
- Maintains a structured information schema (address, nationality, problem, etc.)
- Generates follow-up questions for missing information
- Returns JSON with completion status

### Query Type 2: Guidance Generation

- Takes top-k results from Model A
- Generates structured guidance using RAG approach
- Prioritizes official/government sources
- Returns step-by-step instructions

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Create `.env` file with your API key:

```
GEMINI_API_KEY=your_api_key_here
```

3. Run the server:

```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### POST /query1

Interactive information collection

**Request:**

```json
{
  "query": "Tôi là người Indonesia muốn gia hạn visa",
  "collected_info": {}
}
```

**Response:**

```json
{
  "questions": ["Bạn đang ở địa chỉ nào?", "Năm sinh của bạn là?"],
  "collected_info": {
    "nationality": "Indonesia",
    "problem": "gia hạn visa"
  },
  "is_complete": false,
  "info_status": {
    "current_address": 0,
    "num_people": 0,
    "nationality": 1,
    "problem": 1,
    "full_name": 0,
    "birth_year": 0
  }
}
```

### POST /query2

Generate guidance from Model A results

**Request:**

```json
{
  "original_query": "Tôi là người Indonesia muốn gia hạn visa",
  "top_k_results": [
    {
      "Ma": "LSQ_001",
      "Ten": "Tổng Lãnh sự quán Indonesia",
      "DiaChi": "18 Phùng Khắc Khoan, P. Đa Kao, Quận 1",
      "SDT": "02838251888",
      "Website": "https://www.kemlu.go.id/hochiminhcity"
    }
  ],
  "collected_info": {
    "nationality": "Indonesia",
    "problem": "gia hạn visa",
    "current_address": "123 Nguyen Hue, Q1"
  }
}
```

**Response:**

```json
{
  "guide": {
    "Chuẩn bị": "...",
    "Giấy tờ cần thiết": "...",
    "Địa điểm và thời gian": "...",
    "Thủ tục": "...",
    "Lưu ý quan trọng": "..."
  },
  "top_result": { ... }
}
```

## Information Schema

The model collects the following information:

- `current_address`: Current residential address
- `num_people`: Number of people affected
- `nationality`: Country/nationality
- `problem`: Problem description
- `full_name`: Full name
- `birth_year`: Year of birth

Status values:

- `0`: Missing
- `1`: Collected
- `0.5`: Partial/unclear (filtered out before sending to backend)

## Workflow

1. User sends initial query → `/query1`
2. Model analyzes and extracts available information
3. If incomplete, returns questions for missing info
4. User provides more info → `/query1` (repeat until complete)
5. When complete (`is_complete: true`), backend calls Model A
6. Backend sends Model A's top-k results → `/query2`
7. Model generates structured guidance
8. Return guide to user
