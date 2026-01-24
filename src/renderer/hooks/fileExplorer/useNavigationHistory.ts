import { useCallback, useRef, useState } from 'react';
import { FilterState } from '../../components/FileExplorer/types';

/**
 * 导航状态：包含路径和筛选状态
 */
export interface NavigationState {
    path: string;
    filterState: FilterState;
}

/**
 * 历史记录最大条目数
 */
const MAX_HISTORY_SIZE = 50;

/**
 * 创建空的筛选状态
 */
export const createEmptyFilterState = (): FilterState => ({
    tagFilter: null,
    nameFilterQuery: null,
    isGlobalSearch: false,
});

/**
 * useNavigationHistory Hook
 * 
 * 管理导航历史记录，类似 Windows 文件资源管理器的前进/后退功能。
 * 
 * 设计原则：
 * - 使用 useRef 存储历史栈，避免不必要的重渲染
 * - goBack/goForward 返回目标状态，不执行副作用
 * - navigate() 自动截断前进历史
 * - 提供 isNavigatingRef 让调用方知道当前是否在历史导航中
 */
export const useNavigationHistory = () => {
    // 使用 ref 存储历史，避免频繁重渲染
    const historyRef = useRef<NavigationState[]>([]);
    const indexRef = useRef<number>(-1);

    // 是否正在进行历史导航（用于防止导航过程中产生新历史条目）
    const isNavigatingRef = useRef<boolean>(false);

    // 用于触发 UI 更新的状态（仅在需要更新按钮状态时变化）
    const [, forceUpdate] = useState({});

    /**
     * 比较两个状态是否相同
     */
    const isSameState = useCallback((a: NavigationState | null, b: NavigationState | null): boolean => {
        if (!a || !b) return false;
        if (a.path !== b.path) return false;
        return JSON.stringify(a.filterState) === JSON.stringify(b.filterState);
    }, []);

    /**
     * 推送新的导航状态到历史记录
     * 
     * @param state 新的导航状态
     * @param force 是否强制添加（即使状态相同）
     */
    const navigate = useCallback((state: NavigationState, force: boolean = false) => {
        // 如果正在历史导航中，不添加新记录
        if (isNavigatingRef.current) {
            return;
        }

        const history = historyRef.current;
        const index = indexRef.current;

        // 获取当前状态
        const currentState = index >= 0 && index < history.length ? history[index] : null;

        // 如果状态相同且不强制，则不添加
        if (!force && isSameState(currentState, state)) {
            return;
        }

        // 截断当前位置之后的历史（前进历史）
        const newHistory = history.slice(0, index + 1);

        // 添加新状态
        newHistory.push(state);

        // 限制历史大小
        if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.splice(0, newHistory.length - MAX_HISTORY_SIZE);
        }

        // 更新 refs
        historyRef.current = newHistory;
        indexRef.current = newHistory.length - 1;

        // 触发 UI 更新
        forceUpdate({});
    }, [isSameState]);

    /**
     * 回退到上一个状态
     * 
     * @returns 目标状态，如果无法回退则返回 null
     */
    const goBack = useCallback((): NavigationState | null => {
        const index = indexRef.current;

        if (index <= 0) {
            return null;
        }

        const newIndex = index - 1;
        const targetState = historyRef.current[newIndex];

        // 设置导航标记
        isNavigatingRef.current = true;

        // 更新索引
        indexRef.current = newIndex;

        // 触发 UI 更新
        forceUpdate({});

        return targetState;
    }, []);

    /**
     * 前进到下一个状态
     * 
     * @returns 目标状态，如果无法前进则返回 null
     */
    const goForward = useCallback((): NavigationState | null => {
        const history = historyRef.current;
        const index = indexRef.current;

        if (index >= history.length - 1) {
            return null;
        }

        const newIndex = index + 1;
        const targetState = history[newIndex];

        // 设置导航标记
        isNavigatingRef.current = true;

        // 更新索引
        indexRef.current = newIndex;

        // 触发 UI 更新
        forceUpdate({});

        return targetState;
    }, []);

    /**
     * 标记历史导航完成
     * 应在导航完成后调用
     */
    const finishNavigation = useCallback(() => {
        isNavigatingRef.current = false;
    }, []);

    /**
     * 清空历史记录
     */
    const clearHistory = useCallback(() => {
        historyRef.current = [];
        indexRef.current = -1;
        forceUpdate({});
    }, []);

    /**
     * 获取当前状态
     */
    const getCurrentState = useCallback((): NavigationState | null => {
        const index = indexRef.current;
        if (index >= 0 && index < historyRef.current.length) {
            return historyRef.current[index];
        }
        return null;
    }, []);

    // 计算导航按钮状态
    const canGoBack = indexRef.current > 0;
    const canGoForward = indexRef.current < historyRef.current.length - 1;

    return {
        // 操作方法
        navigate,
        goBack,
        goForward,
        finishNavigation,
        clearHistory,
        getCurrentState,

        // 状态
        canGoBack,
        canGoForward,

        // 内部标记（供外部检查）
        isNavigatingRef,
    };
};
