from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Bhoomika AI Server")

# Allow CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
client = Anthropic(api_key=anthropic_api_key)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

SYSTEM_PROMPT = """You are Bhoomika, an AI assistant and expert in Indian land law, real estate registration, transfer processes, title searching, ULPIN, e-KYC, encumbrances, and property dispute resolution. 
Your goal is to help citizens and registrars understand the complexities of the BhoomiSetu Decentralized Land Registry and Indian legal frameworks.
Answer clearly, concisely, and accurately. Do not provide formal legal advice, but rather informational guidance based on Indian laws such as the Transfer of Property Act, 1882 and Registration Act, 1908. Keep your responses user-friendly and polite."""

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not configured.")
    try:
        # Format the messages array to Anthropic's expected spec
        formatted_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=formatted_messages
        )
        
        return {"reply": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("Starting Bhoomika AI Server on port 8080...")
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
