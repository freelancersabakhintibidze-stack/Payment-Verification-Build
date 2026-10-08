import Hero from "@/components/landing/Hero";
import Loop from "@/components/landing/Loop";
import DemoSection from "@/components/landing/DemoSection";
import Architecture from "@/components/landing/Architecture";
import TechStack from "@/components/landing/TechStack";
import Security from "@/components/landing/Security";
import Faq from "@/components/landing/Faq";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Loop />
      <DemoSection />
      <Architecture />
      <TechStack />
      <Security />
      <Faq />
    </>
  );
}
