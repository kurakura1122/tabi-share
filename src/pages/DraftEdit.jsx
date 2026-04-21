import React, { useState, useEffect } from 'react';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Save, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREFECTURES = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知',
  '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
  '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知',
  '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄',
];

const TAGS = [
  'グルメ', '観光', '映え', 'ショッピング', 'アドベンチャー',
  '文化体験', 'リラックス', '温泉', '自然', '歴史', 'カフェ', '絶景', 'リゾート', 'アクティブ',
];

export default function DraftEdit() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const draftId = urlParams.get('id');

  const [form, setForm] = useState({
    title: '',
    prefecture: '',
    days: '',
    description: '',
    day_notes: [],
    tags: [],
    thumbnail_url: '',
    budget: '',
    transport_mode: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!draftId);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!draftId) return;
    entities.Draft.filter({ id: draftId }).then((res) => {
      if (res?.[0]) {
        const d = res[0];
        setForm({
          title: d.title || '',
          prefecture: d.prefecture || '',
          days: d.days ? String(d.days) : '',
          description: d.description || '',
          day_notes: d.day_notes || [],
          tags: d.tags || [],
          thumbnail_url: d.thumbnail_url || '',
          budget: d.budget || '',
          transport_mode: d.transport_mode || '',
        });
      }
      setIsLoading(false);
    });
  }, [draftId]);

  const handleDaysChange = (val) => {
    const n = val ? parseInt(val) : 0;
    setForm((prev) => {
      const newNotes = Array.from({ length: n }, (_, i) => prev.day_notes[i] || '');
      return { ...prev, days: val, day_notes: newNotes };
    });
  };

  const updateDayNote = (index, text) => {
    setForm((prev) => {
      const updated = [...prev.day_notes];
      updated[index] = text;
      return { ...prev, day_notes: updated };
    });
  };

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await uploadFile(file);
    setForm((prev) => ({ ...prev, thumbnail_url: file_url }));
    setIsUploading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const data = {
      ...form,
      days: form.days ? Number(form.days) : undefined,
    };
    if (draftId) {
      await entities.Draft.update(draftId, data);
    } else {
      await entities.Draft.create(data);
    }
    setIsSaving(false);
    navigate(createPageUrl('Drafts'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(createPageUrl('Drafts'))}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">下書き一覧</span>
        </button>
        <h1 className="text-base font-bold text-gray-900">
          {draftId ? '下書きを編集' : '新しい下書き'}
        </h1>
        <div className="w-16" />
      </div>

      <div className="space-y-5">
        {/* タイトル */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1">タイトル</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="旅程のタイトル"
            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 都道府県 & 日数 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 block mb-1">都道府県</label>
            <select
              value={form.prefecture}
              onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">未設定</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="text-sm font-semibold text-gray-700 block mb-1">日数</label>
            <input
              type="number"
              min="1"
              max="14"
              value={form.days}
              onChange={(e) => handleDaysChange(e.target.value)}
              placeholder="例: 2"
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* 旅程メモ */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">旅程メモ</label>
          {form.day_notes.length > 0 ? (
            <div className="space-y-3">
              {form.day_notes.map((note, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-blue-600 mb-1">{i + 1}日目</p>
                  <textarea
                    value={note}
                    onChange={(e) => updateDayNote(i, e.target.value)}
                    placeholder={`${i + 1}日目の予定・メモ`}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>
              ))}
            </div>
          ) : (
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="行きたい場所、メモなど自由に書いてください（日数を設定すると日毎に分けられます）"
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          )}
        </div>

        {/* タグ */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">テーマ</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.tags.includes(tag)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* サムネイル */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1">サムネイル画像</label>
          {form.thumbnail_url ? (
            <div className="relative">
              <img
                src={form.thumbnail_url}
                alt=""
                className="w-full h-40 object-cover rounded-lg"
              />
              <button
                onClick={() => setForm({ ...form, thumbnail_url: '' })}
                className="absolute top-2 right-2 bg-white bg-opacity-80 text-gray-700 rounded-full px-2 py-0.5 text-xs"
              >
                削除
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 bg-gray-50">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">タップして画像を選択</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        {/* 予算 */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1">予算メモ</label>
          <input
            type="text"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            placeholder="例: 50,000円以内"
            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="mt-8 pb-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 text-base font-semibold rounded-xl"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {isSaving ? '保存中...' : '下書きを保存'}
        </Button>
      </div>
    </div>
  );
}