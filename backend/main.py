import os
import shutil
import uuid
import datetime
import json
import traceback
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field

# Import Services and DB/Auth
from backend.services.symptom_predictor import SymptomPredictor
from backend.services.voice_predictor import VoicePredictor
from backend.services.handwriting_predictor import HandwritingPredictor
from backend.services.fusion_predictor import FusionPredictor
from backend.services.report_generator import ReportGenerator
from backend.services.mri_service import MriService

from backend.db import init_db, get_db_connection
from backend.auth_service import hash_password, verify_password, create_jwt_token, get_current_user

# Setup folders
UPLOADS_VOICE_DIR = os.path.abspath("backend/uploads/voice")
UPLOADS_HAND_DIR = os.path.abspath("backend/uploads/handwriting")
UPLOADS_REPORTS_DIR = os.path.abspath("backend/uploads/reports")

os.makedirs(UPLOADS_VOICE_DIR, exist_ok=True)
os.makedirs(UPLOADS_HAND_DIR, exist_ok=True)
os.makedirs(UPLOADS_REPORTS_DIR, exist_ok=True)

# Initialize app
app = FastAPI(
    title="NeuroPark AI API",
    description="Multimodal Parkinson's Disease early screening screening tool backend.",
    version="1.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits access from Vite dev server and anywhere in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Instantiate Predictors
symptom_predictor = SymptomPredictor()
voice_predictor = VoicePredictor()
handwriting_predictor = HandwritingPredictor()
fusion_predictor = FusionPredictor()

# --- Request/Response Models ---
class SymptomsInputModel(BaseModel):
    age: int = Field(..., ge=1, le=120)
    gender: Any  # Can be string ("Male"/"Female"/"Other") or int (1/0)
    familyHistory: Any  # Can be bool or int
    tremor: int = Field(..., ge=0, le=10)
    rigidity: int = Field(..., ge=0, le=10)
    bradykinesia: int = Field(..., ge=0, le=10)
    posturalInstability: int = Field(..., ge=0, le=10)
    speechProblems: int = Field(..., ge=0, le=10)
    sleepDisorders: int = Field(..., ge=0, le=10)
    updrs: Optional[float] = Field(default=None, ge=0.0, le=199.0)
    moca: Optional[float] = Field(default=None, ge=0.0, le=30.0)
    functionalAssessment: Optional[float] = Field(default=None, ge=0.0, le=10.0)

class FinalPredictInput(BaseModel):
    symptoms: SymptomsInputModel
    voiceScore: Optional[float] = None
    handwritingScore: Optional[float] = None
    voiceFilename: Optional[str] = None
    handwritingFilename: Optional[str] = None
    mriFilename: Optional[str] = None

class ChatHistoryMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatInput(BaseModel):
    message: str
    history: List[ChatHistoryMessage]
    result: Optional[Dict[str, Any]] = None

class ReportInput(BaseModel):
    symptoms: SymptomsInputModel
    result: Dict[str, Any]

class SignupInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

class UpdateProfileInput(BaseModel):
    name: str
    email: str

class ChangePasswordInput(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordInput(BaseModel):
    email: str

# --- Endpoints ---

@app.get("/")
def home():
    return {"status": "running", "service": "NeuroPark AI"}

# --- Rate Limiter ---
from collections import defaultdict
import time

login_attempts = defaultdict(list)

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    # Filter attempts in the last 60 seconds
    attempts = [t for t in login_attempts[ip] if now - t < 60]
    login_attempts[ip] = attempts
    return len(attempts) < 5  # limit 5 attempts per minute

def record_login_attempt(ip: str):
    login_attempts[ip].append(time.time())

# --- Auth Endpoints ---

@app.post("/auth/signup")
def signup(data: SignupInput):
    email_clean = data.email.strip().lower()
    if not email_clean or not data.password or not data.name.strip():
        raise HTTPException(status_code=400, detail="Missing required signup details.")
        
    conn = get_db_connection()
    try:
        # Check if user already exists
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email_clean,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
            
        pw_hash = hash_password(data.password)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (data.name.strip(), email_clean, pw_hash)
        )
        conn.commit()
        return {"status": "success", "message": "User registered successfully."}
    finally:
        conn.close()

@app.post("/auth/login")
def login(data: LoginInput, request: Request):
    ip = request.client.host
    if not check_rate_limit(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again in a minute."
        )
    record_login_attempt(ip)

    email_clean = data.email.strip().lower()
    conn = get_db_connection()
    try:
        user = conn.execute("SELECT id, password_hash, name FROM users WHERE email = ?", (email_clean,)).fetchone()
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Invalid email or password.")
            
        # Update last login timestamp
        conn.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
        conn.commit()

        token = create_jwt_token(user["id"])
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": email_clean
            }
        }
    finally:
        conn.close()

@app.get("/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.post("/auth/forgot-password")
def forgot_password_endpoint(data: ForgotPasswordInput):
    email_clean = data.email.strip().lower()
    print(f"[AUTH] Password reset requested for: {email_clean}")
    return {"status": "success", "message": "If this email is registered, password recovery instructions have been sent."}

@app.post("/auth/profile/update")
def update_profile(data: UpdateProfileInput, current_user: dict = Depends(get_current_user)):
    email_clean = data.email.strip().lower()
    if not data.name.strip() or not email_clean:
        raise HTTPException(status_code=400, detail="Name and email cannot be blank.")
        
    conn = get_db_connection()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ? AND id != ?", (email_clean, current_user["id"])).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
            
        conn.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", (data.name.strip(), email_clean, current_user["id"]))
        conn.commit()
        return {
            "status": "success", 
            "message": "Profile updated successfully.",
            "user": {
                "id": current_user["id"],
                "name": data.name.strip(),
                "email": email_clean
            }
        }
    finally:
        conn.close()

@app.post("/auth/profile/change-password")
def change_password(data: ChangePasswordInput, current_user: dict = Depends(get_current_user)):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        
    conn = get_db_connection()
    try:
        user = conn.execute("SELECT password_hash FROM users WHERE id = ?", (current_user["id"],)).fetchone()
        if not user or not verify_password(data.old_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Invalid current password.")
            
        new_hash = hash_password(data.new_password)
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, current_user["id"]))
        conn.commit()
        return {"status": "success", "message": "Password updated successfully."}
    finally:
        conn.close()

@app.delete("/auth/profile/delete")
def delete_account(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        preds = conn.execute("SELECT report_pdf_path, voice_path, spiral_image_path FROM predictions WHERE user_id = ?", (current_user["id"],)).fetchall()
        for p in preds:
            if p["report_pdf_path"]:
                pdf_p = os.path.join(UPLOADS_REPORTS_DIR, p["report_pdf_path"])
                if os.path.exists(pdf_p):
                    try: os.remove(pdf_p)
                    except: pass
            if p["voice_path"]:
                voice_p = os.path.join(UPLOADS_VOICE_DIR, p["voice_path"])
                if os.path.exists(voice_p):
                    try: os.remove(voice_p)
                    except: pass
            if p["spiral_image_path"]:
                hand_p = os.path.join(UPLOADS_HAND_DIR, p["spiral_image_path"])
                if os.path.exists(hand_p):
                    try: os.remove(hand_p)
                    except: pass
                    
        conn.execute("DELETE FROM users WHERE id = ?", (current_user["id"],))
        conn.commit()
        return {"status": "success", "message": "Account deleted successfully."}
    finally:
        conn.close()

# --- Prediction Endpoints ---

def calculate_clinical_scores(data: dict) -> dict:
    tremor = float(data.get("tremor", 0))
    rigidity = float(data.get("rigidity", 0))
    bradykinesia = float(data.get("bradykinesia", 0))
    postural = float(data.get("posturalInstability", 0))
    speech = float(data.get("speechProblems", 0))
    sleep = float(data.get("sleepDisorders", 0))
    
    total_severity = tremor + rigidity + bradykinesia + postural + speech + sleep # max 60
    
    # Predefined clinical mapping rules:
    # 1. UPDRS: increases with severity. Max 199.
    updrs = round(total_severity * 2.0, 1)
    
    # 2. MoCA: decreases with severity. Max 30.
    moca = max(0.0, round(30.0 - (total_severity * 0.25), 1))
    
    # 3. Functional Assessment: decreases with severity. Max 10.
    func = max(0.0, round(10.0 - (total_severity * 0.1), 1))
    
    return {
        "updrs": updrs,
        "moca": moca,
        "functionalAssessment": func
    }

@app.post("/predict/symptoms")
def predict_symptoms_endpoint(data: SymptomsInputModel, current_user: dict = Depends(get_current_user)):
    try:
        input_dict = data.model_dump()
        calculated = calculate_clinical_scores(input_dict)
        if input_dict.get("updrs") is None:
            input_dict["updrs"] = calculated["updrs"]
        if input_dict.get("moca") is None:
            input_dict["moca"] = calculated["moca"]
        if input_dict.get("functionalAssessment") is None:
            input_dict["functionalAssessment"] = calculated["functionalAssessment"]
            
        res = symptom_predictor.predict(input_dict)
        return res
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Symptom prediction error: {str(e)}")

@app.post("/predict/voice")
async def predict_voice_endpoint(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Verify file format
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".wav", ".mp3", ".flac", ".m4a", ".ogg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Please upload one of: .wav, .mp3, .flac, .m4a, .ogg"
        )
        
    saved_filename = f"voice_{current_user['id']}_{uuid.uuid4()}{ext}"
    saved_path = os.path.join(UPLOADS_VOICE_DIR, saved_filename)
    
    try:
        # Save file to disk
        with open(saved_path, "wb") as f:
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            f.write(content)
            
        # Check size of saved file
        if os.path.getsize(saved_path) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            
        # Run prediction
        try:
            res = voice_predictor.predict_voice(saved_path)
            res["filename"] = saved_filename
            return res
        except ValueError as ve:
            traceback.print_exc()
            if os.path.exists(saved_path):
                try: os.remove(saved_path)
                except: pass
            raise HTTPException(status_code=400, detail=f"Corrupted or invalid audio: {str(ve)}")
        except Exception as e:
            traceback.print_exc()
            if os.path.exists(saved_path):
                try: os.remove(saved_path)
                except: pass
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
            
    except Exception as e:
        if os.path.exists(saved_path):
            try: os.remove(saved_path)
            except: pass
        raise e

@app.post("/predict/handwriting")
async def predict_handwriting_endpoint(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".bmp"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Please upload PNG, JPG, or JPEG."
        )
        
    saved_filename = f"hand_{current_user['id']}_{uuid.uuid4()}{ext}"
    saved_path = os.path.join(UPLOADS_HAND_DIR, saved_filename)
    
    try:
        with open(saved_path, "wb") as f:
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            f.write(content)
            
        res = handwriting_predictor.predict(saved_path)
        if res.get("status") == "unavailable":
            # If unavailable, raise 400 as standard backend logic
            if os.path.exists(saved_path):
                try: os.remove(saved_path)
                except: pass
            raise HTTPException(status_code=400, detail=res.get("error", "Image processing failed."))
            
        res["filename"] = saved_filename
        return res
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Handwriting prediction error: {str(e)}")

@app.post("/predict/mri")
async def predict_mri_endpoint(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Predict Parkinson's disease from MRI image and return Grad-CAM heatmap."""
    try:
        result = await MriService.predict(file, current_user["id"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MRI prediction error: {str(e)}")

@app.post("/predict/final")
def predict_final_endpoint(data: FinalPredictInput, current_user: dict = Depends(get_current_user)):
    try:
        sym_dict = data.symptoms.model_dump()
        calculated = calculate_clinical_scores(sym_dict)
        if sym_dict.get("updrs") is None:
            sym_dict["updrs"] = calculated["updrs"]
        if sym_dict.get("moca") is None:
            sym_dict["moca"] = calculated["moca"]
        if sym_dict.get("functionalAssessment") is None:
            sym_dict["functionalAssessment"] = calculated["functionalAssessment"]
            
        # Predict symptoms score first using mapped values
        sym_res = symptom_predictor.predict(sym_dict)
        symptom_score = float(sym_res["risk_score"])
        
        # Calculate dynamic multimodal fusion
        res = fusion_predictor.predict_final(
            symptoms=sym_dict,
            symptom_score=symptom_score,
            voice_score=data.voiceScore,
            handwriting_score=data.handwritingScore
        )
        
        # Database transaction to save result, compute progress and rewards
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Fetch previous prediction
        prev_pred = cursor.execute(
            "SELECT symptoms_score, voice_score, handwriting_score, final_risk, prediction FROM predictions WHERE user_id = ? ORDER BY date DESC LIMIT 1",
            (current_user["id"],)
        ).fetchone()
        
        # 2. Insert prediction record (stores symptoms with mapped UPDRS/MoCA/Functional values!)
        confidence = float(data.voiceScore) if data.voiceScore is not None else float(res["final_risk"])
        cursor.execute("""
            INSERT INTO predictions (user_id, symptoms_score, voice_score, handwriting_score, final_risk, prediction, confidence, symptoms_json, voice_path, spiral_image_path, mri_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user["id"],
            symptom_score,
            data.voiceScore if data.voiceScore is not None else 0.0,
            data.handwritingScore if data.handwritingScore is not None else 0.0,
            float(res["final_risk"]),
            res["prediction"],
            confidence,
            json.dumps(sym_dict),
            data.voiceFilename,
            data.handwritingFilename,
            data.mriFilename
        ))
        prediction_id = cursor.lastrowid
        
        # 3. Generate PDF Report on disk
        report_data = {
            "symptoms": sym_dict,
            "result": res
        }
        pdf_buffer = ReportGenerator.generate_pdf(report_data)
        pdf_filename = f"NPK-{uuid.uuid4()}.pdf"
        pdf_path = os.path.join(UPLOADS_REPORTS_DIR, pdf_filename)
        with open(pdf_path, "wb") as f:
            f.write(pdf_buffer.getbuffer())
            
        cursor.execute("UPDATE predictions SET report_pdf_path = ? WHERE id = ?", (pdf_filename, prediction_id))
        
        # 4. Compare with previous prediction and give rewards
        points_earned = 50  # base participation points
        comparison_res = None
        
        if prev_pred:
            prev_risk = prev_pred["final_risk"]
            curr_risk = float(res["final_risk"])
            risk_diff = prev_risk - curr_risk
            
            status = "Improved" if risk_diff > 0 else ("Declined" if risk_diff < 0 else "Stable")
            pct = round(abs(risk_diff) / prev_risk * 100, 1) if prev_risk > 0 else 0.0
            
            comparison_res = {
                "status": status,
                "pct": pct,
                "prevRisk": prev_risk,
                "currentRisk": curr_risk
            }
            
            if status == "Improved":
                points_earned += max(10, int(risk_diff * 5))
        else:
            comparison_res = {
                "status": "Stable",
                "pct": 0.0,
                "prevRisk": float(res["final_risk"]),
                "currentRisk": float(res["final_risk"])
            }
            
        # 5. Insert Reward record
        cursor.execute("INSERT INTO rewards (user_id, prediction_id, points, message) VALUES (?, ?, ?, ?)", (
            current_user["id"],
            prediction_id,
            points_earned,
            "Baseline Screening Completed!" if not prev_pred else (f"Great Progress! Improved by {comparison_res['pct']}%" if comparison_res["status"] == "Improved" else "Assessment Done!")
        ))
        
        # Fetch current total points to decide badge
        total_points = cursor.execute("SELECT SUM(points) FROM rewards WHERE user_id = ?", (current_user["id"],)).fetchone()[0] or 0
        
        if total_points >= 1000:
            badge = "Diamond"
        elif total_points >= 500:
            badge = "Gold"
        elif total_points >= 200:
            badge = "Silver"
        else:
            badge = "Bronze"
            
        cursor.execute("UPDATE rewards SET badge = ? WHERE prediction_id = ?", (badge, prediction_id))
        
        conn.commit()
        conn.close()
        
        # Compile response dictionary
        res["id"] = prediction_id
        res["rewards"] = {
            "pointsEarned": points_earned,
            "totalPoints": total_points,
            "badge": badge,
            "message": "Screening completed successfully!" if not prev_pred or comparison_res["status"] != "Improved" else "Congratulations! You made great progress!"
        }
        res["comparison"] = comparison_res
        
        return res
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Multimodal fusion error: {str(e)}")

# --- Analytics and Deletion Endpoints ---

@app.get("/analytics/dashboard")
def get_analytics_dashboard(current_user: dict = Depends(get_current_user)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch all prediction risks and dates for this user
        rows = cursor.execute(
            "SELECT id, date, final_risk, symptoms_score, voice_score, handwriting_score FROM predictions WHERE user_id = ? ORDER BY date ASC",
            (current_user["id"],)
        ).fetchall()
        
        conn.close()
        
        if not rows:
            return {
                "totalPredictions": 0,
                "latestRisk": 0.0,
                "averageRisk": 0.0,
                "highestRisk": 0.0,
                "lowestRisk": 0.0,
                "lastPredictionDate": None,
                "riskTrend": "Stable",
                "grouped": {"daily": [], "weekly": [], "monthly": []},
                "distribution": {"low": 0, "moderate": 0, "high": 0},
                "latestContribution": {"symptoms": 0, "voice": 0, "handwriting": 0}
            }
            
        risks = [r["final_risk"] for r in rows]
        latest_row = rows[-1]
        
        # Calculate summary metrics
        total = len(rows)
        latest_risk = latest_row["final_risk"]
        avg_risk = round(sum(risks) / total, 1)
        highest_risk = max(risks)
        lowest_risk = min(risks)
        last_date = latest_row["date"]
        
        # Calculate trend based on last 5 predictions
        trend = "Stable"
        if len(rows) >= 2:
            last_5 = risks[-5:]
            diff = last_5[-1] - last_5[0]
            if diff > 5:
                trend = "Increased"
            elif diff < -5:
                trend = "Decreased"
                
        # Risk distribution
        low_count = sum(1 for r in risks if r <= 30)
        mod_count = sum(1 for r in risks if 30 < r <= 60)
        high_count = sum(1 for r in risks if r > 60)
        
        # Group by daily, weekly, monthly
        import collections
        from datetime import datetime
        
        daily_groups = collections.defaultdict(list)
        weekly_groups = collections.defaultdict(list)
        monthly_groups = collections.defaultdict(list)
        
        for r in rows:
            dt_str = r["date"].split(".")[0]
            try:
                dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            except:
                try:
                    dt = datetime.strptime(dt_str.split(" ")[0], "%Y-%m-%d")
                except:
                    continue
            
            day_key = dt.strftime("%Y-%m-%d")
            week_key = f"{dt.year}-W{dt.isocalendar()[1]:02d}"
            month_key = dt.strftime("%Y-%m")
            
            daily_groups[day_key].append(r["final_risk"])
            weekly_groups[week_key].append(r["final_risk"])
            monthly_groups[month_key].append(r["final_risk"])
            
        daily_avg = [{"period": k, "avgRisk": round(sum(v)/len(v), 1)} for k, v in sorted(daily_groups.items())]
        weekly_avg = [{"period": k, "avgRisk": round(sum(v)/len(v), 1)} for k, v in sorted(weekly_groups.items())]
        monthly_avg = [{"period": k, "avgRisk": round(sum(v)/len(v), 1)} for k, v in sorted(monthly_groups.items())]
        
        return {
            "totalPredictions": total,
            "latestRisk": latest_risk,
            "averageRisk": avg_risk,
            "highestRisk": highest_risk,
            "lowestRisk": lowest_risk,
            "lastPredictionDate": last_date,
            "riskTrend": trend,
            "grouped": {
                "daily": daily_avg,
                "weekly": weekly_avg,
                "monthly": monthly_avg
            },
            "distribution": {
                "low": low_count,
                "moderate": mod_count,
                "high": high_count
            },
            "latestContribution": {
                "symptoms": latest_row["symptoms_score"],
                "voice": latest_row["voice_score"],
                "handwriting": latest_row["handwriting_score"]
            }
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analytics calculation error: {str(e)}")

@app.delete("/predictions/{pred_id}")
def delete_prediction_endpoint(pred_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        pred = conn.execute(
            "SELECT voice_path, spiral_image_path, report_pdf_path FROM predictions WHERE id = ? AND user_id = ?",
            (pred_id, current_user["id"])
        ).fetchone()
        
        if not pred:
            raise HTTPException(status_code=404, detail="Prediction record not found.")
            
        # Clean up files from disk
        if pred["voice_path"]:
            v_path = os.path.join(UPLOADS_VOICE_DIR, pred["voice_path"])
            if os.path.exists(v_path):
                try: os.remove(v_path)
                except: pass
                
        if pred["spiral_image_path"]:
            h_path = os.path.join(UPLOADS_HAND_DIR, pred["spiral_image_path"])
            if os.path.exists(h_path):
                try: os.remove(h_path)
                except: pass
                
        if pred["report_pdf_path"]:
            r_path = os.path.join(UPLOADS_REPORTS_DIR, pred["report_pdf_path"])
            if os.path.exists(r_path):
                try: os.remove(r_path)
                except: pass
                
        # Delete from database
        conn.execute("DELETE FROM predictions WHERE id = ? AND user_id = ?", (pred_id, current_user["id"]))
        conn.commit()
        return {"status": "success", "message": "Prediction record deleted successfully."}
    finally:
        conn.close()

# --- Secure File Download/Streaming Endpoints ---

@app.get("/predictions/voice/{pred_id}")
def download_voice_file(pred_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    pred = conn.execute(
        "SELECT voice_path FROM predictions WHERE id = ? AND user_id = ?",
        (pred_id, current_user["id"])
    ).fetchone()
    conn.close()
    
    if not pred or not pred["voice_path"]:
        raise HTTPException(status_code=404, detail="Voice recording not found.")
        
    voice_path = os.path.join(UPLOADS_VOICE_DIR, pred["voice_path"])
    if not os.path.exists(voice_path):
        raise HTTPException(status_code=404, detail="Voice file missing from disk.")
        
    ext = os.path.splitext(pred["voice_path"])[1].lower()
    media_type = "audio/wav"
    if ext == ".mp3": media_type = "audio/mpeg"
    elif ext == ".ogg": media_type = "audio/ogg"
    elif ext == ".m4a": media_type = "audio/mp4"
    elif ext == ".flac": media_type = "audio/x-flac"
    
    return FileResponse(
        voice_path,
        media_type=media_type,
        filename=pred["voice_path"]
    )

@app.get("/predictions/handwriting/{pred_id}")
def download_handwriting_file(pred_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    pred = conn.execute(
        "SELECT spiral_image_path FROM predictions WHERE id = ? AND user_id = ?",
        (pred_id, current_user["id"])
    ).fetchone()
    conn.close()
    
    if not pred or not pred["spiral_image_path"]:
        raise HTTPException(status_code=404, detail="Handwriting image not found.")
        
    hand_path = os.path.join(UPLOADS_HAND_DIR, pred["spiral_image_path"])
    if not os.path.exists(hand_path):
        raise HTTPException(status_code=404, detail="Handwriting image file missing from disk.")
        
    ext = os.path.splitext(pred["spiral_image_path"])[1].lower()
    media_type = "image/png"
    if ext in [".jpg", ".jpeg"]: media_type = "image/jpeg"
    elif ext == ".bmp": media_type = "image/bmp"
    
    return FileResponse(
        hand_path,
        media_type=media_type,
        filename=pred["spiral_image_path"]
    )

# --- Protected Patient Monitoring Endpoints ---

@app.get("/predictions/history")
def get_history(
    current_user: dict = Depends(get_current_user),
    search: Optional[str] = None,
    filter_risk: Optional[str] = None,
    sort_by: Optional[str] = "date_desc"
):
    conn = get_db_connection()
    query = "SELECT id, date, symptoms_score, voice_score, handwriting_score, final_risk, prediction, confidence, report_pdf_path, voice_path, spiral_image_path, symptoms_json FROM predictions WHERE user_id = ?"
    params = [current_user["id"]]
    
    if filter_risk:
        query += " AND prediction = ?"
        params.append(filter_risk)
        
    if search:
        query += " AND (prediction LIKE ? OR date LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    if sort_by == "date_asc":
        query += " ORDER BY date ASC"
    elif sort_by == "risk_desc":
        query += " ORDER BY final_risk DESC"
    elif sort_by == "risk_asc":
        query += " ORDER BY final_risk ASC"
    else:
        query += " ORDER BY date DESC"
        
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

@app.get("/predictions/progress")
def get_progress(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT id, date, symptoms_score, voice_score, handwriting_score, final_risk, prediction, confidence FROM predictions WHERE user_id = ? ORDER BY date ASC",
        (current_user["id"],)
    ).fetchall()
    conn.close()
    
    comparison = None
    if len(rows) >= 2:
        latest = rows[-1]
        prev = rows[-2]
        
        # Symptoms diff
        sym_diff = latest["symptoms_score"] - prev["symptoms_score"]
        sym_status = "Improved" if sym_diff < 0 else ("Declined" if sym_diff > 0 else "Stable")
        sym_pct = round((prev["symptoms_score"] - latest["symptoms_score"]) / prev["symptoms_score"] * 100, 1) if prev["symptoms_score"] > 0 else 0.0
        
        # Voice diff
        voice_diff = latest["voice_score"] - prev["voice_score"]
        voice_status = "Improved" if voice_diff < 0 else ("Declined" if voice_diff > 0 else "Stable")
        voice_pct = round((prev["voice_score"] - latest["voice_score"]) / prev["voice_score"] * 100, 1) if prev["voice_score"] > 0 else 0.0
        
        # Handwriting diff
        hand_diff = latest["handwriting_score"] - prev["handwriting_score"]
        hand_status = "Improved" if hand_diff < 0 else ("Declined" if hand_diff > 0 else "Stable")
        hand_pct = round((prev["handwriting_score"] - latest["handwriting_score"]) / prev["handwriting_score"] * 100, 1) if prev["handwriting_score"] > 0 else 0.0
        
        # Risk diff
        risk_diff = latest["final_risk"] - prev["final_risk"]
        risk_status = "Improved" if risk_diff < 0 else ("Declined" if risk_diff > 0 else "Stable")
        risk_pct = round((prev["final_risk"] - latest["final_risk"]) / prev["final_risk"] * 100, 1) if prev["final_risk"] > 0 else 0.0
        
        comparison = {
            "symptoms": {"prev": prev["symptoms_score"], "current": latest["symptoms_score"], "diff": -sym_diff, "status": sym_status, "pct": abs(sym_pct)},
            "voice": {"prev": prev["voice_score"], "current": latest["voice_score"], "diff": -voice_diff, "status": voice_status, "pct": abs(voice_pct)},
            "handwriting": {"prev": prev["handwriting_score"], "current": latest["handwriting_score"], "diff": -hand_diff, "status": hand_status, "pct": abs(hand_pct)},
            "risk": {"prev": prev["final_risk"], "current": latest["final_risk"], "diff": -risk_diff, "status": risk_status, "pct": abs(risk_pct)}
        }
    
    graph_data = []
    for r in rows:
        try:
            dt = datetime.datetime.strptime(r["date"], "%Y-%m-%d %H:%M:%S")
        except Exception:
            dt = datetime.datetime.now()
        date_str = dt.strftime("%b %d")
        
        graph_data.append({
            "date": date_str,
            "risk": r["final_risk"],
            "voice": r["voice_score"],
            "handwriting": r["handwriting_score"],
            "symptoms": r["symptoms_score"]
        })
        
    return {
        "comparison": comparison,
        "graph": graph_data
    }

@app.get("/predictions/rewards")
def get_rewards(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    rewards = conn.execute(
        "SELECT points, badge, message, created_at FROM rewards WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["id"],)
    ).fetchall()
    conn.close()
    
    total_points = sum(r["points"] for r in rewards)
    active_badge = "Bronze"
    if total_points >= 1000:
        active_badge = "Diamond"
    elif total_points >= 500:
        active_badge = "Gold"
    elif total_points >= 200:
        active_badge = "Silver"
        
    return {
        "totalPoints": total_points,
        "activeBadge": active_badge,
        "history": [dict(r) for r in rewards]
    }

@app.get("/predictions/report/{pred_id}")
def download_previous_report(pred_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    pred = conn.execute(
        "SELECT report_pdf_path FROM predictions WHERE id = ? AND user_id = ?",
        (pred_id, current_user["id"])
    ).fetchone()
    conn.close()
    
    if not pred or not pred["report_pdf_path"]:
        raise HTTPException(status_code=404, detail="PDF Report not found.")
        
    pdf_path = os.path.join(UPLOADS_REPORTS_DIR, pred["report_pdf_path"])
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Report PDF file missing from disk.")
        
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"neuropark-report-{pred_id}.pdf"
    )

# --- Legacy Support Endpoints (e.g. Chat and General Report API) ---

@app.post("/chat")
def chat_endpoint(data: ChatInput):
    message_lower = data.message.lower()
    result = data.result
    
    # 1. Check if Gemini API key is configured
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            # Setup context instructions
            context = "No Parkinson's screening data available yet."
            if result:
                symptoms = result.get("symptoms", {})
                res_val = result.get("result", {})
                
                # Extract Top Drivers
                drivers = []
                for f in res_val.get("featureImportance", []):
                    if f.get("value", 0) > 20:
                        drivers.append(f"{f.get('feature')} ({f.get('value'):.1f})")
                
                context = f"""
                Patient Context:
                - Age: {symptoms.get('age', 'N/A')}
                - Gender: {symptoms.get('gender', 'N/A')}
                - Family History: {'Yes' if symptoms.get('familyHistory') else 'No'}
                - Scores: Symptoms Risk {res_val.get('symptomsScore')}/100, Voice Instability {res_val.get('voiceScore')}/100, Handwriting Distortion {res_val.get('handwritingScore')}/100
                - Overall Composite Screening Risk: {res_val.get('riskPercent')}% ({res_val.get('prediction', 'Unknown')})
                - Primary Drivers: {', '.join(drivers[:4])}
                """
            
            system_prompt = f"""
            You are the NeuroPark AI Health Assistant, a professional early screening chatbot.
            Always remember: You are a screening tool, not a diagnostic system.
            Emphasize that the user should consult a qualified neurologist/movement disorder specialist for actual diagnosis.
            Keep answers empathetic, informative, and relatively brief (1-3 concise paragraphs).
            
            Here is the user's prediction screening context:
            {context}
            """
            
            gemini_history = []
            for m in data.history:
                role = "user" if m.role == "user" else "model"
                gemini_history.append({"role": role, "parts": [m.content]})
            
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_prompt)
            chat = model.start_chat(history=gemini_history)
            response = chat.send_message(data.message)
            return {"reply": response.text}
            
        except Exception as gemini_err:
            print(f"Gemini API error (falling back to rule-based chatbot): {gemini_err}")
            
    # 2. Fallback Rule-Based Context Chatbot
    risk_pct = 0
    risk_desc = "Low Risk"
    drivers = []
    
    if result:
        s_data = result.get("symptoms", {})
        res_val = result.get("result", {})
        risk_pct = res_val.get("riskPercent", 0)
        risk_desc = res_val.get("prediction", "Low Risk")
        
        for f in res_val.get("featureImportance", []):
            if f.get("value", 0) > 30:
                drivers.append(f.get("feature"))

    if "why am i high risk" in message_lower or "why is my risk" in message_lower:
        if risk_pct >= 70:
            drivers_str = f"your elevated {', '.join(drivers[:3])}" if drivers else "your combined symptoms and modality scores"
            reply = f"Based on the analysis, your overall composite risk is elevated at {risk_pct}% ({risk_desc}). The primary contributing factors are {drivers_str}. Since your score is high, it is highly recommended to consult a neurologist for a professional clinical evaluation."
        elif risk_pct >= 30:
            drivers_str = f"moderately elevated {', '.join(drivers[:2])}" if drivers else "symptom scores"
            reply = f"Your composite risk is in the moderate range at {risk_pct}% ({risk_desc}). This is driven mostly by your {drivers_str}. While not definitively elevated, we recommend sharing these results with your primary physician or a neurologist."
        else:
            reply = f"Your composite risk is low at {risk_pct}% ({risk_desc}). The symptoms and uploaded tests are within the normal baseline ranges. Since this is only a screening aid, please monitor your symptoms and repeat the test if you notice changes."
            
    elif "should i consult a doctor" in message_lower or "consult a doctor" in message_lower or "see a specialist" in message_lower:
        if risk_pct >= 70:
            reply = f"Yes, absolutely. An overall composite score of {risk_pct}% indicates a High Risk category on this screening. We advise scheduling an appointment with a board-certified neurologist or a movement disorder specialist for a complete clinical examination (including motor testing)."
        elif risk_pct >= 30:
            reply = f"Yes. A composite risk of {risk_pct}% falls in the Moderate Risk range. While this is not a diagnostic tool, consulting a doctor or neurologist is a proactive step to address any early signals and obtain expert guidance."
        else:
            reply = f"While your score is Low ({risk_pct}%), if you have persistent worries about tremors, stiffness, balance, or speech, it is always best to consult a medical professional for reassurance and a standard checkup."
            
    elif "lifestyle changes" in message_lower or "exercises" in message_lower or "what can i do" in message_lower:
        reply = "Here are key lifestyle adjustments recommended for neurological health:\n\n" \
                "1. **Aerobic Exercise**: Engaging in 30 minutes of aerobic exercise (brisk walking, cycling) 5 days a week helps protect motor functions.\n" \
                "2. **Balance & Posture**: Tai Chi, Yoga, or balance exercises help reduce postural instability.\n" \
                "3. **Sleep Quality**: Adequate resting sleep is crucial for cognitive health.\n" \
                "4. **Nutrition**: A Mediterranean-style diet high in antioxidants, healthy fats, and fiber supports overall cellular health."
                
    elif "what symptoms affected the result" in message_lower or "contributing factors" in message_lower:
        if drivers:
            reply = f"The primary symptoms affecting your screening output are: {', '.join(drivers)}. These variables contributed most to the machine learning predictions."
        else:
            reply = "Your assessment scores are within normal ranges, and no single symptom stands out as a strong contributor to Parkinson's risk."
            
    else:
        drivers_str = f" contributing factors include {', '.join(drivers[:2])}." if drivers else ""
        reply = f"Hello! I am your NeuroPark AI Health Assistant. Your composite screening risk is {risk_pct}% ({risk_desc}){drivers_str}. " \
                f"You can ask me questions like: 'Why am I high risk?', 'What exercises are recommended?', or 'Should I consult a doctor?'. " \
                f"Please note: I provide educational guidance, not a medical diagnosis."
                
    return {"reply": reply}

@app.post("/report")
def generate_report_endpoint(data: ReportInput):
    try:
        # Generate PDF binary buffer
        pdf_buffer = ReportGenerator.generate_pdf(data.model_dump())
        
        # Return as streaming response
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=neuropark-report.pdf"}
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF report generation error: {str(e)}")
