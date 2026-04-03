from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal, Optional
import os
import httpx
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Bhoomika AI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_api_key = os.getenv("GROQ_API_KEY")
model_name = os.getenv("MODEL_NAME", "llama-3.1-8b-instant")
LAND_API_URL = os.getenv("LAND_API_URL", "http://localhost:4000/api")

if not groq_api_key:
    raise RuntimeError("GROQ_API_KEY is not configured")

client = AsyncGroq(api_key=groq_api_key)


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


BASE_SYSTEM_PROMPT = """You are Bhoomika, an AI assistant and expert in Indian land law, real estate registration, transfer processes, title searching, ULPIN, e-KYC, encumbrances, and property dispute resolution.
Your goal is to help citizens and registrars understand the complexities of the BhoomiSetu Decentralized Land Registry and Indian legal frameworks.
Answer clearly, concisely, and accurately. Do not provide formal legal advice, but rather informational guidance based on Indian laws such as the Transfer of Property Act, 1882 and Registration Act, 1908. Keep your responses user-friendly and polite.

IMPORTANT: When answering questions about available land, properties, parcels, or any specific real estate data, you MUST ONLY refer to the data from the BhoomiSetu registry provided below. Do NOT make up or hallucinate any land listings.
If the user asks about available land and the registry data does not match, say so honestly.
"""


async def fetch_parcels_context() -> str:
    """Fetch all parcels from the land-registry-api and format them as a text block."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(f"{LAND_API_URL}/parcels")
            response.raise_for_status()
            parcels = response.json()

        if not parcels:
            return "\n[BhoomiSetu Ledger]: No parcels are currently registered in the system.\n"

        lines = ["\n=== BHOOMISETU LAND REGISTRY DATA (Live from Blockchain Ledger) ===\n"]
        for item in parcels:
            p = item.get("Record", item)  # Handle { Key, Record } or flat format
            market_val = int(p.get("marketValue", 0))
            lines.append(
                f"• Parcel ID: {p.get('parcelId', 'N/A')}\n"
                f"  ULPIN: {p.get('ulpin', 'N/A')}\n"
                f"  Owner: {p.get('ownerName', 'N/A')}\n"
                f"  Location: {p.get('location', 'N/A')}\n"
                f"  Area: {p.get('area', 'N/A')}\n"
                f"  Market Value: ₹{market_val:,}\n"
                f"  Status: {p.get('status', 'N/A')}\n"
                f"  Ownership Type: {p.get('ownershipType', 'N/A')}\n"
                f"  Registered: {p.get('registrationDate', 'N/A')[:10]}\n"
            )
        lines.append("=== END OF REGISTRY DATA ===\n")
        return "\n".join(lines)
    except Exception as e:
        print(f"[Bhoomika] Could not fetch parcel data from API: {e}")
        return "\n[BhoomiSetu Ledger]: Could not fetch live data from the registry right now.\n"


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Fetch live parcel data context
        parcel_context = await fetch_parcels_context()
        system_prompt = BASE_SYSTEM_PROMPT + parcel_context

        formatted_messages = [{"role": "system", "content": system_prompt}]
        formatted_messages.extend(
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        )

        print(f"[Bhoomika] Request with model={model_name}, messages={len(request.messages)}, context_len={len(parcel_context)}")

        completion = await client.chat.completions.create(
            model=model_name,
            messages=formatted_messages,
            temperature=0.5,
            max_tokens=1024,
        )

        reply = completion.choices[0].message.content
        print(f"[Bhoomika] Reply: {reply[:80]}...")
        return {"reply": reply}

    except Exception as e:
        print(f"[Bhoomika] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")


@app.get("/health")
async def health():
    parcel_context = await fetch_parcels_context()
    return {
        "status": "ok",
        "model": model_name,
        "land_api": LAND_API_URL,
        "land_data_loaded": "END OF REGISTRY DATA" in parcel_context
    }


if __name__ == "__main__":
    import uvicorn
    print(f"Starting Bhoomika AI Server with model={model_name} on port 8080...")
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
