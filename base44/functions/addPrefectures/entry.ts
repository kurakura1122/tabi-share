import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PREFECTURES = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知',
  '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
  '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知',
  '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const trips = await base44.asServiceRole.entities.trips.list('', 500);
    
    let updatedCount = 0;
    let prefectureIndex = 0;

    for (const trip of trips) {
      if (!trip.prefecture) {
        let detectedPrefecture = null;

        // タイトルから都道府県名を検出
        for (const pref of PREFECTURES) {
          if (trip.title && trip.title.includes(pref)) {
            detectedPrefecture = pref;
            break;
          }
        }

        // 検出できなかった場合は均等に分散
        if (!detectedPrefecture) {
          detectedPrefecture = PREFECTURES[prefectureIndex % PREFECTURES.length];
          prefectureIndex++;
        }

        await base44.asServiceRole.entities.trips.update(trip.id, {
          prefecture: detectedPrefecture
        });
        
        updatedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `${updatedCount}件の旅程にprefectureを追加しました`,
      total: trips.length,
      updated: updatedCount
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});