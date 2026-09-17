import About from "@/components/About";
import Contact from "@/components/Contact";
import Experience from "@/components/Experience";
import BlobTracker from "@/components/BlobTracker";
import Field from "@/components/Field";
import Hero from "@/components/Hero";
import Manifesto from "@/components/Manifesto";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import System from "@/components/System";
import Work from "@/components/work/Work";
import WorkHud from "@/components/work/WorkHud";
import { projects } from "@/lib/content";

export default function Home() {
  return (
    <>
      <BlobTracker />
      <Field />
      <Nav />
      <WorkHud count={projects.length} />
      <main className="relative z-10">
        <Hero />
        <Manifesto />
        <Work />
        <Experience />
        <System />
        <About />
        <Contact />
      </main>
      <Reveal />
    </>
  );
}
