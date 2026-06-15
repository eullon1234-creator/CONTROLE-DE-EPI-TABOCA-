import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    if (isRegistering && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await register(email, password);
        toast.success('Cadastro realizado com sucesso! Bem-vindo.');
      } else {
        await login(email, password);
        toast.success('Bem-vindo ao sistema!');
      }
      navigate('/');
    } catch (err) {
      let msg = '';
      if (isRegistering) {
        msg = err.code === 'auth/email-already-in-use'
          ? 'Este e-mail já está cadastrado.'
          : err.code === 'auth/invalid-email'
          ? 'E-mail inválido.'
          : err.code === 'auth/weak-password'
          ? 'A senha deve ter pelo menos 6 caracteres.'
          : 'Erro ao cadastrar. Verifique seus dados.';
      } else {
        msg = err.code === 'auth/invalid-credential'
          ? 'E-mail ou senha incorretos.'
          : err.code === 'auth/user-not-found'
          ? 'Usuário não encontrado.'
          : 'Erro ao entrar. Verifique seus dados.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-glow" />

      <div className="login-card">
        <div className="login-logo">
          <div className="logo-circle">🪖</div>
          <h1>{isRegistering ? 'CRIAR CONTA' : 'CONTROLE DE EPI'}</h1>
          <p>
            {isRegistering
              ? 'Taboca — Cadastre seu usuário'
              : 'Taboca — Acesso ao Sistema'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegistering && (
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirmar Senha</label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <div className="loading-spin" style={{ width: 16, height: 16 }} />
                {isRegistering ? 'Cadastrando...' : 'Entrando...'}
              </>
            ) : (
              <>{isRegistering ? '📝 Cadastrar' : '🔐 Entrar'}</>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue-light)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'underline',
              fontFamily: 'inherit',
              fontWeight: 500
            }}
          >
            {isRegistering ? 'Já tem uma conta? Faça Login' : 'Novo por aqui? Cadastre-se'}
          </button>

          {!isRegistering && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Acesso restrito. Solicite ao administrador caso não tenha conta.
            </p>
          )}

          {!isInstalled && (
            <button
              onClick={handleInstallApp}
              className="btn btn-secondary"
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.65rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                background: 'rgba(59, 130, 246, 0.08)',
                color: 'var(--accent-blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              📲 Baixar App no PC / Celular
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
