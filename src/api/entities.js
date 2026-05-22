/**
 * Supabase entity client
 * Base44の base44.entities.* と同じAPIで使えるラッパー
 */
import { supabase } from '@/lib/supabaseClient';

// ソートフィールドの変換 "-created_date" → { column: 'created_at', ascending: false }
function parseSort(sortField) {
  if (!sortField) return { column: 'created_at', ascending: false };
  const desc = sortField.startsWith('-');
  const column = desc ? sortField.slice(1) : sortField;
  // Base44のフィールド名 → Supabaseのカラム名のマッピング
  const fieldMap = {
    created_date: 'created_at',
    updated_date: 'updated_at',
    saves_count: 'saves_count',
    likes_count: 'likes_count',
    order_index: 'order_index',
    createdAt: 'created_at',
  };
  return { column: fieldMap[column] || column, ascending: !desc };
}

// Base44のfilterクエリ → Supabaseのクエリに変換
function applyFilters(query, filterObj) {
  if (!filterObj) return query;
  for (const [key, value] of Object.entries(filterObj)) {
    if (key === 'created_by') {
      // Base44のcreated_byはemailだが、Supabaseではuser_idで管理
      // この変換はAuthContext経由でuser_idを使うよう各ページを更新する
      continue;
    }
    if (Array.isArray(value)) {
      query = query.contains(key, value);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function createEntityClient(tableName) {
  return {
    // 全件取得
    async list(sortField, limit) {
      const { column, ascending } = parseSort(sortField);
      let query = supabase.from(tableName).select('*').order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    // 条件絞り込み
    async filter(filterObj, sortField, limit) {
      const { column, ascending } = parseSort(sortField);
      let query = supabase.from(tableName).select('*').order(column, { ascending });
      query = applyFilters(query, filterObj);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    // 1件取得
    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    // 作成（user_idを自動付与）
    async create(record) {
      const { data: { user } } = await supabase.auth.getUser();
      const insertData = { ...record };
      if (user) insertData.user_id = user.id;
      // Base44の内部フィールドを除去
      delete insertData._dayTexts;
      delete insertData._prefecture;
      const { data, error } = await supabase.from(tableName).insert(insertData).select().single();
      if (error) throw error;
      return data;
    },

    // 更新
    async update(id, updates) {
      const cleanUpdates = { ...updates };
      delete cleanUpdates._dayTexts;
      delete cleanUpdates._prefecture;
      const { data, error } = await supabase.from(tableName).update(cleanUpdates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    // 削除
    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },

    // 一括作成
    async bulkCreate(records) {
      const { data: { user } } = await supabase.auth.getUser();
      const insertData = records.map(r => user ? { ...r, user_id: user.id } : r);
      const { data, error } = await supabase.from(tableName).insert(insertData).select();
      if (error) throw error;
      return data || [];
    },
  };
}

// 各エンティティのクライアント（Base44と同じ名前でエクスポート）
export const entities = {
  trips: createEntityClient('trips'),
  savedTrips: createEntityClient('saved_trips'),
  generationHistory: createEntityClient('generation_history'),
  TripStop: createEntityClient('trip_stops'),
  Draft: createEntityClient('drafts'),
};

// 画像アップロード（Base44のUploadFileの代替）
export async function uploadFile(file) {
  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('trip-images')
    .upload(fileName, file, { contentType: file.type });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('trip-images').getPublicUrl(fileName);
  return { file_url: publicUrl };
}

// Edge Function呼び出し（Base44のfunctions.invokeの代替）
export async function invokeFunction(functionName, params) {
  const { data, error } = await supabase.functions.invoke(functionName, { body: params });
  if (error) throw error;
  return data;
}
