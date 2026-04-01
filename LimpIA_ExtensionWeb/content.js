(async function () {
  console.log("🔄️ Iniciando análisis...");

  // CARGAR MODELO DE IA
  const modelURL = browser.runtime.getURL("model/model.json");
  let model = await tf.loadLayersModel(modelURL);

  console.log("🧠 Modelo de IA cargado...");
  
  // VARIABLES DE ESTADO
  let blurredCount = 0;
  let analyzedCount = 0;
  let protectedCount = 0;
  let showPercentage = false;
  let analyzedSet = new WeakSet();
  
  // FUNCIÓN PARA LIMPIAR MEMORIA COMPLETAMENTE
  async function cleanupMemory() {
    console.warn("🧹 Limpiando memoria TensorFlow - Tensores en memoria:", tf.memory().numTensors);
    
    // Dispose de todas las variables del engine
    tf.engine().disposeVariables();
    
    // Dispose de todos los tensors
    tf.disposeVariables();
    
    // Forzar garbage collection si está disponible
    if (tf.engine().backend && tf.engine().backend.dispose) {
      tf.engine().backend.dispose();
    }
    
    // Recargar el modelo
    try {
      model.dispose();
    } catch (e) {
      console.warn("⚠️ Error al dispose del modelo anterior:", e);
    }
    
    model = await tf.loadLayersModel(modelURL);
    console.log("✅ Memoria limpiada y modelo recargado. Tensores actuales:", tf.memory().numTensors);
  }
  
  // OBSERVADOR DE MUTACIONES
  function observeImage(img) {
    if (analyzedSet.has(img)) return;
    if (img.naturalWidth === 0) {
      img.addEventListener('load', () => {
        if (!analyzedSet.has(img)) analyzeImage(img);
      }, { once: true });
    } else {
      analyzeImage(img);
    }
  }
  
  const mutationObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.tagName === "IMG") observeImage(node);
        else node.querySelectorAll("img").forEach(observeImage);
      });
      // Detectar cambios en atributos como src
      if (mutation.type === "attributes" &&
          mutation.target.tagName === "IMG" &&
          mutation.attributeName === "src") {
        observeImage(mutation.target);
      }
    }
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"]
  });
  
  // ANALISIS DE IMAGENES
  async function analyzeImage(img) {
    if (!img || !img.src || img.naturalWidth === 0 || analyzedSet.has(img)) return;
    
    analyzedSet.add(img);

    // Límite de tensores
    let maxTensors = 500; 
    
    // VERIFICAR MEMORIA ANTES DE PROCESAR
    const memoryInfo = tf.memory();
    if (memoryInfo.numTensors > maxTensors) {
      console.warn(`⚠️ Límite de tensores alcanzado: ${memoryInfo.numTensors}/${maxTensors}. Iniciando limpieza...`);
      await cleanupMemory();
      // Esperar un poco para que la limpieza se complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // INGNORAR IMAGENES PROTEGIDAS POR CORS
    const ignoredSources = [
      "gstatic.com",
      "googleusercontent.com",
      "encrypted-tbn0.gstatic.com",
      "fonts.gstatic.com",
      "faviconV2?"
    ];
    
    if (ignoredSources.some(domain => img.src.includes(domain))) {
      console.warn("🔁 Imagen ignorada por protección CORS:", img.src);
      protectedCount++;
      overlayPrivacidad(img);
      return;
    }
    
    let tensor;
    let prediction;
    
    try {
      tensor = preprocessImage(img);
      if (!tensor) {
        console.warn("❌ Tensor nulo — imagen no analizada:", img.src);
        protectedCount++;
        overlayError(img);
        return;
      }
      
      // Hacer predicción dentro de tf.tidy para mejor gestión de memoria
      let score;
      await tf.tidy(() => {
        prediction = model.predict(tensor);
        return prediction;
      });
      
      const data = await prediction.data();
      console.log(`✨Predicción obtenida:${data}`);

      score = data[0];
      console.log(`✅ Imagen analizada: - Score: ${score.toFixed(2)}`);
      console.log("Estado memoria:", tf.memory());
      
      analyzedCount++;
      if (score > 0.50) {
        img.style.filter = "blur(10px)";
        blurredCount++;
      }
      
      overlayScore(img, score);
      await browser.storage.local.set({ analyzedCount, blurredCount, protectedCount });
      
    } catch (e) {
      console.warn("❌ Fallo al procesar imagen:", e);
    } finally {
      // Limpieza explícita de tensores
      if (prediction) {
        prediction.dispose();
      }
      if (tensor) {
        tensor.dispose();
      }
    }
  }
  
  function preprocessImage(img, width = 128, height = 128) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    // 🔹 Paso 1: intentar dibujar la imagen
    try {
      ctx.drawImage(img, 0, 0, width, height);
    } catch (err) {
      console.warn("❌ drawImage falló. Imagen protegida por CORS o recurso no disponible:", img.src);
      return null;
    }
    
    // 🔹 Paso 2: intentar extraer el ImageData del canvas
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, width, height);
    } catch (err) {
      console.warn("⚠️ getImageData falló. Canvas posiblemente contaminado (tainted):", img.src);
      return null;
    }
    
    // 🔹 Paso 3: validar ImageData
    if (!imageData || !imageData.data || imageData.data.length === 0) {
      console.warn("🚫 ImageData vacío o corrupto:", img.src);
      return null;
    }
    
    // 🔹 Paso 4: crear tensor desde los datos del canvas usando tf.tidy
    try {
      return tf.tidy(() => {
        const imgTensor = tf.browser.fromPixels(imageData)
          .toFloat()
          .expandDims(0)
          .div(tf.scalar(255.0));
        
        const mean = imgTensor.mean().dataSync()[0];
        if (mean < 0.01) { // casi todo negro
          console.warn("🔍 Imagen con contenido plano o vacío (media muy baja):", img.src);
          return null;
        }
        
        return imgTensor;
      });
    } catch (e) {
      console.warn("💥 Error al convertir imagen a tensor (fromPixels falló):", e.message);
      return null;
    }
  }
  
  function overlayScore(img, score) {
    if (!showPercentage) return;

    const parent = img.parentElement;
    if (!parent) return;

    const computedStyle = window.getComputedStyle(parent);
    if (computedStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    // Crear overlay
    const overlay = document.createElement("div");
    overlay.textContent = `${Math.round(score * 100)}%`;

    Object.assign(overlay.style, {
      position: "absolute",
      top: "8px",
      left: "8px",
      background: "rgba(255, 255, 255, 0.7)",
      color: "black",
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: "500",
      fontFamily: "Segoe UI, Roboto, sans-serif",
      boxShadow: "0 2px 6px rgba(123, 123, 123, 0.3)",
      zIndex: "9999",
      pointerEvents: "none",
      userSelect: "none"
    });

    overlay.title = "Limp.IA";

    parent.appendChild(overlay);

    console.log(`🆗 Imagen puntuada ${img.src}`);
  }
  
  function overlayError(img) {
    // Asegurar que el padre sea relativo para que el overlay se posicione correctamente
    const parent = img.parentElement;
    if (!parent) return;

    const computedStyle = window.getComputedStyle(parent);
    if (computedStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    // Crear overlay
    const overlay = document.createElement("div");
    overlay.textContent = "❗";
    Object.assign(overlay.style, {
      position: "absolute",
      top: "5px",
      left: "5px",
      background: "rgba(255, 255, 255, 0.8)",
      color: "white",
      padding: "2px 2px",
      borderRadius: "10px",
      fontSize: "14px",
      zIndex: "9999",
      pointerEvents: "none",
      userSelect: "none"
    });

    overlay.title = "Fallo procesando imagen";

    parent.appendChild(overlay);

    console.warn(`❗ Imagen no analizada: ${img.src}`);
  }

  function overlayPrivacidad(img) {
    // Asegurar que el padre sea relativo para que el overlay se posicione correctamente
    const parent = img.parentElement;
    if (!parent) return;

    const computedStyle = window.getComputedStyle(parent);
    if (computedStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    // Crear overlay
    const overlay = document.createElement("div");
    overlay.textContent = "🚫";
    Object.assign(overlay.style, {
      position: "absolute",
      top: "5px",
      left: "5px",
      background: "rgba(230, 0, 0, 0.8)",
      color: "white",
      padding: "2px 2px",
      borderRadius: "10px",
      fontSize: "14px",
      zIndex: "9999",
      pointerEvents: "none", 
      userSelect: "none"
    });
    overlay.title = "Protegido por privacidad";
    parent.appendChild(overlay);
    console.warn(`🔒 Imagen protegida por CORS: ${img.src}`);
  }
  
  // ON-OFF DE LA EXTENSION
  let observerEnabled = true;
  
  browser.runtime.onMessage.addListener(async (message) => {
    if (message.action === 'disable') {
      console.log("⛔ Extensión desactivada por el usuario.");
      observerEnabled = false;
      mutationObserver.disconnect();
      clearAllModifications();
      blurredCount = 0;
      analyzedCount = 0;
      protectedCount = 0;
      await browser.storage.local.set({ analyzedCount: 0, blurredCount: 0, protectedCount: 0 });
    } else if (message.action === 'enable') {
      console.log("✅ Extensión reactivada por el usuario.");
      observerEnabled = true;
      analyzedSet = new WeakSet();
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"]
      });
      const imgs = Array.from(document.images);
      for (const img of imgs) {
        if (!analyzedSet.has(img) && img.naturalWidth > 0) {
          analyzeImage(img);
        }
      }
    } else if (message.action === 'setShowPercentage') {
      console.log(`🔁 Mostrar porcentaje: ${message.showPercentage}`);
      showPercentage = message.showPercentage;
    } 
    
  });
  
  function clearAllModifications() {
    const allImgs = document.querySelectorAll('img');
    allImgs.forEach(img => {
      img.style.filter = "";
      const parent = img.parentElement;
      // Verifica si el padre es un wrapper insertado por la extensión
      if (parent?.style.position === "relative" && parent.contains(img)) {
        const overlays = parent.querySelectorAll("div");
        let hasOverlay = false;
        overlays.forEach(overlay => {
          if (
            overlay.textContent?.includes('%') ||
            overlay.textContent?.includes('❗')||
            overlay.textContent?.includes('🚫')
          ) {
            hasOverlay = true;
          }
        });
        if (hasOverlay) {
          parent.replaceWith(img); // elimina el wrapper completo
        }
      }
    });
  }
  
  // INICIAR OBSERVACION DE IMAGENES EXISTENTES
  const initialImages = Array.from(document.images).filter(img => img.naturalWidth > 0);
  for (const img of initialImages) {
    await analyzeImage(img);
  }

  // Cargar estado de show Percentage
  const { showPercentage: storedShowPercentage = false } = await browser.storage.local.get('showPercentage');
  showPercentage = storedShowPercentage;
      
})();