import { useState } from 'react';
import { toast } from 'sonner';

export const CRUD_MAIN_TAB_ID = 'main';
export const MAX_CRUD_TABS = 9;

export interface CrudEditorTab<FormState> {
  id: string;
  type: 'create' | 'edit';
  title: string;
  entityId?: number;
  form: FormState;
}

interface UseCrudTabsOptions<FormState, Entity extends { id: number }> {
  createEmptyForm: () => FormState;
  getEditForm: (entity: Entity) => FormState;
  maxTabs?: number;
}

export function useCrudTabs<FormState, Entity extends { id: number }>({
  createEmptyForm,
  getEditForm,
  maxTabs = MAX_CRUD_TABS
}: UseCrudTabsOptions<FormState, Entity>) {
  const [activeTabId, setActiveTabId] = useState(CRUD_MAIN_TAB_ID);
  const [tabs, setTabs] = useState<CrudEditorTab<FormState>[]>([]);

  function ensureTabCapacity() {
    if (tabs.length >= maxTabs - 1) {
      toast.error(`You can open up to ${maxTabs} tabs including the main tab.`);
      return false;
    }

    return true;
  }

  function openCreateTab() {
    const existingTab = tabs.find((tab) => tab.type === 'create');

    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    if (!ensureTabCapacity()) {
      return;
    }

    const nextTab: CrudEditorTab<FormState> = {
      id: 'create',
      type: 'create',
      title: 'New',
      form: createEmptyForm()
    };

    setTabs((current) => [...current, nextTab]);
    setActiveTabId(nextTab.id);
  }

  function openEditTab(entity: Entity) {
    const tabId = `edit-${entity.id}`;
    const existingTab = tabs.find((tab) => tab.id === tabId);

    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    if (!ensureTabCapacity()) {
      return;
    }

    const nextTab: CrudEditorTab<FormState> = {
      id: tabId,
      type: 'edit',
      title: `Edit #${entity.id}`,
      entityId: entity.id,
      form: getEditForm(entity)
    };

    setTabs((current) => [...current, nextTab]);
    setActiveTabId(nextTab.id);
  }

  function closeTab(tabId: string) {
    setTabs((current) => current.filter((tab) => tab.id !== tabId));

    if (activeTabId === tabId) {
      const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
      const fallbackTab = tabs[currentIndex - 1] ?? tabs[currentIndex + 1];
      setActiveTabId(fallbackTab?.id ?? CRUD_MAIN_TAB_ID);
    }
  }

  function updateTabForm(tabId: string, updater: (currentForm: FormState) => FormState) {
    setTabs((current) =>
      current.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              form: updater(tab.form)
            }
          : tab
      )
    );
  }

  function resetCreateTab() {
    setTabs((current) =>
      current.map((tab) =>
        tab.type === 'create'
          ? {
              ...tab,
              form: createEmptyForm()
            }
          : tab
      )
    );
  }

  return {
    activeTabId,
    setActiveTabId,
    tabs,
    activeEditorTab: tabs.find((tab) => tab.id === activeTabId) ?? null,
    openCreateTab,
    openEditTab,
    closeTab,
    updateTabForm,
    resetCreateTab
  };
}
