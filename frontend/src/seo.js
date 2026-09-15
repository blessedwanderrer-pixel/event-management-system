import { useEffect } from 'react';

const DEFAULT_TITLE = 'Nowshera Events Co.';
const DEFAULT_DESCRIPTION =
  'Discover and register for thoughtful events in Nowshera. Browse the calendar, reserve seats, and manage your plans.';

export function usePageMeta(title, description = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} · ${DEFAULT_TITLE}` : DEFAULT_TITLE;

    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const previousDescription = meta.content;
    meta.content = description;

    return () => {
      document.title = previousTitle;
      if (created) meta.remove();
      else meta.content = previousDescription;
    };
  }, [title, description]);
}
