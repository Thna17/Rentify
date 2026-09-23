import { render } from '@testing-library/react';

import CustomerOrder from './customer-order';

describe('CustomerOrder', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<CustomerOrder />);
    expect(baseElement).toBeTruthy();
  });
});
