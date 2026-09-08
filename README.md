# Formulario Alta Personal — Gestoría / Holded

Herramienta para dar de alta a un trabajador nuevo de **Sanchoyjote S.L.** sin
rellenar nada dos veces. Hoy el mismo trabajador se carga a mano en dos sitios
distintos, con dos formatos distintos:

1. **Ficha de la gestoría** — el `Modelo Alta Empleado - Gestoría.xlsx`, que se
   envía a la gestoría para que tramite el alta.
2. **Holded** — el fichero `Importar Empleados MM.AAAA.xlsx`, de 26 columnas,
   que se sube al importador.

## Un alta se llena en dos tandas

Es lo que manda el diseño entero. Las altas no llegan completas: muchas veces
las pide el jefe por WhatsApp con un nombre y una foto del DNI, y hay que
tramitarlas ya. El resto de los datos aparece días después, cuando se le
pregunta al trabajador.

Por eso hay **dos pantallas que escriben en la misma ficha**:

| Pantalla | Quién entra | Qué rellena |
| --- | --- | --- |
| **Panel de RRHH** | Solo los correos de `ADMINS` | Abre el alta con lo que haya, sube lo que llegue por WhatsApp y completa los datos del contrato. |
| **Formulario del trabajador** | Cualquiera con el enlace | Sus datos personales y su documento de identidad. |

**El formulario del trabajador es uno solo para todos**, con el mismo enlace
siempre. Cada persona se identifica con su DNI/NIE y lo que envía cae en la
fila que corresponde.

El flujo normal:

1. Llega la petición del jefe. En el panel se abre un alta: **con el nombre y
   los apellidos ya se puede guardar**. Eso crea la fila y la carpeta en Drive.
2. Si vino la foto del DNI por WhatsApp, se sube ahí mismo.
3. Se completan los datos del contrato y se genera la ficha de la gestoría, sin
   esperar a nada más.
4. Se le manda el enlace del formulario por WhatsApp. Es siempre el mismo, así
   que se puede tener guardado, o pegarlo en un cartel con un QR.
5. Él rellena lo suyo desde el móvil y sube su documento, que va directo a su
   carpeta.
6. Cuando el estado pasa a **Completo**, se carga en Holded.

El orden puede cambiar: la ficha de la gestoría y la carga en Holded son
independientes y se pueden repetir cuando llegue un dato corregido.

## Cómo se junta lo que manda el trabajador con lo que abrió RRHH

Al enviar el formulario, se busca su fila así:

1. **Por DNI/NIE.** Es lo único que identifica de verdad.
2. Si no aparece, **por nombre y apellidos**, pero solo entre las filas que
   todavía no tienen DNI. Son las altas que abrió RRHH con un mensaje del jefe,
   donde muchas veces el DNI aún no se sabe. En cuanto una fila tiene DNI, manda
   el DNI: dos personas pueden llamarse igual.
3. Si no aparece nadie, se abre un alta nueva. Sirve para el trabajador que
   rellena sus datos antes de que nadie haya tocado nada.

## Quién ve qué

Los datos del contrato —el salario incluido— **no aparecen en el formulario del
trabajador**, ni se aceptan si llegan desde ahí. Y el formulario **no devuelve
datos de nadie**: es una pantalla en blanco que solo escribe. Ni siquiera
enseña lo que esa misma persona mandó la vez anterior.

El panel está cerrado a los correos de la lista `ADMINS`, al principio de
`Code.gs`. La aplicación se publica abierta —si no, el trabajador tendría que
entrar con una cuenta de Google que muchos no tienen—, así que el servidor
queda al alcance de cualquiera y la barrera tiene que estar en el código, no en
la dirección: **esconder el panel detrás de `?rrhh=1` no protege nada**, porque
quien conozca el enlace del formulario puede añadir el parámetro. Lo que
protege es que cada función del panel llame a `soloAdmin()` antes de tocar la
hoja. Esto importa porque ahí están los DNI, los números de la Seguridad Social
y las cuentas bancarias de toda la plantilla.

Queda un riesgo asumido: cualquiera que sepa el DNI de un compañero podría
sobrescribir sus datos personales desde el formulario. No puede leerlos —el
formulario nunca devuelve nada— y cada cambio queda con su fecha en la columna
`Actualizado`. Es el precio de que no haya enlaces personales, que era lo que
hacía el trámite lento.

## Dónde viven los datos

Una sola hoja de cálculo, **`Alta de personal`**, dentro de la carpeta de RRHH
en Drive:

| Pestaña | Qué tiene |
| --- | --- |
| `Trabajadores` | Una fila por alta. Las columnas de control (ID interno, estado, fechas, carpeta) y una columna por cada campo. |
| `Lote Holded` | Las 26 columnas del importador, listas para exportar y subir. |

La columna **Estado** se recalcula sola en cada guardado: dice `Completo` o
cuántos datos del trabajador faltan.

Un campo nuevo en `CAMPOS` aparece como columna nueva al final de
`Trabajadores`, sin tocar las que ya tienen datos.

## Carpeta del trabajador

Se crea al abrir el alta, con el nombre `Apellido, Nombre`, dentro de la
carpeta de RRHH.

| Archivo | Nombre |
| --- | --- |
| Ficha de la gestoría | `Alta Empleado - Apellido, Nombre.xlsx` |
| Documento de identidad | `DNI - Apellido, Nombre.<extensión>` |
| Cualquier otra cosa que se suba | Conserva su nombre |

El documento de identidad se renombra siempre igual, venga del trabajador o del
WhatsApp del jefe, para que todas las carpetas se lean igual. Subir uno nuevo
reemplaza el anterior, y regenerar la ficha reemplaza la ficha: no se acumulan
archivos casi iguales.

El nombre de la carpeta se propone con el primer apellido y el primer nombre,
pero **queda editable**. Los apellidos compuestos y los nombres de dos palabras
no se pueden adivinar bien, y las carpetas que ya existen tampoco siguen un
patrón único (`Aldana, Yorman` junto a `Lopez Garcia, Paulo César` y
`Simón Ceballos, Eddison`).

## Salida 1 — Ficha de la gestoría

Formato exacto del modelo: dos columnas, etiqueta en A y valor en B. Se genera
en cuanto haya nombre, apellidos, DNI, fecha de alta, ocupación y centro de
trabajo, aunque falte todo lo demás.

| Fila | Campo | Quién lo aporta |
| --- | --- | --- |
| 2 | NOMBRE Y APELLIDOS | Trabajador |
| 3 | DNI/NIE | Trabajador |
| 4 | FECHA DE NACIMIENTO | Trabajador |
| 5 | NUMERO DE AFILIACION | Trabajador |
| 6 | NIVEL FORMATIVO | Trabajador (catálogo cerrado) |
| 7 | NACIONALIDAD | Trabajador |
| 9 | Calle y nº | Trabajador |
| 10 | Municipio | Trabajador |
| 11 | Código Postal | Trabajador |
| 12 | Provincia | Trabajador |
| 13 | TIPO DE CONTRATO (indefinido o temporal) | RRHH |
| 14 | FECHA DE INICIO (alta) | RRHH |
| 15 | DURACIÓN DEL CONTRATO (si lo requiere el mismo) | RRHH |
| 16 | OCUPACION A DESEMPEÑAR | RRHH |
| 17 | HORAS DE JORNADA | RRHH |
| 18 | DISTRIBUCIÓN JORNADA | RRHH |
| 19 | CENTRO DE TRABAJO (dirección completa) | Catálogo de sedes |
| 20 | SALARIO (si es pactado por encima del convenio) | RRHH |
| 21 | OTROS | RRHH |

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
- El bloque de **No residente** solo se rellena si `Residencia fiscal = 0`. Los
  dos formularios lo esconden hasta que hace falta, y la fila se manda vacía en
  ese bloque cuando la persona es residente, porque si no Holded la rechaza.

Hay dos caminos, y el del lote es el seguro:

| Acción | Qué hace |
| --- | --- |
| **Añadir al lote de Holded** | Deja la fila en la pestaña `Lote Holded`. Si el trabajador ya estaba (mismo DNI/NIE), actualiza su fila en vez de duplicarla. |
| **Crear en Holded por API** | Crea al trabajador directamente en Holded, sin pasar por el Excel. Pide confirmación. Ver el aviso de más abajo. |

Aparte del alta del empleado, cada trabajador necesita su **cuenta contable**
(`465000XX — Remuneraciones NOMBRE APELLIDO`). Hoy se carga con un importador
propio de dos columnas y todavía no está en la herramienta.

## Archivos

| Archivo | Qué es |
| --- | --- |
| [`Code.gs`](Code.gs) | Toda la lógica: configuración, hoja maestra, panel, formulario del trabajador, ficha de la gestoría, lote de Holded y llamada a la API. |
| [`Index.html`](Index.html) | El panel de RRHH. |
| [`Trabajador.html`](Trabajador.html) | El formulario del trabajador, pensado para el móvil. |
| [`appsscript.json`](appsscript.json) | Zona horaria, permisos y acceso a la aplicación web. |

Los dos formularios se dibujan a partir de `CAMPOS`, en `Code.gs`: un campo
nuevo se agrega en un solo sitio y aparece donde le toque según su grupo.

Cuidado con los `.html`: si les haces clic desde aquí, el navegador **los
muestra como página web** en vez del código. Para ver el código, ábrelos desde
el Explorador con clic derecho → **Abrir con → Bloc de notas**.

## Puesta en marcha

1. Crear un proyecto nuevo en [script.google.com](https://script.google.com) y
   pegar los cuatro archivos.
2. Revisar el bloque de **configuración** al principio de `Code.gs`:
   - `ADMINS` — quién puede abrir el panel.
   - `CARPETA_RRHH_ID` — la carpeta de Drive donde va todo. Si se deja vacía, se
     crea una llamada `Alta de personal` en la unidad de quien despliega.
   - `MAESTRO_ID` — la hoja. Vacío la primera vez; conviene fijarlo en cuanto
     exista, para que no dependa de buscarla por nombre.
3. Implementar como **aplicación web**: ejecutándose como quien despliega y con
   acceso para *cualquier usuario, incluso anónimo*. Es lo que permite que el
   trabajador lo abra desde el móvil sin cuenta de Google; el panel sigue
   cerrado por la lista `ADMINS`.

   La dirección que da Google es la del **formulario del trabajador**, la que se
   reparte. El panel es esa misma dirección con `?rrhh=1` al final; conviene
   guardarla en marcadores.
4. Ejecutar `quienSoy()` desde el editor. Debe devolver tu correo. Si devuelve
   vacío, el panel no se podrá abrir y hay que revisar cómo quedó implementada
   la aplicación.
5. Ejecutar `importarRespuestasAntiguas()` una vez, para traer lo que la gente
   ya rellenó en el Google Form viejo. Repetirla no duplica: quien ya esté por
   DNI se salta.
6. Retirar el Google Form viejo, para que no haya datos en dos sitios.
7. Para Holded: cargar la clave **una sola vez** ejecutando
   `guardarClaveHolded('la-clave')` desde el editor. No se escribe en el código
   para que no acabe en el repositorio. Después, `probarConexionHolded()`.

### Aviso sobre la API de Holded

La documentación pública de Holded se movió y las páginas de referencia de
empleados ya no responden, así que **la ruta y los nombres de los campos del
alta por API no están confirmados**. Todo lo específico de la API vive en el
objeto `HOLDED_API` y en la función `altaEnHolded`, para poder corregirlo en un
solo sitio, y `probarConexionHolded()` prueba las dos rutas candidatas
(`/team/v1/employees` y `/v2/employees`) contra la API real.

Mientras eso no esté confirmado, **el camino seguro es el lote**: la pestaña de
26 columnas reproduce el importador que ya se usa hoy.

## Estado

Tercera versión, **sin desplegar todavía**.

### Pendiente

- [ ] Clave de la API de Holded, y confirmar la ruta con
      `probarConexionHolded()`.
- [ ] Decidir si las cuentas contables por trabajador
      (`465000XX — Remuneraciones NOMBRE`) entran también en la herramienta.
- [ ] Confirmar el catálogo de ocupaciones, si es cerrado. Ahora es texto libre.
- [ ] Decidir si RRHH quiere aviso por correo cuando un trabajador termina de
      rellenar lo suyo. Está listo pero desactivado: se enciende poniendo un
      correo en `AVISAR_A`.
