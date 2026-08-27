import numpy as np
import soundfile as sf
from PIL import Image

def generate_voice():
    sr = 22050
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    mod = np.sin(2 * np.pi * 3.0 * t) * 0.05
    phases = 2 * np.pi * 140.0 * (t + mod)
    y = np.sin(phases) + 0.05 * np.random.randn(len(t))
    y = y * (1.0 + 0.25 * np.sin(2 * np.pi * 4.0 * t))
    y = y / np.max(np.abs(y))
    sf.write("voice_test.wav", y, sr)
    print("Generated voice_test.wav")

def generate_handwriting():
    img = Image.new("RGB", (224, 224), color="white")
    pixels = img.load()
    for angle in np.linspace(0, 8 * np.pi, 1000):
        r = 10 + 8 * angle
        x = int(112 + r * np.cos(angle))
        y = int(112 + r * np.sin(angle))
        if 0 <= x < 224 and 0 <= y < 224:
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if 0 <= x+dx < 224 and 0 <= y+dy < 224:
                        pixels[x+dx, y+dy] = (0, 0, 0)
    img.save("hand_test.png")
    print("Generated hand_test.png")

if __name__ == "__main__":
    generate_voice()
    generate_handwriting()
