import { useState } from "react";
import { setMaptilerKey } from "../lib/maptiler.js";

export function MapTokenMissing({ className = "" }) {
  const [value, setValue] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setMaptilerKey(value.trim());
    window.location.reload();
  };
  return (
    <div className={`mini-map mini-map--missing ${className}`.trim()}>
      <form onSubmit={submit} className="mini-map__token-form">
        <h3>MapTiler key required</h3>
        <p>
          Paste a MapTiler API key to render the live map. Get a free key at{" "}
          <a href="https://cloud.maptiler.com/account/keys/" target="_blank" rel="noreferrer">cloud.maptiler.com</a>.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="MapTiler API key"
          aria-label="MapTiler API key"
          autoComplete="off"
        />
        <button type="submit" className="green-button">Save & reload</button>
      </form>
    </div>
  );
}
