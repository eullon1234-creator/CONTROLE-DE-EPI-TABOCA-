import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import XLSX from 'xlsx';
import { resolve } from 'path';

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

const filePath = resolve('./CONTROLE DE EPI.xlsx');

function parseExcelDate(val) {
  if (!val || val === 'N/A' || val === 'N/D') return null;
  if (typeof val === 'number') {
    // Excel date serial
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const clean = val.trim().replace(/\u00a0/g, ' '); // remove non-breaking spaces
    if (!clean || clean === 'N/A' || clean === 'N/D') return null;
    const parts = clean.split('/');
    if (parts.length === 3) {
      const day = parts[0].trim().padStart(2, '0');
      const month = parts[1].trim().padStart(2, '0');
      const year = parts[2].trim();
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

async function main() {
  console.log('📖 Lendo a planilha...');
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets['ESTOQUE'];
  if (!worksheet) {
    throw new Error('Aba ESTOQUE não encontrada na planilha!');
  }
  
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Skip the header (row index 0)
  const rows = rawData.slice(1);
  const parsedProducts = [];
  
  for (const row of rows) {
    const cod = parseInt(row[2]);
    if (isNaN(cod)) continue; // Skip rows without a numeric COD at index 2
    
    const description = String(row[4] || '').trim().toUpperCase();
    if (!description) continue;
    
    const validade = parseExcelDate(row[7]);
    
    parsedProducts.push({
      codigo: cod,
      grupo: String(row[3] || 'CONSUMO').trim().toUpperCase() === 'CONSUMO' ? 'CONSUMO' : 'PERMANENTE',
      descricao: description,
      ca: row[6] && String(row[6]).trim() !== 'N/A' && String(row[6]).trim() !== '' ? String(row[6]).trim() : null,
      validadeCa: validade,
      unidade: String(row[8] || 'UND').trim().toUpperCase(),
      estoqueMin: parseInt(row[9]) || 0,
      estoqueMax: parseInt(row[10]) || 0,
      estoqueAtual: parseInt(row[11]) || 0,
      localizacao: null,
    });
  }
  
  console.log(`\n📦 Encontrados ${parsedProducts.length} produtos válidos para importar.`);
  
  console.log('🧹 Limpando produtos antigos no Firestore...');
  const snap = await getDocs(collection(db, 'produtos'));
  console.log(`🗑️ Apagando ${snap.size} produtos...`);
  
  const BATCH_SIZE = 400;
  const docsArray = snap.docs;
  for (let i = 0; i < docsArray.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = docsArray.slice(i, i + BATCH_SIZE);
    for (const d of chunk) {
      batch.delete(doc(db, 'produtos', d.id));
    }
    await batch.commit();
    console.log(`   Removidos ${Math.min(i + BATCH_SIZE, docsArray.length)}/${docsArray.length}`);
  }
  
  console.log('\n🚀 Iniciando upload dos novos produtos no Firestore...');
  let uploaded = 0;
  for (let i = 0; i < parsedProducts.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = parsedProducts.slice(i, i + BATCH_SIZE);
    for (const p of chunk) {
      const newDocRef = doc(collection(db, 'produtos')); // auto-generate ID
      batch.set(newDocRef, {
        ...p,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
    }
    await batch.commit();
    uploaded += chunk.length;
    console.log(`   Importados ${uploaded}/${parsedProducts.length}`);
  }
  
  console.log('\n🎉 Importação concluída com sucesso!');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro durante a importação:', err);
  process.exit(1);
});
