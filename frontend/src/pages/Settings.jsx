import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, AtSign, Calendar, FileText, Image as ImageIcon, Mail, Lock,
  ShieldCheck, ShieldAlert, Trash2, Check, ArrowLeft, Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, getToken } from '../core/backend';

function Section({ icon: Icon, title, desc, children }) {
  return (
    <section className="glass rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-accent" />
        </span>
        <div>
          <h2 className="text-white font-bold">{title}</h2>
          {desc && <p className="text-muted text-xs mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />}
      <input
        {...props}
        className={`w-full glass rounded-xl py-2.5 text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent/50 border border-white/10 transition ${Icon ? 'pl-10 pr-3.5' : 'px-3.5'}`}
      />
    </div>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <p className={`text-xs mt-2 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
  );
}

const btn = "gradient-accent text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition disabled:opacity-50 flex items-center gap-2";

export function Settings() {
  const { user, loggedIn, login, logout } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loggedIn) { navigate('/'); return; }
    // Pull the freshest user (has_password, 2FA status, new fields) once.
    api.me()
      .then(u => login(getToken(), u))
      .catch(() => {})
      .finally(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user || !ready) return null;

  const refresh = (updated) => login(getToken(), updated);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-muted hover:text-white transition text-sm mb-6">
          <ArrowLeft size={15} /> Back to profile
        </button>
        <h1 className="text-3xl font-black text-white mb-1">Account Settings</h1>
        <p className="text-muted text-sm mb-8">Manage your profile, security, and account.</p>

        <div className="flex flex-col gap-5">
          <ProfileSection user={user} onSaved={refresh} />
          <EmailSection user={user} onSaved={refresh} />
          <PasswordSection user={user} onSaved={refresh} />
          <TwoFactorSection user={user} onSaved={refresh} />
          <DangerSection user={user} onDeleted={() => { logout(); navigate('/'); }} />
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user, onSaved }) {
  const [name, setName]   = useState(user.name || '');
  const [username, setU]  = useState(user.username || '');
  const [dob, setDob]     = useState(user.date_of_birth || '');
  const [bio, setBio]     = useState(user.bio || '');
  const [picture, setPic] = useState(user.picture || '');
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const updated = await api.updateProfile({
        name, username: username || null, date_of_birth: dob || null,
        bio: bio || null, picture: picture || null,
      });
      onSaved(updated);
      setMsg({ ok: true, text: 'Profile saved.' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <Section icon={User} title="Profile" desc="Your public details.">
      <div className="flex flex-col gap-3">
        <label className="text-muted text-xs">Display name</label>
        <Field icon={User} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        <label className="text-muted text-xs">Username</label>
        <Field icon={AtSign} value={username} onChange={e => setU(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))} placeholder="unique_handle" />
        <label className="text-muted text-xs">Date of birth</label>
        <Field icon={Calendar} type="date" value={dob} onChange={e => setDob(e.target.value)} />
        <label className="text-muted text-xs">Avatar URL</label>
        <Field icon={ImageIcon} value={picture} onChange={e => setPic(e.target.value)} placeholder="https://…" />
        <label className="text-muted text-xs">Bio</label>
        <div className="relative">
          <FileText size={15} className="absolute left-3.5 top-3 text-muted" />
          <textarea
            value={bio} onChange={e => setBio(e.target.value.slice(0, 300))}
            placeholder="A little about you…" rows={3}
            className="w-full glass rounded-xl py-2.5 pl-10 pr-3.5 text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent/50 border border-white/10 transition resize-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <Msg msg={msg} />
          <button onClick={save} disabled={busy} className={`${btn} ml-auto`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save
          </button>
        </div>
      </div>
    </Section>
  );
}

function EmailSection({ user, onSaved }) {
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const updated = await api.changeEmail(email.trim(), pw);
      onSaved(updated);
      setEmail(''); setPw('');
      setMsg({ ok: true, text: 'Email updated.' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <Section icon={Mail} title="Email" desc={`Current: ${user.email}`}>
      <div className="flex flex-col gap-3">
        <Field icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="New email address" />
        <Field icon={Lock} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Confirm with your password" />
        <div className="flex items-center justify-between">
          <Msg msg={msg} />
          <button onClick={save} disabled={busy || !email || !pw} className={`${btn} ml-auto`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Update email
          </button>
        </div>
      </div>
    </Section>
  );
}

function PasswordSection({ user, onSaved }) {
  const hasPw = user.has_password;
  const [cur, setCur]   = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState(null);

  const save = async () => {
    if (next.length < 8) { setMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const updated = await api.changePassword(hasPw ? cur : null, next);
      onSaved(updated);
      setCur(''); setNext('');
      setMsg({ ok: true, text: hasPw ? 'Password changed.' : 'Password set.' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <Section icon={Lock} title="Password" desc={hasPw ? 'Change your password.' : 'Set a password for your account.'}>
      <div className="flex flex-col gap-3">
        {hasPw && <Field icon={Lock} type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="Current password" />}
        <Field icon={Lock} type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="New password (8+ characters)" />
        <div className="flex items-center justify-between">
          <Msg msg={msg} />
          <button onClick={save} disabled={busy || !next} className={`${btn} ml-auto`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {hasPw ? 'Change' : 'Set'} password
          </button>
        </div>
      </div>
    </Section>
  );
}

function TwoFactorSection({ user, onSaved }) {
  const enabled = user.two_factor_enabled;
  const [setup, setSetup]   = useState(null); // { secret, qr_svg }
  const [code, setCode]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState(null);
  const [disabling, setDis] = useState(false);

  const startSetup = async () => {
    setBusy(true); setMsg(null);
    try { setSetup(await api.twofaSetup()); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      const updated = await api.twofaEnable(code.trim());
      onSaved(updated); setSetup(null); setCode('');
      setMsg({ ok: true, text: 'Two-factor authentication enabled.' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setMsg(null);
    try {
      const updated = await api.twofaDisable(code.trim());
      onSaved(updated); setDis(false); setCode('');
      setMsg({ ok: true, text: 'Two-factor disabled.' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <Section
      icon={enabled ? ShieldCheck : ShieldAlert}
      title="Two-Factor Authentication"
      desc="Protect your account with an authenticator app (Google Authenticator, Authy…)."
    >
      {enabled ? (
        <div>
          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold mb-4">
            <ShieldCheck size={16} /> 2FA is ON
          </div>
          {!disabling ? (
            <button onClick={() => { setDis(true); setMsg(null); }} className="glass text-accent border border-accent/20 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-accent/10 transition">
              Disable 2FA
            </button>
          ) : (
            <div className="flex flex-col gap-3 max-w-xs">
              <p className="text-muted text-xs">Enter a current code to confirm:</p>
              <Field value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" maxLength={6} inputMode="numeric" />
              <div className="flex gap-2">
                <button onClick={disable} disabled={busy || code.length < 6} className={btn}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : null} Confirm disable
                </button>
                <button onClick={() => { setDis(false); setCode(''); }} className="text-muted text-sm hover:text-white px-3">Cancel</button>
              </div>
            </div>
          )}
          <Msg msg={msg} />
        </div>
      ) : setup ? (
        <div className="flex flex-col gap-4">
          <p className="text-muted text-sm">1. Scan this QR code with your authenticator app:</p>
          <div className="bg-white rounded-xl p-3 w-44 h-44 flex items-center justify-center">
            <img src={setup.qr_svg} alt="2FA QR code" className="w-full h-full" />
          </div>
          <p className="text-muted text-xs">
            Or enter this key manually:
            <code className="block mt-1 glass rounded-lg px-3 py-2 text-white text-sm break-all select-all">{setup.secret}</code>
          </p>
          <p className="text-muted text-sm">2. Enter the 6-digit code it shows:</p>
          <div className="flex gap-2 max-w-xs">
            <Field value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" maxLength={6} inputMode="numeric" />
            <button onClick={enable} disabled={busy || code.length < 6} className={btn}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Enable
            </button>
          </div>
          <Msg msg={msg} />
        </div>
      ) : (
        <div>
          <button onClick={startSetup} disabled={busy} className={btn}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Set up 2FA
          </button>
          <Msg msg={msg} />
        </div>
      )}
    </Section>
  );
}

function DangerSection({ user, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [pw, setPw]     = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState(null);

  const del = async () => {
    setBusy(true); setMsg(null);
    try { await api.deleteAccount(user.has_password ? pw : null); onDeleted(); }
    catch (e) { setMsg({ ok: false, text: e.message }); setBusy(false); }
  };

  return (
    <section className="rounded-2xl p-6 border border-red-500/20 bg-red-500/[0.04]">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
          <Trash2 size={18} className="text-red-400" />
        </span>
        <div>
          <h2 className="text-white font-bold">Delete account</h2>
          <p className="text-muted text-xs mt-0.5">Permanently removes your account, favorites and history. This can't be undone.</p>
        </div>
      </div>
      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="bg-red-500/15 text-red-400 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-500/25 transition">
          Delete my account
        </button>
      ) : (
        <div className="flex flex-col gap-3 max-w-xs">
          {user.has_password && (
            <Field icon={Lock} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Confirm your password" />
          )}
          <div className="flex gap-2">
            <button onClick={del} disabled={busy || (user.has_password && !pw)} className="bg-red-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Permanently delete
            </button>
            <button onClick={() => { setConfirming(false); setPw(''); }} className="text-muted text-sm hover:text-white px-3">Cancel</button>
          </div>
          <Msg msg={msg} />
        </div>
      )}
    </section>
  );
}
