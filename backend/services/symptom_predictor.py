import joblib
import pandas as pd
import numpy as np
import os

class SymptomPredictor:
    def __init__(self):
        # Resolve path relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(current_dir, "..", "models", "symptom_model.pkl")
        self.model = joblib.load(self.model_path)
        self.features = list(self.model.feature_names_in_)

    def predict(self, data: dict) -> dict:
        """
        Expects a dictionary with:
        {
          "age": int,
          "gender": str or int ("Male" -> 1, "Female" -> 0, "Other" -> 0),
          "familyHistory": bool or int,
          "tremor": int (0-10),
          "rigidity": int (0-10),
          "bradykinesia": int (0-10),
          "posturalInstability": int (0-10),
          "speechProblems": int (0-10),
          "sleepDisorders": int (0-10),
          "updrs": float,
          "moca": float,
          "functionalAssessment": float
        }
        """
        # Map gender
        gender_val = data.get("gender")
        if isinstance(gender_val, str):
            gender_mapped = 1 if gender_val.lower() == "male" else 0
        else:
            gender_mapped = int(gender_val) if gender_val is not None else 0

        # Map family history
        family_hist = data.get("familyHistory")
        family_hist_mapped = 1 if family_hist is True or family_hist == 1 or str(family_hist).lower() == "true" else 0

        # Build payload mapping exactly to the 12 model features
        payload = {
            'Age': float(data.get("age", 60)),
            'Gender': float(gender_mapped),
            'FamilyHistoryParkinsons': float(family_hist_mapped),
            'Tremor': float(data.get("tremor", 0)),
            'Rigidity': float(data.get("rigidity", 0)),
            'Bradykinesia': float(data.get("bradykinesia", 0)),
            'PosturalInstability': float(data.get("posturalInstability", 0)),
            'SpeechProblems': float(data.get("speechProblems", 0)),
            'SleepDisorders': float(data.get("sleepDisorders", 0)),
            'UPDRS': float(data.get("updrs", 0.0)),
            'MoCA': float(data.get("moca", 30.0)),
            'FunctionalAssessment': float(data.get("functionalAssessment", 10.0))
        }

        # Create DataFrame with correct column ordering
        df = pd.DataFrame([payload])
        df = df[self.features]

        # Predict probability
        prob = float(self.model.predict_proba(df)[0][1])
        prediction = int(self.model.predict(df)[0])

        return {
            "prediction": prediction,
            "risk_score": round(prob * 100)
        }
