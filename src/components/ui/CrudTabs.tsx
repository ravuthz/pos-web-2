import { Pencil, Plus, Table2, X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface CrudTabItem {
  id: string;
  type: 'main' | 'create' | 'edit';
  title: string;
}

interface CrudTabsProps {
  activeTabId: string;
  tabs: CrudTabItem[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateTab?: () => void;
  children: ReactNode;
}

export function CrudTabs({ activeTabId, tabs, onSelectTab, onCloseTab, onCreateTab, children }: CrudTabsProps) {
  const mainTab = tabs.find((tab) => tab.type === 'main') ?? tabs[0];
  const editorTabs = tabs.filter((tab) => tab.id !== mainTab?.id);
  const createTab = editorTabs.find((tab) => tab.type === 'create');
  const editTabs = editorTabs.filter((tab) => tab.type === 'edit');

  function getTabButtonClass(isActive: boolean) {
    return `btn btn-sm min-h-11 normal-case shadow-none ${
      isActive
        ? 'btn-primary'
        : 'border-base-300 bg-base-100 text-base-content/70 hover:border-base-300 hover:bg-base-100 hover:text-base-content'
    }`;
  }

  function getCloseButtonClass(isActive: boolean) {
    return `btn btn-sm btn-square min-h-11 shadow-none ${
      isActive
        ? 'btn-primary'
        : 'border-base-300 bg-base-100 text-base-content/50 hover:border-base-300 hover:bg-base-200 hover:text-base-content'
    }`;
  }

  function renderTab(tab: CrudTabItem) {
    const isActive = tab.id === activeTabId;
    const Icon = tab.type === 'main' ? Table2 : tab.type === 'create' ? Plus : Pencil;

    return (
      <div key={tab.id} className="join shrink-0">
        <button
          role="tab"
          aria-selected={isActive}
          type="button"
          onClick={() => onSelectTab(tab.id)}
          className={`${getTabButtonClass(isActive)} join-item max-w-[15rem] justify-start gap-2 px-3`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{tab.title}</span>
        </button>
        {tab.type !== 'main' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCloseTab(tab.id);
            }}
            className={`${getCloseButtonClass(isActive)} join-item`}
            aria-label={`Close ${tab.title} tab`}
            title={`Close ${tab.title}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden rounded-[calc(var(--radius-box)*1.3)] border border-base-300 bg-base-100 shadow-sm">
      <div
        role="tablist"
        className="flex items-center gap-2 overflow-x-auto border-b border-base-300 bg-base-200/60 px-4 py-3 md:px-6 scrollbar-hide"
      >
        {mainTab ? renderTab(mainTab) : null}
        {!createTab && onCreateTab ? (
          <button
            type="button"
            onClick={onCreateTab}
            className="btn btn-sm min-h-11 shrink-0 border-base-300 bg-base-100 px-3 text-base-content/70 shadow-none hover:border-base-300 hover:bg-base-100 hover:text-base-content"
            aria-label="Open new form tab"
            title="New"
          >
            <Plus className="h-4 w-4 shrink-0" />
          </button>
        ) : null}
        {createTab ? renderTab(createTab) : null}
        {editTabs.map((tab) => renderTab(tab))}
      </div>

      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
