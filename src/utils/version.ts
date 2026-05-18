// 版本信息 - 每次发布时更新
export const VERSION = 'v0.1.13';
export const BUILD_TIME = '2026-05-18 19:22';

// 获取格式化的时间
export function getFormattedBuildTime(): string {
  const date = new Date('2026-05-18T19:05:00');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
