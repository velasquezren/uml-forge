# 0037. Editor en pantalla dividida

Fecha: 2026-09-27
Estado: Aceptado

## Contexto

Con la ventana a media pantalla (960 px en un monitor de 1920) la paleta
(256 px) y el inspector (288 px) ocupaban mas de la mitad del ancho: el lienzo
quedaba en 416 px, y a 700 px apenas en 160 px, casi todo tapado por el
minimapa. Los botones de la barra superior con texto aplastaban el nombre del
proyecto hasta dejar una sola letra.

Ademas, la clase `bg-sidebar-background` no generaba ningun color: faltaba su
entrada en el bloque `@theme` de Tailwind v4, y los paneles eran transparentes.

## Decision

- Por debajo de 1280 px (`COMPACT_EDITOR_QUERY`) el editor entra en modo
  compacto:
  - la paleta y el inspector arrancan cerrados y, al abrirlos, flotan sobre el
    lienzo en lugar de estrecharlo; solo puede haber uno abierto;
  - el minimapa se oculta;
  - las acciones de la barra superior muestran solo el icono, con su nombre en
    `aria-label`.
- Los interruptores de los paneles pasan a la barra superior (a ambos lados del
  nombre y al final), visibles en cualquier ancho; la barra inferior deja de
  tenerlos y acorta sus textos en pantallas pequennas.
- Al cruzar el umbral redimensionando la ventana, los paneles vuelven al estado
  por defecto del modo nuevo.
- `@theme` declara los colores `sidebar-*`.

## Consecuencias

- En pantalla completa el editor queda como estaba. Las pruebas de navegador se
  ejecutan a 1280 px, en modo ancho.
- En modo compacto, editar una propiedad exige abrir el inspector con su boton:
  se prefiere a abrirlo solo al seleccionar, que taparia el lienzo en cada clic.
