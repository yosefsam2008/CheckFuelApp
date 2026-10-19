import { createContext, useContext } from 'react';

// Lets screens without the tab header (the calculator hero) open the info menu owned by the tabs layout
export const InfoMenuContext = createContext<() => void>(() => {});
export const useOpenInfoMenu = () => useContext(InfoMenuContext);
