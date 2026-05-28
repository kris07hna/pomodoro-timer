"use client";

import React from "react";
import Snowfall from "react-snowfall";

export default function SnowOverlay() {
  return <Snowfall snowflakeCount={120} style={{ position: "fixed", width: "100vw", height: "100vh", zIndex: 1 }} />;
}
