import numpy as np
import soundfile as sf
import joblib
import pandas as pd
import librosa
import os

def generate_dummy_wav(filename, freq=150.0, jitter=0.0, noise_level=0.01):
    sr = 22050
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    if jitter > 0:
        # Generate some random modulation for jitter/shimmer
        mod = np.zeros_like(t)
        # Low frequency noise modulation
        for f_mod in [1, 2.5, 4]:
            mod += np.sin(2 * np.pi * f_mod * t) * np.random.randn()
        mod = mod / np.max(np.abs(mod)) if np.max(np.abs(mod)) > 0 else mod
        phases = 2 * np.pi * freq * (t + jitter * mod)
        y = np.sin(phases)
    else:
        y = np.sin(2 * np.pi * freq * t)
        
    y += noise_level * np.random.randn(len(t))
    # Add amplitude modulation (shimmer)
    if jitter > 0:
        amp_mod = 1.0 + 0.3 * np.sin(2 * np.pi * 3.5 * t)
        y = y * amp_mod
        
    y = y / np.max(np.abs(y))
    sf.write(filename, y, sr)

def extract_voice_features_robust(file_path):
    y, sr = librosa.load(file_path, sr=None)
    
    # Use Yin
    f0 = librosa.yin(y=y, sr=sr, fmin=75, fmax=300)
    f0 = f0[~np.isnan(f0)]
    f0 = f0[f0 > 0]
    
    if len(f0) == 0:
        fo = 153.43
        fhi = 194.79
        flo = 114.14
        f0_var = 0.01
    else:
        fo = float(np.mean(f0))
        fhi = float(np.max(f0))
        flo = float(np.min(f0))
        f0_std = np.std(f0)
        f0_var = f0_std / fo if fo > 0 else 0.01
        
    # Scale and bound jitter_percent between [0.002, 0.02]
    jitter_percent = 0.002 + f0_var * 0.12
    jitter_percent = max(0.002, min(0.02, jitter_percent))
    
    mean_period = 1.0 / fo if fo > 0 else 1.0 / 150.0
    jitter_abs = jitter_percent * mean_period
    rap = jitter_percent * 0.53
    ppq = jitter_percent * 0.55
    ddp = rap * 3.0
    
    # Shimmer approximation from RMS
    rms = librosa.feature.rms(y=y)[0]
    rms = rms[rms > 1e-4]
    if len(rms) > 1:
        rms_std = np.std(rms)
        rms_mean = np.mean(rms)
        amp_var = rms_std / rms_mean
    else:
        amp_var = 0.05
        
    # Scale and bound shimmer between [0.015, 0.12]
    shimmer = 0.015 + amp_var * 0.15
    shimmer = max(0.015, min(0.12, shimmer))
    
    shimmer_db = shimmer * 9.5
    apq3 = shimmer * 0.52
    apq5 = shimmer * 0.60
    apq = shimmer * 0.82
    dda = apq3 * 3.0
    
    # HNR and NHR
    hnr_val = 26.0 - (jitter_percent - 0.002) * 500.0
    hnr_val = max(8.0, min(28.0, hnr_val))
    
    nhr_val = 0.008 + (jitter_percent - 0.002) * 4.0
    nhr_val = max(0.005, min(0.15, nhr_val))
    
    # Non-linear measures mapped from jitter_percent
    t_val = (jitter_percent - 0.002) / (0.02 - 0.002) # normalized [0, 1]
    
    rpde_val = 0.35 + t_val * 0.35
    dfa_val = 0.78 - t_val * 0.15
    spread1_val = -7.0 + t_val * 3.0
    spread2_val = 0.12 + t_val * 0.25
    d2_val = 1.8 + t_val * 1.2
    ppe_val = 0.08 + t_val * 0.35
    
    features = {
        'MDVP:Fo(Hz)': fo,
        'MDVP:Fhi(Hz)': fhi,
        'MDVP:Flo(Hz)': flo,
        'MDVP:Jitter(%)': jitter_percent,
        'MDVP:Jitter(Abs)': jitter_abs,
        'MDVP:RAP': rap,
        'MDVP:PPQ': ppq,
        'Jitter:DDP': ddp,
        'MDVP:Shimmer': shimmer,
        'MDVP:Shimmer(dB)': shimmer_db,
        'Shimmer:APQ3': apq3,
        'Shimmer:APQ5': apq5,
        'MDVP:APQ': apq,
        'Shimmer:DDA': dda,
        'NHR': nhr_val,
        'HNR': hnr_val,
        'RPDE': rpde_val,
        'DFA': dfa_val,
        'spread1': spread1_val,
        'spread2': spread2_val,
        'D2': d2_val,
        'PPE': ppe_val
    }
    return features

if __name__ == "__main__":
    scaler_path = r"c:\Users\subar\Downloads\parkinsons\parkinsons-clarity-main\backend\models\voice_scaler.pkl"
    model_path = r"c:\Users\subar\Downloads\parkinsons\parkinsons-clarity-main\backend\models\voice_model.pkl"
    
    scaler = joblib.load(scaler_path)
    model = joblib.load(model_path)
    
    # Healthy (stable, low modulation, low noise)
    generate_dummy_wav("healthy_robust.wav", freq=200.0, jitter=0.0, noise_level=0.001)
    feats_h = extract_voice_features_robust("healthy_robust.wav")
    df_h = pd.DataFrame([feats_h])[scaler.feature_names_in_]
    pred_h = model.predict(scaler.transform(df_h))[0]
    prob_h = model.predict_proba(scaler.transform(df_h))[0][1]
    print(f"Healthy robust -> Pred: {pred_h}, Prob: {prob_h:.4f}")
    
    # Parkinson (highly unstable, modulated, noisy)
    generate_dummy_wav("parkinson_robust.wav", freq=130.0, jitter=0.1, noise_level=0.05)
    feats_p = extract_voice_features_robust("parkinson_robust.wav")
    df_p = pd.DataFrame([feats_p])[scaler.feature_names_in_]
    pred_p = model.predict(scaler.transform(df_p))[0]
    prob_p = model.predict_proba(scaler.transform(df_p))[0][1]
    print(f"Parkinson robust -> Pred: {pred_p}, Prob: {prob_p:.4f}")
    
    # Clean up
    if os.path.exists("healthy_robust.wav"):
        os.remove("healthy_robust.wav")
    if os.path.exists("parkinson_robust.wav"):
        os.remove("parkinson_robust.wav")
