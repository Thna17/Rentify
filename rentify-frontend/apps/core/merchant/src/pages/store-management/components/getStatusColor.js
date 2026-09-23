export const getStatusColor = (status) => {
  switch (status) {
    case 'active': return 'success';
    case 'trial': return 'warning';
    case 'paused': return 'error';
    default: return 'default';
  }
};