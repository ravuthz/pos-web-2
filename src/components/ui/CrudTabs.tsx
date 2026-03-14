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

  function renderTab(tab: CrudTabItem) {
    const isActive = tab.id === activeTabId;
    const Icon = tab.type === 'main' ? Table2 : tab.type === 'create' ? Plus : Pencil;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onSelectTab(tab.id)}
        className={`inline-flex min-w-0 shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'bg-primary-700 text-white shadow-soft' : 'bg-white text-surface-700 hover:bg-surface-100'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{tab.title}</span>
        {tab.type !== 'main' ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onCloseTab(tab.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onCloseTab(tab.id);
              }
            }}
            className={`rounded-full p-0.5 ${
              isActive ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-surface-400 hover:bg-surface-200 hover:text-surface-700'
            }`}
            aria-label={`Close ${tab.title} tab`}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-surface-200 bg-white/90 shadow-soft backdrop-blur">
      <div className="flex gap-2 overflow-x-auto border-b border-surface-200 bg-surface-50/80 px-4 py-3 md:px-6 scrollbar-hide">
        {mainTab ? renderTab(mainTab) : null}
        {!createTab && onCreateTab ? (
          <button
            type="button"
            onClick={onCreateTab}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-medium text-surface-700 transition hover:bg-surface-100"
            aria-label="Open new form tab"
            title="New"
          >
            <Plus className="h-4 w-4 shrink-0" />
          </button>
        ) : null}
        {createTab ? renderTab(createTab) : null}
        {editTabs.map((tab) => {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`inline-flex min-w-0 shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                tab.id === activeTabId
                  ? 'bg-primary-700 text-white shadow-soft'
                  : 'bg-white text-surface-700 hover:bg-surface-100'
              }`}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.title}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(tab.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onCloseTab(tab.id);
                  }
                }}
                className={`rounded-full p-0.5 ${
                  tab.id === activeTabId
                    ? 'text-white/80 hover:bg-white/10 hover:text-white'
                    : 'text-surface-400 hover:bg-surface-200 hover:text-surface-700'
                }`}
                aria-label={`Close ${tab.title} tab`}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
