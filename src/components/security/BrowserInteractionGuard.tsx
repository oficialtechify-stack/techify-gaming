import { useEffect } from 'react';

export const BrowserInteractionGuard: React.FC = () => {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'IMG') {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true } as EventListenerOptions);
      document.removeEventListener('dragstart', handleDragStart, { capture: true } as EventListenerOptions);
    };
  }, []);

  return null;
};
