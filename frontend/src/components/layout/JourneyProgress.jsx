import { NavLink, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { JOURNEY, ROUTES } from '../../routeConfig';

export default function JourneyProgress({ currentStep }) {
  const location = useLocation();
  if (currentStep === null || location.pathname === '/') return null;

  return (
    <nav className="journey-progress" aria-label="Application preparation progress">
      <ol>
        {JOURNEY.map((path, index) => {
          const meta = ROUTES[path];
          const step = index + 1;
          const complete = currentStep > step;
          const current = currentStep === step;
          return (
            <li key={path} className={complete ? 'is-complete' : current ? 'is-current' : ''}>
              <NavLink to={path} aria-current={current ? 'step' : undefined}>
                <span className="journey-progress__dot">{complete ? <Check size={13} /> : step}</span>
                <span className="journey-progress__label">{meta.shortLabel}</span>
              </NavLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
