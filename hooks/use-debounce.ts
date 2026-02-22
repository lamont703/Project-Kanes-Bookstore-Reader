import { useState, useEffect } from "react"

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of no changes.
 * Used to avoid firing an API call on every keystroke in search inputs.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debounced, setDebounced] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debounced
}
