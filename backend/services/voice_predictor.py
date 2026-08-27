import os
import sys
import torch
import traceback

class VoicePredictor:
    def __init__(self):
        # Add project root to sys.path to find voice_model and audio_preprocessing
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
            
        from voice_model import ParkinsonVoiceModel
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ParkinsonVoiceModel()
        
        # Load checkpoint from root of project
        checkpoint_path = os.path.join(project_root, "best_voice_model.pth")
        
        try:
            checkpoint = torch.load(checkpoint_path, map_location=self.device)
            self.model.load_state_dict(checkpoint)
            self.model.to(self.device)
            self.model.eval()
            print(f"Voice model loaded successfully on device: {self.device}")
        except Exception as e:
            print(f"Failed to load voice model from {checkpoint_path}: {e}")
            traceback.print_exc()
            raise e

    def predict_voice(self, audio_path: str) -> dict:
        """
        Preprocesses audio, runs inference, and returns JSON prediction output.
        """
        from audio_preprocessing import preprocess_audio
        
        # 1. Handle empty file check
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            raise ValueError("The uploaded audio file is empty or missing.")
            
        try:
            # 2. Preprocess audio
            inputs = preprocess_audio(audio_path)
            inputs = inputs.to(self.device)
            
            # 3. Model Prediction
            with torch.no_grad():
                logits, _ = self.model(inputs)
                
                # 4. Calculate Sigmoid probability
                probability = torch.sigmoid(logits).item()
                
            prediction_val = 1 if probability > 0.5 else 0
            prediction_label = "Parkinson" if prediction_val == 1 else "Healthy"
            
            # 5. Calculate confidence
            if prediction_val == 1:
                confidence = probability * 100
            else:
                confidence = (1.0 - probability) * 100
                
            return {
                "status": "success",
                "prediction": prediction_label,
                "probability": round(probability, 4),
                "confidence": round(confidence, 2),
                "score": round(probability * 100, 2)  # For compatibility with multimodal scoring
            }
        except Exception as e:
            print(f"Prediction inference failed: {e}")
            traceback.print_exc()
            raise e

    def predict(self, audio_path: str) -> dict:
        """
        Wrapper around predict_voice for compatibility with existing prediction flow/tests.
        """
        try:
            return self.predict_voice(audio_path)
        except Exception as e:
            return {
                "status": "unavailable",
                "prediction": None,
                "confidence": None,
                "score": None,
                "error": str(e)
            }

