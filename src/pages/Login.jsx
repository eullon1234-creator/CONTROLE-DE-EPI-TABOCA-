import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { db, auth } from '../firebase/config';

const USERS = [
  { name: 'EULLON', email: 'eullon@controle-epi.tabooca', avatarClass: 'avatar-eullon', initials: 'EU' },
  { name: 'GABRIELE', email: 'gabriele@controle-epi.tabooca', avatarClass: 'avatar-gabriele', initials: 'GA' },
  { name: 'TIAGO', email: 'tiago@controle-epi.tabooca', avatarClass: 'avatar-tiago', initials: 'TI' },
  { name: 'DIEGO', email: 'diego@controle-epi.tabooca', avatarClass: 'avatar-diego', initials: 'DI' },
  { name: 'LORENA', email: 'lorena@controle-epi.tabooca', avatarClass: 'avatar-lorena', initials: 'LO' },
  { name: 'WESLEY', email: 'wesley@controle-epi.tabooca', avatarClass: 'avatar-wesley', initials: 'WE' },
];

export default function Login() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [hasPassword, setHasPassword] = useState(true); // default to true
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [detectionSuccess, setDetectionSuccess] = useState(false);
  const [error, setError] = useState('');
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('Por favor, selecione um usuário.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await signup(selectedUser.email, password);
        // Save to Firestore
        try {
          await setDoc(doc(db, 'usuarios_registrados', selectedUser.email), {
            registrado: true,
            dataRegistro: new Date()
          });
        } catch (e) {
          console.error("Erro ao salvar status de registro:", e);
        }
        setHasPassword(true);
        setDetectionSuccess(true);
        toast.success('Senha criada! Bem-vindo ao sistema!');
      } else {
        await login(selectedUser.email, password);
        // Sync Firestore
        try {
          await setDoc(doc(db, 'usuarios_registrados', selectedUser.email), {
            registrado: true,
            dataRegistro: new Date()
          }, { merge: true });
        } catch (_) {}
        toast.success('Bem-vindo de volta!');
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      let msg = 'Erro ao realizar a operação. Verifique seus dados.';
      
      if (isRegisterMode) {
        if (err.code === 'auth/email-already-in-use') {
          msg = 'Este usuário já possui uma senha cadastrada. Faça login ou solicite alteração ao administrador.';
          setHasPassword(true);
          setIsRegisterMode(false);
          setDetectionSuccess(true);
          try {
            await setDoc(doc(db, 'usuarios_registrados', selectedUser.email), {
              registrado: true,
              dataRegistro: new Date()
            }, { merge: true });
          } catch (_) {}
        } else if (err.code === 'auth/weak-password') {
          msg = 'A senha fornecida é muito fraca. Digite pelo menos 6 caracteres.';
        }
      } else {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          msg = 'Senha incorreta. Se for seu primeiro acesso, clique em "Voltar" e crie sua senha.';
        } else if (err.code === 'auth/user-not-found') {
          msg = 'Usuário sem senha cadastrada. Por favor, crie uma senha para o primeiro acesso.';
          setHasPassword(false);
          setIsRegisterMode(true);
          setDetectionSuccess(true);
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectUser(user) {
    setSelectedUser(user);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setCheckingStatus(true);
    setDetectionSuccess(false);

    try {
      // 1. Try Firestore check first
      const docRef = doc(db, 'usuarios_registrados', user.email);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().registrado) {
        setHasPassword(true);
        setIsRegisterMode(false);
        setDetectionSuccess(true);
      } else {
        // 2. Try fetchSignInMethodsForEmail
        const methods = await fetchSignInMethodsForEmail(auth, user.email);
        if (methods && methods.length > 0) {
          setHasPassword(true);
          setIsRegisterMode(false);
          setDetectionSuccess(true);
          
          // Sync with Firestore for future fast checks
          try {
            await setDoc(doc(db, 'usuarios_registrados', user.email), {
              registrado: true,
              dataRegistro: new Date()
            }, { merge: true });
          } catch (_) {}
        } else {
          setHasPassword(false);
          setIsRegisterMode(true); // Default to register mode for first access
          setDetectionSuccess(true);
        }
      }
    } catch (err) {
      console.error("Erro na detecção de usuário:", err);
      // Fallback: If both fail, try fetchSignInMethodsForEmail directly
      try {
        const methods = await fetchSignInMethodsForEmail(auth, user.email);
        if (methods && methods.length > 0) {
          setHasPassword(true);
          setIsRegisterMode(false);
          setDetectionSuccess(true);
        } else {
          setHasPassword(false);
          setIsRegisterMode(true);
          setDetectionSuccess(true);
        }
      } catch (e) {
        console.error("Fallback detecção falhou:", e);
        // If everything fails (e.g. offline/rules block), don't block.
        // Default to login mode but allow toggle.
        setHasPassword(true);
        setIsRegisterMode(false);
        setDetectionSuccess(false); // Show manual toggle as fallback
      }
    } finally {
      setCheckingStatus(false);
    }
  }

  function handleBackToUsers() {
    setSelectedUser(null);
    setPassword('');
    setConfirmPassword('');
    setIsRegisterMode(false);
    setHasPassword(true);
    setDetectionSuccess(false);
    setError('');
  }

  if (checkingStatus) {
    return (
      <div className="login-page">
        <div className="login-bg-glow" />
        <div className="login-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
          <div className="loading-spin" style={{ width: 32, height: 32, marginBottom: '1.25rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Verificando status de acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg-glow" />

      <div className="login-card">
        <div className="login-logo">
          <div className="logo-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <img src="./favicon.svg" alt="Logo" style={{ width: '36px', height: '36px' }} />
          </div>
          <h1>CONTROLE DE EPI</h1>
          <p>Taboca — Acesso ao Sistema</p>
        </div>

        {error && (
          <div className="login-error" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        {!selectedUser ? (
          <div>
            <p style={{ textAlign: 'center', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Selecione quem você é para continuar:
            </p>
            <div className="user-select-grid">
              {USERS.map(user => (
                <div
                  key={user.name}
                  className="user-select-card"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className={`user-select-avatar ${user.avatarClass}`}>
                    {user.initials}
                  </div>
                  <div className="user-select-name">{user.name}</div>
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: '1.5rem',
              padding: '0.85rem 1rem',
              background: 'rgba(251, 191, 36, 0.06)',
              border: '1px dashed rgba(251, 191, 36, 0.25)',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#fbbf24',
              lineHeight: '1.4',
              display: 'flex',
              gap: '0.625rem',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <span><strong>Primeiro Acesso?</strong> Se for a sua primeira vez no sistema, clique no seu nome e você será direcionado para criar a sua senha.</span>
            </div>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit} id="login-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Identificação</span>
              <button
                type="button"
                className="btn-back-user"
                onClick={handleBackToUsers}
              >
                ← Voltar
              </button>
            </div>

            <div className="selected-user-summary">
              <div className={`user-select-avatar ${selectedUser.avatarClass}`}>
                {selectedUser.initials}
              </div>
              <div className="selected-user-summary-info">
                <div className="selected-user-summary-name">{selectedUser.name}</div>
                <div className="selected-user-summary-label">
                  {isRegisterMode ? 'Cadastro de Novo Acesso' : 'Entrada Autorizada'}
                </div>
              </div>
            </div>

            {/* Chamado visual para primeiro acesso */}
            {isRegisterMode && (
              <div className="first-access-banner" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.12))',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                marginBottom: '1rem',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                lineHeight: '1.4',
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'flex-start',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)'
              }}>
                <span style={{ fontSize: '1.35rem', lineHeight: '1' }}>🔑</span>
                <div>
                  <h4 style={{ margin: '0 0 0.15rem 0', fontWeight: '700', color: '#60a5fa', fontSize: '0.875rem' }}>Primeiro Acesso Detectado</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    Olá, <strong>{selectedUser.name}</strong>! Crie uma senha de acesso nos campos abaixo para ativar o seu perfil.
                  </p>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="form-label" htmlFor="password">
                {isRegisterMode ? 'Criar Senha (mínimo 6 caracteres)' : 'Senha'}
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            {isRegisterMode && (
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
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? (
                <>
                  <div className="loading-spin" style={{ width: 16, height: 16 }} />
                  {isRegisterMode ? 'Cadastrando...' : 'Entrando...'}
                </>
              ) : (
                <>🔐 {isRegisterMode ? 'Criar Minha Senha' : 'Entrar'}</>
              )}
            </button>

            <div className="login-flow-toggle">
              {isRegisterMode ? (
                // Only show "Fazer Login" if we did NOT detect they lack a password (i.e. hasPassword is not false)
                (!detectionSuccess || hasPassword) && (
                  <span>
                    Já cadastrou a sua senha?{' '}
                    <button type="button" onClick={() => { setIsRegisterMode(false); setError(''); }}>
                      Fazer Login
                    </button>
                  </span>
                )
              ) : (
                // Only show "Criar Senha" if we did NOT detect they already have a password (i.e. hasPassword is not true)
                (!detectionSuccess || !hasPassword) && (
                  <span>
                    Primeiro acesso de {selectedUser.name.charAt(0) + selectedUser.name.slice(1).toLowerCase()}?{' '}
                    <button type="button" onClick={() => { setIsRegisterMode(true); setError(''); }}>
                      Criar Senha
                    </button>
                  </span>
                )
              )}
            </div>
          </form>
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: 0, right: 0,
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        opacity: 0.5,
        letterSpacing: '0.05em'
      }}>
        Criado por Eullon
      </div>
    </div>
  );
}
