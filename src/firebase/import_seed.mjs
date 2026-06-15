// Script para importar os 252 produtos do Excel no Firestore
// Rode com: node src/firebase/import_seed.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
  apiKey: "AIzaSyCbxIM6PfyZvWngcIByoH-sQFOtJht6TrE",
  authDomain: "controle-de-epi-tabooca.firebaseapp.com",
  projectId: "controle-de-epi-tabooca",
  storageBucket: "controle-de-epi-tabooca.firebasestorage.app",
  messagingSenderId: "664784767433",
  appId: "1:664784767433:web:86e454788aaebaf2c60018",
  measurementId: "G-RB1S25HRB7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedData = JSON.parse(
  readFileSync(join(__dirname, 'seed_data.json'), 'utf-8')
);

async function main() {
  console.log('🔍 Verificando banco de dados...');

  const existing = await getDocs(collection(db, 'produtos'));
  if (existing.size > 0) {
    console.log(`⚠️  Já existem ${existing.size} produtos no banco. Abortando para evitar duplicatas.`);
    process.exit(0);
  }

  console.log(`🚀 Iniciando importação de ${seedData.length} produtos...\n`);

  let count = 0;
  for (const product of seedData) {
    await addDoc(collection(db, 'produtos'), {
      ...product,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    count++;
    const pct = Math.round((count / seedData.length) * 100);
    process.stdout.write(`\r  ✅ ${count}/${seedData.length} (${pct}%) — ${product.descricao.slice(0, 50)}`);
  }

  console.log(`\n\n🎉 Importação concluída! ${count} produtos cadastrados com sucesso.`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
