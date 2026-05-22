import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, X } from 'lucide-react';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';

const AVAILABLE_TAGS = ['グルメ', '観光', '映え', 'ショッピング', 'アドベンチャー', '文化体験', 'リラックス', 'ゆったり', '効率重視', 'アクティブ', '一人旅', '友達', '恋人', '家族'];

export default function PostSettingsModal({ open, onClose, onConfirm, initialData, isPosting }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState('');
  const [userName, setUserName] = useState('');
  const [tags, setTags] = useState(initialData?.tags || []);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await uploadFile(file);
    setThumbnailUrl(file_url);
    setIsUploading(false);
  };

  const handleConfirm = () => {
    onConfirm({ title, description, tags, thumbnailUrl, userName });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>投稿設定</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="旅程タイトル" />
          </div>

          <div className="space-y-2">
            <Label>投稿者名</Label>
            <Input value={userName} onChange={e => setUserName(e.target.value)} placeholder="表示される名前（空白の場合はアカウント名）" />
          </div>

          <div className="space-y-2">
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="旅程の説明を入力してください"
              className="h-24"
            />
          </div>

          <div className="space-y-2">
            <Label>タグ</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-gray-500">選択中:</span>
                {tags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>サムネイル画像</Label>
            {thumbnailUrl ? (
              <div className="relative">
                <img src={thumbnailUrl} alt="thumbnail" className="w-full h-32 object-cover rounded-lg" />
                <button onClick={() => setThumbnailUrl('')} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <Upload className="w-5 h-5 text-gray-400 mb-1" />}
                <span className="text-xs text-gray-500">{isUploading ? 'アップロード中...' : '画像をアップロード'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleConfirm}
            disabled={isPosting || !title}
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            投稿する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
