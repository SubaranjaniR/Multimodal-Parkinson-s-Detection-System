import librosa
import torch
from transformers import AutoFeatureExtractor


SAMPLE_RATE = 16000

MAX_LENGTH = 92218


feature_extractor = AutoFeatureExtractor.from_pretrained(
    "facebook/hubert-base-ls960"
)


def load_audio(audio_path):

    waveform, sr = librosa.load(
        audio_path,
        sr=SAMPLE_RATE
    )

    return waveform


def pad_or_truncate(waveform):

    if len(waveform) > MAX_LENGTH:

        waveform = waveform[:MAX_LENGTH]

    else:

        padding = MAX_LENGTH - len(waveform)

        waveform = torch.nn.functional.pad(
            torch.tensor(waveform),
            (0, padding)
        ).numpy()

    return waveform


def preprocess_audio(audio_path):

    waveform = load_audio(audio_path)

    waveform = pad_or_truncate(waveform)

    inputs = feature_extractor(
        waveform,
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt"
    )

    return inputs["input_values"]
