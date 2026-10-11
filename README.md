# An Explainable Multimodal AI System for Parkinson's Disease Detection Using Symptoms, Voice, Handwriting, and MRI

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Language-Python%203.10+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/Deep%20Learning-TensorFlow%20%2F%20Keras-FF6F00.svg?logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![Scikit-Learn](https://img.shields.io/badge/Machine%20Learning-Scikit--Learn-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An end-to-end, clinically oriented, multimodal artificial intelligence platform engineered for early screening, risk stratification, and interpretable diagnosis of **Parkinson's Disease (PD)**. The system integrates clinical questionnaires, sustained acoustic phonation analysis, spiral/wave drawing kinematics, and brain MRI neuroimaging into a cohesive diagnostic pipeline backed by Explainable AI (XAI) and Gemini-powered clinical insights.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture & Dataflow](#architecture--dataflow)
- [Multimodal Diagnostic Modalities & Models](#multimodal-diagnostic-modalities--models)
  - [1. Clinical Symptoms (Random Forest)](#1-clinical-symptoms-random-forest)
  - [2. Acoustic Voice Analysis (Random Forest + Torchaudio/Librosa)](#2-acoustic-voice-analysis-random-forest--torchaudiolibrosa)
  - [3. Handwriting Kinematics (Convolutional Neural Network)](#3-handwriting-kinematics-convolutional-neural-network)
  - [4. Brain MRI Neuroimaging (Deep CNN Classifier)](#4-brain-mri-neuroimaging-deep-cnn-classifier)
  - [5. Multimodal Dynamic Fusion](#5-multimodal-dynamic-fusion)
- [Explainable AI (XAI) Architecture](#explainable-ai-xai-architecture)
- [Automated Clinical Reporting & AI Consultation](#automated-clinical-reporting--ai-consultation)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI)](#backend-setup-fastapi)
  - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
- [Environment Configuration](#environment-configuration)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Assessment & Prediction](#assessment--prediction)
  - [Patient Management & Records](#patient-management--records)
  - [Reports & AI Explanation](#reports--ai-explanation)
- [Clinical Evaluation Workflow](#clinical-evaluation-workflow)
- [Security, Privacy & Ethics](#security-privacy--ethics)
- [Troubleshooting & Verification](#troubleshooting--verification)
- [License](#license)

---

## Overview

Parkinson's Disease is a progressive neurodegenerative disorder traditionally diagnosed only after substantial dopaminergic neuronal loss in the substantia nigra has occurred. Early clinical manifestation often spans subtle motor and non-motor anomalies across multiple biological domains:
- Vocal micro-tremors, shimmer, and pitch fluctuations in sustained vowels.
- Micrographia and pen tremor during spiral or wave drawing tests.
- Subjective non-motor and prodromal motor symptoms (bradykinesia, rigidity, postural changes, sleep disruptions).
- Structural alterations detectable in brain magnetic resonance imaging (MRI).

**NeuroPark AI** bridges these complementary diagnostic markers into a unified, modular platform. Built with a **FastAPI** asynchronous REST backend and a modern **React 19 / Vite / Tailwind CSS** interactive frontend, the system allows clinicians and patients to execute single-modality checks or complete multi-modal evaluations, visualize layer-wise visual explanations (Grad-CAM) and feature attributions (SHAP), consult an integrated medical LLM (Google Gemini), and export audit-ready PDF reports.

---

## Key Features

- **Four Integrated Diagnostic Modalities**: Clinical questionnaires, sustained phonation `.wav` processing, drawing image analysis, and neuroimaging brain MRI scans.
- **Dynamic Multimodal Decision Fusion**: Normalizes weights dynamically across available patient inputs (30% Symptoms, 35% Voice, 35% Handwriting) to compute composite risk scores even if certain tests are omitted.
- **Deep Explainability (XAI)**:
  - **SHAP-inspired Feature Importances**: Quantifies symptom-level and biomarker contributions for risk breakdown.
  - **Grad-CAM Saliency Maps**: Overlays heatmap activation maps onto drawing samples and MRI neuroimages to pinpoint morphological abnormalities.
  - **Acoustic Spectrogram Grad-CAM**: Generates Mel-spectrogram frequency heatmaps to highlight acoustic instability regions.
- **Generative AI Clinical Insights**: Integrates Google Gemini (`gemini-1.5-flash` / `gemini-pro`) to translate mathematical model risk outputs into empathetic, structured medical summaries, follow-up recommendations, and lifestyle strategies.
- **Automated PDF Report Generation**: Employs ReportLab to render multi-page, publication-grade clinical summaries with risk badges, breakdown graphs, and disclaimer statements.
- **Secure Authentication & Record Storage**: Role-ready SQLite database schema with bcrypt password hashing, JSON Web Token (JWT) sessions, and per-user historical assessment logging.
- **Responsive Dark/Light UI**: Medical-grade dashboards equipped with Recharts analytics, drag-and-drop file upload zones, real-time audio microphone capture, and interactive MRI analysis modals.

---

## Architecture & Dataflow

```
                    +------------------------------------------+
                    |        NeuroPark AI Web Interface        |
                    |    (React 19 + TypeScript + Vite + UI)   |
                    +--------------------+---------------------+
                                         |
                       HTTP / JSON & Multipart Uploads
                                         |
                                         v
                    +------------------------------------------+
                    |             FastAPI Backend              |
                    |          (Python 3.10+, Uvicorn)         |
                    +----+--------------------------------+----+
                         |                                |
         +---------------+---------------+                |
         |                               |                v
         v                               v       +-----------------+
+-----------------+             +----------------+ | SQLite Database |
| Auth & Security |             |  Orchestrator  | | (Users & Tests) |
| (JWT + Bcrypt)  |             | & Modalities   | +-----------------+
+-----------------+             +--------+-------+
                                         |
       +-----------------+---------------+-----------------+-----------------+
       |                 |                                 |                 |
       v                 v                                 v                 v
+--------------+  +--------------+                  +--------------+  +--------------+
|   Symptoms   |  | Voice Phonation |               | Handwriting  |  |  Brain MRI   |
|   Predictor  |  |   Predictor  |                  |  Predictor   |  |   Service    |
|--------------|  |--------------|                  |--------------|  |--------------|
| Random Forest|  | Random Forest|                  | 4-Block CNN  |  |  ConvNet /   |
| (symptom_    |  | (16 Acoustic |                  | (handwriting_|  | Keras Model  |
|  model.pkl)  |  |   Features)  |                  |   model.h5)  |  | (mri.keras)  |
+-------+------+  +-------+------+                  +-------+------+  +-------+------+
        |                 |                                 |                 |
        |                 v                                 v                 v
        |         +---------------+                 +---------------+  +---------------+
        |         | Voice Grad-CAM|                 | Hand Grad-CAM |  | MRI Grad-CAM  |
        |         | (Spectrogram) |                 |   (Layer 3)   |  | (Last Conv2D) |
        |         +-------+-------+                 +-------+-------+  +-------+-------+
        |                 |                                 |                 |
        +--------+--------+----------------+----------------+                 |
                 |                         |                                  |
                 v                         v                                  |
         +----------------+        +-----------------+                        |
         | Dynamic Fusion |        |  Gemini AI LLM  |                        |
         |   Predictor    |        | Clinical Advice |                        |
         +-------+--------+        +--------+--------+                        |
                 |                          |                                 |
                 +-----------------+--------+---------------------------------+
                                   |
                                   v
                        +----------------------+
                        | ReportLab PDF Engine |
                        | (Clinical Summaries) |
                        +----------------------+
```

---

## Multimodal Diagnostic Modalities & Models

### 1. Clinical Symptoms (Random Forest)
- **Model File**: `backend/models/symptom_model.pkl`
- **Algorithm**: Scikit-Learn `RandomForestClassifier` trained on clinical feature profiles.
- **Input Parameters**:
  - Motor Symptoms: Tremor severity (0–10), Rigidity (0–10), Bradykinesia (0–10), Postural Instability (0–10).
  - Non-Motor Symptoms: Speech Problems (0–10), Sleep Disorders (0–10).
  - Demographics & Vitals: Age, Constipation presence, Mood fluctuations.
- **Output**: Calibrated risk probability percentage (0–100%) and symptom severity categorization.

### 2. Acoustic Voice Analysis (Random Forest + Torchaudio/Librosa)
- **Model Files**: `backend/models/voice_model.pkl`, `backend/models/voice_scaler.pkl`
- **Processing Pipeline**: `backend/services/voice_predictor.py` and `audio_preprocessing.py`
- **Audio Feature Extraction**: Parses `.wav` speech samples (sustained phonation of vowels such as `/a/`) using `librosa` and `torchaudio`. Computes a 16-dimensional acoustic vector:
  1. Mean Fundamental Frequency (`MDVP:Fo(Hz)`)
  2. Maximum Fundamental Frequency (`MDVP:Fhi(Hz)`)
  3. Minimum Fundamental Frequency (`MDVP:Flo(Hz)`)
  4. Jitter Absolute (`MDVP:Jitter(Abs)`)
  5. Jitter Percentage (`MDVP:Jitter(%)`)
  6. Relative Average Perturbation (`MDVP:RAP`)
  7. Pitch Period Perturbation Quotient (`MDVP:PPQ5`)
  8. Jitter DDP (`Jitter:DDP`)
  9. Shimmer Local (`MDVP:Shimmer`)
  10. Shimmer dB (`MDVP:Shimmer(dB)`)
  11. Three-point Amplitude Perturbation Quotient (`Shimmer:APQ3`)
  12. Five-point Amplitude Perturbation Quotient (`Shimmer:APQ5`)
  13. Eleven-point Amplitude Perturbation Quotient (`MDVP:APQ11`)
  14. Shimmer DDA (`Shimmer:DDA`)
  15. Noise-to-Harmonics Ratio (`NHR`)
  16. Harmonics-to-Noise Ratio (`HNR`)
- **Scaling & Inference**: Applies `StandardScaler` transformations before Random Forest evaluation, outputting an instability index score and voice impairment severity.

### 3. Handwriting Kinematics (Convolutional Neural Network)
- **Model File**: `backend/models/handwriting_model.h5`
- **Pipeline**: `backend/services/handwriting_predictor.py`
- **Architecture**: Deep Convolutional Neural Network consisting of:
  - Input Layer: Resized to `(128, 128, 1)` grayscale.
  - 4 Sequential Conv2D + MaxPooling2D feature extraction blocks with Batch Normalization and Dropout.
  - Fully Connected Dense layer feeding a Softmax/Sigmoid classification output.
- **Evaluation Task**: Identifies micrographia, line shakiness, and spatial distortion in patient spiral drawings and Meander wave tracings.

### 4. Brain MRI Neuroimaging (Deep CNN Classifier)
- **Model Files**: `best_parkinsons_mri.keras` (also under `backend/models/mri/best_parkinsons_mri.keras`)
- **Class Mapping**: `mri_class_mapping.json` (`{"0": "Healthy", "1": "Parkinson"}`)
- **Input Dimension**: `(224, 224, 3)` RGB axial/coronal brain scans.
- **Inference**: High-capacity convolutional network calculating class probabilities and distinguishing structural parkinsonian atrophy patterns from healthy control scans.

### 5. Multimodal Dynamic Fusion
- **Engine**: `backend/services/fusion_predictor.py`
- **Formula**:
  $$\text{Final Risk} = \sum_{m \in \mathcal{M}} w_m \cdot S_m, \quad \text{where} \quad \sum_{m \in \mathcal{M}} w_m = 1.0$$
  - Baseline nominal weights: **Symptoms (30%)**, **Voice (35%)**, **Handwriting (35%)**.
  - Dynamically renormalizes weights when tests are partially omitted, ensuring flexible single-visit clinic workflows.
  - Outputs risk tiers: **Low Risk (<30%)**, **Moderate Risk (30–69%)**, **High Risk (≥70%)**.

---

## Explainable AI (XAI) Architecture

Machine learning models deployed in healthcare must avoid "black-box" decisions. NeuroPark AI embeds interpretability natively across all modalities:

| Modality | XAI Method | Implementation File | Explanation Output |
| :--- | :--- | :--- | :--- |
| **Symptoms** | Feature Weight Attribution (SHAP-aligned) | `backend/services/fusion_predictor.py` | Ranked feature importance bar charts revealing which symptoms drove the risk score. |
| **Voice** | Spectrogram Activation Grad-CAM | `backend/xai/voice_gradcam.py` | Visual spectrogram overlays mapping resonant frequency bands and perturbation moments. |
| **Handwriting** | Spatial Grad-CAM | `backend/xai/handwriting_gradcam.py` | Heatmap highlights on drawing loops showing micro-tremor and line irregularities. |
| **MRI Neuroimaging**| Last Conv Layer Grad-CAM | `backend/xai/mri_gradcam.py` & `backend/services/mri_service.py` | Class activation heatmaps pinpointing structural regions correlated with neurodegeneration. |

All Grad-CAM generators output base64-encoded PNG visualizations directly back to the API and web frontend for real-time clinician inspection.

---

## Automated Clinical Reporting & AI Consultation

1. **Google Gemini LLM Integration (`backend/main.py`)**:
   - Queries `google-generativeai` (`gemini-1.5-flash` or `gemini-pro`) using structured prompt engineering.
   - Converts numeric risk percentiles, individual modality scores, and clinical indicators into personalized clinical narratives.
   - Generates targeted medical specialist referrals (Movement Disorder Specialists, Neurologists), recommended lab tests (DaTscan, UPDRS testing), and lifestyle adaptations.
2. **ReportLab PDF Generation (`backend/services/report_generator.py`)**:
   - Compiles comprehensive, print-ready PDF reports with color-coded risk indicators.
   - Includes full patient details, individual modality breakdown tables, feature contribution charts, and clinical guidance.
   - Available on-demand via the `/api/generate-report` endpoint.

---

## Repository Structure

```
parkinsons-clarity-main/
├── audio_preprocessing.py            # Standalone audio feature extraction script
├── best_parkinsons_mri.keras         # Pre-trained MRI deep learning model
├── mri_class_mapping.json            # MRI class index-to-label mapping
├── package.json                      # Frontend dependencies and npm scripts
├── vite.config.ts                    # Vite build and dev server configuration
├── tsconfig.json                     # TypeScript compiler configuration
│
├── backend/                          # FastAPI Backend Application
│   ├── main.py                       # FastAPI entry point, API routes, and logic
│   ├── requirements.txt              # Python package dependencies
│   ├── db.py                         # SQLite database initialization and queries
│   ├── auth_service.py               # Password hashing (bcrypt) & JWT sessions
│   ├── generate_test_files.py        # Utility to generate test audio/image fixtures
│   │
│   ├── models/                       # Trained machine learning model weights
│   │   ├── symptom_model.pkl         # Trained Random Forest symptom classifier
│   │   ├── voice_model.pkl           # Trained Random Forest voice classifier
│   │   ├── voice_scaler.pkl          # Audio feature StandardScaler
│   │   ├── handwriting_model.h5      # Keras CNN model for spiral/wave drawings
│   │   └── mri/
│   │       └── best_parkinsons_mri.keras # Deep neural network for MRI scans
│   │
│   ├── services/                     # Core prediction & utility services
│   │   ├── symptom_predictor.py      # Symptom scoring & feature scaling
│   │   ├── voice_predictor.py        # Audio loading, feature computation & inference
│   │   ├── handwriting_predictor.py  # Image processing & drawing CNN inference
│   │   ├── fusion_predictor.py       # Dynamic multi-modal score weighting & SHAP
│   │   ├── mri_service.py            # MRI image preprocessing & inference
│   │   └── report_generator.py       # ReportLab clinical PDF rendering engine
│   │
│   ├── xai/                          # Explainable AI (Grad-CAM) implementations
│   │   ├── handwriting_gradcam.py    # Spatial Grad-CAM for drawing images
│   │   ├── mri_gradcam.py            # Gradient-weighted Class Activation for MRI
│   │   └── voice_gradcam.py          # Mel-spectrogram frequency-domain Grad-CAM
│   │
│   └── uploads/                      # Temporary storage for uploaded modalities
│       ├── handwriting/
│       ├── mri/
│       ├── reports/
│       └── voice/
│
└── src/                              # React 19 Frontend Application
    ├── main.tsx                      # Frontend application bootstrap
    ├── router.tsx                    # TanStack router configuration
    ├── index.css                     # Global styles and Tailwind CSS directives
    │
    ├── routes/                       # Application pages & routes
    │   ├── index.tsx                 # Landing page & feature showcase
    │   ├── dashboard.tsx             # Interactive clinician dashboard & analytics
    │   ├── predict.tsx               # Multimodal screening assessment workflow
    │   ├── history.tsx               # Patient assessment historical logs
    │   ├── auth.tsx                  # Sign In & Registration forms
    │   └── not-found.tsx             # 404 error fallback page
    │
    ├── components/                   # Modular UI components
    │   ├── dashboard/                # Screening & visualization widgets
    │   │   ├── ClinicalQuestions.tsx # Symptom survey step
    │   │   ├── VoiceRecording.tsx    # Audio file upload & live mic capture
    │   │   ├── SpiralDrawing.tsx     # Handwriting image upload & canvas
    │   │   ├── MriPredictor.tsx      # Standalone MRI inspection modal
    │   │   ├── ResultView.tsx        # Comprehensive score breakdown & XAI visualizer
    │   │   ├── XaiVisualizer.tsx     # Dedicated Grad-CAM heatmap viewer
    │   │   └── SummaryCards.tsx      # Metric counters & overview cards
    │   ├── site/                     # Layout header, navigation & footer
    │   └── ui/                       # Reusable Radix UI & Tailwind component library
    │
    └── lib/                          # Client-side API connectors and helper functions
        ├── api.ts                    # Axios / Fetch client connecting to FastAPI backend
        └── utils.ts                  # Class merging (clsx/tailwind-merge) helpers
```

---

## Technology Stack

### Backend & Machine Learning
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) with asynchronous ASGI worker via Uvicorn.
- **Deep Learning**: [TensorFlow 2.15](https://www.tensorflow.org/) & [Keras 3](https://keras.io/) (CNNs for handwriting and MRI).
- **Machine Learning**: [Scikit-Learn](https://scikit-learn.org/), NumPy, Pandas, Joblib.
- **Signal Processing**: [Librosa](https://librosa.org/), [SoundFile](https://pysoundfile.readthedocs.io/), [Torchaudio](https://pytorch.org/audio/).
- **Generative AI**: [Google Generative AI SDK](https://ai.google.dev/) (`google-generativeai`).
- **Clinical Reporting**: [ReportLab](https://www.reportlab.com/) (programmatic vector PDF generation).
- **Security & Storage**: SQLite, Passlib / Bcrypt, PyJWT.

### Frontend & Client Application
- **Framework**: [React 19](https://react.dev/) with [TypeScript 5](https://www.typescriptlang.org/).
- **Bundler & Tooling**: [Vite 7](https://vitejs.dev/).
- **Routing & State**: [TanStack Router](https://tanstack.com/router) & [TanStack Query](https://tanstack.com/query).
- **Design & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI Primitives](https://www.radix-ui.com/), Lucide Icons.
- **Data Visualization**: [Recharts](https://recharts.org/) (radar charts, SHAP horizontal bar graphs).
- **Forms & Validation**: React Hook Form, Zod.

---

## Installation & Setup

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12 (with `pip` and virtual environment support).
- **Node.js**: v18.0.0 or later (LTS recommended) and `npm` or `bun`.
- **Operating System**: Windows, Linux, or macOS.
- **Hardware**: Compatible with standard CPU inference; CUDA-enabled GPU supported for accelerated TensorFlow execution.

---

### Backend Setup (FastAPI)

1. Open a terminal and navigate to the project directory:
   ```bash
   cd parkinsons-clarity-main
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. *(Optional)* Configure environment variables in a `.env` file inside the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   PORT=8000
   HOST=127.0.0.1
   ```

5. Launch the FastAPI server:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

6. Confirm the backend is live:
   - **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Alternative API Docs (ReDoc)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
   - **Healthcheck Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### Frontend Setup (React + Vite)

1. Open a separate terminal and navigate to the root directory:
   ```bash
   cd parkinsons-clarity-main
   ```

2. Install JavaScript/TypeScript dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Access the web interface in your browser:
   - **URL**: [http://localhost:5173](http://localhost:5173)

---

## Environment Configuration

Configure the following environment variables to activate full external services:

| Variable | Scope | Required | Description | Default |
| :--- | :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | Backend | Optional | Google Gemini API key for dynamic clinical narratives. | Falls back to rule-based clinical recommendations. |
| `VITE_API_URL` | Frontend | Optional | Target URL for the FastAPI backend. | `http://127.0.0.1:8000` |
| `JWT_SECRET` | Backend | Optional | Cryptographic secret for signing auth session tokens. | Internal secure fallback key. |

---

## API Reference

The FastAPI service exposes an asynchronous RESTful API structured as follows:

### Authentication
- `POST /api/auth/register` — Creates a new clinician or user account (stores bcrypt-hashed password in SQLite).
- `POST /api/auth/login` — Authenticates credentials and returns a signed bearer JWT token.
- `GET /api/auth/me` — Fetches current authenticated user profile and permissions.

### Assessment & Prediction
- `POST /api/predict-symptoms` — Evaluates motor/non-motor symptom scores using the Random Forest classifier.
- `POST /api/predict-voice` — Accepts a `.wav` multipart audio upload; extracts 16 acoustic features and computes voice instability score.
- `POST /api/predict-handwriting` — Accepts a spiral or wave drawing image; runs 4-block CNN inference and generates spatial Grad-CAM.
- `POST /api/predict-multimodal` — Evaluates all provided modalities together, normalizes weights, returns composite risk score, and calculates feature importances.
- `POST /api/predict-mri` — Uploads axial/coronal brain MRI scan; produces binary classification (`Healthy` vs `Parkinson`) and layer Grad-CAM heatmap.

### Patient Management & Records
- `GET /api/patients` — Retrieves the listing of patient profiles and recent risk tiers.
- `GET /api/history` — Lists past diagnostic runs for the authenticated session.
- `POST /api/history` — Saves an assessment record with modality inputs, timestamps, and confidence outputs.
- `DELETE /api/history/{id}` — Removes an assessment record.

### Reports & AI Explanation
- `POST /api/generate-report` — Compiles assessment data into a formatted ReportLab PDF document (returns binary stream).
- `POST /api/explain-prediction` — Sends assessment metrics to Google Gemini to retrieve an empathetic, structured clinical interpretation.

---

## Clinical Evaluation Workflow

Follow this standard procedure to conduct an evaluation using the platform:

```
Step 1: Patient Enrollment
   └── Navigate to the Assessment Screen (/predict) and enter demographic details (Age, Gender).

Step 2: Clinical Symptom Survey
   └── Rate motor and non-motor symptoms (Tremor, Rigidity, Bradykinesia, Speech, Postural Instability) on a 0–10 scale.

Step 3: Acoustic Phonation Test
   └── Record or upload a 3- to 5-second sustained phonation /a/ vowel (.wav format).
   └── The system extracts 16 acoustic features and checks for jitter/shimmer frequency anomalies.

Step 4: Handwriting & Kinematic Drawing Test
   └── Upload a digitized Archimedean spiral or meander wave drawing.
   └── The CNN evaluates line thickness uniformity, micro-tremors, and spatial boundary preservation.

Step 5: Multimodal Fusion & XAI Review
   └── The fusion engine computes the combined risk percentage.
   └── Inspect the SHAP feature importance chart, handwriting Grad-CAM heatmap, and voice spectrogram.

Step 6: Brain MRI Validation (Optional/Confirmatory)
   └── Launch the MRI diagnostic tool, upload an axial T1/T2 brain slice, and inspect activation regions.

Step 7: Report Generation & Clinical Follow-up
   └── Review the Gemini AI consultation summary and download the official PDF diagnostic report.
```

---

## Security, Privacy & Ethics

- **Data Privacy**: Uploaded medical media (voice recordings, handwriting samples, and MRI scans) are processed locally through isolated backend services and stored within secured directories (`backend/uploads/`).
- **Credential Protection**: Passwords are encrypted using salted `bcrypt` algorithms; API endpoints implement JWT bearer validation for user operations.
- **Clinical AI Disclaimer**:
  > **Important Medical Notice**: This software is intended exclusively for educational, clinical research, and exploratory screening purposes. It is **not** a standalone certified medical device and does not replace professional neurological examination, DaTscan imaging, or the clinical judgment of a qualified medical practitioner.

---

## Troubleshooting & Verification

### Verifying the Setup
To verify model pipelines and backend health without launching the frontend, execute the built-in test suite:
```powershell
# From the project root with the virtual environment activated:
python backend/test_symptom_model.py
python backend/test_voice_robust.py
python backend/test_e2e_backend.py
```

### Common Issues & Solutions

1. **`ModuleNotFoundError: No module named 'tensorflow'` or `'reportlab'`**:
   - Ensure the virtual environment is activated before running the backend.
   - Run `pip install -r backend/requirements.txt` to verify all packages are installed.

2. **CORS Errors During API Calls**:
   - Verify that the FastAPI backend is running on `http://127.0.0.1:8000`.
   - The backend includes default CORS permissions for `localhost:5173`, `localhost:5174`, `localhost:3000`, and `localhost:8080`.

3. **Audio Processing Errors (`No backend available`)**:
   - Ensure uploaded audio is in standard 16-bit or 24-bit PCM `.wav` format.
   - Both `soundfile` and `torchaudio` are included in `backend/requirements.txt` to ensure robust cross-platform audio decoding.

4. **Port 8000 or 5173 in Use**:
   - Run the backend on a custom port: `python -m uvicorn backend.main:app --port 8001 --reload`
   - Update `VITE_API_URL` or `src/lib/api.ts` accordingly.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full details.
