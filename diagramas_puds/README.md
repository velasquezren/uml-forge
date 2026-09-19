# Catálogo de Diagramas de Ingeniería de Software (PUDS) - UML Forge
## Estándar Oficial Sparx Enterprise Architect (EA)

Este directorio contiene la totalidad de los diagramas requeridos por la metodología **PUDS** (Proceso Unificado de Desarrollo de Software / RUP) para la plataforma **UML Forge**, diseñados rigurosamente bajo el estándar visual y formal de **Sparx Enterprise Architect (EA)**.

### Características del Estándar Visual EA Implementado:
- **Encabezado y Metadatos EA:** Bloque oficial en la esquina superior izquierda con tipo de diagrama (`usecase`, `class`, `database`, `communication`, `component`, `deployment`), nombre del paquete, autor, fecha, versión y estado (`Approved`).
- **Cero Sobreposición de Elementos:** Márgenes y anchos calculados dinámicamente según el contenido textual de clases, atributos, operaciones y notas.
- **Ruteo Ortogonal Limpio:** Conectores con ángulos de 90°, canales de tránsito despejados y cajas de fondo blanco (`pill labels`) en cada etiqueta para garantizar que ninguna línea corte el texto.
- **Formas UML Nativas EA:**
  - Casos de uso en óvalos de tono azul hielo (`#EBF4FA`) con borde azul EA (`#2980B9`).
  - Clases en cajas de 3 compartimentos con cabeceras en marfil (`#FFFFE8`) o azul lógico (`#EBF4FA`).
  - Rombos de composición rellenos (`ea-composition`) y agregación (`ea-aggregation`).
  - Diagramas de comunicación con cabecera de objeto subrayada formalmente `<u>instancia : Clase</u>` y mensajes numerados vectoriales.
  - Diagramas de despliegue con nodos 3D isométricos (cuboides).
  - Notas de diseño amarillas con esquina plegada (`ea-note`).

---

## Índice Completo de Diagramas Generados

| # | Código PUDS | Nombre del Diagrama | Tipo EA | Resolución 2x | Archivo PNG | Archivo SVG |
|---|---|---|---|---|---|---|
| **01** | `PUDS_CU_01` | **Diagrama General de Casos de Uso del Sistema** | `usecase` | 2604 × 1724 | [`png/01_casos_de_uso_general.png`](png/01_casos_de_uso_general.png) | [`svg/01_casos_de_uso_general.svg`](svg/01_casos_de_uso_general.svg) |
| **02** | `PUDS_CU_02` | **Diagrama de Casos de Uso: Seguridad y Acceso** | `usecase` | 2364 × 1524 | [`png/02_casos_de_uso_seguridad.png`](png/02_casos_de_uso_seguridad.png) | [`svg/02_casos_de_uso_seguridad.svg`](svg/02_casos_de_uso_seguridad.svg) |
| **03** | `PUDS_CU_03` | **Diagrama de Casos de Uso: Modelado y Metamodelo** | `usecase` | 2364 × 1524 | [`png/03_casos_de_uso_modelado.png`](png/03_casos_de_uso_modelado.png) | [`svg/03_casos_de_uso_modelado.svg`](svg/03_casos_de_uso_modelado.svg) |
| **04** | `PUDS_CU_04` | **Diagrama de Casos de Uso: Generación e Interoperabilidad** | `usecase` | 2404 × 1524 | [`png/04_casos_de_uso_codegen_xmi.png`](png/04_casos_de_uso_codegen_xmi.png) | [`svg/04_casos_de_uso_codegen_xmi.svg`](svg/04_casos_de_uso_codegen_xmi.svg) |
| **05** | `PUDS_CU_05` | **Diagrama de Casos de Uso: Colaboración y Resiliencia** | `usecase` | 2444 × 1564 | [`png/05_casos_de_uso_colaboracion_offline.png`](png/05_casos_de_uso_colaboracion_offline.png) | [`svg/05_casos_de_uso_colaboracion_offline.svg`](svg/05_casos_de_uso_colaboracion_offline.svg) |
| **06** | `PUDS_MDD_01` | **Diagrama de Datos y Dominio del Sistema (General)** | `class` | 3464 × 2724 | [`png/06_diagrama_de_datos_dominio.png`](png/06_diagrama_de_datos_dominio.png) | [`svg/06_diagrama_de_datos_dominio.svg`](svg/06_diagrama_de_datos_dominio.svg) |
| **06a**| `PUDS_MDF_01` | **Diagrama de Datos: Base de Datos Relacional PostgreSQL 16** | `database` | 3004 × 1604 | [`png/06a_diagrama_datos_relacional.png`](png/06a_diagrama_datos_relacional.png) | [`svg/06a_diagrama_datos_relacional.svg`](svg/06a_diagrama_datos_relacional.svg) |
| **06b**| `PUDS_METAMODEL_01` | **Diagrama de Clases: Metamodelo UML 2.5 Inmutable** | `class` | 3324 × 1964 | [`png/06b_diagrama_clases_metamodelo.png`](png/06b_diagrama_clases_metamodelo.png) | [`svg/06b_diagrama_clases_metamodelo.svg`](svg/06b_diagrama_clases_metamodelo.svg) |
| **07** | `PUDS_COM_01` | **Diagrama de Comunicación: Autenticación y Token Exchange** | `communication` | 2722 × 1684 | [`png/07_diagrama_comunicacion_autenticacion.png`](png/07_diagrama_comunicacion_autenticacion.png) | [`svg/07_diagrama_comunicacion_autenticacion.svg`](svg/07_diagrama_comunicacion_autenticacion.svg) |
| **08** | `PUDS_COM_02` | **Diagrama de Comunicación: Sincronización CRDT WebSocket** | `communication` | 2722 × 1684 | [`png/08_diagrama_comunicacion_colaboracion_crdt.png`](png/08_diagrama_comunicacion_colaboracion_crdt.png) | [`svg/08_diagrama_comunicacion_colaboracion_crdt.svg`](svg/08_diagrama_comunicacion_colaboracion_crdt.svg) |
| **09** | `PUDS_COM_03` | **Diagrama de Comunicación: Síntesis Spring Boot 3 y XMI** | `communication` | 2722 × 1684 | [`png/09_diagrama_comunicacion_generacion_backend.png`](png/09_diagrama_comunicacion_generacion_backend.png) | [`svg/09_diagrama_comunicacion_generacion_backend.svg`](svg/09_diagrama_comunicacion_generacion_backend.svg) |
| **10** | `PUDS_ARQ_01` | **Diagrama de Arquitectura y Componentes de Software** | `component` | 2724 × 1844 | [`png/10_diagrama_arquitectura_componentes.png`](png/10_diagrama_arquitectura_componentes.png) | [`svg/10_diagrama_arquitectura_componentes.svg`](svg/10_diagrama_arquitectura_componentes.svg) |
| **11** | `PUDS_DEP_01` | **Diagrama de Despliegue Físico en Contenedores Docker** | `deployment` | 2724 × 1724 | [`png/11_diagrama_despliegue_docker.png`](png/11_diagrama_despliegue_docker.png) | [`svg/11_diagrama_despliegue_docker.svg`](svg/11_diagrama_despliegue_docker.svg) |

---

### Scripts de Regeneración Automatizada:
- **Parte 1 (Casos de Uso 01 a 05):** `python3 scratch/generate_ea_part1.py`
- **Parte 2 (Datos y Clases 06, 06a, 06b):** `python3 scratch/generate_ea_part2.py`
- **Parte 3 (Comunicación y Arquitectura 07 a 11):** `python3 scratch/generate_ea_part3.py`
- **Librería de Primitivas EA:** `scratch/ea_helpers.py`
