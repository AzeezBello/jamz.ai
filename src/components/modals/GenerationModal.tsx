import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Loader2, Music, Sparkles, Wand2, Mic, Sliders, Check } from 'lucide-react';

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerationModal({ isOpen, onClose }: GenerationModalProps) {
  const { generation, cancelGeneration } = useStore();
  const { progress, status } = generation;
  
  const handleCancel = () => {
    cancelGeneration();
    onClose();
  };
  
  const steps = [
    { icon: Sparkles, label: 'Analyzing', threshold: 10 },
    { icon: Music, label: 'Composing', threshold: 30 },
    { icon: Wand2, label: 'Generating', threshold: 50 },
    { icon: Mic, label: 'Vocals', threshold: 70 },
    { icon: Sliders, label: 'Mixing', threshold: 85 },
    { icon: Check, label: 'Complete', threshold: 100 },
  ];
  
  const currentStepIndex = steps.findIndex((step, i) => {
    const nextStep = steps[i + 1];
    return progress >= step.threshold && (!nextStep || progress < nextStep.threshold);
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white">
        <div className="text-center py-6">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full gradient-coral opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full gradient-coral opacity-40 animate-pulse" />
            <div className="absolute inset-4 rounded-full gradient-coral flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-black animate-spin" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold mb-2">Creating Your Song</h3>
          <p className="text-white/60 mb-6">{status}</p>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-8">
            <div 
              className="absolute inset-y-0 left-0 gradient-coral rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Steps */}
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div 
                  key={step.label}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'gradient-coral' : 'bg-white/10'
                  } ${isCurrent ? 'scale-110 ring-2 ring-[#ff6b6b] ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-white/50'}`} />
                  </div>
                  <span className="text-[10px] text-white/50">{step.label}</span>
                </div>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
