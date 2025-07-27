# **SleepTimer**

Una calculadora de ciclos de sueño diseñada para un único propósito: ayudarte a despertar en el momento justo entre ciclos de sueño, evitando la sensación de cansancio y aturdimiento durante el día.

La aplicación calcula las horas óptimas para programar tu alarma basándose en ciclos de sueño de 90 minutos.

## **Características Principales**

- **Cálculo Basado en Ciclos:** El núcleo de la aplicación es evitar la inercia del sueño al programar tu alarma para que suene al final de un ciclo de 90 minutos.
- **Detección Automática:** Utiliza la hora actual de tu dispositivo para mostrarte al instante las horas de despertar recomendadas.
- **Planificación a Futuro:** ¿No te vas a dormir ahora? Usa el selector de hora para calcular los ciclos desde cualquier momento que elijas.
- **Tiempo para Dormir Ajustable:** Puedes configurar el tiempo que estimas que tardarás en conciliar el sueño para obtener cálculos aún más precisos.
- **Clasificación Visual Clara:** La aplicación organiza los resultados en tres niveles para que puedas tomar una decisión informada sobre tu descanso:
  - **Sueño Ligero (Ciclos 1-3):** Recomendado solo para siestas cortas. Despertar aquí podría interrumpir fases importantes del descanso.
  - **Descanso Aceptable (Ciclos 4-5):** Una cantidad de sueño adecuada para funcionar bien al día siguiente.
  - **Descanso Óptimo (Ciclos 6+):** El ideal para despertar sintiéndote completamente renovado, con la máxima energía y claridad mental.
- **Diseño Enfocado:** Una interfaz oscura y minimalista, diseñada para ser usada de noche sin causar fatiga visual.
- **Totalmente Responsivo:** Funciona perfectamente en computadoras de escritorio y dispositivos móviles.

## **Tecnologías Utilizadas**

- **HTML5:** Para la estructura semántica del contenido.
- **CSS3:** Para el diseño, las animaciones y el tema oscuro.
  - **Tailwind CSS:** Utilizado como base para un desarrollo rápido y responsivo.
- **JavaScript (Puro):** Para toda la lógica de la aplicación, cálculos de tiempo y manipulación del DOM. Sin frameworks ni librerías externas.

## **Estructura del Proyecto**

El proyecto está organizado de manera limpia y sencilla para facilitar su mantenimiento.

```
SleepTimer/  
│  
├── extras/  
│ ├── style.css # Estilos personalizados y animaciones  
│ └── script.js # Lógica de la aplicación  
│  
└── index.html # Archivo principal de la aplicación  
```

## **Autor**

- **Renzo Fernando Mosquera Daza**

_Este proyecto fue creado con el objetivo de mejorar la calidad del descanso a través de una herramienta funcional y precisa._
