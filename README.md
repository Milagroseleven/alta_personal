# Formulario Alta Personal — Gestoría / Holded

Herramienta para dar de alta a un trabajador nuevo de **Sanchoyjote S.L.**
sin rellenar nada dos veces. Hoy el mismo trabajador se carga a mano en dos
sitios distintos, con dos formatos distintos:

1. **Ficha de la gestoría** — el `Modelo Alta Empleado - Gestoría.xlsx`, que
   se envía a la gestoría para que tramite el alta.
2. **Holded** — el fichero `Importar Empleados MM.AAAA.xlsx`, de 26 columnas,
   que se sube al importador.

La herramienta arma las dos a partir de la información que ya existe, y deja
la carpeta del trabajador montada.

## Las dos funciones son independientes

Se ejecutan por separado, una u otra, según haga falta:

| Función | Qué hace |
| --- | --- |
| **Ficha Gestoría** | Genera el Excel con el formato del modelo, crea la carpeta `Apellido, Nombre` y guarda dentro la ficha y el documento de identidad. |
| **Alta en Holded** | Da de alta al trabajador en Holded por API. Como alternativa, genera la fila del importador de 26 columnas. |

Un trabajador puede pasar por las dos, por una sola, o por la misma dos veces
(regenerar la ficha si llega un dato corregido).

## De dónde salen los datos

| Fuente | Qué aporta |
| --- | --- |
| Sheet `Datos de contacto (respuestas)` | Todos los datos personales, y el enlace al documento de identidad que sube el propio trabajador. Es la fuente principal. |
| Solicitudes del jefe por WhatsApp (texto, imágenes, documento de identidad) | Los datos del contrato, que ningún formulario pregunta. Entran a mano. |

Ninguna de las dos está completa por sí sola, así que la herramienta precarga
lo que encuentra en el Sheet y deja el resto editable antes de generar nada.

El Sheet de respuestas está hecho a imagen del importador de Holded: sus 30
columnas cubren **todos** los campos personales de las dos fichas menos el
teléfono fijo, que el formulario no pregunta y que en Holded se queda vacío.
De sus columnas se quedan sin usar la marca temporal y la de universidad de
procedencia, que no hacen falta en ninguna de las dos fichas.

## Salida 1 — Ficha de la gestoría

Formato exacto del modelo: dos columnas, etiqueta en A y valor en B.

| Fila | Campo | Origen |
| --- | --- | --- |
| 2 | NOMBRE Y APELLIDOS | Sheet |
| 3 | DNI/NIE | Sheet |
| 4 | FECHA DE NACIMIENTO | Sheet |
| 5 | NUMERO DE AFILIACION | Sheet |
| 6 | NIVEL FORMATIVO | Sheet (catálogo cerrado, ver abajo) |
| 7 | NACIONALIDAD | Sheet |
| 9 | Calle y nº | Sheet |
| 10 | Municipio | Sheet |
| 11 | Código Postal | Sheet |
| 12 | Provincia | Sheet |
| 13 | TIPO DE CONTRATO (indefinido o temporal) | Solicitud del jefe |
| 14 | FECHA DE INICIO (alta) | Solicitud del jefe |
| 15 | DURACIÓN DEL CONTRATO (si lo requiere el mismo) | Solicitud del jefe |
| 16 | OCUPACION A DESEMPEÑAR | Solicitud del jefe |
| 17 | HORAS DE JORNADA | Solicitud del jefe |
| 18 | DISTRIBUCIÓN JORNADA | Solicitud del jefe |
| 19 | CENTRO DE TRABAJO (dirección completa) | Catálogo de sedes |
| 20 | SALARIO (si es pactado por encima del convenio) | Solicitud del jefe |
| 21 | OTROS | Libre |

La fila 8 es el encabezado `DIRECCIÓN COMPLETA TRABAJADOR`, combinada A8:B8.

### Catálogo de centros de trabajo

| Sede | Dirección |
| --- | --- |
| Barcelona | Gran Via de les Corts Catalanes, 806, Eixample, 08013 Barcelona |
| Madrid CT | CT - C. Mártires de Paracuellos, 2, Tetuán, 28020 Madrid |
| Móstoles | C. Alfarería, 18, 28933 Móstoles, Madrid |
| Valencia | Av. de Burjassot, 119, Benicalap, 46015 València, Valencia |
| Sevilla | C. Imprenta, 48, 41016 Sevilla |

En la ficha se escribe `Sede - Dirección`, tal como está en el modelo.

### Catálogo de niveles formativos

`1 - Sin estudios`, `2 - Estudios primarios incompletos`,
`3 - Educación primaria completa`, `4 - Educación secundaria obligatoria (ESO)`,
`5 - Bachillerato`, `6 - Formación Profesional de Grado Medio`,
`7 - Formación Profesional de Grado Superior`, `8 - Diplomatura`,
`9 - Licenciatura / Grado universitario`, `10 - Máster universitario`,
`11 - Doctorado`.

## Salida 2 — Holded

Las 26 columnas del importador, en este orden:

`Nombre` · `Apellidos` · `Email` · `Nacionalidad` ·
`Fecha nacimiento (dd/mm/aaaa)` · `Género (1: Hombre, 0: Mujer)` · `Teléfono` ·
`Móvil` · `Número de cuenta bancaria` · `Núm. identificación fiscal` ·
`Número Seguridad Social` · `Dirección` · `Población` · `Código postal` ·
`Provincia` · `País` · `Residencia fiscal (1: Residente, 0: No residente)` ·
`Dirección No residente` · `Población No residente` ·
`Código postal No residente` · `Provincia No residente` · `País No residente` ·
`Núm. identificación fiscal No residente` · `Ciudad de nacimiento` ·
`País de nacimiento` · `Fin de situación no-residente`

Diferencias con la ficha de la gestoría que hay que tener presentes:

- Holded separa **Nombre** y **Apellidos**; la gestoría los quiere juntos.
- La fecha va en **dd/mm/aaaa**.
- Pide datos que la gestoría no pide: email, género, teléfono, móvil, cuenta
  bancaria, ciudad y país de nacimiento.
- El bloque de **No residente** solo se rellena si `Residencia fiscal = 0`.

Aparte del alta del empleado, cada trabajador necesita su **cuenta contable**
(`465000XX — Remuneraciones NOMBRE APELLIDO`). Hoy se carga con un importador
propio de dos columnas.

## Carpeta del trabajador

Se crea una subcarpeta por trabajador, con el nombre `Apellido, Nombre`,
dentro de la carpeta de altas de Drive (`CARPETA_EMPLEADOS_ID`; si se deja
vacía, la herramienta busca o crea una llamada `Alta de personal Gestoría`).

Dentro van **solo dos cosas**:

| Archivo | Nombre |
| --- | --- |
| Ficha de la gestoría | `Alta Empleado - Apellido, Nombre.xlsx` |
| Documento de identidad | `DNI - Apellido, Nombre.<extensión>` |

El documento de identidad **no hay que buscarlo**: el trabajador lo sube al
rellenar su formulario y el Sheet guarda el enlace, así que la herramienta se
copia el archivo sola. Solo hay que adjuntarlo a mano cuando el alta llega por
WhatsApp —y por tanto no hay respuesta del formulario— o cuando el que subió
no se lee.

Si el enlace falla, el alta no se corta: la ficha queda generada igual y el
aviso dice que el documento quedó pendiente.

El contrato, la comunicación del alta y las nóminas llegan después y se
guardan a mano, como hasta ahora.

Regenerar la ficha de alguien **reemplaza** la anterior en vez de dejar dos
archivos casi iguales en la misma carpeta. Y si la carpeta ya existe se
reutiliza: no se crea una segunda para el mismo trabajador.

El nombre de la carpeta se propone con el primer apellido y el primer nombre,
pero **queda editable** en el formulario. Los apellidos compuestos y los
nombres de dos palabras no se pueden adivinar bien, y las carpetas que ya
existen tampoco siguen un patrón único (`Aldana, Yorman` junto a
`Lopez Garcia, Paulo César` y `Simón Ceballos, Eddison`).

## Cómo se usa

1. Elegir al trabajador en el desplegable y pulsar **Traer datos**. Se
   precarga todo lo que el personal rellenó en su formulario. Si esa persona
   nunca lo rellenó —el caso de las altas que llegan por WhatsApp— se deja el
   desplegable en blanco y se escribe a mano.
2. Completar los **datos del contrato**, que ningún formulario pregunta.
3. Adjuntar el documento de identidad.
4. Pulsar la acción que toque. Son tres, independientes entre sí:

| Botón | Qué hace |
| --- | --- |
| **Generar ficha de la gestoría** | Crea la carpeta, genera el Excel con el formato del modelo y guarda el documento de identidad. No toca Holded. |
| **Añadir al lote de Holded** | Deja la fila de 26 columnas en la hoja `Altas Holded`, para exportar el lote del mes y subirlo con el importador. Si el trabajador ya estaba (mismo DNI/NIE), actualiza su fila en vez de duplicarla. |
| **Crear en Holded por API** | Crea al trabajador directamente en Holded, sin pasar por el Excel. Pide confirmación. |

## Pestaña "Columnas"

Cada vez que alguien edita el formulario que rellena el personal cambian los
encabezados del Sheet, y la herramienta deja de encontrar los datos. La
pestaña **Columnas** muestra qué columna alimenta cada campo y permite
corregirlo sin tocar el código. El mapeo se guarda en las propiedades del
script.

Al abrir por primera vez, la herramienta propone un mapeo por sinónimos (gana
el sinónimo más largo que aparezca en el encabezado, para que "fecha de
nacimiento" no se lleve la columna de "nacimiento" a secas). Contra los
encabezados de hoy la propuesta acierta en todos los campos, pero conviene
revisarla una vez antes de generar nada.

Las respuestas también se emparejan con los catálogos aunque no vengan
escritas igual: el Sheet contesta `1- Residente` donde el catálogo dice
`Residente`, y el nivel formativo puede llegar con o sin el número delante.

## Archivos

| Archivo | Qué es |
| --- | --- |
| [`Code.gs`](Code.gs) | Toda la lógica: configuración, lectura del Sheet, mapeo de columnas, ficha de la gestoría, lote de Holded y llamada a la API. |
| [`Index.html`](Index.html) | El formulario. Dibuja los campos a partir de `CAMPOS`, así que un campo nuevo se agrega en un solo sitio. |
| [`appsscript.json`](appsscript.json) | Zona horaria, permisos y acceso a la aplicación web. |

Cuidado con `Index.html`: si le haces clic desde aquí, el navegador **lo
muestra como página web** en vez del código. Para ver el código, ábrelo desde
el Explorador con clic derecho → **Abrir con → Bloc de notas**.

## Puesta en marcha

1. Crear un proyecto nuevo en [script.google.com](https://script.google.com) y
   pegar los tres archivos.
2. Revisar el bloque de **configuración** al principio de `Code.gs`:
   `RESPUESTAS_ID` ya está puesto; `CARPETA_EMPLEADOS_ID` y `HOJA_HOLDED_ID`
   pueden quedarse vacíos la primera vez y la herramienta crea lo que falte.
3. Cargar la clave de la API de Holded **una sola vez**, ejecutando desde el
   editor `guardarClaveHolded('la-clave')`. No se escribe en el código para
   que no acabe en el repositorio.
4. Ejecutar `probarConexionHolded()` y mirar el registro: dice cuál de las
   rutas candidatas responde. Ver el aviso de abajo.
5. Implementar como **aplicación web**, ejecutándose como quien despliega y
   con acceso solo para esa cuenta.

### Aviso sobre la API de Holded

La documentación pública de Holded se movió y las páginas de referencia de
empleados ya no responden, así que **la ruta y los nombres de los campos del
alta por API no están confirmados**. Todo lo específico de la API vive en el
objeto `HOLDED_API` y en la función `altaEnHolded`, para poder corregirlo en
un solo sitio, y `probarConexionHolded()` prueba las dos rutas candidatas
(`/team/v1/employees` y `/v2/employees`) contra la API real.

Mientras eso no esté confirmado, **el camino seguro es el lote**: la hoja de
26 columnas reproduce el importador que ya se usa hoy.

## Estado

Primera versión completa, **sin desplegar todavía**. El mapeo automático está
comprobado contra los encabezados reales del Sheet de respuestas.

### Pendiente

- [ ] Clave de la API de Holded, y confirmar la ruta con
      `probarConexionHolded()`.
- [ ] Decidir si las cuentas contables por trabajador
      (`465000XX — Remuneraciones NOMBRE`) entran también en la herramienta.
- [ ] Confirmar el catálogo de ocupaciones, si es cerrado. Ahora es texto
      libre.
