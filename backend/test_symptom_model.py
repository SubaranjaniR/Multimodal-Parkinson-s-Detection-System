import joblib
import pandas as pd
import numpy as np

model_path = r"c:\Users\subar\Downloads\parkinsons\parkinsons-clarity-main\backend\models\symptom_model.pkl"
model = joblib.load(model_path)
features = model.feature_names_in_

def predict_symptoms(age, gender, family_history, tremor, rigidity, bradykinesia, postural, speech, sleep, updrs, moca, func_assess):
    df = pd.DataFrame([{
        'Age': age,
        'Gender': gender,
        'FamilyHistoryParkinsons': family_history,
        'Tremor': tremor,
        'Rigidity': rigidity,
        'Bradykinesia': bradykinesia,
        'PosturalInstability': postural,
        'SpeechProblems': speech,
        'SleepDisorders': sleep,
        'UPDRS': updrs,
        'MoCA': moca,
        'FunctionalAssessment': func_assess
    }])
    df = df[features]
    prob = model.predict_proba(df)[0][1]
    pred = model.predict(df)[0]
    return pred, prob

print("--- Test Direct Symptoms Model ---")

# 1. Healthy: Age 45, Gender Male (1), no family history (0), clinical scores normal (UPDRS=0, MoCA=30, Func=10), sliders 0
print("Healthy case:")
pred, prob = predict_symptoms(45, 1, 0, 0, 0, 0, 0, 0, 0, 0.0, 30.0, 10.0)
print(f"Pred={pred}, Prob={prob:.4f}")

# 2. Borderline/Mild: Age 55, Gender Female (0), no family history (0), clinical scores mild (UPDRS=19.5, MoCA=28, Func=7.5), sliders 3
print("\nMild/Borderline case:")
pred, prob = predict_symptoms(55, 0, 0, 3, 3, 3, 2, 2, 2, 19.5, 28.0, 7.5)
print(f"Pred={pred}, Prob={prob:.4f}")

# 3. Severe Parkinson: Age 70, Gender Male (1), family history (1), clinical scores severe (UPDRS=57, MoCA=23, Func=2.5), sliders 8
print("\nSevere case:")
pred, prob = predict_symptoms(70, 1, 1, 8, 8, 8, 7, 7, 7, 57.0, 23.0, 2.5)
print(f"Pred={pred}, Prob={prob:.4f}")
