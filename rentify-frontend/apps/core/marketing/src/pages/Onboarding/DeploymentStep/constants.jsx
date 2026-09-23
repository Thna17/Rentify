// constants.js
import { 
  AlertCircle, AlertTriangle, BookOpen, Check, CheckCircle, Cloud, 
  Code, Copy, ExternalLink, Globe, MessageCircle, Package, Palette, 
  Phone, RefreshCw, Rocket, Server, Settings, Terminal, Zap, 
  CreditCard, Cpu, Database, Shield, Users, Store 
} from "lucide-react";

// Updated deployment stages to match your new flow
export const DEPLOYMENT_STAGES = [
  { id: 'initializing', nameKey: 'deployment.stages.initializing', icon: 'Settings' },
  { id: 'creating_website', nameKey: 'deployment.stages.creating_website', icon: 'Database' },
  { id: 'deploying', nameKey: 'deployment.stages.deploying', icon: 'Cloud' },
  { id: 'building', nameKey: 'deployment.stages.building', icon: 'Cpu' },
  { id: 'finalizing', nameKey: 'deployment.stages.finalizing', icon: 'CheckCircle' },
];

export const ICON_MAP = {
  CheckCircle, ExternalLink, Copy, Rocket, RefreshCw, Server, Code, 
  Cloud, Settings, Terminal, Globe, Package, Check, Zap, Phone, 
  MessageCircle, BookOpen, Palette, AlertTriangle, AlertCircle, 
  Payment: CreditCard, Cpu, Database, Shield, Users, Store
};

export const NEXT_STEPS = [
  { icon: 'Palette', textKey: 'deployment.completed.step1', color: 'bg-purple-500' },
  { icon: 'Store', textKey: 'deployment.completed.step2', color: 'bg-blue-500' },
  { icon: 'Users', textKey: 'deployment.completed.step3', color: 'bg-green-500' },
  { icon: 'BookOpen', textKey: 'deployment.completed.step4', color: 'bg-orange-500' },
  { icon: 'MessageCircle', textKey: 'deployment.completed.step5', color: 'bg-pink-500' },
  { icon: 'Shield', textKey: 'deployment.completed.step6', color: 'bg-red-500' },
];