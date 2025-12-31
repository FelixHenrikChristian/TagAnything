import * as OpenCC from 'opencc-js';

// 简体 -> 繁体
const s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
// 繁体 -> 简体  
const t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });

/**
 * 检查文件名是否匹配查询（支持简繁共通）
 * @param filename 文件名
 * @param query 搜索查询
 * @param enableSimplifiedTraditional 是否启用简繁共通
 * @returns 是否匹配
 */
export function matchWithChineseVariants(
    filename: string,
    query: string,
    enableSimplifiedTraditional: boolean
): boolean {
    const lowerFilename = filename.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // 直接匹配
    if (lowerFilename.includes(lowerQuery)) return true;

    if (!enableSimplifiedTraditional) return false;

    // 简体转繁体后匹配
    const traditionalQuery = s2tConverter(lowerQuery);
    if (traditionalQuery !== lowerQuery && lowerFilename.includes(traditionalQuery)) return true;

    // 繁体转简体后匹配
    const simplifiedQuery = t2sConverter(lowerQuery);
    if (simplifiedQuery !== lowerQuery && lowerFilename.includes(simplifiedQuery)) return true;

    return false;
}
