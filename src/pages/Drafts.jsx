import React, { useState, useEffect } from 'react';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { PenLine, Trash2, Send, FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Drafts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(r => r.data.user).then(setCurrentUser).catch(() => {});
  }, []);

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['drafts', currentUser?.email],
    queryFn: () => currentUser ? entities.Draft.filter({ user_id: currentUser.id }, '-updated_at') : [],
    enabled: !!currentUser,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Draft.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drafts'] }),
  });

  const handleDelete = async (id) => {
    setDeletingId(id);
    await deleteMutation.mutateAsync(id);
    setDeletingId(null);
  };

  const handlePublish = (draft) => {
    const aiResult = {
      title: draft.title || '',
      prefecture: draft.prefecture || '',
      days: draft.days ? [{ day_index: 1, stops: [] }] : [],
    };
    navigate(
      createPageUrl('CreateTrip') +
        `?draftId=${draft.id}&prefill=${encodeURIComponent(JSON.stringify({
          title: draft.title,
          prefecture: draft.prefecture,
          days: draft.days,
          description: draft.description,
          tags: draft.tags,
          thumbnail_url: draft.thumbnail_url,
        }))}`
    );
  };

  const handleEdit = (draft) => {
    navigate(createPageUrl('DraftEdit') + `?id=${draft.id}`);
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
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            旅路
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{drafts.length}件の旅路</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(createPageUrl('DraftEdit'))}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          新規
        </Button>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">旅路はまだありません</p>
          <p className="text-sm text-gray-400 mt-1">旅をしながら旅程を書こう</p>
          <Button
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate(createPageUrl('DraftEdit'))}
          >
            <Plus className="w-4 h-4 mr-2" />
            旅路を作成
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {draft.title || '（タイトル未設定）'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {draft.prefecture && (
                      <span className="text-xs text-gray-500">📍 {draft.prefecture}</span>
                    )}
                    {draft.days && (
                      <span className="text-xs text-gray-500">📅 {draft.days}日間</span>
                    )}
                  </div>
                  {draft.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {draft.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs px-2 py-0.5"
                        >
                          #{tag}
                        </Badge>
                      ))}
                      {draft.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{draft.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  {draft.description && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{draft.description}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-2">
                    {new Date(draft.updated_date).toLocaleDateString('ja-JP', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                    に更新
                  </p>
                </div>
                {draft.thumbnail_url && (
                  <img
                    src={draft.thumbnail_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-gray-700"
                  onClick={() => handleEdit(draft)}
                >
                  <PenLine className="w-3.5 h-3.5 mr-1" />
                  編集
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handlePublish(draft)}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  投稿する
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2"
                  onClick={() => handleDelete(draft.id)}
                  disabled={deletingId === draft.id}
                >
                  {deletingId === draft.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}