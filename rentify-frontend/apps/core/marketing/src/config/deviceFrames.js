export const deviceFrames = {
    desktop: {
      frame: {
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 30px 60px rgba(0,0,0,0.2)',
        background: '#f0f0f0',
        padding: '16px',
      },
      screen: {
        borderRadius: '8px',
        border: '1px solid rgba(0,0,0,0.1)',
      },
    },
    tablet: {
      frame: {
        width: 768,
        height: 1024,
        borderRadius: '32px',
        padding: '24px',
        background: 'linear-gradient(145deg, #e0e0e0, #ffffff)',
        boxShadow: `
          0 20px 40px rgba(0,0,0,0.2),
          inset 0 -8px 16px rgba(0,0,0,0.1),
          inset 0 8px 16px rgba(255,255,255,0.5)
        `,
        position: 'relative',
      },
      screen: {
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.1)',
        overflow: 'hidden',
      },
    },
    mobile: {
      frame: {
        width: 375,
        height: 667,
        borderRadius: '40px',
        padding: '28px 16px',
        background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
        boxShadow: `
          0 20px 40px rgba(0,0,0,0.3),
          inset 0 -8px 16px rgba(0,0,0,0.3),
          inset 0 8px 16px rgba(255,255,255,0.05)
        `,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80px',
          height: '8px',
          borderRadius: '4px',
          background: '#333',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '6px',
          borderRadius: '3px',
          background: '#444',
        },
      },
      screen: {
        borderRadius: '30px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
      },
    },
}