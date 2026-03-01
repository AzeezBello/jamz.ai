import { useState } from 'react';
import Navigation from './sections/Navigation';
import Hero from './sections/Hero';
import SongShowcase from './sections/SongShowcase';
import Features from './sections/Features';
import StudioFeatures from './sections/StudioFeatures';
import Pricing from './sections/Pricing';
import MobileApp from './sections/MobileApp';
import SocialGallery from './sections/SocialGallery';
import Footer from './sections/Footer';
import AudioPlayer from './components/audio/AudioPlayer';
import Dashboard from './pages/Dashboard';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navigation onOpenDashboard={() => setShowDashboard(true)} />
      
      <main className={showDashboard ? 'hidden' : ''}>
        <Hero />
        <SongShowcase />
        <Features />
        <StudioFeatures />
        <Pricing />
        <MobileApp />
        <SocialGallery />
      </main>
      
      {!showDashboard && <Footer />}
      
      {/* Global Audio Player */}
      <AudioPlayer />
      
      {/* Dashboard Overlay */}
      {showDashboard && (
        <Dashboard onClose={() => setShowDashboard(false)} />
      )}
    </div>
  );
}

export default App;
