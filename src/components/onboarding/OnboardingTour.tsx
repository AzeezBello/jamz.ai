import { useEffect, useState } from 'react';
import { Joyride, type EventData, STATUS, type Step } from 'react-joyride';
import { useOnboardingStore } from '@/store/onboardingStore';
import { TOUR_STEPS } from '@/lib/tour-steps';

const joyrideSteps: Step[] = TOUR_STEPS.map((s) => ({
  target: `[data-tour="${s.target}"]`,
  title: s.title,
  content: s.body,
  placement: 'auto',
  disableBeacon: true,
}));

export default function OnboardingTour() {
  const active = useOnboardingStore((s) => s.active);
  const finishTour = useOnboardingStore((s) => s.finishTour);
  const [localRun, setLocalRun] = useState(false);

  const isRunning = active === 'tour' || localRun;

  useEffect(() => {
    const done = localStorage.getItem('jamz-onboarding-done');
    if (!done && active === 'tour') {
      setLocalRun(true);
    }
  }, [active]);

  const handleEvent = (data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setLocalRun(false);
      localStorage.setItem('jamz-onboarding-done', 'true');
      void finishTour();
    }
  };

  return (
    <Joyride
      steps={joyrideSteps}
      run={isRunning}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        zIndex: 10000,
        primaryColor: '#f97316',
        textColor: '#f3f4f6',
        backgroundColor: '#18181b',
        arrowColor: '#18181b',
      }}
      styles={{
        tooltip: {
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1rem',
        },
        buttonPrimary: {
          backgroundColor: '#f97316',
          borderRadius: '0.5rem',
          color: '#ffffff',
          fontWeight: 600,
          padding: '0.5rem 1rem',
        },
        buttonBack: {
          color: '#9ca3af',
          marginRight: '0.5rem',
        },
        buttonSkip: {
          color: '#9ca3af',
        },
      }}
    />
  );
}
