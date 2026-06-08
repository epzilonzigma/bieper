import { Timer } from "@/components/timer";

const Home = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <Timer />
      </main>
    </div>
  );
};

export default Home;
