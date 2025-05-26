import React from "react";
import { ReactComponent as FirstFloorMap } from "./1stFlr.svg";

export default function FirstFloorMapWithHighlight({ highlightedLocation }) {
  return (
    <FirstFloorMap
      style={{ width: "100%", height: "auto" }}
      // Pass props to SVG elements if needed
      // Or use CSS to highlight by id
      className={highlightedLocation === "registrar" ? "highlight-registrar" : ""}
    />
  );
}