import {
  BookOpen,
  CheckCircle2,
  FileStack,
  FolderOpen,
  Home,
  PackageCheck,
  ScanText,
  UploadCloud,
  Users,
} from 'lucide-react';

export const ROUTES = {
  '/': {
    label: 'Welcome',
    shortLabel: 'Home',
    icon: Home,
    step: 0,
    eyebrow: 'Your application guide',
    assistantTitle: 'Welcome to RealDoor',
    assistantSubtitle: 'Private, grounded guidance',
    questions: ['What can RealDoor help me prepare?', 'How does RealDoor protect my information?'],
  },
  '/profile': {
    label: 'Your profile',
    shortLabel: 'Profile',
    icon: Users,
    step: 1,
    eyebrow: 'Step 1 of 5',
    assistantTitle: 'Profile help',
    assistantSubtitle: 'Understand the details we need',
    questions: ['Why is household size important?', 'What does 60% MTSP mean?'],
  },
  '/upload': {
    label: 'Add documents',
    shortLabel: 'Upload',
    icon: UploadCloud,
    step: 2,
    eyebrow: 'Step 2 of 5',
    assistantTitle: 'Document guide',
    assistantSubtitle: 'Know what to add and why',
    questions: ['What documents are required?', 'What counts as proof of income?'],
  },
  '/extraction': {
    label: 'Review details',
    shortLabel: 'Review',
    icon: ScanText,
    step: 3,
    eyebrow: 'Step 3 of 5',
    assistantTitle: 'Evidence guide',
    assistantSubtitle: 'Review every extracted detail',
    questions: ['Why should I confirm extracted values?', 'How is annualized income calculated?'],
  },
  '/readiness': {
    label: 'Readiness',
    shortLabel: 'Ready',
    icon: CheckCircle2,
    step: 4,
    eyebrow: 'Step 4 of 5',
    assistantTitle: 'Readiness guide',
    assistantSubtitle: 'Turn findings into next steps',
    questions: ['What should I upload next?', 'Explain my open readiness findings'],
  },
  '/packet': {
    label: 'Your packet',
    shortLabel: 'Packet',
    icon: PackageCheck,
    step: 5,
    eyebrow: 'Step 5 of 5',
    assistantTitle: 'Packet guide',
    assistantSubtitle: 'You stay in control',
    questions: ['What will this packet contain?', 'Does RealDoor send this packet?'],
  },
  '/documents': {
    label: 'Documents',
    shortLabel: 'Files',
    icon: FolderOpen,
    step: null,
    eyebrow: 'Your secure workspace',
    assistantTitle: 'Document guide',
    assistantSubtitle: 'Manage and review your files',
    questions: ['Which documents have issues?', 'Explain document freshness rules'],
  },
  '/rules': {
    label: 'Rules & sources',
    shortLabel: 'Rules',
    icon: BookOpen,
    step: null,
    eyebrow: 'Official guidance',
    assistantTitle: 'Rules guide',
    assistantSubtitle: 'Cited, versioned explanations',
    questions: ['Show the official income-limit citation', 'Explain the 40-60 test'],
  },
};

export const JOURNEY = ['/profile', '/upload', '/extraction', '/readiness', '/packet'];
export const PRIMARY_NAV = ['/', '/readiness', '/documents', '/rules', '/packet'];
export const MOBILE_NAV = ['/', '/upload', '/readiness', '/documents', '/packet'];

export function getRouteMeta(pathname) {
  return ROUTES[pathname] || ROUTES['/'];
}

export const workspaceIcon = FileStack;
