'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Info, Trash2 } from 'lucide-react';
import {
  NICKNAME_MAX_LENGTH,
  clearNickname,
  getNickname,
  setNickname,
} from '@/lib/auth/profile';

export default function ProfilePage() {
  const router = useRouter();
  const [nickname, setNicknameInput] = useState('');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const current = getNickname();
    setNicknameInput(current);
    setSaved(current);
  }, []);

  const handleSave = () => {
    setError(null);
    setNotice(null);
    const result = setNickname(nickname);
    if (!result.ok) {
      setError(result.error ?? '保存失败');
      return;
    }
    setSaved(result.nickname ?? '');
    setNotice('已保存');
    router.push('/');
  };

  const handleClear = () => {
    clearNickname();
    setNicknameInput('');
    setSaved('');
    setError(null);
    setNotice('已清除昵称');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center px-4 py-3">
          <Link href="/" className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">设置昵称</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">
            {saved ? '修改昵称' : '注册'}
          </h2>
          <p className="text-xs text-[#9FAF9E] leading-relaxed mb-3">
            只需要一个昵称，不用邮箱、不用密码。它会在新建对局和加入房间时自动填上。
          </p>

          <label className="text-xs text-[#9FAF9E] mb-1 block">昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNicknameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
            }}
            maxLength={NICKNAME_MAX_LENGTH}
            placeholder="例如：东风"
            autoComplete="off"
            className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2.5 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
          />
          <p className="text-[10px] text-[#55695B] mt-1">
            {nickname.length} / {NICKNAME_MAX_LENGTH}
          </p>

          {error && <p className="mt-3 text-xs text-[#C4463A]">{error}</p>}
          {notice && <p className="mt-3 text-xs text-[#5B8C5A]">{notice}</p>}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={!nickname.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              {saved ? '保存' : '注册并开始'}
            </button>
            {saved && (
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[#9FAF9E] hover:text-[#C4463A] rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清除
              </button>
            )}
          </div>
        </section>

        <section className="bg-[#C9A24B]/10 border border-[#C9A24B]/30 rounded-lg p-4">
          <h2 className="text-sm font-medium text-[#C9A24B] mb-1 flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            昵称只存在这台设备上
          </h2>
          <p className="text-xs text-[#9FAF9E] leading-relaxed">
            不上传服务器，换设备或换浏览器需要重新设置。
            它只是显示用的名字，别人填一样的昵称也不会冲突，房间里的记录仅按房间号归属。
          </p>
        </section>
      </main>
    </div>
  );
}
