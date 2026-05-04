import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./routes/index.jsx";
import { BuiltinProjectProvider } from "./context/BuiltinProjectContext.jsx";
import { ToastProvider } from "./components/primitives/index.js";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <BuiltinProjectProvider>
        <RouterProvider router={router} />
      </BuiltinProjectProvider>
    </ToastProvider>
  </React.StrictMode>
);
