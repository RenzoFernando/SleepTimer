<p align="center">
  <a href="https://renzofernando.github.io/SleepTimer/" target="_blank">
    <img src="https://img.shields.io/badge/Ver_Aplicación-Online-30b6c4?style=for-the-badge&logo=clock&logoColor=white" alt="Ver Aplicación Online">
  </a>
</p>

# **SleepTimer**

Una calculadora de ciclos de sueño de doble propósito, diseñada para ayudarte a despertar en el momento justo y planificar tu noche a la perfección, evitando la inercia del sueño y la sensación de cansancio.

## **Características Principales**

* **Doble Funcionalidad:**
    * **Calculadora de Despertar:** Te dice a qué hora debes despertar si te duermes ahora.
    * **Calculadora de Dormir:** Te dice a qué hora debes ir a dormir para despertar a la hora que necesitas.
* **Cálculo Preciso:** Evita la inercia del sueño al programar tus alarmas basándose en ciclos de 90 minutos.
* **Tiempo para Dormir Ajustable:** Configura el tiempo que estimas que tardarás en conciliar el sueño (de 0 a 60 minutos) para obtener cálculos perfectos en ambas calculadoras.
* **Planificación a Futuro:**
    * En la calculadora de despertar, puedes elegir una hora de inicio diferente a la actual.
    * En la calculadora de dormir, puedes seleccionar cualquier fecha y hora futuras para tu alarma.
* **Preferencias Guardadas:** La aplicación recuerda tus configuraciones (minutos para dormir y hora de despertar) para una experiencia más rápida.
* **Información Detallada de Ciclos:** La calculadora de despertar incluye un botón de información que explica los beneficios de cada ciclo de sueño.
* **Diseño Inmersivo y Animado:** Una interfaz oscura y minimalista con animaciones fluidas y un borde de aurora en las tarjetas de resultados, diseñada para ser usada de noche sin causar fatiga visual.
* **Totalmente Responsivo:** Funciona perfectamente en computadoras de escritorio y dispositivos móviles.

## **Tecnologías Utilizadas**

* **HTML5:** Para la estructura semántica del contenido.
* **CSS3:** Para el diseño, las animaciones y el tema oscuro.
    * **Tailwind CSS:** Utilizado como base para un desarrollo rápido y responsivo.
* **JavaScript (Puro):** Para toda la lógica de la aplicación, cálculos de tiempo, animaciones y manipulación del DOM. Sin frameworks ni librerías externas.

## **Estructura del Proyecto**

El proyecto está organizado de manera limpia para soportar su doble funcionalidad.

```
SleepTimer/
│
├── extras/
│   ├── style.css   (Estilos compartidos)
│   ├── script.js   (Lógica para 'Hora de Despertar')
│   └── wakeup.js   (Lógica para 'Hora de Dormir')
│
├── index.html      (Página 'Hora de Despertar')
└── wakeup.html     (Página 'Hora de Dormir')
```

## **Autor**

* **Renzo Fernando Mosquera Daza**

*Este proyecto fue creado con el objetivo de mejorar la calidad del descanso a través de una herramienta funcional, precisa y agradable de usar.*
