import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

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

async function zerarEstoque() {
  console.log('Iniciando processo para zerar estoque no banco Taboca...');
  try {
    const querySnapshot = await getDocs(collection(db, 'produtos'));
    const total = querySnapshot.size;
    console.log(`Encontrados ${total} produtos.`);

    if (total === 0) {
      console.log('Nenhum produto cadastrado para zerar.');
      return;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      const productRef = doc(db, 'produtos', document.id);
      batch.update(productRef, { estoqueAtual: 0 });
    });

    await batch.commit();
    console.log(`Sucesso: Estoque de ${total} produtos foi atualizado para 0!`);
  } catch (error) {
    console.error('Erro ao atualizar estoques:', error);
  }
}

zerarEstoque();
