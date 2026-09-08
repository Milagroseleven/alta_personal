/**
 * Alta de personal - Sanchoyjote S.L.
 *
 * Arma las dos fichas que hoy se rellenan a mano para cada trabajador nuevo:
 * la del modelo de la gestoría y la del importador de Holded. Los datos
 * salen del Sheet de respuestas del formulario que rellena el personal, y lo
 * que ese formulario no cubre (todo lo del contrato) se completa a mano
 * antes de generar nada.
 *
 * Las dos funciones son independientes: se puede generar la ficha de la
 * gestoría sin tocar Holded, y al revés.
 *
 * CAMPOS es la única fuente de verdad. De ahí salen los campos que dibuja el
 * formulario, el orden de la ficha de la gestoría, las columnas del
 * importador de Holded y los nombres que se intentan reconocer en el Sheet
 * de respuestas.
 */

// ---------------------------------------------------------------------
// CONFIGURACIÓN
//
// El ID es el trozo largo de la URL:
//   hoja    -> docs.google.com/spreadsheets/d/ESTO_ES_EL_ID/edit
//   carpeta -> drive.google.com/drive/folders/ESTO_ES_EL_ID
//
// La clave de la API de Holded NO va aquí: se guarda en las propiedades del
// script para que no acabe en el repositorio. Se carga una sola vez desde el
// editor de Apps Script ejecutando guardarClaveHolded('...'), o desde
// Configuración del proyecto > Propiedades del script, con el nombre
// HOLDED_API_KEY.
// ---------------------------------------------------------------------

// Sheet donde caen las respuestas del formulario que rellena el personal.
const RESPUESTAS_ID = '1zCq_AnPsuLf-h9AaEsjowAacFtGzdMCPKSC8gEFbhkw';

// Pestaña de ese Sheet. Vacío = la primera.
const RESPUESTAS_HOJA = '';

// Carpeta de Drive donde se crea una subcarpeta por trabajador.
// Vacío = se busca (o se crea) "Alta de personal Gestoría" en la unidad de
// la cuenta que despliega el script.
const CARPETA_EMPLEADOS_ID = '';

// Sheet donde se acumulan las filas del importador de Holded, para exportar
// el lote del mes. Vacío = se crea "Altas Holded" dentro de esa carpeta.
const HOJA_HOLDED_ID = '';

const HOJA_HOLDED_PESTANA = 'Holded';

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
// clave     : nombre interno, el que viaja entre el formulario y el servidor.
// etiqueta  : lo que se lee en el formulario.
// grupo     : 'personal' se precarga del Sheet; 'contrato' se rellena a mano
//             porque el formulario del personal no lo pregunta.
// tipo      : texto | fecha | numero | lista | area
// opciones  : para tipo 'lista'.
// sinonimos : encabezados del Sheet de respuestas que se aceptan como este
//             campo. Se comparan sin acentos, sin mayúsculas y sin signos, y
//             basta con que el encabezado los contenga. Es solo la propuesta
//             inicial: el mapeo definitivo se guarda desde la pestaña
//             "Columnas" del formulario.
// holded    : encabezado exacto de la columna del importador de Holded, o
//             null si Holded no pide ese dato.
// ---------------------------------------------------------------------
const CAMPOS = [
  { clave: 'nombre', etiqueta: 'Nombre', grupo: 'personal', tipo: 'texto',
    sinonimos: ['nombre'], holded: 'Nombre' },
  { clave: 'apellidos', etiqueta: 'Apellidos', grupo: 'personal', tipo: 'texto',
    sinonimos: ['apellidos', 'apellido'], holded: 'Apellidos' },
  { clave: 'dni', etiqueta: 'DNI / NIE', grupo: 'personal', tipo: 'texto',
    sinonimos: ['dni', 'nie', 'documento de identidad', 'identificacion fiscal'],
    holded: 'Núm. identificación fiscal' },
  { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', grupo: 'personal', tipo: 'fecha',
    sinonimos: ['fecha de nacimiento', 'nacimiento'],
    holded: 'Fecha nacimiento (dd/mm/aaaa)' },
  { clave: 'naf', etiqueta: 'Número de afiliación a la Seguridad Social', grupo: 'personal', tipo: 'texto',
    sinonimos: ['afiliacion', 'naf', 'seguridad social'],
    holded: 'Número Seguridad Social' },
  { clave: 'nivelFormativo', etiqueta: 'Nivel formativo', grupo: 'personal', tipo: 'lista',
    opciones: NIVELES_FORMATIVOS,
    sinonimos: ['nivel formativo', 'estudios', 'formacion'], holded: null },
  { clave: 'nacionalidad', etiqueta: 'Nacionalidad', grupo: 'personal', tipo: 'texto',
    sinonimos: ['nacionalidad'], holded: 'Nacionalidad' },
  { clave: 'genero', etiqueta: 'Género', grupo: 'personal', tipo: 'lista',
    opciones: ['Hombre', 'Mujer'],
    sinonimos: ['genero', 'sexo'], holded: 'Género (1: Hombre, 0: Mujer)' },
  { clave: 'email', etiqueta: 'Email', grupo: 'personal', tipo: 'texto',
    sinonimos: ['email', 'correo'], holded: 'Email' },
  { clave: 'telefono', etiqueta: 'Teléfono', grupo: 'personal', tipo: 'texto',
    sinonimos: ['telefono fijo', 'telefono'], holded: 'Teléfono' },
  { clave: 'movil', etiqueta: 'Móvil', grupo: 'personal', tipo: 'texto',
    sinonimos: ['movil', 'celular', 'whatsapp'], holded: 'Móvil' },
  { clave: 'cuentaBancaria', etiqueta: 'Número de cuenta bancaria (IBAN)', grupo: 'personal', tipo: 'texto',
    sinonimos: ['cuenta bancaria', 'iban', 'cuenta'],
    holded: 'Número de cuenta bancaria' },
  { clave: 'calle', etiqueta: 'Calle y número', grupo: 'personal', tipo: 'texto',
    sinonimos: ['calle', 'direccion', 'domicilio'], holded: 'Dirección' },
  { clave: 'municipio', etiqueta: 'Municipio', grupo: 'personal', tipo: 'texto',
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
    sinonimos: ['residencia fiscal', 'residente'],
    holded: 'Residencia fiscal (1: Residente, 0: No residente)' },

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

// Campos sin los que no se genera nada.
const OBLIGATORIOS_GESTORIA = ['nombre', 'apellidos', 'dni', 'fechaInicio', 'ocupacion', 'sede'];
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

const PROP_MAPEO = 'MAPEO_COLUMNAS';
const PROP_CLAVE_HOLDED = 'HOLDED_API_KEY';


// =====================================================================
// FORMULARIO
// =====================================================================

function doGet() {
  const plantilla = HtmlService.createTemplateFromFile('Index');
  plantilla.config = JSON.stringify({
    campos: CAMPOS,
    centros: CENTROS,
    fichaGestoria: FICHA_GESTORIA,
    obligatoriosGestoria: OBLIGATORIOS_GESTORIA,
    obligatoriosHolded: OBLIGATORIOS_HOLDED,
  });
  return plantilla
    .evaluate()
    .setTitle('Alta de personal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// =====================================================================
// LECTURA DEL SHEET DE RESPUESTAS
// =====================================================================

/**
 * Devuelve la lista de trabajadores del Sheet de respuestas, de la más
 * reciente a la más antigua. Solo lo necesario para elegir en el desplegable.
 */
function listarTrabajadores() {
  const datos = leerRespuestas();
  const mapeo = obtenerMapeo();

  const lista = datos.filas.map(function (fila, i) {
    const valores = valoresDeFila(fila, datos.encabezados, mapeo);
    const nombre = [valores.nombre, valores.apellidos].filter(String).join(' ').trim();
    return {
      fila: i + 2,  // +1 por el encabezado, +1 porque las filas empiezan en 1
      etiqueta: nombre || '(sin nombre en la fila ' + (i + 2) + ')',
      dni: valores.dni || '',
    };
  });

  lista.reverse();
  return lista;
}

/**
 * Trae una fila del Sheet ya traducida a claves internas, lista para
 * precargar el formulario.
 */
function cargarTrabajador(numeroFila) {
  const datos = leerRespuestas();
  const fila = datos.filas[numeroFila - 2];
  if (!fila) {
    throw new Error('La fila ' + numeroFila + ' ya no existe en el Sheet de respuestas.');
  }
  return valoresDeFila(fila, datos.encabezados, obtenerMapeo());
}

function leerRespuestas() {
  if (!RESPUESTAS_ID) {
    throw new Error('Falta configurar RESPUESTAS_ID en Code.gs.');
  }
  const libro = SpreadsheetApp.openById(RESPUESTAS_ID);
  const hoja = RESPUESTAS_HOJA ? libro.getSheetByName(RESPUESTAS_HOJA) : libro.getSheets()[0];
  if (!hoja) {
    throw new Error('No existe la pestaña "' + RESPUESTAS_HOJA + '" en el Sheet de respuestas.');
  }
  if (hoja.getLastRow() < 2) {
    return { encabezados: [], filas: [] };
  }
  const rango = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
  return {
    encabezados: rango[0].map(function (e) { return String(e).trim(); }),
    filas: rango.slice(1),
  };
}

/**
 * Traduce una fila del Sheet a un objeto con las claves de CAMPOS, usando el
 * mapeo de columnas. Los campos del grupo 'contrato' salen vacíos: no están
 * en el formulario del personal.
 */
function valoresDeFila(fila, encabezados, mapeo) {
  const valores = {};
  CAMPOS.forEach(function (campo) {
    const encabezado = mapeo[campo.clave];
    if (!encabezado) {
      valores[campo.clave] = '';
      return;
    }
    const i = encabezados.indexOf(encabezado);
    valores[campo.clave] = i === -1 ? '' : normalizarValor(fila[i], campo);
  });
  return valores;
}

function normalizarValor(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (campo.tipo === 'fecha') {
    const fecha = valor instanceof Date ? valor : new Date(valor);
    return isNaN(fecha.getTime()) ? String(valor).trim() : Utilities.formatDate(fecha, 'Europe/Madrid', 'yyyy-MM-dd');
  }
  const texto = String(valor).trim();
  if (campo.tipo === 'lista' && campo.opciones) {
    // El formulario del personal puede responder "hombre" u "H" donde la
    // ficha espera "Hombre". Se busca la opción que empiece igual.
    const buscado = sinAcentos(texto);
    const encontrada = campo.opciones.find(function (opcion) {
      const o = sinAcentos(opcion);
      return o === buscado || o.indexOf(buscado) === 0 || buscado.indexOf(o) === 0;
    });
    return encontrada || texto;
  }
  return texto;
}


// =====================================================================
// MAPEO DE COLUMNAS
//
// El formulario que rellena el personal cambia de encabezados cada vez que
// alguien lo edita, así que el mapeo no se puede dar por fijo. Se propone
// uno por sinónimos y se guarda el definitivo en las propiedades del script.
// =====================================================================

function obtenerEncabezados() {
  return leerRespuestas().encabezados;
}

/**
 * Mapeo guardado, completado con la propuesta automática para los campos
 * que nadie ha asignado todavía.
 */
function obtenerMapeo() {
  const guardado = PropertiesService.getScriptProperties().getProperty(PROP_MAPEO);
  const mapeo = guardado ? JSON.parse(guardado) : {};
  const encabezados = leerRespuestas().encabezados;
  const automatico = proponerMapeo(encabezados);

  CAMPOS.forEach(function (campo) {
    if (mapeo[campo.clave] === undefined) {
      mapeo[campo.clave] = automatico[campo.clave] || '';
    }
    // Un encabezado que ya no existe se descarta: el formulario lo cambió.
    if (mapeo[campo.clave] && encabezados.indexOf(mapeo[campo.clave]) === -1) {
      mapeo[campo.clave] = automatico[campo.clave] || '';
    }
  });
  return mapeo;
}

/**
 * Propone qué columna del Sheet alimenta cada campo. Gana el sinónimo más
 * largo que aparezca en el encabezado, para que "fecha de nacimiento" no se
 * lleve la columna de "nacimiento" a secas y viceversa.
 */
function proponerMapeo(encabezados) {
  const propuesta = {};
  const usados = {};

  CAMPOS.forEach(function (campo) {
    let mejor = '';
    let mejorPeso = 0;
    encabezados.forEach(function (encabezado) {
      if (usados[encabezado]) return;
      const limpio = sinAcentos(encabezado);
      campo.sinonimos.forEach(function (sinonimo) {
        const s = sinAcentos(sinonimo);
        if (limpio.indexOf(s) !== -1 && s.length > mejorPeso) {
          mejor = encabezado;
          mejorPeso = s.length;
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

function guardarMapeo(mapeo) {
  PropertiesService.getScriptProperties().setProperty(PROP_MAPEO, JSON.stringify(mapeo));
  return 'Mapeo guardado.';
}

/**
 * Para la pestaña "Columnas": los encabezados reales del Sheet, el mapeo
 * vigente y qué campos se quedaron sin columna.
 */
function estadoMapeo() {
  const encabezados = obtenerEncabezados();
  const mapeo = obtenerMapeo();
  const sinAsignar = CAMPOS
    .filter(function (c) { return c.grupo === 'personal' && !mapeo[c.clave]; })
    .map(function (c) { return c.etiqueta; });
  return { encabezados: encabezados, mapeo: mapeo, sinAsignar: sinAsignar };
}


// =====================================================================
// FUNCIÓN 1 - FICHA DE LA GESTORÍA
// =====================================================================

/**
 * Crea la carpeta del trabajador, genera la ficha con el formato del modelo
 * y guarda dentro el documento de identidad. No toca Holded.
 *
 * documento: { nombre, tipo, datos } en base64, o null si no se adjunta.
 */
function generarFichaGestoria(datos, documento) {
  validar(datos, OBLIGATORIOS_GESTORIA);

  const carpeta = carpetaDelTrabajador(datos.carpeta || nombreCarpeta(datos));
  const completos = conCamposDerivados(datos);

  const archivo = crearFichaXlsx(completos, carpeta);

  let docGuardado = '';
  if (documento && documento.datos) {
    docGuardado = guardarDocumento(documento, carpeta, completos.carpetaNombre);
  }

  return {
    carpeta: carpeta.getName(),
    carpetaUrl: carpeta.getUrl(),
    ficha: archivo.getName(),
    fichaUrl: archivo.getUrl(),
    documento: docGuardado,
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

    // Regenerar la ficha de alguien reemplaza la anterior en vez de dejar
    // dos archivos casi iguales en la misma carpeta.
    const previos = carpeta.getFilesByName(nombreArchivo);
    while (previos.hasNext()) previos.next().setTrashed(true);

    return carpeta.createFile(respuesta.getBlob().setName(nombreArchivo));
  } finally {
    DriveApp.getFileById(temporal.getId()).setTrashed(true);
  }
}

function guardarDocumento(documento, carpeta, nombreTrabajador) {
  const extension = (documento.nombre.match(/\.[^.]+$/) || ['.jpg'])[0];
  const nombre = 'DNI - ' + nombreTrabajador + extension;

  const previos = carpeta.getFilesByName(nombre);
  while (previos.hasNext()) previos.next().setTrashed(true);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(documento.datos),
    documento.tipo || 'application/octet-stream',
    nombre
  );
  return carpeta.createFile(blob).getName();
}

/**
 * Carpeta "Apellido, Nombre" dentro de la carpeta de altas. Si ya existe se
 * reutiliza: para un trabajador que ya pasó por aquí no se crea una segunda.
 */
function carpetaDelTrabajador(nombre) {
  const raiz = carpetaRaiz();
  const existentes = raiz.getFoldersByName(nombre);
  return existentes.hasNext() ? existentes.next() : raiz.createFolder(nombre);
}

function carpetaRaiz() {
  if (CARPETA_EMPLEADOS_ID) return DriveApp.getFolderById(CARPETA_EMPLEADOS_ID);
  const existentes = DriveApp.getFoldersByName('Alta de personal Gestoría');
  return existentes.hasNext() ? existentes.next() : DriveApp.createFolder('Alta de personal Gestoría');
}

/**
 * Propuesta de nombre de carpeta: "Apellido, Nombre". Es solo una propuesta,
 * el formulario la deja editar. Los apellidos compuestos y los nombres de
 * dos palabras no se pueden adivinar bien, y las carpetas que ya existen
 * tampoco siguen un patrón único.
 */
function nombreCarpeta(datos) {
  const primerApellido = String(datos.apellidos || '').trim().split(/\s+/)[0] || '';
  const primerNombre = String(datos.nombre || '').trim().split(/\s+/)[0] || '';
  return [primerApellido, primerNombre].filter(String).join(', ');
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
  copia.carpetaNombre = datos.carpeta || nombreCarpeta(datos);

  ['fechaNacimiento', 'fechaInicio'].forEach(function (clave) {
    copia[clave] = fechaEspanola(datos[clave]);
  });
  return copia;
}


// =====================================================================
// FUNCIÓN 2 - HOLDED
//
// Dos caminos, independientes de la ficha de la gestoría:
//   - acumularFilaHolded: deja la fila de 26 columnas en el Sheet del lote,
//     para exportarlo y subirlo con el importador. Es el camino seguro.
//   - altaEnHolded: crea el empleado por API, sin pasar por el Excel.
// =====================================================================

/**
 * Añade el trabajador al Sheet del lote de Holded. Si ya está (mismo número
 * de identificación fiscal), se actualiza su fila en vez de duplicarla.
 */
function acumularFilaHolded(datos) {
  validar(datos, OBLIGATORIOS_HOLDED);

  const hoja = hojaHolded();
  const fila = filaHolded(datos);
  const columnaDni = COLUMNAS_HOLDED.indexOf('Núm. identificación fiscal') + 1;

  let destino = 0;
  if (hoja.getLastRow() > 1) {
    const dnis = hoja.getRange(2, columnaDni, hoja.getLastRow() - 1, 1).getValues();
    const buscado = String(datos.dni).trim().toUpperCase();
    dnis.forEach(function (valor, i) {
      if (String(valor[0]).trim().toUpperCase() === buscado) destino = i + 2;
    });
  }
  const actualizada = destino > 0;
  if (!destino) destino = hoja.getLastRow() + 1;

  hoja.getRange(destino, 1, 1, fila.length).setValues([fila]);

  return {
    hoja: hoja.getParent().getName(),
    url: hoja.getParent().getUrl(),
    fila: destino,
    actualizada: actualizada,
  };
}

/**
 * Construye la fila del importador en el orden exacto de COLUMNAS_HOLDED.
 * El bloque de "No residente" solo se rellena si corresponde: si se manda
 * relleno con residencia fiscal 1, Holded lo rechaza.
 */
function filaHolded(datos) {
  const porColumna = {};
  CAMPOS.forEach(function (campo) {
    if (!campo.holded) return;
    porColumna[campo.holded] = datos[campo.clave] === undefined ? '' : datos[campo.clave];
  });

  porColumna['Fecha nacimiento (dd/mm/aaaa)'] = fechaEspanola(datos.fechaNacimiento);
  porColumna['Género (1: Hombre, 0: Mujer)'] = datos.genero === 'Hombre' ? '1' : (datos.genero === 'Mujer' ? '0' : '');

  const esResidente = datos.residenciaFiscal !== 'No residente';
  porColumna['Residencia fiscal (1: Residente, 0: No residente)'] = esResidente ? '1' : '0';
  if (esResidente) {
    ['Dirección No residente', 'Población No residente', 'Código postal No residente',
     'Provincia No residente', 'País No residente', 'Núm. identificación fiscal No residente',
     'Fin de situación no-residente'].forEach(function (columna) {
      porColumna[columna] = '';
    });
  }

  return COLUMNAS_HOLDED.map(function (columna) {
    return porColumna[columna] === undefined ? '' : porColumna[columna];
  });
}

function hojaHolded() {
  let libro;
  if (HOJA_HOLDED_ID) {
    libro = SpreadsheetApp.openById(HOJA_HOLDED_ID);
  } else {
    const carpeta = carpetaRaiz();
    const existentes = carpeta.getFilesByName('Altas Holded');
    if (existentes.hasNext()) {
      libro = SpreadsheetApp.open(existentes.next());
    } else {
      libro = SpreadsheetApp.create('Altas Holded');
      const archivo = DriveApp.getFileById(libro.getId());
      carpeta.addFile(archivo);
      DriveApp.getRootFolder().removeFile(archivo);
    }
  }

  let hoja = libro.getSheetByName(HOJA_HOLDED_PESTANA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA_HOLDED_PESTANA);
  }
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, COLUMNAS_HOLDED.length)
      .setValues([COLUMNAS_HOLDED])
      .setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/**
 * Da de alta al trabajador en Holded por API.
 *
 * Todo lo específico de la API vive en HOLDED_API, para poder corregir la
 * ruta o el nombre de un campo en un solo sitio. La documentación pública de
 * Holded se movió de sitio y no está confirmada: probarConexionHolded()
 * dice cuál de las rutas responde con la clave real.
 */
const HOLDED_API = {
  base: 'https://api.holded.com/api',
  rutas: ['/team/v1/employees', '/v2/employees'],
  ruta: '/team/v1/employees',
  cabecera: 'key',
};

function altaEnHolded(datos) {
  validar(datos, OBLIGATORIOS_HOLDED);
  const clave = claveHolded();

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
    headers: cabeceraHolded(clave),
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
// AUXILIARES
// =====================================================================

function validar(datos, obligatorios) {
  const faltan = obligatorios.filter(function (clave) {
    return !String(datos[clave] || '').trim();
  });
  if (faltan.length) {
    const etiquetas = faltan.map(function (clave) {
      const campo = CAMPOS.find(function (c) { return c.clave === clave; });
      return campo ? campo.etiqueta : clave;
    });
    throw new Error('Faltan datos obligatorios: ' + etiquetas.join(', ') + '.');
  }
}

/** Las dos fichas quieren dd/mm/aaaa; el formulario devuelve aaaa-mm-dd. */
function fechaEspanola(valor) {
  if (!valor) return '';
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  return texto;
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
