// 版本信息 - 每次发布时更新
export const VERSION = 'v0.1.20';
export const BUILD_TIME = '2026-05-18 21:45';

// 获取格式化的时间
export function getFormattedBuildTime(): string {
  const date = new Date('2026-05-18T21:45:00');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
