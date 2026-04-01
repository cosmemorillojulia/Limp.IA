🌐 [English version](README.md)

# Limp.IA — Sistema Inteligente de Moderación de Imágenes

**Proyecto de Fin de Grado en Ingeniería Informática · 2024–2025**

[![Python](https://img.shields.io/badge/Python-3.7-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?style=flat&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![Keras](https://img.shields.io/badge/Keras-Sequential-D00000?style=flat&logo=keras&logoColor=white)](https://keras.io/)
[![TF.js](https://img.shields.io/badge/TensorFlow.js-3.19.0-FF6F00?style=flat&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![Firefox Extension](https://img.shields.io/badge/Firefox-WebExtension-FF7139?style=flat&logo=firefox-browser&logoColor=white)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Un sistema completo de aprendizaje automático que detecta y desenfoca contenido visual inapropiado en tiempo real, directamente en el navegador. Construido desde cero: pipeline propio de recopilación de datos, entrenamiento de una red neuronal convolucional y una extensión de Firefox completamente funcional impulsada por TensorFlow.js.

---

## Sobre el Proyecto

**Limp.IA** (de *limpiar*) es un sistema inteligente de moderación de imágenes diseñado para detectar y ocultar automáticamente contenido visual sensible o explícito en páginas web.

El sistema se compone de dos elementos estrechamente integrados:

1. **Una red neuronal convolucional (CNN) propia** entrenada para realizar clasificación binaria de imágenes — distinguiendo contenido *neutral* (seguro) de contenido *sensible* (inapropiado). El modelo fue entrenado con ~23.100 imágenes de múltiples categorías, alcanzando una **precisión en test del 94,34%** y una **puntuación F1 del 94,03%**.

2. **Una extensión para Mozilla Firefox** que carga el modelo entrenado mediante TensorFlow.js y realiza la inferencia completamente en el lado del cliente. Cada imagen de la página visitada es analizada automáticamente; las imágenes sensibles se desenfocan en tiempo real sin enviar ningún dato a servidores externos.

La documentación completa del proyecto — incluyendo metodología, resultados experimentales y conclusiones — está disponible en la memoria del TFG:

📄 **[PFG_Memoria_MorilloJuliaCosme.pdf](PFG_Memoria_MorilloJuliaCosme.pdf)**

### Desarrollo Responsable

Por la propia naturaleza de un sistema de moderación de contenido, el proyecto gira en torno a material sensible o explícito — y eso merece ser abordado con claridad. A lo largo de todo el desarrollo, el autor no estuvo expuesto a contenido dañino o explícito. El dataset fue construido a partir de listas de URLs y procesado de forma completamente programática; las imágenes nunca fueron revisadas ni exploradas manualmente. Esta fue una decisión arquitectónica y ética tomada de forma consciente desde el principio: el proyecto fue diseñado para que su construcción no requiriera que el desarrollador interactuara con el mismo contenido que el sistema tiene como misión filtrar. El objetivo siempre ha sido crear algo que beneficie a las personas — una herramienta que funciona silenciosamente en segundo plano para hacer la navegación más segura, especialmente para quienes puedan ser vulnerables a la exposición involuntaria a contenido inapropiado. Las consideraciones éticas detrás de estas decisiones están documentadas en detalle en la memoria del TFG.

---

## Funcionalidades de la Extensión

La extensión de navegador ([`LimpIA_ExtensionWeb/`](LimpIA_ExtensionWeb/)) es la cara visible del proyecto — lo que un usuario final realmente utilizaría:

- **Detección automática** — analiza todas las imágenes al cargar la página y monitoriza el contenido cargado dinámicamente
- **Desenfoque instantáneo** — las imágenes sensibles se desenfocan inmediatamente tras la clasificación, sin recargar la página
- **Privacidad ante todo** — todo el procesamiento ocurre localmente en el navegador; ninguna imagen ni dato abandona el dispositivo
- **Panel emergente** — activa o desactiva la extensión, y consulta contadores en tiempo real de imágenes analizadas / desenfocadas / protegidas
- **Visualización de confianza** — superposición opcional que muestra la puntuación de predicción del modelo por imagen
- **Gestión de casos límite** — las imágenes con restricciones CORS (p. ej. Google, Cloudflare) se detectan y omiten correctamente
- **Configuración persistente** — el estado activado/desactivado y las preferencias se recuerdan entre sesiones del navegador

---

## Resultados y Métricas

El modelo fue evaluado en un conjunto de test de ~2.100 imágenes (10% del dataset total) que nunca había visto durante el entrenamiento:

| Métrica | Valor |
|---------|-------|
| **Precisión en Test** | **94,34%** |
| **Precisión (Precision)** | **94,34%** |
| **Exhaustividad (Recall)** | **93,71%** |
| **F1-Score** | **94,03%** |
| Mejor Precisión en Validación | 86,45% |
| Mejor Pérdida en Validación | 0,3295 |

Las curvas de entrenamiento detalladas, matrices de confusión y resultados por fold están disponibles en los informes PDF dentro de [`LimpIA_ModeloCNN/save/`](LimpIA_ModeloCNN/save/).

---

## Cómo Funciona

Cuando se carga una página web, la extensión intercepta todas las imágenes y las pasa por la red neuronal de forma local:

```
Página web cargada
      │
      ▼
 MutationObserver detecta imágenes (incluyendo lazy-load y contenido dinámico)
      │
      ▼
 Imagen preprocesada → redimensionada a 128×128, normalizada
      │
      ▼
 Modelo TF.js realiza inferencia en el navegador (sin llamadas a servidor)
      │
      ├──── Puntuación ≤ 0,5 ──► Imagen mostrada con normalidad
      │
      └──── Puntuación > 0,5 ──► Se aplica CSS blur(10px) al instante
```

La red neuronal devuelve una probabilidad entre 0 y 1. Los valores superiores a 0,5 se clasifican como sensibles y se desenfocan inmediatamente.

---

## Dataset

El dataset de entrenamiento (~5 GB) **no está incluido** en este repositorio por limitaciones de tamaño. Las listas de URLs utilizadas para construirlo están disponibles en [`LimpIA_ModeloCNN/descargarIMG/data_url/`](LimpIA_ModeloCNN/descargarIMG/data_url/).

**Fuente original:** [nsfw_data_scraper](https://github.com/alex000kim/nsfw_data_scraper/tree/main/raw_data) de Alexander Kim

El dataset cubre originalmente cinco categorías de contenido (`neutral`, `sexy`, `porn`, `hentai`, `drawings`), que fueron unificadas en un esquema binario (neutral vs. sensible) para este proyecto. El dataset final contiene ~23.100 imágenes divididas en proporciones 70 / 20 / 10 para entrenamiento, validación y test.

### Estructura esperada

```bash
LimpIA_ModeloCNN/data/
├── neutral/       # ~11.550 imágenes
└── sexy/          # ~11.550 imágenes (todas las categorías sensibles unificadas)
```

### Licencia del Dataset

Licenciado bajo la [MIT License](https://opensource.org/licenses/MIT) por Alexander Kim (2019). Se permite el uso académico y comercial con atribución.

---

## Comparativa de Modelos

Se entrenaron y evaluaron cuatro arquitecturas antes de seleccionar el modelo final:

| Modelo | Enfoque | Notas |
|--------|---------|-------|
| **CNN propia** ✅ | Entrenada desde cero | Mejores resultados globales; seleccionada para producción |
| CNN + k-Fold (k=5) | Validación cruzada | Estimación de generalización más robusta |
| MobileNetV2 | Transfer learning (ImageNet) | Ligera; evaluada para despliegue en edge |
| EfficientNetB3 | Transfer learning (ImageNet) | Mayor capacidad; ganancias marginales frente al coste de entrenamiento |

La CNN propia fue seleccionada para el despliegue por su precisión, simplicidad y compatibilidad con TensorFlow.js.

---

## Arquitectura del Modelo

El modelo final desplegado es una **CNN Sequential** propia construida con Keras:

| Capa | Tipo | Forma de salida | Detalles |
|------|------|----------------|---------|
| 1 | Conv2D + ReLU | 126×126×16 | 16 filtros, kernel 3×3 |
| 2 | MaxPooling2D | 63×63×16 | pool 2×2 |
| 3 | Conv2D + ReLU | 61×61×32 | 32 filtros, kernel 3×3 |
| 4 | MaxPooling2D | 30×30×32 | pool 2×2 |
| 5 | Conv2D + ReLU | 28×28×64 | 64 filtros, kernel 3×3 |
| 6 | MaxPooling2D | 14×14×64 | pool 2×2 |
| 7 | Conv2D + ReLU | 12×12×128 | 128 filtros, kernel 3×3 |
| 8 | MaxPooling2D | 6×6×128 | pool 2×2 |
| 9 | Flatten | 4608 | — |
| 10 | Dense + ReLU | 64 | — |
| 11 | Dropout | 64 | tasa = 0,3 |
| 12 | Dense + Sigmoid | 1 | Salida binaria |

**Entrada:** imágenes RGB 128×128 · **Salida:** probabilidad ∈ [0, 1]  
**Tiempo de entrenamiento:** ~5 horas 24 minutos

### Configuración de Entrenamiento

| Hiperparámetro | Valor |
|---------------|-------|
| Optimizador | Adam |
| Tasa de aprendizaje | 0,0008 |
| Función de pérdida | Binary Crossentropy |
| Tamaño de batch | 8 |
| Épocas máximas | 40 |
| Early Stopping | paciencia = 6 |
| Reducción de LR | ReduceLROnPlateau (factor = 0,7) |
| Data Augmentation | Rotación ±15°, desplazamiento 10%, zoom 10%, volteo horizontal |

---

## Estructura del Repositorio

```
LimpIA/
├── PFG_Memoria_MorilloJuliaCosme.pdf   # Memoria completa del TFG (metodología, resultados, conclusiones)
│
├── LimpIA_ModeloCNN/                   # Pipeline de entrenamiento del modelo
│   ├── LimpIA_ModeloCNN.ipynb          # Notebook principal de entrenamiento (CNN final)
│   ├── descargarIMG/                   # Scripts de descarga del dataset
│   │   ├── descargar_Pexels.ipynb
│   │   ├── descargar_Pixabay.ipynb
│   │   ├── descargar_URL.ipynb
│   │   ├── dataAmentation.ipynb
│   │   └── data_url/                   # Listas de URLs por categoría
│   │       ├── urls_neutral.txt
│   │       ├── urls_sexy.txt
│   │       ├── urls_porn.txt
│   │       ├── urls_hentai.txt
│   │       └── urls_drawings.txt
│   ├── otrosModelos/                   # Experimentos con arquitecturas alternativas
│   │   ├── CNN_kFold.ipynb
│   │   ├── MobileNetV2.ipynb
│   │   └── EfficientNetB3.ipynb
│   ├── resultadosFinales/              # Modelo final entrenado + exportación TF.js
│   │   ├── CNN_py37_modelo.h5
│   │   ├── informe_CNN_py37.pdf        # Informe de entrenamiento con gráficas y métricas
│   │   └── tfjs/model.json
│   └── save/                           # Modelos guardados + informes de todos los experimentos
│
└── LimpIA_ExtensionWeb/                # Extensión de Firefox
    ├── manifest.json
    ├── background.js
    ├── content.js                      # Detección de imágenes, inferencia y desenfoque
    ├── popup.html / popup.js           # Interfaz de usuario de la extensión
    ├── styles.css
    ├── model/model.json                # Pesos del modelo en formato TF.js
    └── libs/tf.min.js                  # TensorFlow.js v3.19.0 (empaquetado)
```

---

## Instalación y Uso

### Extensión de Firefox

1. Abre Firefox y navega a `about:debugging`
2. Haz clic en **"Este Firefox"** → **"Cargar complemento temporal..."**
3. Selecciona cualquier archivo dentro de la carpeta `LimpIA_ExtensionWeb/`
4. El icono de la extensión aparecerá en la barra de herramientas — haz clic para abrir el panel

> Para una instalación permanente, la extensión debería enviarse a [addons.mozilla.org](https://addons.mozilla.org).

### Entrenamiento del Modelo (Python)

```bash
# 1. Crear y activar un entorno virtual de Python 3.7
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS

# 2. Instalar dependencias
pip install tensorflow==2.x keras pillow numpy scikit-learn matplotlib seaborn pandas

# 3. Preparar el dataset (ver sección Dataset más arriba)

# 4. Abrir y ejecutar el notebook de entrenamiento
jupyter notebook LimpIA_ModeloCNN/LimpIA_ModeloCNN.ipynb
```

---

## Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Entrenamiento del modelo | Python 3.7, TensorFlow/Keras |
| Procesamiento de datos | Pillow, NumPy, scikit-learn |
| Visualización | Matplotlib, Seaborn, pandas |
| Despliegue en navegador | TensorFlow.js 3.19.0 |
| Extensión de navegador | Mozilla Firefox WebExtension API (Manifest v2) |
| Formato del modelo | Keras `.h5` → formato TF.js layers |

---

## Autor

**Cosme Morillo Juliá**  
Grado en Ingeniería Informática  
Curso académico 2024–2025

[![GitHub](https://img.shields.io/badge/GitHub-cosmemorillojulia-181717?style=flat&logo=github)](https://github.com/cosmemorillojulia)

---

## Licencia

El código fuente de este proyecto se publica bajo la [Licencia MIT](LICENSE).  
El dataset tiene su propia licencia independiente — consulta la sección [Licencia del Dataset](#dataset) más arriba.
