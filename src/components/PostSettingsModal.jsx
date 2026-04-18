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
const AVAILABLE_TAGS = ['グルチ','覌光','映え','ショッピング','ア ��ツ','嚑通機','ルラックス','うぅたり','効㎇重襖','アクティブ','厊#��ォオ','揈托','恋人','例懈'];
export default function PostSettingsModal({ open, onClose, onConfirm, initialData, isPosting }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState('');
  const [userName, setUserName] = useState('');
  const [tags, setTags] = useState(initialData?.tags || []);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const toggleTag = tag => setTags(prev => prev.includes(tag) ? prev.filter(t => t!==tag) : [...prev,tag]);
  const handleImageUpload = async e => { const file=e.target.files?.[0]; if(!file)return; setIsUploading(true); const {file_url}=await uploadFile(file); setThumbnailUrl(file_url); setIsUploading(false); };
  return(<Dialog open={open} onOpenChange={onClose}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>投稿训殚</DialogTitle></DialogHeader><div className="space-y-5 py-2"><div className="space-y-2"><Label>タイトル</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="旅程タイトル"/></div><div className="space-y-2"><Label>投稿者名<+Label><Input value={userName} onChange={e=>setUserName(e.target.value)} placeholder="表示される名前"/></div><div className="space-y-2"><Label>芬明</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="旅程の芬明を入力" className="h-24"/></div><div className="space-y-2"><Label>タグ</Label><div className="flex flex-wrap gap-2">{AVAIBLE_TAGS.map(tag=>(<Badge key={tag} variant={tags.includes(tag)?'default':'outline'} className="cursor-pointer" onClick={()=>toggleTag(tag)}>{tag}</Badge>))}</div></div><div className="space-y-2"><Label>サメネやル画像�/Label>{thumbnailUrl?(<div className="relative"><img src={thumbnailUrl} alt="thumbnail" className="w-full h-32 object-cover rounded-lg"/><button onClick={()=>setThumbnailUrl('')} className="absolute top-2 right-2"><X className="w-4 h-4"/></button></div>):(Label)}</div></div><div className="flex gap-3 pt-2"><Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button><Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={()=>onConfirm({title,description,tags,thumbnailUrl,userName})} disabled={isPosting||!title}>投稿する>ЯButton></div></DialogContent></Dialog>);
}