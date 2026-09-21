import bcrypt from 'bcryptjs';
import { db } from './db/index.ts';
import { categories, products, users } from './db/schema.ts';

const ADMIN_EMAIL = 'admin@minicommerce.dev';
const ADMIN_PASSWORD = 'admin123';

// L'ordine conta: gli articoli referenziano le categorie con una foreign key,
// quindi vanno cancellati prima (e inseriti dopo).
console.log('Pulizia tabelle...');
db.delete(products).run();
db.delete(categories).run();
db.delete(users).run();

console.log('Creazione utente amministratore...');
db.insert(users)
  .values({
    email: ADMIN_EMAIL,
    passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    name: 'Amministratore',
    isAdmin: true,
  })
  .run();

console.log('Inserimento categorie...');
const insertedCategories = db
  .insert(categories)
  .values([
    { name: 'Portatili', description: 'Notebook e ultrabook per lavoro e studio' },
    { name: 'PC Desktop', description: 'Computer fissi, tower e mini PC' },
    { name: 'Mouse', description: 'Mouse cablati e wireless, da ufficio e da gaming' },
    { name: 'Tastiere', description: 'Tastiere meccaniche e a membrana' },
    { name: 'Monitor', description: 'Schermi per produttività e gaming' },
    { name: 'Smartphone', description: 'Telefoni cellulari e accessori collegati' },
    { name: 'Accessori', description: 'Cuffie, webcam, storage esterno, hub e adattatori' },
  ])
  .returning()
  .all();

// Mappa nome categoria -> id, per collegare ogni articolo alla sua categoria
const categoryId = new Map(insertedCategories.map((c) => [c.name, c.id]));
const byName = (name: string): number => {
  const id = categoryId.get(name);
  if (id === undefined) {
    throw new Error(`Categoria "${name}" non trovata fra quelle inserite`);
  }
  return id;
};

console.log('Inserimento articoli...');
db.insert(products)
  .values([
    {
      name: 'ThinkPad X1 Carbon Gen 12',
      description:
        'Ultrabook 14" con Intel Core Ultra 7, 32GB RAM, 1TB SSD. Leggero e robusto, ideale per il lavoro in mobilità.',
      categoryId: byName('Portatili'),
      brand: 'Lenovo',
      price: 1899.0,
      stock: 8,
    },
    {
      name: 'MacBook Air 13" M4',
      description:
        'Chip Apple M4, 16GB di memoria unificata, 512GB SSD. Silenzioso, senza ventole, batteria fino a 18 ore.',
      categoryId: byName('Portatili'),
      brand: 'Apple',
      price: 1349.0,
      stock: 12,
    },
    {
      name: 'PC Desktop Gaming RTX 5070',
      description: 'Tower gaming con Ryzen 7 9700X, GeForce RTX 5070 12GB, 32GB DDR5, 2TB NVMe.',
      categoryId: byName('PC Desktop'),
      brand: 'MSI',
      price: 1799.0,
      stock: 5,
    },
    {
      name: 'Mini PC NUC 14 Pro',
      description:
        'Mini PC compatto con Core Ultra 5, 16GB RAM, 512GB SSD. Perfetto per ufficio e media center.',
      categoryId: byName('PC Desktop'),
      brand: 'ASUS',
      price: 649.0,
      stock: 15,
    },
    {
      name: 'MX Master 3S',
      description:
        'Mouse wireless ergonomico con sensore 8K DPI, scroll elettromagnetico e ricarica USB-C.',
      categoryId: byName('Mouse'),
      brand: 'Logitech',
      price: 109.99,
      stock: 40,
    },
    {
      name: 'G Pro X Superlight 2',
      description:
        'Mouse gaming wireless ultraleggero (60g), sensore HERO 2, fino a 95 ore di autonomia.',
      categoryId: byName('Mouse'),
      brand: 'Logitech',
      price: 159.0,
      stock: 22,
    },
    {
      name: 'MX Keys S',
      description:
        'Tastiera wireless retroilluminata con tasti a basso profilo e digitazione silenziosa.',
      categoryId: byName('Tastiere'),
      brand: 'Logitech',
      price: 119.0,
      stock: 30,
    },
    {
      name: 'Keychron K8 Pro',
      description:
        'Tastiera meccanica wireless hot-swap, switch Gateron Brown, retroilluminazione RGB.',
      categoryId: byName('Tastiere'),
      brand: 'Keychron',
      price: 99.0,
      stock: 18,
    },
    {
      name: 'Monitor UltraGear 27" QHD 180Hz',
      description:
        'Pannello IPS 2560x1440, 180Hz, 1ms, compatibile G-Sync. Ideale per il gaming competitivo.',
      categoryId: byName('Monitor'),
      brand: 'LG',
      price: 329.0,
      stock: 10,
    },
    {
      name: 'Monitor 32" 4K USB-C',
      description: 'Pannello 4K con hub USB-C 90W, perfetto per produttività e grafica.',
      categoryId: byName('Monitor'),
      brand: 'Dell',
      price: 549.0,
      stock: 7,
    },
    {
      name: 'iPhone 17',
      description: 'Display 6.3" ProMotion, chip A19, doppia fotocamera 48MP, 256GB.',
      categoryId: byName('Smartphone'),
      brand: 'Apple',
      price: 979.0,
      stock: 25,
    },
    {
      name: 'Galaxy S25',
      description: 'Display Dynamic AMOLED 6.2", Snapdragon 8 Elite, tripla fotocamera, 256GB.',
      categoryId: byName('Smartphone'),
      brand: 'Samsung',
      price: 899.0,
      stock: 20,
    },
    {
      name: 'Cuffie WH-1000XM6',
      description: 'Cuffie over-ear wireless con cancellazione attiva del rumore leader di categoria.',
      categoryId: byName('Accessori'),
      brand: 'Sony',
      price: 399.0,
      stock: 14,
    },
    {
      name: 'Webcam Brio 500',
      description:
        'Webcam Full HD 1080p con correzione automatica della luce e otturatore per la privacy.',
      categoryId: byName('Accessori'),
      brand: 'Logitech',
      price: 139.0,
      stock: 26,
    },
    {
      name: 'SSD esterno T9 2TB',
      description:
        'SSD portatile USB 3.2 Gen 2x2, velocità fino a 2000 MB/s, resistente agli urti.',
      categoryId: byName('Accessori'),
      brand: 'Samsung',
      price: 229.0,
      stock: 33,
    },
    {
      name: 'Hub USB-C 8-in-1',
      description:
        'Hub con HDMI 4K, 3x USB-A, lettore SD/microSD, Ethernet e Power Delivery 100W.',
      categoryId: byName('Accessori'),
      brand: 'Anker',
      price: 49.99,
      stock: 50,
    },
  ])
  .run();

console.log(`Seed completato: ${insertedCategories.length} categorie, 16 articoli.`);
console.log(`Credenziali admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
