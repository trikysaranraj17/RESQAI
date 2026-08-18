'use client';

import { useEffect, useRef } from 'react';

interface SecretShortcutListenerProps {
  onTrigger: () => void;
}

export function SecretShortcutListener({ onTrigger }: SecretShortcutListenerProps) {
  const targetSequence = ['5', '7', '2', '1'];
  const currentIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when user is typing inside text inputs or textareas
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key;

      // Check if current key matches expected sequence at index
      if (key === targetSequence[currentIndexRef.current]) {
        // Clear any previous timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        currentIndexRef.current += 1;

        // If entire sequence (5 -> 7 -> 2 -> 1) matched!
        if (currentIndexRef.current === targetSequence.length) {
          currentIndexRef.current = 0;
          onTrigger();
          return;
        }

        // Reset sequence if next key is not pressed within 2.0 seconds
        timeoutRef.current = setTimeout(() => {
          currentIndexRef.current = 0;
        }, 2000);
      } else {
        // Wrong key -> reset sequence
        currentIndexRef.current = 0;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onTrigger]);

  return null;
}
