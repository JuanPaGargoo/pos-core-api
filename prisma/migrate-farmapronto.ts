/**
 * Migración de la base FarmaPronto (Laravel) a la nueva estructura del POS.
 *
 * - Limpia el catálogo y ventas de prueba (conserva el seed: usuarios base,
 *   sucursal, almacén, unidades, métodos de pago, permisos, secuencias).
 * - Importa los 1026 productos reclasificando su categoría por principio
 *   activo (el viejo campo "categoria" tenía casi todo como "Otro").
 * - Importa los 3 usuarios y el historial de 542 ventas con sus renglones.
 *
 * Ejecutar con:  npx tsx prisma/migrate-farmapronto.ts
 */
import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

// Se ejecuta desde la carpeta pos-core-api; el respaldo está un nivel arriba.
const DUMP_PATH = join(process.cwd(), '..', 'farmapronto_2026-05-17_1736.sql');

// Constantes del seed (ya existen en la base).
const BRANCH_ID = 1;
const WAREHOUSE_ID = 1;
const UNIT_ID = 1; // Pieza
const PRICE_LIST_ID = 1; // Público (default)
const CASH_METHOD_ID = 1; // Efectivo
const ROLE_ADMIN = 1;
const ROLE_CASHIER = 3;

// ── Parser del formato COPY de pg_dump ─────────────────────────
function unescapeCopy(v: string): string {
  return v
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');
}

function parseCopy(sql: string, table: string): (string | null)[][] {
  const head = `COPY public.${table} (`;
  const hi = sql.indexOf(head);
  if (hi < 0) return [];
  const fromIdx = sql.indexOf('FROM stdin;', hi);
  const dataStart = sql.indexOf('\n', fromIdx) + 1;
  const dataEnd = sql.indexOf('\n\\.', dataStart);
  const block = sql.slice(dataStart, dataEnd);
  if (!block) return [];
  return block
    .split('\n')
    .filter((l) => l.length > 0)
    .map((line) =>
      line.split('\t').map((c) => (c === '\\N' ? null : unescapeCopy(c))),
    );
}

const DIACRITICS = /[̀-ͯ]/g;
const norm = (s: string) =>
  s.toUpperCase().normalize('NFD').replace(DIACRITICS, '');

// ── Reclasificación de categorías por principio activo ─────────
const CATEGORIES = [
  'Antibióticos',
  'Analgésicos',
  'Antiinflamatorios',
  'Antigripales y Tos',
  'Antialérgicos',
  'Gastrointestinal',
  'Cardiovascular',
  'Diabetes',
  'Vitaminas y Suplementos',
  'Dermatológicos',
  'Hormonales y Tiroides',
  'Antiparasitarios',
  'Sistema Nervioso',
  'Antivirales',
  'Curación y Primeros Auxilios',
  'Equipo Médico y Accesorios',
  'General',
];

// Mapeo de la categoría vieja (cuando no se reconoce el principio activo).
const OLD_CATEGORY: Record<string, string> = {
  Antibiótico: 'Antibióticos',
  Analgésico: 'Analgésicos',
  Antiinflamatorio: 'Antiinflamatorios',
  Antihistamínico: 'Antialérgicos',
  Antihipertensivo: 'Cardiovascular',
  Antigripal: 'Antigripales y Tos',
  Antiviral: 'Antivirales',
  Antidiarreico: 'Gastrointestinal',
  Laxante: 'Gastrointestinal',
  'Vitaminas y Suplementos': 'Vitaminas y Suplementos',
  'Curación y Primeros Auxilios': 'Curación y Primeros Auxilios',
  'Equipamiento Médico y Accesorios': 'Equipo Médico y Accesorios',
};

// Principio activo (sin acentos, mayúsculas) → categoría. Primer match gana.
const INGREDIENTS: [string, string][] = [
  // Antibióticos
  ['AMOXICILINA', 'Antibióticos'],
  ['AMPICILINA', 'Antibióticos'],
  ['DICLOXACILINA', 'Antibióticos'],
  ['CLAVULANICO', 'Antibióticos'],
  ['SULBACTAM', 'Antibióticos'],
  ['PENICILINA', 'Antibióticos'],
  ['CEFALEXINA', 'Antibióticos'],
  ['CEFUROXIMA', 'Antibióticos'],
  ['CEFTRIAXONA', 'Antibióticos'],
  ['CEFIXIMA', 'Antibióticos'],
  ['CEFACLOR', 'Antibióticos'],
  ['CEFADROXILO', 'Antibióticos'],
  ['CEFOTAXIMA', 'Antibióticos'],
  ['CEFEPIMA', 'Antibióticos'],
  ['AZITROMICINA', 'Antibióticos'],
  ['ERITROMICINA', 'Antibióticos'],
  ['CLARITROMICINA', 'Antibióticos'],
  ['CIPROFLOXACINO', 'Antibióticos'],
  ['LEVOFLOXACINO', 'Antibióticos'],
  ['NORFLOXACINO', 'Antibióticos'],
  ['OFLOXACINO', 'Antibióticos'],
  ['MOXIFLOXACINO', 'Antibióticos'],
  ['GATIFLOXACINO', 'Antibióticos'],
  ['TRIMETOPRIMA', 'Antibióticos'],
  ['SULFAMETOXAZOL', 'Antibióticos'],
  ['METRONIDAZOL', 'Antibióticos'],
  ['CLINDAMICINA', 'Antibióticos'],
  ['GENTAMICINA', 'Antibióticos'],
  ['AMIKACINA', 'Antibióticos'],
  ['NEOMICINA', 'Antibióticos'],
  ['DOXICICLINA', 'Antibióticos'],
  ['MINOCICLINA', 'Antibióticos'],
  ['TETRACICLINA', 'Antibióticos'],
  ['NITROFURANTOINA', 'Antibióticos'],
  ['FOSFOMICINA', 'Antibióticos'],
  ['RIFAMPICINA', 'Antibióticos'],
  ['CLORANFENICOL', 'Antibióticos'],
  ['LINEZOLID', 'Antibióticos'],
  ['VANCOMICINA', 'Antibióticos'],
  // Antivirales
  ['ACICLOVIR', 'Antivirales'],
  ['VALACICLOVIR', 'Antivirales'],
  ['OSELTAMIVIR', 'Antivirales'],
  ['ZANAMIVIR', 'Antivirales'],
  // Antiparasitarios
  ['ALBENDAZOL', 'Antiparasitarios'],
  ['MEBENDAZOL', 'Antiparasitarios'],
  ['NITAZOXANIDA', 'Antiparasitarios'],
  ['IVERMECTINA', 'Antiparasitarios'],
  ['PRAZIQUANTEL', 'Antiparasitarios'],
  ['PIRANTEL', 'Antiparasitarios'],
  ['SECNIDAZOL', 'Antiparasitarios'],
  ['TINIDAZOL', 'Antiparasitarios'],
  ['QUINFAMIDA', 'Antiparasitarios'],
  ['NIFUROXAZIDA', 'Antiparasitarios'],
  // Antialérgicos
  ['LORATADINA', 'Antialérgicos'],
  ['DESLORATADINA', 'Antialérgicos'],
  ['CETIRIZINA', 'Antialérgicos'],
  ['LEVOCETIRIZINA', 'Antialérgicos'],
  ['CLORFENAMINA', 'Antialérgicos'],
  ['CLORFENIRAMINA', 'Antialérgicos'],
  ['DIFENHIDRAMINA', 'Antialérgicos'],
  ['FEXOFENADINA', 'Antialérgicos'],
  ['HIDROXIZINA', 'Antialérgicos'],
  ['EBASTINA', 'Antialérgicos'],
  ['BILASTINA', 'Antialérgicos'],
  ['CLEMASTINA', 'Antialérgicos'],
  ['EPINASTINA', 'Antialérgicos'],
  // Antigripales y Tos
  ['AMBROXOL', 'Antigripales y Tos'],
  ['BROMHEXINA', 'Antigripales y Tos'],
  ['DEXTROMETORFANO', 'Antigripales y Tos'],
  ['GUAIFENESINA', 'Antigripales y Tos'],
  ['ACETILCISTEINA', 'Antigripales y Tos'],
  ['CARBOCISTEINA', 'Antigripales y Tos'],
  ['FENILEFRINA', 'Antigripales y Tos'],
  ['PSEUDOEFEDRINA', 'Antigripales y Tos'],
  ['OXIMETAZOLINA', 'Antigripales y Tos'],
  ['CLENBUTEROL', 'Antigripales y Tos'],
  ['SALBUTAMOL', 'Antigripales y Tos'],
  ['DEXBROMFENIRAMINA', 'Antigripales y Tos'],
  // Antiinflamatorios y corticoides
  ['IBUPROFENO', 'Antiinflamatorios'],
  ['NAPROXENO', 'Antiinflamatorios'],
  ['DICLOFENACO', 'Antiinflamatorios'],
  ['KETOPROFENO', 'Antiinflamatorios'],
  ['MELOXICAM', 'Antiinflamatorios'],
  ['PIROXICAM', 'Antiinflamatorios'],
  ['CELECOXIB', 'Antiinflamatorios'],
  ['ETORICOXIB', 'Antiinflamatorios'],
  ['NIMESULIDA', 'Antiinflamatorios'],
  ['INDOMETACINA', 'Antiinflamatorios'],
  ['BETAMETASONA', 'Antiinflamatorios'],
  ['DEXAMETASONA', 'Antiinflamatorios'],
  ['PREDNISONA', 'Antiinflamatorios'],
  ['PREDNISOLONA', 'Antiinflamatorios'],
  ['HIDROCORTISONA', 'Antiinflamatorios'],
  ['METILPREDNISOLONA', 'Antiinflamatorios'],
  ['DEFLAZACORT', 'Antiinflamatorios'],
  ['ETOFENAMATO', 'Antiinflamatorios'],
  // Analgésicos
  ['PARACETAMOL', 'Analgésicos'],
  ['ACETAMINOFEN', 'Analgésicos'],
  ['ACIDO ACETILSALICILICO', 'Analgésicos'],
  ['ACETILSALICILICO', 'Analgésicos'],
  ['METAMIZOL', 'Analgésicos'],
  ['DIPIRONA', 'Analgésicos'],
  ['TRAMADOL', 'Analgésicos'],
  ['KETOROLACO', 'Analgésicos'],
  ['BUPRENORFINA', 'Analgésicos'],
  ['NALBUFINA', 'Analgésicos'],
  ['CLONIXINATO', 'Analgésicos'],
  ['PARACETAMOL', 'Analgésicos'],
  // Gastrointestinal
  ['OMEPRAZOL', 'Gastrointestinal'],
  ['PANTOPRAZOL', 'Gastrointestinal'],
  ['ESOMEPRAZOL', 'Gastrointestinal'],
  ['LANSOPRAZOL', 'Gastrointestinal'],
  ['RABEPRAZOL', 'Gastrointestinal'],
  ['RANITIDINA', 'Gastrointestinal'],
  ['FAMOTIDINA', 'Gastrointestinal'],
  ['LOPERAMIDA', 'Gastrointestinal'],
  ['METOCLOPRAMIDA', 'Gastrointestinal'],
  ['DOMPERIDONA', 'Gastrointestinal'],
  ['ONDANSETRON', 'Gastrointestinal'],
  ['CISAPRIDA', 'Gastrointestinal'],
  ['BUTILHIOSCINA', 'Gastrointestinal'],
  ['HIOSCINA', 'Gastrointestinal'],
  ['TRIMEBUTINA', 'Gastrointestinal'],
  ['SUCRALFATO', 'Gastrointestinal'],
  ['BISACODILO', 'Gastrointestinal'],
  ['LACTULOSA', 'Gastrointestinal'],
  ['PICOSULFATO', 'Gastrointestinal'],
  ['MEBEVERINA', 'Gastrointestinal'],
  ['SIMETICONA', 'Gastrointestinal'],
  ['PINAVERIO', 'Gastrointestinal'],
  ['RACECADOTRILO', 'Gastrointestinal'],
  ['SUBSALICILATO', 'Gastrointestinal'],
  ['SENNA', 'Gastrointestinal'],
  ['SENOSIDOS', 'Gastrointestinal'],
  ['MAGNESIA', 'Gastrointestinal'],
  ['ALUMINIO Y MAGNESIO', 'Gastrointestinal'],
  // Cardiovascular
  ['AMLODIPINO', 'Cardiovascular'],
  ['NIFEDIPINO', 'Cardiovascular'],
  ['FELODIPINO', 'Cardiovascular'],
  ['LOSARTAN', 'Cardiovascular'],
  ['TELMISARTAN', 'Cardiovascular'],
  ['VALSARTAN', 'Cardiovascular'],
  ['IRBESARTAN', 'Cardiovascular'],
  ['CANDESARTAN', 'Cardiovascular'],
  ['ENALAPRIL', 'Cardiovascular'],
  ['CAPTOPRIL', 'Cardiovascular'],
  ['LISINOPRIL', 'Cardiovascular'],
  ['RAMIPRIL', 'Cardiovascular'],
  ['METOPROLOL', 'Cardiovascular'],
  ['PROPRANOLOL', 'Cardiovascular'],
  ['ATENOLOL', 'Cardiovascular'],
  ['BISOPROLOL', 'Cardiovascular'],
  ['CARVEDILOL', 'Cardiovascular'],
  ['HIDROCLOROTIAZIDA', 'Cardiovascular'],
  ['FUROSEMIDA', 'Cardiovascular'],
  ['ESPIRONOLACTONA', 'Cardiovascular'],
  ['CLORTALIDONA', 'Cardiovascular'],
  ['ATORVASTATINA', 'Cardiovascular'],
  ['ROSUVASTATINA', 'Cardiovascular'],
  ['SIMVASTATINA', 'Cardiovascular'],
  ['PRAVASTATINA', 'Cardiovascular'],
  ['EZETIMIBA', 'Cardiovascular'],
  ['CLOPIDOGREL', 'Cardiovascular'],
  ['WARFARINA', 'Cardiovascular'],
  ['DIGOXINA', 'Cardiovascular'],
  ['ISOSORBIDE', 'Cardiovascular'],
  ['BEZAFIBRATO', 'Cardiovascular'],
  ['PRAVASTATINA', 'Cardiovascular'],
  // Diabetes
  ['METFORMINA', 'Diabetes'],
  ['GLIBENCLAMIDA', 'Diabetes'],
  ['GLIMEPIRIDA', 'Diabetes'],
  ['INSULINA', 'Diabetes'],
  ['SITAGLIPTINA', 'Diabetes'],
  ['LINAGLIPTINA', 'Diabetes'],
  ['VILDAGLIPTINA', 'Diabetes'],
  ['DAPAGLIFLOZINA', 'Diabetes'],
  ['EMPAGLIFLOZINA', 'Diabetes'],
  ['PIOGLITAZONA', 'Diabetes'],
  ['ACARBOSA', 'Diabetes'],
  // Hormonales y Tiroides
  ['LEVOTIROXINA', 'Hormonales y Tiroides'],
  ['METIMAZOL', 'Hormonales y Tiroides'],
  ['LEVONORGESTREL', 'Hormonales y Tiroides'],
  ['ETINILESTRADIOL', 'Hormonales y Tiroides'],
  ['DESOGESTREL', 'Hormonales y Tiroides'],
  ['NORETISTERONA', 'Hormonales y Tiroides'],
  ['MEDROXIPROGESTERONA', 'Hormonales y Tiroides'],
  ['DROSPIRENONA', 'Hormonales y Tiroides'],
  ['ESTRADIOL', 'Hormonales y Tiroides'],
  ['PROGESTERONA', 'Hormonales y Tiroides'],
  ['TESTOSTERONA', 'Hormonales y Tiroides'],
  ['TIBOLONA', 'Hormonales y Tiroides'],
  ['FINASTERIDE', 'Hormonales y Tiroides'],
  // Sistema Nervioso
  ['DIAZEPAM', 'Sistema Nervioso'],
  ['ALPRAZOLAM', 'Sistema Nervioso'],
  ['CLONAZEPAM', 'Sistema Nervioso'],
  ['LORAZEPAM', 'Sistema Nervioso'],
  ['SERTRALINA', 'Sistema Nervioso'],
  ['FLUOXETINA', 'Sistema Nervioso'],
  ['PAROXETINA', 'Sistema Nervioso'],
  ['ESCITALOPRAM', 'Sistema Nervioso'],
  ['CITALOPRAM', 'Sistema Nervioso'],
  ['AMITRIPTILINA', 'Sistema Nervioso'],
  ['CARBAMAZEPINA', 'Sistema Nervioso'],
  ['FENITOINA', 'Sistema Nervioso'],
  ['VALPROICO', 'Sistema Nervioso'],
  ['GABAPENTINA', 'Sistema Nervioso'],
  ['PREGABALINA', 'Sistema Nervioso'],
  ['HALOPERIDOL', 'Sistema Nervioso'],
  ['RISPERIDONA', 'Sistema Nervioso'],
  ['OLANZAPINA', 'Sistema Nervioso'],
  ['ZOLPIDEM', 'Sistema Nervioso'],
  ['LEVETIRACETAM', 'Sistema Nervioso'],
  ['MELATONINA', 'Sistema Nervioso'],
  // Dermatológicos / antifúngicos tópicos
  ['CLOTRIMAZOL', 'Dermatológicos'],
  ['KETOCONAZOL', 'Dermatológicos'],
  ['MICONAZOL', 'Dermatológicos'],
  ['ISOCONAZOL', 'Dermatológicos'],
  ['TERBINAFINA', 'Dermatológicos'],
  ['ITRACONAZOL', 'Dermatológicos'],
  ['FLUCONAZOL', 'Dermatológicos'],
  ['NISTATINA', 'Dermatológicos'],
  ['MUPIROCINA', 'Dermatológicos'],
  ['FUSIDICO', 'Dermatológicos'],
  ['CALAMINA', 'Dermatológicos'],
  ['OXIDO DE ZINC', 'Dermatológicos'],
  ['CLIOQUINOL', 'Dermatológicos'],
  // Vitaminas y Suplementos
  ['VITAMINA', 'Vitaminas y Suplementos'],
  ['COMPLEJO B', 'Vitaminas y Suplementos'],
  ['ACIDO FOLICO', 'Vitaminas y Suplementos'],
  ['ACIDO ASCORBICO', 'Vitaminas y Suplementos'],
  ['ASCORBICO', 'Vitaminas y Suplementos'],
  ['MULTIVITAMINICO', 'Vitaminas y Suplementos'],
  ['TIAMINA', 'Vitaminas y Suplementos'],
  ['PIRIDOXINA', 'Vitaminas y Suplementos'],
  ['CIANOCOBALAMINA', 'Vitaminas y Suplementos'],
  ['CALCIO', 'Vitaminas y Suplementos'],
  ['HIERRO', 'Vitaminas y Suplementos'],
  ['SULFATO FERROSO', 'Vitaminas y Suplementos'],
  ['ZINC', 'Vitaminas y Suplementos'],
  ['OMEGA', 'Vitaminas y Suplementos'],
  ['ELECTROLITOS', 'Vitaminas y Suplementos'],
  ['SUERO', 'Vitaminas y Suplementos'],
  ['CALCITRIOL', 'Vitaminas y Suplementos'],
  ['COLECALCIFEROL', 'Vitaminas y Suplementos'],
  ['ERGOCALCIFEROL', 'Vitaminas y Suplementos'],
  ['BIOTINA', 'Vitaminas y Suplementos'],
  ['GLUCOSAMINA', 'Vitaminas y Suplementos'],
  ['CONDROITINA', 'Vitaminas y Suplementos'],
  ['COLAGENO', 'Vitaminas y Suplementos'],
  ['RETINOL', 'Vitaminas y Suplementos'],
  // Antibióticos adicionales
  ['CEFTAZIDIMA', 'Antibióticos'],
  ['CEFALOTINA', 'Antibióticos'],
  ['CEFOPERAZONA', 'Antibióticos'],
  ['CEFPODOXIMA', 'Antibióticos'],
  ['CLOXACILINA', 'Antibióticos'],
  ['FLUCLOXACILINA', 'Antibióticos'],
  ['MEROPENEM', 'Antibióticos'],
  ['IMIPENEM', 'Antibióticos'],
  ['ERTAPENEM', 'Antibióticos'],
  ['TOBRAMICINA', 'Antibióticos'],
  ['TINIDAZOL', 'Antibióticos'],
  ['ESPECTINOMICINA', 'Antibióticos'],
  // Sistema Nervioso adicionales
  ['DULOXETINA', 'Sistema Nervioso'],
  ['VENLAFAXINA', 'Sistema Nervioso'],
  ['MIRTAZAPINA', 'Sistema Nervioso'],
  ['BUSPIRONA', 'Sistema Nervioso'],
  ['BIPERIDENO', 'Sistema Nervioso'],
  ['TRIHEXIFENIDILO', 'Sistema Nervioso'],
  ['LEVODOPA', 'Sistema Nervioso'],
  ['PRAMIPEXOL', 'Sistema Nervioso'],
  ['FLUNARIZINA', 'Sistema Nervioso'],
  ['BETAHISTINA', 'Sistema Nervioso'],
  ['CINARIZINA', 'Sistema Nervioso'],
  ['SULPIRIDA', 'Sistema Nervioso'],
  ['TOPIRAMATO', 'Sistema Nervioso'],
  ['LAMOTRIGINA', 'Sistema Nervioso'],
  ['OXCARBAZEPINA', 'Sistema Nervioso'],
  ['QUETIAPINA', 'Sistema Nervioso'],
  ['ARIPIPRAZOL', 'Sistema Nervioso'],
  ['MEMANTINA', 'Sistema Nervioso'],
  ['DONEPECILO', 'Sistema Nervioso'],
  ['CLOBAZAM', 'Sistema Nervioso'],
  ['MIDAZOLAM', 'Sistema Nervioso'],
  // Antigripales y Tos adicionales
  ['BENZONATATO', 'Antigripales y Tos'],
  ['MONTELUKAST', 'Antigripales y Tos'],
  ['BUDESONIDA', 'Antigripales y Tos'],
  ['BECLOMETASONA', 'Antigripales y Tos'],
  ['FORMOTEROL', 'Antigripales y Tos'],
  ['IPRATROPIO', 'Antigripales y Tos'],
  ['TEOFILINA', 'Antigripales y Tos'],
  ['AMINOFILINA', 'Antigripales y Tos'],
  ['BUTAMIRATO', 'Antigripales y Tos'],
  // Gastrointestinal adicionales
  ['CINITAPRIDA', 'Gastrointestinal'],
  ['CLEBOPRIDA', 'Gastrointestinal'],
  ['ITOPRIDA', 'Gastrointestinal'],
  ['DEXLANSOPRAZOL', 'Gastrointestinal'],
  ['MAGALDRATO', 'Gastrointestinal'],
  ['ALGINATO', 'Gastrointestinal'],
  ['DICICLOMINA', 'Gastrointestinal'],
  ['PROBIOTICO', 'Gastrointestinal'],
  // Cardiovascular adicionales
  ['DILTIAZEM', 'Cardiovascular'],
  ['VERAPAMILO', 'Cardiovascular'],
  ['NEBIVOLOL', 'Cardiovascular'],
  ['OLMESARTAN', 'Cardiovascular'],
  ['PERINDOPRIL', 'Cardiovascular'],
  ['FENOFIBRATO', 'Cardiovascular'],
  ['GEMFIBROZILO', 'Cardiovascular'],
  ['TRIMETAZIDINA', 'Cardiovascular'],
  ['PRAZOSINA', 'Cardiovascular'],
  ['DOXAZOSINA', 'Cardiovascular'],
  ['RIVAROXABAN', 'Cardiovascular'],
  ['APIXABAN', 'Cardiovascular'],
  // Antiinflamatorios adicionales
  ['COLCHICINA', 'Antiinflamatorios'],
  ['ALOPURINOL', 'Antiinflamatorios'],
  ['FEBUXOSTAT', 'Antiinflamatorios'],
  ['ACECLOFENACO', 'Antiinflamatorios'],
  ['LORNOXICAM', 'Antiinflamatorios'],
  ['TENOXICAM', 'Antiinflamatorios'],
  // Diabetes adicionales
  ['GLICLAZIDA', 'Diabetes'],
  ['REPAGLINIDA', 'Diabetes'],
  ['CANAGLIFLOZINA', 'Diabetes'],
  // Hormonales adicionales
  ['CLORMADINONA', 'Hormonales y Tiroides'],
  ['CIPROTERONA', 'Hormonales y Tiroides'],
  ['DIENOGEST', 'Hormonales y Tiroides'],
  ['TAMOXIFENO', 'Hormonales y Tiroides'],
  ['CABERGOLINA', 'Hormonales y Tiroides'],
  ['DUTASTERIDE', 'Hormonales y Tiroides'],
  // Dermatológicos adicionales
  ['ADAPALENO', 'Dermatológicos'],
  ['TRETINOINA', 'Dermatológicos'],
  ['PERMETRINA', 'Dermatológicos'],
  ['BENZOILO', 'Dermatológicos'],
  ['HIDROQUINONA', 'Dermatológicos'],
  ['CALCIPOTRIOL', 'Dermatológicos'],
  ['PIMECROLIMUS', 'Dermatológicos'],
];

function classify(name: string, oldCategoria: string | null): string {
  const n = norm(name);
  for (const [ing, cat] of INGREDIENTS) {
    if (n.includes(ing)) return cat;
  }
  if (oldCategoria && OLD_CATEGORY[oldCategoria]) {
    return OLD_CATEGORY[oldCategoria];
  }
  return 'General';
}

// ── Migración ──────────────────────────────────────────────────
async function main() {
  console.log('📂 Leyendo respaldo FarmaPronto…');
  const sql = readFileSync(DUMP_PATH, 'utf8');

  const productos = parseCopy(sql, 'productos');
  const usuarios = parseCopy(sql, 'users');
  const ventas = parseCopy(sql, 'ventas');
  const ventaProductos = parseCopy(sql, 'venta_productos');
  console.log(
    `   ${productos.length} productos · ${usuarios.length} usuarios · ` +
      `${ventas.length} ventas · ${ventaProductos.length} renglones`,
  );

  // ── 1. Limpieza del catálogo y ventas de prueba ──────────────
  console.log('🧹 Limpiando datos de prueba…');
  await prisma.saleReturnItem.deleteMany({});
  await prisma.saleReturn.deleteMany({});
  await prisma.customerCreditEntry.deleteMany({});
  await prisma.cashMovement.deleteMany({});
  await prisma.salePayment.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.prescriptionItem.deleteMany({});
  await prisma.prescription.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.cashSession.deleteMany({});
  await prisma.stockLevel.deleteMany({});
  await prisma.productPrice.deleteMany({});
  await prisma.productBarcode.deleteMany({});
  await prisma.promotion.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.customer.deleteMany({});

  // ── 2. Categorías ────────────────────────────────────────────
  console.log('🗂️  Creando categorías…');
  const categoryId = new Map<string, number>();
  for (const name of CATEGORIES) {
    const c = await prisma.category.create({ data: { name } });
    categoryId.set(name, c.id);
  }

  // ── 3. Productos ─────────────────────────────────────────────
  console.log('💊 Importando productos…');
  const productIdMap = new Map<number, number>(); // viejo id → nuevo id
  const productName = new Map<number, string>(); // viejo id → nombre
  const usedSku = new Set<string>();
  const usedBarcode = new Set<string>();
  const catCount: Record<string, number> = {};

  for (const row of productos) {
    const oldId = Number(row[0]);
    const nombre = (row[1] ?? '').trim() || `Producto ${oldId}`;
    const codigo = (row[2] ?? '').trim();
    const categoria = row[3];
    const cantidad = Number(row[4] ?? 0);
    const precio = Number(row[5] ?? 0);
    const costo = Number(row[6] ?? 0);

    const cat = classify(nombre, categoria);
    catCount[cat] = (catCount[cat] ?? 0) + 1;

    // SKU único (a partir del código de barras).
    let sku = codigo || `FP-${oldId}`;
    if (usedSku.has(sku)) sku = `${sku}-${oldId}`;
    usedSku.add(sku);

    // El código de barras se registra solo si no se repite.
    const barcodes =
      codigo && !usedBarcode.has(codigo)
        ? [{ code: codigo, isPrimary: true, packQuantity: 1 }]
        : [];
    if (codigo) usedBarcode.add(codigo);

    const product = await prisma.product.create({
      data: {
        sku,
        name: nombre,
        unitId: UNIT_ID,
        categoryId: categoryId.get(cat)!,
        sellType: 'UNIT',
        trackStock: true,
        requiresPrescription: cat === 'Antibióticos',
        isActive: true,
        barcodes: { create: barcodes },
        prices: {
          create: [
            { priceListId: PRICE_LIST_ID, branchId: null, cost: costo, price: precio },
          ],
        },
        stockLevels: {
          create: [
            { branchId: BRANCH_ID, warehouseId: WAREHOUSE_ID, quantity: cantidad },
          ],
        },
      },
    });
    productIdMap.set(oldId, product.id);
    productName.set(oldId, nombre);
  }

  // Movimiento de inventario inicial (ledger) para los productos con stock.
  const initialMovements = productos
    .filter((r) => Number(r[4] ?? 0) !== 0)
    .map((r) => {
      const qty = Number(r[4] ?? 0);
      return {
        productId: productIdMap.get(Number(r[0]))!,
        branchId: BRANCH_ID,
        warehouseId: WAREHOUSE_ID,
        type: 'INITIAL',
        quantity: qty,
        balanceAfter: qty,
        refType: 'Initial',
        note: 'Carga inicial FarmaPronto',
      };
    });
  await prisma.stockMovement.createMany({ data: initialMovements });
  console.log(`   ${productos.length} productos · ${initialMovements.length} movimientos iniciales`);

  // ── 4. Usuarios ──────────────────────────────────────────────
  console.log('👤 Importando usuarios…');
  const userIdMap = new Map<number, number>(); // viejo id → nuevo id
  const seedAdmin = await prisma.user.findFirst({ where: { username: 'admin' } });

  for (const row of usuarios) {
    const oldId = Number(row[0]);
    const name = row[1] ?? `Usuario ${oldId}`;
    const username = row[2] ?? `user${oldId}`;
    // PHP genera hashes con prefijo `$2y$`; se normaliza a `$2b$` (mismo
    // algoritmo) para que la librería bcrypt de Node los acepte.
    const rawHash = row[3] ?? '';
    const passwordHash = rawHash.startsWith('$2y$')
      ? `$2b$${rawHash.slice(4)}`
      : rawHash;
    const isAdmin = row[4] === 't' || row[4] === 'true';

    // El usuario "admin" ya existe (seed): se reutiliza.
    if (username === 'admin' && seedAdmin) {
      userIdMap.set(oldId, seedAdmin.id);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { username },
      update: { name, passwordHash },
      create: { name, username, passwordHash, isActive: true },
    });
    userIdMap.set(oldId, user.id);

    const roleId = isAdmin ? ROLE_ADMIN : ROLE_CASHIER;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
  }

  // ── 5. Ventas ────────────────────────────────────────────────
  console.log('🧾 Importando historial de ventas…');
  const itemsBySale = new Map<number, (string | null)[][]>();
  for (const r of ventaProductos) {
    const ventaId = Number(r[1]);
    if (!itemsBySale.has(ventaId)) itemsBySale.set(ventaId, []);
    itemsBySale.get(ventaId)!.push(r);
  }

  let salesOk = 0;
  let itemsSkipped = 0;
  for (const v of ventas) {
    const oldId = Number(v[0]);
    const usuarioId = Number(v[1]);
    const total = Number(v[2] ?? 0);
    const descuento = Number(v[3] ?? 0);
    const pagado = Number(v[5] ?? 0);
    const cambio = Number(v[6] ?? 0);
    const fechaVenta = new Date((v[7] ?? '').replace(' ', 'T'));
    const folio = v[8] ?? `FP-${oldId}`;
    const cancelada = v[11] === 't' || v[11] === 'true';

    const userId = userIdMap.get(usuarioId) ?? seedAdmin?.id ?? null;
    const rawItems = itemsBySale.get(oldId) ?? [];
    const items = rawItems
      .map((r) => {
        const newPid = productIdMap.get(Number(r[2]));
        if (!newPid) {
          itemsSkipped += 1;
          return null;
        }
        return {
          productId: newPid,
          productName: productName.get(Number(r[2])) ?? 'Producto',
          quantity: Number(r[6] ?? 1),
          unitPrice: Number(r[4] ?? 0),
          discount: Number(r[5] ?? 0),
          taxRate: 0,
          lineTotal: Number(r[7] ?? 0),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (items.length === 0) continue; // venta sin renglones recuperables

    await prisma.sale.create({
      data: {
        clientUuid: randomUUID(),
        branchId: BRANCH_ID,
        warehouseId: WAREHOUSE_ID,
        userId: userId!,
        folio,
        status: cancelada ? 'CANCELLED' : 'COMPLETED',
        type: 'SALE',
        subtotal: total + descuento,
        discountTotal: descuento,
        taxTotal: 0,
        total,
        paidTotal: pagado,
        changeGiven: cambio,
        soldAt: fechaVenta,
        createdAt: fechaVenta,
        items: { create: items },
        payments: {
          create: [{ paymentMethodId: CASH_METHOD_ID, amount: total }],
        },
      },
    });
    salesOk += 1;
  }

  // ── Resumen ──────────────────────────────────────────────────
  console.log('\n✅ Migración completada');
  console.log(`   Productos importados: ${productIdMap.size}`);
  console.log(`   Ventas importadas:    ${salesOk}`);
  if (itemsSkipped) {
    console.log(`   Renglones omitidos (producto inexistente): ${itemsSkipped}`);
  }
  console.log('\n   Reclasificación de categorías:');
  for (const cat of CATEGORIES) {
    if (catCount[cat]) console.log(`     ${cat.padEnd(28)} ${catCount[cat]}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error en la migración:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
