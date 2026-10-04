export function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "";
  const unit = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(unit)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(1))} ${sizes[index]}`;
}
