import requests

# Test 1: Ask about available land in Surat
print("=== Test: Asking about Surat land ===")
try:
    r = requests.post("http://localhost:8080/chat", json={
        "messages": [{"role": "user", "content": "Show me available land options in Surat"}]
    }, timeout=30)
    print(f"Status: {r.status_code}")
    print(f"Reply:\n{r.json().get('reply', r.text)}")
except Exception as e:
    print(f"Error: {e}")

print("\n")

# Test 2: Health check
print("=== Test: Health check ===")
try:
    r = requests.get("http://localhost:8080/health", timeout=5)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {e}")
