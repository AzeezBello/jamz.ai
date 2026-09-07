import Hero from '@/sections/Hero';
import SongShowcase from '@/sections/SongShowcase';
import Features from '@/sections/Features';
import StudioFeatures from '@/sections/StudioFeatures';
import Pricing from '@/sections/Pricing';
import MobileApp from '@/sections/MobileApp';
import SocialGallery from '@/sections/SocialGallery';

export default function Landing() {
  return (
    <>
      <Hero />
      <SongShowcase />
      <Features />
      <StudioFeatures />
      <Pricing />
      <MobileApp />
      <SocialGallery />
    </>
  );
}
