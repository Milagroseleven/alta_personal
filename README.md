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
| Google Sheet de respuestas del formulario que rellena el personal | El grueso de los datos personales. Es la fuente principal. |
| Solicitudes del jefe por WhatsApp (texto, imágenes, documento de identidad) | Los datos de contrato y, muchas veces, el documento de identidad. Entran a mano. |

Ninguna de las dos fuentes está completa por sí sola, así que la herramienta
precarga lo que encuentra en el Sheet y deja el resto editable antes de
generar nada.

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

Se crea en:

```
C:\Users\motic\Desktop\RRHH\Empleados\Alta de personal Gestoría\Apellido, Nombre
```

Dentro van **solo dos cosas**: la ficha de la gestoría y el documento de
identidad. El contrato, la comunicación del alta y las nóminas llegan después
y se guardan a mano, como hasta ahora.

Las carpetas que ya existen se crearon a mano y no siguen un patrón único
(`DNI.jpeg`, `Cadiz, Cristian.jpg`, `Modelo Alta Empleado - John Smith.xlsx`).
A partir de aquí el nombre lo pone la herramienta.

## Estado

Estructura y mapeo de campos definidos. Falta el código.

### Pendiente

- [ ] Acceso al Sheet de respuestas para leer sus columnas reales. Compartir
      `1zCq_AnPsuLf-h9AaEsjowAacFtGzdMCPKSC8gEFbhkw` con
      `conciliacion-ventas@conciliacion-ventas.iam.gserviceaccount.com`.
- [ ] Clave de API de Holded.
- [ ] Confirmar cómo llega el documento de identidad (archivo en el PC,
      Drive, o adjunto en el momento).
- [ ] Decidir el nombre del archivo de la ficha y del documento de identidad.
