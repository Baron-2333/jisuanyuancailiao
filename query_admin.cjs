const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zehhkfkntqrzywcmkckh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaGhrZmtudHFyenl3Y21rY2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDA4NDUsImV4cCI6MjA5NDY3Njg0NX0.JDTyJnScRW_ExP6rf3CUBmixR7H1YlakIKzH9TTTyrs'
);

async function main() {
  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_key, setting_value')
    .eq('is_admin', true);

  if (error) {
    console.log('查询失败:', error.message);
    return;
  }

  console.log('Admin 用户数据:');
  for (const row of data) {
    if (row.setting_key === 'recipes') {
      const recipes = JSON.parse(row.setting_value || '[]');
      console.log('配方数量:', recipes.length);
      if (recipes.length > 0) {
        console.log('配方列表:');
        recipes.forEach(r => {
          console.log('  -', r.name, '(产出', r.outputQuantity, '个)');
        });
      }
    } else if (row.setting_key === 'materials') {
      const materials = JSON.parse(row.setting_value || '[]');
      console.log('原材料数量:', materials.length);
    }
  }
}

main();
