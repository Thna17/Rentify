import { render } from '@testing-library/react';

import StaffAccept from './staff-accept';

describe('StaffAccept', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<StaffAccept />);
    expect(baseElement).toBeTruthy();
  });
});
