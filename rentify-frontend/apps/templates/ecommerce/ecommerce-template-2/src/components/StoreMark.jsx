import { useState } from 'react';

/** Store logo and name. Falls back to an initial when the merchant has no logo. */
export function StoreMark({ identity, size = 'md' }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const name = identity?.name || '';
  const box = size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-base sm:h-10 sm:w-10';
  const showLogo = identity?.logoUrl && !logoFailed;

  return (
    <>
      {showLogo ? (
        <img
          src={identity.logoUrl}
          alt=""
          className={`${box} shrink-0 rounded-full bg-card object-contain`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${box} flex shrink-0 items-center justify-center rounded-full bg-primary font-display font-semibold text-primary-foreground`}
        >
          {name.trim().charAt(0).toUpperCase() || '•'}
        </span>
      )}
      <span className={`truncate font-display font-semibold text-foreground ${size === 'lg' ? 'text-xl' : 'text-lg sm:text-xl'}`}>
        {name}
      </span>
    </>
  );
}
