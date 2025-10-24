import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { TransactionProvider } from "./context/TransactionContext.jsx"; 

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <TransactionProvider>   
      <App />
    </TransactionProvider>
  </BrowserRouter>
);
