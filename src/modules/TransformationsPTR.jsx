import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
import { useTelemetry } from "../lib/TelemetryContext";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
export const MODULE_VERSION = "1.0.0";

// Read by the StartGate: round_enter fires from the studentCode dismissal (spec §8).
export const TELEMETRY_ENTRY = { roundId: "vshift-quad-plus3", guideState: "predict" };

// F-BF.B.3 — a·f(x+h)+k on two families; later families APPEND here (design ruling).
const FAMILIES = {
  quad: { label: "y = x²", f: (x) => x * x },
  abs: { label: "y = |x|", f: (x) => Math.abs(x) },
};

// Append-only, parameter-coupled (spec §4.6).
const ROUNDS = [
  { roundId: "vshift-quad-plus3", family: "quad", a: 1, h: 0, k: 3,
    prompt: "Where does f(x) + 3 send the parabola?",
    choices: [["up", "Up 3"], ["down", "Down 3"], ["left", "Left 3"], ["right", "Right 3"]],
    correct: "up" },
  { roundId: "hshift-quad-plus2", family: "quad", a: 1, h: 2, k: 0,
    prompt: "Where does f(x + 2) send the parabola?",
    choices: [["left", "Left 2"], ["right", "Right 2"], ["up", "Up 2"], ["down", "Down 2"]],
    correct: "left" },   // the trap round — most students pick "right"
  { roundId: "stretch-reflect-abs", family: "abs", a: -2, h: 0, k: 0,
    prompt: "What does −2·f(x) do to y = |x|?",
    choices: [["flip-stretch", "Flips it over the x-axis and makes it steeper"],
              ["flip-shrink", "Flips it and makes it wider"],
              ["stretch", "Just makes it steeper, still opens up"],
              ["shift", "Slides it down 2"]],
    correct: "flip-stretch" },
];

// Producer target (fixed, single-scenario convention §4.2): −1·f(x+2)+3 on |x|.
const PRODUCER = { roundId: "producer-abs-n1-h2-k3", family: "abs", a: -1, h: 2, k: 3 };
const SANDBOX_ROUND_ID = "sandbox-free-play";

export default function TransformationsPTR() {
  return <section>transformations-ptr skeleton</section>;
}
