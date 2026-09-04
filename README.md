# Phoenix · juego offline
## Abrir y jugar
La opción más sencilla es abrir **Phoenix.html** con doble clic: es un archivo autónomo con todos los gráficos, estilos, sonido y código incluidos. Funciona sin conexión y no necesita instalación ni servidor.

También puedes abrir **index.html**, conservando core.js, render.js, audio.js, game.js y styles.css en la misma carpeta. No se usan módulos JavaScript, solicitudes de red, CDN, fuentes externas ni ROMs. Los enlaces de documentación son opcionales: no intervienen en el juego.

## Controles
- **Enter / Jugar**: empezar; con la partida pausada, Enter reanuda.
- **← → o A/D**: movimiento horizontal.
- **Espacio**: disparar. Puedes mantenerlo pulsado (ayuda moderna).
- **Z o ↓**: escudo durante 1,4 s. Inmoviliza, permite disparar y destruye aves al contacto. Después recarga durante cinco segundos.
- **P / Escape**: pausar o reanudar. Al cambiar de ventana se pausa y se sueltan las teclas.
- **M**: silencio. Volumen y parada de efectos disponibles en el panel.
- Controles táctiles visibles en móviles/tabletas. Pantalla completa opcional.

Tres vidas iniciales. Bonificaciones a 3.000 y 30.000 puntos. El escudo, la invulnerabilidad de reaparición y sus indicadores se muestran por separado. Práctica permite escoger fase y no guarda récords.

## Juego reconstruido
Cinco fases por ronda: dos oleadas de 16 aves pequeñas, ocho Phoenix azules, ocho rosas y la fortaleza. Las aves grandes pierden alas con impactos laterales y las regeneran; el centro es vulnerable. En la fortaleza se perforan capas de blindaje y un cinturón móvil antes de acertar a la criatura. Tras destruirla se repite la ronda con mayor dificultad; no hay un final de victoria inventado.

La superficie lógica es 208×256 y se presenta a 3:4. Todos los sprites y la fuente se dibujan en píxeles enteros. Se ha retirado la decoración de neón de la versión anterior.

## Fidelidad y límites
Recreación independiente orientada a Phoenix Amstar/Centuri 1980; **no es emulación ni una copia exacta**. Reglas, composición y paleta se han contrastado con el manual y capturas. Movimiento enemigo, patrones, puntuaciones contextuales y sonidos son aproximados. El proyectil del jugador avanza 8 píxeles por actualización, según el desensamblado histórico. Está limitado a uno en pantalla, salvo dos en la segunda fase, sin una espera artificial adicional tras un impacto. En nuestra geometría, un disparo fallido permite el siguiente a los 24 pasos (0,393216 s); antes tardaba unos 0,79 s. Mantener el botón es una ayuda moderna: en la segunda fase puede llenar los dos huecos en pasos consecutivos. Las coordenadas y el manejo de la entrada no son una reproducción exacta de la ROM. No se reproducen modo alternado de dos jugadores ni exploits de la ROM.

El sonido usa síntesis local de pulsos modulados y ruido de registro, con una breve introducción melódica. **No se ha realizado escucha comparativa** con una placa/grabación original, ni calibración analógica de sus circuitos. Volumen inicial moderado; sin destellos de pantalla completa. Los efectos de impacto son pequeños y localizados.

Consulta **REFERENCIAS.md** para fuentes, decisiones y diferencias. Ni las capturas de investigación ni la versión anterior se distribuyen.

## Verificación realmente realizada
### Pruebas reproducibles de lógica y señal
Con Node instalado, opcionalmente ejecuta desde esta carpeta:

```text
node test.cjs
```

20 grupos de pruebas pasan: estructura de fases, movimiento y límites, escudo y recarga, cadencia, desplazamiento de 8 píxeles por paso, rearme tras fallo e impacto cercano, colisiones barridas, puntuación, eclosión, alas y regeneración, blindaje/cinturón/criatura, fin de fase, muerte/reaparición/reinicio, pausa y recuperación de tiempos largos, bonificaciones y aislamiento de práctica.

Se han simulado **25 minutos reproducibles** (cinco inicios de cinco minutos). El controlador de estrés usa invulnerabilidad explícita: prueba estabilidad y avance, no dificultad humana. Con la cadencia corregida, cada ejecución alcanzó la ronda 7. No se detectaron posiciones no finitas ni acumulaciones de entidades. Presentaciones a 30, 60 y 144 Hz producen el mismo estado simulado.

Audio probado a 44,1 y 48 kHz: señal no vacía, finita, acotada y reproducible; prioridad de voces, final, silencio y parada con contexto simulado. Esto no demuestra fidelidad perceptiva.

### Comprobaciones en navegador
Se han observado título, primera oleada, Phoenix azules y fortaleza; activación del audio por gesto, disparo/erosión de blindaje, escudo visible, pausa y botón de silencio. No aparecieron errores ni avisos en la consola durante esas comprobaciones. El acceso de la herramienta a archivos file:// está restringido: la inspección visual se hizo en la vista local ya abierta, no se afirma haber automatizado un doble clic offline. Se verificó por separado que el archivo autónomo no tiene recursos externos y que la versión de scripts clásicos arranca con almacenamiento y audio no disponibles.

Muerte, reinicio, transiciones completas y frecuencia de presentación están probados en simulación, no se presentan como una partida humana completa.
