import { useState } from 'react';

/** Store logo and name. Falls back to an initial when the merchant has no logo. */
export function StoreMark({ identity, size = 'md' }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const name = identity?.name || '';
  const box = size === 'lg' ? 'h-11 w-11 text-lg' : 'h-8 w-8 text-sm sm:h-9 sm:w-9';
  const showLogo = identity?.logoUrl && !logoFailed;

  return (
    <>
      {showLogo ? (
        <img
          src={identity.logoUrl}
          alt=""
          className={`${box} shrink-0 rounded-lg object-contain`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${box} flex shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground`}
        >
          {name.trim().charAt(0).toUpperCase() || '•'}
        </span>
      )}
      <span className={`truncate font-semibold tracking-tight text-foreground ${size === 'lg' ? 'text-lg' : 'text-base sm:text-lg'}`}>
        {name}
      </span>
    </>
  );
}
