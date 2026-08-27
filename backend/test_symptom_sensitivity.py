import joblib
import pandas as pd
import numpy as np

model_path = r"c:\Users\subar\Downloads\parkinsons\parkinsons-clarity-main\backend\models\symptom_model.pkl"
model = joblib.load(model_path)

# Print feature names
features = model.feature_names_in_
print("Features:", list(features))

# Let's define a function that does prediction and returns probability of Parkinson (class 1)
def predict_prob(age, gender, family_history, tremor, rigidity, bradykinesia, postural, speech, sleep, updrs, moca, func_assess):
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
    # Reorder columns to match feature_names_in_
    df = df[features]
    prob = model.predict_proba(df)[0][1]
    pred = model.predict(df)[0]
    return pred, prob

# Test healthy case: Age 60, gender 0, family history 0, all sliders 0
print("\n--- Test cases ---")
print("Healthy, default values (UPDRS=0, MoCA=30, Func=0):")
print(predict_prob(60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0))

print("Healthy, default values (UPDRS=10, MoCA=27, Func=8):")
print(predict_prob(60, 0, 0, 0, 0, 0, 0, 0, 0, 10, 27, 8))

# Test parkinson case: Age 65, gender 1, family history 1, all sliders 6-8
print("\nParkinson, default values (UPDRS=0, MoCA=30, Func=0):")
print(predict_prob(65, 1, 1, 7, 7, 7, 6, 7, 6, 0, 30, 0))

print("Parkinson, high values (UPDRS=40, MoCA=20, Func=3):")
print(predict_prob(65, 1, 1, 7, 7, 7, 6, 7, 6, 40, 20, 3))

print("Parkinson, intermediate values (UPDRS=25, MoCA=24, Func=5):")
print(predict_prob(65, 1, 1, 7, 7, 7, 6, 7, 6, 25, 24, 5))

# Let's do a grid search to see how the model behaves
print("\nExploring MoCA and UPDRS values for parkinson symptoms:")
for updrs in [0, 15, 30, 45]:
    for moca in [30, 25, 20, 15]:
        for func in [1, 5, 8]:
            pred, prob = predict_prob(65, 1, 1, 7, 7, 7, 6, 7, 6, updrs, moca, func)
            print(f"UPDRS={updrs}, MoCA={moca}, Func={func} => Pred={pred}, Prob={prob:.4f}")
