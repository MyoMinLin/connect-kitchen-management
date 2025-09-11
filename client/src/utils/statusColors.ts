export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'orange';
    case 'preparing':
      return 'blue';
    case 'ready':
      return 'green';
    case 'served':
      return 'purple';
    case 'cancelled':
      return 'red';
    default:
      return 'default';
  }
};