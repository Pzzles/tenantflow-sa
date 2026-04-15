import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileQuestion, 
  ServerCrash, 
  Construction, 
  ArrowLeft,
  AlertCircle,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type StatusType = '404' | '500' | 'coming-soon' | 'unauthorized' | 'error';

interface StatusPageProps {
  type: StatusType;
  title?: string;
  description?: string;
  className?: string;
}

const statusConfig = {
  '404': {
    icon: FileQuestion,
    defaultTitle: 'Page Not Found',
    defaultDescription: "The page you're looking for doesn't exist or has been moved.",
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  },
  '500': {
    icon: ServerCrash,
    defaultTitle: 'Server Error',
    defaultDescription: 'Something went wrong on our end. We are working to fix it.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  },
  'coming-soon': {
    icon: Construction,
    defaultTitle: 'Coming Soon',
    defaultDescription: 'We are currently building this feature. Stay tuned!',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50'
  },
  'unauthorized': {
    icon: ShieldAlert,
    defaultTitle: 'Access Denied',
    defaultDescription: "You don't have permission to view this page.",
    color: 'text-red-500',
    bgColor: 'bg-red-50'
  },
  'error': {
    icon: AlertCircle,
    defaultTitle: 'Something went wrong',
    defaultDescription: 'An unexpected error occurred. Please try again later.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  }
};

export function StatusPage({ type, title, description, className }: StatusPageProps) {
  const navigate = useNavigate();
  const config = statusConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in zoom-in duration-300",
      className
    )}>
      <div className={cn(
        "mb-6 p-6 rounded-full transition-transform hover:scale-110 duration-500",
        config.bgColor
      )}>
        <Icon className={cn("h-16 w-16", config.color)} />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight mb-3">
        {title || config.defaultTitle}
      </h1>
      
      <p className="text-muted-foreground max-w-md mb-8 text-lg">
        {description || config.defaultDescription}
      </p>
      
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <Button 
          onClick={() => navigate('/')}
        >
          Return Home
        </Button>
      </div>

      {type === 'coming-soon' && (
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Estimated release: Q2 2026</span>
        </div>
      )}
    </div>
  );
}
