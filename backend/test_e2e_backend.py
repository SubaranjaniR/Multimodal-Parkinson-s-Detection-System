import requests
import numpy as np
import soundfile as sf
from PIL import Image
import os
import uuid

BASE_URL = "http://127.0.0.1:8000"

def test_auth():
    print("\n--- Testing Authentication ---")
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    password = "testpassword123"
    name = "Test Patient"
    
    # 1. Signup
    signup_payload = {"name": name, "email": email, "password": password}
    r = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
    print("Signup Status:", r.status_code)
    print("Signup Response:", r.json())
    assert r.status_code == 200
    
    # 2. Login
    login_payload = {"email": email, "password": password}
    r = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print("Login Status:", r.status_code)
    print("Login Response:", r.json())
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token is not None
    
    # 3. GET me
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print("GetMe Status:", r.status_code)
    print("GetMe Response:", r.json())
    assert r.status_code == 200
    assert r.json()["email"] == email
    
    return token

def test_symptoms(headers):
    print("\n--- Testing Symptoms Endpoint ---")
    payload = {
        "age": 65,
        "gender": "Male",
        "familyHistory": True,
        "tremor": 7,
        "rigidity": 6,
        "bradykinesia": 7,
        "posturalInstability": 6,
        "speechProblems": 5,
        "sleepDisorders": 6,
        "updrs": 45.0,
        "moca": 23.0,
        "functionalAssessment": 4.0
    }
    r = requests.post(f"{BASE_URL}/predict/symptoms", json=payload, headers=headers)
    print("Symptoms Status:", r.status_code)
    print("Symptoms Response:", r.json())
    assert r.status_code == 200
    assert "prediction" in r.json()
    assert "risk_score" in r.json()
    return r.json()

def test_voice(headers):
    print("\n--- Testing Voice Endpoint ---")
    sr = 22050
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    mod = np.sin(2 * np.pi * 3.0 * t) * 0.05
    phases = 2 * np.pi * 140.0 * (t + mod)
    y = np.sin(phases) + 0.05 * np.random.randn(len(t))
    y = y * (1.0 + 0.25 * np.sin(2 * np.pi * 4.0 * t))
    y = y / np.max(np.abs(y))
    
    filename = "temp_voice_test.wav"
    sf.write(filename, y, sr)
    
    try:
        with open(filename, "rb") as f:
            files = {"file": (filename, f, "audio/wav")}
            r = requests.post(f"{BASE_URL}/predict/voice", files=files, headers=headers)
        print("Voice Status:", r.status_code)
        print("Voice Response:", r.json())
        assert r.status_code == 200
        assert r.json()["status"] == "success"
        assert "prediction" in r.json()
        assert "score" in r.json()
        return r.json()
    finally:
        if os.path.exists(filename):
            os.remove(filename)

def test_handwriting(headers):
    print("\n--- Testing Handwriting Endpoint ---")
    img = Image.new("RGB", (224, 224), color="white")
    pixels = img.load()
    for angle in np.linspace(0, 8 * np.pi, 1000):
        r_val = 10 + 8 * angle
        x = int(112 + r_val * np.cos(angle))
        y = int(112 + r_val * np.sin(angle))
        if 0 <= x < 224 and 0 <= y < 224:
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if 0 <= x+dx < 224 and 0 <= y+dy < 224:
                        pixels[x+dx, y+dy] = (0, 0, 0)
                        
    filename = "temp_hand_test.png"
    img.save(filename)
    
    try:
        with open(filename, "rb") as f:
            files = {"file": (filename, f, "image/png")}
            r = requests.post(f"{BASE_URL}/predict/handwriting", files=files, headers=headers)
        print("Handwriting Status:", r.status_code)
        print("Handwriting Response:", r.json())
        assert r.status_code == 200
        assert r.json()["status"] == "success"
        assert "prediction" in r.json()
        assert "score" in r.json()
        return r.json()
    finally:
        if os.path.exists(filename):
            os.remove(filename)

def test_final(headers, symptoms_score, voice_score, hand_score):
    print("\n--- Testing Final Fusion Endpoint ---")
    splayload = {
        "age": 65,
        "gender": "Male",
        "familyHistory": True,
        "tremor": 7,
        "rigidity": 6,
        "bradykinesia": 7,
        "posturalInstability": 6,
        "speechProblems": 5,
        "sleepDisorders": 6,
        "updrs": 45.0,
        "moca": 23.0,
        "functionalAssessment": 4.0
    }
    payload = {
        "symptoms": splayload,
        "voiceScore": voice_score,
        "handwritingScore": hand_score
    }
    r = requests.post(f"{BASE_URL}/predict/final", json=payload, headers=headers)
    print("Final Status:", r.status_code)
    print("Final Response keys:", r.json().keys())
    assert r.status_code == 200
    res = r.json()
    assert "final_risk" in res
    assert "prediction" in res
    assert "id" in res
    assert "rewards" in res
    assert "comparison" in res
    return res

def test_history(headers):
    print("\n--- Testing Predictions History Endpoint ---")
    r = requests.get(f"{BASE_URL}/predictions/history", headers=headers)
    print("History Status:", r.status_code)
    print("History Records Count:", len(r.json()))
    assert r.status_code == 200
    assert len(r.json()) >= 1
    return r.json()

def test_progress(headers):
    print("\n--- Testing Predictions Progress Endpoint ---")
    r = requests.get(f"{BASE_URL}/predictions/progress", headers=headers)
    print("Progress Status:", r.status_code)
    print("Progress Response keys:", r.json().keys())
    assert r.status_code == 200
    assert "graph" in r.json()
    assert "comparison" in r.json()
    return r.json()

def test_rewards(headers):
    print("\n--- Testing Rewards Endpoint ---")
    r = requests.get(f"{BASE_URL}/predictions/rewards", headers=headers)
    print("Rewards Status:", r.status_code)
    print("Rewards Response:", r.json())
    assert r.status_code == 200
    assert "totalPoints" in r.json()
    assert "activeBadge" in r.json()
    assert "history" in r.json()

def test_old_report(headers, pred_id):
    print(f"\n--- Testing Previous Report Download (ID: {pred_id}) ---")
    r = requests.get(f"{BASE_URL}/predictions/report/{pred_id}", headers=headers)
    print("Old Report Download Status:", r.status_code)
    print("Old Report Content Length:", len(r.content))
    print("Old Report Content-Type:", r.headers.get("Content-Type"))
    assert r.status_code == 200
    assert len(r.content) > 1000
    assert "application/pdf" in r.headers.get("Content-Type")

def test_chat(final_res):
    print("\n--- Testing Legacy Chat Endpoint ---")
    splayload = {
        "age": 65,
        "gender": "Male",
        "familyHistory": True,
        "tremor": 7,
        "rigidity": 6,
        "bradykinesia": 7,
        "posturalInstability": 6,
        "speechProblems": 5,
        "sleepDisorders": 6,
        "updrs": 45.0,
        "moca": 23.0,
        "functionalAssessment": 4.0
    }
    payload = {
        "message": "Why am I high risk?",
        "history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi! I am your assistant."}
        ],
        "result": {
            "symptoms": splayload,
            "result": final_res
        }
    }
    r = requests.post(f"{BASE_URL}/chat", json=payload)
    print("Chat Status:", r.status_code)
    assert r.status_code == 200
    assert "reply" in r.json()

def test_report(final_res):
    print("\n--- Testing Legacy PDF Report Endpoint ---")
    splayload = {
        "age": 65,
        "gender": "Male",
        "familyHistory": True,
        "tremor": 7,
        "rigidity": 6,
        "bradykinesia": 7,
        "posturalInstability": 6,
        "speechProblems": 5,
        "sleepDisorders": 6,
        "updrs": 45.0,
        "moca": 23.0,
        "functionalAssessment": 4.0
    }
    payload = {
        "symptoms": splayload,
        "result": final_res
    }
    r = requests.post(f"{BASE_URL}/report", json=payload)
    print("Report Status:", r.status_code)
    assert r.status_code == 200
    assert len(r.content) > 1000

def test_analytics(headers):
    print("\n--- Testing Analytics Dashboard Endpoint ---")
    r = requests.get(f"{BASE_URL}/analytics/dashboard", headers=headers)
    print("Analytics Status:", r.status_code)
    print("Analytics Keys:", r.json().keys())
    assert r.status_code == 200
    res = r.json()
    assert "totalPredictions" in res
    assert "latestRisk" in res
    assert "averageRisk" in res
    assert "riskTrend" in res
    assert "grouped" in res
    assert "distribution" in res
    assert "latestContribution" in res

def test_delete_prediction(headers, pred_id):
    print(f"\n--- Testing Delete Prediction Endpoint (ID: {pred_id}) ---")
    r = requests.delete(f"{BASE_URL}/predictions/{pred_id}", headers=headers)
    print("Delete Status:", r.status_code)
    print("Delete Response:", r.json())
    assert r.status_code == 200

if __name__ == "__main__":
    print("=== STARTING END-TO-END BACKEND API TESTING ===")
    
    # 1. Auth Test
    token = test_auth()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Modality Tests
    sym_res = test_symptoms(headers)
    voice_res = test_voice(headers)
    hand_res = test_handwriting(headers)
    
    # 3. Final Prediction
    final_res = test_final(headers, sym_res["risk_score"], voice_res["score"], hand_res["score"])
    pred_id = final_res["id"]
    
    # 4. History, Progress, Rewards, Report Downloads
    test_history(headers)
    test_progress(headers)
    test_rewards(headers)
    test_analytics(headers)
    test_old_report(headers, pred_id)
    
    # 5. Legacy Endpoints Compatibility
    test_chat(final_res)
    test_report(final_res)
    
    # 6. Deletion Test
    test_delete_prediction(headers, pred_id)
    
    print("\n=== E2E TESTING COMPLETED SUCCESSFULLY ===")
