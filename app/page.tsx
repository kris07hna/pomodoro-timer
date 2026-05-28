import Timer from "@/components/timer";

export default function Home(){
    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
          <h1 className="audiowide-regular text-white text-3xl font-normal mb-8 text-center">
            POMODORO
          </h1>
            <Timer />
        </main>
    );
}