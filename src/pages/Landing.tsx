import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from '@/sections/Hero';
import SongShowcase from '@/sections/SongShowcase';
import Features from '@/sections/Features';
import StudioFeatures from '@/sections/StudioFeatures';
import Pricing from '@/sections/Pricing';
import MobileApp from '@/sections/MobileApp';
import SocialGallery from '@/sections/SocialGallery';
import { useAuthStore } from '@/store/authStore';

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    const from = location.state?.requireAuth ? location.state.from : null;
    if (session && typeof from === 'string' && from.startsWith('/')) {
      navigate(from, { replace: true, state: null });
    }
  }, [location.state, navigate, session]);

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
