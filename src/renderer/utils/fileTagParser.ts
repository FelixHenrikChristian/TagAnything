import { Tag, TagGroup } from '../types';

/**
 * 从文件名中解析标签
 * 支持格式：[标签1 标签2 标签3]文件名.扩展名
 * @param filename 文件名
 * @returns 解析出的标签名称数组
 */
export function parseTagsFromFilename(filename: string): string[] {
  // 匹配方括号内的内容
  const tagMatch = filename.match(/^\[([^\]]+)\]/);
  if (!tagMatch) {
    return [];
  }

  // 提取标签字符串并按空格分割
  const tagString = tagMatch[1];
  const tags = tagString.split(/\s+/).filter(tag => tag.trim().length > 0);

  return tags;
}

/**
 * 从标签名称创建标签对象，只匹配现有标签库中的标签
 * @param tagNames 标签名称数组
 * @param tagGroups 现有标签组
 * @returns 包含匹配标签和未匹配标签的对象
 */
export function createTagsFromNames(tagNames: string[], tagGroups: TagGroup[]): {
  matchedTags: Tag[];
  unmatchedTags: string[];
} {
  const matchedTags: Tag[] = [];
  const unmatchedTags: string[] = [];

  tagNames.forEach(tagName => {
    // 查找现有标签
    let existingTag: Tag | undefined;
    for (const group of tagGroups) {
      existingTag = group.tags.find(tag =>
        tag.name.toLowerCase() === tagName.toLowerCase()
      );
      if (existingTag) break;
    }

    if (existingTag) {
      // 使用现有标签
      matchedTags.push(existingTag);
    } else {
      // 记录未匹配的标签名称
      unmatchedTags.push(tagName);
    }
  });

  return { matchedTags, unmatchedTags };
}

/**
 * 为未匹配的标签名称创建临时显示标签
 * @param tagNames 未匹配的标签名称数组
 * @returns 临时标签对象数组
 */
export function createTemporaryTags(tagNames: string[]): Tag[] {
  return tagNames.map(tagName => ({
    id: `temp_tag_${Date.now()}_${Math.random()}`,
    name: tagName,
    color: getDefaultTagColor(tagName),
    textcolor: '#ffffff',
    groupId: 'temporary' // 临时标签分组
  }));
}

/**
 * 为新标签生成默认颜色
 * @param tagName 标签名称
 * @returns 颜色值
 */
function getDefaultTagColor(tagName: string): string {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
  ];

  // 基于标签名称的哈希值选择颜色
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * 将新标签添加到标签系统中
 * @param newTags 新标签数组
 * @param tagGroups 现有标签组
 * @returns 更新后的标签组
 */
export function addTagsToSystem(newTags: Tag[], tagGroups: TagGroup[]): TagGroup[] {
  const updatedGroups = [...tagGroups];

  // 确保有默认标签组
  let defaultGroup = updatedGroups.find(g => g.id === 'default');
  if (!defaultGroup) {
    defaultGroup = {
      id: 'default',
      name: '默认标签组',
      defaultColor: '#2196f3',
      description: '系统默认标签组',
      tags: []
    };
    updatedGroups.push(defaultGroup);
  }

  // 添加新标签到默认组
  newTags.forEach(newTag => {
    // 检查标签是否已存在
    const exists = updatedGroups.some(group =>
      group.tags.some(tag => tag.name.toLowerCase() === newTag.name.toLowerCase())
    );

    if (!exists) {
      defaultGroup!.tags.push(newTag);
    }
  });

  return updatedGroups;
}

/**
 * 获取文件的显示名称（去除标签部分）
 * @param filename 原始文件名
 * @returns 显示用的文件名
 */
export function getDisplayName(filename: string): string {
  // 移除开头的标签部分
  return filename.replace(/^\[([^\]]+)\]/, '').trim();
}

/**
 * 获取文件的显示名称（去除标签部分和后缀名）
 * @param filename 原始文件名
 * @returns 显示用的文件名（不含后缀）
 */
export function getDisplayNameWithoutExtension(filename: string): string {
  const displayName = getDisplayName(filename);
  // 移除后缀名
  const lastDotIndex = displayName.lastIndexOf('.');
  if (lastDotIndex > 0) {
    return displayName.substring(0, lastDotIndex);
  }
  return displayName;
}

/**
 * 根据文件扩展名获取文件类型颜色
 * @param extension 文件扩展名
 * @returns 颜色值
 */
export function getFileTypeColor(extension?: string): string {
  if (!extension) return '#757575';

  const colorMap: { [key: string]: string } = {
    // 图片
    'jpg': '#4caf50', 'jpeg': '#4caf50', 'png': '#4caf50', 'gif': '#4caf50', 'bmp': '#4caf50', 'svg': '#4caf50',
    // 视频
    'mp4': '#f44336', 'avi': '#f44336', 'mkv': '#f44336', 'mov': '#f44336', 'wmv': '#f44336', 'flv': '#f44336',
    // 音频
    'mp3': '#9c27b0', 'wav': '#9c27b0', 'flac': '#9c27b0', 'aac': '#9c27b0', 'ogg': '#9c27b0',
    // 文档
    'pdf': '#f44336', 'doc': '#2196f3', 'docx': '#2196f3', 'txt': '#757575', 'rtf': '#757575',
    // 压缩包
    'zip': '#ff9800', 'rar': '#ff9800', '7z': '#ff9800', 'tar': '#ff9800', 'gz': '#ff9800',
    // 代码
    'js': '#ffeb3b', 'ts': '#2196f3', 'html': '#ff5722', 'css': '#2196f3', 'py': '#4caf50', 'java': '#ff9800',
  };

  return colorMap[extension.toLowerCase()] || '#757575';
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名（不含点）
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

/**
 * 格式化修改日期
 * @param date 日期对象
 * @returns 格式化后的日期字符串
 */
export function formatModifiedDate(date: Date): string {
  return date.toLocaleDateString();
}