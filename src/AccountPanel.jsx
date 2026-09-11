import React, { useEffect, useRef, useState } from 'react';
import { CloudCheck, CloudUpload, Eye, EyeOff, LogIn, LogOut, RefreshCw, UserRound, X } from 'lucide-react';
import { accountRequest } from './account.js';
import './account.css';

export const SAVE_LABELS = {
  guest: 'Voyageur invité', saved: 'Carnet sauvegardé', pending: 'Sauvegarde en attente',
  saving: 'Sauvegarde en cours', offline: 'Sauvegarde à réessayer',
  expired: 'Connexion expirée', conflict: 'Carnet à synchroniser',
};

export function AccountButton({ profile, status, onClick, compact = false }) {
  const StatusIcon = !profile.user ? UserRound : status === 'saved' ? CloudCheck : CloudUpload;
  return <button type="button" className={`account-trigger ${compact ? 'compact' : ''}`} onClick={onClick}
    aria-label={profile.user ? `Compte de ${profile.user.username} : ${SAVE_LABELS[status]}` : 'Se connecter ou créer un compte'}
    title={profile.user ? `${profile.user.username} · ${SAVE_LABELS[status]}` : 'Se connecter ou créer un compte'}>
    <StatusIcon size={18} aria-hidden="true"/>
    {!compact && <span><strong>{profile.user?.username || 'Mon carnet'}</strong><small role="status">{SAVE_LABELS[status]}</small></span>}
  </button>;
}

export function AccountGate({ profile, status, onChange }) {
  return <main className="account-gate"><header className="account-gate-brand"><h1>LUMEN</h1><p>LES CHEMINS OUBLIÉS</p></header>
    <AccountPanel profile={profile} status={status} onChange={onChange} mandatory initialError={status === 'expired' ? profile.error : ''}/>
  </main>;
}

export default function AccountPanel({ profile, status, onChange, onClose, initialError = '', mandatory = false }) {
  const dialog = useRef(null);
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState(profile.user?.username || '');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [visible, setVisible] = useState(false);
  const [importGuest, setImportGuest] = useState(true);
  const [discard, setDiscard] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(initialError);
  const authenticating = !profile.user || status === 'expired';
  const creating = mode === 'register';
  const completed = Object.values(profile.getSave().progress).filter(record => record.completed).length;
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    element.querySelector('#account-username')?.focus();
    return () => { element.close(); previous?.focus(); };
  }, []);

  async function run(action) {
    if (working) return;
    setWorking(true); setError('');
    try { await action(); } catch (failure) { setError(failure.message); }
    finally { setWorking(false); }
  }
  function submit(event) {
    event.preventDefault();
    run(async () => {
      const result = await accountRequest(`/api/account/${creating ? 'register' : 'login'}`, {
        username, password, website, ...(creating && importGuest ? { save: profile.getSave() } : {}),
      });
      setPassword('');
      onChange(result);
    });
  }
  const logout = () => run(async () => {
    await profile.flush();
    await accountRequest('/api/account/logout', {});
    onChange({ user: null, save: null, revision: 0 });
  });
  const reloadSave = () => run(async () => {
    const result = await accountRequest();
    if (!result.user || result.user.id !== profile.user.id) throw new Error('Reconnectez-vous à ce compte avant de recharger son carnet.');
    profile.discardPending();
    onChange(result);
  });

  return <dialog className={`account-dialog ${mandatory ? 'account-required' : ''}`} ref={dialog} aria-labelledby="account-title"
    onCancel={event => { event.preventDefault(); if (!working && !mandatory) onClose(); }}
    onClick={event => { if (event.target === dialog.current && !working && !mandatory) {
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    } }}>
    {!mandatory && <button type="button" className="account-close" onClick={onClose} disabled={working} aria-label="Fermer le compte" title="Fermer"><X size={19}/></button>}
    <div className="account-heading"><UserRound size={24} aria-hidden="true"/><span>CARNET DU VOYAGEUR</span></div>
    <h2 id="account-title">{authenticating ? creating ? 'Votre voyage commence.' : 'Heureux de vous retrouver.' : profile.user.username}</h2>
    {authenticating ? <>
      <div className="account-tabs" role="group" aria-label="Accès au compte">
        <button type="button" aria-pressed={!creating} disabled={working} onClick={() => { setMode('login'); setError(''); }}>Connexion</button>
        {!profile.user && <button type="button" aria-pressed={creating} disabled={working} onClick={() => { setMode('register'); setError(''); }}>Inscription</button>}
      </div>
      <form onSubmit={submit}>
        <div className="account-honeypot" aria-hidden="true"><label htmlFor="account-website">Site web</label><input id="account-website" name="website" value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off"/></div>
        <label htmlFor="account-username">Pseudo</label>
        <input id="account-username" name="username" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)}
          required minLength={3} maxLength={24} pattern="[A-Za-z0-9_\-]{3,24}" title="3 à 24 lettres, chiffres, tirets ou underscores" disabled={working} spellCheck={false}/>
        <label htmlFor="account-password">Mot de passe <small>8 caractères minimum</small></label>
        <div className="account-password"><input id="account-password" name="password" type={visible ? 'text' : 'password'}
          autoComplete={creating ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)}
          required minLength={8} maxLength={128} disabled={working}/>
          <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            title={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
        {creating && completed > 0 && <label className="account-check"><input type="checkbox" checked={importGuest} disabled={working} onChange={event => setImportGuest(event.target.checked)}/><span>Reprendre mon ancien carnet <small>{completed} passage{completed > 1 ? 's' : ''} exploré{completed > 1 ? 's' : ''}</small></span></label>}
        <button className="account-primary" type="submit" disabled={working}><LogIn size={18} aria-hidden="true"/>{working ? 'Connexion en cours…' : creating ? 'Créer mon compte' : 'Retrouver mon carnet'}</button>
      </form>
    </> : <>
      <div className="account-summary"><strong>{completed}</strong><span>passage{completed > 1 ? 's' : ''} exploré{completed > 1 ? 's' : ''}</span><CloudCheck size={26} aria-hidden="true"/></div>
      <p className={`account-state ${status}`} role="status">{SAVE_LABELS[status]}</p>
      {profile.error && <p className="account-error">{profile.error}</p>}
      {status === 'conflict' ? <>
        <label className="account-check"><input type="checkbox" checked={discard} onChange={event => setDiscard(event.target.checked)}/><span>Remplacer ma copie locale par le carnet du serveur</span></label>
        <button type="button" className="account-primary" disabled={working || !discard} onClick={reloadSave}><RefreshCw size={18}/>Recharger le carnet</button>
      </> : <button type="button" className="account-primary" disabled={working || status === 'saved'} onClick={() => run(profile.flush)}><CloudUpload size={18}/>{working ? 'Sauvegarde…' : status === 'saved' ? 'Tout est sauvegardé' : 'Sauvegarder maintenant'}</button>}
      <button type="button" className="account-guest" disabled={working || status === 'conflict'} onClick={logout}><LogOut size={16}/>Se déconnecter</button>
    </>}
    {error && <p className="account-error" role="alert">{error}</p>}
  </dialog>;
}