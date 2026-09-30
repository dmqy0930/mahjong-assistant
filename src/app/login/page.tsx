'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Info, Loader2, LogOut } from 'lucide-react';
import {
  getCurrentAccount,
  registerAccount,
  signIn,
  signOut,
} from '@/lib/auth/local-account';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState<string | null>(null);

  useEffect(() => {
    setLoggedInAs(getCurrentAccount()?.email ?? null);
  }, []);

  const submit = async () => {
    setError(null);
    if (mode === 'signup' && password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }

    setBusy(true);
    try {
      const result =
        mode === 'signup'
          ? await registerAccount(email, password)
          : await signIn(email, password);
      if (!result.ok) {
        setError(result.error ?? '操作失败');
        return;
      }
      router.push('/');
    } catch {
      setError('操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setLoggedInAs(null);
    setPassword('');
    setConfirm('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center px-4 py-3">
          <Link href="/" className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">
            {loggedInAs ? '账号' : '登录 / 注册'}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <section className="bg-[#C9A24B]/10 border border-[#C9A24B]/30 rounded-lg p-4">
          <h2 className="text-sm font-medium text-[#C9A24B] mb-1 flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            账号只存在这台设备上
          </h2>
          <p className="text-xs text-[#9FAF9E] leading-relaxed">
            不发送验证码、不校验邮箱是否存在、也不会上传到服务器。密码经
            PBKDF2 派生后存在浏览器本地，服务器无从得知。
            <br />
            代价是：换设备或换浏览器就要重新注册，也**不具备真正的安全性**——
            能打开这台设备上浏览器的人，都能访问这些数据。
          </p>
        </section>

        {loggedInAs && (
          <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
            <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">当前账号</h2>
            <p className="text-sm text-[#EFE9DA] break-all">{loggedInAs}</p>
            <button
              onClick={handleSignOut}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-[#26382C] text-[#EFE9DA] rounded-md text-xs font-medium hover:bg-[#31473A] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出登录
            </button>
          </section>
        )}

        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <div className="flex gap-2 mb-4">
            {(
              [
                { id: 'signin' as Mode, label: '登录' },
                { id: 'signup' as Mode, label: '注册' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                  mode === tab.id
                    ? 'bg-[#C4463A] text-[#F6F1E4]'
                    : 'bg-[#26382C] text-[#9FAF9E] hover:text-[#EFE9DA]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#9FAF9E] mb-1 block">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
              />
            </div>

            <div>
              <label className="text-xs text-[#9FAF9E] mb-1 block">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="off"
                className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="text-xs text-[#9FAF9E] mb-1 block">确认密码</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
                />
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-xs text-[#C4463A] leading-relaxed">{error}</p>}

          <button
            onClick={submit}
            disabled={busy || !email || !password}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {mode === 'signup' ? '注册并登录' : '登录'}
          </button>

          {mode === 'signup' && (
            <p className="mt-3 text-[10px] text-[#55695B] leading-relaxed">
              忘记密码没有找回途径：本地账号不经过服务器，无法验证身份。忘记时只能清除浏览器数据重新注册。
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
