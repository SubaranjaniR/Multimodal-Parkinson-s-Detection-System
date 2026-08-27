class FusionPredictor:
    def predict_final(self, symptoms: dict, symptom_score: float, voice_score: float = None, handwriting_score: float = None) -> dict:
        """
        Calculates multimodal final risk using available modalities and normalizing weights:
        - Symptoms: 30% baseline weight
        - Voice: 35% baseline weight
        - Handwriting: 35% baseline weight
        """
        modalities = []
        weights = []
        
        # Always include symptoms
        modalities.append(("symptoms", symptom_score))
        weights.append(0.30)
        
        # Check if voice is available
        if voice_score is not None:
            modalities.append(("voice", voice_score))
            weights.append(0.35)
            
        # Check if handwriting is available
        if handwriting_score is not None:
            modalities.append(("handwriting", handwriting_score))
            weights.append(0.35)
            
        # Normalize weights
        total_weight = sum(weights)
        normalized_weights = [w / total_weight for w in weights]
        
        # Compute final risk score
        final_risk = sum(score * nw for (_, score), nw in zip(modalities, normalized_weights))
        final_risk = round(final_risk)
        final_risk = max(3, min(99, final_risk))  # Bound between 3% and 99% for display purposes
        
        # Map risk tags
        if final_risk < 30:
            prediction_tag = "Low Risk"
        elif final_risk < 70:
            prediction_tag = "Moderate Risk"
        else:
            prediction_tag = "High Risk"
            
        # Compute feature importances for SHAP chart
        # We scale features based on symptoms scale (0-10) and modality scores (0-100)
        tremor = float(symptoms.get("tremor", 0))
        rigidity = float(symptoms.get("rigidity", 0))
        bradykinesia = float(symptoms.get("bradykinesia", 0))
        postural = float(symptoms.get("posturalInstability", 0))
        speech = float(symptoms.get("speechProblems", 0))
        sleep = float(symptoms.get("sleepDisorders", 0))
        age = float(symptoms.get("age", 60))
        
        feature_importance = [
            {"feature": "Tremor", "value": float(tremor * 10.0)},
            {"feature": "Rigidity", "value": float(rigidity * 10.0)},
            {"feature": "Bradykinesia", "value": float(bradykinesia * 10.0)},
            {"feature": "Postural Instability", "value": float(postural * 10.0)},
            {"feature": "Speech Problems", "value": float(speech * 10.0)},
            {"feature": "Sleep Disorders", "value": float(sleep * 10.0)},
            {"feature": "Age Factor", "value": float(max(0, age - 40) * 1.5)},
        ]
        
        # Add modality importances if they are present
        if voice_score is not None:
            feature_importance.append({"feature": "Voice Instability", "value": float(voice_score)})
        if handwriting_score is not None:
            feature_importance.append({"feature": "Handwriting Distortion", "value": float(handwriting_score)})
            
        # Sort importances by value descending
        feature_importance.sort(key=lambda x: x["value"], reverse=True)
        
        return {
            "final_risk": final_risk,
            "prediction": prediction_tag,
            "riskPercent": final_risk,
            "symptomsScore": round(symptom_score),
            "voiceScore": round(voice_score) if voice_score is not None else 0,
            "handwritingScore": round(handwriting_score) if handwriting_score is not None else 0,
            "featureImportance": feature_importance
        }
