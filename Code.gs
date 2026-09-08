/**
 * Alta de personal - Sanchoyjote S.L.
 *
 * Un alta se llena en dos tandas y desde dos sitios distintos:
 *
 *   1. El panel de RRHH. Se abre un alta con lo poco que llegue —muchas
 *      veces el jefe pide el alta por WhatsApp con un nombre y una foto del
 *      DNI— y se completan los datos del contrato, que ningún trabajador
 *      conoce ni tiene por qué conocer.
 *   2. El formulario del trabajador. Uno solo para todos, el mismo enlace
 *      siempre. Él rellena sus datos personales y sube su documento de
 *      identidad, que va directo a su carpeta. Se identifica con su DNI, y
 *      con eso lo que envía cae en la fila que ya abrió RRHH.
 *
 * Los dos escriben en la misma fila de la hoja "Trabajadores". No hay que
 * esperar a tener todo para empezar: la ficha de la gestoría se puede
 * generar en cuanto haya lo suyo, aunque falte lo de Holded.
 *
 * CAMPOS es la única fuente de verdad. De ahí salen los dos formularios, las
 * columnas de la hoja, el orden de la ficha de la gestoría y las columnas
 * del importador de Holded.
 */

// ---------------------------------------------------------------------
// CONFIGURACIÓN
//
// El ID es el trozo largo de la URL:
//   hoja    -> docs.google.com/spreadsheets/d/ESTO_ES_EL_ID/edit
//   carpeta -> drive.google.com/drive/folders/ESTO_ES_EL_ID
// ---------------------------------------------------------------------

// Quién puede abrir el panel de RRHH. Todo lo demás que no sea el
// formulario del trabajador queda cerrado para el resto del mundo: la hoja
// tiene DNI, números de la Seguridad Social y cuentas bancarias.
const ADMINS = [
  'milagros.gamboa@motickfamily.com',
];

// Carpeta de Drive de RRHH, donde vive la hoja maestra y donde se crea una
// subcarpeta por trabajador. Vacío = se busca (o se crea) una carpeta
// llamada "Alta de personal" en la unidad de la cuenta que despliega.
const CARPETA_RRHH_ID = '';

// Hoja maestra. Vacío = se busca (o se crea) "Alta de personal" dentro de
// la carpeta de arriba. Conviene fijarlo aquí en cuanto exista.
const MAESTRO_ID = '';

const HOJA_TRABAJADORES = 'Trabajadores';
const HOJA_LOTE_HOLDED = 'Lote Holded';

// Sheet viejo, el de las respuestas del Google Form que se usaba antes.
// Solo se lee una vez, con importarRespuestasAntiguas().
const RESPUESTAS_ANTIGUAS_ID = '1zCq_AnPsuLf-h9AaEsjowAacFtGzdMCPKSC8gEFbhkw';

// Correo al que avisar cuando un trabajador termina de rellenar lo suyo.
// Vacío = no se manda ningún aviso.
const AVISAR_A = '';

// ---------------------------------------------------------------------
// CENTROS DE TRABAJO
//
// La ficha de la gestoría pide la dirección completa y la escribe como
// "Sede - Dirección", igual que el modelo.
// ---------------------------------------------------------------------
const CENTROS = {
  'Barcelona': 'Gran Via de les Corts Catalanes, 806, Eixample, 08013 Barcelona',
  'Madrid CT': 'CT - C. Mártires de Paracuellos, 2, Tetuán, 28020 Madrid',
  'Móstoles': 'C. Alfarería, 18, 28933 Móstoles, Madrid',
  'Valencia': 'Av. de Burjassot, 119, Benicalap, 46015 València, Valencia',
  'Sevilla': 'C. Imprenta, 48, 41016 Sevilla',
};

// Catálogo cerrado de la gestoría. El texto se escribe tal cual en la ficha.
const NIVELES_FORMATIVOS = [
  '1 - Sin estudios',
  '2 - Estudios primarios incompletos',
  '3 - Educación primaria completa',
  '4 - Educación secundaria obligatoria (ESO)',
  '5 - Bachillerato',
  '6 - Formación Profesional de Grado Medio',
  '7 - Formación Profesional de Grado Superior',
  '8 - Diplomatura',
  '9 - Licenciatura / Grado universitario',
  '10 - Máster universitario',
  '11 - Doctorado',
];

const TIPOS_CONTRATO = ['Indefinido', 'Temporal'];

// ---------------------------------------------------------------------
// CAMPOS
//
// clave      : nombre interno. Es también el nombre de la columna en la hoja.
// etiqueta   : lo que se lee en el formulario y el encabezado de la columna.
// grupo      : 'personal' lo rellena el trabajador; 'contrato' solo RRHH.
//              Lo del contrato no aparece nunca en el formulario del
//              trabajador: ahí va el salario.
// tipo       : texto | fecha | numero | lista | area
// opciones   : para tipo 'lista'.
// ayuda      : aclaración bajo el campo, para el trabajador.
// opcional   : no se le reclama al trabajador para dar el alta por completa.
// soloNoResidente : solo se enseña y se manda si la residencia fiscal lo pide.
// interno    : no se dibuja en ningún formulario. Existe para guardar cosas
//              como el enlace del documento que traían las respuestas viejas.
// sinonimos  : encabezados que se aceptan al importar las respuestas viejas.
// holded     : encabezado exacto del importador de Holded, o null.
// ---------------------------------------------------------------------
const CAMPOS = [
  { clave: 'nombre', etiqueta: 'Nombre', grupo: 'personal', tipo: 'texto',
    sinonimos: ['nombre'], holded: 'Nombre' },
  { clave: 'apellidos', etiqueta: 'Apellidos', grupo: 'personal', tipo: 'texto',
    sinonimos: ['apellidos', 'apellido'], holded: 'Apellidos' },
  { clave: 'dni', etiqueta: 'Número de identificación (DNI/NIE)', grupo: 'personal', tipo: 'texto',
    sinonimos: ['dni', 'nie', 'documento de identidad', 'identificacion fiscal'],
    holded: 'Núm. identificación fiscal' },
  { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', grupo: 'personal', tipo: 'fecha',
    sinonimos: ['fecha de nacimiento', 'nacimiento'],
    holded: 'Fecha nacimiento (dd/mm/aaaa)' },
  { clave: 'naf', etiqueta: 'Número de la Seguridad Social', grupo: 'personal', tipo: 'texto',
    ayuda: 'Los 12 dígitos que aparecen en tu documento de afiliación.',
    sinonimos: ['afiliacion', 'naf', 'seguridad social'],
    holded: 'Número Seguridad Social' },
  { clave: 'nivelFormativo', etiqueta: 'Nivel formativo', grupo: 'personal', tipo: 'lista',
    opciones: NIVELES_FORMATIVOS, ayuda: 'El último nivel que completaste.',
    sinonimos: ['nivel formativo', 'estudios', 'formacion'], holded: null },
  { clave: 'nacionalidad', etiqueta: 'Nacionalidad', grupo: 'personal', tipo: 'texto',
    sinonimos: ['nacionalidad'], holded: 'Nacionalidad' },
  { clave: 'genero', etiqueta: 'Género', grupo: 'personal', tipo: 'lista',
    opciones: ['Hombre', 'Mujer'],
    sinonimos: ['genero', 'sexo'], holded: 'Género (1: Hombre, 0: Mujer)' },
  { clave: 'email', etiqueta: 'Correo electrónico', grupo: 'personal', tipo: 'texto',
    sinonimos: ['email', 'correo'], holded: 'Email' },
  { clave: 'telefono', etiqueta: 'Teléfono fijo', grupo: 'personal', tipo: 'texto',
    opcional: true, sinonimos: ['telefono fijo'], holded: 'Teléfono' },
  { clave: 'movil', etiqueta: 'Móvil', grupo: 'personal', tipo: 'texto',
    sinonimos: ['movil', 'celular', 'whatsapp'], holded: 'Móvil' },
  { clave: 'cuentaBancaria', etiqueta: 'Número de cuenta bancaria (IBAN)', grupo: 'personal', tipo: 'texto',
    ayuda: 'Donde quieres cobrar la nómina. Empieza por ES.',
    sinonimos: ['cuenta bancaria', 'iban', 'cuenta'],
    holded: 'Número de cuenta bancaria' },
  { clave: 'calle', etiqueta: 'Dirección', grupo: 'personal', tipo: 'texto',
    ayuda: 'Calle, número, piso y puerta.',
    sinonimos: ['calle', 'direccion', 'domicilio'], holded: 'Dirección' },
  { clave: 'municipio', etiqueta: 'Población', grupo: 'personal', tipo: 'texto',
    sinonimos: ['municipio', 'poblacion', 'ciudad'], holded: 'Población' },
  { clave: 'codigoPostal', etiqueta: 'Código postal', grupo: 'personal', tipo: 'texto',
    sinonimos: ['codigo postal', 'cp'], holded: 'Código postal' },
  { clave: 'provincia', etiqueta: 'Provincia', grupo: 'personal', tipo: 'texto',
    sinonimos: ['provincia'], holded: 'Provincia' },
  { clave: 'pais', etiqueta: 'País', grupo: 'personal', tipo: 'texto',
    sinonimos: ['pais de residencia', 'pais'], holded: 'País' },
  { clave: 'ciudadNacimiento', etiqueta: 'Ciudad de nacimiento', grupo: 'personal', tipo: 'texto',
    sinonimos: ['ciudad de nacimiento', 'lugar de nacimiento'],
    holded: 'Ciudad de nacimiento' },
  { clave: 'paisNacimiento', etiqueta: 'País de nacimiento', grupo: 'personal', tipo: 'texto',
    sinonimos: ['pais de nacimiento'], holded: 'País de nacimiento' },
  { clave: 'residenciaFiscal', etiqueta: 'Residencia fiscal', grupo: 'personal', tipo: 'lista',
    opciones: ['Residente', 'No residente'],
    ayuda: 'Residente si vives y tributas en España, que es lo habitual.',
    sinonimos: ['residencia fiscal', 'residente'],
    holded: 'Residencia fiscal (1: Residente, 0: No residente)' },

  // Bloque de no residente. Holded lo rechaza si llega relleno con
  // residencia fiscal 1, así que se vacía solo cuando no corresponde y los
  // formularios ni siquiera lo enseñan.
  { clave: 'direccionNoResidente', etiqueta: 'Dirección (no residente)', grupo: 'personal', tipo: 'texto',
    soloNoResidente: true, sinonimos: ['direccion no residente'],
    holded: 'Dirección No residente' },
  { clave: 'poblacionNoResidente', etiqueta: 'Población (no residente)', grupo: 'personal', tipo: 'texto',
    soloNoResidente: true, sinonimos: ['poblacion no residente'],
    holded: 'Población No residente' },
  { clave: 'codigoPostalNoResidente', etiqueta: 'Código postal (no residente)', grupo: 'personal', tipo: 'texto',
    soloNoResidente: true, sinonimos: ['codigo postal no residente'],
    holded: 'Código postal No residente' },
  { clave: 'provinciaNoResidente', etiqueta: 'Provincia (no residente)', grupo: 'personal', tipo: 'texto',
    soloNoResidente: true, sinonimos: ['provincia no residente'],
    holded: 'Provincia No residente' },
  { clave: 'paisNoResidente', etiqueta: 'País (no residente)', grupo: 'personal', tipo: 'texto',
    soloNoResidente: true, sinonimos: ['pais no residente'],
    holded: 'País No residente' },
  { clave: 'dniNoResidente', etiqueta: 'Nº de identificación (no residente)', grupo: 'personal', tipo: 'texto',
    soloNoResidente: true, sinonimos: ['identificacion no residente'],
    holded: 'Núm. identificación fiscal No residente' },
  { clave: 'finNoResidente', etiqueta: 'Fin de la situación de no residente', grupo: 'personal', tipo: 'texto',
    soloNoResidente: true, sinonimos: ['fin de situacion no residente'],
    holded: 'Fin de situación no-residente' },

  { clave: 'documentoUrl', etiqueta: 'Enlace del documento (respuestas antiguas)', grupo: 'personal',
    tipo: 'texto', interno: true,
    sinonimos: ['documento de identificacion', 'documento identidad', 'adjunto'],
    holded: null },

  { clave: 'tipoContrato', etiqueta: 'Tipo de contrato', grupo: 'contrato', tipo: 'lista',
    opciones: TIPOS_CONTRATO, sinonimos: [], holded: null },
  { clave: 'fechaInicio', etiqueta: 'Fecha de inicio (alta)', grupo: 'contrato', tipo: 'fecha',
    sinonimos: [], holded: null },
  { clave: 'duracionContrato', etiqueta: 'Duración del contrato', grupo: 'contrato', tipo: 'texto',
    sinonimos: [], holded: null },
  { clave: 'ocupacion', etiqueta: 'Ocupación a desempeñar', grupo: 'contrato', tipo: 'texto',
    sinonimos: [], holded: null },
  { clave: 'horasJornada', etiqueta: 'Horas de jornada', grupo: 'contrato', tipo: 'numero',
    sinonimos: [], holded: null },
  { clave: 'distribucionJornada', etiqueta: 'Distribución de la jornada', grupo: 'contrato', tipo: 'texto',
    sinonimos: [], holded: null },
  { clave: 'sede', etiqueta: 'Centro de trabajo', grupo: 'contrato', tipo: 'lista',
    opciones: Object.keys(CENTROS), sinonimos: ['sede', 'centro de trabajo', 'tienda'],
    holded: null },
  { clave: 'salario', etiqueta: 'Salario (solo si se pacta por encima del convenio)', grupo: 'contrato', tipo: 'texto',
    sinonimos: [], holded: null },
  { clave: 'otros', etiqueta: 'Otros', grupo: 'contrato', tipo: 'area',
    sinonimos: [], holded: null },
];

// Columnas de control de la hoja "Trabajadores", antes de las de CAMPOS.
// El ID solo lo usa el panel para saber de qué fila habla. No sale de ahí.
const COLUMNAS_CONTROL = [
  'ID', 'Estado', 'Creado', 'Actualizado', 'Ficha gestoría', 'Holded',
  'Carpeta', 'Carpeta ID', 'Documento',
];

// Sin esto no se puede ni abrir un alta.
const OBLIGATORIOS_ALTA = ['nombre', 'apellidos'];
// Sin esto la gestoría no puede tramitar.
const OBLIGATORIOS_GESTORIA = ['nombre', 'apellidos', 'dni', 'fechaInicio', 'ocupacion', 'sede'];
// Mínimo que acepta el importador de Holded.
const OBLIGATORIOS_HOLDED = ['nombre', 'apellidos', 'dni'];

// Orden exacto del modelo de la gestoría, fila por fila.
// [texto de la columna A, clave del campo]. null = fila de encabezado.
const FICHA_GESTORIA = [
  ['DATOS ALTA DE UN TRABAJADOR', null],
  ['NOMBRE Y APELLIDOS', 'nombreCompleto'],
  ['DNI/NIE', 'dni'],
  ['FECHA DE NACIMIENTO', 'fechaNacimiento'],
  ['NUMERO DE AFILIACION', 'naf'],
  ['NIVEL FORMATIVO', 'nivelFormativo'],
  ['NACIONALIDAD', 'nacionalidad'],
  ['DIRECCIÓN COMPLETA TRABAJADOR', null],
  ['Calle y nº', 'calle'],
  ['Municipio', 'municipio'],
  ['Código Postal', 'codigoPostal'],
  ['Provincia', 'provincia'],
  ['TIPO DE CONTRATO (indefinido o temporal)', 'tipoContrato'],
  ['FECHA DE INICIO (alta)', 'fechaInicio'],
  ['DURACIÓN DEL CONTRATO (si lo requiere el mismo)', 'duracionContrato'],
  ['OCUPACION A DESEMPEÑAR', 'ocupacion'],
  ['HORAS DE JORNADA', 'horasJornada'],
  ['DISTRIBUCIÓN JORNADA', 'distribucionJornada'],
  ['CENTRO DE TRABAJO (dirección completa)', 'centroTrabajo'],
  ['SALARIO ( si es pactado por encima del convenio)', 'salario'],
  ['OTROS', 'otros'],
];

// Las 26 columnas del importador de Holded, en su orden.
const COLUMNAS_HOLDED = [
  'Nombre', 'Apellidos', 'Email', 'Nacionalidad', 'Fecha nacimiento (dd/mm/aaaa)',
  'Género (1: Hombre, 0: Mujer)', 'Teléfono', 'Móvil', 'Número de cuenta bancaria',
  'Núm. identificación fiscal', 'Número Seguridad Social', 'Dirección', 'Población',
  'Código postal', 'Provincia', 'País', 'Residencia fiscal (1: Residente, 0: No residente)',
  'Dirección No residente', 'Población No residente', 'Código postal No residente',
  'Provincia No residente', 'País No residente', 'Núm. identificación fiscal No residente',
  'Ciudad de nacimiento', 'País de nacimiento', 'Fin de situación no-residente',
];

const PROP_CLAVE_HOLDED = 'HOLDED_API_KEY';


// =====================================================================
// ENTRADA
//
// Una sola dirección, la que se reparte a todo el mundo, y lo que sale por
// defecto es el formulario del trabajador. El panel de RRHH está detrás de
// ?rrhh=1 y, sobre todo, de la comprobación de quién entra.
// =====================================================================

function doGet(e) {
  const quierePanel = !!(e && e.parameter && e.parameter.rrhh);

  if (!quierePanel) {
    const plantilla = HtmlService.createTemplateFromFile('Trabajador');
    plantilla.config = JSON.stringify({ campos: camposDelTrabajador() });
    return plantilla.evaluate()
      .setTitle('Alta de personal - Sanchoyjote')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (!esAdmin()) {
    return paginaSimple('Acceso restringido',
      'Este panel es solo para Recursos Humanos.');
  }

  const plantilla = HtmlService.createTemplateFromFile('Index');
  plantilla.config = JSON.stringify({
    campos: CAMPOS.filter(function (c) { return !c.interno; }),
    centros: CENTROS,
    obligatoriosAlta: OBLIGATORIOS_ALTA,
    obligatoriosGestoria: OBLIGATORIOS_GESTORIA,
    obligatoriosHolded: OBLIGATORIOS_HOLDED,
    enlaceFormulario: ScriptApp.getService().getUrl(),
  });
  return plantilla.evaluate()
    .setTitle('Alta de personal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function paginaSimple(titulo, texto) {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;' +
    'max-width:480px;margin:60px auto;padding:24px;text-align:center;color:#1a1a1a">' +
    '<h1 style="font-size:20px">' + titulo + '</h1>' +
    '<p style="color:#555;line-height:1.6">' + texto + '</p></div>'
  ).setTitle(titulo);
}


// =====================================================================
// SEGURIDAD
//
// La aplicación se publica abierta: si no, el trabajador tendría que entrar
// con una cuenta de Google que muchos no tienen. Eso deja el servidor al
// alcance de cualquiera, así que la barrera está aquí y no en la dirección.
//
//   - Todo lo del panel llama a soloAdmin() antes de tocar nada. Esconder el
//     panel detrás de ?rrhh=1 no protege: quien conozca la dirección puede
//     añadir el parámetro. Lo que protege es esta comprobación.
//   - El formulario del trabajador solo escribe. No devuelve datos de nadie,
//     ni siquiera de quien lo rellena, y no acepta campos del contrato.
// =====================================================================

function esAdmin() {
  const correo = Session.getActiveUser().getEmail();
  return !!correo && ADMINS.indexOf(correo) !== -1;
}

function soloAdmin() {
  if (!esAdmin()) {
    throw new Error('Esta acción es solo para Recursos Humanos.');
  }
}

/**
 * Para depurar el acceso. Si devuelve el correo vacío, el panel no se puede
 * abrir y hay que revisar cómo está implementada la aplicación.
 */
function quienSoy() {
  const correo = Session.getActiveUser().getEmail();
  Logger.log('Correo visto por el script: "' + correo + '" | admin: ' + esAdmin());
  return correo;
}


// =====================================================================
// HOJA MAESTRA
// =====================================================================

function carpetaRaiz() {
  if (CARPETA_RRHH_ID) return DriveApp.getFolderById(CARPETA_RRHH_ID);
  const existentes = DriveApp.getFoldersByName('Alta de personal');
  return existentes.hasNext() ? existentes.next() : DriveApp.createFolder('Alta de personal');
}

function libroMaestro() {
  if (MAESTRO_ID) return SpreadsheetApp.openById(MAESTRO_ID);

  const carpeta = carpetaRaiz();
  const existentes = carpeta.getFilesByName('Alta de personal');
  if (existentes.hasNext()) return SpreadsheetApp.open(existentes.next());

  const libro = SpreadsheetApp.create('Alta de personal');
  const archivo = DriveApp.getFileById(libro.getId());
  carpeta.addFile(archivo);
  DriveApp.getRootFolder().removeFile(archivo);
  return libro;
}

/**
 * Encabezados de la hoja "Trabajadores": las columnas de control y luego una
 * por campo. Un campo nuevo en CAMPOS aparece como columna nueva al final,
 * sin tocar las que ya tienen datos.
 */
function encabezadosMaestro() {
  return COLUMNAS_CONTROL.concat(CAMPOS.map(function (c) { return c.etiqueta; }));
}

function hojaTrabajadores() {
  const libro = libroMaestro();
  let hoja = libro.getSheetByName(HOJA_TRABAJADORES);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA_TRABAJADORES);
    if (libro.getSheets()[0].getName() === 'Hoja 1' || libro.getSheets()[0].getName() === 'Sheet1') {
      libro.deleteSheet(libro.getSheets()[0]);
    }
  }

  const esperados = encabezadosMaestro();
  if (hoja.getLastColumn() === 0) {
    hoja.getRange(1, 1, 1, esperados.length).setValues([esperados]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    hoja.setFrozenColumns(2);
  } else {
    const actuales = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
      .map(function (v) { return String(v).trim(); });
    const nuevos = esperados.filter(function (e) { return actuales.indexOf(e) === -1; });
    if (nuevos.length) {
      hoja.getRange(1, actuales.length + 1, 1, nuevos.length)
        .setValues([nuevos]).setFontWeight('bold');
    }
  }
  return hoja;
}

function indicesDe(hoja) {
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const indices = {};
  encabezados.forEach(function (encabezado, i) {
    indices[String(encabezado).trim()] = i;
  });
  return indices;
}

/** Devuelve { hoja, numeroFila, indices, datos } o null. */
function buscarFila(id) {
  return buscarCon(function (datos) {
    return datos['ID'] && datos['ID'] === String(id).trim();
  });
}

/**
 * Busca a quién corresponde lo que llega del formulario público. Primero por
 * DNI, que es lo único que identifica de verdad. Si el alta la abrió RRHH con
 * un mensaje del jefe puede que todavía no tenga DNI, así que se prueba
 * también por nombre y apellidos.
 *
 * Si no aparece nadie, es un alta que empieza el propio trabajador.
 */
function buscarPersona(dni, nombre, apellidos) {
  const buscadoDni = String(dni || '').trim().toUpperCase();
  if (buscadoDni) {
    const porDni = buscarCon(function (datos) {
      return String(datos.dni).trim().toUpperCase() === buscadoDni;
    });
    if (porDni) return porDni;
  }

  const buscadoNombre = sinAcentos(nombre + ' ' + apellidos);
  if (!buscadoNombre) return null;
  return buscarCon(function (datos) {
    // Solo vale para filas que aún no tienen DNI: con DNI manda el DNI, y
    // dos personas pueden llamarse igual.
    if (String(datos.dni).trim()) return false;
    return sinAcentos(datos.nombre + ' ' + datos.apellidos) === buscadoNombre;
  });
}

function buscarCon(coincide) {
  const hoja = hojaTrabajadores();
  if (hoja.getLastRow() < 2) return null;

  const indices = indicesDe(hoja);
  const filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();

  for (let i = 0; i < filas.length; i++) {
    const datos = filaAObjeto(filas[i], indices);
    if (coincide(datos)) {
      return { hoja: hoja, numeroFila: i + 2, indices: indices, datos: datos };
    }
  }
  return null;
}

function filaAObjeto(fila, indices) {
  const objeto = {};
  COLUMNAS_CONTROL.forEach(function (columna) {
    objeto[columna] = textoDeCelda(fila[indices[columna]]);
  });
  CAMPOS.forEach(function (campo) {
    const i = indices[campo.etiqueta];
    objeto[campo.clave] = i === undefined ? '' : textoDeCelda(fila[i], campo);
  });
  return objeto;
}

function textoDeCelda(valor, campo) {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) {
    return campo && campo.tipo === 'fecha'
      ? Utilities.formatDate(valor, 'Europe/Madrid', 'yyyy-MM-dd')
      : Utilities.formatDate(valor, 'Europe/Madrid', 'yyyy-MM-dd HH:mm');
  }
  return String(valor).trim();
}

function escribirCeldas(fila, valores) {
  Object.keys(valores).forEach(function (columna) {
    const i = fila.indices[columna];
    if (i !== undefined) fila.hoja.getRange(fila.numeroFila, i + 1).setValue(valores[columna]);
  });
}

/**
 * Qué le falta al trabajador por rellenar. Es lo que decide el estado y lo
 * que se le muestra a RRHH para saber a quién hay que reclamarle.
 */
function loQueFalta(datos) {
  const esResidente = datos.residenciaFiscal !== 'No residente';
  return CAMPOS.filter(function (campo) {
    if (campo.grupo !== 'personal' || campo.interno || campo.opcional) return false;
    if (campo.soloNoResidente && esResidente) return false;
    return !String(datos[campo.clave] || '').trim();
  }).map(function (campo) { return campo.etiqueta; });
}

function estadoDe(datos) {
  const faltan = loQueFalta(datos);
  if (!faltan.length) return 'Completo';
  return 'Faltan ' + faltan.length + ' datos del trabajador';
}

function camposDelTrabajador() {
  return CAMPOS.filter(function (campo) {
    return campo.grupo === 'personal' && !campo.interno;
  });
}


// =====================================================================
// PANEL DE RRHH
// =====================================================================

function listarAltas() {
  soloAdmin();
  const hoja = hojaTrabajadores();
  if (hoja.getLastRow() < 2) return [];

  const indices = indicesDe(hoja);
  const filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();

  const lista = filas.map(function (fila) {
    const datos = filaAObjeto(fila, indices);
    return {
      id: datos['ID'],
      etiqueta: [datos.nombre, datos.apellidos].filter(String).join(' ').trim() ||
        '(sin nombre)',
      dni: datos.dni,
      estado: datos['Estado'],
      fichaGenerada: !!datos['Ficha gestoría'],
      enHolded: !!datos['Holded'],
    };
  }).filter(function (t) { return t.id; });

  lista.reverse();
  return lista;
}

/**
 * Abre un alta con lo que haya. Basta el nombre: el resto puede llegar
 * después, del propio trabajador o de un mensaje del jefe.
 */
function crearAlta(datos) {
  soloAdmin();
  validar(datos, OBLIGATORIOS_ALTA);

  return { id: nuevaFila(datos, String(datos.carpeta || '').trim()) };
}

/**
 * Crea la fila y la carpeta. Lo usan las tres puertas de entrada: el panel,
 * el formulario público y la importación de las respuestas antiguas.
 */
function nuevaFila(datos, nombreCarpeta) {
  const hoja = hojaTrabajadores();
  const indices = indicesDe(hoja);
  const id = Utilities.getUuid();
  const ahora = new Date();
  const carpeta = carpetaDelTrabajador(nombreCarpeta || nombreCarpetaPropuesto(datos));

  const valores = new Array(hoja.getLastColumn()).fill('');
  valores[indices['ID']] = id;
  valores[indices['Creado']] = ahora;
  valores[indices['Actualizado']] = ahora;
  valores[indices['Carpeta']] = carpeta.getName();
  valores[indices['Carpeta ID']] = carpeta.getId();
  CAMPOS.forEach(function (campo) {
    const i = indices[campo.etiqueta];
    if (i !== undefined) valores[i] = datos[campo.clave] || '';
  });
  valores[indices['Estado']] = estadoDe(datos);

  hoja.appendRow(valores);
  return id;
}

function cargarAlta(id) {
  soloAdmin();
  const fila = buscarFila(id);
  if (!fila) throw new Error('Ese alta ya no existe.');
  return { datos: fila.datos, falta: loQueFalta(fila.datos) };
}

/** Guarda los cambios que hace RRHH. Puede tocar todos los campos. */
function guardarAlta(id, datos) {
  soloAdmin();
  const fila = buscarFila(id);
  if (!fila) throw new Error('Ese alta ya no existe.');

  const fusionados = {};
  CAMPOS.forEach(function (campo) {
    fusionados[campo.clave] = datos[campo.clave] !== undefined
      ? datos[campo.clave]
      : fila.datos[campo.clave];
  });

  const celdas = { 'Actualizado': new Date(), 'Estado': estadoDe(fusionados) };
  CAMPOS.forEach(function (campo) { celdas[campo.etiqueta] = fusionados[campo.clave]; });

  const nombreCarpeta = String(datos.carpeta || '').trim();
  if (nombreCarpeta && nombreCarpeta !== fila.datos['Carpeta']) {
    const carpeta = DriveApp.getFolderById(fila.datos['Carpeta ID']);
    carpeta.setName(nombreCarpeta);
    celdas['Carpeta'] = nombreCarpeta;
  }

  escribirCeldas(fila, celdas);
  return { falta: loQueFalta(fusionados), estado: celdas['Estado'] };
}

/**
 * Guarda en la carpeta del trabajador lo que llegue por WhatsApp: la foto
 * del DNI, un contrato firmado, lo que sea. El documento de identidad se
 * renombra para que todas las carpetas se lean igual; el resto conserva su
 * nombre.
 */
function subirDocumento(id, archivo, esIdentidad) {
  soloAdmin();
  const fila = buscarFila(id);
  if (!fila) throw new Error('Ese alta ya no existe.');

  const carpeta = DriveApp.getFolderById(fila.datos['Carpeta ID']);
  const guardado = esIdentidad
    ? guardarIdentidad(archivo, carpeta, fila.datos['Carpeta'])
    : carpeta.createFile(blobDe(archivo)).getName();

  const celdas = { 'Actualizado': new Date() };
  if (esIdentidad) celdas['Documento'] = guardado;
  escribirCeldas(fila, celdas);

  return { nombre: guardado, carpetaUrl: carpeta.getUrl() };
}

// =====================================================================
// FORMULARIO DEL TRABAJADOR
//
// Un solo formulario para todos, sin enlaces personales. Cada quien se
// identifica con su DNI y con eso se encuentra su fila.
//
// Esta es la única función que puede llamar cualquiera, así que hace lo
// mínimo: escribe, y no devuelve datos de nadie. Tampoco acepta campos del
// contrato aunque lleguen en la petición.
// =====================================================================

function enviarDatosTrabajador(datos, archivo) {
  const limpios = {};
  camposDelTrabajador().forEach(function (campo) {
    limpios[campo.clave] = String(datos[campo.clave] || '').trim();
  });

  const faltan = loQueFalta(limpios);
  if (faltan.length) {
    throw new Error('Faltan datos: ' + faltan.join(', ') + '.');
  }

  let fila = buscarPersona(limpios.dni, limpios.nombre, limpios.apellidos);
  let creado = false;
  if (!fila) {
    // Nadie había abierto su alta: la abre él al enviar sus datos.
    const id = nuevaFila(limpios, '');
    fila = buscarFila(id);
    creado = true;
  }

  const fusionados = {};
  CAMPOS.forEach(function (campo) {
    fusionados[campo.clave] = limpios[campo.clave] !== undefined
      ? limpios[campo.clave]
      : fila.datos[campo.clave];
  });

  const celdas = { 'Actualizado': new Date(), 'Estado': estadoDe(fusionados) };
  camposDelTrabajador().forEach(function (campo) {
    celdas[campo.etiqueta] = fusionados[campo.clave];
  });

  if (archivo && archivo.datos) {
    const carpeta = DriveApp.getFolderById(fila.datos['Carpeta ID']);
    celdas['Documento'] = guardarIdentidad(archivo, carpeta, fila.datos['Carpeta']);
  }

  escribirCeldas(fila, celdas);
  avisarDeQueTermino(fusionados, celdas['Estado']);

  return { creado: creado };
}

function avisarDeQueTermino(datos, estado) {
  if (!AVISAR_A || estado !== 'Completo') return;
  const nombre = [datos.nombre, datos.apellidos].filter(String).join(' ');
  MailApp.sendEmail(AVISAR_A, 'Alta completa: ' + nombre,
    nombre + ' terminó de rellenar sus datos. Ya se puede cargar en Holded.');
}


// =====================================================================
// CARPETA Y DOCUMENTOS
// =====================================================================

function carpetaDelTrabajador(nombre) {
  const raiz = carpetaRaiz();
  const existentes = raiz.getFoldersByName(nombre);
  return existentes.hasNext() ? existentes.next() : raiz.createFolder(nombre);
}

function guardarIdentidad(archivo, carpeta, nombreTrabajador) {
  const extension = (String(archivo.nombre || '').match(/\.[^.]+$/) || ['.jpg'])[0];
  const nombre = 'DNI - ' + nombreTrabajador + extension;

  const previos = carpeta.getFilesByName(nombre);
  while (previos.hasNext()) previos.next().setTrashed(true);

  return carpeta.createFile(blobDe(archivo).setName(nombre)).getName();
}

function blobDe(archivo) {
  return Utilities.newBlob(
    Utilities.base64Decode(archivo.datos),
    archivo.tipo || 'application/octet-stream',
    archivo.nombre || 'documento'
  );
}

/**
 * Propuesta de nombre de carpeta: "Apellido, Nombre". Es solo una propuesta,
 * el panel la deja editar. Los apellidos compuestos y los nombres de dos
 * palabras no se pueden adivinar bien, y las carpetas que ya existen tampoco
 * siguen un patrón único.
 */
function nombreCarpetaPropuesto(datos) {
  const apellido = String(datos.apellidos || '').trim().split(/\s+/)[0] || '';
  const nombre = String(datos.nombre || '').trim().split(/\s+/)[0] || '';
  return [apellido, nombre].filter(String).join(', ');
}


// =====================================================================
// FUNCIÓN 1 - FICHA DE LA GESTORÍA
//
// Se puede generar en cuanto haya lo que la gestoría necesita, aunque el
// trabajador todavía no haya rellenado lo suyo: son justo las altas que
// piden con prisa y pocos datos.
// =====================================================================

function generarFichaGestoria(id) {
  soloAdmin();
  const fila = buscarFila(id);
  if (!fila) throw new Error('Ese alta ya no existe.');

  validar(fila.datos, OBLIGATORIOS_GESTORIA);

  const carpeta = DriveApp.getFolderById(fila.datos['Carpeta ID']);
  const completos = conCamposDerivados(fila.datos);
  const archivo = crearFichaXlsx(completos, carpeta);

  // Las respuestas antiguas traían el documento como enlace de Drive, no
  // como archivo. Se copia ahora, que es cuando hace falta.
  let documento = fila.datos['Documento'];
  if (!documento && fila.datos.documentoUrl) {
    documento = copiarDocumentoDeDrive(fila.datos.documentoUrl, carpeta, fila.datos['Carpeta']);
  }

  escribirCeldas(fila, {
    'Ficha gestoría': new Date(),
    'Actualizado': new Date(),
    'Documento': documento || '',
  });

  return {
    carpeta: fila.datos['Carpeta'],
    carpetaUrl: carpeta.getUrl(),
    ficha: archivo.getName(),
    documento: documento || '',
  };
}

/**
 * Escribe la ficha en un Sheet temporal con el formato del modelo, la
 * exporta a .xlsx dentro de la carpeta del trabajador y borra el temporal.
 * La gestoría recibe un Excel, no un enlace de Google.
 */
function crearFichaXlsx(datos, carpeta) {
  const nombreArchivo = 'Alta Empleado - ' + datos.carpetaNombre + '.xlsx';
  const temporal = SpreadsheetApp.create('temp ficha ' + Date.now());

  try {
    const hoja = temporal.getSheets()[0];
    hoja.setName('FICHAS TRABAJADORES');

    const filas = FICHA_GESTORIA.map(function (definicion, i) {
      const clave = definicion[1];
      if (i === 0) return [definicion[0], 'TRABAJADOR/A'];
      return [definicion[0], clave ? (datos[clave] === undefined ? '' : datos[clave]) : ''];
    });

    hoja.getRange(1, 1, filas.length, 2).setValues(filas);
    hoja.getRange(1, 1, filas.length, 1).setFontWeight('bold');
    hoja.getRange(1, 2).setFontWeight('bold');
    hoja.getRange(8, 1, 1, 2).merge();  // DIRECCIÓN COMPLETA TRABAJADOR
    hoja.setColumnWidth(1, 340);
    hoja.setColumnWidth(2, 320);
    hoja.getRange(1, 2, filas.length, 1).setWrap(true).setVerticalAlignment('top');
    SpreadsheetApp.flush();

    const url = 'https://docs.google.com/spreadsheets/d/' + temporal.getId() + '/export?format=xlsx';
    const respuesta = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (respuesta.getResponseCode() !== 200) {
      throw new Error('No se pudo exportar la ficha a Excel (código ' + respuesta.getResponseCode() + ').');
    }

    // Regenerar la ficha reemplaza la anterior en vez de dejar dos archivos
    // casi iguales en la misma carpeta.
    const previos = carpeta.getFilesByName(nombreArchivo);
    while (previos.hasNext()) previos.next().setTrashed(true);

    return carpeta.createFile(respuesta.getBlob().setName(nombreArchivo));
  } finally {
    DriveApp.getFileById(temporal.getId()).setTrashed(true);
  }
}

/**
 * Copia a la carpeta el documento que venía como enlace en las respuestas
 * antiguas. Si el enlace no se puede abrir no se corta el alta: la ficha ya
 * está generada y lo único que falta es el documento.
 */
function copiarDocumentoDeDrive(url, carpeta, nombreTrabajador) {
  const id = (String(url).match(/[-\w]{25,}/) || [])[0];
  if (!id) return '';

  try {
    const original = DriveApp.getFileById(id);
    const extension = (original.getName().match(/\.[^.]+$/) || [''])[0];
    const nombre = 'DNI - ' + nombreTrabajador + extension;

    const previos = carpeta.getFilesByName(nombre);
    while (previos.hasNext()) previos.next().setTrashed(true);

    return original.makeCopy(nombre, carpeta).getName();
  } catch (e) {
    return '';
  }
}

/**
 * Campos que no se piden pero que la ficha necesita: el nombre completo tal
 * como lo quiere la gestoría y la dirección del centro de trabajo.
 */
function conCamposDerivados(datos) {
  const copia = {};
  Object.keys(datos).forEach(function (k) { copia[k] = datos[k]; });

  copia.nombreCompleto = [datos.nombre, datos.apellidos].filter(String).join(' ').trim();
  copia.centroTrabajo = datos.sede && CENTROS[datos.sede]
    ? datos.sede + ' - ' + CENTROS[datos.sede]
    : (datos.sede || '');
  copia.carpetaNombre = datos['Carpeta'] || nombreCarpetaPropuesto(datos);

  ['fechaNacimiento', 'fechaInicio'].forEach(function (clave) {
    copia[clave] = fechaEspanola(datos[clave]);
  });
  return copia;
}


// =====================================================================
// FUNCIÓN 2 - HOLDED
//
// Dos caminos, independientes de la ficha de la gestoría:
//   - acumularFilaHolded: deja la fila de 26 columnas en la hoja del lote,
//     para exportarlo y subirlo con el importador. Es el camino seguro.
//   - altaEnHolded: crea el empleado por API, sin pasar por el Excel.
// =====================================================================

function acumularFilaHolded(id) {
  soloAdmin();
  const registro = buscarFila(id);
  if (!registro) throw new Error('Ese alta ya no existe.');
  validar(registro.datos, OBLIGATORIOS_HOLDED);

  const hoja = hojaLoteHolded();
  const fila = filaHolded(registro.datos);
  const columnaDni = COLUMNAS_HOLDED.indexOf('Núm. identificación fiscal') + 1;

  let destino = 0;
  if (hoja.getLastRow() > 1) {
    const dnis = hoja.getRange(2, columnaDni, hoja.getLastRow() - 1, 1).getValues();
    const buscado = String(registro.datos.dni).trim().toUpperCase();
    dnis.forEach(function (valor, i) {
      if (String(valor[0]).trim().toUpperCase() === buscado) destino = i + 2;
    });
  }
  const actualizada = destino > 0;
  if (!destino) destino = hoja.getLastRow() + 1;

  hoja.getRange(destino, 1, 1, fila.length).setValues([fila]);
  escribirCeldas(registro, { 'Holded': new Date(), 'Actualizado': new Date() });

  return { url: hoja.getParent().getUrl(), fila: destino, actualizada: actualizada };
}

/**
 * Construye la fila del importador en el orden exacto de COLUMNAS_HOLDED.
 */
function filaHolded(datos) {
  const porColumna = {};
  CAMPOS.forEach(function (campo) {
    if (!campo.holded) return;
    porColumna[campo.holded] = datos[campo.clave] === undefined ? '' : datos[campo.clave];
  });

  porColumna['Fecha nacimiento (dd/mm/aaaa)'] = fechaEspanola(datos.fechaNacimiento);
  porColumna['Género (1: Hombre, 0: Mujer)'] =
    datos.genero === 'Hombre' ? '1' : (datos.genero === 'Mujer' ? '0' : '');

  const esResidente = datos.residenciaFiscal !== 'No residente';
  porColumna['Residencia fiscal (1: Residente, 0: No residente)'] = esResidente ? '1' : '0';
  if (esResidente) {
    CAMPOS.forEach(function (campo) {
      if (campo.soloNoResidente && campo.holded) porColumna[campo.holded] = '';
    });
  }

  return COLUMNAS_HOLDED.map(function (columna) {
    return porColumna[columna] === undefined ? '' : porColumna[columna];
  });
}

function hojaLoteHolded() {
  const libro = libroMaestro();
  let hoja = libro.getSheetByName(HOJA_LOTE_HOLDED);
  if (!hoja) hoja = libro.insertSheet(HOJA_LOTE_HOLDED);
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, COLUMNAS_HOLDED.length)
      .setValues([COLUMNAS_HOLDED]).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/**
 * Da de alta al trabajador en Holded por API.
 *
 * Todo lo específico de la API vive en HOLDED_API, para poder corregir la
 * ruta o el nombre de un campo en un solo sitio. La documentación pública de
 * Holded se movió de sitio y no está confirmada: probarConexionHolded() dice
 * cuál de las rutas responde con la clave real.
 */
const HOLDED_API = {
  base: 'https://api.holded.com/api',
  rutas: ['/team/v1/employees', '/v2/employees'],
  ruta: '/team/v1/employees',
  cabecera: 'key',
};

function altaEnHolded(id) {
  soloAdmin();
  const registro = buscarFila(id);
  if (!registro) throw new Error('Ese alta ya no existe.');
  validar(registro.datos, OBLIGATORIOS_HOLDED);

  const datos = registro.datos;
  const cuerpo = {
    name: datos.nombre,
    lastName: datos.apellidos,
    mainEmail: datos.email || '',
    nifNumber: datos.dni,
    socialSecurityNum: datos.naf || '',
    dateOfBirth: fechaEspanola(datos.fechaNacimiento),
    phone: datos.movil || datos.telefono || '',
    address: datos.calle || '',
    city: datos.municipio || '',
    postalCode: datos.codigoPostal || '',
    province: datos.provincia || '',
    country: datos.pais || 'España',
  };

  const respuesta = UrlFetchApp.fetch(HOLDED_API.base + HOLDED_API.ruta, {
    method: 'post',
    contentType: 'application/json',
    headers: cabeceraHolded(claveHolded()),
    payload: JSON.stringify(cuerpo),
    muteHttpExceptions: true,
  });

  const codigo = respuesta.getResponseCode();
  if (codigo < 200 || codigo >= 300) {
    throw new Error(
      'Holded respondió ' + codigo + ' en ' + HOLDED_API.ruta + ': ' +
      respuesta.getContentText().slice(0, 400) +
      '\n\nSi la ruta es la que falla, ejecuta probarConexionHolded() para ver cuál responde.'
    );
  }

  escribirCeldas(registro, { 'Holded': new Date(), 'Actualizado': new Date() });
  return { respuesta: respuesta.getContentText().slice(0, 400) };
}

/**
 * Prueba las rutas candidatas con un GET y dice cuál responde. Sirve para
 * fijar HOLDED_API.ruta sin adivinar.
 */
function probarConexionHolded() {
  const clave = claveHolded();
  const resultado = HOLDED_API.rutas.map(function (ruta) {
    const respuesta = UrlFetchApp.fetch(HOLDED_API.base + ruta, {
      method: 'get',
      headers: cabeceraHolded(clave),
      muteHttpExceptions: true,
    });
    return ruta + ' -> ' + respuesta.getResponseCode() + ' ' +
      respuesta.getContentText().slice(0, 120);
  });
  Logger.log(resultado.join('\n'));
  return resultado;
}

function cabeceraHolded(clave) {
  const cabeceras = { Accept: 'application/json' };
  cabeceras[HOLDED_API.cabecera] = clave;
  return cabeceras;
}

function claveHolded() {
  const clave = PropertiesService.getScriptProperties().getProperty(PROP_CLAVE_HOLDED);
  if (!clave) {
    throw new Error(
      'Falta la clave de la API de Holded. Cárgala una vez ejecutando ' +
      'guardarClaveHolded(\'tu-clave\') desde el editor de Apps Script.'
    );
  }
  return clave;
}

/** Se ejecuta una sola vez desde el editor. La clave no va al repositorio. */
function guardarClaveHolded(clave) {
  PropertiesService.getScriptProperties().setProperty(PROP_CLAVE_HOLDED, String(clave).trim());
  return 'Clave guardada.';
}


// =====================================================================
// IMPORTAR LAS RESPUESTAS ANTIGUAS
//
// Se ejecuta una sola vez desde el editor, para traer a la hoja maestra lo
// que la gente ya rellenó en el Google Form viejo. Repetirla no duplica:
// quien ya esté por DNI se salta.
// =====================================================================

function importarRespuestasAntiguas() {
  soloAdmin();
  const libro = SpreadsheetApp.openById(RESPUESTAS_ANTIGUAS_ID);
  const origen = libro.getSheets()[0];
  if (origen.getLastRow() < 2) return 'El Sheet antiguo está vacío.';

  const rango = origen.getRange(1, 1, origen.getLastRow(), origen.getLastColumn()).getValues();
  const encabezados = rango[0].map(function (e) { return String(e).trim(); });
  const mapeo = proponerMapeo(encabezados);

  const hoja = hojaTrabajadores();
  const indices = indicesDe(hoja);
  const yaEstan = {};
  if (hoja.getLastRow() > 1) {
    hoja.getRange(2, indices[campoPorClave('dni').etiqueta] + 1, hoja.getLastRow() - 1, 1)
      .getValues().forEach(function (v) {
        const dni = String(v[0]).trim().toUpperCase();
        if (dni) yaEstan[dni] = true;
      });
  }

  let importados = 0;
  let repetidos = 0;
  const nuevas = [];

  rango.slice(1).forEach(function (fila) {
    const datos = {};
    CAMPOS.forEach(function (campo) {
      const encabezado = mapeo[campo.clave];
      const i = encabezado ? encabezados.indexOf(encabezado) : -1;
      datos[campo.clave] = i === -1 ? '' : normalizarValor(fila[i], campo);
    });
    if (!datos.nombre && !datos.apellidos) return;

    const dni = String(datos.dni).trim().toUpperCase();
    if (dni && yaEstan[dni]) { repetidos++; return; }
    if (dni) yaEstan[dni] = true;

    const carpeta = carpetaDelTrabajador(nombreCarpetaPropuesto(datos));
    const valores = new Array(hoja.getLastColumn()).fill('');
    valores[indices['ID']] = Utilities.getUuid();
    valores[indices['Creado']] = new Date();
    valores[indices['Actualizado']] = new Date();
    valores[indices['Estado']] = estadoDe(datos);
    valores[indices['Carpeta']] = carpeta.getName();
    valores[indices['Carpeta ID']] = carpeta.getId();
    CAMPOS.forEach(function (campo) {
      const i = indices[campo.etiqueta];
      if (i !== undefined) valores[i] = datos[campo.clave];
    });
    nuevas.push(valores);
    importados++;
  });

  if (nuevas.length) {
    hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, hoja.getLastColumn())
      .setValues(nuevas);
  }
  const resumen = 'Importados ' + importados + ', repetidos ' + repetidos + '.';
  Logger.log(resumen);
  return resumen;
}

/**
 * Empareja los encabezados del Sheet antiguo con los campos. Gana el
 * sinónimo más largo que aparezca en el encabezado, para que "fecha de
 * nacimiento" no se lleve la columna de "nacimiento" a secas.
 */
function proponerMapeo(encabezados) {
  const propuesta = {};
  const usados = {};

  CAMPOS.forEach(function (campo) {
    let mejor = '';
    let peso = 0;
    encabezados.forEach(function (encabezado) {
      if (usados[encabezado]) return;
      const limpio = sinAcentos(encabezado);
      campo.sinonimos.forEach(function (sinonimo) {
        const s = sinAcentos(sinonimo);
        if (s && limpio.indexOf(s) !== -1 && s.length > peso) {
          mejor = encabezado;
          peso = s.length;
        }
      });
    });
    if (mejor) {
      propuesta[campo.clave] = mejor;
      usados[mejor] = true;
    }
  });
  return propuesta;
}

function normalizarValor(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (campo.tipo === 'fecha') {
    const fecha = valor instanceof Date ? valor : new Date(valor);
    return isNaN(fecha.getTime())
      ? String(valor).trim()
      : Utilities.formatDate(fecha, 'Europe/Madrid', 'yyyy-MM-dd');
  }
  const texto = String(valor).trim();
  if (campo.tipo === 'lista' && campo.opciones) {
    return opcionEquivalente(texto, campo.opciones) || texto;
  }
  return texto;
}

/**
 * Empareja lo que respondió el trabajador con la opción del catálogo. Las
 * respuestas llegan con el número delante ("1- Residente") o sin él, y el
 * catálogo lo lleva en otro formato ("4 - Educación secundaria obligatoria
 * (ESO)"), así que se compara sin ese prefijo.
 *
 * Gana la opción más larga que aparezca dentro del texto: si no, "0- No
 * residente" se quedaría en "Residente", que es justo lo contrario.
 */
function opcionEquivalente(texto, opciones) {
  const buscado = sinPrefijo(texto);
  let encontrada = '';
  let largo = 0;
  opciones.forEach(function (opcion) {
    const o = sinPrefijo(opcion);
    if (o && buscado.indexOf(o) !== -1 && o.length > largo) {
      encontrada = opcion;
      largo = o.length;
    }
  });
  return encontrada;
}


// =====================================================================
// AUXILIARES
// =====================================================================

function campoPorClave(clave) {
  return CAMPOS.find(function (campo) { return campo.clave === clave; });
}

function validar(datos, obligatorios) {
  const faltan = obligatorios.filter(function (clave) {
    return !String(datos[clave] || '').trim();
  });
  if (faltan.length) {
    const etiquetas = faltan.map(function (clave) {
      const campo = campoPorClave(clave);
      return campo ? campo.etiqueta : clave;
    });
    throw new Error('Faltan datos obligatorios: ' + etiquetas.join(', ') + '.');
  }
}

/** Las dos fichas quieren dd/mm/aaaa; los formularios devuelven aaaa-mm-dd. */
function fechaEspanola(valor) {
  if (!valor) return '';
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  return texto;
}

function sinPrefijo(texto) {
  return sinAcentos(String(texto).replace(/^\s*\d+\s*[-.)]*\s*/, ''));
}

function sinAcentos(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')   // los acentos que NFD acaba de separar
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
