"use client";

import Timer from "@/components/timer";
import { RevealText } from "@/components/reveal-text";

export default function Home(){
    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
          <div className="mb-8 text-center">
            <RevealText
              text="POMODORO"
              textColor="text-white"
              overlayColor="text-red-500"
              fontSize="text-[56px] md:text-[96px]"
              letterDelay={0.06}
              overlayDelay={0.04}
              overlayDuration={0.45}
              springDuration={500}
            />
          </div>
            <Timer />
        </main>
    );
}