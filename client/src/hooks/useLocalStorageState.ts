import { useState, useEffect } from 'react';

/**
 * A custom hook that manages state and synchronizes it with localStorage.
 * 
 * @param key The localStorage key to used for persistence.
 * @param initialValue The initial value to use if no value is found in localStorage.
 * @returns A stateful value and a function to update it.
 */
export function useLocalStorageState<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [state, setState] = useState<T>(() => {
        const storedValue = localStorage.getItem(key);
        if (storedValue !== null) {
            try {
                // If it's a string that doesn't look like JSON, return as is (for legacy string values)
                if (typeof initialValue === 'string' && !storedValue.startsWith('{') && !storedValue.startsWith('[')) {
                    return storedValue as unknown as T;
                }
                return JSON.parse(storedValue);
            } catch (e) {
                console.error(`Error parsing localStorage key "${key}":`, e);
                return initialValue;
            }
        }
        return initialValue;
    });

    useEffect(() => {
        try {
            const valueToStore = typeof state === 'string' ? state : JSON.stringify(state);
            localStorage.setItem(key, valueToStore);
        } catch (e) {
            console.error(`Error setting localStorage key "${key}":`, e);
        }
    }, [key, state]);

    return [state, setState];
}
