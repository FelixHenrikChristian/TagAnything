import { Tag, TagGroup } from '../types';

// TagSpaces 格式定义
export interface TagSpacesTag {
  title: string;
  color: string;
  textcolor: string;
}

export interface TagSpacesTagGroup {
  title: string;
  uuid: string;
  children: TagSpacesTag[];
  created_date: number;
  color: string;
  textcolor: string;
  modified_date: number;
  expanded: boolean;
}

export interface TagSpacesExport {
  appName: string;
  appVersion: string;
  settingsVersion: number;
  tagGroups: TagSpacesTagGroup[];
}

/**
 * 将TagSpaces格式转换为内部格式
 */
export function convertFromTagSpaces(tagSpacesData: TagSpacesExport): TagGroup[] {
  return tagSpacesData.tagGroups.map((tsGroup) => {
    const tagGroup: TagGroup = {
      id: tsGroup.uuid,
      name: tsGroup.title,
      defaultColor: tsGroup.color,
      description: `导入自TagSpaces，创建时间：${new Date(tsGroup.created_date).toLocaleString()}`,
      tags: tsGroup.children.map((tsTag, index) => ({
        id: `${tsGroup.uuid}_tag_${index}_${Date.now()}`,
        name: tsTag.title,
        color: tsTag.color,
        textcolor: tsTag.textcolor, // 保留文字颜色
        groupId: tsGroup.uuid,
      })),
    };
    return tagGroup;
  });
}

/**
 * 将内部格式转换为TagSpaces格式
 */
export function convertToTagSpaces(tagGroups: TagGroup[]): TagSpacesExport {
  const now = Date.now();
  
  const tagSpacesGroups: TagSpacesTagGroup[] = tagGroups.map((group) => ({
    title: group.name,
    uuid: group.id,
    children: group.tags.map((tag) => ({
      title: tag.name,
      color: tag.color,
      textcolor: tag.textcolor || getContrastColor(tag.color), // 使用原有textcolor或自动计算
    })),
    created_date: now,
    color: group.defaultColor,
    textcolor: getContrastColor(group.defaultColor),
    modified_date: now,
    expanded: true,
  }));

  return {
    appName: "TagAnything",
    appVersion: "1.0.0",
    settingsVersion: 3,
    tagGroups: tagSpacesGroups,
  };
}

/**
 * 根据背景色计算对比文字颜色
 */
function getContrastColor(backgroundColor: string): string {
  // 移除 # 号
  const hex = backgroundColor.replace('#', '');
  
  // 处理rgba格式
  if (backgroundColor.startsWith('rgba')) {
    // 简化处理，对于rgba格式默认返回白色
    return 'white';
  }
  
  // 转换为RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 根据亮度返回黑色或白色
  return brightness > 128 ? '#000000' : '#ffffff';
}

/**
 * 验证TagSpaces格式数据
 */
export function validateTagSpacesFormat(data: any): data is TagSpacesExport {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // 检查必需字段
  if (!data.appName || !data.appVersion || !Array.isArray(data.tagGroups)) {
    return false;
  }
  
  // 检查标签组格式
  for (const group of data.tagGroups) {
    if (!group.title || !group.uuid || !Array.isArray(group.children)) {
      return false;
    }
    
    // 检查标签格式
    for (const tag of group.children) {
      if (!tag.title || !tag.color) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * 合并标签组（避免重复）
 */
export function mergeTagGroups(existing: TagGroup[], imported: TagGroup[]): TagGroup[] {
  const merged = [...existing];
  
  imported.forEach((importedGroup) => {
    const existingIndex = merged.findIndex(g => g.name === importedGroup.name);
    
    if (existingIndex >= 0) {
      // 如果标签组已存在，合并标签
      const existingGroup = merged[existingIndex];
      const mergedTags = [...existingGroup.tags];
      
      importedGroup.tags.forEach((importedTag) => {
        const tagExists = mergedTags.some(t => t.name === importedTag.name);
        if (!tagExists) {
          mergedTags.push({
            ...importedTag,
            id: `${existingGroup.id}_imported_${Date.now()}_${Math.random()}`,
            groupId: existingGroup.id,
          });
        }
      });
      
      merged[existingIndex] = {
        ...existingGroup,
        tags: mergedTags,
      };
    } else {
      // 如果标签组不存在，直接添加
      merged.push(importedGroup);
    }
  });
  
  return merged;
}