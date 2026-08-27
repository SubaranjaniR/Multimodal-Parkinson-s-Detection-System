import os
import numpy as np
from PIL import Image
import traceback

class HandwritingPredictor:
    def __init__(self):
        # Prevent tensorflow from printing a lot of logs at startup
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(current_dir, "..", "models", "handwriting_model.h5")
        
        import keras
        self.model = keras.models.load_model(self.model_path)

    def predict(self, image_path: str) -> dict:
        """
        Loads drawing image, preprocesses it to 224x224, normalizes to [0,1],
        and runs prediction via the MobileNetV2 Keras model.
        """
        try:
            # Open and preprocess image
            img = Image.open(image_path).convert('RGB')
            img = img.resize((224, 224))
            
            # Convert to numpy array and normalize to [0, 1]
            img_array = np.array(img, dtype=np.float32) / 255.0
            
            # Add batch dimension: shape (1, 224, 224, 3)
            img_array = np.expand_dims(img_array, axis=0)
            
            # Predict
            pred_prob_array = self.model.predict(img_array, verbose=0)
            pred_prob = float(pred_prob_array[0][0])
            
            pred = 1 if pred_prob >= 0.5 else 0
            confidence = round(pred_prob * 100) if pred == 1 else round((1.0 - pred_prob) * 100)
            
            return {
                "status": "success",
                "prediction": pred,
                "confidence": confidence,
                "score": round(pred_prob * 100)
            }
        except Exception as e:
            print(f"Error predicting handwriting: {e}")
            traceback.print_exc()
            return {
                "status": "unavailable",
                "prediction": None,
                "confidence": None,
                "score": None,
                "error": str(e)
            }
