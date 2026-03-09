# CapCalc — Calculadora de Capacitores

Web app para calcular la capacitancia de un capacitor a partir de la corriente.

## Fórmula
```
C (μF) = I (A) ÷ 0.07
```

## Funcionalidades
- Cálculo instantáneo con conversiones a μF, mF, F, nF y pF
- Historial de cálculos (guardado en localStorage)
- Valores rápidos predefinidos
- Tabla de referencia técnica
- Copiar resultado al portapapeles
- Diseño responsive

## Estructura
```
capacitor-app/
├── index.html      # Estructura HTML y layout
├── style.css       # Estilos y animaciones
├── calculator.js   # Lógica de cálculo (sin dependencias del DOM)
└── app.js          # UI, eventos, historial, canvas animado
```

## Publicar en GitHub Pages
1. Subí los archivos a un repositorio público
2. Ir a Settings → Pages → Deploy from branch → main / root
3. Tu app estará en `https://tu-usuario.github.io/nombre-repo`
