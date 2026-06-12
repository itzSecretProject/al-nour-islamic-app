import React, { createContext, useContext, useState, useCallback } from 'react';

// Tracks how many full-screen modals/sheets are open so the bottom nav can hide
// (it would otherwise paint over sheets due to the page-transition transform).
interface UICtx {
  modalOpen: boolean;
  pushModal: () => void;
  popModal: () => void;
}

const Ctx = createContext<UICtx>({ modalOpen: false, pushModal: () => {}, popModal: () => {} });

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [count, setCount] = useState(0);
  const pushModal = useCallback(() => setCount((c) => c + 1), []);
  const popModal = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);
  return <Ctx.Provider value={{ modalOpen: count > 0, pushModal, popModal }}>{children}</Ctx.Provider>;
};

export const useUI = () => useContext(Ctx);
