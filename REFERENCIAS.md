# Phoenix · reconstrucción offline
## Contrato de referencia — registrado antes de implementar
Referencia: Phoenix arcade Amstar/Centuri (1980). Recreación independiente, no emulación.

| Elemento | Fuente / observación | Implementación prevista | Confianza / diferencias |
|---|---|---|---|
| Pantalla | MAME phoenix.h: 256×208 antes de rotación; 5,5 MHz / 352 / 256 | 208×256, presentación 3:4, paso 61,03515625 Hz | Alta en resolución/cadencia; proporción CRT aproximada |
| Composición | Captura The King of Grabs: SCORE1 / HI-SCORE / SCORE2, cifras rojas, nave roja/blanca, fondo negro y estrellas azules | Dibujo de píxeles enteros y fuente bitmap local | Sprites redibujados; no se extraen ROMs |
| Rondas | Manual Centuri pp. 3–4: pequeñas, pequeñas, grandes azules, grandes rosas, fortaleza | Cinco fases, dificultad creciente tras fortaleza | Estructura alta; trayectorias y velocidad aproximadas |
| Alas | Manual p. 3: centro letal, alas destruibles y regenerables | Colisión por tres zonas | Regeneración temporizada aproximada |
| Disparo del jugador | Desensamblado: L0964 resta 8 a Y; L0930 reutiliza el hueco libre sin temporizador adicional; L08A0 habilita un segundo proyectil en la segunda fase | 8 píxeles por paso fijo; uno o dos huecos; eliminado el retraso artificial de 0,2 / 0,13 s | Alta en desplazamiento y huecos; entrada mantenida y coordenadas son adaptación. El intervalo de fallo de 0,393216 s se mide en esta recreación, no en una ROM ejecutada |
| Fortaleza | Manual y captura: barrera que se perfora, criatura y escoltas | Blindaje por celdas y cinturón móvil perforable | Geometría y tiempos independientes |
| Escudo | Manual: protección, contacto destructivo y recarga posterior ~5 s; otras descripciones distinguen inmovilidad y disparo permitido | Inmoviliza, permite disparar, destruye aves al contacto | Duración activa ajustada |
| Audio | MAME phoenix_a.cpp: dos familias de efectos de pulsos/divisores, ruido de registro y mezcla mono; melodías separadas | Síntesis local, voces compartidas y eventos cancelables | No emula componentes ni se ha hecho escucha comparativa |

## Fuentes inspeccionadas
- [Manual Centuri](https://www.thedefenderproject.com/wp-content/uploads/2013/03/Phoenix-manual_text.pdf), páginas impresas 3, 4 y 6.
- [Capturas arcade](https://thekingofgrabs.com/2018/10/02/phoenix-arcade/): imagen compuesta de título y fortaleza vista; no se ha reproducido vídeo.
- [Temporización MAME](https://github.com/mamedev/mame/blob/master/src/mame/phoenix/phoenix.h).
- [Desensamblado histórico de Phoenix](https://computerarcheology.com/Arcade/Phoenix/Code.html): PlayerUpdate, L08A0, L0930 y L0964; consultado para la corrección de cadencia. No se incorpora código de la ROM.
- [Sonido MAME](https://github.com/mamedev/mame/blob/master/src/mame/phoenix/phoenix_a.cpp), documentación consultada, código no incorporado.
- [Descripción de controles](https://www.mobygames.com/game/8987/phoenix/): escudo inmóvil, disparo permitido.

## Diferencias conocidas
Sprites, movimiento, comportamiento de disparo y sonido se aproximan: no hay exactitud de ROM ni reproducción de sus exploits. Sin modo alternado de dos jugadores. Práctica es una ayuda moderna y no guarda récords. Disparo mantenido, controles táctiles, pausa y volumen son ayudas externas. No se incluyen capturas ni grabaciones ajenas.

## Eventos sonoros de esta implementación (parámetros aproximados)
| Evento | Familia / duración | Prioridad y coexistencia |
|---|---|---|
| Disparo | Ruido con barrido y pulso, 0,23 s | Canal ruido, prioridad 1 |
| Vuelo | Pulso modulado descendente, 0,42 s | Canal efecto 2, prioridad 1 |
| Ala / impacto | Pulsos y ruido filtrado, 0,19 / 0,28 s | Canal efecto 2, prioridades 2 / 3 |
| Eclosión / escudo | Pulsos modulados, 0,7 / 1,4 s | Canal efecto 1, prioridades 1 / 3 |
| Blindaje / muerte / fortaleza | Ruido, 0,12 / 0,75 / 1,8 s | Canal ruido, prioridades 2 / 5 / 6 |
| Introducción / fin de fase / bonus | Melodía sintetizada, 2,15 / 0,5 / 0,65 s | Canal melódico separado, prioridades 1 / 1 / 2 |

No hay cola: la prioridad inferior se descarta y la igual o superior reemplaza la voz compartida. Los canales distintos se mezclan en mono. Esta política es una simplificación explícita, no una afirmación de arbitraje exacto del hardware. Pausa/reinicio/parada cancelan fuentes; cada fuente terminada se desconecta. El fin natural no se confunde con la expiración de su prioridad. La pequeña introducción usa una frase de Für Elise sintetizada, sin grabación externa; no es una transcripción temporizada de la ROM.
