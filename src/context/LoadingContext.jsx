// src/context/LoadingContext.jsx
import { createContext, useRef } from "react";
import LoadingBar from "react-top-loading-bar";

export const LoadingContext = createContext();

export default function LoadingProvider({ children }) {
  const ref = useRef(null);

  const start = () => ref.current?.continuousStart();
  const complete = () => ref.current?.complete();

  return (
    <LoadingContext.Provider value={{ start, complete }}>
      <LoadingBar color="#00E0A1" height={3} ref={ref} />
      {children}
    </LoadingContext.Provider>
  );
}
