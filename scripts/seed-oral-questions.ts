import { supabase } from '../app/lib/supabaseClient';
import oralExamData from '../app/data/oral-exam-questions.json';

async function seedOralQuestions() {
  console.log('📦 Supabaseへの登録を開始します...');

  // 💡 app_knowledge テーブルの実際のカラム (key, data, updated_at) のみに指定
  const { error } = await supabase
    .from('app_knowledge')
    .upsert({
      key: 'ORAL_EXAM_QUESTIONS',
      data: oralExamData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error('❌ エラーが発生しました:', error.message);
  } else {
    console.log('✅ 3,675行のデータをSupabaseに正常登録しました！');
  }
}

seedOralQuestions();