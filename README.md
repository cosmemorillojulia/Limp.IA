🌐 [Versión en español](README.es.md)

# Limp.IA — Intelligent Image Moderation System

**Bachelor's Thesis in Computer Engineering · 2024–2025**

[![Python](https://img.shields.io/badge/Python-3.7-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?style=flat&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![Keras](https://img.shields.io/badge/Keras-Sequential-D00000?style=flat&logo=keras&logoColor=white)](https://keras.io/)
[![TF.js](https://img.shields.io/badge/TensorFlow.js-3.19.0-FF6F00?style=flat&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![Firefox Extension](https://img.shields.io/badge/Firefox-WebExtension-FF7139?style=flat&logo=firefox-browser&logoColor=white)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A complete end-to-end machine learning system that detects and blurs inappropriate visual content in real time, directly inside the browser. Built from scratch: custom dataset pipeline, convolutional neural network training, and a fully functional Firefox extension powered by TensorFlow.js.

---

## About the Project

**Limp.IA** (from Spanish *limpiar* — "to clean") is an intelligent image moderation system designed to automatically detect and obscure sensitive or explicit visual content on web pages.

The system is composed of two tightly integrated components:

1. **A custom Convolutional Neural Network (CNN)** trained to perform binary image classification — distinguishing *neutral* (safe) content from *sensitive* (inappropriate) content. The model was trained on ~23,100 images across multiple content categories, achieving a **test accuracy of 94.34%** and an **F1-score of 94.03%**.

2. **A Mozilla Firefox browser extension** that loads the trained model via TensorFlow.js and runs inference entirely client-side. Every image on a visited page is automatically analyzed; sensitive images are immediately blurred in real time without sending any data to external servers.

The full project documentation — including methodology, experimental results, and conclusions — is available in the thesis report:

📄 **[PFG_Memoria_MorilloJuliaCosme.pdf](PFG_Memoria_MorilloJuliaCosme.pdf)**

### Responsible Development

By its very nature, a content moderation system is built around sensitive and explicit material — and that deserves to be addressed directly. Throughout the entire development of this project, the author was not exposed to harmful or explicit content. The dataset was assembled from URL lists and processed entirely programmatically; no images were manually browsed or reviewed. This was a deliberate architectural and ethical decision: the project was designed from the ground up so that building it would not require the developer to engage with the very content the system is meant to filter out. The goal has always been to create something that genuinely helps people — a tool that silently works in the background to make browsing safer, particularly for those who may be vulnerable to unexpected exposure to inappropriate content. The ethical considerations behind these decisions are documented in full in the project thesis.

---

## Firefox Extension Features

The browser extension ([`LimpIA_ExtensionWeb/`](LimpIA_ExtensionWeb/)) is the visible face of the project — what an end user would actually interact with:

- **Automatic detection** — scans all images on page load and monitors dynamically loaded content
- **Instant blurring** — sensitive images are blurred immediately after classification, without any page reload
- **Privacy first** — all processing happens locally in the browser; no images or data leave the device
- **Popup dashboard** — toggle the extension on/off, view live counters of analyzed / blurred / protected images
- **Confidence display** — optional overlay showing the model's prediction score per image
- **Handles edge cases** — CORS-restricted images (e.g. Google, Cloudflare) are detected and skipped gracefully
- **Persistent settings** — on/off state and preferences are remembered across browser sessions

---

## Results & Metrics

The model was evaluated on a held-out test set of ~2,100 images (10% of the total dataset) that it had never seen during training:

| Metric | Value |
|--------|-------|
| **Test Accuracy** | **94.34%** |
| **Precision** | **94.34%** |
| **Recall** | **93.71%** |
| **F1-Score** | **94.03%** |
| Best Val. Accuracy | 86.45% |
| Best Val. Loss | 0.3295 |

Detailed training curves, confusion matrices, and per-fold results are available in the PDF reports inside [`LimpIA_ModeloCNN/save/`](LimpIA_ModeloCNN/save/).

---

## How It Works

When a web page is loaded, the extension intercepts all images and runs them through the neural network locally:

```
Web Page Loaded
      │
      ▼
 MutationObserver detects images (including lazy-loaded / dynamic)
      │
      ▼
 Image preprocessed → resized to 128×128, normalized
      │
      ▼
 TF.js model runs inference in-browser (no server calls)
      │
      ├──── Score ≤ 0.5 ──► Image displayed normally
      │
      └──── Score > 0.5 ──► CSS blur(10px) applied instantly
```

The neural network outputs a probability between 0 and 1. Values above 0.5 are classified as sensitive and blurred immediately.

---

## Dataset

The training dataset (~5 GB) is **not included** in this repository due to size constraints. The URL lists used to build it are provided in [`LimpIA_ModeloCNN/descargarIMG/data_url/`](LimpIA_ModeloCNN/descargarIMG/data_url/).

**Original source:** [nsfw_data_scraper](https://github.com/alex000kim/nsfw_data_scraper/tree/main/raw_data) by Alexander Kim

The dataset originally covers five content categories (`neutral`, `sexy`, `porn`, `hentai`, `drawings`), which were merged into a binary scheme (neutral vs. sensitive) for this project. The final dataset contains ~23,100 images split 70 / 20 / 10 for training, validation, and testing.

### Expected structure

```bash
LimpIA_ModeloCNN/data/
├── neutral/       # ~11,550 images
└── sexy/          # ~11,550 images (all sensitive categories merged)
```

### Dataset License

Licensed under the [MIT License](https://opensource.org/licenses/MIT) by Alexander Kim (2019). Academic and commercial use permitted with attribution.

---

## Model Comparison

Four architectures were trained and evaluated before selecting the final model:

| Model | Approach | Notes |
|-------|----------|-------|
| **Custom CNN** ✅ | Trained from scratch | Best overall results; selected for deployment |
| CNN + k-Fold (k=5) | Cross-validation | More robust generalization estimate |
| MobileNetV2 | Transfer learning (ImageNet) | Lightweight; tested for edge deployment |
| EfficientNetB3 | Transfer learning (ImageNet) | Higher capacity; marginal gains vs training cost |

The custom CNN was selected for deployment due to its accuracy, simplicity, and compatibility with TensorFlow.js.

---

## Model Architecture

The final deployed model is a custom **Sequential CNN** built with Keras:

| Layer | Type | Output Shape | Details |
|-------|------|-------------|---------|
| 1 | Conv2D + ReLU | 126×126×16 | 16 filters, 3×3 kernel |
| 2 | MaxPooling2D | 63×63×16 | 2×2 pool |
| 3 | Conv2D + ReLU | 61×61×32 | 32 filters, 3×3 kernel |
| 4 | MaxPooling2D | 30×30×32 | 2×2 pool |
| 5 | Conv2D + ReLU | 28×28×64 | 64 filters, 3×3 kernel |
| 6 | MaxPooling2D | 14×14×64 | 2×2 pool |
| 7 | Conv2D + ReLU | 12×12×128 | 128 filters, 3×3 kernel |
| 8 | MaxPooling2D | 6×6×128 | 2×2 pool |
| 9 | Flatten | 4608 | — |
| 10 | Dense + ReLU | 64 | — |
| 11 | Dropout | 64 | rate = 0.3 |
| 12 | Dense + Sigmoid | 1 | Binary output |

**Input:** 128×128 RGB images · **Output:** probability ∈ [0, 1]  
**Training time:** ~5 hours 24 minutes

### Training Configuration

| Hyperparameter | Value |
|---------------|-------|
| Optimizer | Adam |
| Learning Rate | 0.0008 |
| Loss Function | Binary Crossentropy |
| Batch Size | 8 |
| Max Epochs | 40 |
| Early Stopping | patience = 6 |
| LR Reduction | ReduceLROnPlateau (factor = 0.7) |
| Data Augmentation | Rotation ±15°, shift 10%, zoom 10%, h-flip |

---

## Repository Structure

```
LimpIA/
├── PFG_Memoria_MorilloJuliaCosme.pdf   # Full thesis report (methodology, results, conclusions)
│
├── LimpIA_ModeloCNN/                   # Model training pipeline
│   ├── LimpIA_ModeloCNN.ipynb          # Main training notebook (final CNN)
│   ├── descargarIMG/                   # Dataset download scripts
│   │   ├── descargar_Pexels.ipynb
│   │   ├── descargar_Pixabay.ipynb
│   │   ├── descargar_URL.ipynb
│   │   ├── dataAmentation.ipynb
│   │   └── data_url/                   # URL lists per category
│   │       ├── urls_neutral.txt
│   │       ├── urls_sexy.txt
│   │       ├── urls_porn.txt
│   │       ├── urls_hentai.txt
│   │       └── urls_drawings.txt
│   ├── otrosModelos/                   # Alternative architecture experiments
│   │   ├── CNN_kFold.ipynb
│   │   ├── MobileNetV2.ipynb
│   │   └── EfficientNetB3.ipynb
│   ├── resultadosFinales/              # Final trained model + TF.js export
│   │   ├── CNN_py37_modelo.h5
│   │   ├── informe_CNN_py37.pdf        # Training report with charts & metrics
│   │   └── tfjs/model.json
│   └── save/                           # Saved models + reports for all experiments
│
└── LimpIA_ExtensionWeb/                # Firefox browser extension
    ├── manifest.json
    ├── background.js
    ├── content.js                      # Image detection, inference & blurring
    ├── popup.html / popup.js           # Extension UI
    ├── styles.css
    ├── model/model.json                # TF.js model weights
    └── libs/tf.min.js                  # TensorFlow.js v3.19.0 (bundled)
```

---

## Installation & Usage

### Firefox Extension

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** → **"Load Temporary Add-on..."**
3. Select any file inside the `LimpIA_ExtensionWeb/` folder
4. The extension icon will appear in the toolbar — click it to open the dashboard

> For permanent installation, the extension would need to be submitted to [addons.mozilla.org](https://addons.mozilla.org).

### Model Training (Python)

```bash
# 1. Create and activate a Python 3.7 virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS

# 2. Install dependencies
pip install tensorflow==2.x keras pillow numpy scikit-learn matplotlib seaborn pandas

# 3. Prepare the dataset (see Dataset section above)

# 4. Open and run the training notebook
jupyter notebook LimpIA_ModeloCNN/LimpIA_ModeloCNN.ipynb
```

---

## Technologies

| Component | Technology |
|-----------|-----------|
| Model training | Python 3.7, TensorFlow/Keras |
| Data processing | Pillow, NumPy, scikit-learn |
| Visualization | Matplotlib, Seaborn, pandas |
| Browser deployment | TensorFlow.js 3.19.0 |
| Browser extension | Mozilla Firefox WebExtension API (Manifest v2) |
| Model format | Keras `.h5` → TF.js layers format |

---

## Author

**Cosme Morillo Juliá**  
Bachelor's Degree in Computer Engineering  
Academic year 2024–2025

[![GitHub](https://img.shields.io/badge/GitHub-cosmemorillojulia-181717?style=flat&logo=github)](https://github.com/cosmemorillojulia)

---

## License

This project's source code is released under the [MIT License](LICENSE).  
The dataset is independently licensed — see the [Dataset License](#dataset) section above.
