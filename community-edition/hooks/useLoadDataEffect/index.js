/**
 * Copyright © INOVUA TRADING.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useCallback, useLayoutEffect, useRef } from 'react';
const diff = (a1, a2) => {
    if (a1.length != a2.length) {
        return true;
    }
    for (let i = 0; i < a1.length; i++) {
        if (!Object.is(a1[i], a2[i])) {
            return true;
        }
    }
    return false;
};
const resolved = Promise.resolve(true);
const useLoadDataEffect = ({ getDataSource, }, fn, { reloadDeps, noReloadDeps }) => {
    const prevComputedDepsRef = useRef([]);
    const reloadRef = useRef();
    const noReloadRef = useRef();
    const reloadDepsDifferent = !reloadRef.current || diff(reloadRef.current, reloadDeps);
    const noReloadDepsDifferent = !noReloadRef.current || diff(noReloadRef.current, noReloadDeps);
    const depsDifferent = reloadDepsDifferent || noReloadDepsDifferent;
    const shouldReload = reloadDepsDifferent;
    let shouldReloadRef = useRef(false);
    let computedDeps = depsDifferent ? [{}] : prevComputedDepsRef.current;
    let resolveRef = useRef(null);
    let promiseRef = useRef(resolved);
    if (depsDifferent) {
        shouldReloadRef.current = shouldReload;
        promiseRef.current = new Promise(resolve => {
            resolveRef.current = resolve;
        });
    }
    let pendingRef = useRef(new Set());
    const intercept = useCallback((promise, dataSource) => {
        const isRemote = typeof dataSource === 'function' || dataSource?.then;
        if (!isRemote) {
            return promise;
        }
        // clear the set in order to cancel any in-progress promises
        pendingRef.current.clear();
        pendingRef.current.add(promise);
        return promise.then(r => {
            if (pendingRef.current.has(promise)) {
                // no new request came in since this promise originated
                // so we can clear the pending set and return the result
                pendingRef.current.delete(promise);
                return r;
            }
            return Promise.reject({
                message: `This request is discarded as it was still pending when a new request came in.`,
                result: r,
            });
        });
    }, []);
    useLayoutEffect(() => {
        const reload = shouldReloadRef.current;
        const dataSource = getDataSource({ shouldReload: reload });
        fn(dataSource, { shouldReload: reload, intercept }).then(() => {
            if (resolveRef.current) {
                resolveRef.current();
            }
        });
        shouldReloadRef.current = shouldReload;
    }, computedDeps);
    reloadRef.current = reloadDeps;
    noReloadRef.current = noReloadDeps;
    prevComputedDepsRef.current = computedDeps;
    return promiseRef.current;
};
export default useLoadDataEffect;
