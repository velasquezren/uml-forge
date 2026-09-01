# 0013. Rotacion de refresh tokens y persistencia binaria de YDocState

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

La autenticacion y la colaboracion en tiempo real requieren dos garantias
fundamentales de seguridad y consistencia:

1. **Seguridad de tokens**: Los access tokens deben ser de corta duracion (15 min)
   para minimizar riesgos de exposicion. Los refresh tokens (7 dias) deben estar
   protegidos contra robo e interceptacion.
2. **Consistencia de CRDT (Yjs)**: Persistir el documento colaborativo Yjs como
   JSON destruye la estructura interna de reloj logico de Lamport y los bloques
   de fusion, duplicando elementos o perdiendo cambios concurrentes al reconectar.

## Decision

1. **Estrategia de Refresh Tokens con Rotacion y Deteccion de Robo**:
   - Cada inicio de sesion crea un `familyId`.
   - Cada refresh token se hashea con **argon2id** antes de almacenarse en la base
     de datos (tabla `refresh_tokens`). Nunca se almacena en texto plano.
   - Al renovar, el token consumido se marca como `isRevoked: true` y se emite uno
     nuevo perteneciente a la misma familia.
   - Si se detecta un intento de reutilizar un token ya revocado (senal de ataque
     o robo), se invalidan inmediatamente todos los tokens de esa familia (`familyId`).
   - El refresh token viaja exclusivamente en cookies `httpOnly`, `sameSite: lax`.

2. **Persistencia binaria de YDocState**:
   - La columna `YDocState.state` se define de tipo `Bytes` en PostgreSQL.
   - Se almacena el resultado de `Y.encodeStateAsUpdate(doc)` como binario.

## Consecuencias

- Prevencion total de suplantacion mediante tokens interceptados.
- Preservacion integra de la capacidad de fusion y convergencia matematica de Yjs.
