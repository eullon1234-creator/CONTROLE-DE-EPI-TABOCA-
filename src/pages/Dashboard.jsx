import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, baixoEstoque: 0, entradasHoje: 0, saidasHoje: 0 });
  const [alertas, setAlertas] = useState([]);
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  async function handleInstallApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('Para baixar o aplicativo:\n\n🖥️ No Computador: Clique no ícone de instalar na barra de endereços (ao lado do link, na parte superior direita).\n\n📱 No Celular: Abra o menu de opções do navegador (ou compartilhar no iPhone) e escolha "Adicionar à Tela de Início" ou "Instalar".');
    }
  }

  useEffect(() => {
    async function load() {
      try {
        // Produtos
        const prodSnap = await getDocs(collection(db, 'produtos'));
        const produtos = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const baixoEstoque = produtos.filter(p => p.estoqueAtual <= p.estoqueMin);

        // Movimentações de hoje
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        const movSnap = await getDocs(
          query(
            collection(db, 'movimentacoes'),
            where('criadoEm', '>=', Timestamp.fromDate(hoje)),
            where('criadoEm', '<', Timestamp.fromDate(amanha))
          )
        );
        const movs = movSnap.docs.map(d => d.data());
        const entradasHoje = movs.filter(m => m.tipo === 'ENTRADA').reduce((a, m) => a + m.quantidade, 0);
        const saidasHoje = movs.filter(m => m.tipo === 'SAIDA').reduce((a, m) => a + m.quantidade, 0);

        // Recentes (últimos 10)
        const recentSnap = await getDocs(
          query(collection(db, 'movimentacoes'), orderBy('criadoEm', 'desc'))
        );
        setRecentes(recentSnap.docs.slice(0, 8).map(d => ({ id: d.id, ...d.data() })));

        setStats({ total: produtos.length, baixoEstoque: baixoEstoque.length, entradasHoje, saidasHoje });
        setAlertas(baixoEstoque.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <div>
            <div className="skeleton" style={{ width: '150px', height: '2rem', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '220px', height: '1rem', borderRadius: '4px' }}></div>
          </div>
        </div>

        <div className="stats-grid">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="card stat-card skeleton-card">
              <div className="skeleton skeleton-icon" style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '60px', height: '1.75rem', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '100px', height: '0.875rem', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="section">
          <div className="section-header">
            <div className="skeleton" style={{ width: '200px', height: '1.25rem', borderRadius: '4px' }}></div>
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: '80px', height: '1.5rem', borderRadius: '6px' }}></div>
                  <div className="skeleton" style={{ flex: 1, height: '1.25rem', borderRadius: '4px' }}></div>
                  <div className="skeleton" style={{ width: '60px', height: '1.25rem', borderRadius: '4px' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today}</p>
        </div>
      </div>

      {!isInstalled && (
        <div className="card install-banner-card" style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '280px', flex: 1 }}>
            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>📲</span>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', marginTop: 0 }}>
                Baixe o Aplicativo Controle de EPI
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Instale no seu celular ou computador para ter acesso rápido direto da tela de início, melhor desempenho e modo de uso simplificado.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallApp}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-blue), #4f46e5)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📥</span> Baixar Aplicativo
          </button>
        </div>
      )}

      <div className="stats-grid">
        <StatCard icon="📦" label="Produtos Cadastrados" value={stats.total} color="blue" />
        <StatCard icon="🔴" label="Estoque Baixo" value={stats.baixoEstoque} color="red" />
        <StatCard icon="📥" label="Unidades Entrada Hoje" value={stats.entradasHoje} color="green" />
        <StatCard icon="📤" label="Unidades Saída Hoje" value={stats.saidasHoje} color="yellow" />
      </div>

      {alertas.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title">⚠️ Produtos com Estoque Baixo</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alertas.map(p => (
              <div key={p.id} className="alert-banner danger">
                <span>🔴</span>
                <span style={{ flex: 1 }}>
                  <strong>Cód. {p.codigo}</strong> — {p.descricao}
                </span>
                <span style={{ fontSize: '0.8125rem', opacity: 0.85 }}>
                  Atual: <strong>{p.estoqueAtual}</strong> / Mín: {p.estoqueMin} {p.unidade}
                </span>
              </div>
            ))}
            {stats.baixoEstoque > 5 && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0.25rem 0.25rem' }}>
                + {stats.baixoEstoque - 5} outros com estoque baixo. Veja em <a href="#/estoque" style={{ color: 'var(--accent-blue-light)' }}>Estoque</a>.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <div className="section-title">🕐 Últimas Movimentações</div>
        </div>
        {recentes.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">Nenhuma movimentação ainda</div>
              <div className="empty-desc">Registre entradas e saídas de EPIs para vê-las aqui.</div>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Funcionário</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span className={`badge ${m.tipo === 'ENTRADA' ? 'badge-green' : 'badge-red'}`}>
                        {m.tipo === 'ENTRADA' ? '📥' : '📤'} {m.tipo}
                      </span>
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.produtoDescricao}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód. {m.produtoCodigo}</div>
                    </td>
                    <td><strong>{m.quantidade}</strong></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {m.funcionario || m.fornecedor || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {m.criadoEm?.toDate
                        ? format(m.criadoEm.toDate(), 'dd/MM/yy HH:mm')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
